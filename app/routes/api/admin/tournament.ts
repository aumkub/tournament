import type { Route } from "./+types/api/admin/tournament";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";
import { hashPassword } from "../../../../lib/auth";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const slug = params.slug;
	const tournament = await env.DB.prepare(
		"SELECT * FROM tournaments WHERE slug = ?",
	)
		.bind(slug)
		.first();

	if (!tournament) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	return Response.json({ tournament });
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const slug = params.slug;
	const contentType = request.headers.get("Content-Type") || "";

	// Handle multipart/form-data for cover photo upload
	if (contentType.includes("multipart/form-data")) {
		const formData = await request.formData();
		const file = formData.get("cover_photo") as File | null;
		const name = formData.get("name") as string | null;
		const newSlug = formData.get("slug") as string | null;
		const registration_limit = formData.get("registration_limit") as string | null;
		const registration_open_at = formData.get("registration_open_at") as string | null;
		const registration_close_at = formData.get("registration_close_at") as string | null;
		const checkin_open_at = formData.get("checkin_open_at") as string | null;
		const checkin_close_at = formData.get("checkin_close_at") as string | null;
		const email_template_html = formData.get("email_template_html") as string | null;
		const competitor_url = formData.get("competitor_url") as string | null;
		const attendee_url = formData.get("attendee_url") as string | null;
		const competitor_title = formData.get("competitor_title") as string | null;
		const attendee_title = formData.get("attendee_title") as string | null;
		const competitor_title_en = formData.get("competitor_title_en") as string | null;
		const attendee_title_en = formData.get("attendee_title_en") as string | null;
		const competitor_limit = formData.get("competitor_limit") as string | null;
		const attendee_limit = formData.get("attendee_limit") as string | null;

		const sets: string[] = [];
		const binds: unknown[] = [];

		// Handle cover photo upload
		if (file && file.size > 0) {
			if (file.size > 10 * 1024 * 1024) {
				return Response.json({ error: "Cover photo must be under 10MB" }, { status: 400 });
			}
			// Get tournament id for the key
			const existing = await env.DB.prepare("SELECT id FROM tournaments WHERE slug = ?").bind(slug).first();
			const tid = (existing?.id as string) || slug;
			const key = `covers/${tid}/cover-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
			await env.BUCKET.put(key, file.stream(), {
				httpMetadata: { contentType: file.type || "image/jpeg" },
			});
			sets.push("photo_url = ?");
			binds.push(key);
		}

		if (name !== null) { sets.push("name = ?"); binds.push(name); }
		if (newSlug !== null && newSlug.trim()) { sets.push("slug = ?"); binds.push(newSlug.trim()); }
		if (registration_limit !== null) {
			sets.push("registration_limit = ?");
			binds.push(registration_limit ? parseInt(registration_limit) : null);
		}
		if (registration_open_at !== null) { sets.push("registration_open_at = ?"); binds.push(registration_open_at ? new Date(registration_open_at).getTime() : undefined); }
		if (registration_close_at !== null) { sets.push("registration_close_at = ?"); binds.push(registration_close_at ? new Date(registration_close_at).getTime() : undefined); }
		if (checkin_open_at !== null) { sets.push("checkin_open_at = ?"); binds.push(checkin_open_at ? new Date(checkin_open_at).getTime() : undefined); }
		if (checkin_close_at !== null) { sets.push("checkin_close_at = ?"); binds.push(checkin_close_at ? new Date(checkin_close_at).getTime() : undefined); }
		if (email_template_html !== null) { sets.push("email_template_html = ?"); binds.push(email_template_html); }
		if (competitor_url !== null) { sets.push("competitor_url = ?"); binds.push(competitor_url || null); }
		if (attendee_url !== null) { sets.push("attendee_url = ?"); binds.push(attendee_url || null); }
		if (competitor_title !== null) { sets.push("competitor_title = ?"); binds.push(competitor_title || null); }
		if (attendee_title !== null) { sets.push("attendee_title = ?"); binds.push(attendee_title || null); }
		if (competitor_title_en !== null) { sets.push("competitor_title_en = ?"); binds.push(competitor_title_en || null); }
		if (attendee_title_en !== null) { sets.push("attendee_title_en = ?"); binds.push(attendee_title_en || null); }
		const competitor_form_id = formData.get("competitor_form_id") as string | null;
		const attendee_form_id = formData.get("attendee_form_id") as string | null;
		if (competitor_form_id !== null) { sets.push("competitor_form_id = ?"); binds.push(competitor_form_id || null); }
		if (attendee_form_id !== null) { sets.push("attendee_form_id = ?"); binds.push(attendee_form_id || null); }
		if (competitor_limit !== null) { sets.push("competitor_limit = ?"); binds.push(competitor_limit ? parseInt(competitor_limit) : null); }
		if (attendee_limit !== null) { sets.push("attendee_limit = ?"); binds.push(attendee_limit ? parseInt(attendee_limit) : null); }

		const form_urls_json = formData.get("form_urls_json") as string | null;
		const email_templates_json = formData.get("email_templates_json") as string | null;
		const test_mode = formData.get("test_mode") as string | null;
		if (form_urls_json !== null) { sets.push("form_urls_json = ?"); binds.push(form_urls_json || "{}"); }
		if (email_templates_json !== null) { sets.push("email_templates_json = ?"); binds.push(email_templates_json || "{}"); }
		if (test_mode !== null) { sets.push("test_mode = ?"); binds.push(test_mode === "1" ? 1 : 0); }
		const success_messages_json = formData.get("success_messages_json") as string | null;
		if (success_messages_json !== null) { sets.push("success_messages_json = ?"); binds.push(success_messages_json || "{}"); }

		// Handle password fields from form data
		const pwAssistant = formData.get("password_assistant") as string | null;
		const pwAdmin = formData.get("password_admin") as string | null;
		const pwSuperAdmin = formData.get("password_super_admin") as string | null;

		if (pwAssistant || pwAdmin || pwSuperAdmin) {
			const existing = await env.DB.prepare("SELECT passwords_json FROM tournaments WHERE slug = ?").bind(slug).first();
			const currentPw = JSON.parse((existing?.passwords_json as string) || "{}");
			if (pwAssistant) currentPw.assistant = await hashPassword(pwAssistant);
			if (pwAdmin) currentPw.admin = await hashPassword(pwAdmin);
			if (pwSuperAdmin) currentPw.super_admin = await hashPassword(pwSuperAdmin);
			sets.push("passwords_json = ?");
			binds.push(JSON.stringify(currentPw));
		}

		if (sets.length === 0) {
			return Response.json({ error: "No fields to update" }, { status: 400 });
		}

		sets.push("updated_at = ?");
		binds.push(Date.now());
		binds.push(slug);

		await env.DB.prepare(
			`UPDATE tournaments SET ${sets.join(", ")} WHERE slug = ?`,
		).bind(...binds).run();

		return Response.json({ ok: true });
	}

	// Handle JSON body (legacy)
	const body = await request.json() as {
		name?: string;
		registration_limit?: number | null;
		registration_open_at?: number;
		registration_close_at?: number;
		checkin_open_at?: number;
		checkin_close_at?: number;
		email_template_html?: string;
		photo_url?: string;
		competitor_url?: string;
		attendee_url?: string;
		competitor_title?: string;
		attendee_title?: string;
		competitor_limit?: number | null;
		attendee_limit?: number | null;
		form_urls_json?: string;
		email_templates_json?: string;
		passwords?: { assistant?: string; admin?: string; super_admin?: string };
	};

	const sets: string[] = [];
	const binds: unknown[] = [];

	if (body.name !== undefined) { sets.push("name = ?"); binds.push(body.name); }
	if (body.registration_limit !== undefined) { sets.push("registration_limit = ?"); binds.push(body.registration_limit); }
	if (body.registration_open_at !== undefined) { sets.push("registration_open_at = ?"); binds.push(body.registration_open_at); }
	if (body.registration_close_at !== undefined) { sets.push("registration_close_at = ?"); binds.push(body.registration_close_at); }
	if (body.checkin_open_at !== undefined) { sets.push("checkin_open_at = ?"); binds.push(body.checkin_open_at); }
	if (body.checkin_close_at !== undefined) { sets.push("checkin_close_at = ?"); binds.push(body.checkin_close_at); }
	if (body.email_template_html !== undefined) { sets.push("email_template_html = ?"); binds.push(body.email_template_html); }
	if (body.photo_url !== undefined) { sets.push("photo_url = ?"); binds.push(body.photo_url); }
	if (body.competitor_url !== undefined) { sets.push("competitor_url = ?"); binds.push(body.competitor_url); }
	if (body.attendee_url !== undefined) { sets.push("attendee_url = ?"); binds.push(body.attendee_url); }
	if (body.competitor_title !== undefined) { sets.push("competitor_title = ?"); binds.push(body.competitor_title); }
	if (body.attendee_title !== undefined) { sets.push("attendee_title = ?"); binds.push(body.attendee_title); }
	if (body.competitor_limit !== undefined) { sets.push("competitor_limit = ?"); binds.push(body.competitor_limit); }
	if (body.attendee_limit !== undefined) { sets.push("attendee_limit = ?"); binds.push(body.attendee_limit); }
	if (body.form_urls_json !== undefined) { sets.push("form_urls_json = ?"); binds.push(body.form_urls_json || "{}"); }
	if (body.email_templates_json !== undefined) { sets.push("email_templates_json = ?"); binds.push(body.email_templates_json || "{}"); }

	if (body.passwords) {
		const existing = await env.DB.prepare("SELECT passwords_json FROM tournaments WHERE slug = ?").bind(slug).first();
		const currentPw = JSON.parse((existing?.passwords_json as string) || "{}");
		if (body.passwords.assistant) currentPw.assistant = await hashPassword(body.passwords.assistant);
		if (body.passwords.admin) currentPw.admin = await hashPassword(body.passwords.admin);
		if (body.passwords.super_admin) currentPw.super_admin = await hashPassword(body.passwords.super_admin);
		sets.push("passwords_json = ?");
		binds.push(JSON.stringify(currentPw));
	}

	if (sets.length === 0) {
		return Response.json({ error: "No fields to update" }, { status: 400 });
	}

	sets.push("updated_at = ?");
	binds.push(Date.now());
	binds.push(slug);

	await env.DB.prepare(
		`UPDATE tournaments SET ${sets.join(", ")} WHERE slug = ?`,
	).bind(...binds).run();

	return Response.json({ ok: true });
}
