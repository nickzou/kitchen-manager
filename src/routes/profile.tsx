import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { ImageInput } from "#src/components/ImageInput";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { PasswordInput } from "#src/components/PasswordInput";
import { authClient } from "#src/lib/auth-client";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
	const { data: session } = authClient.useSession();

	const [name, setName] = useState("");
	const [image, setImage] = useState<string | null>(null);
	const [profileSaved, setProfileSaved] = useState(false);
	const [profileLoading, setProfileLoading] = useState(false);
	const [profileError, setProfileError] = useState("");

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [passwordSaved, setPasswordSaved] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [passwordError, setPasswordError] = useState("");

	useEffect(() => {
		if (session?.user) {
			setName(session.user.name ?? "");
			setImage(session.user.image ?? null);
		}
	}, [session?.user]);

	async function handleProfileSubmit(e: FormEvent) {
		e.preventDefault();
		setProfileError("");
		setProfileSaved(false);
		setProfileLoading(true);

		const { error } = await authClient.updateUser({
			name,
			image: image ?? undefined,
		});

		if (error) {
			setProfileError(error.message ?? "Update failed");
			setProfileLoading(false);
			return;
		}

		setProfileSaved(true);
		setProfileLoading(false);
	}

	async function handlePasswordSubmit(e: FormEvent) {
		e.preventDefault();
		setPasswordError("");
		setPasswordSaved(false);

		if (newPassword !== confirmPassword) {
			setPasswordError("Passwords do not match");
			return;
		}

		setPasswordLoading(true);

		const { error } = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true,
		});

		if (error) {
			setPasswordError(error.message ?? "Password change failed");
			setPasswordLoading(false);
			return;
		}

		setCurrentPassword("");
		setNewPassword("");
		setConfirmPassword("");
		setPasswordSaved(true);
		setPasswordLoading(false);
	}

	return (
		<Page as="main" className="py-12">
			<div className="mx-auto flex max-w-md flex-col gap-6">
				<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
					<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
						Account
					</p>
					<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
						Profile
					</h1>

					<form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Name
							<input
								type="text"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
							/>
						</label>

						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Email
							<input
								type="email"
								disabled
								value={session?.user?.email ?? ""}
								className="h-10 rounded-lg border border-(--line) bg-(--surface-strong) px-3 text-sm text-(--sea-ink-soft) outline-none"
							/>
						</label>

						<ImageInput value={image} onChange={setImage} />

						{profileError && (
							<p className="text-sm text-red-600 dark:text-red-400">
								{profileError}
							</p>
						)}
						{profileSaved && (
							<p className="text-sm text-green-600 dark:text-green-400">
								Profile updated
							</p>
						)}

						<button
							type="submit"
							disabled={profileLoading}
							className="mt-2 h-10 rounded-full bg-(--lagoon) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
						>
							{profileLoading ? "Saving\u2026" : "Save profile"}
						</button>
					</form>
				</Island>

				<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
					<h2 className="font-display mb-6 text-xl font-bold text-(--sea-ink)">
						Change password
					</h2>

					<form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
						<PasswordInput
							label="Current password"
							required
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
						/>

						<PasswordInput
							label="New password"
							required
							minLength={8}
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
						/>

						<PasswordInput
							label="Confirm new password"
							required
							minLength={8}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
						/>

						{passwordError && (
							<p className="text-sm text-red-600 dark:text-red-400">
								{passwordError}
							</p>
						)}
						{passwordSaved && (
							<p className="text-sm text-green-600 dark:text-green-400">
								Password changed
							</p>
						)}

						<button
							type="submit"
							disabled={passwordLoading}
							className="mt-2 h-10 rounded-full bg-(--lagoon) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
						>
							{passwordLoading ? "Changing\u2026" : "Change password"}
						</button>
					</form>
				</Island>
			</div>
		</Page>
	);
}
