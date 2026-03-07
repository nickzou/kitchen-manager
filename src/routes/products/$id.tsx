import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { authClient } from "#/lib/auth-client";
import {
	useDeleteProduct,
	useProduct,
	useUpdateProduct,
} from "#/lib/hooks/use-products";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/products/$id")({
	component: ProductDetail,
});

function ProductDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: sessionLoading } = authClient.useSession();

	const { data: product, isLoading, error } = useProduct(id);
	const updateProduct = useUpdateProduct(id);
	const deleteProduct = useDeleteProduct();

	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [form, setForm] = useState({
		name: "",
		category: "",
		description: "",
		expirationDate: "",
	});

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	if (isLoading) {
		return (
			<main className="page-wrap px-4 pb-8 pt-14">
				<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
			</main>
		);
	}

	if (error || !product) {
		return (
			<main className="page-wrap px-4 pb-8 pt-14">
				<section className="island-shell rise-in rounded-2xl p-6 sm:p-8">
					<h1 className="display-title mb-4 text-3xl font-bold text-(--sea-ink)">
						Product not found
					</h1>
					<Link
						to="/products"
						className="text-sm font-medium text-(--lagoon-deep)"
					>
						&larr; Back to products
					</Link>
				</section>
			</main>
		);
	}

	function startEditing() {
		if (!product) return;
		setForm({
			name: product.name,
			category: product.category || "",
			description: product.description || "",
			expirationDate: product.expirationDate
				? product.expirationDate.slice(0, 10)
				: "",
		});
		setEditing(true);
	}

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		await updateProduct.mutateAsync({
			name: form.name,
			category: form.category || undefined,
			description: form.description || undefined,
			expirationDate: form.expirationDate || undefined,
		});
		setEditing(false);
	}

	async function handleDelete() {
		await deleteProduct.mutateAsync(id);
		navigate({ to: "/products" });
	}

	const inputClass =
		"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	function formatDate(dateStr: string | null) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString();
	}

	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<Link
				to="/products"
				className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-(--lagoon-deep) no-underline hover:underline"
			>
				<ArrowLeft size={14} />
				Back to products
			</Link>

			<section className="island-shell rise-in rounded-2xl p-6 sm:p-8">
				{editing ? (
					<form onSubmit={handleSave} className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<h1 className="display-title text-2xl font-bold text-(--sea-ink)">
								Edit product
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
							Category
							<input
								type="text"
								value={form.category}
								onChange={(e) => setForm({ ...form, category: e.target.value })}
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

						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Expiration date
							<input
								type="date"
								value={form.expirationDate}
								onChange={(e) =>
									setForm({ ...form, expirationDate: e.target.value })
								}
								className={inputClass}
							/>
						</label>

						<button
							type="submit"
							disabled={updateProduct.isPending}
							className="mt-2 h-10 rounded-full bg-(--lagoon-deep) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
						>
							{updateProduct.isPending ? "Saving…" : "Save changes"}
						</button>
					</form>
				) : (
					<>
						<div className="mb-6 flex items-start justify-between gap-4">
							<div>
								<h1 className="display-title text-2xl font-bold text-(--sea-ink)">
									{product.name}
								</h1>
								{product.category && (
									<span className="mt-2 inline-block rounded-full bg-[rgba(79,184,178,0.14)] px-2.5 py-0.5 text-xs font-medium text-(--lagoon-deep)">
										{product.category}
									</span>
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

						{product.description && (
							<p className="mb-4 text-sm text-(--sea-ink-soft)">
								{product.description}
							</p>
						)}

						<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">
									Expiration
								</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(product.expirationDate)}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Created</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(product.createdAt)}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Updated</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(product.updatedAt)}
								</dd>
							</div>
						</dl>

						{confirmDelete && (
							<div className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
								<p className="flex-1 text-sm text-red-700 dark:text-red-300">
									Delete this product? This cannot be undone.
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
									disabled={deleteProduct.isPending}
									className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
								>
									{deleteProduct.isPending ? "Deleting…" : "Delete"}
								</button>
							</div>
						)}
					</>
				)}
			</section>
		</main>
	);
}
