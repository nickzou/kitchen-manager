import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DateRangePicker } from "#src/components/DateRangePicker";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { authClient } from "#src/lib/auth-client";
import { useIngredientSummary } from "#src/lib/hooks/use-ingredient-summary";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/meal-plan/shopping-list")({
	component: ShoppingListPage,
});

function getMonday(d: Date): Date {
	const date = new Date(d);
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	date.setDate(diff);
	date.setHours(0, 0, 0, 0);
	return date;
}

function toDateString(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ShoppingListPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const [startDate, setStartDate] = useState(() =>
		toDateString(getMonday(new Date())),
	);
	const [endDate, setEndDate] = useState(() => {
		const end = getMonday(new Date());
		end.setDate(end.getDate() + 6);
		return toDateString(end);
	});

	const { data: summary, isLoading } = useIngredientSummary(startDate, endDate);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	const deficit =
		summary?.ingredients.filter((i) => i.status === "deficit") ?? [];
	const sufficient =
		summary?.ingredients.filter((i) => i.status === "sufficient") ?? [];
	const unknownUnit =
		summary?.ingredients.filter((i) => i.status === "unknown_unit") ?? [];

	const statusBadge: Record<string, string> = {
		deficit: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
		sufficient:
			"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		unknown_unit:
			"bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
	};

	return (
		<Page as="main" className="pb-8 pt-14">
			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Planning
				</p>
				<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
					<h1 className="font-display text-3xl font-bold text-(--sea-ink)">
						Shopping List
					</h1>
					<Link
						to="/meal-plan"
						className="rounded-lg border border-(--line) px-3 py-1.5 text-xs font-semibold text-(--sea-ink-soft) no-underline transition hover:bg-(--surface)"
					>
						Calendar
					</Link>
				</div>

				{/* Date range picker */}
				<div className="mb-6 border-b border-(--line) pb-6">
					<DateRangePicker
						startDate={startDate}
						endDate={endDate}
						onChange={(start, end) => {
							setStartDate(start);
							setEndDate(end);
						}}
					/>
				</div>

				{isLoading ? (
					<p className="text-sm text-(--sea-ink-soft)">Loading...</p>
				) : !summary?.ingredients.length &&
					!summary?.unlinkedIngredients.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No meals planned for this date range.
					</p>
				) : (
					<div className="flex flex-col gap-6">
						{/* Deficit / Missing */}
						{deficit.length > 0 && (
							<div>
								<h2 className="mb-3 text-sm font-semibold text-red-600 dark:text-red-400">
									Missing ({deficit.length})
								</h2>
								<div className="flex flex-col gap-1">
									{deficit.map((item) => (
										<IngredientRow
											key={`${item.productId}-${item.quantityUnitId}`}
											item={item}
											badgeClass={statusBadge.deficit}
										/>
									))}
								</div>
							</div>
						)}

						{/* Sufficient / In Stock */}
						{sufficient.length > 0 && (
							<div>
								<h2 className="mb-3 text-sm font-semibold text-green-600 dark:text-green-400">
									In Stock ({sufficient.length})
								</h2>
								<div className="flex flex-col gap-1">
									{sufficient.map((item) => (
										<IngredientRow
											key={`${item.productId}-${item.quantityUnitId}`}
											item={item}
											badgeClass={statusBadge.sufficient}
										/>
									))}
								</div>
							</div>
						)}

						{/* Unknown units */}
						{unknownUnit.length > 0 && (
							<div>
								<h2 className="mb-3 text-sm font-semibold text-gray-500">
									Unknown Units ({unknownUnit.length})
								</h2>
								<div className="flex flex-col gap-1">
									{unknownUnit.map((item) => (
										<IngredientRow
											key={`${item.productId}-${item.quantityUnitId}`}
											item={item}
											badgeClass={statusBadge.unknown_unit}
										/>
									))}
								</div>
							</div>
						)}

						{/* Unlinked ingredients */}
						{summary && summary.unlinkedIngredients.length > 0 && (
							<div className="border-t border-(--line) pt-4">
								<h2 className="mb-3 text-sm font-semibold text-(--sea-ink-soft)">
									Unlinked Ingredients
								</h2>
								<div className="flex flex-col gap-1">
									{summary.unlinkedIngredients.map((item) => (
										<div
											key={`unlinked-${item.notes}-${item.quantity}-${item.unitId}`}
											className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--sea-ink-soft)"
										>
											<span className="font-medium text-(--sea-ink)">
												{item.notes ?? "Unknown ingredient"}
											</span>
											<span>{Number(item.quantity) * item.scaleFactor}</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</Island>
		</Page>
	);
}

function IngredientRow({
	item,
	badgeClass,
}: {
	item: {
		productName: string;
		neededQuantity: number;
		stockQuantity: number;
		unitAbbreviation: string | null;
		unitName: string | null;
		status: string;
	};
	badgeClass: string;
}) {
	const unitLabel = item.unitAbbreviation ?? item.unitName ?? "";
	const diff = item.stockQuantity - item.neededQuantity;

	return (
		<div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-(--surface)">
			<span className="flex-1 font-medium text-(--sea-ink)">
				{item.productName}
			</span>
			<span className="text-(--sea-ink-soft)">
				Need: {item.neededQuantity.toFixed(1)}
				{unitLabel ? ` ${unitLabel}` : ""}
			</span>
			<span className="text-(--sea-ink-soft)">
				Have: {item.stockQuantity.toFixed(1)}
				{unitLabel ? ` ${unitLabel}` : ""}
			</span>
			<span
				className={cn(
					"rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
					badgeClass,
				)}
			>
				{item.status === "deficit"
					? `Need ${Math.abs(diff).toFixed(1)} more`
					: item.status === "sufficient"
						? "OK"
						: "Check units"}
			</span>
		</div>
	);
}
