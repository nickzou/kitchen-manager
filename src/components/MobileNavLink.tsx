import type { LinkProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export default function MobileNavLink({
	onClick,
	...props
}: LinkProps & { onClick?: () => void }) {
	return (
		<Link
			className="rounded-lg px-3 py-2 text-(--sea-ink-soft) no-underline transition hover:bg-(--surface)"
			activeProps={{
				className:
					"rounded-lg bg-(--surface) px-3 py-2 font-bold text-white no-underline dark:text-white",
			}}
			onClick={onClick}
			{...props}
		/>
	);
}
