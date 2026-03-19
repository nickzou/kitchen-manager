import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Button } from "#src/components/Button";
import { Island } from "#src/components/Island";
import { MobileLink } from "#src/components/MobileLink";
import { Page } from "#src/components/Page";
import { authClient } from "#src/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPassword,
});

function ForgotPassword() {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setLoading(true);

		await authClient.requestPasswordReset({
			email,
			redirectTo: "/reset-password",
		});

		setSubmitted(true);
		setLoading(false);
	}

	return (
		<Page as="main" className="py-12">
			<Island
				as="section"
				className="animate-rise-in mx-auto max-w-md rounded-2xl p-6 sm:p-8"
			>
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Account recovery
				</p>
				<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
					Forgot password
				</h1>

				{submitted ? (
					<div className="flex flex-col gap-4">
						<p className="text-sm text-(--sea-ink) leading-relaxed">
							If an account exists with that email, we've sent a password reset
							link. Check your inbox.
						</p>
						<MobileLink to="/sign-in" className="text-sm font-medium">
							Back to sign in
						</MobileLink>
					</div>
				) : (
					<>
						<form onSubmit={handleSubmit} className="flex flex-col gap-4">
							<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
								Email
								<input
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
								/>
							</label>

							<Button
								type="submit"
								disabled={loading}
								className="mt-2"
							>
								{loading ? "Sending\u2026" : "Send reset link"}
							</Button>
						</form>

						<p className="mt-6 text-center text-sm text-(--sea-ink-soft)">
							Remember your password?{" "}
							<MobileLink to="/sign-in" className="font-medium">
								Sign in
							</MobileLink>
						</p>
					</>
				)}
			</Island>
		</Page>
	);
}
