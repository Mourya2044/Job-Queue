import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

// jobId => set(ws connections)
const subscribers = new Map();

wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", (message) => {
        let data;
        try {
            data = JSON.parse(message.toString());
        } catch (error) {
            console.error("Invalid JSON message received:", message);
            return;
        }

        if (data.action === "subscribe" && data.jobId) {
            const jobId = data.jobId;
            if (!subscribers.has(jobId)) {
                subscribers.set(jobId, new Set());
            }

            subscribers.get(jobId).add(ws);
            ws.jobId = jobId;

            ws.send(JSON.stringify({ message: `Subscribed to job ${jobId}` }));
            console.log(`Client subscribed to job ${jobId}`);
        }

        if (data.action === "unsubscribe") {
            const jobId = String(data.jobId);

            if (subscribers.has(jobId)) {
                subscribers.get(jobId).delete(ws);

                if (subscribers.get(jobId).size === 0) {
                    subscribers.delete(jobId);
                }
            }

            ws.jobId = null;

            ws.send(JSON.stringify({
                message: `Unsubscribed from job ${jobId}`
            }));

            return;
        }
    });

    ws.on("close", () => {
        if (ws.jobId && subscribers.has(ws.jobId)) {
            subscribers.get(ws.jobId).delete(ws);
            if (subscribers.get(ws.jobId).size === 0) {
                subscribers.delete(ws.jobId);
            }
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
            if (ws.readyState === ws.OPEN) {
                ws.send(payload);
            }
        }
    } catch (error) {
        console.error("reportJobStatus error: ", error);
    }
}

console.log("WebSocket server running on ws://localhost:8080");