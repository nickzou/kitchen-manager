import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "#/components/Link";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/sign-in")({ component: SignIn });

function SignIn() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
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
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rise-in mx-auto max-w-md rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Welcome back</p>
				<h1 className="display-title mb-6 text-3xl font-bold text-(--sea-ink)">
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

					<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
						Password
						<input
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
						/>
					</label>

					{error && (
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					)}

					<button
						type="submit"
						disabled={loading}
						className="mt-2 h-10 rounded-full bg-(--lagoon-deep) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
					>
						{loading ? "Signing in\u2026" : "Sign in"}
					</button>
				</form>

				<p className="mt-6 text-center text-sm text-(--sea-ink-soft)">
					Don&apos;t have an account?{" "}
					<Link to="/sign-up" className="font-medium">
						Sign up
					</Link>
				</p>
			</section>
		</main>
	);
}
