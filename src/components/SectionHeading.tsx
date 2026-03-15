import type { ReactNode } from "react";

export function SectionHeading({ children }: { children: ReactNode }) {
	return (
		<h2 className="mb-2 text-sm font-semibold text-(--sea-ink)">{children}</h2>
	);
}
