import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import http from "node:http";
import { runScenario } from "./runner.js";
const VALID_SCENARIOS = [
    "healthy",
    "infected-healed",
    "protected-zone-blocked",
];
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
// --- WebSocket server for live mode ---
const wss = new WebSocketServer({ server, path: "/ws" });
const liveClients = new Set();
wss.on("connection", (ws) => {
    liveClients.add(ws);
    ws.send(JSON.stringify({ type: "connected" }));
    ws.on("close", () => liveClients.delete(ws));
});
export function broadcastEvent(event) {
    const msg = JSON.stringify({ type: "timeline_event", event });
    for (const client of liveClients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
}
// --- REST endpoints for demo mode ---
app.get("/api/scenarios", (_req, res) => {
    res.json(VALID_SCENARIOS);
});
app.post("/api/run/:name", async (req, res) => {
    const name = req.params.name;
    if (!VALID_SCENARIOS.includes(name)) {
        res.status(400).json({ error: `Invalid scenario: ${name}` });
        return;
    }
    const result = await runScenario(name);
    res.json(result);
});
const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
    console.log(`Mainline Immunity server on http://localhost:${PORT}`);
    console.log(`WebSocket on ws://localhost:${PORT}/ws`);
});
