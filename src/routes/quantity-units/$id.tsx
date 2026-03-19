import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { AlertBox } from "#src/components/AlertBox";
import { Button } from "#src/components/Button";
import { Combobox } from "#src/components/Combobox";
import { Input } from "#src/components/Input";
import InventorySubNav from "#src/components/InventorySubNav";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { authClient } from "#src/lib/auth-client";
import {
	useDeleteQuantityUnit,
	useQuantityUnit,
	useQuantityUnits,
	useUpdateQuantityUnit,
} from "#src/lib/hooks/use-quantity-units";
import {
	type UnitConversion,
	useCreateUnitConversion,
	useDeleteUnitConversion,
	useUnitConversions,
	useUpdateUnitConversion,
} from "#src/lib/hooks/use-unit-conversions";

export const Route = createFileRoute("/quantity-units/$id")({
	component: QuantityUnitDetail,
});

function QuantityUnitDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: sessionLoading } = authClient.useSession();

	const { data: quantityUnit, isLoading, error } = useQuantityUnit(id);
	const { data: allUnits } = useQuantityUnits();
	const { data: conversions } = useUnitConversions();
	const updateQuantityUnit = useUpdateQuantityUnit(id);
	const deleteQuantityUnit = useDeleteQuantityUnit();
	const createConversion = useCreateUnitConversion();
	const deleteConversion = useDeleteUnitConversion();

	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [form, setForm] = useState({
		name: "",
		abbreviation: "",
	});

	const [newConvToUnitId, setNewConvToUnitId] = useState("");
	const [newConvFactor, setNewConvFactor] = useState("");

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

	const unitConversions =
		conversions?.filter((c) => c.fromUnitId === id || c.toUnitId === id) ?? [];

	function unitName(unitId: string) {
		const u = allUnits?.find((u) => u.id === unitId);
		if (!u) return unitId;
		return u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name;
	}

	function otherUnitId(c: UnitConversion) {
		return c.fromUnitId === id ? c.toUnitId : c.fromUnitId;
	}

	function displayFactor(c: UnitConversion) {
		if (c.fromUnitId === id) return c.factor;
		const inv = 1 / Number(c.factor);
		return inv % 1 === 0 ? String(inv) : inv.toPrecision(6);
	}

	const unitOptions = (allUnits ?? [])
		.filter((u) => u.id !== id)
		.map((u) => ({
			value: u.id,
			label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
		}));

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

	async function handleAddConversion() {
		if (!newConvToUnitId || !newConvFactor) return;
		await createConversion.mutateAsync({
			fromUnitId: id,
			toUnitId: newConvToUnitId,
			factor: newConvFactor,
		});
		setNewConvToUnitId("");
		setNewConvFactor("");
	}

	async function handleDeleteConversion(conversionId: string) {
		await deleteConversion.mutateAsync(conversionId);
	}

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
							<Input
								type="text"
								required
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
							/>
						</label>

						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Abbreviation
							<Input
								type="text"
								value={form.abbreviation}
								onChange={(e) =>
									setForm({ ...form, abbreviation: e.target.value })
								}
							/>
						</label>

						<div className="border-t border-(--line) pt-4">
							<h2 className="mb-3 text-sm font-semibold text-(--sea-ink)">
								Conversions
							</h2>
							{unitConversions.length === 0 ? (
								<p className="mb-3 text-sm text-(--sea-ink-soft)">
									No conversions for this unit.
								</p>
							) : (
								<div className="mb-3 flex flex-col gap-2">
									{unitConversions.map((c) => (
										<EditConversionInline
											key={c.id}
											conversion={c}
											unitName={unitName}
											otherUnitId={otherUnitId(c)}
											displayFactor={displayFactor(c)}
											onDelete={() => handleDeleteConversion(c.id)}
										/>
									))}
								</div>
							)}

							<div className="flex flex-wrap items-end gap-2">
								<div className="flex-1 min-w-[140px]">
									<Combobox
										value={newConvToUnitId}
										onChange={setNewConvToUnitId}
										options={unitOptions}
										placeholder="Target unit"
									/>
								</div>
								<Input
									type="number"
									step="any"
									placeholder="Factor"
									value={newConvFactor}
									onChange={(e) => setNewConvFactor(e.target.value)}
									className="w-28"
								/>
								<Button
									type="button"
									onClick={handleAddConversion}
									disabled={
										createConversion.isPending ||
										!newConvToUnitId ||
										!newConvFactor
									}
									className="flex items-center gap-1 px-3"
								>
									<Plus size={14} />
									Add
								</Button>
							</div>
						</div>

						<Button
							type="submit"
							disabled={updateQuantityUnit.isPending}
							className="mt-2"
						>
							{updateQuantityUnit.isPending ? "Saving…" : "Save changes"}
						</Button>
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

						<div className="mt-6 border-t border-(--line) pt-4">
							<h2 className="mb-3 text-sm font-semibold text-(--sea-ink)">
								Conversions
							</h2>
							{unitConversions.length === 0 ? (
								<p className="text-sm text-(--sea-ink-soft)">
									No conversions for this unit.
								</p>
							) : (
								<div className="flex flex-col gap-1">
									{unitConversions.map((c) => (
										<div
											key={c.id}
											className="flex items-center justify-between rounded-lg px-2 py-1.5"
										>
											<span className="text-sm text-(--sea-ink)">
												→ {unitName(otherUnitId(c))}: {displayFactor(c)}
											</span>
											<button
												type="button"
												onClick={() => handleDeleteConversion(c.id)}
												className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
												title="Delete conversion"
											>
												<Trash2 size={14} />
											</button>
										</div>
									))}
								</div>
							)}
						</div>

						{confirmDelete && (
							<AlertBox className="mt-6 flex items-center gap-3">
								<p className="flex-1 text-sm">
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
							</AlertBox>
						)}
					</>
				)}
			</Island>
		</Page>
	);
}

function EditConversionInline({
	conversion,
	unitName,
	otherUnitId,
	displayFactor,
	onDelete,
}: {
	conversion: UnitConversion;
	unitName: (id: string) => string;
	otherUnitId: string;
	displayFactor: string;
	onDelete: () => void;
}) {
	const updateConversion = useUpdateUnitConversion(conversion.id);
	const [editingFactor, setEditingFactor] = useState(false);
	const [factorValue, setFactorValue] = useState(conversion.factor);

	async function handleSaveFactor() {
		await updateConversion.mutateAsync({ factor: factorValue });
		setEditingFactor(false);
	}

	return (
		<div className="flex items-center gap-2 rounded-lg border border-(--line) px-3 py-2">
			<span className="flex-1 text-sm text-(--sea-ink)">
				→ {unitName(otherUnitId)}:
			</span>
			{editingFactor ? (
				<>
					<input
						type="number"
						step="any"
						value={factorValue}
						onChange={(e) => setFactorValue(e.target.value)}
						className="h-8 w-24 rounded-lg border border-(--line) bg-(--surface) px-2 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
					/>
					<button
						type="button"
						onClick={handleSaveFactor}
						disabled={updateConversion.isPending}
						className="rounded-lg p-1 text-(--lagoon-deep) transition hover:bg-(--surface)"
						title="Save factor"
					>
						<Check size={14} />
					</button>
					<button
						type="button"
						onClick={() => {
							setFactorValue(conversion.factor);
							setEditingFactor(false);
						}}
						className="rounded-lg p-1 text-(--sea-ink-soft) transition hover:bg-(--surface)"
						title="Cancel"
					>
						<X size={14} />
					</button>
				</>
			) : (
				<>
					<span className="text-sm text-(--sea-ink-soft)">{displayFactor}</span>
					<button
						type="button"
						onClick={() => {
							setFactorValue(conversion.factor);
							setEditingFactor(true);
						}}
						className="rounded-lg p-1 text-(--sea-ink-soft) transition hover:bg-(--surface)"
						title="Edit factor"
					>
						<Pencil size={14} />
					</button>
				</>
			)}
			<button
				type="button"
				onClick={onDelete}
				className="rounded-lg p-1 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
				title="Delete conversion"
			>
				<Trash2 size={14} />
			</button>
		</div>
	);
}
