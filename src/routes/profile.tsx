import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ImageInput } from "#src/components/ImageInput";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { PasswordInput } from "#src/components/PasswordInput";
import { authClient } from "#src/lib/auth-client";

interface ApiKeyEntry {
	id: string;
	name: string;
	keyPrefix: string;
	lastUsedAt: string | null;
	createdAt: string;
}

interface WebhookEntry {
	id: string;
	name: string;
	url: string;
	events: string[];
	status: "active" | "suspended";
	failCount: number;
	createdAt: string;
}

const EVENT_GROUPS = {
	Stock: [
		"stock.entry.created",
		"stock.entry.updated",
		"stock.entry.deleted",
		"stock.entry.consumed",
	],
	"Meal Plan": [
		"meal_plan.entry.created",
		"meal_plan.entry.updated",
		"meal_plan.entry.deleted",
		"meal_plan.entry.cooked",
		"meal_plan.entry.uncooked",
	],
	"Meal Slot": ["meal_slot.created", "meal_slot.updated", "meal_slot.deleted"],
} as const;

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

	const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([]);
	const [newKeyName, setNewKeyName] = useState("");
	const [generatedKey, setGeneratedKey] = useState("");
	const [apiKeyLoading, setApiKeyLoading] = useState(false);
	const [apiKeyError, setApiKeyError] = useState("");
	const [keyCopied, setKeyCopied] = useState(false);

	const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
	const [webhookName, setWebhookName] = useState("");
	const [webhookUrl, setWebhookUrl] = useState("");
	const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
	const [webhookSecret, setWebhookSecret] = useState("");
	const [webhookLoading, setWebhookLoading] = useState(false);
	const [webhookError, setWebhookError] = useState("");
	const [secretCopied, setSecretCopied] = useState(false);

	const fetchApiKeys = useCallback(async () => {
		const res = await fetch("/api/api-keys");
		if (res.ok) setApiKeys(await res.json());
	}, []);

	const fetchWebhooks = useCallback(async () => {
		const res = await fetch("/api/webhooks");
		if (res.ok) setWebhooks(await res.json());
	}, []);

	useEffect(() => {
		fetchApiKeys();
		fetchWebhooks();
	}, [fetchApiKeys, fetchWebhooks]);

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

	async function handleGenerateKey(e: FormEvent) {
		e.preventDefault();
		setApiKeyError("");
		setGeneratedKey("");
		setApiKeyLoading(true);

		const res = await fetch("/api/api-keys", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: newKeyName }),
		});

		if (!res.ok) {
			const data = await res.json();
			setApiKeyError(data.error ?? "Failed to generate key");
			setApiKeyLoading(false);
			return;
		}

		const data = await res.json();
		setGeneratedKey(data.key);
		setNewKeyName("");
		setApiKeyLoading(false);
		fetchApiKeys();
	}

	async function handleDeleteKey(id: string) {
		const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
		if (res.ok) fetchApiKeys();
	}

	async function handleCopyKey() {
		await navigator.clipboard.writeText(generatedKey);
		setKeyCopied(true);
		setTimeout(() => setKeyCopied(false), 2000);
	}

	function toggleEvent(event: string) {
		setWebhookEvents((prev) =>
			prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
		);
	}

	async function handleCreateWebhook(e: FormEvent) {
		e.preventDefault();
		setWebhookError("");
		setWebhookSecret("");
		setWebhookLoading(true);

		const res = await fetch("/api/webhooks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: webhookName,
				url: webhookUrl,
				events: webhookEvents,
			}),
		});

		if (!res.ok) {
			const data = await res.json();
			setWebhookError(data.error ?? "Failed to create webhook");
			setWebhookLoading(false);
			return;
		}

		const data = await res.json();
		setWebhookSecret(data.secret);
		setWebhookName("");
		setWebhookUrl("");
		setWebhookEvents([]);
		setWebhookLoading(false);
		fetchWebhooks();
	}

	async function handleDeleteWebhook(id: string) {
		const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
		if (res.ok) fetchWebhooks();
	}

	async function handleReactivateWebhook(id: string) {
		const res = await fetch(`/api/webhooks/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "active" }),
		});
		if (res.ok) fetchWebhooks();
	}

	async function handleCopySecret() {
		await navigator.clipboard.writeText(webhookSecret);
		setSecretCopied(true);
		setTimeout(() => setSecretCopied(false), 2000);
	}

	return (
		<Page as="main" className="py-12">
			<div className="mx-auto grid gap-6 lg:grid-cols-2">
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
				<Island
					as="section"
					className="animate-rise-in rounded-2xl p-6 sm:p-8 lg:col-span-2"
				>
					<h2 className="font-display mb-6 text-xl font-bold text-(--sea-ink)">
						API Keys
					</h2>

					{apiKeys.length > 0 && (
						<ul className="mb-6 flex flex-col gap-3">
							{apiKeys.map((k) => (
								<li
									key={k.id}
									className="flex items-center justify-between gap-2 rounded-lg border border-(--line) bg-(--surface) px-3 py-2"
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium text-(--sea-ink)">
											{k.name}
										</p>
										<p className="text-xs text-(--sea-ink-soft)">
											{k.keyPrefix}...
											{k.lastUsedAt
												? ` \u00b7 Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
												: " \u00b7 Never used"}
										</p>
									</div>
									<button
										type="button"
										onClick={() => handleDeleteKey(k.id)}
										className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
									>
										Revoke
									</button>
								</li>
							))}
						</ul>
					)}

					{generatedKey && (
						<div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
							<p className="mb-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
								Copy your key now — it won't be shown again
							</p>
							<div className="flex items-center gap-2">
								<code className="min-w-0 flex-1 truncate text-xs text-amber-900 dark:text-amber-100">
									{generatedKey}
								</code>
								<button
									type="button"
									onClick={handleCopyKey}
									className="shrink-0 rounded-md bg-amber-200 px-2 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
								>
									{keyCopied ? "Copied!" : "Copy"}
								</button>
							</div>
						</div>
					)}

					<form onSubmit={handleGenerateKey} className="flex flex-col gap-4">
						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Key name
							<input
								type="text"
								required
								placeholder="e.g. My Script"
								value={newKeyName}
								onChange={(e) => setNewKeyName(e.target.value)}
								className="h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
							/>
						</label>

						{apiKeyError && (
							<p className="text-sm text-red-600 dark:text-red-400">
								{apiKeyError}
							</p>
						)}

						<button
							type="submit"
							disabled={apiKeyLoading}
							className="mt-2 h-10 rounded-full bg-(--lagoon) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
						>
							{apiKeyLoading ? "Generating\u2026" : "Generate new key"}
						</button>
					</form>
				</Island>

				<Island
					as="section"
					className="animate-rise-in rounded-2xl p-6 sm:p-8 lg:col-span-2"
				>
					<h2 className="font-display mb-6 text-xl font-bold text-(--sea-ink)">
						Webhooks
					</h2>

					{webhooks.length > 0 && (
						<ul className="mb-6 flex flex-col gap-3">
							{webhooks.map((wh) => (
								<li
									key={wh.id}
									className="flex items-center justify-between gap-2 rounded-lg border border-(--line) bg-(--surface) px-3 py-2"
								>
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<p className="truncate text-sm font-medium text-(--sea-ink)">
												{wh.name}
											</p>
											<span
												className={`inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
													wh.status === "active"
														? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
														: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
												}`}
											>
												{wh.status}
											</span>
										</div>
										<p className="truncate text-xs text-(--sea-ink-soft)">
											{wh.url} · {wh.events.length} event
											{wh.events.length !== 1 && "s"}
										</p>
									</div>
									<div className="flex shrink-0 gap-1">
										{wh.status === "suspended" && (
											<button
												type="button"
												onClick={() => handleReactivateWebhook(wh.id)}
												className="rounded-md px-2 py-1 text-xs font-medium text-green-600 transition hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
											>
												Reactivate
											</button>
										)}
										<button
											type="button"
											onClick={() => handleDeleteWebhook(wh.id)}
											className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
										>
											Delete
										</button>
									</div>
								</li>
							))}
						</ul>
					)}

					{webhookSecret && (
						<div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
							<p className="mb-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
								Copy your signing secret now — it won't be shown again
							</p>
							<div className="flex items-center gap-2">
								<code className="min-w-0 flex-1 truncate text-xs text-amber-900 dark:text-amber-100">
									{webhookSecret}
								</code>
								<button
									type="button"
									onClick={handleCopySecret}
									className="shrink-0 rounded-md bg-amber-200 px-2 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
								>
									{secretCopied ? "Copied!" : "Copy"}
								</button>
							</div>
						</div>
					)}

					<form onSubmit={handleCreateWebhook} className="flex flex-col gap-4">
						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Name
							<input
								type="text"
								required
								placeholder="e.g. My Integration"
								value={webhookName}
								onChange={(e) => setWebhookName(e.target.value)}
								className="h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
							/>
						</label>

						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							URL
							<input
								type="url"
								required
								placeholder="https://example.com/webhook"
								value={webhookUrl}
								onChange={(e) => setWebhookUrl(e.target.value)}
								className="h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
							/>
						</label>

						<fieldset className="flex flex-col gap-2">
							<legend className="text-sm font-medium text-(--sea-ink)">
								Events
							</legend>
							{Object.entries(EVENT_GROUPS).map(([group, events]) => (
								<div key={group}>
									<p className="mb-1 text-xs font-semibold text-(--sea-ink-soft)">
										{group}
									</p>
									<div className="flex flex-wrap gap-2">
										{events.map((event) => (
											<label
												key={event}
												className="flex items-center gap-1.5 text-xs text-(--sea-ink)"
											>
												<input
													type="checkbox"
													checked={webhookEvents.includes(event)}
													onChange={() => toggleEvent(event)}
													className="rounded border-(--line)"
												/>
												{event}
											</label>
										))}
									</div>
								</div>
							))}
						</fieldset>

						{webhookError && (
							<p className="text-sm text-red-600 dark:text-red-400">
								{webhookError}
							</p>
						)}

						<button
							type="submit"
							disabled={webhookLoading || webhookEvents.length === 0}
							className="mt-2 h-10 rounded-full bg-(--lagoon) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
						>
							{webhookLoading ? "Creating\u2026" : "Create webhook"}
						</button>
					</form>
				</Island>
			</div>
		</Page>
	);
}
