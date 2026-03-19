import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { AlertText } from "#src/components/AlertText";
import { Button } from "#src/components/Button";
import { Island } from "#src/components/Island";
import { MobileLink } from "#src/components/MobileLink";
import { Page } from "#src/components/Page";
import { PasswordInput } from "#src/components/PasswordInput";
import { authClient } from "#src/lib/auth-client";

export const Route = createFileRoute("/sign-in")({ component: SignIn });

function SignIn() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const { error: signInError } = await authClient.signIn.email({
			email,
			password,
		});

		if (signInError) {
			setError(signInError.message ?? "Sign in failed");
			setLoading(false);
			return;
		}

		navigate({ to: "/" });
	}

	return (
		<Page as="main" className="py-12">
			<Island
				as="section"
				className="animate-rise-in mx-auto max-w-md rounded-2xl p-6 sm:p-8"
			>
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Welcome back
				</p>
				<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
					Sign in
				</h1>

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

					<PasswordInput
						label="Password"
						required
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>

					<div className="text-right">
						<MobileLink
							to="/forgot-password"
							className="text-xs font-medium text-(--sea-ink-soft)"
						>
							Forgot password?
						</MobileLink>
					</div>

					{error && <AlertText>{error}</AlertText>}

					<Button type="submit" disabled={loading} className="mt-2">
						{loading ? "Signing in\u2026" : "Sign in"}
					</Button>
				</form>

				<p className="mt-6 text-center text-sm text-(--sea-ink-soft)">
					Don&apos;t have an account?{" "}
					<MobileLink to="/sign-up" className="font-medium">
						Sign up
					</MobileLink>
				</p>
			</Island>
		</Page>
	);
}
