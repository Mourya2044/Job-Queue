import "dotenv/config";
import express from "express";
import router from "./routes/job.routes.js";
import { startJobEventListener } from "./utils/listener.js";
import "./socket/socket.js";

const app = express();
const port = Number(process.env.API_PORT ?? 3000);

app.use(express.json());
app.use("/api", router);

app.listen(port, async () => {
  console.log(`API server running at http://localhost:${port}`);
  await startJobEventListener(); // DB listener
});
