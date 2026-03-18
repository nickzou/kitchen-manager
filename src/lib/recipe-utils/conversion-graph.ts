export type ConversionGraph = Map<string, Map<string, number>>;

function addEdgePair(
	graph: ConversionGraph,
	from: string,
	to: string,
	factor: number,
) {
	if (!graph.has(from)) graph.set(from, new Map());
	graph.get(from)?.set(to, factor);
	if (!graph.has(to)) graph.set(to, new Map());
	graph.get(to)?.set(from, 1 / factor);
}

export function buildConversionGraph(
	conversions: {
		fromUnitId: string;
		toUnitId: string;
		factor: string | number;
	}[],
): ConversionGraph {
	const graph: ConversionGraph = new Map();
	for (const c of conversions) {
		addEdgePair(graph, c.fromUnitId, c.toUnitId, Number(c.factor));
	}
	return graph;
}

export function tryConvert(
	graph: ConversionGraph,
	qty: number,
	fromUnitId: string | null,
	toUnitId: string | null,
): number | null {
	if (fromUnitId === toUnitId) return qty;
	if (!fromUnitId || !toUnitId) return null;
	const fromEdges = graph.get(fromUnitId);
	if (!fromEdges) return null;
	const factor = fromEdges.get(toUnitId);
	if (factor !== undefined) return qty * factor;
	return null;
}
