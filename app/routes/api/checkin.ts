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
		"SELECT * FROM tournaments WHERE slug = ?",
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

	const body = await request.json() as { token: string };
	if (!body.token) {
		return Response.json({ error: "Token required" }, { status: 400 });
	}

	// Atomic check-in: only update if not already checked in
	const now = Date.now();
	const result = await env.DB.prepare(
		`UPDATE registrations SET checked_in = 1, checked_in_at = ?, checked_in_by = ?
     WHERE qr_code_token = ? AND checked_in = 0`,
	)
		.bind(now, session.role, body.token)
		.run();

	if (result.meta.changes === 0) {
		// Already checked in or not found
		const existing = await env.DB.prepare(
			"SELECT * FROM registrations WHERE qr_code_token = ?",
		)
			.bind(body.token)
			.first();

		if (!existing) {
			return Response.json(
				{ error: "ไม่พบ QR นี้", status: "not_found" },
				{ status: 404 },
			);
		}

		// Already checked in
		const data = JSON.parse(existing.data_json as string);
		return Response.json({
			status: "already_checked_in",
			name: data.full_name_th || data.full_name_en,
			type: existing.type,
			checked_in_at: existing.checked_in_at,
		});
	}

	// Get the newly checked-in registration
	const reg = await env.DB.prepare(
		"SELECT * FROM registrations WHERE qr_code_token = ?",
	)
		.bind(body.token)
		.first();

	const data = JSON.parse(reg!.data_json as string);
	const eventData = {
		type: "checkin",
		name: data.full_name_th || data.full_name_en,
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
		name: data.full_name_th || data.full_name_en,
		type: reg!.type,
		checked_in_at: now,
	});
}
