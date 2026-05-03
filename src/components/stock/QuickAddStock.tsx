import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "#src/components/Button";
import { Modal } from "#src/components/Modal";
import {
	StockEntryForm,
	type StockEntryFormProps,
} from "#src/components/stock/StockEntryForm";

type QuickAddStockProps = Omit<
	StockEntryFormProps,
	"initial" | "onSuccess" | "submitLabel" | "className"
>;

export function QuickAddStock(props: QuickAddStockProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			{/* Desktop: inline form */}
			<div className="mb-6 hidden border-b border-(--line) pb-6 sm:block">
				<StockEntryForm {...props} />
			</div>

			{/* Mobile: button that opens a modal */}
			<div className="mb-6 border-b border-(--line) pb-6 sm:hidden">
				<Button
					type="button"
					onClick={() => setOpen(true)}
					className="flex items-center gap-1.5"
				>
					<Plus size={16} />
					Add Stock
				</Button>
				<Modal open={open} onOpenChange={setOpen} title="Add Stock">
					<StockEntryForm
						{...props}
						className="flex flex-col gap-3"
						onSuccess={() => setOpen(false)}
					/>
				</Modal>
			</div>
		</>
	);
}
