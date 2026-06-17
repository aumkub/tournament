import type { Route } from "./+types/api/admin/checkin-log";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "assistant")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const slug = params.slug;
	const url = new URL(request.url);
	const limit = Math.min(200, parseInt(url.searchParams.get("limit") || "100"));

	const rows = await env.DB.prepare(
		`SELECT r.data_json, r.type, r.checked_in_at
		 FROM registrations r
		 JOIN tournaments t ON r.tournament_id = t.id
		 WHERE t.slug = ? AND t.deleted_at IS NULL AND r.checked_in = 1
		 ORDER BY r.checked_in_at DESC
		 LIMIT ?`,
	)
		.bind(slug, limit)
		.all();

	const events = rows.results.map((r: any) => {
		let name = "";
		try {
			const data = JSON.parse(r.data_json);
			name = data.child_full_name_th || data.full_name || data.full_name_th || data.full_name_en || "";
		} catch {}
		return {
			type: "checkin",
			name,
			registration_type: r.type,
			checked_in_at: r.checked_in_at,
		};
	});

	return Response.json({ events });
}
