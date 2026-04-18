import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExpiringStockList } from "#src/components/dashboard/ExpiringStockList";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { authClient } from "#src/lib/auth-client";
import { useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import { useStockEntries } from "#src/lib/hooks/use-stock-entries";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: stockEntries } = useStockEntries();
	const { data: products } = useProducts();
	const { data: quantityUnits } = useQuantityUnits();

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	const firstName = session.user.name?.split(" ")[0] ?? "there";

	return (
		<Page as="main" className="sm:pb-8 sm:pt-14">
			<Island
				as="section"
				className="animate-rise-in sm:rounded-2xl p-6 sm:p-8"
			>
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Dashboard
				</p>
				<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
					Hey, {firstName}!
				</h1>

				<div>
					<h2 className="mb-3 text-base font-semibold text-(--sea-ink)">
						Expiring Soon
					</h2>
					<ExpiringStockList
						entries={stockEntries ?? []}
						products={products ?? []}
						quantityUnits={quantityUnits ?? []}
					/>
				</div>
			</Island>
		</Page>
	);
}
