import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export type NavItem = {
	to: string;
	label: string;
	icon: LucideIcon;
	exact?: boolean;
};

export function SidebarNavLink({
	item,
	collapsed,
}: {
	item: NavItem;
	collapsed: boolean;
}) {
	const Icon = item.icon;
	return (
		<Link
			to={item.to}
			activeOptions={item.exact ? { exact: true } : undefined}
			title={collapsed ? item.label : undefined}
			className={cn(
				"flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-(--sea-ink-soft) dark:text-cream-100 no-underline transition hover:bg-cream-950 hover:text-cream-100",
				collapsed && "justify-center px-0",
			)}
			activeProps={{
				className: cn(
					"flex items-center gap-3 rounded-lg border border-cream-800 px-3 py-2 text-sm font-semibold bg-cream-900 text-cream-100 no-underline",
					collapsed && "justify-center px-0",
				),
			}}
		>
			<Icon size={18} className="shrink-0" />
			{!collapsed && <span>{item.label}</span>}
		</Link>
	);
}
