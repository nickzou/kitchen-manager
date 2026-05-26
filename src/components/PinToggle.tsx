import { Star } from "lucide-react";
import { useToast } from "#src/components/Toast";
import { useUpdateProduct } from "#src/lib/hooks/use-products";
import { cn } from "#src/lib/utils";

interface PinToggleProps {
	productId: string;
	productName: string;
	pinned: boolean;
	size?: number;
	className?: string;
}

export function PinToggle({
	productId,
	productName,
	pinned,
	size = 14,
	className,
}: PinToggleProps) {
	const updateProduct = useUpdateProduct(productId);
	const toast = useToast();

	async function handleToggle(e: React.MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		try {
			await updateProduct.mutateAsync({ pinned: !pinned });
			toast.success(
				pinned ? `${productName} unpinned` : `${productName} pinned to home`,
			);
		} catch {
			toast.error("Failed to update pin");
		}
	}

	return (
		<button
			type="button"
			onClick={handleToggle}
			disabled={updateProduct.isPending}
			aria-pressed={pinned}
			title={pinned ? "Unpin from home" : "Pin to home"}
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-md transition disabled:opacity-50",
				pinned
					? "text-amber-500 hover:text-amber-600"
					: "text-(--sea-ink-soft) hover:text-amber-500",
				className,
			)}
		>
			<Star
				size={size}
				className={cn(pinned && "fill-current")}
				strokeWidth={pinned ? 1.5 : 2}
			/>
		</button>
	);
}
