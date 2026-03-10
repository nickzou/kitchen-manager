import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#src/db";
import { seedUnitsForUser } from "#src/db/seed-units";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	secret: process.env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
	},
	plugins: [tanstackStartCookies()],
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await seedUnitsForUser(user.id);
				},
			},
		},
	},
});
