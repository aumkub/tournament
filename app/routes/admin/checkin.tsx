import type { Route } from "./+types/admin/checkin";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";
import { QRScanner } from "../../../components/admin/QRScanner";
import { AdminNav } from "../../../components/admin/AdminNav";
import type { Role } from "../../../types/registration";

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

	// Verify session — assistant+ required
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "assistant")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const tournament = await env.DB.prepare(
		"SELECT id, name, slug FROM tournaments WHERE slug = ?",
	)
		.bind(slug)
		.first();

	if (!tournament) {
		throw new Response("Tournament not found", { status: 404 });
	}

	return {
		id: tournament.id as string,
		name: tournament.name as string,
		slug: tournament.slug as string,
		role: session.role as Role,
	};
}

export function meta({ data }: Route.MetaArgs) {
	return [{ title: `${data?.name || "Admin"} — QR Scanner` }];
}

export default function CheckinPage({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<AdminNav slug={loaderData.slug} name={loaderData.name} role={loaderData.role} current="checkin" />
			<div className="max-w-[480px] mx-auto px-lg">
				<h1 className="text-[24px] text-center mb-xs">
					QR Scanner
				</h1>
				<p className="text-center text-muted text-sm mb-xl">
					{loaderData.name}
				</p>
				<QRScanner slug={loaderData.slug} />
			</div>
		</>
	);
}