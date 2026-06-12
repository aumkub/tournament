import type { Route } from "./+types/api/admin/uncheckin";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";

export async function action({ request, params, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const slug = params.slug;
	const { id } = await request.json() as { id: string };
	if (!id) return Response.json({ error: "id required" }, { status: 400 });

	const tournament = await env.DB.prepare("SELECT id FROM tournaments WHERE slug = ?")
		.bind(slug).first();
	if (!tournament) return Response.json({ error: "Not found" }, { status: 404 });

	await env.DB.prepare(
		`UPDATE registrations SET checked_in = 0, checked_in_at = NULL, checked_in_by = NULL
		 WHERE id = ? AND tournament_id = ?`,
	).bind(id, tournament.id).run();

	return Response.json({ ok: true });
}
