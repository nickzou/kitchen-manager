import type { ReactNode } from "react";

export function DetailColumns({
	main,
	side,
}: {
	main: ReactNode;
	side: ReactNode;
}) {
	return (
		<div className="flex flex-col lg:flex-row lg:gap-6 lg:items-start">
			<div className="lg:flex-1 2xl:flex-[1_1_0%]">{main}</div>
			<div className="mt-6 lg:mt-0 lg:flex-1 lg:sticky lg:top-16 2xl:flex-none 2xl:w-96 2xl:shrink-0">
				{side}
			</div>
		</div>
	);
}
