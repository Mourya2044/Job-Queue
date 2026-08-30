import { markJobFailed, markJobSuccess, renewLease } from "./jobRepo.js";
import { loadPlugin } from "./pluginManager/loadPlugin.js";
import path from "node:path";

async function execute(job, workerId) {
  let heartbeatTimer = null;

  try {
    const pluginPath = path.resolve("plugins", job.plugin);
    const plugin = await loadPlugin(pluginPath);

    // Start heartbeat scoped to this job and worker
    heartbeatTimer = setInterval(async () => {
      await renewLease(job.id, workerId);
    }, 10_000);

    const result = await plugin.execute({ job });
    console.log("Plugin executed successfully for job:", job.id, "Result:", result);
    await markJobSuccess(job.id, result, workerId);
    console.log("Job success:", job.id);
  } catch (error) {
    const updatedJob = await markJobFailed(job.id, error.message);

    console.error(
      "Job failed:", job.id,
      "attempts:", updatedJob?.attempts,
      "status:", updatedJob?.status
    );
  } finally {
    // Always clear the timer when the job finishes
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
  }
}

const renewLease = async (jobId, workerId) => {
  try {
    await pool.query(
      `UPDATE jobs 
       SET lease_expires_at = NOW() + INTERVAL '30 seconds'
       WHERE id = $1 AND locked_by = $2 AND status = 'RUNNING'`,
      [jobId, workerId]
    );
  } catch (error) {
    console.error(`Failed to renew lease for job ${jobId}:`, error.message);
  }
};

export { execute };