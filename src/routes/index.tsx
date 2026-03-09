import { createFileRoute } from "@tanstack/react-router";
import logoSvg from "#/assets/logo.svg";
import { Island } from "#/components/Island";
import { Page } from "#/components/Page";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<Page as="main" className="px-4 pb-8 pt-14">
			<Island
				as="section"
				className="animate-rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14"
			>
				<div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
				<div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
				<img
					src={logoSvg}
					alt="Kitchen Manager logo"
					className="mb-6 h-20 w-20"
				/>
				<p className="mb-3 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					TanStack Start Base Template
				</p>
				<h1 className="font-display mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-(--sea-ink) sm:text-6xl">
					Start simple, ship quickly.
				</h1>
				<p className="mb-8 max-w-2xl text-base text-(--sea-ink-soft) sm:text-lg">
					This base starter intentionally keeps things light: two routes, clean
					structure, and the essentials you need to build from scratch.
				</p>
				<div className="flex flex-wrap gap-3">
					<a
						href="/about"
						className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-(--lagoon-deep) no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
					>
						About This Starter
					</a>
					<a
						href="https://tanstack.com/router"
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-(--sea-ink) no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
					>
						Router Guide
					</a>
				</div>
			</Island>

			<section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[
					[
						"Type-Safe Routing",
						"Routes and links stay in sync across every page.",
					],
					[
						"Server Functions",
						"Call server code from your UI without creating API boilerplate.",
					],
					[
						"Streaming by Default",
						"Ship progressively rendered responses for faster experiences.",
					],
					[
						"Tailwind Native",
						"Design quickly with utility-first styling and reusable tokens.",
					],
				].map(([title, desc], index) => (
					<Island
						as="article"
						key={title}
						className="animate-rise-in rounded-2xl p-5 bg-[linear-gradient(165deg,color-mix(in_oklab,var(--surface-strong)_93%,white_7%),var(--surface))] shadow-[inset_0_1px_0_var(--inset-glint),0_18px_34px_rgba(30,90,72,0.1),0_4px_14px_rgba(23,58,64,0.06)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--lagoon-deep)_35%,var(--line))]"
						style={{ animationDelay: `${index * 90 + 80}ms` }}
					>
						<h2 className="mb-2 text-base font-semibold text-(--sea-ink)">
							{title}
						</h2>
						<p className="m-0 text-sm text-(--sea-ink-soft)">{desc}</p>
					</Island>
				))}
			</section>

			<Island as="section" className="mt-8 rounded-2xl p-6">
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Quick Start
				</p>
				<ul className="m-0 list-disc space-y-2 pl-5 text-sm text-(--sea-ink-soft)">
					<li>
						Edit <code>src/routes/index.tsx</code> to customize the home page.
					</li>
					<li>
						Update <code>src/components/Header.tsx</code> and{" "}
						<code>src/components/Footer.tsx</code> for brand links.
					</li>
					<li>
						Add routes in <code>src/routes</code> and tweak visual tokens in{" "}
						<code>src/styles.css</code>.
					</li>
				</ul>
			</Island>
		</Page>
	);
}
