import { reportJobStatus } from "../socket/socket.js";
import { getJobById } from "../jobs/jobRepo.js";
import pool from "./db.js";

export const startJobEventListener = async () => {
  const client = await pool.connect();
  await client.query("LISTEN job_events");

  console.log("Listening for job_events");

  client.on("notification", async (msg) => {
    try {
      const { jobId } = JSON.parse(msg.payload);

      // fetch fresh state
      const job = await getJobById(jobId);

      if (job) {
        reportJobStatus(job);
      }
    } catch (err) {
      console.error("Job event handling error:", err);
    }
  });
};
