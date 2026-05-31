import type { Route } from "./+types/api/admin/registrants";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const slug = params.slug;
	const url = new URL(request.url);
	const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
	const limit = 20;
	const offset = (page - 1) * limit;
	const type = url.searchParams.get("type") || "";
	const checkedIn = url.searchParams.get("checked_in");
	const search = url.searchParams.get("search") || "";

	let query = `SELECT r.* FROM registrations r JOIN tournaments t ON r.tournament_id = t.id WHERE t.slug = ?`;
	const binds: unknown[] = [slug];

	if (type) {
		query += ` AND r.type = ?`;
		binds.push(type);
	}
	if (checkedIn !== null && checkedIn !== "") {
		query += ` AND r.checked_in = ?`;
		binds.push(checkedIn === "true" ? 1 : 0);
	}
	if (search) {
		query += ` AND (r.data_json LIKE ? OR r.email LIKE ?)`;
		binds.push(`%${search}%`, `%${search}%`);
	}

	query += ` ORDER BY r.submitted_at DESC LIMIT ? OFFSET ?`;
	binds.push(limit, offset);

	const results = await env.DB.prepare(query).bind(...binds).all();

	// Count total
	let countQuery = `SELECT COUNT(*) as total FROM registrations r JOIN tournaments t ON r.tournament_id = t.id WHERE t.slug = ?`;
	const countBinds: unknown[] = [slug];
	if (type) {
		countQuery += ` AND r.type = ?`;
		countBinds.push(type);
	}
	if (checkedIn !== null && checkedIn !== "") {
		countQuery += ` AND r.checked_in = ?`;
		countBinds.push(checkedIn === "true" ? 1 : 0);
	}
	if (search) {
		countQuery += ` AND (r.data_json LIKE ? OR r.email LIKE ?)`;
		countBinds.push(`%${search}%`, `%${search}%`);
	}

	const countResult = await env.DB.prepare(countQuery).bind(...countBinds).first();

	return Response.json({
		registrants: results.results,
		total: (countResult?.total as number) || 0,
		page,
		limit,
	});
}
