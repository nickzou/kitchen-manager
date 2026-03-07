import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		environment: "node",
		environmentMatchGlobs: [
			["src/routes/products/**/*.test.tsx", "jsdom"],
			["src/lib/hooks/**/*.test.ts", "jsdom"],
		],
	},
});
