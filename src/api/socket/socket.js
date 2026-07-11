import "dotenv/config";
import { WebSocket, WebSocketServer } from "ws";

const wsPort = Number(process.env.WS_PORT ?? 8080);
const wss = new WebSocketServer({ port: wsPort });

// jobId => set(ws connections)
const subscribers = new Map();

wss.on("connection", (ws) => {
    console.log("New client connected");
    ws.jobIds = new Set();

    ws.on("message", (message) => {
        let data;
        try {
            // console.log("Received message:", message.toString());
            data = JSON.parse(message.toString());
        } catch (error) {
            console.error("Invalid JSON message received:", message);
            return;
        }

        if (data.action === "subscribe" && data.jobId) {
            const jobId = String(data.jobId);
            if (!ws.jobIds.has(jobId)) {
                ws.jobIds.add(jobId);
                if (!subscribers.has(jobId)) {
                    subscribers.set(jobId, new Set());
                }
                subscribers.get(jobId).add(ws);
            }

            ws.send(JSON.stringify({ message: `Subscribed to job ${jobId}` }));
            console.log(`Client subscribed to job ${jobId}`);
            return;
        }

        if (data.action === "unsubscribe" && data.jobId) {
            const jobId = String(data.jobId);

            ws.jobIds.delete(jobId);
            if (subscribers.has(jobId)) {
                subscribers.get(jobId).delete(ws);

                if (subscribers.get(jobId).size === 0) {
                    subscribers.delete(jobId);
                }
            }

            ws.send(JSON.stringify({
                message: `Unsubscribed from job ${jobId}`
            }));
            console.log(`Client unsubscribed from job ${jobId}`);
            return;
        }
    });

    ws.on("close", () => {
        if (ws.jobIds) {
            for (const jobId of ws.jobIds) {
                if (subscribers.has(jobId)) {
                    subscribers.get(jobId).delete(ws);
                    if (subscribers.get(jobId).size === 0) {
                        subscribers.delete(jobId);
                    }
                }
            }
            ws.jobIds.clear();
        }

        console.log("Client disconnected");
    })
});

export const reportJobStatus = (job) => {
    try {
        const sockets = subscribers.get(job.id);

        const payload = JSON.stringify({
            jobId: job.id,
            status: job.status,
            attempts: job.attempts,
            error: job.error
        })

        if (!sockets) {
            return;
        }

        for (const ws of sockets) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        }
    } catch (error) {
        console.error("reportJobStatus error: ", error);
    }
}

console.log(`WebSocket server running on ws://localhost:${wsPort}`);