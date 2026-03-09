import { createFileRoute } from "@tanstack/react-router";
import { Island } from "#/components/Island";
import { Page } from "#/components/Page";

export const Route = createFileRoute("/about")({
	component: About,
});

function About() {
	return (
		<Page as="main" className="py-12">
			<Island as="section" className="rounded-2xl p-6 sm:p-8">
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					About
				</p>
				<h1 className="font-display mb-3 text-4xl font-bold text-(--sea-ink) sm:text-5xl">
					A small starter with room to grow.
				</h1>
				<p className="m-0 max-w-3xl text-base leading-8 text-(--sea-ink-soft)">
					TanStack Start gives you type-safe routing, server functions, and
					modern SSR defaults. Use this as a clean foundation, then layer in
					your own routes, styling, and add-ons.
				</p>
			</Island>
		</Page>
	);
}
