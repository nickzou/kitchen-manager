import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import BetterAuthHeader from "../integrations/better-auth/header-user.tsx";
import MobileNavLink from "./MobileNavLink";
import { Page } from "./Page";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<header className="sticky top-0 z-50 border-b border-(--line) bg-(--header-bg) px-4 backdrop-blur-lg">
			<Page
				as="nav"
				className="flex flex-wrap items-center gap-x-4 py-3 sm:py-4"
			>
				<Link
					to="/"
					className="text-base font-bold tracking-tight text-(--sea-ink) no-underline"
				>
					Kitchen Manager
				</Link>

				<div className="hidden items-center gap-x-4 text-sm font-semibold sm:flex">
					<Link
						to="/"
						className="nav-link"
						activeOptions={{ exact: true }}
						activeProps={{ className: "nav-link is-active" }}
					>
						Home
					</Link>
					<Link
						to="/products"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Products
					</Link>
					<Link
						to="/stock"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Stock
					</Link>
				</div>

				<div className="ml-auto hidden items-center gap-2 sm:flex">
					<ThemeToggle />
					<BetterAuthHeader />
				</div>

				<button
					type="button"
					onClick={() => setMenuOpen(!menuOpen)}
					className="ml-auto rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-(--surface) sm:hidden"
					aria-label="Toggle menu"
				>
					{menuOpen ? <X size={20} /> : <Menu size={20} />}
				</button>

				{menuOpen && (
					<div className="flex w-full flex-col gap-1 pt-2 text-sm font-semibold sm:hidden">
						<MobileNavLink
							to="/"
							activeOptions={{ exact: true }}
							onClick={() => setMenuOpen(false)}
						>
							Home
						</MobileNavLink>
						<MobileNavLink to="/products" onClick={() => setMenuOpen(false)}>
							Products
						</MobileNavLink>
						<MobileNavLink to="/stock" onClick={() => setMenuOpen(false)}>
							Stock
						</MobileNavLink>
						<div className="flex items-center gap-2 border-t border-(--line) px-3 pt-3">
							<ThemeToggle />
							<BetterAuthHeader />
						</div>
					</div>
				)}
			</Page>
		</header>
	);
}
