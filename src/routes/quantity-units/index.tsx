import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Grid3x3, List, Plus, Rows3 } from "lucide-react";
import { type FormEvent, useState } from "react";
import InventorySubNav from "#/components/InventorySubNav";
import { Island } from "#/components/Island";
import { Page } from "#/components/Page";
import { authClient } from "#/lib/auth-client";
import {
	type QuantityUnit,
	useCreateQuantityUnit,
	useQuantityUnits,
} from "#/lib/hooks/use-quantity-units";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/quantity-units/")({
	component: QuantityUnitsPage,
});

type ViewMode = "grid" | "table" | "compact";

function QuantityUnitsPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: quantityUnits, isLoading } = useQuantityUnits();
	const createQuantityUnit = useCreateQuantityUnit();

	const [view, setView] = useState<ViewMode>("grid");
	const [name, setName] = useState("");
	const [abbreviation, setAbbreviation] = useState("");

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		await createQuantityUnit.mutateAsync({
			name: name.trim(),
			abbreviation: abbreviation.trim() || undefined,
		});
		setName("");
		setAbbreviation("");
	}

	const inputClass =
		"h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	return (
		<Page as="main" className="pb-8 pt-14">
			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Organization
				</p>
				<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
					Quantity Units
				</h1>

				<InventorySubNav />

				<form
					onSubmit={handleSubmit}
					className="mb-6 flex flex-wrap gap-3 border-b border-(--line) pb-6"
				>
					<input
						type="text"
						placeholder="Unit name *"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						className={cn(inputClass, "flex-1 min-w-[160px]")}
					/>
					<input
						type="text"
						placeholder="Abbreviation"
						value={abbreviation}
						onChange={(e) => setAbbreviation(e.target.value)}
						className={cn(inputClass, "w-48")}
					/>
					<button
						type="submit"
						disabled={createQuantityUnit.isPending}
						className="flex h-10 items-center gap-1.5 rounded-full bg-(--lagoon-deep) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
					>
						<Plus size={16} />
						Add
					</button>
				</form>

				<div className="mb-4 flex items-center gap-1">
					{(
						[
							["grid", Grid3x3],
							["table", List],
							["compact", Rows3],
						] as const
					).map(([mode, Icon]) => (
						<button
							key={mode}
							type="button"
							onClick={() => setView(mode)}
							className={cn(
								"rounded-lg p-2 transition",
								view === mode
									? "bg-(--lagoon) text-white"
									: "text-(--sea-ink-soft) hover:bg-(--surface)",
							)}
							title={`${mode} view`}
						>
							<Icon size={18} />
						</button>
					))}
				</div>

				{isLoading ? (
					<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
				) : !quantityUnits?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No quantity units yet. Add one above!
					</p>
				) : view === "grid" ? (
					<GridView quantityUnits={quantityUnits} />
				) : view === "table" ? (
					<TableView quantityUnits={quantityUnits} />
				) : (
					<CompactView quantityUnits={quantityUnits} />
				)}
			</Island>
		</Page>
	);
}

function formatDate(dateStr: string | null) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString();
}

function GridView({ quantityUnits }: { quantityUnits: QuantityUnit[] }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{quantityUnits.map((u) => (
				<Link
					key={u.id}
					to="/quantity-units/$id"
					params={{ id: u.id }}
					className="block rounded-xl border border-(--line) bg-linear-165 from-(--surface-strong) to-(--surface) shadow-[inset_0_1px_0_var(--inset-glint),0_22px_44px_rgba(30,90,72,0.1),0_6px_18px_rgba(23,58,64,0.08)] backdrop-blur-[4px] p-4 no-underline transition hover:-translate-y-0.5"
				>
					<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
						{u.name}
					</h3>
					{u.abbreviation && (
						<p className="m-0 text-xs text-(--sea-ink-soft)">
							{u.abbreviation}
						</p>
					)}
				</Link>
			))}
		</div>
	);
}

function TableView({ quantityUnits }: { quantityUnits: QuantityUnit[] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b border-(--line) text-xs font-semibold uppercase tracking-wide text-(--sea-ink-soft)">
						<th className="pb-2 pr-4">Name</th>
						<th className="pb-2 pr-4">Abbreviation</th>
						<th className="pb-2">Created</th>
					</tr>
				</thead>
				<tbody>
					{quantityUnits.map((u) => (
						<tr key={u.id} className="border-b border-(--line) last:border-0">
							<td className="py-2.5 pr-4">
								<Link
									to="/quantity-units/$id"
									params={{ id: u.id }}
									className="font-medium text-(--lagoon-deep) no-underline hover:underline"
								>
									{u.name}
								</Link>
							</td>
							<td className="py-2.5 pr-4 text-(--sea-ink-soft)">
								{u.abbreviation || "—"}
							</td>
							<td className="py-2.5 text-(--sea-ink-soft)">
								{formatDate(u.createdAt)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CompactView({ quantityUnits }: { quantityUnits: QuantityUnit[] }) {
	return (
		<div className="flex flex-col gap-1">
			{quantityUnits.map((u) => (
				<Link
					key={u.id}
					to="/quantity-units/$id"
					params={{ id: u.id }}
					className="flex items-center justify-between rounded-lg px-3 py-2 no-underline transition hover:bg-(--surface)"
				>
					<span className="text-sm font-medium text-(--sea-ink)">{u.name}</span>
					<span className="text-xs text-(--sea-ink-soft)">
						{u.abbreviation || "—"}
					</span>
				</Link>
			))}
		</div>
	);
}
