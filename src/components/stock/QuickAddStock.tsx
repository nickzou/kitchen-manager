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
import { roundQty } from "#src/lib/round-qty";

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
		defaultTareWeight: string | null;
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
	const [useScaleWeight, setUseScaleWeight] = useState(false);
	const [scaleWeight, setScaleWeight] = useState("");
	const [tareWeightOverride, setTareWeightOverride] = useState("");

	const selectedProduct = products.find((p) => p.id === productId);
	const defaultUnitId = selectedProduct?.defaultQuantityUnitId ?? "";
	const productTareWeight = selectedProduct?.defaultTareWeight ?? null;

	// Reset unitId and scale weight mode when product changes
	useEffect(() => {
		setUnitId(defaultUnitId);
		setUseScaleWeight(false);
		setScaleWeight("");
		setTareWeightOverride(productTareWeight ?? "");
	}, [defaultUnitId, productTareWeight]);

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

	const effectiveTare = useScaleWeight
		? Number.parseFloat(tareWeightOverride) || 0
		: 0;
	const netWeight = useScaleWeight
		? Math.max(0, (Number.parseFloat(scaleWeight) || 0) - effectiveTare)
		: null;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!productId) return;

		let rawQuantity: string;
		if (useScaleWeight) {
			if (!scaleWeight) return;
			rawQuantity = String(netWeight);
		} else {
			if (!quantity) return;
			rawQuantity = quantity;
		}

		let finalQuantity = rawQuantity;
		if (unitId && defaultUnitId && unitId !== defaultUnitId) {
			const converted = tryConvert(
				graph,
				Number.parseFloat(rawQuantity),
				unitId,
				defaultUnitId,
			);
			if (converted === null) return;
			finalQuantity = String(roundQty(converted));
		}

		await createStockEntry.mutateAsync({
			productId,
			quantity: finalQuantity,
			expirationDate: expirationDate || undefined,
			purchaseDate: new Date().toISOString().slice(0, 10),
			price: price || undefined,
			storeId: storeId || undefined,
			brandId: brandId || undefined,
			tareWeight: useScaleWeight ? tareWeightOverride || undefined : undefined,
		});
		setProductId("");
		setQuantity("");
		setUnitId("");
		setExpirationDate("");
		setPrice("");
		setStoreId("");
		setBrandId("");
		setUseScaleWeight(false);
		setScaleWeight("");
		setTareWeightOverride("");
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
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-1.5">
					{useScaleWeight ? (
						<NumberInput
							placeholder="Scale weight *"
							required
							step="any"
							min="0.01"
							value={scaleWeight}
							onChange={(e) => setScaleWeight(e.target.value)}
							className="w-28 sm:w-28"
						/>
					) : (
						<NumberInput
							placeholder="Quantity *"
							required
							step="any"
							min="0.01"
							value={quantity}
							onChange={(e) => setQuantity(e.target.value)}
							className="w-28 sm:w-28"
						/>
					)}
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
				{productTareWeight && (
					<button
						type="button"
						onClick={() => {
							setUseScaleWeight(!useScaleWeight);
							if (!useScaleWeight) {
								setTareWeightOverride(productTareWeight);
							}
						}}
						className="text-xs font-medium text-(--lagoon-deep) hover:underline self-start"
					>
						{useScaleWeight ? "Enter quantity directly" : "Weigh from scale"}
					</button>
				)}
				{useScaleWeight && (
					<div className="flex items-center gap-2">
						<label className="flex items-center gap-1 text-xs text-(--sea-ink-soft)">
							Tare:
							<NumberInput
								step="any"
								min="0"
								value={tareWeightOverride}
								onChange={(e) => setTareWeightOverride(e.target.value)}
								className="w-20 !h-6 !text-xs"
							/>
						</label>
						{scaleWeight && (
							<span className="text-xs font-medium text-(--sea-ink-soft)">
								net = {netWeight}
							</span>
						)}
					</div>
				)}
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
