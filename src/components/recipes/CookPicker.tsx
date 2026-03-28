import { CookingPot } from "lucide-react";
import { Button } from "#src/components/Button";
import { Modal } from "#src/components/Modal";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";

interface IngredientDisplay {
	ingredient: RecipeIngredient;
	productName: string;
	scaledQuantity: string;
	unitLabel: string | null;
}

export interface CookPickerProps {
	open: boolean;
	groups: Map<string, IngredientDisplay[]>;
	selections: Record<string, string>;
	onSelectionChange: (groupName: string, ingredientId: string) => void;
	onCook: () => void;
	onCancel: () => void;
	isCooking: boolean;
}

export function CookPicker({
	open,
	groups,
	selections,
	onSelectionChange,
	onCook,
	onCancel,
	isCooking,
}: CookPickerProps) {
	return (
		<Modal
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel();
			}}
			title="Choose ingredients"
		>
			{[...groups].map(([groupName, groupIngs]) => (
				<div key={groupName} className="mb-3">
					<p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-(--sea-ink-soft)">
						{groupName}
					</p>
					<div className="flex flex-col gap-1">
						{groupIngs.map(
							({ ingredient, productName, scaledQuantity, unitLabel }) => (
								<label
									key={ingredient.id}
									className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-(--sea-ink) hover:bg-(--line)"
								>
									<input
										type="radio"
										name={`group-${groupName}`}
										checked={selections[groupName] === ingredient.id}
										onChange={() => onSelectionChange(groupName, ingredient.id)}
										className="accent-(--lagoon)"
									/>
									<span className="font-medium">{productName}</span>
									<span className="text-(--sea-ink-soft)">
										{scaledQuantity}
										{unitLabel ? ` ${unitLabel}` : ""}
									</span>
								</label>
							),
						)}
					</div>
				</div>
			))}
			<div className="flex gap-2">
				<Button
					type="button"
					onClick={onCook}
					disabled={isCooking}
					size="sm"
					className="flex items-center gap-1.5 px-4"
				>
					<CookingPot size={14} />
					{isCooking ? "Cooking…" : "Cook"}
				</Button>
				<button
					type="button"
					onClick={onCancel}
					className="flex h-8 items-center rounded-full px-3 text-sm font-medium text-(--sea-ink-soft) transition hover:bg-(--surface)"
				>
					Cancel
				</button>
			</div>
		</Modal>
	);
}
