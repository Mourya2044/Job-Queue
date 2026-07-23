import { markJobFailed, markJobSuccess } from "./jobRepo.js";
import { loadPlugin } from "./pluginManager/loadPlugin.js";
import path from "node:path";

async function execute(job) {
  try {
    const pluginPath = path.resolve("plugins", job.plugin);
    const plugin = await loadPlugin(pluginPath);

    const result = await plugin.execute({ job });
    console.log("Plugin executed successfully for job:", job.id, "Result:", result);
    await markJobSuccess(job.id, result);
    console.log("Job success:", job.id);
  } catch (error) {
    const updatedJob = await markJobFailed(job.id, error.message);

    console.error(
      "Job failed:", job.id,
      "attempts:", updatedJob.attempts,
      "status:", updatedJob.status
    );
  }
}

export { execute };