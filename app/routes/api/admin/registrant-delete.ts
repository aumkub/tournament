import type { Route } from "./+types/api/admin/registrant-delete";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";

export async function action({ request, params, context }: Route.ActionArgs) {
	if (request.method !== "DELETE") {
		return Response.json({ error: "Method not allowed" }, { status: 405 });
	}

	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const slug = params.slug;
	const id = params.id;

	// Verify registration belongs to this tournament
	const reg = await env.DB.prepare(
		`SELECT r.id FROM registrations r JOIN tournaments t ON r.tournament_id = t.id WHERE r.id = ? AND t.slug = ? AND t.deleted_at IS NULL`,
	).bind(id, slug).first();

	if (!reg) {
		return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
	}

	await env.DB.prepare("DELETE FROM registrations WHERE id = ?").bind(id).run();

	return Response.json({ ok: true });
}
