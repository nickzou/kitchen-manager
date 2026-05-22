// Case-insensitive lookup mirroring the DB's lower(name) unique index.
// Used by create forms to surface an inline "already exists" hint as the
// user types, against the already-fetched list (React Query cache).
//
// `excludeId` lets edit flows skip the row being edited so renaming to the
// same name doesn't false-positive.
export function findDuplicateName<T extends { id: string; name: string }>(
	name: string,
	existing: T[] | undefined,
	excludeId?: string,
): T | undefined {
	const trimmed = name.trim().toLowerCase();
	if (!trimmed) return undefined;
	return (existing ?? []).find(
		(x) => x.name.trim().toLowerCase() === trimmed && x.id !== excludeId,
	);
}
