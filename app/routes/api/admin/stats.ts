import type { Route } from "./+types/api/admin/stats";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "assistant")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const slug = params.slug;

	// Get registration counts
	const stats = await env.DB.prepare(
		`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN type = 'competitor' THEN 1 ELSE 0 END) as competitors,
      SUM(CASE WHEN type = 'attendee' THEN 1 ELSE 0 END) as attendees,
      SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN type = 'competitor' AND checked_in = 1 THEN 1 ELSE 0 END) as competitors_checked_in,
      SUM(CASE WHEN type = 'attendee' AND checked_in = 1 THEN 1 ELSE 0 END) as attendees_checked_in
    FROM registrations r JOIN tournaments t ON r.tournament_id = t.id WHERE t.slug = ?`,
	)
		.bind(slug)
		.first();

	// Get limits from tournament
	const tournament = await env.DB.prepare(
		"SELECT registration_limit, competitor_limit, attendee_limit FROM tournaments WHERE slug = ?",
	)
		.bind(slug)
		.first();

	return Response.json({
		total: (stats?.total as number) || 0,
		competitors: (stats?.competitors as number) || 0,
		attendees: (stats?.attendees as number) || 0,
		checkedIn: (stats?.checked_in as number) || 0,
		competitorsCheckedIn: (stats?.competitors_checked_in as number) || 0,
		attendeesCheckedIn: (stats?.attendees_checked_in as number) || 0,
		limits: {
			total: (tournament?.registration_limit as number) || null,
			competitor: (tournament?.competitor_limit as number) || null,
			attendee: (tournament?.attendee_limit as number) || null,
		},
	});
}
