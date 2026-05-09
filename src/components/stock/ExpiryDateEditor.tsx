import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "#src/components/Toast";
import { useUpdateStockEntry } from "#src/lib/hooks/use-stock-entries";
import { cn } from "#src/lib/utils";

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function toInputValue(dateStr: string | null): string {
	return dateStr ? dateStr.slice(0, 10) : "";
}

export function ExpiryDateEditor({
	stockEntryId,
	expirationDate,
	productName,
	className,
	emptyLabel = "Set expiry",
	prefix,
}: {
	stockEntryId: string;
	expirationDate: string | null;
	productName?: string;
	className?: string;
	emptyLabel?: string;
	// e.g. "Exp:" — rendered before the date in non-edit mode.
	prefix?: string;
}) {
	const updateStockEntry = useUpdateStockEntry(stockEntryId);
	const toast = useToast();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(toInputValue(expirationDate));
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setDraft(toInputValue(expirationDate));
	}, [expirationDate]);

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	async function commit(value: string) {
		const next = value || "";
		const current = toInputValue(expirationDate);
		if (next === current) {
			setEditing(false);
			return;
		}
		try {
			await updateStockEntry.mutateAsync({
				expirationDate: next || undefined,
			});
			const label = productName ? ` for ${productName}` : "";
			toast.success(
				next
					? `Expiry${label} set to ${formatDate(next)}`
					: `Expiry${label} cleared`,
			);
			setEditing(false);
		} catch {
			toast.error("Failed to update expiry");
			setDraft(current);
		}
	}

	if (editing) {
		return (
			<input
				ref={inputRef}
				type="date"
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={() => commit(draft)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						commit(draft);
					} else if (e.key === "Escape") {
						setDraft(toInputValue(expirationDate));
						setEditing(false);
					}
				}}
				className={cn(
					"rounded-md border border-(--line) bg-white px-1.5 py-0.5 text-xs text-(--sea-ink) focus:border-(--lagoon) focus:outline-none dark:bg-[#1a2e30]",
					className,
				)}
				aria-label="Edit expiry date"
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setEditing(true)}
			title="Click to change expiry date"
			className={cn(
				"inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)",
				className,
			)}
		>
			{expirationDate ? (
				<span>
					{prefix ? `${prefix} ` : ""}
					{formatDate(expirationDate)}
				</span>
			) : (
				<span className="italic">{emptyLabel}</span>
			)}
			<Pencil
				size={10}
				className="opacity-0 transition group-hover:opacity-50"
			/>
		</button>
	);
}
