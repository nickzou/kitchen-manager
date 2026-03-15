import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	CookingPot,
	Minus,
	Pencil,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import {
	AddIngredientForm,
	type IngredientFormState,
} from "#src/components/AddIngredientForm";
import { Combobox } from "#src/components/Combobox";
import { ImageInput } from "#src/components/ImageInput";
import { Island } from "#src/components/Island";
import { DetailColumns } from "#src/components/layouts/DetailColumns";
import { MarkdownEditor } from "#src/components/MarkdownEditor";
import { MultiCombobox } from "#src/components/MultiCombobox";
import { NumberInput } from "#src/components/NumberInput";
import { Page } from "#src/components/Page";
import { SectionHeading } from "#src/components/SectionHeading";
import { authClient } from "#src/lib/auth-client";
import { useRecipeCategories } from "#src/lib/hooks/use-categories";
import { useCookRecipe } from "#src/lib/hooks/use-cook-recipe";
import { useProductUnitConversions } from "#src/lib/hooks/use-product-unit-conversions";
import { useCreateProduct, useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import {
	useCreateRecipeIngredient,
	useDeleteRecipeIngredient,
	useRecipeIngredients,
	useUpdateRecipeIngredient,
} from "#src/lib/hooks/use-recipe-ingredients";
import {
	useCreateRecipePrepStep,
	useDeleteRecipePrepStep,
	useRecipePrepSteps,
	useUpdateRecipePrepStep,
} from "#src/lib/hooks/use-recipe-prep-steps";
import {
	useDeleteRecipe,
	useRecipe,
	useUpdateRecipe,
} from "#src/lib/hooks/use-recipes";
import { useUnitConversions } from "#src/lib/hooks/use-unit-conversions";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/recipes/$id")({
	component: RecipeDetail,
});

function RecipeDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: sessionLoading } = authClient.useSession();

	const { data: recipe, isLoading, error } = useRecipe(id);
	const { data: categories } = useRecipeCategories();
	const { data: products } = useProducts();
	const { data: quantityUnits } = useQuantityUnits();
	const { data: ingredients } = useRecipeIngredients(id);
	const { data: unitConversions } = useUnitConversions();
	const updateRecipe = useUpdateRecipe(id);
	const deleteRecipe = useDeleteRecipe();
	const createIngredient = useCreateRecipeIngredient(id);
	const updateIngredient = useUpdateRecipeIngredient(id);
	const deleteIngredient = useDeleteRecipeIngredient(id);
	const createProduct = useCreateProduct();
	const cookRecipe = useCookRecipe();
	const { data: prepSteps } = useRecipePrepSteps(id);
	const createPrepStep = useCreateRecipePrepStep(id);
	const updatePrepStep = useUpdateRecipePrepStep(id);
	const deletePrepStep = useDeleteRecipePrepStep(id);

	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [adjustedServings, setAdjustedServings] = useState<number | null>(null);
	const [cookResult, setCookResult] = useState<{
		deductions: { productId: string; needed: number; deducted: number }[];
		warnings: string[];
		produced?: { productId: string; quantity: number };
	} | null>(null);
	const cookResultRef = useRef<HTMLDivElement>(null);
	const htmlId = useId();
	const [form, setForm] = useState({
		name: "",
		description: "",
		image: null as string | null,
		categoryIds: [] as string[],
		servings: "",
		prepTime: "",
		cookTime: "",
		instructions: "",
		producedProductId: "" as string,
		producedQuantity: "" as string,
		producedQuantityUnitId: "" as string,
	});

	const [newIngredient, setNewIngredient] = useState<IngredientFormState>({
		productId: "",
		quantity: "",
		quantityUnitId: "",
		notes: "",
	});
	const [editingIngredientId, setEditingIngredientId] = useState<string | null>(
		null,
	);
	const [editIngredient, setEditIngredient] = useState<IngredientFormState>({
		productId: "",
		quantity: "",
		quantityUnitId: "",
		notes: "",
	});
	const [newPrepStep, setNewPrepStep] = useState({
		description: "",
		leadTimeMinutes: "",
	});
	const [editingPrepStepId, setEditingPrepStepId] = useState<string | null>(
		null,
	);
	const [editPrepStep, setEditPrepStep] = useState({
		description: "",
		leadTimeMinutes: "",
	});

	const { data: productConversions } = useProductUnitConversions(
		newIngredient.productId,
	);
	const { data: editProductConversions } = useProductUnitConversions(
		editIngredient.productId,
	);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	if (isLoading) {
		return (
			<Page as="main" className="pb-8 pt-14">
				<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
			</Page>
		);
	}

	if (error || !recipe) {
		return (
			<Page as="main" className="pb-8 pt-14">
				<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
					<h1 className="font-display mb-4 text-3xl font-bold text-(--sea-ink)">
						Recipe not found
					</h1>
					<Link
						to="/recipes"
						className="text-sm font-medium text-(--lagoon-deep)"
					>
						&larr; Back to recipes
					</Link>
				</Island>
			</Page>
		);
	}

	function getCategoryNames(catIds: string[]) {
		return catIds
			.map((id) => categories?.find((c) => c.id === id)?.name)
			.filter(Boolean) as string[];
	}

	function getProductName(productId: string | null) {
		if (!productId) return "Unknown product";
		return products?.find((p) => p.id === productId)?.name ?? "Unknown product";
	}

	function getUnitLabel(unitId: string | null) {
		if (!unitId) return null;
		const u = quantityUnits?.find((u) => u.id === unitId);
		return u ? (u.abbreviation ?? u.name) : null;
	}

	function startEditing() {
		if (!recipe) return;
		setForm({
			name: recipe.name,
			description: recipe.description || "",
			image: recipe.image,
			categoryIds: [...recipe.categoryIds],
			servings: recipe.servings != null ? String(recipe.servings) : "",
			prepTime: recipe.prepTime != null ? String(recipe.prepTime) : "",
			cookTime: recipe.cookTime != null ? String(recipe.cookTime) : "",
			instructions: recipe.instructions || "",
			producedProductId: recipe.producedProductId || "",
			producedQuantity: recipe.producedQuantity || "",
			producedQuantityUnitId: recipe.producedQuantityUnitId || "",
		});
		setEditing(true);
	}

	async function handleSave(e: FormEvent) {
		e.preventDefault();
		await updateRecipe.mutateAsync({
			name: form.name,
			description: form.description || undefined,
			image: form.image || undefined,
			categoryIds: form.categoryIds,
			servings: form.servings ? Number.parseInt(form.servings, 10) : undefined,
			prepTime: form.prepTime ? Number.parseInt(form.prepTime, 10) : undefined,
			cookTime: form.cookTime ? Number.parseInt(form.cookTime, 10) : undefined,
			instructions: form.instructions || undefined,
			producedProductId: form.producedProductId || null,
			producedQuantity: form.producedQuantity || null,
			producedQuantityUnitId: form.producedQuantityUnitId || null,
		});
		setEditing(false);
	}

	async function handleCook() {
		if (!recipe) return;
		const result = await cookRecipe.mutateAsync({
			recipeId: recipe.id,
			servings: currentServings ?? undefined,
		});
		setCookResult(result);
		setTimeout(
			() => cookResultRef.current?.scrollIntoView({ behavior: "smooth" }),
			100,
		);
	}

	async function handleDelete() {
		await deleteRecipe.mutateAsync(id);
		navigate({ to: "/recipes" });
	}

	async function handleAddIngredient() {
		if (!newIngredient.quantity) return;
		await createIngredient.mutateAsync({
			productId: newIngredient.productId || undefined,
			quantity: newIngredient.quantity,
			quantityUnitId: newIngredient.quantityUnitId || undefined,
			notes: newIngredient.notes || undefined,
		});
		setNewIngredient({
			productId: "",
			quantity: "",
			quantityUnitId: "",
			notes: "",
		});
	}

	async function handleCreateProduct(name: string) {
		const newProduct = await createProduct.mutateAsync({ name });
		return newProduct.id;
	}

	async function handleDeleteIngredient(ingredientId: string) {
		await deleteIngredient.mutateAsync(ingredientId);
	}

	function startEditingIngredient(ing: {
		id: string;
		productId: string | null;
		quantity: string;
		quantityUnitId: string | null;
		notes: string | null;
	}) {
		setEditIngredient({
			productId: ing.productId ?? "",
			quantity: ing.quantity,
			quantityUnitId: ing.quantityUnitId ?? "",
			notes: ing.notes ?? "",
		});
		setEditingIngredientId(ing.id);
	}

	async function handleSaveIngredient() {
		if (!editingIngredientId || !editIngredient.quantity) return;
		await updateIngredient.mutateAsync({
			id: editingIngredientId,
			productId: editIngredient.productId || undefined,
			quantity: editIngredient.quantity,
			quantityUnitId: editIngredient.quantityUnitId || undefined,
			notes: editIngredient.notes || undefined,
		});
		setEditingIngredientId(null);
	}

	async function handleAddPrepStep() {
		if (!newPrepStep.description || !newPrepStep.leadTimeMinutes) return;
		await createPrepStep.mutateAsync({
			description: newPrepStep.description,
			leadTimeMinutes: Number.parseInt(newPrepStep.leadTimeMinutes, 10),
		});
		setNewPrepStep({ description: "", leadTimeMinutes: "" });
	}

	async function handleDeletePrepStep(stepId: string) {
		await deletePrepStep.mutateAsync(stepId);
	}

	function startEditingPrepStep(step: {
		id: string;
		description: string;
		leadTimeMinutes: number;
	}) {
		setEditPrepStep({
			description: step.description,
			leadTimeMinutes: String(step.leadTimeMinutes),
		});
		setEditingPrepStepId(step.id);
	}

	async function handleSavePrepStep() {
		if (
			!editingPrepStepId ||
			!editPrepStep.description ||
			!editPrepStep.leadTimeMinutes
		)
			return;
		await updatePrepStep.mutateAsync({
			id: editingPrepStepId,
			description: editPrepStep.description,
			leadTimeMinutes: Number.parseInt(editPrepStep.leadTimeMinutes, 10),
		});
		setEditingPrepStepId(null);
	}

	function handleEditProductChange(selectedProductId: string) {
		if (editIngredient.quantityUnitId) return;
		const product = products?.find((p) => p.id === selectedProductId);
		if (product?.defaultQuantityUnitId) {
			setEditIngredient({
				...editIngredient,
				productId: selectedProductId,
				quantityUnitId: product.defaultQuantityUnitId,
			});
		}
	}

	function handleProductChange(selectedProductId: string) {
		if (newIngredient.quantityUnitId) return;
		const product = products?.find((p) => p.id === selectedProductId);
		if (product?.defaultQuantityUnitId) {
			setNewIngredient({
				...newIngredient,
				productId: selectedProductId,
				quantityUnitId: product.defaultQuantityUnitId,
			});
		}
	}

	function getConversionHint(): string | undefined {
		if (!newIngredient.quantityUnitId || !newIngredient.productId) return;
		const product = products?.find((p) => p.id === newIngredient.productId);
		if (!product?.defaultQuantityUnitId) return;
		if (newIngredient.quantityUnitId === product.defaultQuantityUnitId) return;

		const fromId = newIngredient.quantityUnitId;
		const toId = product.defaultQuantityUnitId;
		const fromUnit = quantityUnits?.find((u) => u.id === fromId);
		const toUnit = quantityUnits?.find((u) => u.id === toId);
		if (!fromUnit || !toUnit) return;

		const fromLabel = fromUnit.abbreviation ?? fromUnit.name;
		const toLabel = toUnit.abbreviation ?? toUnit.name;

		const productConversion = productConversions?.find(
			(c) =>
				(c.fromUnitId === fromId && c.toUnitId === toId) ||
				(c.fromUnitId === toId && c.toUnitId === fromId),
		);

		const conversion =
			productConversion ??
			unitConversions?.find(
				(c) =>
					(c.fromUnitId === fromId && c.toUnitId === toId) ||
					(c.fromUnitId === toId && c.toUnitId === fromId),
			);

		if (conversion) {
			if (conversion.fromUnitId === fromId) {
				return `1 ${fromLabel} = ${conversion.factor} ${toLabel}`;
			}
			const inverse = 1 / Number(conversion.factor);
			return `1 ${fromLabel} = ${Number.isInteger(inverse) ? inverse : inverse.toFixed(4)} ${toLabel}`;
		}

		return `No conversion to ${toLabel}`;
	}

	function getEditConversionHint(): string | undefined {
		if (!editIngredient.quantityUnitId || !editIngredient.productId) return;
		const product = products?.find((p) => p.id === editIngredient.productId);
		if (!product?.defaultQuantityUnitId) return;
		if (editIngredient.quantityUnitId === product.defaultQuantityUnitId) return;

		const fromId = editIngredient.quantityUnitId;
		const toId = product.defaultQuantityUnitId;
		const fromUnit = quantityUnits?.find((u) => u.id === fromId);
		const toUnit = quantityUnits?.find((u) => u.id === toId);
		if (!fromUnit || !toUnit) return;

		const fromLabel = fromUnit.abbreviation ?? fromUnit.name;
		const toLabel = toUnit.abbreviation ?? toUnit.name;

		const productConversion = editProductConversions?.find(
			(c) =>
				(c.fromUnitId === fromId && c.toUnitId === toId) ||
				(c.fromUnitId === toId && c.toUnitId === fromId),
		);

		const conversion =
			productConversion ??
			unitConversions?.find(
				(c) =>
					(c.fromUnitId === fromId && c.toUnitId === toId) ||
					(c.fromUnitId === toId && c.toUnitId === fromId),
			);

		if (conversion) {
			if (conversion.fromUnitId === fromId) {
				return `1 ${fromLabel} = ${conversion.factor} ${toLabel}`;
			}
			const inverse = 1 / Number(conversion.factor);
			return `1 ${fromLabel} = ${Number.isInteger(inverse) ? inverse : inverse.toFixed(4)} ${toLabel}`;
		}

		return `No conversion to ${toLabel}`;
	}

	const currentServings = adjustedServings ?? recipe?.servings ?? null;
	const scaleFactor =
		currentServings != null && recipe?.servings
			? currentServings / recipe.servings
			: 1;

	function formatScaled(quantity: string): string {
		const num = Number(quantity);
		if (Number.isNaN(num)) return quantity;
		const scaled = num * scaleFactor;
		return Number.parseFloat(scaled.toFixed(2)).toString();
	}

	const inputClass =
		"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	function formatLeadTime(minutes: number): string {
		if (minutes < 60) return `${minutes} minutes before`;
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		if (minutes < 1440) {
			if (remainingMinutes === 0) {
				return `${hours} hour${hours > 1 ? "s" : ""} before`;
			}
			return `${hours}h ${remainingMinutes}m before`;
		}
		const days = Math.floor(minutes / 1440);
		const remainingHours = Math.floor((minutes % 1440) / 60);
		if (remainingHours === 0) {
			return `${days} day${days > 1 ? "s" : ""} before`;
		}
		return `${days}d ${remainingHours}h before`;
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString();
	}

	const categoryNames = getCategoryNames(recipe.categoryIds);

	const categoryOptions = (categories ?? []).map((c) => ({
		value: c.id,
		label: c.name,
	}));

	const productOptions = (products ?? []).map((p) => ({
		value: p.id,
		label: p.name,
	}));

	const unitOptions = (quantityUnits ?? []).map((u) => ({
		value: u.id,
		label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
	}));

	return (
		<Page as="main" className="pb-8 pt-14">
			<Link
				to="/recipes"
				className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-(--lagoon-deep) no-underline hover:underline"
			>
				<ArrowLeft size={14} />
				Back to recipes
			</Link>

			<DetailColumns
				main={
					<Island
						as="section"
						className="animate-rise-in rounded-2xl p-6 sm:p-8"
					>
						{editing ? (
							<form onSubmit={handleSave} className="flex flex-col gap-4">
								<div className="flex items-center justify-between">
									<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
										Edit recipe
									</h1>
									<button
										type="button"
										onClick={() => setEditing(false)}
										className="rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-(--surface)"
									>
										<X size={18} />
									</button>
								</div>

								<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
									Name
									<input
										type="text"
										required
										value={form.name}
										onChange={(e) => setForm({ ...form, name: e.target.value })}
										className={inputClass}
									/>
								</label>

								<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
									Description
									<textarea
										value={form.description}
										onChange={(e) =>
											setForm({ ...form, description: e.target.value })
										}
										rows={3}
										className={cn(inputClass, "h-auto py-2")}
									/>
								</label>

								<ImageInput
									value={form.image}
									onChange={(url) => setForm({ ...form, image: url })}
								/>

								<div className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
									Categories
									<MultiCombobox
										value={form.categoryIds}
										onChange={(v) => setForm({ ...form, categoryIds: v })}
										options={categoryOptions}
										placeholder="None"
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<label
										htmlFor={`${htmlId}-servings`}
										className="text-sm font-medium text-(--sea-ink)"
									>
										Servings
									</label>
									<NumberInput
										id={`${htmlId}-servings`}
										min="1"
										value={form.servings}
										onChange={(e) =>
											setForm({ ...form, servings: e.target.value })
										}
										className="w-full"
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<label
										htmlFor={`${htmlId}-prepTime`}
										className="text-sm font-medium text-(--sea-ink)"
									>
										Prep Time (minutes)
									</label>
									<NumberInput
										id={`${htmlId}-prepTime`}
										min="0"
										value={form.prepTime}
										onChange={(e) =>
											setForm({ ...form, prepTime: e.target.value })
										}
										className="w-full"
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<label
										htmlFor={`${htmlId}-cookTime`}
										className="text-sm font-medium text-(--sea-ink)"
									>
										Cook Time (minutes)
									</label>
									<NumberInput
										id={`${htmlId}-cookTime`}
										min="0"
										value={form.cookTime}
										onChange={(e) =>
											setForm({ ...form, cookTime: e.target.value })
										}
										className="w-full"
									/>
								</div>

								<fieldset className="flex flex-col gap-3 rounded-lg border border-(--line) p-4">
									<legend className="px-1 text-sm font-medium text-(--sea-ink)">
										Prep Steps
									</legend>
									{(() => {
										const sorted = [...(prepSteps ?? [])].sort(
											(a, b) => b.leadTimeMinutes - a.leadTimeMinutes,
										);
										return sorted.length > 0 ? (
											<div className="flex flex-col gap-2">
												{sorted.map((step) =>
													editingPrepStepId === step.id ? (
														<div
															key={step.id}
															className="flex flex-col gap-3 rounded-lg border border-(--lagoon) p-3"
														>
															<input
																type="text"
																placeholder="Description"
																value={editPrepStep.description}
																onChange={(e) =>
																	setEditPrepStep({
																		...editPrepStep,
																		description: e.target.value,
																	})
																}
																className={inputClass}
															/>
															<div className="flex flex-col gap-1">
																<NumberInput
																	min="1"
																	placeholder="Lead time (minutes)"
																	value={editPrepStep.leadTimeMinutes}
																	onChange={(e) =>
																		setEditPrepStep({
																			...editPrepStep,
																			leadTimeMinutes: e.target.value,
																		})
																	}
																	className="w-full"
																/>
																{editPrepStep.leadTimeMinutes && (
																	<p className="text-xs text-(--sea-ink-soft)">
																		{formatLeadTime(
																			Number.parseInt(
																				editPrepStep.leadTimeMinutes,
																				10,
																			),
																		)}
																	</p>
																)}
															</div>
															<div className="flex gap-2">
																<button
																	type="button"
																	onClick={handleSavePrepStep}
																	disabled={
																		updatePrepStep.isPending ||
																		!editPrepStep.description ||
																		!editPrepStep.leadTimeMinutes
																	}
																	className="flex h-8 items-center gap-1 rounded-full bg-(--lagoon) px-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
																>
																	<Check size={14} />
																	{updatePrepStep.isPending
																		? "Saving…"
																		: "Save"}
																</button>
																<button
																	type="button"
																	onClick={() => setEditingPrepStepId(null)}
																	className="flex h-8 items-center rounded-full px-3 text-sm font-medium text-(--sea-ink-soft) transition hover:bg-(--surface)"
																>
																	Cancel
																</button>
															</div>
														</div>
													) : (
														<div
															key={step.id}
															className="flex items-center justify-between rounded-lg border border-(--line) px-3 py-2"
														>
															<div className="flex-1 text-sm text-(--sea-ink)">
																<span className="font-medium">
																	{step.description}
																</span>
																<span className="ml-2 text-(--sea-ink-soft)">
																	{formatLeadTime(step.leadTimeMinutes)}
																</span>
															</div>
															<div className="flex gap-0.5">
																<button
																	type="button"
																	onClick={() => startEditingPrepStep(step)}
																	className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
																	title="Edit prep step"
																>
																	<Pencil size={14} />
																</button>
																<button
																	type="button"
																	onClick={() => handleDeletePrepStep(step.id)}
																	className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
																	title="Delete prep step"
																>
																	<Trash2 size={14} />
																</button>
															</div>
														</div>
													),
												)}
											</div>
										) : (
											<p className="text-sm text-(--sea-ink-soft)">
												No prep steps yet.
											</p>
										);
									})()}

									<div className="flex flex-col gap-2 rounded-lg border border-dashed border-(--line) p-3">
										<input
											type="text"
											placeholder="e.g. Defrost chicken"
											value={newPrepStep.description}
											onChange={(e) =>
												setNewPrepStep({
													...newPrepStep,
													description: e.target.value,
												})
											}
											className={inputClass}
										/>
										<div className="flex flex-col gap-1">
											<NumberInput
												min="1"
												placeholder="Lead time (minutes)"
												value={newPrepStep.leadTimeMinutes}
												onChange={(e) =>
													setNewPrepStep({
														...newPrepStep,
														leadTimeMinutes: e.target.value,
													})
												}
												className="w-full"
											/>
											{newPrepStep.leadTimeMinutes && (
												<p className="text-xs text-(--sea-ink-soft)">
													{formatLeadTime(
														Number.parseInt(newPrepStep.leadTimeMinutes, 10),
													)}
												</p>
											)}
										</div>
										<button
											type="button"
											onClick={handleAddPrepStep}
											disabled={
												createPrepStep.isPending ||
												!newPrepStep.description ||
												!newPrepStep.leadTimeMinutes
											}
											className="h-8 rounded-full bg-(--lagoon) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
										>
											{createPrepStep.isPending ? "Adding…" : "Add prep step"}
										</button>
									</div>
								</fieldset>

								<fieldset className="flex flex-col gap-3 rounded-lg border border-(--line) p-4">
									<legend className="px-1 text-sm font-medium text-(--sea-ink)">
										Produced Product
									</legend>
									<div className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
										Product
										<Combobox
											value={form.producedProductId}
											onChange={(v) =>
												setForm({ ...form, producedProductId: v })
											}
											options={productOptions}
											placeholder="None"
										/>
									</div>
									<div className="flex flex-col gap-1.5">
										<label
											htmlFor={`${htmlId}-producedQty`}
											className="text-sm font-medium text-(--sea-ink)"
										>
											Quantity
										</label>
										<NumberInput
											id={`${htmlId}-producedQty`}
											step="any"
											min="0"
											value={form.producedQuantity}
											onChange={(e) =>
												setForm({
													...form,
													producedQuantity: e.target.value,
												})
											}
											className="w-full"
										/>
									</div>
									<div className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
										Unit
										<Combobox
											value={form.producedQuantityUnitId}
											onChange={(v) =>
												setForm({
													...form,
													producedQuantityUnitId: v,
												})
											}
											options={unitOptions}
											placeholder="None"
										/>
									</div>
								</fieldset>

								<button
									type="submit"
									disabled={updateRecipe.isPending}
									className="mt-2 h-10 rounded-full bg-(--lagoon) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
								>
									{updateRecipe.isPending ? "Saving…" : "Save changes"}
								</button>
							</form>
						) : (
							<>
								<div className="mb-6 flex items-start justify-between gap-4">
									<div>
										<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
											{recipe.name}
										</h1>
										{categoryNames.length > 0 && (
											<div className="mt-2 flex flex-wrap gap-1">
												{categoryNames.map((name) => (
													<span
														key={name}
														className="inline-block rounded-full bg-[rgba(79,184,178,0.14)] px-2.5 py-0.5 text-xs font-medium text-(--lagoon-deep)"
													>
														{name}
													</span>
												))}
											</div>
										)}
									</div>
									<div className="flex gap-1">
										{ingredients && ingredients.length > 0 && (
											<button
												type="button"
												onClick={handleCook}
												disabled={cookRecipe.isPending}
												className="flex items-center gap-1.5 rounded-full bg-(--lagoon) px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
											>
												<CookingPot size={16} />
												{cookRecipe.isPending ? "Cooking…" : "Cook"}
											</button>
										)}
										<button
											type="button"
											onClick={startEditing}
											className="rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
											title="Edit"
										>
											<Pencil size={18} />
										</button>
										<button
											type="button"
											onClick={() => setConfirmDelete(true)}
											className="rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
											title="Delete"
										>
											<Trash2 size={18} />
										</button>
									</div>
								</div>

								{recipe.description && (
									<p className="mb-4 text-sm text-(--sea-ink-soft)">
										{recipe.description}
									</p>
								)}

								{recipe.image && (
									<img
										src={recipe.image}
										alt={recipe.name}
										className="mb-4 h-40 w-40 rounded-lg border border-(--line) object-cover"
									/>
								)}

								<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Servings
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											{recipe.servings != null
												? (() => {
														const base = recipe.servings;
														return (
															<span className="inline-flex items-center gap-1.5">
																<button
																	type="button"
																	onClick={() =>
																		setAdjustedServings(
																			Math.max(
																				1,
																				(currentServings ?? base) - 1,
																			),
																		)
																	}
																	className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-(--line) text-(--sea-ink-soft) transition hover:bg-(--surface)"
																	aria-label="Decrease servings"
																>
																	<Minus size={12} />
																</button>
																<span data-testid="adjusted-servings">
																	{currentServings}
																</span>
																<button
																	type="button"
																	onClick={() =>
																		setAdjustedServings(
																			(currentServings ?? base) + 1,
																		)
																	}
																	className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-(--line) text-(--sea-ink-soft) transition hover:bg-(--surface)"
																	aria-label="Increase servings"
																>
																	<Plus size={12} />
																</button>
																{adjustedServings != null &&
																	adjustedServings !== base && (
																		<button
																			type="button"
																			onClick={() => setAdjustedServings(null)}
																			className="ml-1 text-xs font-medium text-(--lagoon-deep) hover:underline"
																		>
																			Reset
																		</button>
																	)}
															</span>
														);
													})()
												: "—"}
										</dd>
									</div>
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Prep Time
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											{recipe.prepTime != null ? `${recipe.prepTime} min` : "—"}
										</dd>
									</div>
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Cook Time
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											{recipe.cookTime != null ? `${recipe.cookTime} min` : "—"}
										</dd>
									</div>
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Created
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											{formatDate(recipe.createdAt)}
										</dd>
									</div>
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Updated
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											{formatDate(recipe.updatedAt)}
										</dd>
									</div>
								</dl>

								{(() => {
									const sorted = [...(prepSteps ?? [])].sort(
										(a, b) => b.leadTimeMinutes - a.leadTimeMinutes,
									);
									return sorted.length > 0 ? (
										<div className="mt-4">
											<SectionHeading>Prep Steps</SectionHeading>
											<div className="flex flex-col gap-2">
												{sorted.map((step) => (
													<div
														key={step.id}
														className="flex items-center justify-between rounded-lg border border-(--line) px-3 py-2"
													>
														<div className="flex-1 text-sm text-(--sea-ink)">
															<span className="font-medium">
																{step.description}
															</span>
															<span className="ml-2 text-(--sea-ink-soft)">
																{formatLeadTime(step.leadTimeMinutes)}
															</span>
														</div>
													</div>
												))}
											</div>
										</div>
									) : null;
								})()}

								{recipe.producedProductId &&
									(() => {
										const producedProduct = products?.find(
											(p) => p.id === recipe.producedProductId,
										);
										return (
											<div className="mt-4">
												<SectionHeading>Produces</SectionHeading>
												<div className="flex items-center gap-3">
													{producedProduct?.image && (
														<img
															src={producedProduct.image}
															alt={producedProduct.name}
															className="h-10 w-10 rounded-lg border border-(--line) object-cover"
														/>
													)}
													<p className="text-sm text-(--sea-ink-soft)">
														{producedProduct?.name ?? "Unknown product"}
														{recipe.producedQuantity && (
															<>
																{" — "}
																{recipe.producedQuantity}
																{getUnitLabel(recipe.producedQuantityUnitId)
																	? ` ${getUnitLabel(recipe.producedQuantityUnitId)}`
																	: ""}
															</>
														)}
													</p>
												</div>
											</div>
										);
									})()}

								{cookResult && (
									<div
										ref={cookResultRef}
										className="mt-4 rounded-lg border border-(--line) p-4"
									>
										<div className="mb-2 flex items-center justify-between">
											<h2 className="text-sm font-semibold text-(--sea-ink)">
												Cook Result
											</h2>
											<button
												type="button"
												onClick={() => setCookResult(null)}
												className="rounded-lg p-1 text-(--sea-ink-soft) transition hover:bg-(--surface)"
											>
												<X size={14} />
											</button>
										</div>
										{cookResult.deductions.length > 0 && (
											<ul className="mb-2 flex flex-col gap-1 text-sm text-(--sea-ink-soft)">
												{cookResult.deductions.map((d) => (
													<li key={d.productId}>
														{getProductName(d.productId)}: deducted {d.deducted}{" "}
														of {d.needed}
													</li>
												))}
											</ul>
										)}
										{cookResult.warnings.length > 0 && (
											<ul className="mb-2 flex flex-col gap-1 text-sm text-amber-600 dark:text-amber-400">
												{cookResult.warnings.map((w) => (
													<li key={w}>{w}</li>
												))}
											</ul>
										)}
										{cookResult.produced && (
											<p className="text-sm font-medium text-(--lagoon-deep)">
												Produced:{" "}
												{getProductName(cookResult.produced.productId)} (
												{cookResult.produced.quantity})
											</p>
										)}
									</div>
								)}

								{confirmDelete && (
									<div className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
										<p className="flex-1 text-sm text-red-700 dark:text-red-300">
											Delete this recipe? This cannot be undone.
										</p>
										<button
											type="button"
											onClick={() => setConfirmDelete(false)}
											className="rounded-lg px-3 py-1.5 text-sm font-medium text-(--sea-ink-soft) transition hover:bg-(--surface)"
										>
											Cancel
										</button>
										<button
											type="button"
											onClick={handleDelete}
											disabled={deleteRecipe.isPending}
											className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
										>
											{deleteRecipe.isPending ? "Deleting…" : "Delete"}
										</button>
									</div>
								)}
							</>
						)}
					</Island>
				}
				side={
					<div className="flex flex-col gap-6">
						{(editing || recipe?.instructions) && (
							<Island
								as="section"
								className="animate-rise-in rounded-2xl p-6 sm:p-8"
							>
								<SectionHeading>Instructions</SectionHeading>
								{editing ? (
									<MarkdownEditor
										value={form.instructions}
										onChange={(v) => setForm({ ...form, instructions: v })}
										height={200}
										placeholder="Write instructions using markdown…"
									/>
								) : (
									<MarkdownEditor value={recipe?.instructions ?? ""} />
								)}
							</Island>
						)}
						<Island
							as="section"
							className="animate-rise-in rounded-2xl p-6 sm:p-8"
						>
							<h2 className="mb-4 text-lg font-semibold text-(--sea-ink)">
								Ingredients
							</h2>

							{!ingredients?.length && !editing ? (
								<p className="mb-4 text-sm text-(--sea-ink-soft)">
									No ingredients yet.
								</p>
							) : (
								<div className="mb-4 flex flex-col gap-2">
									{(ingredients ?? []).map((ing) =>
										editingIngredientId === ing.id ? (
											<div
												key={ing.id}
												className="flex flex-col gap-3 rounded-lg border border-(--lagoon) p-3"
											>
												<div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[2fr_5rem_1fr_1fr]">
													<Combobox
														value={editIngredient.productId}
														onChange={(v) => {
															setEditIngredient({
																...editIngredient,
																productId: v,
															});
															handleEditProductChange(v);
														}}
														options={productOptions}
														placeholder="Product"
														className="col-span-full sm:col-span-1"
														onCreateNew={async (name) => {
															const newId = await handleCreateProduct(name);
															setEditIngredient({
																...editIngredient,
																productId: newId,
															});
														}}
													/>
													<NumberInput
														step="any"
														min="0"
														placeholder="Qty"
														value={editIngredient.quantity}
														onChange={(e) =>
															setEditIngredient({
																...editIngredient,
																quantity: e.target.value,
															})
														}
													/>
													<Combobox
														value={editIngredient.quantityUnitId}
														onChange={(v) =>
															setEditIngredient({
																...editIngredient,
																quantityUnitId: v,
															})
														}
														options={unitOptions}
														placeholder="Unit"
													/>
													<input
														type="text"
														placeholder="Notes"
														value={editIngredient.notes}
														onChange={(e) =>
															setEditIngredient({
																...editIngredient,
																notes: e.target.value,
															})
														}
														className={inputClass}
													/>
												</div>
												{(() => {
													const hint = getEditConversionHint();
													return hint ? (
														<p
															className={`text-xs ${hint.includes("No conversion") ? "text-amber-600 dark:text-amber-400" : "text-(--sea-ink-soft)"}`}
														>
															{hint}
														</p>
													) : null;
												})()}
												<div className="flex gap-2">
													<button
														type="button"
														onClick={handleSaveIngredient}
														disabled={
															updateIngredient.isPending ||
															!editIngredient.quantity
														}
														className="flex h-8 items-center gap-1 rounded-full bg-(--lagoon) px-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
													>
														<Check size={14} />
														{updateIngredient.isPending ? "Saving…" : "Save"}
													</button>
													<button
														type="button"
														onClick={() => setEditingIngredientId(null)}
														className="flex h-8 items-center rounded-full px-3 text-sm font-medium text-(--sea-ink-soft) transition hover:bg-(--surface)"
													>
														Cancel
													</button>
												</div>
											</div>
										) : (
											<div
												key={ing.id}
												className="flex items-center justify-between rounded-lg border border-(--line) px-3 py-2"
											>
												<div className="flex-1 text-sm text-(--sea-ink)">
													<span className="font-medium">
														{getProductName(ing.productId)}
													</span>
													<span className="ml-2 text-(--sea-ink-soft)">
														{formatScaled(ing.quantity)}
														{getUnitLabel(ing.quantityUnitId)
															? ` ${getUnitLabel(ing.quantityUnitId)}`
															: ""}
													</span>
													{ing.notes && (
														<span className="ml-2 text-xs text-(--sea-ink-soft)">
															({ing.notes})
														</span>
													)}
												</div>
												<div className="flex gap-0.5">
													<button
														type="button"
														onClick={() => startEditingIngredient(ing)}
														className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
														title="Edit ingredient"
													>
														<Pencil size={14} />
													</button>
													<button
														type="button"
														onClick={() => handleDeleteIngredient(ing.id)}
														className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
														title="Delete ingredient"
													>
														<Trash2 size={14} />
													</button>
												</div>
											</div>
										),
									)}
								</div>
							)}

							<AddIngredientForm
								productOptions={productOptions}
								unitOptions={unitOptions}
								onAdd={handleAddIngredient}
								isPending={createIngredient.isPending}
								newIngredient={newIngredient}
								setNewIngredient={setNewIngredient}
								onCreateProduct={handleCreateProduct}
								onProductChange={handleProductChange}
								unitHint={getConversionHint()}
							/>
						</Island>
					</div>
				}
			/>
		</Page>
	);
}
