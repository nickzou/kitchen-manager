import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { AlertBox } from "#src/components/AlertBox";
import { Button } from "#src/components/Button";
import { Input } from "#src/components/Input";
import InventorySubNav from "#src/components/InventorySubNav";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { Textarea } from "#src/components/Textarea";
import { authClient } from "#src/lib/auth-client";
import {
	useDeleteProductCategory,
	useProductCategory,
	useUpdateProductCategory,
} from "#src/lib/hooks/use-categories";

export const Route = createFileRoute("/product-categories/$id")({
	component: ProductCategoryDetail,
});

function ProductCategoryDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: sessionLoading } = authClient.useSession();

	const { data: category, isLoading, error } = useProductCategory(id);
	const updateCategory = useUpdateProductCategory(id);
	const deleteCategory = useDeleteProductCategory();

	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [form, setForm] = useState({
		name: "",
		description: "",
	});

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

	if (error || !category) {
		return (
			<Page as="main" className="pb-8 pt-14">
				<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
					<h1 className="font-display mb-4 text-3xl font-bold text-(--sea-ink)">
						Category not found
					</h1>
					<Link
						to="/product-categories"
						className="text-sm font-medium text-(--lagoon-deep)"
					>
						&larr; Back to categories
					</Link>
				</Island>
			</Page>
		);
	}

	function startEditing() {
		if (!category) return;
		setForm({
			name: category.name,
			description: category.description || "",
		});
		setEditing(true);
	}

	async function handleSave(e: FormEvent) {
		e.preventDefault();
		await updateCategory.mutateAsync({
			name: form.name,
			description: form.description || undefined,
		});
		setEditing(false);
	}

	async function handleDelete() {
		await deleteCategory.mutateAsync(id);
		navigate({ to: "/product-categories" });
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString();
	}

	return (
		<Page as="main" className="pb-8 pt-14">
			<Link
				to="/product-categories"
				className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-(--lagoon-deep) no-underline hover:underline"
			>
				<ArrowLeft size={14} />
				Back to categories
			</Link>

			<InventorySubNav />

			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				{editing ? (
					<form onSubmit={handleSave} className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
								Edit category
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
								onChange={(e) => setForm({ ...form, name: e.target.value })}
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

						<Button
							type="submit"
							disabled={updateCategory.isPending}
							className="mt-2"
						>
							{updateCategory.isPending ? "Saving…" : "Save changes"}
						</Button>
					</form>
				) : (
					<>
						<div className="mb-6 flex items-start justify-between gap-4">
							<div>
								<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
									{category.name}
								</h1>
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

						{category.description && (
							<p className="mb-4 text-sm text-(--sea-ink-soft)">
								{category.description}
							</p>
						)}

						<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Created</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(category.createdAt)}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Updated</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(category.updatedAt)}
								</dd>
							</div>
						</dl>

						{confirmDelete && (
							<AlertBox className="mt-6 flex items-center gap-3">
								<p className="flex-1 text-sm">
									Delete this category? This cannot be undone.
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
									disabled={deleteCategory.isPending}
									className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
								>
									{deleteCategory.isPending ? "Deleting…" : "Delete"}
								</button>
							</AlertBox>
						)}
					</>
				)}
			</Island>
		</Page>
	);
}
