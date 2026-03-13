import { Eye, EyeOff } from "lucide-react";
import { type InputHTMLAttributes, useId, useState } from "react";

interface PasswordInputProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> {
	label: string;
}

export function PasswordInput({ label, ...props }: PasswordInputProps) {
	const id = useId();
	const [revealed, setRevealed] = useState(false);

	return (
		<div className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
			<label htmlFor={id}>{label}</label>
			<div className="relative">
				<input
					{...props}
					id={id}
					type={revealed ? "text" : "password"}
					className="h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 pr-10 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
				/>
				<button
					type="button"
					onClick={() => setRevealed((r) => !r)}
					className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-(--sea-ink-soft) hover:text-(--sea-ink)"
					tabIndex={-1}
				>
					{revealed ? <EyeOff size={16} /> : <Eye size={16} />}
				</button>
			</div>
		</div>
	);
}
