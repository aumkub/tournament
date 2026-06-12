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
			<div style={{ maxWidth: 480, margin: "0 auto", padding: "var(--spacing-lg)" }}>
				<h1 style={{ fontSize: 24, textAlign: "center", marginBottom: "var(--spacing-xs)" }}>
					QR Scanner
				</h1>
				<p style={{ textAlign: "center", color: "var(--color-muted)", fontSize: 14, marginBottom: "var(--spacing-xl)" }}>
					{loaderData.name}
				</p>
				<QRScanner slug={loaderData.slug} />
			</div>
		</>
	);
}
