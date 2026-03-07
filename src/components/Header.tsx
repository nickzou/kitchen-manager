import { Link } from "@tanstack/react-router";
import BetterAuthHeader from "../integrations/better-auth/header-user.tsx";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
			<nav className="page-wrap flex items-center gap-x-4 py-3 sm:py-4">
				<Link
					to="/"
					className="text-base font-bold tracking-tight text-[var(--sea-ink)] no-underline"
				>
					Kitchen Manager
				</Link>

				<div className="flex items-center gap-x-4 text-sm font-semibold">
					<Link
						to="/"
						className="nav-link"
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
						to="/categories"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Categories
					</Link>
				</div>

				<div className="ml-auto flex items-center gap-1.5 sm:gap-2">
					<ThemeToggle />
					<BetterAuthHeader />
				</div>
			</nav>
		</header>
	);
}
