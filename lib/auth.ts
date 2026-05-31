/**
 * Password hashing for Cloudflare Workers.
 * Uses Web Crypto API PBKDF2 — no Node.js `util` dependency.
 * Fully compatible with the Workers runtime (no bcryptjs needed).
 */

const ITERATIONS = 100_000;
const KEY_LENGTH = 256; // bits
const HASH_ALGO = "SHA-256";

function toHex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

/**
 * Hash a plaintext password with a random salt.
 * Returns format: `iterations$saltHex$hashHex`
 */
export async function hashPassword(plain: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const saltHex = toHex(salt.buffer);

	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(plain),
		"PBKDF2",
		false,
		["deriveBits"],
	);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt,
			iterations: ITERATIONS,
			hash: HASH_ALGO,
		},
		keyMaterial,
		KEY_LENGTH,
	);

	const hashHex = toHex(derivedBits);
	return `${ITERATIONS}$${saltHex}$${hashHex}`;
}

/**
 * Verify a plaintext password against a stored hash.
 * Accepts format: `iterations$saltHex$hashHex`
 */
export async function verifyPassword(
	plain: string,
	stored: string,
): Promise<boolean> {
	const parts = stored.split("$");
	if (parts.length !== 3) return false;

	const iterations = parseInt(parts[0], 10);
	const salt = fromHex(parts[1]);
	const expectedHash = parts[2];

	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(plain),
		"PBKDF2",
		false,
		["deriveBits"],
	);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt,
			iterations,
			hash: HASH_ALGO,
		},
		keyMaterial,
		KEY_LENGTH,
	);

	const actualHash = toHex(derivedBits);

	// Constant-time comparison to prevent timing attacks
	if (actualHash.length !== expectedHash.length) return false;
	let mismatch = 0;
	for (let i = 0; i < actualHash.length; i++) {
		mismatch |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
	}
	return mismatch === 0;
}

export function parsePasswords(json: string): { assistant: string; admin: string; super_admin: string } {
	try {
		const parsed = JSON.parse(json);
		return {
			assistant: parsed.assistant || "",
			admin: parsed.admin || "",
			super_admin: parsed.super_admin || "",
		};
	} catch {
		return { assistant: "", admin: "", super_admin: "" };
	}
}

export function serializePasswords(pw: { assistant: string; admin: string; super_admin: string }): string {
	return JSON.stringify(pw);
}

export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim()
		.slice(0, 64);
}
