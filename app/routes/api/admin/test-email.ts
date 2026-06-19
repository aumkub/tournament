import type { Route } from "./+types/api/admin/test-email";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";
import { sendTestEmail } from "../../../../lib/registration-email";
import { FORM_CONFIGS } from "../../../../lib/form-configs/index";

export async function action({ request, params, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const tournament = await env.DB.prepare(
		"SELECT * FROM tournaments WHERE slug = ? AND deleted_at IS NULL",
	)
		.bind(slug)
		.first();

	if (!tournament) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	const body = await request.json() as {
		to?: string;
		formType?: string;
		templateHtml?: string;
	};

	const to = body.to?.trim().toLowerCase();
	if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
		return Response.json({ error: "กรุณาระบุอีเมลที่ถูกต้อง" }, { status: 400 });
	}

	const formType = body.formType?.trim() || "attendee";
	if (!FORM_CONFIGS[formType]) {
		return Response.json({ error: "ประเภทฟอร์มไม่ถูกต้อง" }, { status: 400 });
	}

	try {
		const result = await sendTestEmail(
			env,
			tournament,
			formType,
			to,
			body.templateHtml,
		);
		return Response.json({
			ok: true,
			message: `ส่งอีเมลทดสอบไปที่ ${to} แล้ว`,
			messageId: result.messageId,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "ส่งอีเมลไม่สำเร็จ";
		return Response.json({ error: message }, { status: 500 });
	}
}
