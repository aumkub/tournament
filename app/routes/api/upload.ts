import type { Route } from "./+types/api/upload";

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;

	const formData = await request.formData();
	const file = formData.get("file") as File | null;
	const tournamentId = formData.get("tournamentId") as string | null;
	const registrationId = formData.get("registrationId") as string | null;
	const category = formData.get("category") as string | null;

	if (!file || !tournamentId || !category) {
		return Response.json({ error: "Missing required fields" }, { status: 400 });
	}

	const MAX_SIZES: Record<string, number> = {
		photos: 5 * 1024 * 1024,
		videos: 100 * 1024 * 1024,
		documents: 10 * 1024 * 1024,
	};

	const maxSize = MAX_SIZES[category] || 5 * 1024 * 1024;
	if (file.size > maxSize) {
		return Response.json(
			{ error: `File too large. Max ${maxSize / 1024 / 1024}MB` },
			{ status: 400 },
		);
	}

	const regId = registrationId || crypto.randomUUID();
	const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
	const key = `${tournamentId}/${regId}/${category}/${safeFilename}`;

	await env.BUCKET.put(key, file.stream(), {
		httpMetadata: { contentType: file.type },
	});

	return Response.json({ key, registrationId: regId });
}
