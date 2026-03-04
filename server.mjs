import { serve } from "srvx/node";
import { stat, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import server from "./dist/server/server.js";

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/vnd.microsoft.icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".webmanifest": "application/manifest+json",
};

const CLIENT_DIR = new URL("./dist/client/", import.meta.url).pathname;

await serve({
  port: process.env.PORT || 3000,
  hostname: "0.0.0.0",
  async fetch(request) {
    const url = new URL(request.url);
    const filePath = join(CLIENT_DIR, url.pathname);

    // Only serve files within dist/client (prevent traversal)
    if (filePath.startsWith(CLIENT_DIR)) {
      const fileStat = await stat(filePath).catch(() => null);
      if (fileStat?.isFile()) {
        const ext = extname(filePath);
        const body = await readFile(filePath);
        return new Response(body, {
          headers: {
            "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
            ...(url.pathname.startsWith("/assets/")
              ? { "Cache-Control": "public, max-age=31536000, immutable" }
              : {}),
          },
        });
      }
    }

    // Fall through to SSR handler
    return server.fetch(request);
  },
}).ready();
