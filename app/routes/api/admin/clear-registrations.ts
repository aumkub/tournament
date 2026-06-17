import type { Route } from "./+types/api/admin/clear-registrations";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";

export async function action({ request, params, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const tournament = await env.DB.prepare(
		"SELECT id FROM tournaments WHERE slug = ? AND deleted_at IS NULL",
	).bind(slug).first();
	if (!tournament) return Response.json({ error: "Not found" }, { status: 404 });

	const tournamentId = tournament.id as string;

	// Delete all R2 files for this tournament
	try {
		const prefix = `${tournamentId}/`;
		let cursor: string | undefined;
		do {
			const list = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
			if (list.objects.length > 0) {
				await Promise.all(list.objects.map((obj) => env.BUCKET.delete(obj.key)));
			}
			cursor = list.truncated ? list.cursor : undefined;
		} while (cursor);
	} catch {}

	// Delete all registrations
	await env.DB.prepare(
		"DELETE FROM registrations WHERE tournament_id = ?",
	).bind(tournamentId).run();

	return Response.json({ ok: true });
}
