import { Link } from "@tanstack/react-router";

export default function InventorySubNav() {
	return (
		<nav className="mb-6 flex gap-4 text-sm font-semibold">
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
		</nav>
	);
}
