import {
	Check,
	ChevronDown,
	ChevronLeft,
	Pencil,
	Trash2,
	X,
} from "lucide-react";
import { IngredientRow, type IngredientRowProps } from "./IngredientRow";

export interface IngredientGroupProps {
	groupName: string;
	ingredientRows: IngredientRowProps[];
	ingredientCount: number;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
	isRenaming: boolean;
	renameValue: string;
	onRenameValueChange: (value: string) => void;
	onRenameSubmit: () => void;
	onRenameCancel: () => void;
	onStartRename: () => void;
	isRenameSaving: boolean;
	onDelete: () => void;
}

const inputClass =
	"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

export function IngredientGroup({
	groupName,
	ingredientRows,
	ingredientCount,
	isCollapsed,
	onToggleCollapse,
	isRenaming,
	renameValue,
	onRenameValueChange,
	onRenameSubmit,
	onRenameCancel,
	onStartRename,
	isRenameSaving,
	onDelete,
}: IngredientGroupProps) {
	return (
		<div className="rounded-lg border border-(--line) overflow-hidden">
			<div className="flex items-center px-3 py-2">
				{isRenaming ? (
					<form
						className="flex flex-1 items-center gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							onRenameSubmit();
						}}
					>
						<input
							type="text"
							value={renameValue}
							onChange={(e) => onRenameValueChange(e.target.value)}
							className={`${inputClass} !h-8`}
							ref={(el) => el?.focus()}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									onRenameCancel();
								}
							}}
						/>
						<button
							type="submit"
							disabled={isRenameSaving}
							className="rounded-lg p-1.5 text-(--lagoon) transition hover:bg-(--surface)"
							title="Save"
						>
							<Check size={14} />
						</button>
						<button
							type="button"
							onClick={onRenameCancel}
							className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-(--surface)"
							title="Cancel"
						>
							<X size={14} />
						</button>
					</form>
				) : (
					<>
						<div className="flex flex-1 items-center gap-2">
							<span className="text-sm font-medium text-(--sea-ink)">
								{groupName || "Unnamed group"}
							</span>
							<span className="rounded-full bg-(--surface) px-1.5 py-0.5 text-xs text-(--sea-ink-soft)">
								{ingredientCount}
							</span>
						</div>
						<div className="flex gap-0.5">
							<button
								type="button"
								onClick={onToggleCollapse}
								className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
								title={isCollapsed ? "Expand group" : "Collapse group"}
							>
								{isCollapsed ? (
									<ChevronLeft size={14} />
								) : (
									<ChevronDown size={14} />
								)}
							</button>
							<button
								type="button"
								onClick={onStartRename}
								className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
								title="Rename group"
							>
								<Pencil size={14} />
							</button>
							<button
								type="button"
								onClick={onDelete}
								className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
								title="Delete group"
							>
								<Trash2 size={14} />
							</button>
						</div>
					</>
				)}
			</div>
			{!isCollapsed && (
				<div className="border-t border-(--line) px-3 py-2 flex flex-col gap-1">
					{ingredientRows.map((rowProps, i) => (
						<div key={rowProps.ingredient.id}>
							{i > 0 && (
								<p className="py-0.5 text-center text-xs italic text-(--sea-ink-soft)">
									or
								</p>
							)}
							<IngredientRow {...rowProps} />
						</div>
					))}
				</div>
			)}
		</div>
	);
}
