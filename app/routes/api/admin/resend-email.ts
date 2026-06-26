import type { Route } from "./+types/api/admin/resend-email";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";
import { sendRegistrationEmail } from "../../../../lib/registration-email";

export async function action({ request, params, context }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return Response.json({ error: "Method not allowed" }, { status: 405 });
	}

	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const slug = params.slug;
	const id = params.id;

	const row = await env.DB.prepare(
		`SELECT r.id, r.type, r.email, r.data_json, t.*
		 FROM registrations r
		 JOIN tournaments t ON r.tournament_id = t.id
		 WHERE r.id = ? AND t.slug = ? AND t.deleted_at IS NULL`,
	)
		.bind(id, slug)
		.first();

	if (!row) {
		return Response.json({ error: "ไม่พบข้อมูลการลงทะเบียน" }, { status: 404 });
	}

	const email = (row.email as string)?.trim();
	if (!email) {
		return Response.json({ error: "ไม่มีอีเมลสำหรับผู้ลงทะเบียนนี้" }, { status: 400 });
	}

	try {
		await sendRegistrationEmail(env, row, {
			id: row.id as string,
			type: row.type as string,
			email,
			data_json: row.data_json as string,
		});
		return Response.json({
			ok: true,
			message: `ส่งอีเมล QR Code ไปที่ ${email} แล้ว`,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "ส่งอีเมลไม่สำเร็จ";
		return Response.json({ error: message }, { status: 500 });
	}
}
