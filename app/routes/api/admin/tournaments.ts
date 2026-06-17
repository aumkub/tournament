import type { Route } from "./+types/api/admin/tournaments";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";
import { hashPassword, generateSlug } from "../../../../lib/auth";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const results = await env.DB.prepare("SELECT * FROM tournaments WHERE deleted_at IS NULL ORDER BY created_at DESC").all();
	return Response.json({ tournaments: results.results });
}

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json() as {
		name: string;
		slug?: string;
		registration_limit?: number;
		registration_open_at: number;
		registration_close_at: number;
		checkin_open_at: number;
		checkin_close_at: number;
		email_template_html?: string;
		passwords?: { assistant?: string; admin?: string; super_admin?: string };
	};

	const id = crypto.randomUUID();
	const slug = body.slug || generateSlug(body.name);
	const now = Date.now();

	// Hash passwords if provided
	const passwords = body.passwords || {};
	const hashedPasswords: Record<string, string> = {};
	if (passwords.assistant) hashedPasswords.assistant = await hashPassword(passwords.assistant);
	if (passwords.admin) hashedPasswords.admin = await hashPassword(passwords.admin);
	if (passwords.super_admin) hashedPasswords.super_admin = await hashPassword(passwords.super_admin);

	await env.DB.prepare(
		`INSERT INTO tournaments (id, name, slug, registration_limit, registration_open_at, registration_close_at, checkin_open_at, checkin_close_at, email_template_html, passwords_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			id,
			body.name,
			slug,
			body.registration_limit || null,
			body.registration_open_at,
			body.registration_close_at,
			body.checkin_open_at,
			body.checkin_close_at,
			body.email_template_html || null,
			JSON.stringify(hashedPasswords),
			now,
			now,
		)
		.run();

	return Response.json({ id, slug });
}
