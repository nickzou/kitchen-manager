// Postgres signals a unique-constraint violation with SQLSTATE 23505.
// node-postgres / Drizzle bubbles this up as an Error with a `code` field.
export function isUniqueViolation(err: unknown): boolean {
	return (
		err instanceof Error &&
		"code" in err &&
		(err as { code: string }).code === "23505"
	);
}
