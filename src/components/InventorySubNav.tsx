import { Link } from "./Link";

export default function InventorySubNav() {
	return (
		<nav className="mb-6 flex gap-4 text-sm font-semibold">
			<Link to="/products">Products</Link>
			<Link to="/categories">Categories</Link>
		</nav>
	);
}
