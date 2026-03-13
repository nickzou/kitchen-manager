import { createFileRoute } from "@tanstack/react-router";
import { getAuthSession } from "#src/lib/auth-session";
import { processWebhookRetries } from "#src/lib/webhooks";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/webhooks/retry")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const stats = await processWebhookRetries();
				return json(stats);
			},
		},
	},
});
