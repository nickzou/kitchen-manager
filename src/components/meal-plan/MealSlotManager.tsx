import { GripVertical, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { MealSlot } from "#src/lib/hooks/use-meal-slots";

interface MealSlotManagerProps {
	slots: MealSlot[];
	onCreateSlot: (name: string, sortOrder: number) => void;
	onUpdateSlot: (
		id: string,
		updates: { name?: string; sortOrder?: number },
	) => void;
	onDeleteSlot: (id: string) => void;
}

export function MealSlotManager({
	slots,
	onCreateSlot,
	onUpdateSlot,
	onDeleteSlot,
}: MealSlotManagerProps) {
	const [newName, setNewName] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");

	function handleAdd(e: FormEvent) {
		e.preventDefault();
		if (!newName.trim()) return;
		const maxOrder = slots.reduce((max, s) => Math.max(max, s.sortOrder), -1);
		onCreateSlot(newName.trim(), maxOrder + 1);
		setNewName("");
	}

	function startEdit(slot: MealSlot) {
		setEditingId(slot.id);
		setEditName(slot.name);
	}

	function commitEdit(id: string) {
		if (editName.trim()) {
			onUpdateSlot(id, { name: editName.trim() });
		}
		setEditingId(null);
	}

	function moveSlot(index: number, direction: -1 | 1) {
		const targetIndex = index + direction;
		if (targetIndex < 0 || targetIndex >= slots.length) return;

		const current = slots[index];
		const target = slots[targetIndex];

		onUpdateSlot(current.id, { sortOrder: target.sortOrder });
		onUpdateSlot(target.id, { sortOrder: current.sortOrder });
	}

	return (
		<div className="rounded-xl border border-(--line) bg-white p-4 dark:bg-[#1a2e30]">
			<p className="mb-3 text-sm font-semibold text-(--sea-ink)">Meal Slots</p>

			<div className="mb-3 flex flex-col gap-1">
				{slots.map((slot, i) => (
					<div
						key={slot.id}
						className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-(--surface)"
					>
						<div className="flex flex-col">
							<button
								type="button"
								onClick={() => moveSlot(i, -1)}
								disabled={i === 0}
								className="text-(--sea-ink-soft) hover:text-(--sea-ink) disabled:opacity-30"
							>
								<GripVertical size={12} />
							</button>
						</div>

						{editingId === slot.id ? (
							<input
								type="text"
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								onBlur={() => commitEdit(slot.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter") commitEdit(slot.id);
									if (e.key === "Escape") setEditingId(null);
								}}
								className="flex-1 rounded border border-(--line) bg-(--surface) px-2 py-1 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
							/>
						) : (
							<button
								type="button"
								onClick={() => startEdit(slot)}
								className="flex-1 text-left text-sm text-(--sea-ink)"
							>
								{slot.name}
							</button>
						)}

						<button
							type="button"
							onClick={() => onDeleteSlot(slot.id)}
							className="text-(--sea-ink-soft) transition hover:text-red-500"
						>
							<Trash2 size={14} />
						</button>
					</div>
				))}
			</div>

			<form onSubmit={handleAdd} className="flex gap-2">
				<input
					type="text"
					value={newName}
					onChange={(e) => setNewName(e.target.value)}
					placeholder="New slot name…"
					className="flex-1 rounded-lg border border-(--line) bg-(--surface) px-3 py-1.5 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
				/>
				<button
					type="submit"
					disabled={!newName.trim()}
					className="flex items-center gap-1 rounded-lg bg-(--lagoon-deep) px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
				>
					<Plus size={14} />
					Add
				</button>
			</form>
		</div>
	);
}
