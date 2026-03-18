import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	CircleCheck,
	CircleX,
	CookingPot,
	Minus,
	Pencil,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import { type FormEvent, useId, useMemo, useRef, useState } from "react";
import {
	AddIngredientForm,
	type IngredientFormState,
} from "#src/components/AddIngredientForm";
import { AlertBox } from "#src/components/AlertBox";
import { Combobox } from "#src/components/Combobox";
import { ImageInput } from "#src/components/ImageInput";
import { Input } from "#src/components/Input";
import { Island } from "#src/components/Island";
import { DetailColumns } from "#src/components/layouts/DetailColumns";
import { MarkdownEditor } from "#src/components/MarkdownEditor";
import { MultiCombobox } from "#src/components/MultiCombobox";
import { NumberInput } from "#src/components/NumberInput";
import { Page } from "#src/components/Page";
import { CookPicker } from "#src/components/recipes/CookPicker";
import { IngredientGroup } from "#src/components/recipes/IngredientGroup";
import { IngredientRow } from "#src/components/recipes/IngredientRow";
import { PrepStepRow } from "#src/components/recipes/PrepStepRow";
import { SectionHeading } from "#src/components/SectionHeading";
import { Textarea } from "#src/components/Textarea";
import { authClient } from "#src/lib/auth-client";
import { useRecipeCategories } from "#src/lib/hooks/use-categories";
import { useCookRecipe } from "#src/lib/hooks/use-cook-recipe";
import {
	useProductUnitConversion,
	useProductUnitConversions,
} from "#src/lib/hooks/use-product-unit-conversions";
import { useCreateProduct, useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import { useRecipeAvailability } from "#src/lib/hooks/use-recipe-availability";
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
import { useStockEntries } from "#src/lib/hooks/use-stock-entries";
import { useUnitConversions } from "#src/lib/hooks/use-unit-conversions";
import {
	buildConversionGraph,
	getRecipeCost,
	getStockTotals,
	tryConvert,
} from "#src/lib/recipe-utils";

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
	const { data: stockEntries } = useStockEntries();
	const { data: recipeAvailability } = useRecipeAvailability();

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
	const [addMode, setAddMode] = useState<"ingredient" | "group">("ingredient");
	const [pendingGroupName, setPendingGroupName] = useState("");
	const [pendingGroupItems, setPendingGroupItems] = useState<
		Array<{
			productId: string;
			quantity: string;
			quantityUnitId: string;
			notes: string;
		}>
	>([]);
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		new Set(),
	);
	const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
	const [editGroupNameValue, setEditGroupNameValue] = useState("");
	const [editingIngredientId, setEditingIngredientId] = useState<string | null>(
		null,
	);
	const [editIngredient, setEditIngredient] = useState<
		IngredientFormState & { groupName: string }
	>({
		productId: "",
		quantity: "",
		quantityUnitId: "",
		notes: "",
		groupName: "",
	});
	const [showCookPicker, setShowCookPicker] = useState(false);
	const [groupSelections, setGroupSelections] = useState<
		Record<string, string>
	>({});
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

	const { data: productConversions } = useProductUnitConversion(
		newIngredient.productId,
	);
	const { data: editProductConversions } = useProductUnitConversion(
		editIngredient.productId,
	);

	const ingredientProductIds = useMemo(
		() => [
			...new Set(
				(ingredients ?? [])
					.filter((i) => i.productId)
					.map((i) => i.productId as string),
			),
		],
		[ingredients],
	);
	const { data: allProductConversions } =
		useProductUnitConversions(ingredientProductIds);

	const currentServings = adjustedServings ?? recipe?.servings ?? null;
	const scaleFactor =
		currentServings != null && recipe?.servings
			? currentServings / recipe.servings
			: 1;

	// Compute per-ingredient stock availability
	const ingredientAvailability = useMemo(() => {
		if (!ingredients || !products || !stockEntries)
			return new Map<string, "sufficient" | "deficit" | "unknown">();
		const result = new Map<string, "sufficient" | "deficit" | "unknown">();

		const stockTotals = getStockTotals(stockEntries);

		for (const ing of ingredients) {
			if (!ing.productId) continue;
			const p = products.find((p) => p.id === ing.productId);
			if (!p) continue;

			const specific =
				allProductConversions?.filter((c) => c.productId === ing.productId) ??
				[];
			const graph = buildConversionGraph([
				...(unitConversions ?? []),
				...specific,
			]);

			const stockQty = stockTotals.get(ing.productId) ?? 0;
			const needed = Number(ing.quantity) * scaleFactor;
			const neededInStockUnit = tryConvert(
				graph,
				needed,
				ing.quantityUnitId,
				p.defaultQuantityUnitId,
			);

			if (
				ing.quantityUnitId !== p.defaultQuantityUnitId &&
				neededInStockUnit === null
			) {
				result.set(ing.id, "unknown");
			} else {
				const effective = neededInStockUnit ?? needed;
				result.set(ing.id, stockQty >= effective ? "sufficient" : "deficit");
			}
		}

		return result;
	}, [
		ingredients,
		products,
		stockEntries,
		unitConversions,
		allProductConversions,
		scaleFactor,
	]);

	const recipeCost = useMemo(() => {
		if (!ingredients || !products || !stockEntries || !unitConversions)
			return null;
		return getRecipeCost({
			ingredients,
			products,
			stockEntries,
			unitConversions,
			scaleFactor,
		});
	}, [ingredients, products, stockEntries, unitConversions, scaleFactor]);

	const sortedPrepSteps = useMemo(
		() =>
			[...(prepSteps ?? [])].sort(
				(a, b) => b.leadTimeMinutes - a.leadTimeMinutes,
			),
		[prepSteps],
	);

	const producedProduct = useMemo(
		() =>
			recipe?.producedProductId
				? products?.find((p) => p.id === recipe.producedProductId)
				: undefined,
		[recipe?.producedProductId, products],
	);

	const ingredientGroups = useMemo(() => {
		const allIngs = ingredients ?? [];
		const ungrouped = allIngs.filter((i) => !i.groupName);
		const groups = new Map<string, typeof allIngs>();
		for (const ing of allIngs) {
			if (ing.groupName) {
				if (!groups.has(ing.groupName)) {
					groups.set(ing.groupName, []);
				}
				groups.get(ing.groupName)?.push(ing);
			}
		}
		return { ungrouped, groups };
	}, [ingredients]);

	const cookPickerGroups = useMemo(() => {
		const groups = new Map<string, NonNullable<typeof ingredients>>();
		for (const ing of ingredients ?? []) {
			if (ing.groupName) {
				if (!groups.has(ing.groupName)) {
					groups.set(ing.groupName, []);
				}
				groups.get(ing.groupName)?.push(ing);
			}
		}
		return groups;
	}, [ingredients]);

	const editConversionHint = getEditConversionHint();

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

	function handleCookClick() {
		if (!recipe || !ingredients) return;
		const groups = new Map<string, typeof ingredients>();
		for (const ing of ingredients) {
			if (ing.groupName) {
				if (!groups.has(ing.groupName)) {
					groups.set(ing.groupName, []);
				}
				groups.get(ing.groupName)?.push(ing);
			}
		}
		if (groups.size > 0) {
			// Pre-select first ingredient in each group
			const defaults: Record<string, string> = {};
			for (const [name, ings] of groups) {
				defaults[name] = ings[0].id;
			}
			setGroupSelections(defaults);
			setShowCookPicker(true);
		} else {
			handleCook();
		}
	}

	async function handleCook(selections?: Record<string, string>) {
		if (!recipe) return;
		const result = await cookRecipe.mutateAsync({
			recipeId: recipe.id,
			servings: currentServings ?? undefined,
			groupSelections: selections,
		});
		setCookResult(result);
		setShowCookPicker(false);
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
		if (addMode === "group") {
			setPendingGroupItems([
				...pendingGroupItems,
				{
					productId: newIngredient.productId,
					quantity: newIngredient.quantity,
					quantityUnitId: newIngredient.quantityUnitId,
					notes: newIngredient.notes,
				},
			]);
			setNewIngredient({
				productId: "",
				quantity: "",
				quantityUnitId: "",
				notes: "",
			});
			return;
		}
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

	async function handleRenameGroup(
		oldName: string,
		newName: string,
		groupIngs: { id: string }[],
	) {
		const trimmed = newName.trim();
		if (trimmed === oldName) {
			setEditingGroupName(null);
			return;
		}
		for (const ing of groupIngs) {
			await updateIngredient.mutateAsync({
				id: ing.id,
				groupName: trimmed || undefined,
			});
		}
		setEditingGroupName(null);
	}

	function toggleGroupCollapse(groupName: string) {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(groupName)) {
				next.delete(groupName);
			} else {
				next.add(groupName);
			}
			return next;
		});
	}

	async function handleSaveGroup() {
		if (pendingGroupItems.length === 0) return;
		const groupName = pendingGroupName.trim() || undefined;
		for (const item of pendingGroupItems) {
			await createIngredient.mutateAsync({
				productId: item.productId || undefined,
				quantity: item.quantity,
				quantityUnitId: item.quantityUnitId || undefined,
				notes: item.notes || undefined,
				groupName,
			});
		}
		setPendingGroupItems([]);
		setPendingGroupName("");
		setAddMode("ingredient");
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
		groupName: string | null;
	}) {
		setEditIngredient({
			productId: ing.productId ?? "",
			quantity: ing.quantity,
			quantityUnitId: ing.quantityUnitId ?? "",
			notes: ing.notes ?? "",
			groupName: ing.groupName ?? "",
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
			groupName: editIngredient.groupName || undefined,
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

	function formatScaled(quantity: string): string {
		const num = Number(quantity);
		if (Number.isNaN(num)) return quantity;
		const scaled = num * scaleFactor;
		return Number.parseFloat(scaled.toFixed(2)).toString();
	}

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
					<>
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
										<Input
											type="text"
											required
											value={form.name}
											onChange={(e) =>
												setForm({ ...form, name: e.target.value })
											}
										/>
									</label>

									<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
										Description
										<Textarea
											value={form.description}
											onChange={(e) =>
												setForm({ ...form, description: e.target.value })
											}
											rows={3}
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
										{sortedPrepSteps.length > 0 ? (
											<div className="flex flex-col gap-2">
												{sortedPrepSteps.map((step) => (
													<PrepStepRow
														key={step.id}
														step={step}
														isEditing={editingPrepStepId === step.id}
														editState={editPrepStep}
														onEditStateChange={setEditPrepStep}
														isSaving={updatePrepStep.isPending}
														onSave={handleSavePrepStep}
														onCancel={() => setEditingPrepStepId(null)}
														onEdit={() => startEditingPrepStep(step)}
														onDelete={() => handleDeletePrepStep(step.id)}
														formatLeadTime={formatLeadTime}
													/>
												))}
											</div>
										) : (
											<p className="text-sm text-(--sea-ink-soft)">
												No prep steps yet.
											</p>
										)}

										<div className="flex flex-col gap-2 rounded-lg border border-dashed border-(--line) p-3">
											<Input
												type="text"
												placeholder="e.g. Defrost chicken"
												value={newPrepStep.description}
												onChange={(e) =>
													setNewPrepStep({
														...newPrepStep,
														description: e.target.value,
													})
												}
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
											<div className="flex items-center gap-2">
												<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
													{recipe.name}
												</h1>
												{recipeAvailability?.[recipe.id] === "sufficient" && (
													<CircleCheck
														size={20}
														className="shrink-0 text-emerald-500"
													/>
												)}
												{recipeAvailability?.[recipe.id] === "deficit" && (
													<CircleX
														size={20}
														className="shrink-0 text-red-500"
													/>
												)}
											</div>
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
													onClick={handleCookClick}
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
												{recipe.servings != null ? (
													<span className="inline-flex items-center gap-1.5">
														<button
															type="button"
															onClick={() =>
																setAdjustedServings(
																	Math.max(
																		1,
																		(currentServings ?? recipe.servings ?? 1) -
																			1,
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
																	(currentServings ?? recipe.servings ?? 1) + 1,
																)
															}
															className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-(--line) text-(--sea-ink-soft) transition hover:bg-(--surface)"
															aria-label="Increase servings"
														>
															<Plus size={12} />
														</button>
														{adjustedServings != null &&
															adjustedServings !== recipe.servings && (
																<button
																	type="button"
																	onClick={() => setAdjustedServings(null)}
																	className="ml-1 text-xs font-medium text-(--lagoon-deep) hover:underline"
																>
																	Reset
																</button>
															)}
													</span>
												) : (
													"—"
												)}
											</dd>
										</div>
										<div>
											<dt className="font-medium text-(--sea-ink-soft)">
												Prep Time
											</dt>
											<dd className="mt-0.5 text-(--sea-ink)">
												{recipe.prepTime != null
													? `${recipe.prepTime} min`
													: "—"}
											</dd>
										</div>
										<div>
											<dt className="font-medium text-(--sea-ink-soft)">
												Cook Time
											</dt>
											<dd className="mt-0.5 text-(--sea-ink)">
												{recipe.cookTime != null
													? `${recipe.cookTime} min`
													: "—"}
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

									{sortedPrepSteps.length > 0 && (
										<div className="mt-4">
											<SectionHeading>Prep Steps</SectionHeading>
											<div className="flex flex-col gap-2">
												{sortedPrepSteps.map((step) => (
													<PrepStepRow
														key={step.id}
														step={step}
														isEditing={false}
														editState={{ description: "", leadTimeMinutes: "" }}
														onEditStateChange={() => {}}
														isSaving={false}
														onSave={() => {}}
														onCancel={() => {}}
														onEdit={() => {}}
														onDelete={() => {}}
														formatLeadTime={formatLeadTime}
														readOnly
													/>
												))}
											</div>
										</div>
									)}

									{recipe.producedProductId && producedProduct && (
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
									)}

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
															{getProductName(d.productId)}: deducted{" "}
															{d.deducted} of {d.needed}
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
										<AlertBox className="mt-6 flex items-center gap-3">
											<p className="flex-1 text-sm">
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
										</AlertBox>
									)}
								</>
							)}
						</Island>
						{recipeCost && (
							<Island
								as="section"
								className="animate-rise-in mt-6 rounded-2xl p-6 sm:p-8"
							>
								<SectionHeading>Cost Estimate</SectionHeading>
								<dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Estimated Cost
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											${recipeCost.total.toFixed(2)}
										</dd>
									</div>
									{currentServings != null && currentServings > 0 && (
										<div>
											<dt className="font-medium text-(--sea-ink-soft)">
												Cost per Serving
											</dt>
											<dd className="mt-0.5 text-(--sea-ink)">
												${(recipeCost.total / currentServings).toFixed(2)}
											</dd>
										</div>
									)}
								</dl>
								{recipeCost.ingredientsPriced < recipeCost.ingredientsTotal && (
									<p className="mt-2 text-xs text-(--sea-ink-soft)">
										Based on {recipeCost.ingredientsPriced} of{" "}
										{recipeCost.ingredientsTotal} ingredients
									</p>
								)}
							</Island>
						)}
					</>
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

							{showCookPicker && (
								<CookPicker
									groups={
										new Map(
											[...cookPickerGroups].map(([groupName, groupIngs]) => [
												groupName,
												groupIngs.map((ing) => ({
													ingredient: ing,
													productName: getProductName(ing.productId),
													scaledQuantity: formatScaled(ing.quantity),
													unitLabel: getUnitLabel(ing.quantityUnitId),
												})),
											]),
										)
									}
									selections={groupSelections}
									onSelectionChange={(groupName, ingredientId) =>
										setGroupSelections({
											...groupSelections,
											[groupName]: ingredientId,
										})
									}
									onCook={() => handleCook(groupSelections)}
									onCancel={() => setShowCookPicker(false)}
									isCooking={cookRecipe.isPending}
								/>
							)}

							{!ingredients?.length && !editing ? (
								<p className="mb-4 text-sm text-(--sea-ink-soft)">
									No ingredients yet.
								</p>
							) : (
								<div className="mb-4 flex flex-col gap-2">
									{ingredientGroups.ungrouped.map((ing) => (
										<IngredientRow
											key={ing.id}
											ingredient={ing}
											productName={getProductName(ing.productId)}
											unitLabel={getUnitLabel(ing.quantityUnitId)}
											scaledQuantity={formatScaled(ing.quantity)}
											status={
												ing.productId
													? ingredientAvailability.get(ing.id)
													: undefined
											}
											isEditing={editingIngredientId === ing.id}
											editState={editIngredient}
											onEditStateChange={setEditIngredient}
											conversionHint={
												editingIngredientId === ing.id
													? editConversionHint
													: undefined
											}
											isSaving={updateIngredient.isPending}
											onSave={handleSaveIngredient}
											onCancel={() => setEditingIngredientId(null)}
											onEditProductChange={handleEditProductChange}
											onCreateProduct={handleCreateProduct}
											onEdit={() => startEditingIngredient(ing)}
											onDelete={() => handleDeleteIngredient(ing.id)}
											productOptions={productOptions}
											unitOptions={unitOptions}
										/>
									))}
									{[...ingredientGroups.groups].map(
										([groupName, groupIngs]) => (
											<IngredientGroup
												key={groupName}
												groupName={groupName}
												ingredientCount={groupIngs.length}
												ingredientRows={groupIngs.map((ing) => ({
													ingredient: ing,
													productName: getProductName(ing.productId),
													unitLabel: getUnitLabel(ing.quantityUnitId),
													scaledQuantity: formatScaled(ing.quantity),
													status: ing.productId
														? ingredientAvailability.get(ing.id)
														: undefined,
													isEditing: editingIngredientId === ing.id,
													editState: editIngredient,
													onEditStateChange: setEditIngredient,
													conversionHint:
														editingIngredientId === ing.id
															? editConversionHint
															: undefined,
													isSaving: updateIngredient.isPending,
													onSave: handleSaveIngredient,
													onCancel: () => setEditingIngredientId(null),
													onEditProductChange: handleEditProductChange,
													onCreateProduct: handleCreateProduct,
													onEdit: () => startEditingIngredient(ing),
													onDelete: () => handleDeleteIngredient(ing.id),
													productOptions,
													unitOptions,
												}))}
												isCollapsed={collapsedGroups.has(groupName)}
												onToggleCollapse={() => toggleGroupCollapse(groupName)}
												isRenaming={editingGroupName === groupName}
												renameValue={editGroupNameValue}
												onRenameValueChange={setEditGroupNameValue}
												onRenameSubmit={() =>
													handleRenameGroup(
														groupName,
														editGroupNameValue,
														groupIngs,
													)
												}
												onRenameCancel={() => setEditingGroupName(null)}
												onStartRename={() => {
													setEditingGroupName(groupName);
													setEditGroupNameValue(groupName);
												}}
												isRenameSaving={updateIngredient.isPending}
												onDelete={async () => {
													for (const ing of groupIngs) {
														await deleteIngredient.mutateAsync(ing.id);
													}
												}}
											/>
										),
									)}
								</div>
							)}

							<AddIngredientForm
								productOptions={productOptions}
								unitOptions={unitOptions}
								onAdd={handleAddIngredient}
								isPending={
									addMode === "ingredient" ? createIngredient.isPending : false
								}
								newIngredient={newIngredient}
								setNewIngredient={setNewIngredient}
								onCreateProduct={handleCreateProduct}
								onProductChange={handleProductChange}
								unitHint={getConversionHint()}
								mode={addMode}
								onModeChange={setAddMode}
								groupName={pendingGroupName}
								onGroupNameChange={setPendingGroupName}
								addButtonLabel={addMode === "group" ? "Add to group" : "Add"}
							/>

							{addMode === "group" && pendingGroupItems.length > 0 && (
								<div className="mt-3 rounded-lg border border-dashed border-(--line) p-3">
									<p className="mb-2 text-xs font-medium uppercase tracking-wide text-(--sea-ink-soft)">
										Pending group items
									</p>
									<div className="flex flex-col gap-1">
										{pendingGroupItems.map((item, i) => (
											<div
												key={`${item.productId}-${item.quantity}-${i}`}
												className="flex items-center justify-between rounded-lg bg-(--surface) px-3 py-1.5 text-sm"
											>
												<span className="text-(--sea-ink)">
													<span className="font-medium">
														{getProductName(item.productId)}
													</span>
													<span className="ml-2 text-(--sea-ink-soft)">
														{item.quantity}
														{getUnitLabel(item.quantityUnitId)
															? ` ${getUnitLabel(item.quantityUnitId)}`
															: ""}
													</span>
													{item.notes && (
														<span className="ml-2 text-xs text-(--sea-ink-soft)">
															({item.notes})
														</span>
													)}
												</span>
												<button
													type="button"
													onClick={() =>
														setPendingGroupItems(
															pendingGroupItems.filter((_, j) => j !== i),
														)
													}
													className="rounded-lg p-1 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
												>
													<X size={14} />
												</button>
											</div>
										))}
									</div>
									<button
										type="button"
										onClick={handleSaveGroup}
										disabled={createIngredient.isPending}
										className="mt-2 flex h-8 items-center gap-1.5 rounded-full bg-(--lagoon) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
									>
										<Check size={14} />
										{createIngredient.isPending ? "Saving…" : "Save group"}
									</button>
								</div>
							)}
						</Island>
					</div>
				}
			/>
		</Page>
	);
}
