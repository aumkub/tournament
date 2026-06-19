import type { Route } from "./+types/api/auth";
import { verifyPassword, parsePasswords } from "../../../lib/auth";
import { createSession, sessionCookieHeader } from "../../../lib/kv-session";
import type { Role } from "../../../types/registration";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 3 * 60 * 1000; // 3 minutes

function getClientIp(request: Request): string {
	return (
		request.headers.get("CF-Connecting-IP") ||
		request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
		"unknown"
	);
}

function rateLimitKey(ip: string, slug: string) {
	return `login_fail:${ip}:${slug}`;
}

async function checkRateLimit(kv: KVNamespace, ip: string, slug: string): Promise<{ locked: boolean; remainingMs?: number }> {
	const raw = await kv.get(rateLimitKey(ip, slug));
	if (!raw) return { locked: false };
	const data = JSON.parse(raw) as { count: number; lockedUntil?: number };
	if (data.lockedUntil && Date.now() < data.lockedUntil) {
		return { locked: true, remainingMs: data.lockedUntil - Date.now() };
	}
	return { locked: false };
}

async function recordFailure(kv: KVNamespace, ip: string, slug: string): Promise<{ locked: boolean; count: number }> {
	const key = rateLimitKey(ip, slug);
	const raw = await kv.get(key);
	const data = raw ? (JSON.parse(raw) as { count: number; lockedUntil?: number }) : { count: 0 };

	// Reset if previous lock expired
	if (data.lockedUntil && Date.now() >= data.lockedUntil) {
		data.count = 0;
		data.lockedUntil = undefined;
	}

	data.count += 1;
	let locked = false;
	if (data.count >= MAX_ATTEMPTS) {
		data.lockedUntil = Date.now() + LOCK_DURATION_MS;
		locked = true;
	}

	await kv.put(key, JSON.stringify(data), { expirationTtl: 600 }); // auto-expire after 10 min
	return { locked, count: data.count };
}

async function clearFailures(kv: KVNamespace, ip: string, slug: string) {
	await kv.delete(rateLimitKey(ip, slug));
}


export async function action({ request, params, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;
	const ip = getClientIp(request);

	// Check rate limit before processing
	const rateCheck = await checkRateLimit(env.SESSIONS, ip, slug);
	if (rateCheck.locked) {
		const seconds = Math.ceil((rateCheck.remainingMs ?? 0) / 1000);
		return Response.json(
			{ error: `เข้าสู่ระบบล้มเหลวหลายครั้ง กรุณารอ ${seconds} วินาที` },
			{ status: 429 },
		);
	}

	const body = await request.json() as { password: string; website?: string };
	const { password, website } = body;

	// Honeypot — bots fill "website" field
	if (website) {
		return Response.json({ role: "assistant" }, { status: 200 });
	}

	if (!password) {
		return Response.json({ error: "Password required" }, { status: 400 });
	}

	// Look up tournament by slug
	const tournament = await env.DB.prepare(
		"SELECT * FROM tournaments WHERE slug = ? AND deleted_at IS NULL",
	)
		.bind(slug)
		.first();
	if (!tournament) {
		return Response.json({ error: "Tournament not found" }, { status: 404 });
	}

	const passwords = parsePasswords(tournament.passwords_json as string);

	// Check each role
	let matchedRole: Role | null = null;
	if (passwords.super_admin && (await verifyPassword(password, passwords.super_admin))) {
		matchedRole = "super_admin";
	} else if (passwords.admin && (await verifyPassword(password, passwords.admin))) {
		matchedRole = "admin";
	} else if (passwords.assistant && (await verifyPassword(password, passwords.assistant))) {
		matchedRole = "assistant";
	}

	if (!matchedRole) {
		const { locked, count } = await recordFailure(env.SESSIONS, ip, slug);
		if (locked) {
			return Response.json(
				{ error: `เข้าสู่ระบบล้มเหลว ${MAX_ATTEMPTS} ครั้ง บัญชีถูกล็อก 3 นาที`, attemptsLeft: 0 },
				{ status: 401 },
			);
		}
		const attemptsLeft = MAX_ATTEMPTS - count;
		return Response.json(
			{ error: "รหัสผ่านไม่ถูกต้อง", attemptsLeft },
			{ status: 401 },
		);
	}

	// Success — clear failure counter
	await clearFailures(env.SESSIONS, ip, slug);

	const token = await createSession(env.SESSIONS, {
		role: matchedRole,
		tournamentId: tournament.id as string,
	});

	return new Response(JSON.stringify({ role: matchedRole }), {
		status: 200,
		headers: {
			"Set-Cookie": sessionCookieHeader(token, 28800, request),
			"Content-Type": "application/json",
		},
	});
}
