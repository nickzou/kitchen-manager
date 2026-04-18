import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ExpiringStockList } from "#src/components/dashboard/ExpiringStockList";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { useToast } from "#src/components/Toast";
import { authClient } from "#src/lib/auth-client";
import { useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import {
	useConsumeStock,
	useSpoilStock,
	useStockEntries,
} from "#src/lib/hooks/use-stock-entries";
import { useReverseStockLog } from "#src/lib/hooks/use-stock-logs";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: stockEntries } = useStockEntries();
	const { data: products } = useProducts();
	const { data: quantityUnits } = useQuantityUnits();

	const consumeStock = useConsumeStock();
	const spoilStock = useSpoilStock();
	const reverseStockLog = useReverseStockLog();
	const toast = useToast();

	const [consumeAmounts, setConsumeAmounts] = useState<Record<string, string>>(
		{},
	);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	const firstName = session.user.name?.split(" ")[0] ?? "there";

	const productMap = new Map((products ?? []).map((p) => [p.id, p]));
	const unitMap = new Map((quantityUnits ?? []).map((u) => [u.id, u]));

	function getProductName(productId: string) {
		return productMap.get(productId)?.name ?? "Unknown";
	}

	function getUnitAbbr(productId: string) {
		const product = productMap.get(productId);
		if (!product?.defaultQuantityUnitId) return "";
		const unit = unitMap.get(product.defaultQuantityUnitId);
		return unit?.abbreviation ?? unit?.name ?? "";
	}

	async function handleConsume(stockEntryId: string) {
		const amount = consumeAmounts[stockEntryId] ?? "1";
		if (!amount) return;
		const entry = (stockEntries ?? []).find((e) => e.id === stockEntryId);
		const name = entry ? getProductName(entry.productId) : "Stock";
		const unit = entry ? getUnitAbbr(entry.productId) : "";
		try {
			const result = await consumeStock.mutateAsync({
				stockEntryId,
				quantity: amount,
			});
			toast.success(`${amount}${unit ? ` ${unit}` : ""} ${name} consumed`, {
				label: "Undo",
				onClick: () =>
					reverseStockLog.mutate({
						stockLogId: result.stockLogId,
						stockEntryId,
					}),
			});
		} catch {
			toast.error(`Failed to consume ${name}`);
		}
	}

	async function handleConsumeAll(stockEntryId: string) {
		const entry = (stockEntries ?? []).find((e) => e.id === stockEntryId);
		if (!entry || Number.parseFloat(entry.quantity) <= 0) return;
		const name = getProductName(entry.productId);
		const unit = getUnitAbbr(entry.productId);
		try {
			const result = await consumeStock.mutateAsync({
				stockEntryId,
				quantity: entry.quantity,
			});
			toast.success(
				`${entry.quantity}${unit ? ` ${unit}` : ""} ${name} consumed`,
				{
					label: "Undo",
					onClick: () =>
						reverseStockLog.mutate({
							stockLogId: result.stockLogId,
							stockEntryId,
						}),
				},
			);
		} catch {
			toast.error(`Failed to consume ${name}`);
		}
	}

	async function handleSpoil(stockEntryId: string) {
		const amount = consumeAmounts[stockEntryId] ?? "1";
		if (!amount) return;
		const entry = (stockEntries ?? []).find((e) => e.id === stockEntryId);
		const name = entry ? getProductName(entry.productId) : "Stock";
		try {
			const result = await spoilStock.mutateAsync({
				stockEntryId,
				quantity: amount,
			});
			toast.success(`${name} marked as spoiled`, {
				label: "Undo",
				onClick: () =>
					reverseStockLog.mutate({
						stockLogId: result.stockLogId,
						stockEntryId,
					}),
			});
		} catch {
			toast.error(`Failed to mark ${name} as spoiled`);
		}
	}

	async function handleSpoilAll(stockEntryId: string) {
		const entry = (stockEntries ?? []).find((e) => e.id === stockEntryId);
		if (!entry || Number.parseFloat(entry.quantity) <= 0) return;
		const name = getProductName(entry.productId);
		try {
			const result = await spoilStock.mutateAsync({
				stockEntryId,
				quantity: entry.quantity,
			});
			toast.success(`All ${name} marked as spoiled`, {
				label: "Undo",
				onClick: () =>
					reverseStockLog.mutate({
						stockLogId: result.stockLogId,
						stockEntryId,
					}),
			});
		} catch {
			toast.error(`Failed to mark ${name} as spoiled`);
		}
	}

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
						consumeAmounts={consumeAmounts}
						onConsumeAmountChange={(entryId, value) =>
							setConsumeAmounts((prev) => ({
								...prev,
								[entryId]: value,
							}))
						}
						onConsume={handleConsume}
						onConsumeAll={handleConsumeAll}
						onSpoil={handleSpoil}
						onSpoilAll={handleSpoilAll}
						consumePending={consumeStock.isPending}
						spoilPending={spoilStock.isPending}
					/>
				</div>
			</Island>
		</Page>
	);
}
