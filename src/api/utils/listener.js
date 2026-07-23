import { getJobById } from "../services/job.services.js";
import pool from "../../db/db.js";

const subscribers = new Map();

const reportJobStatus = (job) => {
  try {
    const res = subscribers.get(job.id);
    if (!res) {
      console.log("No subscriber found for job: " + job.id);
      return;
    }

    const payload = JSON.stringify({
      jobId: job.id,
      status: job.status,
      attempts: job.attempts,
      error: job.error
    });

    res.write(`data: ${payload}\n\n`);

    console.log("Job id: ", job.id, "Job status: ", job.status);
    if (job.status == "SUCCESSFUL" || job.status == "FAILED") {
      console.log("Closing connection for job: " + job.id);
      res.end();
      unsubscribeFromJob(job.id);
      return;
    }
  } catch (error) {
    console.error("reportJobStatus error: ", error);
  }
}

export const startJobEventListener = async () => {
  let client;

  const connectAndListen = async () => {
    try {
      client = await pool.connect();

      client.on("error", (err) => {
        console.error("PG Client error in listener, reconnecting...", err);
        cleanupAndReconnect();
      });

      client.on("notification", async (msg) => {
        try {
          console.log("Received job event notification:", msg.payload);
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

      await client.query("LISTEN job_events");
      console.log("Listening for job_events");
    } catch (err) {
      console.error("Failed to connect for LISTEN job_events, retrying in 5s...", err);
      cleanupAndReconnect();
    }
  };

  const cleanupAndReconnect = () => {
    if (client) {
      client.removeAllListeners();
      try {
        client.release(true);
      } catch (e) { }
      client = null;
    }
    setTimeout(connectAndListen, 5000);
  };

  await connectAndListen();
};

export const subscribeToJob = (res, jobId) => {
  subscribers.set(jobId, res);
  console.log(`Subscribed to job ${jobId} events`);
};

export const unsubscribeFromJob = (jobId) => {
  subscribers.delete(jobId);
  console.log(`Unsubscribed from job ${jobId} events`);
};
