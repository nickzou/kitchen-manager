const BASE_URL = "http://localhost:3000";

export function makeGetRequest(url = "/api/products") {
	return new Request(`${BASE_URL}${url}`, { method: "GET" });
}

export function makePostRequest(url: string, body: unknown) {
	return new Request(`${BASE_URL}${url}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export function makePutRequest(url: string, body: unknown) {
	return new Request(`${BASE_URL}${url}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export function makeDeleteRequest(url: string) {
	return new Request(`${BASE_URL}${url}`, { method: "DELETE" });
}
