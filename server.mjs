import { serve } from "srvx/node";
import server from "./dist/server/server.js";

await serve({
  port: process.env.PORT || 3000,
  hostname: "0.0.0.0",
  fetch: server.fetch,
}).ready();
