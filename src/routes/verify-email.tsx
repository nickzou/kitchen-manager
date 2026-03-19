import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#src/components/Button";
import { Island } from "#src/components/Island";
import { MobileLink } from "#src/components/MobileLink";
import { Page } from "#src/components/Page";
import { authClient } from "#src/lib/auth-client";

export const Route = createFileRoute("/verify-email")({
	component: VerifyEmail,
	validateSearch: (search: Record<string, unknown>) => ({
		email: (search.email as string) ?? "",
	}),
});

function VerifyEmail() {
	const { email } = useSearch({ from: "/verify-email" });
	const [resent, setResent] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleResend() {
		if (!email) return;
		setLoading(true);

		await authClient.sendVerificationEmail({ email });

		setResent(true);
		setLoading(false);
	}

	return (
		<Page as="main" className="py-12">
			<Island
				as="section"
				className="animate-rise-in mx-auto max-w-md rounded-2xl p-6 sm:p-8"
			>
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					One more step
				</p>
				<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
					Check your email
				</h1>

				<p className="text-sm text-(--sea-ink) leading-relaxed">
					We've sent a verification link to{" "}
					{email ? <strong>{email}</strong> : "your email"}. Click the link to
					verify your account.
				</p>

				<div className="mt-6 flex flex-col gap-3">
					{email && (
						<Button
							type="button"
							onClick={handleResend}
							disabled={loading || resent}
						>
							{resent
								? "Email resent"
								: loading
									? "Sending\u2026"
									: "Resend verification email"}
						</Button>
					)}

					<p className="text-center text-sm text-(--sea-ink-soft)">
						<MobileLink to="/sign-in" className="font-medium">
							Back to sign in
						</MobileLink>
					</p>
				</div>
			</Island>
		</Page>
	);
}
