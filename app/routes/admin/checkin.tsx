import type { Route } from "./+types/admin/checkin";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";
import { QRScanner } from "../../../components/admin/QRScanner";
import { AdminNav } from "../../../components/admin/AdminNav";
import type { Role } from "../../../types/registration";

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

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
			<div className="max-w-[440px] mx-auto px-lg py-xl">
				<div className="text-center mb-lg">
					<h2 className="text-[20px] font-semibold m-0 mb-1">QR Scanner</h2>
					<p className="text-sm text-muted m-0">{loaderData.name}</p>
				</div>
				<QRScanner slug={loaderData.slug} />
			</div>
		</>
	);
}
