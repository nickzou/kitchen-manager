import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "#src/db";
import { user } from "#src/db/auth-schema";
import { quantityUnit, unitConversion } from "#src/db/schema";
import { defaultConversions, defaultUnits } from "#src/db/seed-data";

export async function seedUnitsForUser(userId: string) {
	const inserted = await db
		.insert(quantityUnit)
		.values(defaultUnits.map((u) => ({ ...u, userId })))
		.returning({
			id: quantityUnit.id,
			abbreviation: quantityUnit.abbreviation,
		});

	const abbrToId = new Map(inserted.map((row) => [row.abbreviation, row.id]));

	const conversionRows = defaultConversions
		.map((c) => {
			const fromUnitId = abbrToId.get(c.from);
			const toUnitId = abbrToId.get(c.to);
			if (!fromUnitId || !toUnitId) return null;
			return { fromUnitId, toUnitId, factor: c.factor, userId };
		})
		.filter((row): row is NonNullable<typeof row> => row !== null);

	if (conversionRows.length > 0) {
		await db.insert(unitConversion).values(conversionRows);
	}
}

// Run as standalone script
const isMain =
	import.meta.url === `file://${process.argv[1]}` ||
	import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
	(async () => {
		const users = await db.select({ id: user.id }).from(user);
		let seeded = 0;

		for (const u of users) {
			const existing = await db
				.select({ id: quantityUnit.id })
				.from(quantityUnit)
				.where(eq(quantityUnit.userId, u.id))
				.limit(1);

			if (existing.length === 0) {
				await seedUnitsForUser(u.id);
				seeded++;
			}
		}

		console.log(
			`Seeded ${seeded} user(s). Skipped ${users.length - seeded} user(s) with existing units.`,
		);
		process.exit(0);
	})();
}
