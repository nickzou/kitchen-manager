import { ImageOff, ImagePlus } from "lucide-react";
import { cn } from "#src/lib/utils";

interface ImageToggleProps {
	show: boolean;
	onToggle: () => void;
}

export function ImageToggle({ show, onToggle }: ImageToggleProps) {
	return (
		<button
			type="button"
			onClick={onToggle}
			className={cn(
				"flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition",
				show
					? "border-(--lagoon) bg-[rgba(79,184,178,0.10)] text-(--lagoon-deep)"
					: "border-(--line) text-(--sea-ink-soft) hover:bg-(--surface)",
			)}
			title={show ? "Hide images" : "Show images"}
		>
			{show ? <ImageOff size={14} /> : <ImagePlus size={14} />}
			{show ? "Hide images" : "Show images"}
		</button>
	);
}
