import type { SessionData, Role } from "../../types/registration";

const SESSION_TTL = 60 * 60 * 8; // 8 hours

export async function createSession(
	kv: KVNamespace,
	data: SessionData,
): Promise<string> {
	const token = crypto.randomUUID();
	await kv.put(`session:${token}`, JSON.stringify(data), {
		expirationTtl: SESSION_TTL,
	});
	return token;
}

export async function verifySession(
	kv: KVNamespace,
	token: string,
): Promise<SessionData | null> {
	const raw = await kv.get(`session:${token}`);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as SessionData;
	} catch {
		return null;
	}
}

export async function destroySession(
	kv: KVNamespace,
	token: string,
): Promise<void> {
	await kv.delete(`session:${token}`);
}

export function parseCookie(cookieHeader: string | null): string | null {
	if (!cookieHeader) return null;
	const cookies = cookieHeader.split(";").map((c) => c.trim());
	for (const c of cookies) {
		if (c.startsWith("session=")) {
			return c.slice("session=".length);
		}
	}
	return null;
}

/** Session cookie — Secure only over HTTPS (localhost HTTP dev must omit it). */
export function sessionCookieHeader(
	token: string,
	maxAge: number,
	request: Request,
): string {
	const secure = new URL(request.url).protocol === "https:";
	return [
		`session=${token}`,
		"HttpOnly",
		secure ? "Secure" : null,
		"SameSite=Strict",
		"Path=/",
		`Max-Age=${maxAge}`,
	]
		.filter(Boolean)
		.join("; ");
}

export function hasRole(session: SessionData | null, minimum: Role): boolean {
	if (!session) return false;
	const hierarchy: Role[] = ["assistant", "admin", "super_admin"];
	return hierarchy.indexOf(session.role) >= hierarchy.indexOf(minimum);
}
