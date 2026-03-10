import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import InventorySubNav from "#/components/InventorySubNav";
import { Island } from "#/components/Island";
import { Page } from "#/components/Page";
import { authClient } from "#/lib/auth-client";
import {
	useDeleteQuantityUnit,
	useQuantityUnit,
	useUpdateQuantityUnit,
} from "#/lib/hooks/use-quantity-units";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/quantity-units/$id")({
	component: QuantityUnitDetail,
});

function QuantityUnitDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: sessionLoading } = authClient.useSession();

	const { data: quantityUnit, isLoading, error } = useQuantityUnit(id);
	const updateQuantityUnit = useUpdateQuantityUnit(id);
	const deleteQuantityUnit = useDeleteQuantityUnit();

	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [form, setForm] = useState({
		name: "",
		abbreviation: "",
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

	if (error || !quantityUnit) {
		return (
			<Page as="main" className="pb-8 pt-14">
				<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
					<h1 className="font-display mb-4 text-3xl font-bold text-(--sea-ink)">
						Quantity unit not found
					</h1>
					<Link
						to="/quantity-units"
						className="text-sm font-medium text-(--lagoon-deep)"
					>
						&larr; Back to quantity units
					</Link>
				</Island>
			</Page>
		);
	}

	function startEditing() {
		if (!quantityUnit) return;
		setForm({
			name: quantityUnit.name,
			abbreviation: quantityUnit.abbreviation || "",
		});
		setEditing(true);
	}

	async function handleSave(e: FormEvent) {
		e.preventDefault();
		await updateQuantityUnit.mutateAsync({
			name: form.name,
			abbreviation: form.abbreviation || undefined,
		});
		setEditing(false);
	}

	async function handleDelete() {
		await deleteQuantityUnit.mutateAsync(id);
		navigate({ to: "/quantity-units" });
	}

	const inputClass =
		"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	function formatDate(dateStr: string | null) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString();
	}

	return (
		<Page as="main" className="pb-8 pt-14">
			<Link
				to="/quantity-units"
				className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-(--lagoon-deep) no-underline hover:underline"
			>
				<ArrowLeft size={14} />
				Back to quantity units
			</Link>

			<InventorySubNav />

			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				{editing ? (
					<form onSubmit={handleSave} className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
								Edit quantity unit
							</h1>
							<button
								type="button"
								onClick={() => setEditing(false)}
								className="rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-(--surface)"
							>
								<X size={18} />
							</button>
						</div>

						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Name
							<input
								type="text"
								required
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								className={inputClass}
							/>
						</label>

						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Abbreviation
							<input
								type="text"
								value={form.abbreviation}
								onChange={(e) =>
									setForm({ ...form, abbreviation: e.target.value })
								}
								className={cn(inputClass)}
							/>
						</label>

						<button
							type="submit"
							disabled={updateQuantityUnit.isPending}
							className="mt-2 h-10 rounded-full bg-(--lagoon-deep) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
						>
							{updateQuantityUnit.isPending ? "Saving…" : "Save changes"}
						</button>
					</form>
				) : (
					<>
						<div className="mb-6 flex items-start justify-between gap-4">
							<div>
								<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
									{quantityUnit.name}
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

						{quantityUnit.abbreviation && (
							<p className="mb-4 text-sm text-(--sea-ink-soft)">
								{quantityUnit.abbreviation}
							</p>
						)}

						<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Created</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(quantityUnit.createdAt)}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Updated</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(quantityUnit.updatedAt)}
								</dd>
							</div>
						</dl>

						{confirmDelete && (
							<div className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
								<p className="flex-1 text-sm text-red-700 dark:text-red-300">
									Delete this quantity unit? This cannot be undone.
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
									disabled={deleteQuantityUnit.isPending}
									className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
								>
									{deleteQuantityUnit.isPending ? "Deleting…" : "Delete"}
								</button>
							</div>
						)}
					</>
				)}
			</Island>
		</Page>
	);
}
