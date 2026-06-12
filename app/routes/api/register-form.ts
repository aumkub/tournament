import type { Route } from "./+types/api/register-form";
import { isRegistrationOpen, nowEpoch } from "../../../lib/utils";
import { getFormConfig } from "../../../lib/form-configs/index";

export async function action({ request, params, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

	const tournament = await env.DB.prepare(
		"SELECT * FROM tournaments WHERE slug = ?",
	)
		.bind(slug)
		.first();

	if (!tournament) {
		return Response.json({ error: "ไม่พบทัวร์นาเมนต์" }, { status: 404 });
	}

	if (!isRegistrationOpen(
		tournament.registration_open_at as number,
		tournament.registration_close_at as number,
	)) {
		const now = nowEpoch();
		if (now < (tournament.registration_open_at as number)) {
			return Response.json({ error: "การลงทะเบียนยังไม่เปิด" }, { status: 400 });
		}
		return Response.json({ error: "การลงทะเบียนปิดแล้ว" }, { status: 400 });
	}

	const body = await request.json() as {
		form_id: string;
		email: string;
		data: Record<string, unknown>;
	};

	if (!body.form_id) {
		return Response.json({ error: "form_id is required" }, { status: 400 });
	}

	const formConfig = getFormConfig(body.form_id);
	if (!formConfig) {
		return Response.json({ error: `Unknown form type: ${body.form_id}` }, { status: 400 });
	}

	const email = body.email || (body.data[formConfig.emailField] as string);
	if (!email) {
		return Response.json({ error: "Email is required" }, { status: 400 });
	}

	// Validate required fields — skip conditional steps that don't apply
	const missing: string[] = [];
	for (const step of formConfig.steps) {
		if (step.condition) {
			const condVal = body.data[step.condition.field];
			if (condVal !== step.condition.value) continue;
		}
		for (const field of step.fields) {
			if (!field.required) continue;
			const val = body.data[field.key];
			if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
				missing.push(field.key);
			}
		}
	}
	if (missing.length > 0) {
		return Response.json(
			{ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ", missing },
			{ status: 400 },
		);
	}

	// Check total registration limit
	if (tournament.registration_limit) {
		const count = await env.DB.prepare(
			"SELECT COUNT(*) as cnt FROM registrations WHERE tournament_id = ?",
		)
			.bind(tournament.id as string)
			.first();
		if (count && (count.cnt as number) >= (tournament.registration_limit as number)) {
			return Response.json({ error: "ขออภัย ที่นั่งเต็มแล้ว" }, { status: 400 });
		}
	}

	const id = crypto.randomUUID();
	const token = crypto.randomUUID();
	const now = Date.now();

	await env.DB.prepare(
		`INSERT INTO registrations (id, tournament_id, type, email, data_json, qr_code_token, checked_in, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
	)
		.bind(
			id,
			tournament.id as string,
			body.form_id,
			email,
			JSON.stringify(body.data),
			token,
			now,
		)
		.run();

	try {
		await env.EMAIL_QUEUE.send({
			registrationId: id,
			tournamentId: tournament.id as string,
		});
	} catch {
		// Queue not available in local dev — continue
	}

	return Response.json({
		id,
		qr_code_token: token,
		message: "ลงทะเบียนสำเร็จ",
	});
}
