import { CalendarPlus, Pencil } from "lucide-react";
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

function todayInputValue() {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return toInputValue(d.toISOString());
}

interface ExtendPreset {
	label: string;
	days?: number;
	months?: number;
}

const PRESETS: ExtendPreset[] = [
	{ label: "+1 day", days: 1 },
	{ label: "+3 days", days: 3 },
	{ label: "+1 week", days: 7 },
	{ label: "+2 weeks", days: 14 },
	{ label: "+1 month", months: 1 },
];

/**
 * Anchor the delta from max(currentExpiry, today) so extending an
 * already-expired entry lands in the future, not further into the past.
 * Returns a YYYY-MM-DD string.
 */
export function applyExpiryDelta(
	currentExpiry: string | null,
	preset: ExtendPreset,
	today: Date = new Date(),
): string {
	const todayMidnight = new Date(today);
	todayMidnight.setHours(0, 0, 0, 0);

	let anchor = todayMidnight;
	if (currentExpiry) {
		const expiry = new Date(`${currentExpiry.slice(0, 10)}T00:00:00`);
		if (expiry.getTime() > todayMidnight.getTime()) {
			anchor = expiry;
		}
	}
	const next = new Date(anchor);
	if (preset.days) next.setDate(next.getDate() + preset.days);
	if (preset.months) next.setMonth(next.getMonth() + preset.months);
	return toInputValue(next.toISOString());
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
	const [extendOpen, setExtendOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setDraft(toInputValue(expirationDate));
	}, [expirationDate]);

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	useEffect(() => {
		if (!extendOpen) return;
		function handleClickOutside(e: MouseEvent) {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node)
			) {
				setExtendOpen(false);
			}
		}
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") setExtendOpen(false);
		}
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKey);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKey);
		};
	}, [extendOpen]);

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

	async function applyPreset(preset: ExtendPreset) {
		const next = applyExpiryDelta(expirationDate, preset);
		setExtendOpen(false);
		if (next === toInputValue(expirationDate)) return;
		try {
			await updateStockEntry.mutateAsync({ expirationDate: next });
			const label = productName ? ` for ${productName}` : "";
			toast.success(`Expiry${label} set to ${formatDate(next)}`);
		} catch {
			toast.error("Failed to update expiry");
		}
	}

	if (editing) {
		return (
			<input
				ref={inputRef}
				type="date"
				value={draft}
				min={todayInputValue()}
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
		<span className="inline-flex items-center gap-0.5">
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

			<span className="relative">
				<button
					type="button"
					onClick={() => setExtendOpen((v) => !v)}
					title="Extend expiry"
					aria-label="Extend expiry"
					aria-expanded={extendOpen}
					className="inline-flex h-5 w-5 items-center justify-center rounded-md text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--lagoon-deep)"
				>
					<CalendarPlus size={12} />
				</button>
				{extendOpen && (
					<div
						ref={popoverRef}
						className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-(--line) bg-white p-2 shadow-lg dark:bg-(--surface)"
					>
						<p className="mb-1.5 px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-(--sea-ink-soft)">
							Extend by…
						</p>
						<div className="flex flex-col gap-0.5">
							{PRESETS.map((p) => (
								<button
									key={p.label}
									type="button"
									onClick={() => applyPreset(p)}
									disabled={updateStockEntry.isPending}
									className="w-full rounded-md px-2 py-1 text-left text-xs font-medium text-(--lagoon-deep) transition hover:bg-(--surface) disabled:opacity-50"
								>
									{p.label}
								</button>
							))}
						</div>
					</div>
				)}
			</span>
		</span>
	);
}
