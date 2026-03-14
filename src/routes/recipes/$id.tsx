import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import {
	AddIngredientForm,
	type IngredientFormState,
} from "#src/components/AddIngredientForm";
import { ImageInput } from "#src/components/ImageInput";
import { Island } from "#src/components/Island";
import { MultiCombobox } from "#src/components/MultiCombobox";
import { NumberInput } from "#src/components/NumberInput";
import { Page } from "#src/components/Page";
import { authClient } from "#src/lib/auth-client";
import { useRecipeCategories } from "#src/lib/hooks/use-categories";
import { useProductUnitConversions } from "#src/lib/hooks/use-product-unit-conversions";
import { useCreateProduct, useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import {
	useCreateRecipeIngredient,
	useDeleteRecipeIngredient,
	useRecipeIngredients,
} from "#src/lib/hooks/use-recipe-ingredients";
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
	const deleteIngredient = useDeleteRecipeIngredient(id);
	const createProduct = useCreateProduct();

	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [adjustedServings, setAdjustedServings] = useState<number | null>(null);
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
	});

	const [newIngredient, setNewIngredient] = useState<IngredientFormState>({
		productId: "",
		quantity: "",
		quantityUnitId: "",
		notes: "",
	});
	const { data: productConversions } = useProductUnitConversions(
		newIngredient.productId,
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
		});
		setEditing(false);
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

			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
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
								onChange={(e) => setForm({ ...form, servings: e.target.value })}
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
								onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
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
								onChange={(e) => setForm({ ...form, cookTime: e.target.value })}
								className="w-full"
							/>
						</div>

						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Instructions
							<textarea
								value={form.instructions}
								onChange={(e) =>
									setForm({ ...form, instructions: e.target.value })
								}
								rows={6}
								className={cn(inputClass, "h-auto py-2")}
							/>
						</label>

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
								<dt className="font-medium text-(--sea-ink-soft)">Servings</dt>
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
																	Math.max(1, (currentServings ?? base) - 1),
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
								<dt className="font-medium text-(--sea-ink-soft)">Prep Time</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{recipe.prepTime != null ? `${recipe.prepTime} min` : "—"}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Cook Time</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{recipe.cookTime != null ? `${recipe.cookTime} min` : "—"}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Created</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(recipe.createdAt)}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Updated</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(recipe.updatedAt)}
								</dd>
							</div>
						</dl>

						{recipe.instructions && (
							<div className="mt-4">
								<h2 className="mb-2 text-sm font-semibold text-(--sea-ink)">
									Instructions
								</h2>
								<p className="whitespace-pre-wrap text-sm text-(--sea-ink-soft)">
									{recipe.instructions}
								</p>
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

			<Island
				as="section"
				className="mt-6 animate-rise-in rounded-2xl p-6 sm:p-8"
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
						{(ingredients ?? []).map((ing) => (
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
								<button
									type="button"
									onClick={() => handleDeleteIngredient(ing.id)}
									className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
									title="Delete ingredient"
								>
									<Trash2 size={14} />
								</button>
							</div>
						))}
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
		</Page>
	);
}
