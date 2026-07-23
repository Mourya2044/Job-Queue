import "dotenv/config";
import { claimJob } from "./jobRepo.js";
import { execute } from "./executor.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const worker = async () => {
  console.log("Worker started");
  while (true) {
    const job = await claimJob();

    if (!job) {
      await sleep(2000);
      continue;
    }

    await execute(job);
  }
};

worker().catch((error) => {
  console.error("Worker crashed:", error);
  process.exit(1);
});