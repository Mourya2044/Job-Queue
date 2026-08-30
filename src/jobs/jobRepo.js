import pool from "../db/db.js";

export const claimJob = async (workerId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(`
      UPDATE jobs
      SET
        status = 'RUNNING',
        attempts = attempts + 1,
        started_at = NOW(),
        locked_by = $1, lease_expire_at = NOW() + INTERVAL '30 seconds'
      WHERE id = (
        SELECT id
        FROM jobs
        WHERE status = 'PENDING'
        ORDER BY available_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `, [workerId]);

    const claimedJob = result.rows[0] || null;

    if (claimedJob) {
      await client.query(
        `NOTIFY job_events, '${JSON.stringify({ jobId: claimedJob.id })}'`
      );
    }

    await client.query("COMMIT");
    return claimedJob;

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("claimJob error:", error);
    throw error;
  } finally {
    client.release();
  }
};

export const markJobSuccess = async (jobId, jobresult, workerId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(`
                UPDATE jobs
                SET
                    status = 'SUCCESSFUL',
                    result = $2,
                    finished_at = NOW(),
                    error = NULL
                WHERE id = $1
                AND status = 'RUNNING'
                AND locked_by = $3
                RETURNING *
            `, [jobId, jobresult, workerId]);
        await client.query(
            `NOTIFY job_events, '${JSON.stringify({ jobId })}'`
        );

        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        console.error("markJobSuccess error: ", error);
        await client.query("ROLLBACK");
    } finally {
        client.release();
    }
}

export const markJobFailed = async (jobId, errormsg) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(`
                UPDATE jobs
                SET
                    error = $2,
                    status = CASE
                                WHEN attempts < max_attempts THEN 'PENDING'
                                ELSE 'FAILED'
                            END
                WHERE id = $1
                RETURNING *
            `, [jobId, errormsg]);
        await client.query(
            `NOTIFY job_events, '${JSON.stringify({ jobId })}'`
        );
        await client.query("COMMIT");
        return result.rows[0] || null;
    } catch (error) {
        console.error("markJobFailed error: ", error);
        await client.query("ROLLBACK");
    } finally {
        client.release();
    }
}

export const recoverAbandonedJobs = async () => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const result = await client.query(`
                UPDATE jobs
                SET
                    status = 'PENDING',
                    started_at = NULL,
                    available_at = NOW() + INTERVAL '1 minute' + INTERVAL '30 seconds' * attempts,
                    locked_by = NULL,
                    lease_expires_at = NULL
                WHERE status = 'RUNNING'
                  AND lease_expires_at < NOW()
                  AND attempts < max_attempts
                RETURNING *
            `);

        for (const job of result.rows) {
            await client.query(
                `NOTIFY job_events, '${JSON.stringify({ jobId: job.id })}'`
            );
        }

        await client.query("COMMIT");
        return result.rows || [];
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("recoverAbandonedJobs error: ", error);
        throw error;
    } finally {
        client.release();
    }
}

export const failAbandonedJobs = async () => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const result = await client.query(`
                UPDATE jobs
                SET
                    status = 'FAILED',
                    finished_at = NOW()
                WHERE status = 'RUNNING'
                  AND lease_expires_at < NOW()
                  AND attempts >= max_attempts
                RETURNING *
            `);

        for (const job of result.rows) {
            await client.query(
                `NOTIFY job_events, '${JSON.stringify({ jobId: job.id })}'`
            );
        }

        await client.query("COMMIT");
        return result.rows || [];
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("failAbandonedJobs error: ", error);
        throw error;
    } finally {
        client.release();
    }
}