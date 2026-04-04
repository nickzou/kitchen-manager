import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Code, Lock, Settings, User } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AlertBox } from "#src/components/AlertBox";
import { AlertText } from "#src/components/AlertText";
import { Button } from "#src/components/Button";
import { ImageInput } from "#src/components/ImageInput";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { PasswordInput } from "#src/components/PasswordInput";
import { authClient } from "#src/lib/auth-client";
import {
	useUpdateUserSettings,
	useUserSettings,
} from "#src/lib/hooks/use-user-settings";

type Section = "profile" | "password" | "preferences" | "developer";

const NAV_ITEMS: { key: Section; label: string; icon: typeof User }[] = [
	{ key: "profile", label: "Profile", icon: User },
	{ key: "password", label: "Password", icon: Lock },
	{ key: "preferences", label: "Preferences", icon: Settings },
	{ key: "developer", label: "Developer", icon: Code },
];

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
	const { data: settings } = useUserSettings();
	const updateSettings = useUpdateUserSettings();

	const [activeSection, setActiveSection] = useState<Section>("profile");
	const [dropdownOpen, setDropdownOpen] = useState(false);

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
			<div className="mx-auto flex flex-col gap-6 lg:flex-row lg:gap-8">
				{/* Mobile section picker */}
				<div className="relative lg:hidden">
					<button
						type="button"
						onClick={() => setDropdownOpen(!dropdownOpen)}
						className="flex h-10 w-full items-center justify-between rounded-lg border border-(--line) bg-(--surface) px-3 text-sm font-medium text-(--sea-ink) outline-none focus:border-(--lagoon)"
					>
						<span className="flex items-center gap-2.5">
							{(() => {
								const item = NAV_ITEMS.find((n) => n.key === activeSection);
								if (!item) return null;
								const Icon = item.icon;
								return (
									<>
										<Icon className="h-4 w-4" />
										{item.label}
									</>
								);
							})()}
						</span>
						<ChevronDown
							className={`h-4 w-4 text-(--sea-ink-soft) transition ${dropdownOpen ? "rotate-180" : ""}`}
						/>
					</button>
					{dropdownOpen && (
						<>
							<button
								type="button"
								aria-label="Close menu"
								className="fixed inset-0 z-40"
								onClick={() => setDropdownOpen(false)}
							/>
							<ul className="absolute left-0 right-0 z-50 mt-1 flex flex-col gap-1 rounded-xl border border-(--line) bg-(--surface) p-2 shadow-lg">
								{NAV_ITEMS.map(({ key, label, icon: Icon }) => (
									<li key={key}>
										<button
											type="button"
											onClick={() => {
												setActiveSection(key);
												setDropdownOpen(false);
											}}
											className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
												activeSection === key
													? "bg-(--surface-strong) font-semibold text-(--sea-ink)"
													: "text-(--sea-ink-soft) hover:bg-(--surface-strong) hover:text-(--sea-ink)"
											}`}
										>
											<Icon className="h-4 w-4" />
											{label}
										</button>
									</li>
								))}
							</ul>
						</>
					)}
				</div>

				{/* Sidebar nav (desktop only) */}
				<nav className="hidden w-52 shrink-0 lg:sticky lg:top-24 lg:block lg:self-start">
					<ul className="flex flex-col gap-1">
						{NAV_ITEMS.map(({ key, label, icon: Icon }) => (
							<li key={key}>
								<button
									type="button"
									onClick={() => setActiveSection(key)}
									className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
										activeSection === key
											? "border-l-2 border-(--lagoon) bg-(--surface) font-semibold text-(--sea-ink)"
											: "text-(--sea-ink-soft) hover:bg-(--surface) hover:text-(--sea-ink)"
									}`}
								>
									<Icon className="h-4 w-4" />
									{label}
								</button>
							</li>
						))}
					</ul>
				</nav>

				{/* Content area */}
				<div className="min-w-0 flex-1">
					<Island
						as="section"
						className="animate-rise-in sm:rounded-2xl p-6 sm:p-8"
					>
						{activeSection === "profile" && (
							<>
								<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
									Account
								</p>
								<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
									Profile
								</h1>

								<form
									onSubmit={handleProfileSubmit}
									className="flex flex-col gap-4"
								>
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

									{profileError && <AlertText>{profileError}</AlertText>}
									{profileSaved && (
										<AlertText variant="success">Profile updated</AlertText>
									)}

									<Button
										type="submit"
										disabled={profileLoading}
										className="mt-2"
									>
										{profileLoading ? "Saving\u2026" : "Save profile"}
									</Button>
								</form>
							</>
						)}

						{activeSection === "password" && (
							<>
								<h2 className="font-display mb-6 text-xl font-bold text-(--sea-ink)">
									Change password
								</h2>

								<form
									onSubmit={handlePasswordSubmit}
									className="flex flex-col gap-4"
								>
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

									{passwordError && <AlertText>{passwordError}</AlertText>}
									{passwordSaved && (
										<AlertText variant="success">Password changed</AlertText>
									)}

									<Button
										type="submit"
										disabled={passwordLoading}
										className="mt-2"
									>
										{passwordLoading ? "Changing\u2026" : "Change password"}
									</Button>
								</form>
							</>
						)}

						{activeSection === "preferences" && (
							<>
								<h2 className="font-display mb-6 text-xl font-bold text-(--sea-ink)">
									Preferences
								</h2>

								<label className="flex items-center justify-between gap-3">
									<div>
										<p className="text-sm font-medium text-(--sea-ink)">
											Week starts on
										</p>
										<p className="text-xs text-(--sea-ink-soft)">
											Choose which day your meal plan week begins
										</p>
									</div>
									<select
										value={settings?.weekStartDay ?? 1}
										onChange={(e) =>
											updateSettings.mutate({
												weekStartDay: Number(e.target.value),
											})
										}
										className="h-9 rounded-lg border border-(--line) bg-(--surface) px-2 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
									>
										<option value={0}>Sunday</option>
										<option value={1}>Monday</option>
										<option value={6}>Saturday</option>
									</select>
								</label>

								<hr className="my-4 border-(--line)" />

								<label className="flex items-center justify-between gap-3">
									<div>
										<p className="text-sm font-medium text-(--sea-ink)">
											Nutrition Tracking
										</p>
										<p className="text-xs text-(--sea-ink-soft)">
											Track calories and macros for products and recipes
										</p>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={settings?.nutritionEnabled ?? false}
										onClick={() =>
											updateSettings.mutate({
												nutritionEnabled: !settings?.nutritionEnabled,
											})
										}
										className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-(--lagoon) focus-visible:ring-offset-2 ${
											settings?.nutritionEnabled
												? "bg-(--lagoon)"
												: "bg-(--line)"
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
												settings?.nutritionEnabled
													? "translate-x-5"
													: "translate-x-0"
											}`}
										/>
									</button>
								</label>

								<hr className="my-4 border-(--line)" />

								<label className="flex items-center justify-between gap-3">
									<div>
										<p className="text-sm font-medium text-(--sea-ink)">
											Advanced mode
										</p>
										<p className="text-xs text-(--sea-ink-soft)">
											Enable advanced features and options
										</p>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={settings?.advancedMode ?? false}
										onClick={() =>
											updateSettings.mutate({
												advancedMode: !settings?.advancedMode,
											})
										}
										className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-(--lagoon) focus-visible:ring-offset-2 ${
											settings?.advancedMode ? "bg-(--lagoon)" : "bg-(--line)"
										}`}
									>
										<span
											className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
												settings?.advancedMode
													? "translate-x-5"
													: "translate-x-0"
											}`}
										/>
									</button>
								</label>
							</>
						)}

						{activeSection === "developer" && (
							<>
								<h2 className="font-display mb-6 text-xl font-bold text-(--sea-ink)">
									Developer
								</h2>
								<div className="flex flex-col gap-4">
									<label className="flex items-center justify-between gap-3">
										<div>
											<p className="text-sm font-medium text-(--sea-ink)">
												API Keys
											</p>
											<p className="text-xs text-(--sea-ink-soft)">
												Generate API keys for external integrations
											</p>
										</div>
										<button
											type="button"
											role="switch"
											aria-checked={settings?.apiEnabled ?? false}
											onClick={() =>
												updateSettings.mutate({
													apiEnabled: !settings?.apiEnabled,
												})
											}
											className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-(--lagoon) focus-visible:ring-offset-2 ${
												settings?.apiEnabled ? "bg-(--lagoon)" : "bg-(--line)"
											}`}
										>
											<span
												className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
													settings?.apiEnabled
														? "translate-x-5"
														: "translate-x-0"
												}`}
											/>
										</button>
									</label>

									<label className="flex items-center justify-between gap-3">
										<div>
											<p className="text-sm font-medium text-(--sea-ink)">
												Webhooks
											</p>
											<p className="text-xs text-(--sea-ink-soft)">
												Send event notifications to external URLs
											</p>
										</div>
										<button
											type="button"
											role="switch"
											aria-checked={settings?.webhooksEnabled ?? false}
											onClick={() =>
												updateSettings.mutate({
													webhooksEnabled: !settings?.webhooksEnabled,
												})
											}
											className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-(--lagoon) focus-visible:ring-offset-2 ${
												settings?.webhooksEnabled
													? "bg-(--lagoon)"
													: "bg-(--line)"
											}`}
										>
											<span
												className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
													settings?.webhooksEnabled
														? "translate-x-5"
														: "translate-x-0"
												}`}
											/>
										</button>
									</label>
								</div>

								{(settings?.apiEnabled || settings?.webhooksEnabled) && (
									<hr className="my-8 border-(--line)" />
								)}

								{settings?.apiEnabled && (
									<>
										<h3 className="font-display mb-6 text-lg font-bold text-(--sea-ink)">
											API Keys
										</h3>

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
											<AlertBox variant="warning" className="mb-6 p-3">
												<p className="mb-1 text-xs font-semibold">
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
											</AlertBox>
										)}

										<form
											onSubmit={handleGenerateKey}
											className="flex flex-col gap-4"
										>
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

											{apiKeyError && <AlertText>{apiKeyError}</AlertText>}

											<Button
												type="submit"
												disabled={apiKeyLoading}
												className="mt-2"
											>
												{apiKeyLoading
													? "Generating\u2026"
													: "Generate new key"}
											</Button>
										</form>

										{settings?.webhooksEnabled && (
											<hr className="my-8 border-(--line)" />
										)}
									</>
								)}

								{settings?.webhooksEnabled && (
									<>
										<h3 className="font-display mb-6 text-lg font-bold text-(--sea-ink)">
											Webhooks
										</h3>

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
											<AlertBox variant="warning" className="mb-6 p-3">
												<p className="mb-1 text-xs font-semibold">
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
											</AlertBox>
										)}

										<form
											onSubmit={handleCreateWebhook}
											className="flex flex-col gap-4"
										>
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

											{webhookError && <AlertText>{webhookError}</AlertText>}

											<Button
												type="submit"
												disabled={webhookLoading || webhookEvents.length === 0}
												className="mt-2"
											>
												{webhookLoading ? "Creating\u2026" : "Create webhook"}
											</Button>
										</form>
									</>
								)}
							</>
						)}
					</Island>
				</div>
			</div>
		</Page>
	);
}
