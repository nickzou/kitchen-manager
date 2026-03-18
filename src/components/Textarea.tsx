import type { TextareaHTMLAttributes } from "react";
import { cn } from "#src/lib/utils";

const textareaClass =
	"w-full rounded-lg border border-(--line) bg-(--surface) px-3 py-2 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
	return <textarea className={cn(textareaClass, className)} {...props} />;
}
