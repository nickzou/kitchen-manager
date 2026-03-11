import { Grid3x3, List, Rows3 } from "lucide-react";
import { cn } from "#src/lib/utils";

export type ViewMode = "grid" | "table" | "compact";

const modes = [
	["grid", Grid3x3],
	["table", List],
	["compact", Rows3],
] as const;

export function ViewSwitcher({
	view,
	onViewChange,
}: {
	view: ViewMode;
	onViewChange: (mode: ViewMode) => void;
}) {
	return (
		<div className="flex items-center gap-1 sm:ml-auto">
			{modes.map(([mode, Icon]) => (
				<button
					key={mode}
					type="button"
					onClick={() => onViewChange(mode)}
					className={cn(
						"rounded-lg p-2 transition",
						view === mode
							? "bg-(--lagoon) text-white"
							: "text-(--sea-ink-soft) hover:bg-(--surface)",
					)}
					title={`${mode} view`}
				>
					<Icon size={18} />
				</button>
			))}
		</div>
	);
}
