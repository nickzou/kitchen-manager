import { useState } from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";

type ViewMode = "average" | "store" | "brand";

const LINE_COLORS = [
	"#4fb8b2",
	"#328f97",
	"#2f6a4a",
	"#e67e22",
	"#8e44ad",
	"#e74c3c",
	"#3498db",
	"#1abc9c",
];

interface Props {
	stockEntries: StockEntry[];
	storeNames: Record<string, string>;
	brandNames: Record<string, string>;
}

export function PricingHistoryChart({
	stockEntries,
	storeNames,
	brandNames,
}: Props) {
	const [viewMode, setViewMode] = useState<ViewMode>("average");

	const pricedEntries = stockEntries
		.filter((e) => e.price != null && e.purchaseDate != null)
		.map((e) => ({
			...e,
			priceNum: Number.parseFloat(e.price as string),
			dateTs: new Date(e.purchaseDate as string).getTime(),
		}))
		.sort((a, b) => a.dateTs - b.dateTs);

	if (pricedEntries.length === 0) {
		return (
			<p className="text-sm text-(--sea-ink-soft)">
				No pricing data available.
			</p>
		);
	}

	const modes: { value: ViewMode; label: string }[] = [
		{ value: "average", label: "Average" },
		{ value: "store", label: "By Store" },
		{ value: "brand", label: "By Brand" },
	];

	const formatDate = (ts: number | string) =>
		new Date(Number(ts)).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "2-digit",
		});

	if (viewMode === "average") {
		const data = pricedEntries.map((e) => ({
			date: e.dateTs,
			price: e.priceNum,
		}));

		return (
			<div className="flex flex-col gap-3">
				<ModeButtons current={viewMode} modes={modes} onChange={setViewMode} />
				<ResponsiveContainer width="100%" height={220}>
					<LineChart data={data}>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
						<XAxis
							dataKey="date"
							type="number"
							domain={["dataMin", "dataMax"]}
							tickFormatter={formatDate}
							tick={{ fontSize: 11, fill: "var(--sea-ink-soft)" }}
							stroke="var(--line)"
						/>
						<YAxis
							tickFormatter={(v: number) => `$${v.toFixed(2)}`}
							tick={{ fontSize: 11, fill: "var(--sea-ink-soft)" }}
							stroke="var(--line)"
							width={52}
						/>
						<Tooltip
							labelFormatter={(label) => formatDate(label as number)}
							formatter={(v) => [`$${Number(v).toFixed(2)}`, "Price"]}
							contentStyle={{
								backgroundColor: "var(--surface-strong)",
								border: "1px solid var(--line)",
								borderRadius: 8,
								fontSize: 12,
							}}
						/>
						<Line
							type="monotone"
							dataKey="price"
							stroke="#4fb8b2"
							strokeWidth={2}
							dot={{ r: 3 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		);
	}

	// By store or by brand
	const groupKey = viewMode === "store" ? "storeId" : "brandId";
	const nameMap = viewMode === "store" ? storeNames : brandNames;

	const groups = new Map<string, { date: number; price: number }[]>();
	for (const e of pricedEntries) {
		const key = e[groupKey] ?? "unknown";
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)?.push({ date: e.dateTs, price: e.priceNum });
	}

	// Build combined data keyed by date with one price field per group
	const allDates = [...new Set(pricedEntries.map((e) => e.dateTs))].sort(
		(a, b) => a - b,
	);
	const groupKeys = [...groups.keys()];
	const data = allDates.map((date) => {
		const row: Record<string, number | undefined> = { date };
		for (const gk of groupKeys) {
			const point = groups.get(gk)?.find((p) => p.date === date);
			if (point) row[gk] = point.price;
		}
		return row;
	});

	return (
		<div className="flex flex-col gap-3">
			<ModeButtons current={viewMode} modes={modes} onChange={setViewMode} />
			<ResponsiveContainer width="100%" height={220}>
				<LineChart data={data}>
					<CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
					<XAxis
						dataKey="date"
						type="number"
						domain={["dataMin", "dataMax"]}
						tickFormatter={formatDate}
						tick={{ fontSize: 11, fill: "var(--sea-ink-soft)" }}
						stroke="var(--line)"
					/>
					<YAxis
						tickFormatter={(v: number) => `$${v.toFixed(2)}`}
						tick={{ fontSize: 11, fill: "var(--sea-ink-soft)" }}
						stroke="var(--line)"
						width={52}
					/>
					<Tooltip
						labelFormatter={(label) => formatDate(label as number)}
						formatter={(v, name) => [
							`$${Number(v).toFixed(2)}`,
							nameMap[String(name)] ?? "Unknown",
						]}
						contentStyle={{
							backgroundColor: "var(--surface-strong)",
							border: "1px solid var(--line)",
							borderRadius: 8,
							fontSize: 12,
						}}
					/>
					<Legend
						formatter={(value: string) => nameMap[value] ?? "Unknown"}
						wrapperStyle={{ fontSize: 12 }}
					/>
					{groupKeys.map((gk, i) => (
						<Line
							key={gk}
							type="monotone"
							dataKey={gk}
							name={gk}
							stroke={LINE_COLORS[i % LINE_COLORS.length]}
							strokeWidth={2}
							dot={{ r: 3 }}
							connectNulls
						/>
					))}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}

function ModeButtons({
	current,
	modes,
	onChange,
}: {
	current: ViewMode;
	modes: { value: ViewMode; label: string }[];
	onChange: (v: ViewMode) => void;
}) {
	return (
		<div className="flex gap-1">
			{modes.map((m) => (
				<button
					key={m.value}
					type="button"
					onClick={() => onChange(m.value)}
					className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
						current === m.value
							? "bg-(--lagoon) text-white"
							: "border border-(--line) text-(--sea-ink-soft) hover:bg-(--line)"
					}`}
				>
					{m.label}
				</button>
			))}
		</div>
	);
}
