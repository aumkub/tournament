import type { Route } from "./+types/api/admin/tournament-restore";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";
import { TOURNAMENT_DELETED, TOURNAMENT_NOT_DELETED, parseOriginalSlugFromDeleted } from "../../../../lib/tournament-query";

export async function action({ request, params, context }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return Response.json({ error: "Method not allowed" }, { status: 405 });
	}

	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const id = params.id;
	const tournament = await env.DB.prepare(
		`SELECT id, slug FROM tournaments WHERE id = ? AND ${TOURNAMENT_DELETED}`,
	).bind(id).first();

	if (!tournament) {
		return Response.json({ error: "ไม่พบรายการที่ถูกลบ" }, { status: 404 });
	}

	const originalSlug = parseOriginalSlugFromDeleted(tournament.slug as string);
	if (!originalSlug) {
		return Response.json({ error: "ไม่สามารถกู้คืน slug เดิมได้" }, { status: 400 });
	}

	const conflict = await env.DB.prepare(
		`SELECT id FROM tournaments WHERE slug = ? AND ${TOURNAMENT_NOT_DELETED}`,
	).bind(originalSlug).first();

	if (conflict) {
		return Response.json({ error: `slug "${originalSlug}" ถูกใช้งานแล้ว` }, { status: 409 });
	}

	const now = Date.now();
	await env.DB.prepare(
		`UPDATE tournaments SET deleted_at = NULL, slug = ?, updated_at = ? WHERE id = ?`,
	).bind(originalSlug, now, id).run();

	return Response.json({ ok: true, slug: originalSlug });
}
