import { Link } from "./Link";

export default function CookingSubNav() {
	return (
		<nav className="mb-6 flex gap-4 text-sm font-semibold">
			<Link to="/recipes">Recipes</Link>
			<Link to="/recipe-categories">Categories</Link>
		</nav>
	);
}
