import { cn } from "#/lib/utils";

type PageProps<T extends React.ElementType = "div"> = {
	as?: T;
	className?: string;
	children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Page<T extends React.ElementType = "div">({
	as,
	className,
	...props
}: PageProps<T>) {
	const Comp = as || "div";
	return (
		<Comp
			className={cn("mx-auto w-[min(1080px,calc(100%-2rem))]", className)}
			{...props}
		/>
	);
}
