import "dotenv/config";
import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "#src/db";
import { product, recipe } from "#src/db/schema";

const UPLOADS_DIR = join(process.cwd(), "uploads");
const SKIP_EXTENSIONS = new Set([".webp", ".svg"]);

async function main() {
	const files = await readdir(UPLOADS_DIR);
	let processed = 0;
	let dbRowsUpdated = 0;
	let bytesSaved = 0;

	for (const filename of files) {
		const ext = extname(filename).toLowerCase();

		if (SKIP_EXTENSIONS.has(ext)) {
			console.log(`Skipping ${filename} (${ext})`);
			continue;
		}

		const filePath = join(UPLOADS_DIR, filename);
		const fileStat = await stat(filePath);
		if (!fileStat.isFile()) continue;

		const buffer = await readFile(filePath);
		const processedBuffer = await sharp(buffer)
			.resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
			.webp({ quality: 80 })
			.toBuffer();

		const baseName = filename.slice(0, filename.length - ext.length);
		const newFilename = `${baseName}.webp`;
		const newFilePath = join(UPLOADS_DIR, newFilename);

		await writeFile(newFilePath, processedBuffer);

		const oldUrl = `/api/uploads/${filename}`;
		const newUrl = `/api/uploads/${newFilename}`;

		const [productResult, recipeResult] = await Promise.all([
			db
				.update(product)
				.set({ image: newUrl })
				.where(eq(product.image, oldUrl)),
			db
				.update(recipe)
				.set({ image: newUrl })
				.where(eq(recipe.image, oldUrl)),
		]);

		const rowsUpdated =
			(productResult.rowCount ?? 0) + (recipeResult.rowCount ?? 0);
		dbRowsUpdated += rowsUpdated;

		await rm(filePath);

		const saved = fileStat.size - processedBuffer.byteLength;
		bytesSaved += saved;
		processed++;

		console.log(
			`Processed ${filename} → ${newFilename} (${fileStat.size} → ${processedBuffer.byteLength} bytes, ${rowsUpdated} DB rows updated)`,
		);
	}

	console.log("\n--- Summary ---");
	console.log(`Files processed: ${processed}`);
	console.log(`DB rows updated: ${dbRowsUpdated}`);
	console.log(
		`Space saved: ${(bytesSaved / 1024).toFixed(1)} KB (${(bytesSaved / 1024 / 1024).toFixed(2)} MB)`,
	);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Error:", err);
		process.exit(1);
	});
