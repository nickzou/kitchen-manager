import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";

const UPLOADS_DIR = join(process.cwd(), "uploads");

const MIME_TYPES: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".avif": "image/avif",
};

export const Route = createFileRoute("/api/uploads/$filename")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { filename } = params;

				// Prevent path traversal
				if (filename.includes("..") || filename.includes("/")) {
					return new Response("Not found", { status: 404 });
				}

				const filePath = join(UPLOADS_DIR, filename);

				try {
					await stat(filePath);
				} catch {
					return new Response("Not found", { status: 404 });
				}

				const ext = extname(filename).toLowerCase();
				const contentType = MIME_TYPES[ext] || "application/octet-stream";
				const data = await readFile(filePath);

				return new Response(data, {
					headers: {
						"Content-Type": contentType,
						"Cache-Control": "public, max-age=31536000, immutable",
					},
				});
			},
		},
	},
});
