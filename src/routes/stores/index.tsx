import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
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
import { useCreateStore, useStores } from "#src/lib/hooks/use-stores";

export const Route = createFileRoute("/stores/")({
	component: StoresPage,
});

function StoresPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: stores, isLoading } = useStores();
	const createStore = useCreateStore();

	const [view, setView] = useState<ViewMode>("grid");
	const [name, setName] = useState("");
	const [search, setSearch] = useState("");

	const filteredStores = useMemo(() => {
		if (!stores || !search.trim()) return stores;
		const term = search.toLowerCase();
		return stores.filter((s) => s.name.toLowerCase().includes(term));
	}, [stores, search]);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		await createStore.mutateAsync({
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
					Stores
				</h1>

				<InventorySubNav />

				<form
					onSubmit={handleSubmit}
					className="mb-6 flex flex-wrap gap-3 border-b border-(--line) pb-6"
				>
					<Input
						type="text"
						placeholder="Store name *"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="flex-1 min-w-[160px]"
					/>
					<button
						type="submit"
						disabled={createStore.isPending}
						className="flex h-10 items-center gap-1.5 rounded-full bg-(--lagoon) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
					>
						<Plus size={16} />
						Add
					</button>
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
				) : !stores?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No stores yet. Add one above!
					</p>
				) : !filteredStores?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No stores match your search.
					</p>
				) : view === "grid" ? (
					<GridView
						items={filteredStores}
						getKey={(s) => s.id}
						getLink={(s) => ({
							to: "/stores/$id",
							params: { id: s.id },
						})}
						renderCard={(s) => (
							<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
								{s.name}
							</h3>
						)}
					/>
				) : view === "table" ? (
					<TableView
						columns={[{ label: "Name" }, { label: "Created" }]}
						items={filteredStores}
						getKey={(s) => s.id}
						renderRow={(s) => (
							<>
								<td className="py-2.5 pr-4">
									<Link
										to="/stores/$id"
										params={{ id: s.id }}
										className="font-medium text-(--lagoon-deep) no-underline hover:underline"
									>
										{s.name}
									</Link>
								</td>
								<td className="py-2.5 text-(--sea-ink-soft)">
									{formatDate(s.createdAt)}
								</td>
							</>
						)}
					/>
				) : (
					<CompactView
						items={filteredStores}
						getKey={(s) => s.id}
						getLink={(s) => ({
							to: "/stores/$id",
							params: { id: s.id },
						})}
						getName={(s) => s.name}
						getSecondary={() => ""}
					/>
				)}
			</Island>
		</Page>
	);
}
