import { listenMainlineServer } from "../http/server.js";
import { loadMainlineEnv } from "../config/env.js";
import { resolveBackendRoot } from "../patch/ingest.js";
const env = loadMainlineEnv();
const args = process.argv.slice(2);
let port;
let livePath;
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port") {
        port = Number(args[++i]);
    }
    else if (args[i] === "--live") {
        const next = args[i + 1];
        if (next && !next.startsWith("--")) {
            livePath = args[++i];
        }
        else {
            livePath = resolveBackendRoot();
        }
    }
}
const useLive = Boolean(livePath) || Boolean(env.liveWorkspace);
const liveWorkspacePath = useLive
    ? livePath ?? env.liveWorkspace ?? resolveBackendRoot()
    : undefined;
const { port: listeningPort } = await listenMainlineServer({
    port,
    liveWorkspacePath
});
console.error(`mainline-immunity listening on http://127.0.0.1:${listeningPort}`);
