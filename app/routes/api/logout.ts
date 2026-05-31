import type { Route } from "./+types/api/logout";
import { parseCookie, destroySession } from "../../../lib/kv-session";

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));

	if (token) {
		await destroySession(env.SESSIONS, token);
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"Set-Cookie": `session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
			"Content-Type": "application/json",
		},
	});
}
