import type { Route } from "./+types/api/file";
import { getR2Object } from "../../../lib/r2";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const url = new URL(request.url);
	const key = url.searchParams.get("key");

	if (!key) {
		return new Response("Missing key", { status: 400 });
	}

	const object = await getR2Object(env, key);
	if (!object) {
		return new Response("Not found", { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("Cache-Control", "public, max-age=86400");
	headers.set("ETag", object.httpEtag);

	return new Response(object.body, { headers });
}
