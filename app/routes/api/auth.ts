import type { Route } from "./+types/api/auth";
import { verifyPassword, parsePasswords } from "../../../lib/auth";
import { createSession } from "../../../lib/kv-session";
import type { Role } from "../../../types/registration";

export async function action({ request, params, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

	const body = await request.json() as { password: string };
	const { password } = body;
	if (!password) {
		return Response.json({ error: "Password required" }, { status: 400 });
	}

	// Look up tournament by slug
	const tournament = await env.DB.prepare(
		"SELECT * FROM tournaments WHERE slug = ?",
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
		return Response.json({ error: "Invalid password" }, { status: 401 });
	}

	const token = await createSession(env.SESSIONS, {
		role: matchedRole,
		tournamentId: tournament.id as string,
	});

	return new Response(JSON.stringify({ role: matchedRole }), {
		status: 200,
		headers: {
			"Set-Cookie": `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`,
			"Content-Type": "application/json",
		},
	});
}
