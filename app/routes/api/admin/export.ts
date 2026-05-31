import type { Route } from "./+types/api/admin/export";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";
import { registrationsToCSV } from "../../../../lib/csv";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const slug = params.slug;
	const results = await env.DB.prepare(
		`SELECT r.* FROM registrations r JOIN tournaments t ON r.tournament_id = t.id WHERE t.slug = ? ORDER BY r.submitted_at DESC`,
	)
		.bind(slug)
		.all();

	const csv = registrationsToCSV(results.results as any[]);
	const date = new Date().toISOString().split("T")[0];

	return new Response(csv, {
		status: 200,
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="${slug}-registrants-${date}.csv"`,
		},
	});
}
