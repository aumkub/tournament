import type { Route } from "./+types/api/register-form";
import { isRegistrationOpen, nowEpoch } from "../../../lib/utils";
import { getFormConfig } from "../../../lib/form-configs/index";
import { sendRegistrationEmail } from "../../../lib/registration-email";

export async function action({ request, params, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

	const tournament = await env.DB.prepare(
		"SELECT * FROM tournaments WHERE slug = ? AND deleted_at IS NULL",
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

	const email = (body.email || (body.data[formConfig.emailField] as string) || "").trim().toLowerCase();

	const matchCond = (cond: { field: string; value: string; operator?: string }, data: Record<string, unknown>) => {
		const val = data[cond.field];
		if (cond.operator === "includes") return Array.isArray(val) && (val as string[]).includes(cond.value);
		return val === cond.value;
	};

	// Validate required fields — skip conditional steps that don't apply
	const missing: string[] = [];
	for (const step of formConfig.steps) {
		if (step.conditions && !step.conditions.every((c) => matchCond(c, body.data))) continue;
		if (!step.conditions && step.condition && !matchCond(step.condition, body.data)) continue;
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

	// Check duplicate email within same tournament + type (only if email provided)
	if (email) {
		const duplicate = await env.DB.prepare(
			"SELECT id FROM registrations WHERE tournament_id = ? AND type = ? AND email = ?",
		)
			.bind(tournament.id as string, body.form_id, email)
			.first();
		if (duplicate) {
			return Response.json(
				{ error: "อีเมลนี้ได้ลงทะเบียนประเภทนี้ไปแล้ว", code: "duplicate_email" },
				{ status: 409 },
			);
		}
	}

	// Generate unique 6-char uppercase alphanumeric ID
	const genId = () => {
		const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O,0,I,1 to avoid confusion
		return Array.from(crypto.getRandomValues(new Uint8Array(6)))
			.map((b) => chars[b % chars.length])
			.join("");
	};
	let id = genId();
	// Retry on collision (extremely unlikely)
	for (let i = 0; i < 5; i++) {
		const exists = await env.DB.prepare("SELECT 1 FROM registrations WHERE id = ?").bind(id).first();
		if (!exists) break;
		id = genId();
	}
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

	if (email) {
		try {
			await sendRegistrationEmail(env, tournament, {
				id,
				type: body.form_id,
				email,
				data_json: JSON.stringify(body.data),
			});
		} catch (err) {
			console.error("Failed to send registration email:", err);
		}
	}

	// Broadcast new registration to admin dashboards
	try {
		const doId = env.TOURNAMENT_ROOM.idFromName(slug);
		const stub = env.TOURNAMENT_ROOM.get(doId);
		await stub.fetch("https://internal/broadcast", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ type: "register", registration_id: id, registration_type: body.form_id, submitted_at: now }),
		});
	} catch {}

	return Response.json({
		id,
		qr_code_token: token,
		message: "ลงทะเบียนสำเร็จ",
	});
}
