import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "#src/components/Button";
import { Combobox } from "#src/components/Combobox";
import { DatePicker } from "#src/components/DatePicker";
import { Modal } from "#src/components/Modal";
import { NumberInput } from "#src/components/NumberInput";
import { useCreateBrand } from "#src/lib/hooks/use-brands";
import { useCreateStockEntry } from "#src/lib/hooks/use-stock-entries";
import {
	buildConversionGraph,
	tryConvert,
} from "#src/lib/recipe-utils/conversion-graph";

interface ConversionData {
	fromUnitId: string;
	toUnitId: string;
	factor: string | number;
}

interface QuickAddStockProps {
	products: {
		id: string;
		name: string;
		defaultQuantityUnitId: string | null;
	}[];
	stores: { id: string; name: string }[];
	brands: { id: string; name: string }[];
	quantityUnits: { id: string; abbreviation: string | null; name: string }[];
	productConversions: (ConversionData & { productId: string })[];
	globalConversions: ConversionData[];
}

export function QuickAddStock({
	products,
	stores,
	brands,
	quantityUnits,
	productConversions,
	globalConversions,
}: QuickAddStockProps) {
	const createStockEntry = useCreateStockEntry();
	const createBrand = useCreateBrand();

	const [open, setOpen] = useState(false);
	const [productId, setProductId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [unitId, setUnitId] = useState("");
	const [expirationDate, setExpirationDate] = useState("");
	const [price, setPrice] = useState("");
	const [storeId, setStoreId] = useState("");
	const [brandId, setBrandId] = useState("");

	const selectedProduct = products.find((p) => p.id === productId);
	const defaultUnitId = selectedProduct?.defaultQuantityUnitId ?? "";

	// Reset unitId when product changes
	useEffect(() => {
		setUnitId(defaultUnitId);
	}, [defaultUnitId]);

	// Build conversion graph and find convertible units
	const relevantProductConversions = productConversions.filter(
		(c) => c.productId === productId,
	);
	const allConversions = [...relevantProductConversions, ...globalConversions];
	const graph = buildConversionGraph(allConversions);

	const convertibleUnitIds = new Set<string>();
	if (defaultUnitId) {
		convertibleUnitIds.add(defaultUnitId);
		const edges = graph.get(defaultUnitId);
		if (edges) {
			for (const neighborId of edges.keys()) {
				convertibleUnitIds.add(neighborId);
			}
		}
	}

	const unitOptions = quantityUnits
		.filter((u) => convertibleUnitIds.has(u.id))
		.map((u) => ({
			value: u.id,
			label: u.abbreviation ?? u.name,
		}));

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!productId || !quantity) return;

		let finalQuantity = quantity;
		if (unitId && defaultUnitId && unitId !== defaultUnitId) {
			const converted = tryConvert(
				graph,
				Number.parseFloat(quantity),
				unitId,
				defaultUnitId,
			);
			if (converted === null) return;
			finalQuantity = String(converted);
		}

		await createStockEntry.mutateAsync({
			productId,
			quantity: finalQuantity,
			expirationDate: expirationDate || undefined,
			purchaseDate: new Date().toISOString().slice(0, 10),
			price: price || undefined,
			storeId: storeId || undefined,
			brandId: brandId || undefined,
		});
		setQuantity("");
		setUnitId(defaultUnitId);
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
			<div className="flex items-center gap-1.5">
				<NumberInput
					placeholder="Quantity *"
					required
					step="any"
					min="0.01"
					value={quantity}
					onChange={(e) => setQuantity(e.target.value)}
					className="w-28 sm:w-28"
				/>
				{unitOptions.length > 1 ? (
					<Combobox
						value={unitId}
						onChange={setUnitId}
						options={unitOptions}
						placeholder="Unit"
						className="w-24 sm:w-24"
					/>
				) : unitOptions.length === 1 ? (
					<span className="text-sm text-(--sea-ink-soft)">
						{unitOptions[0].label}
					</span>
				) : null}
			</div>
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
			<Button
				type="submit"
				disabled={createStockEntry.isPending}
				className="flex justify-center items-center gap-1.5"
			>
				<Plus size={16} />
				Add Stock
			</Button>
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
				<Button
					type="button"
					onClick={() => setOpen(true)}
					className="flex items-center gap-1.5"
				>
					<Plus size={16} />
					Add Stock
				</Button>
				<Modal open={open} onOpenChange={setOpen} title="Add Stock">
					<form onSubmit={handleSubmit} className="flex flex-col gap-3">
						{formFields}
					</form>
				</Modal>
			</div>
		</>
	);
}
