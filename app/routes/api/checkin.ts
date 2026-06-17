import type { Route } from "./+types/api/checkin";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";
import { isCheckinOpen } from "../../../lib/utils";

export async function action({ request, params, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

	// Verify session
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "assistant")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	// Get tournament
	const tournament = await env.DB.prepare(
		"SELECT * FROM tournaments WHERE slug = ? AND deleted_at IS NULL",
	)
		.bind(slug)
		.first();

	if (!tournament) {
		return Response.json({ error: "Tournament not found" }, { status: 404 });
	}

	// Check check-in window
	if (
		!isCheckinOpen(
			tournament.checkin_open_at as number,
			tournament.checkin_close_at as number,
		)
	) {
		const now = Date.now();
		if (now < (tournament.checkin_open_at as number)) {
			return Response.json(
				{ error: "ยังไม่ถึงเวลาเช็คอิน", status: "not_yet" },
				{ status: 400 },
			);
		}
		return Response.json(
			{ error: "หมดเวลาเช็คอินแล้ว", status: "closed" },
			{ status: 400 },
		);
	}

	const body = await request.json() as { token?: string; email?: string; id?: string };
	if (!body.token && !body.email && !body.id) {
		return Response.json({ error: "Token, email, or id required" }, { status: 400 });
	}

	// Atomic check-in: only update if not already checked in
	const now = Date.now();
	let result: { meta: { changes: number } };
	if (body.token) {
		result = await env.DB.prepare(
			`UPDATE registrations SET checked_in = 1, checked_in_at = ?, checked_in_by = ?
       WHERE qr_code_token = ? AND checked_in = 0`,
		).bind(now, session.role, body.token).run();
	} else if (body.id) {
		result = await env.DB.prepare(
			`UPDATE registrations SET checked_in = 1, checked_in_at = ?, checked_in_by = ?
       WHERE id = ? AND tournament_id = ? AND checked_in = 0`,
		).bind(now, session.role, body.id.trim().toUpperCase(), tournament.id).run();
	} else {
		result = await env.DB.prepare(
			`UPDATE registrations SET checked_in = 1, checked_in_at = ?, checked_in_by = ?
       WHERE tournament_id = ? AND email = ? AND checked_in = 0`,
		).bind(now, session.role, tournament.id, body.email!.trim().toLowerCase()).run();
	}

	if (result.meta.changes === 0) {
		// Already checked in or not found
		let existing: Record<string, unknown> | null = null;
		if (body.token) {
			existing = await env.DB.prepare(
				"SELECT * FROM registrations WHERE qr_code_token = ?",
			).bind(body.token).first() as Record<string, unknown> | null;
		} else if (body.id) {
			existing = await env.DB.prepare(
				"SELECT * FROM registrations WHERE id = ? AND tournament_id = ?",
			).bind(body.id.trim().toUpperCase(), tournament.id).first() as Record<string, unknown> | null;
		} else {
			existing = await env.DB.prepare(
				"SELECT * FROM registrations WHERE tournament_id = ? AND email = ?",
			).bind(tournament.id, body.email!.trim().toLowerCase()).first() as Record<string, unknown> | null;
		}

		if (!existing) {
			return Response.json(
				{ error: "ไม่พบข้อมูลการลงทะเบียน", status: "not_found" },
				{ status: 404 },
			);
		}

		// Already checked in
		const data = JSON.parse(existing.data_json as string);
		return Response.json({
			status: "already_checked_in",
			name: data.child_full_name_th || data.full_name || data.full_name_th || data.full_name_en,
			type: existing.type,
			checked_in_at: existing.checked_in_at,
		});
	}

	// Get the newly checked-in registration
	let reg: Record<string, unknown> | null = null;
	if (body.token) {
		reg = await env.DB.prepare(
			"SELECT * FROM registrations WHERE qr_code_token = ?",
		).bind(body.token).first() as Record<string, unknown> | null;
	} else if (body.id) {
		reg = await env.DB.prepare(
			"SELECT * FROM registrations WHERE id = ? AND tournament_id = ?",
		).bind(body.id.trim().toUpperCase(), tournament.id).first() as Record<string, unknown> | null;
	} else {
		reg = await env.DB.prepare(
			"SELECT * FROM registrations WHERE tournament_id = ? AND email = ?",
		).bind(tournament.id, body.email!.trim().toLowerCase()).first() as Record<string, unknown> | null;
	}

	const data = JSON.parse(reg!.data_json as string);
	const name = data.child_full_name_th || data.full_name || data.full_name_th || data.full_name_en;
	const eventData = {
		type: "checkin",
		name,
		registration_id: reg!.id,
		registration_type: reg!.type,
		checked_in_at: now,
	};

	// Broadcast to DO room (non-blocking)
	try {
		const doId = env.TOURNAMENT_ROOM.idFromName(slug);
		const stub = env.TOURNAMENT_ROOM.get(doId);
		await stub.fetch("https://internal/broadcast", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(eventData),
		});
	} catch {}

	return Response.json({
		status: "success",
		name,
		type: reg!.type,
		checked_in_at: now,
	});
}
