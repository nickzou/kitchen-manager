import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Grid3x3, List, Plus, Rows3 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Combobox } from "#/components/Combobox";
import InventorySubNav from "#/components/InventorySubNav";
import { Island } from "#/components/Island";
import { Page } from "#/components/Page";
import { authClient } from "#/lib/auth-client";
import { useQuantityUnits } from "#/lib/hooks/use-quantity-units";
import {
	type UnitConversion,
	useCreateUnitConversion,
	useUnitConversions,
} from "#/lib/hooks/use-unit-conversions";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/unit-conversions/")({
	component: UnitConversionsPage,
});

type ViewMode = "grid" | "table" | "compact";

function UnitConversionsPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: conversions, isLoading } = useUnitConversions();
	const { data: units } = useQuantityUnits();
	const createConversion = useCreateUnitConversion();

	const [view, setView] = useState<ViewMode>("grid");
	const [fromUnitId, setFromUnitId] = useState("");
	const [toUnitId, setToUnitId] = useState("");
	const [factor, setFactor] = useState("");

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
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

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!fromUnitId || !toUnitId || !factor) return;
		await createConversion.mutateAsync({
			fromUnitId,
			toUnitId,
			factor,
		});
		setFromUnitId("");
		setToUnitId("");
		setFactor("");
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
					Unit Conversions
				</h1>

				<InventorySubNav />

				<form
					onSubmit={handleSubmit}
					className="mb-6 flex flex-wrap gap-3 border-b border-(--line) pb-6"
				>
					<Combobox
						value={fromUnitId}
						onChange={setFromUnitId}
						options={unitOptions}
						placeholder="From unit *"
						required
						className="flex-1 min-w-[160px]"
					/>
					<Combobox
						value={toUnitId}
						onChange={setToUnitId}
						options={unitOptions}
						placeholder="To unit *"
						required
						className="flex-1 min-w-[160px]"
					/>
					<input
						type="number"
						placeholder="Factor *"
						required
						step="any"
						value={factor}
						onChange={(e) => setFactor(e.target.value)}
						className={cn(inputClass, "w-32")}
					/>
					<button
						type="submit"
						disabled={createConversion.isPending}
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
				) : !conversions?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No unit conversions yet. Add one above!
					</p>
				) : view === "grid" ? (
					<GridView conversions={conversions} unitName={unitName} />
				) : view === "table" ? (
					<TableView conversions={conversions} unitName={unitName} />
				) : (
					<CompactView conversions={conversions} unitName={unitName} />
				)}
			</Island>
		</Page>
	);
}

function formatDate(dateStr: string | null) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString();
}

interface ViewProps {
	conversions: UnitConversion[];
	unitName: (id: string) => string;
}

function GridView({ conversions, unitName }: ViewProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{conversions.map((c) => (
				<Link
					key={c.id}
					to="/unit-conversions/$id"
					params={{ id: c.id }}
					className="block rounded-xl border border-(--line) bg-linear-165 from-(--surface-strong) to-(--surface) shadow-[inset_0_1px_0_var(--inset-glint),0_22px_44px_rgba(30,90,72,0.1),0_6px_18px_rgba(23,58,64,0.08)] backdrop-blur-[4px] p-4 no-underline transition hover:-translate-y-0.5"
				>
					<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
						{unitName(c.fromUnitId)} &rarr; {unitName(c.toUnitId)}
					</h3>
					<p className="m-0 text-xs text-(--sea-ink-soft)">
						Factor: {c.factor}
					</p>
				</Link>
			))}
		</div>
	);
}

function TableView({ conversions, unitName }: ViewProps) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b border-(--line) text-xs font-semibold uppercase tracking-wide text-(--sea-ink-soft)">
						<th className="pb-2 pr-4">From Unit</th>
						<th className="pb-2 pr-4">To Unit</th>
						<th className="pb-2 pr-4">Factor</th>
						<th className="pb-2">Created</th>
					</tr>
				</thead>
				<tbody>
					{conversions.map((c) => (
						<tr key={c.id} className="border-b border-(--line) last:border-0">
							<td className="py-2.5 pr-4">
								<Link
									to="/unit-conversions/$id"
									params={{ id: c.id }}
									className="font-medium text-(--lagoon-deep) no-underline hover:underline"
								>
									{unitName(c.fromUnitId)}
								</Link>
							</td>
							<td className="py-2.5 pr-4 text-(--sea-ink)">
								{unitName(c.toUnitId)}
							</td>
							<td className="py-2.5 pr-4 text-(--sea-ink-soft)">{c.factor}</td>
							<td className="py-2.5 text-(--sea-ink-soft)">
								{formatDate(c.createdAt)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CompactView({ conversions, unitName }: ViewProps) {
	return (
		<div className="flex flex-col gap-1">
			{conversions.map((c) => (
				<Link
					key={c.id}
					to="/unit-conversions/$id"
					params={{ id: c.id }}
					className="flex items-center justify-between rounded-lg px-3 py-2 no-underline transition hover:bg-(--surface)"
				>
					<span className="text-sm font-medium text-(--sea-ink)">
						{unitName(c.fromUnitId)} &rarr; {unitName(c.toUnitId)}
					</span>
					<span className="text-xs text-(--sea-ink-soft)">{c.factor}</span>
				</Link>
			))}
		</div>
	);
}
