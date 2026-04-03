import { listenMainlineServer } from "./http/server.js";
const PORT = Number(process.env.PORT) || 3001;
const { port } = await listenMainlineServer({ port: PORT });
console.log(`Mainline Immunity server on http://localhost:${port}`);
console.log(`WebSocket on ws://localhost:${port}/ws`);
