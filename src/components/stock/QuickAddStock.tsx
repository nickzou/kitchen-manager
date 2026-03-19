import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Combobox } from "#src/components/Combobox";
import { DatePicker } from "#src/components/DatePicker";
import { Modal } from "#src/components/Modal";
import { NumberInput } from "#src/components/NumberInput";
import { useCreateBrand } from "#src/lib/hooks/use-brands";
import { useCreateStockEntry } from "#src/lib/hooks/use-stock-entries";

interface QuickAddStockProps {
	products: { id: string; name: string }[];
	stores: { id: string; name: string }[];
	brands: { id: string; name: string }[];
}

export function QuickAddStock({
	products,
	stores,
	brands,
}: QuickAddStockProps) {
	const createStockEntry = useCreateStockEntry();
	const createBrand = useCreateBrand();

	const [open, setOpen] = useState(false);
	const [productId, setProductId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [expirationDate, setExpirationDate] = useState("");
	const [price, setPrice] = useState("");
	const [storeId, setStoreId] = useState("");
	const [brandId, setBrandId] = useState("");

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!productId || !quantity) return;
		await createStockEntry.mutateAsync({
			productId,
			quantity,
			expirationDate: expirationDate || undefined,
			purchaseDate: new Date().toISOString().slice(0, 10),
			price: price || undefined,
			storeId: storeId || undefined,
			brandId: brandId || undefined,
		});
		setQuantity("");
		setExpirationDate("");
		setPrice("");
		setStoreId("");
		setBrandId("");
		setOpen(false);
	}

	const formFields = (
		<>
			<Combobox
				value={productId}
				onChange={setProductId}
				options={products.map((p) => ({
					value: p.id,
					label: p.name,
				}))}
				placeholder="Select product *"
				required
				className="flex-1 min-w-40"
			/>
			<NumberInput
				placeholder="Quantity *"
				required
				step="any"
				min="0.01"
				value={quantity}
				onChange={(e) => setQuantity(e.target.value)}
				className="w-28 sm:w-28"
			/>
			<DatePicker
				value={expirationDate}
				onChange={setExpirationDate}
				placeholder="Expiration"
				className="w-40 sm:w-40"
			/>
			<NumberInput
				placeholder="Price"
				step="0.01"
				min="0"
				value={price}
				onChange={(e) => setPrice(e.target.value)}
				className="w-28 sm:w-28"
			/>
			<Combobox
				value={storeId}
				onChange={setStoreId}
				options={stores.map((s) => ({
					value: s.id,
					label: s.name,
				}))}
				placeholder="Store"
				className="w-40 sm:w-40"
			/>
			<Combobox
				value={brandId}
				onChange={setBrandId}
				options={brands.map((b) => ({
					value: b.id,
					label: b.name,
				}))}
				placeholder="Brand"
				className="w-40 sm:w-40"
				onCreateNew={async (name) => {
					const created = await createBrand.mutateAsync({ name });
					setBrandId(created.id);
				}}
			/>
			<button
				type="submit"
				disabled={createStockEntry.isPending}
				className="flex h-10 items-center gap-1.5 rounded-full bg-(--lagoon) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
			>
				<Plus size={16} />
				Add Stock
			</button>
		</>
	);

	return (
		<>
			{/* Desktop: inline form */}
			<form
				onSubmit={handleSubmit}
				className="mb-6 hidden flex-wrap gap-3 border-b border-(--line) pb-6 sm:flex"
			>
				{formFields}
			</form>

			{/* Mobile: button that opens a modal */}
			<div className="mb-6 border-b border-(--line) pb-6 sm:hidden">
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="flex h-10 items-center gap-1.5 rounded-full bg-(--lagoon) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
				>
					<Plus size={16} />
					Add Stock
				</button>
				<Modal open={open} onOpenChange={setOpen} title="Add Stock">
					<form onSubmit={handleSubmit} className="flex flex-col gap-3">
						{formFields}
					</form>
				</Modal>
			</div>
		</>
	);
}
