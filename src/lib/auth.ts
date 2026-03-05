import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	secret: process.env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
	},
	plugins: [tanstackStartCookies()],
});
