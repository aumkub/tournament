import type { Route } from "./+types/api/logout";
import { parseCookie, destroySession, sessionCookieHeader } from "../../../lib/kv-session";

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));

	if (token) {
		await destroySession(env.SESSIONS, token);
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"Set-Cookie": sessionCookieHeader("", 0, request),
			"Content-Type": "application/json",
		},
	});
}
