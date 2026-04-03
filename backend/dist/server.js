import { listenMainlineServer } from "./http/server.js";
const PORT = Number(process.env.PORT) || 3001;
const { port } = await listenMainlineServer({ port: PORT });
console.log(`Mainline Immunity server on http://localhost:${port}`);
console.log("Realtime websocket support is not enabled in this local demo build.");
