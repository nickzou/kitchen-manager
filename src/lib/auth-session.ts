import { auth } from "#/lib/auth";

export async function getAuthSession(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	return session;
}
