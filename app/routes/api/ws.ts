import type { Route } from "./+types/api/ws";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

	// Verify session
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "admin")) {
		return new Response("Unauthorized", { status: 401 });
	}

	// WebSocket upgrade
	const upgradeHeader = request.headers.get("Upgrade");
	if (upgradeHeader !== "websocket") {
		return new Response("Expected WebSocket", { status: 400 });
	}

	// Forward to Durable Object
	const id = env.TOURNAMENT_ROOM.idFromName(slug);
	const stub = env.TOURNAMENT_ROOM.get(id);
	return stub.fetch(request);
}
