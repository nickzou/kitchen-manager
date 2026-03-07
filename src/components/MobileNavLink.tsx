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
					"rounded-lg px-3 py-2 text-(--lagoon-deep) font-bold no-underline",
			}}
			onClick={onClick}
			{...props}
		/>
	);
}
