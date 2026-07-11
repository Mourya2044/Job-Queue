import pool from "../db/db.js";

export const claimJob = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(`
      UPDATE jobs
      SET
        status = 'RUNNING',
        started_at = NOW()
      WHERE id = (
        SELECT id
        FROM jobs
        WHERE status = 'PENDING'
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `);

    await client.query("COMMIT");
    return result.rows[0] || null;

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("claimJob error:", error);
    throw error;
  } finally {
    client.release();
  }
};

export const markJobSuccess = async (jobId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(`
                UPDATE jobs
                SET
                    status = 'SUCCESSFUL',
                    attempts = attempts + 1,
                    finished_at = NOW(),
                    error = NULL
                WHERE id = $1
                RETURNING *
            `, [jobId]);
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
                    attempts = attempts + 1,
                    error = $2,
                    status = CASE
                                WHEN attempts + 1 < max_attempts THEN 'PENDING'
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
                    attempts = attempts + 1
                WHERE status = 'RUNNING'
                  AND started_at < NOW() - INTERVAL '60 seconds'
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
                  AND started_at < NOW() - INTERVAL '60 seconds'
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