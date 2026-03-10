import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Combobox } from "#/components/Combobox";
import InventorySubNav from "#/components/InventorySubNav";
import { Island } from "#/components/Island";
import { Page } from "#/components/Page";
import { authClient } from "#/lib/auth-client";
import { useQuantityUnits } from "#/lib/hooks/use-quantity-units";
import {
	useDeleteUnitConversion,
	useUnitConversion,
	useUpdateUnitConversion,
} from "#/lib/hooks/use-unit-conversions";

export const Route = createFileRoute("/unit-conversions/$id")({
	component: UnitConversionDetail,
});

function UnitConversionDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: sessionLoading } = authClient.useSession();

	const { data: conversion, isLoading, error } = useUnitConversion(id);
	const { data: units } = useQuantityUnits();
	const updateConversion = useUpdateUnitConversion(id);
	const deleteConversion = useDeleteUnitConversion();

	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [form, setForm] = useState({
		fromUnitId: "",
		toUnitId: "",
		factor: "",
	});

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	if (isLoading) {
		return (
			<Page as="main" className="pb-8 pt-14">
				<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
			</Page>
		);
	}

	if (error || !conversion) {
		return (
			<Page as="main" className="pb-8 pt-14">
				<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
					<h1 className="font-display mb-4 text-3xl font-bold text-(--sea-ink)">
						Unit conversion not found
					</h1>
					<Link
						to="/unit-conversions"
						className="text-sm font-medium text-(--lagoon-deep)"
					>
						&larr; Back to unit conversions
					</Link>
				</Island>
			</Page>
		);
	}

	function unitName(id: string) {
		const u = units?.find((u) => u.id === id);
		if (!u) return id;
		return u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name;
	}

	const unitOptions = (units ?? []).map((u) => ({
		value: u.id,
		label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
	}));

	function startEditing() {
		if (!conversion) return;
		setForm({
			fromUnitId: conversion.fromUnitId,
			toUnitId: conversion.toUnitId,
			factor: conversion.factor,
		});
		setEditing(true);
	}

	async function handleSave(e: FormEvent) {
		e.preventDefault();
		await updateConversion.mutateAsync({
			fromUnitId: form.fromUnitId,
			toUnitId: form.toUnitId,
			factor: form.factor,
		});
		setEditing(false);
	}

	async function handleDelete() {
		await deleteConversion.mutateAsync(id);
		navigate({ to: "/unit-conversions" });
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString();
	}

	const inputClass =
		"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	return (
		<Page as="main" className="pb-8 pt-14">
			<Link
				to="/unit-conversions"
				className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-(--lagoon-deep) no-underline hover:underline"
			>
				<ArrowLeft size={14} />
				Back to unit conversions
			</Link>

			<InventorySubNav />

			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				{editing ? (
					<form onSubmit={handleSave} className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
								Edit unit conversion
							</h1>
							<button
								type="button"
								onClick={() => setEditing(false)}
								className="rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-(--surface)"
							>
								<X size={18} />
							</button>
						</div>

						<div className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							From Unit
							<Combobox
								value={form.fromUnitId}
								onChange={(v) => setForm({ ...form, fromUnitId: v })}
								options={unitOptions}
								placeholder="Select unit…"
								required
							/>
						</div>

						<div className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							To Unit
							<Combobox
								value={form.toUnitId}
								onChange={(v) => setForm({ ...form, toUnitId: v })}
								options={unitOptions}
								placeholder="Select unit…"
								required
							/>
						</div>

						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Factor
							<input
								type="number"
								required
								step="any"
								value={form.factor}
								onChange={(e) => setForm({ ...form, factor: e.target.value })}
								className={inputClass}
							/>
						</label>

						<button
							type="submit"
							disabled={updateConversion.isPending}
							className="mt-2 h-10 rounded-full bg-(--lagoon-deep) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
						>
							{updateConversion.isPending ? "Saving…" : "Save changes"}
						</button>
					</form>
				) : (
					<>
						<div className="mb-6 flex items-start justify-between gap-4">
							<div>
								<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
									{unitName(conversion.fromUnitId)} &rarr;{" "}
									{unitName(conversion.toUnitId)}
								</h1>
							</div>
							<div className="flex gap-1">
								<button
									type="button"
									onClick={startEditing}
									className="rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
									title="Edit"
								>
									<Pencil size={18} />
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(true)}
									className="rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
									title="Delete"
								>
									<Trash2 size={18} />
								</button>
							</div>
						</div>

						<p className="mb-4 text-sm text-(--sea-ink-soft)">
							Factor: {conversion.factor}
						</p>

						<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Created</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(conversion.createdAt)}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Updated</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(conversion.updatedAt)}
								</dd>
							</div>
						</dl>

						{confirmDelete && (
							<div className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
								<p className="flex-1 text-sm text-red-700 dark:text-red-300">
									Delete this unit conversion? This cannot be undone.
								</p>
								<button
									type="button"
									onClick={() => setConfirmDelete(false)}
									className="rounded-lg px-3 py-1.5 text-sm font-medium text-(--sea-ink-soft) transition hover:bg-(--surface)"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleDelete}
									disabled={deleteConversion.isPending}
									className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
								>
									{deleteConversion.isPending ? "Deleting…" : "Delete"}
								</button>
							</div>
						)}
					</>
				)}
			</Island>
		</Page>
	);
}
