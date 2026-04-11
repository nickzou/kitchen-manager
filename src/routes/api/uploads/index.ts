import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import sharp from "sharp";
import { getAuthSession } from "#src/lib/auth-session";

async function processImage(
	buffer: Buffer,
	mimeType: string,
): Promise<{ buffer: Buffer; ext: string }> {
	if (mimeType === "image/svg+xml") {
		return { buffer, ext: ".svg" };
	}

	const processed = await sharp(buffer)
		.resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
		.webp({ quality: 80 })
		.toBuffer();

	return { buffer: processed, ext: ".webp" };
}

const UPLOADS_DIR = join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/uploads/")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				await mkdir(UPLOADS_DIR, { recursive: true });

				const contentType = request.headers.get("content-type") || "";

				if (contentType.includes("multipart/form-data")) {
					const formData = await request.formData();
					const file = formData.get("file");

					if (!file || !(file instanceof File)) {
						return json({ error: "No file provided" }, { status: 400 });
					}

					if (!file.type.startsWith("image/")) {
						return json({ error: "File must be an image" }, { status: 400 });
					}

					if (file.size > MAX_FILE_SIZE) {
						return json({ error: "File must be under 5MB" }, { status: 400 });
					}

					const buffer = Buffer.from(await file.arrayBuffer());
					const { buffer: processed, ext } = await processImage(
						buffer,
						file.type,
					);
					const filename = `${crypto.randomUUID()}${ext}`;
					await writeFile(join(UPLOADS_DIR, filename), processed);

					return json({ url: `/api/uploads/${filename}` }, { status: 201 });
				}

				// JSON body with URL to download
				const body = await request.json();

				if (!body.url || typeof body.url !== "string") {
					return json({ error: "URL is required" }, { status: 400 });
				}

				let parsed: URL;
				try {
					parsed = new URL(body.url);
				} catch {
					return json({ error: "Invalid URL" }, { status: 400 });
				}

				if (!["http:", "https:"].includes(parsed.protocol)) {
					return json({ error: "Invalid URL protocol" }, { status: 400 });
				}

				const response = await fetch(body.url);
				if (!response.ok) {
					return json({ error: "Failed to download image" }, { status: 400 });
				}

				const respContentType = response.headers.get("content-type") || "";
				if (!respContentType.startsWith("image/")) {
					return json(
						{ error: "URL does not point to an image" },
						{ status: 400 },
					);
				}

				const arrayBuffer = await response.arrayBuffer();
				if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
					return json(
						{ error: "Downloaded image must be under 5MB" },
						{ status: 400 },
					);
				}

				const buffer = Buffer.from(arrayBuffer);
				const { buffer: processed, ext } = await processImage(
					buffer,
					respContentType,
				);
				const filename = `${crypto.randomUUID()}${ext}`;
				await writeFile(join(UPLOADS_DIR, filename), processed);

				return json({ url: `/api/uploads/${filename}` }, { status: 201 });
			},
		},
	},
});
