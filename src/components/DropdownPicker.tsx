import { ChevronDown } from "lucide-react";
import { type ComponentType, useState } from "react";

interface DropdownPickerItem<T extends string> {
	key: T;
	label: string;
	icon: ComponentType<{ className?: string }>;
}

interface DropdownPickerProps<T extends string> {
	items: DropdownPickerItem<T>[];
	value: T;
	onChange: (value: T) => void;
	className?: string;
}

export function DropdownPicker<T extends string>({
	items,
	value,
	onChange,
	className = "",
}: DropdownPickerProps<T>) {
	const [open, setOpen] = useState(false);
	const activeItem = items.find((item) => item.key === value);

	return (
		<div className={`relative ${className}`}>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex h-10 w-full items-center justify-between rounded-lg border border-(--line) bg-(--surface) px-3 text-sm font-medium text-(--sea-ink) outline-none focus:border-(--lagoon)"
			>
				<span className="flex items-center gap-2.5">
					{activeItem && (
						<>
							<activeItem.icon className="h-4 w-4" />
							{activeItem.label}
						</>
					)}
				</span>
				<ChevronDown
					className={`h-4 w-4 text-(--sea-ink-soft) transition ${open ? "rotate-180" : ""}`}
				/>
			</button>
			{open && (
				<>
					<button
						type="button"
						aria-label="Close menu"
						className="fixed inset-0 z-40"
						onClick={() => setOpen(false)}
					/>
					<ul className="absolute left-0 right-0 z-50 mt-1 flex flex-col gap-1 rounded-xl border border-(--line) bg-(--surface) p-2 shadow-lg">
						{items.map(({ key, label, icon: Icon }) => (
							<li key={key}>
								<button
									type="button"
									onClick={() => {
										onChange(key);
										setOpen(false);
									}}
									className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
										value === key
											? "bg-(--surface-strong) font-semibold text-(--sea-ink)"
											: "text-(--sea-ink-soft) hover:bg-(--surface-strong) hover:text-(--sea-ink)"
									}`}
								>
									<Icon className="h-4 w-4" />
									{label}
								</button>
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}
