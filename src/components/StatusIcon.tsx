import { type ReactNode, useState } from "react";
import { Modal } from "./Modal";

interface StatusIconProps {
	icon: ReactNode;
	label: string;
}

export function StatusIcon({ icon, label }: StatusIconProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				className="group relative shrink-0"
				onClick={() => setOpen(true)}
			>
				{icon}
				<span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-md transition group-hover:opacity-100 sm:block">
					{label}
				</span>
			</button>
			<Modal open={open} onOpenChange={setOpen} title="Ingredient Status">
				<p className="text-sm text-(--sea-ink)">{label}</p>
			</Modal>
		</>
	);
}
