import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { AlertText } from "#src/components/AlertText";
import { Button } from "#src/components/Button";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { PasswordInput } from "#src/components/PasswordInput";
import { authClient } from "#src/lib/auth-client";

export const Route = createFileRoute("/reset-password")({
	component: ResetPassword,
});

function ResetPassword() {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError("");

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		setLoading(true);

		const { error: resetError } = await authClient.resetPassword({
			newPassword: password,
		});

		if (resetError) {
			setError(resetError.message ?? "Reset failed");
			setLoading(false);
			return;
		}

		navigate({ to: "/sign-in" });
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
					Reset password
				</h1>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<PasswordInput
						label="New password"
						required
						minLength={8}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>

					<PasswordInput
						label="Confirm password"
						required
						minLength={8}
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
					/>

					{error && <AlertText>{error}</AlertText>}

					<Button type="submit" disabled={loading} className="mt-2">
						{loading ? "Resetting\u2026" : "Reset password"}
					</Button>
				</form>
			</Island>
		</Page>
	);
}
