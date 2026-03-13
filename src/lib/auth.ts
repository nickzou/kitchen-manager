import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#src/db";
import { seedUnitsForUser } from "#src/db/seed-units";
import { sendEmail } from "#src/lib/email";
import {
	resetPasswordEmailHtml,
	verifyEmailHtml,
} from "#src/lib/email-templates";

export const auth = betterAuth({
	baseURL: process.env.APP_URL,
	database: drizzleAdapter(db, { provider: "pg" }),
	secret: process.env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			await sendEmail(
				user.email,
				"Reset your password",
				resetPasswordEmailHtml(url),
			);
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail(user.email, "Verify your email", verifyEmailHtml(url));
		},
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
