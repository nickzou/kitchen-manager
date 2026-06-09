import type { ConversionGraph } from "./conversion-graph";
import { tryConvert } from "./conversion-graph";

/**
 * Compact, recipe-friendly rounding rules.
 *
 * Grams / millilitres are by far the most common targets (since most products
 * are bought/stored in metric weight or volume), so they get integer
 * formatting. Other units fall back to one decimal place, which reads
 * cleanly without implying false precision.
 */
function roundForUnit(value: number, unitLabel: string | null): string {
	const normalized = (unitLabel ?? "").trim().toLowerCase();

	// Whole-number metric mass / volume — most common case
	if (normalized === "g" || normalized === "gram" || normalized === "grams") {
		return String(Math.round(value));
	}
	if (
		normalized === "ml" ||
		normalized === "millilitre" ||
		normalized === "milliliter"
	) {
		return String(Math.round(value));
	}
	if (normalized === "mg" || normalized === "milligram") {
		return String(Math.round(value));
	}

	// One-decimal for kg / L when they're more readable than the raw number
	if (normalized === "kg" || normalized === "kilogram") {
		return value.toFixed(1).replace(/\.0$/, "");
	}
	if (normalized === "l" || normalized === "litre" || normalized === "liter") {
		return value.toFixed(1).replace(/\.0$/, "");
	}

	// Fractional imperial / culinary measures — one decimal is enough
	const fallback = value < 1 ? value.toFixed(2) : value.toFixed(1);
	return fallback.replace(/\.?0+$/, "");
}

export interface FormatConversionOpts {
	quantity: number;
	fromUnitId: string | null;
	toUnitId: string | null;
	toUnitLabel: string | null;
	graph: ConversionGraph;
}

/**
 * Return an `≈ X unit` string for the converted quantity, or `null` if any
 * of the inputs are missing or no conversion path exists. Callers can drop
 * the return value directly into the UI; null means "render nothing".
 *
 * Same-unit input (fromUnitId === toUnitId) also returns null — the caller
 * already shows the primary quantity, so a redundant secondary is noise.
 */
export function formatConversion(opts: FormatConversionOpts): string | null {
	const { quantity, fromUnitId, toUnitId, toUnitLabel, graph } = opts;
	if (!fromUnitId || !toUnitId) return null;
	if (fromUnitId === toUnitId) return null;
	if (!Number.isFinite(quantity) || quantity <= 0) return null;

	const converted = tryConvert(graph, quantity, fromUnitId, toUnitId);
	if (converted === null) return null;
	if (converted <= 0) return null;

	const rounded = roundForUnit(converted, toUnitLabel);
	const unitSuffix = toUnitLabel ? ` ${toUnitLabel}` : "";
	return `≈ ${rounded}${unitSuffix}`;
}
