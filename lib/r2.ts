export function getPublicUrl(bucketPublicDomain: string, key: string): string {
	return `https://${bucketPublicDomain}/${key}`;
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
