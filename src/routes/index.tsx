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

				<PalettePreview />
			</Island>
		</Page>
	);
}

const CREAM_SCALE: [string, string][] = [
	["50", "#fbf6ee"],
	["100", "#f3ece1"],
	["200", "#e6d7b8"],
	["300", "#dabe89"],
	["400", "#cea057"],
	["500", "#b8853f"],
	["600", "#9b6b33"],
	["700", "#7b522c"],
	["800", "#5f3f25"],
	["900", "#41281b"],
	["950", "#231510"],
];

const RUST_SCALE: [string, string][] = [
	["50", "#fdf4ee"],
	["100", "#fbe0cc"],
	["200", "#f7bf98"],
	["300", "#f19459"],
	["400", "#e86b2c"],
	["500", "#d04d13"],
	["600", "#ac3c0d"],
	["700", "#892f0a"],
	["800", "#771f00"],
	["900", "#541500"],
	["950", "#300c00"],
];

function PalettePreview() {
	return (
		<div className="mt-8 border-t border-(--line) pt-6">
			<h2 className="mb-3 text-base font-semibold text-(--sea-ink)">
				Palette preview (temporary)
			</h2>
			<Swatches name="cream" scale={CREAM_SCALE} />
			<div className="h-3" />
			<Swatches name="rust" scale={RUST_SCALE} />
		</div>
	);
}

function Swatches({
	name,
	scale,
}: {
	name: string;
	scale: [string, string][];
}) {
	return (
		<div>
			<p className="mb-1 text-xs font-medium text-(--sea-ink-soft)">{name}</p>
			<div className="flex flex-wrap gap-1">
				{scale.map(([step, hex]) => (
					<div key={step} className="flex flex-col items-center">
						<div
							className="h-10 w-10 rounded-md border border-(--line)"
							style={{ backgroundColor: hex }}
						/>
						<span className="mt-1 text-[0.65rem] text-(--sea-ink-soft)">
							{step}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
