import express from "express";
import router from "./routes/routes.js";
import { startJobEventListener } from "./db/listener.js";
import "./socket/socket.js";

const app = express();
const port = 3000;

app.use(express.json());
app.use("/api", router);

app.listen(port, async () => {
  console.log(`API server running at http://localhost:${port}`);
  await startJobEventListener(); // DB listener
});
