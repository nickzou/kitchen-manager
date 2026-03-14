import { Link } from "./Link";

export default function InventorySubNav() {
	return (
		<nav className="mb-6 flex gap-4 text-sm font-semibold">
			<Link to="/products">Products</Link>
			<Link to="/product-categories">Categories</Link>
			<Link to="/quantity-units">Units</Link>
			<Link to="/stores">Stores</Link>
		</nav>
	);
}
