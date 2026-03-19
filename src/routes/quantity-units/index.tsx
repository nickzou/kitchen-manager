import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import { type FormEvent, Fragment, useMemo, useState } from "react";
import { Button } from "#src/components/Button";
import { CompactView } from "#src/components/CompactView";
import { GridView } from "#src/components/GridView";
import { Input } from "#src/components/Input";
import InventorySubNav from "#src/components/InventorySubNav";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { SearchInput } from "#src/components/SearchInput";
import { type ViewMode, ViewSwitcher } from "#src/components/ViewSwitcher";
import { authClient } from "#src/lib/auth-client";
import { formatDate } from "#src/lib/format-date";
import {
	type QuantityUnit,
	useCreateQuantityUnit,
	useQuantityUnits,
} from "#src/lib/hooks/use-quantity-units";
import {
	type UnitConversion,
	useUnitConversions,
} from "#src/lib/hooks/use-unit-conversions";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/quantity-units/")({
	component: QuantityUnitsPage,
});

function formatConversionFactor(
	conversion: UnitConversion,
	unitId: string,
	unitName: (id: string) => string,
) {
	if (conversion.fromUnitId === unitId) {
		return `→ ${unitName(conversion.toUnitId)}: ${conversion.factor}`;
	}
	const inverseFactor = 1 / Number(conversion.factor);
	return `→ ${unitName(conversion.fromUnitId)}: ${inverseFactor % 1 === 0 ? inverseFactor : inverseFactor.toPrecision(6)}`;
}

function QuantityUnitsPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: quantityUnits, isLoading } = useQuantityUnits();
	const { data: conversions } = useUnitConversions();
	const createQuantityUnit = useCreateQuantityUnit();

	const [view, setView] = useState<ViewMode>("grid");
	const [name, setName] = useState("");
	const [abbreviation, setAbbreviation] = useState("");
	const [search, setSearch] = useState("");

	const filteredQuantityUnits = useMemo(() => {
		if (!quantityUnits || !search.trim()) return quantityUnits;
		const term = search.toLowerCase();
		return quantityUnits.filter(
			(u) =>
				u.name.toLowerCase().includes(term) ||
				u.abbreviation?.toLowerCase().includes(term),
		);
	}, [quantityUnits, search]);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	function unitName(id: string) {
		const u = quantityUnits?.find((u) => u.id === id);
		if (!u) return id;
		return u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name;
	}

	function getConversionsForUnit(unitId: string) {
		if (!conversions) return [];
		return conversions.filter(
			(c) => c.fromUnitId === unitId || c.toUnitId === unitId,
		);
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
					<Input
						type="text"
						placeholder="Unit name *"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="flex-1 min-w-[160px]"
					/>
					<Input
						type="text"
						placeholder="Abbreviation"
						value={abbreviation}
						onChange={(e) => setAbbreviation(e.target.value)}
						className="w-48"
					/>
					<Button
						type="submit"
						disabled={createQuantityUnit.isPending}
						className="flex items-center gap-1.5"
					>
						<Plus size={16} />
						Add
					</Button>
				</form>

				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
					<SearchInput
						placeholder="Search..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						onClear={() => setSearch("")}
					/>
					<ViewSwitcher view={view} onViewChange={setView} />
				</div>

				{isLoading ? (
					<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
				) : !quantityUnits?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No quantity units yet. Add one above!
					</p>
				) : !filteredQuantityUnits?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No quantity units match your search.
					</p>
				) : view === "grid" ? (
					<GridView
						items={filteredQuantityUnits}
						getKey={(u) => u.id}
						getLink={(u) => ({
							to: "/quantity-units/$id",
							params: { id: u.id },
						})}
						renderCard={(u) => {
							const unitConversions = getConversionsForUnit(u.id);
							return (
								<>
									<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
										{u.name}
									</h3>
									{u.abbreviation && (
										<p className="m-0 text-xs text-(--sea-ink-soft)">
											{u.abbreviation}
										</p>
									)}
									{unitConversions.length > 0 && (
										<div className="mt-2 border-t border-(--line) pt-2">
											{unitConversions.map((c) => (
												<p
													key={c.id}
													className="m-0 text-xs text-(--sea-ink-soft)"
													data-testid="conversion-line"
												>
													{formatConversionFactor(c, u.id, unitName)}
												</p>
											))}
										</div>
									)}
								</>
							);
						}}
					/>
				) : view === "table" ? (
					<QuantityUnitsTableView
						quantityUnits={filteredQuantityUnits}
						getConversionsForUnit={getConversionsForUnit}
						unitName={unitName}
					/>
				) : (
					<CompactView
						items={filteredQuantityUnits}
						getKey={(u) => u.id}
						getLink={(u) => ({
							to: "/quantity-units/$id",
							params: { id: u.id },
						})}
						getName={(u) => u.name}
						getSecondary={(u) => u.abbreviation || "—"}
					/>
				)}
			</Island>
		</Page>
	);
}

/* quantity-units TableView stays local because of its expandable-row state */
function QuantityUnitsTableView({
	quantityUnits,
	getConversionsForUnit,
	unitName,
}: {
	quantityUnits: QuantityUnit[];
	getConversionsForUnit: (id: string) => UnitConversion[];
	unitName: (id: string) => string;
}) {
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	function toggleExpand(id: string) {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b border-(--line) text-xs font-semibold uppercase tracking-wide text-(--sea-ink-soft)">
						<th className="pb-2 pr-4">Name</th>
						<th className="pb-2 pr-4">Abbreviation</th>
						<th className="pb-2 pr-4">Created</th>
						<th className="pb-2 w-10" />
					</tr>
				</thead>
				<tbody>
					{quantityUnits.map((u) => {
						const unitConversions = getConversionsForUnit(u.id);
						const isExpanded = expandedIds.has(u.id);
						return (
							<Fragment key={u.id}>
								<tr className="border-b border-(--line) last:border-0">
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
									<td className="py-2.5 pr-4 text-(--sea-ink-soft)">
										{formatDate(u.createdAt)}
									</td>
									<td className="py-2.5">
										{unitConversions.length > 0 && (
											<button
												type="button"
												onClick={() => toggleExpand(u.id)}
												className="rounded-lg p-1 text-(--sea-ink-soft) transition hover:bg-(--surface)"
												title="Toggle conversions"
											>
												<ChevronDown
													size={16}
													className={cn(
														"transition-transform",
														isExpanded && "rotate-180",
													)}
												/>
											</button>
										)}
									</td>
								</tr>
								{isExpanded && (
									<tr>
										<td
											colSpan={4}
											className="pb-2 pl-4 pt-0 text-xs text-(--sea-ink-soft)"
										>
											{unitConversions.map((c) => (
												<p
													key={c.id}
													className="m-0 py-0.5"
													data-testid="conversion-line"
												>
													{formatConversionFactor(c, u.id, unitName)}
												</p>
											))}
										</td>
									</tr>
								)}
							</Fragment>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
