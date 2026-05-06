import { Link as RouterLink } from "@tanstack/react-router";
import {
	Box,
	Calendar,
	ChefHat,
	ChevronLeft,
	ChevronRight,
	LayoutDashboard,
	Package,
} from "lucide-react";
import { useEffect, useState } from "react";
import BetterAuthHeader from "../integrations/better-auth/header-user.tsx";
import { cn } from "../lib/utils";
import { type NavItem, SidebarNavLink } from "./sidebar/SidebarNavLink";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS: NavItem[] = [
	{ to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
	{ to: "/stock", label: "Stock", icon: Package },
	{ to: "/products", label: "Products", icon: Box },
	{ to: "/recipes", label: "Recipes", icon: ChefHat },
	{ to: "/meal-plan", label: "Meal Plan", icon: Calendar },
];

const STORAGE_KEY = "sidebar-collapsed";

function getInitialCollapsed(): boolean {
	if (typeof window === "undefined") return false;
	return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function Sidebar() {
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		setCollapsed(getInitialCollapsed());
	}, []);

	function toggle() {
		const next = !collapsed;
		setCollapsed(next);
		window.localStorage.setItem(STORAGE_KEY, String(next));
	}

	return (
		<aside
			className={cn(
				"hidden sm:flex sticky top-0 z-50 h-screen shrink-0 flex-col border-r border-(--line) bg-(--header-bg) backdrop-blur-lg transition-[width] duration-150",
				collapsed ? "w-14" : "w-56",
			)}
		>
			<RouterLink
				to="/"
				className={cn(
					"flex h-14 items-center border-b border-(--line) text-(--sea-ink) no-underline",
					collapsed ? "justify-center px-0" : "px-4",
				)}
			>
				<span className="font-bold tracking-tight">
					{collapsed ? "KM" : "Kitchen Manager"}
				</span>
			</RouterLink>

			<nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
				{NAV_ITEMS.map((item) => (
					<SidebarNavLink key={item.to} item={item} collapsed={collapsed} />
				))}
			</nav>

			<div
				className={cn(
					"flex flex-col gap-2 border-t border-(--line) p-2",
					collapsed && "items-center",
				)}
			>
				<ThemeToggle />
				<BetterAuthHeader />
			</div>

			<button
				type="button"
				onClick={toggle}
				aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-(--line) bg-(--surface) text-(--sea-ink-soft) shadow-sm transition hover:text-(--sea-ink)"
			>
				{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
			</button>
		</aside>
	);
}
