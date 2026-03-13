import { Eye, EyeOff } from "lucide-react";
import {
	type ChangeEvent,
	type InputHTMLAttributes,
	useId,
	useRef,
	useState,
} from "react";

interface PasswordInputProps
	extends Omit<
		InputHTMLAttributes<HTMLInputElement>,
		"type" | "id" | "onChange"
	> {
	label: string;
	onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function PasswordInput({
	label,
	onChange,
	...props
}: PasswordInputProps) {
	const id = useId();
	const [revealed, setRevealed] = useState(false);
	const realValue = typeof props.value === "string" ? props.value : "";
	const inputRef = useRef<HTMLInputElement>(null);

	const maskedValue =
		realValue.length > 0
			? "•".repeat(realValue.length - 1) + realValue.slice(-1)
			: "";

	function handleChange(e: ChangeEvent<HTMLInputElement>) {
		if (!onChange || revealed) {
			onChange?.(e);
			return;
		}

		const input = e.target;
		const cursor = input.selectionStart ?? 0;
		const newDisplay = input.value;
		const oldLen = realValue.length;
		const newLen = newDisplay.length;
		const diff = newLen - oldLen;

		let newReal: string;
		if (diff > 0) {
			// Characters inserted at cursor position
			const inserted = newDisplay.slice(cursor - diff, cursor);
			newReal =
				realValue.slice(0, cursor - diff) +
				inserted +
				realValue.slice(cursor - diff);
		} else if (diff < 0) {
			// Characters deleted
			newReal = realValue.slice(0, cursor) + realValue.slice(cursor - diff);
		} else {
			// Replacement (e.g. select + type)
			newReal =
				realValue.slice(0, cursor - 1) +
				newDisplay.charAt(cursor - 1) +
				realValue.slice(cursor);
		}

		// Synthesize an event with the real value
		const nativeEvent = e.nativeEvent;
		const syntheticTarget = Object.create(input, {
			value: { value: newReal },
		});
		const syntheticEvent = {
			...e,
			target: syntheticTarget,
			currentTarget: syntheticTarget,
			nativeEvent,
		} as ChangeEvent<HTMLInputElement>;

		onChange(syntheticEvent);

		// Restore cursor position after React re-renders
		requestAnimationFrame(() => {
			input.setSelectionRange(cursor, cursor);
		});
	}

	return (
		<div className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
			<label htmlFor={id}>{label}</label>
			<div className="relative">
				<input
					{...props}
					ref={inputRef}
					id={id}
					type="text"
					autoComplete={revealed ? props.autoComplete : "off"}
					value={revealed ? realValue : maskedValue}
					onChange={handleChange}
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
