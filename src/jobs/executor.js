import { markJobFailed, markJobSuccess } from "./jobRepo.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processJob(job) {
  console.log("Processing job:", job.id, job.type);
  await sleep(10000);

  if (Math.random() < 0.6) {
    return;
  }

  if (Math.random() < 0.3) {
    const err = new Error("Random Job Failure");
    err.jobId = job.id;
    throw err;
  }
}

async function execute(job) {
    try {
      await processJob(job);
      await markJobSuccess(job.id);
      console.log("Job success:", job.id);
    } catch (error) {
      const updatedJob = await markJobFailed(job.id, error.message);

      console.error(
        "Job failed:",job.id,
        "attempts:",updatedJob.attempts,
        "status:", updatedJob.status
      );
    }
}   

export { execute };