import pool from "../../db/db.js";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createJob = async (plugin, payload) => {
    try {
        const result = await pool.query(`
                INSERT INTO jobs(plugin, payload, status)
                VALUES ($1, $2, 'PENDING')
                RETURNING *;
            `, [plugin, payload]);
        const job = result.rows[0] || null;
        if (job) {
            await pool.query(
                `NOTIFY job_events, '${JSON.stringify({ jobId: job.id })}'`
            );
        }
        return job;
    } catch (error) {
        console.error(error);
    }
}

export const getJobById = async (jobId) => {
    if (!UUID_V4_PATTERN.test(jobId)) {
        return null;
    }

    try {
        const result = await pool.query(`
                SELECT *
                FROM jobs
                WHERE id = $1
            `, [jobId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error("getJobById error: ", error);
        throw error;
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