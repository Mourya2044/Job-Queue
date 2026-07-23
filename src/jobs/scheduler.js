import "dotenv/config";
import { recoverAbandonedJobs, failAbandonedJobs } from "./jobRepo.js";

async function runRecovery() {
  try {
    console.log("Running recovery for abandoned jobs...");
    const recovered = await recoverAbandonedJobs();
    const failed = await failAbandonedJobs();

    if (recovered.length || failed.length) {
      console.log(
        `Recovery: ${recovered.length} requeued, ${failed.length} failed`
      );
    }
  } catch (error) {
    console.error("Recovery failed:", error);
  }
}

export function startScheduler() {
  console.log("Scheduler started");

  // Run immediately on startup
  runRecovery();

  // Then every minute
  setInterval(runRecovery, 60_000);
}

startScheduler();

process.on("SIGINT", () => {
  console.log("Scheduler stopped");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Scheduler stopped");
  process.exit(0);
});