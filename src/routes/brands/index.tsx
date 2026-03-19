import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Button } from "#src/components/Button";
import { CompactView } from "#src/components/CompactView";
import { GridView } from "#src/components/GridView";
import { Input } from "#src/components/Input";
import InventorySubNav from "#src/components/InventorySubNav";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { SearchInput } from "#src/components/SearchInput";
import { TableView } from "#src/components/TableView";
import { type ViewMode, ViewSwitcher } from "#src/components/ViewSwitcher";
import { authClient } from "#src/lib/auth-client";
import { formatDate } from "#src/lib/format-date";
import { useBrands, useCreateBrand } from "#src/lib/hooks/use-brands";

export const Route = createFileRoute("/brands/")({
	component: BrandsPage,
});

function BrandsPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: brands, isLoading } = useBrands();
	const createBrand = useCreateBrand();

	const [view, setView] = useState<ViewMode>("grid");
	const [name, setName] = useState("");
	const [search, setSearch] = useState("");

	const filteredBrands = useMemo(() => {
		if (!brands || !search.trim()) return brands;
		const term = search.toLowerCase();
		return brands.filter((b) => b.name.toLowerCase().includes(term));
	}, [brands, search]);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		await createBrand.mutateAsync({
			name: name.trim(),
		});
		setName("");
	}

	return (
		<Page as="main" className="pb-8 pt-14">
			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Organization
				</p>
				<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
					Brands
				</h1>

				<InventorySubNav />

				<form
					onSubmit={handleSubmit}
					className="mb-6 flex flex-wrap gap-3 border-b border-(--line) pb-6"
				>
					<Input
						type="text"
						placeholder="Brand name *"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="flex-1 min-w-[160px]"
					/>
					<Button
						type="submit"
						disabled={createBrand.isPending}
						className="flex items-center gap-1.5"
					>
						<Plus size={16} />
						Add
					</Button>
				</form>

				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
					<SearchInput
						placeholder="Search..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<ViewSwitcher view={view} onViewChange={setView} />
				</div>

				{isLoading ? (
					<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
				) : !brands?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No brands yet. Add one above!
					</p>
				) : !filteredBrands?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No brands match your search.
					</p>
				) : view === "grid" ? (
					<GridView
						items={filteredBrands}
						getKey={(b) => b.id}
						getLink={(b) => ({
							to: "/brands/$id",
							params: { id: b.id },
						})}
						renderCard={(b) => (
							<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
								{b.name}
							</h3>
						)}
					/>
				) : view === "table" ? (
					<TableView
						columns={[{ label: "Name" }, { label: "Created" }]}
						items={filteredBrands}
						getKey={(b) => b.id}
						renderRow={(b) => (
							<>
								<td className="py-2.5 pr-4">
									<Link
										to="/brands/$id"
										params={{ id: b.id }}
										className="font-medium text-(--lagoon-deep) no-underline hover:underline"
									>
										{b.name}
									</Link>
								</td>
								<td className="py-2.5 text-(--sea-ink-soft)">
									{formatDate(b.createdAt)}
								</td>
							</>
						)}
					/>
				) : (
					<CompactView
						items={filteredBrands}
						getKey={(b) => b.id}
						getLink={(b) => ({
							to: "/brands/$id",
							params: { id: b.id },
						})}
						getName={(b) => b.name}
						getSecondary={() => ""}
					/>
				)}
			</Island>
		</Page>
	);
}
