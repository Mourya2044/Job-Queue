import pool from "../db/db.js";

export const createJob = async (type, payload) => {
    try {
        const result = await pool.query(`
                INSERT INTO jobs(type, payload, status)
                VALUES ($1, $2, 'PENDING')
                RETURNING *;
            `, [type, payload])
        return result.rows[0] || null;
    } catch (error) {
        console.error(error);
    }
}

export const claimJob = async () => {
    try {
        const result = await pool.query(`
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
                )  
                RETURNING *
            `)
        const job = result.rows[0];
        return job || null;
    } catch (error) {
        console.error(error);
    }
}

export const markJobSuccess = async (jobId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await pool.query(`
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
        const result = await pool.query(`
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
    try {
        const result = await pool.query(`
                UPDATE jobs
                SET
                    status = 'PENDING',
                    started_at = NULL,
                    attempts = attempts + 1
                WHERE status = 'RUNNING'
                  AND started_at < NOW() - INTERVAL '60 seconds'
                  AND attempts < max_attempts
                RETURNING *
            `)
        return result.rows || [];
    } catch (error) {
        console.error("recoverAbandonedJobs error: ", error);
    }
}

export const failAbandonedJobs = async () => {
    try {
        const result = await pool.query(`
                UPDATE jobs
                SET
                    status = 'FAILED',
                    finished_at = NOW()
                WHERE status = 'RUNNING'
                  AND started_at < NOW() - INTERVAL '60 seconds'
                  AND attempts >= max_attempts
                RETURNING *
            `)
        return result.rows || [];
    } catch (error) {
        console.error("failAbandonedJobs error: ", error);
    }
}

export const getJobById = async (jobId) => {
    try {
        const result = await pool.query(`
                SELECT *
                FROM jobs
                WHERE id = $1
            `, [jobId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error("getJobById error: ", error);
    }
}

export const getStatusById = async (jobId) => {
    try {
        const result = await pool.query(`
                SELECT status
                FROM jobs
                WHERE id = $1
            `, [jobId]);
        return result.rows[0]?.status || null;
    } catch (error) {
        console.error("getStatusById error: ", error);
    }
};

export const deleteJobById = async (jobId) => {
    try {
        const result = await pool.query(`
            DELETE FROM jobs
            WHERE id = $1
            AND status != 'RUNNING'
            RETURNING *
        `, [jobId]);
        if (result.rowCount !== 0) {
            return { deleted: true, job: result.rows[0] }; // Job successfully deleted
        }

        const runningCheck = await getStatusById(jobId);
        console.log("runningCheck: ", runningCheck);
        if (runningCheck === 'RUNNING') {
            return { deleted: false, message: "RUNNING" }; // Job is running, cannot delete
        }

        return { deleted: false, message: "NOT_FOUND" }; // Job does not exist
    } catch (error) {
        console.error("deleteJobById error: ", error);
    }
}