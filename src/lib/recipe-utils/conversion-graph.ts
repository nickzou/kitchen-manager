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
	if (!graph.has(fromUnitId)) return null;

	// BFS so the first path found is the shortest in hops, which keeps
	// floating-point drift to a minimum and lets us reach indirectly-
	// connected units (e.g. tsp → g → jar when only tsp↔g and jar↔g
	// are defined).
	const factors = new Map<string, number>([[fromUnitId, 1]]);
	const queue: string[] = [fromUnitId];
	let head = 0;

	while (head < queue.length) {
		const current = queue[head++];
		const currentFactor = factors.get(current) ?? 1;
		const edges = graph.get(current);
		if (!edges) continue;
		for (const [neighbor, factor] of edges) {
			if (factors.has(neighbor)) continue;
			const composed = currentFactor * factor;
			if (neighbor === toUnitId) return qty * composed;
			factors.set(neighbor, composed);
			queue.push(neighbor);
		}
	}
	return null;
}
