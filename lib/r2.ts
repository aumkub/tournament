export function getPublicUrl(bucketPublicDomain: string, key: string): string {
	return `https://${bucketPublicDomain}/${key}`;
}

/** Local R2 first; fall back to BUCKET_REMOTE (remote prod bucket) in dev. */
export async function getR2Object(env: Env, key: string): Promise<R2ObjectBody | null> {
	const local = await env.BUCKET.get(key);
	if (local) return local;
	if (env.BUCKET_REMOTE) return env.BUCKET_REMOTE.get(key);
	return null;
}

export function buildUploadKey(
	tournamentId: string,
	registrationId: string,
	category: "photos" | "videos" | "documents",
	filename: string,
): string {
	return `${tournamentId}/${registrationId}/${category}/${filename}`;
}

export function buildQRCodeKey(registrationId: string): string {
	return `qrcodes/${registrationId}.png`;
}

export async function generatePresignedUrl(
	bucket: R2Bucket,
	key: string,
	expiresInSeconds = 3600,
): Promise<string> {
	// R2 presigned URL via createPresignedUrl (available in Workers runtime)
	// Fallback: return a server upload endpoint if presign not available
	const url = await (bucket as any).createPresignedUrl?.(key, {
		expiresIn: expiresInSeconds,
		method: "PUT",
	});
	if (url) return url;

	// Fallback: We'll use a direct upload API route instead
	throw new Error("Presigned URLs not available — use direct upload endpoint");
}
