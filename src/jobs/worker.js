import { claimJob, markJobFailed, markJobSuccess, recoverAbandonedJobs, failAbandonedJobs } from "./jobRepo.js";

setInterval(async () => {
  try {
    const recovered = await recoverAbandonedJobs();
    const failed = await failAbandonedJobs();

    if (recovered.length || failed.length) {
      console.log(
        "Recovery:",
        recovered.length,
        "requeued,",
        failed.length,
        "failed"
      );
    }
  } catch (error) {
    console.error(error);
  }
}, 60000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function processJob(job) {
  console.log("Processing job:", job.id, job.type);
  await sleep(2000);

  if (Math.random() < 0.5) {
    return;
  }

  if (Math.random() < 0.7) {
    const err = new Error("Random Job Failure");
    err.jobId = job.id;
    throw err;
  }
}

export const worker = async () => {
  while (true) {
    const job = await claimJob();

    if (!job) {
      await sleep(2000);
      continue;
    }

    try {
      await processJob(job);
      await markJobSuccess(job.id);
      console.log("Job success:", job.id);
    } catch (error) {
      const updatedJob = await markJobFailed(
        job.id,
        error.message
      );

      console.error(
        "Job failed:",
        job.id,
        "attempts:",
        updatedJob.attempts,
        "status:",
        updatedJob.status
      );
    }
  }
};

worker().catch((error) => {
  console.error("Worker crashed:", error);
  process.exit(1);
});