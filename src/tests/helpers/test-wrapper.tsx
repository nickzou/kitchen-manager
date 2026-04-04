import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ToastProvider } from "#src/components/Toast";

export function createTestWrapper(existingClient?: QueryClient) {
	const queryClient =
		existingClient ??
		new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});

	return function TestWrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				<ToastProvider>{children}</ToastProvider>
			</QueryClientProvider>
		);
	};
}
