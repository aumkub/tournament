import type { Route } from "./+types/admin/dashboard";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";
import { StatsPanel } from "../../../components/admin/StatsPanel";
import { RegistrantTable } from "../../../components/admin/RegistrantTable";
import { CheckinFeed } from "../../../components/admin/CheckinFeed";
import {
	IconArrowLeft,
	IconQrCode,
	IconSettings,
	IconDownload,
	IconLogOut,
} from "../../../components/ui/icons";
import type { Role } from "../../../types/registration";

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

	// Verify session — admin+ required
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "admin")) {
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
	return [{ title: `${data?.name || "Admin"} — Dashboard` }];
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
	const isSuperAdmin = loaderData.role === "super_admin";

	return (
		<div style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--spacing-lg)" }}>
			{/* Header */}
			<div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "var(--spacing-md)", marginBottom: "var(--spacing-xl)" }}>
				<div>
					<h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", marginBottom: 4 }}>{loaderData.name}</h1>
					<p style={{ fontSize: 14, color: "var(--color-muted)", margin: 0 }}>slug: {loaderData.slug}</p>
				</div>
				<div style={{ display: "flex", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
					<a href="/admin" className="btn btn-ghost btn-sm">
						<IconArrowLeft size={16} /> กลับรายการ
					</a>
					<a href={`/admin/${loaderData.slug}/checkin`} className="btn btn-secondary">
						<IconQrCode size={16} /> QR Scanner
					</a>
					{isSuperAdmin ? (
						<a href={`/admin/${loaderData.slug}/settings`} className="btn btn-secondary">
							<IconSettings size={16} /> Settings
						</a>
					) : (
						<button
							className="btn btn-secondary"
							onClick={async () => {
								await fetch("/api/auth/logout", { method: "POST" });
								window.location.href = "/admin";
							}}
						>
							<IconLogOut size={16} /> ออกจากระบบ
						</button>
					)}
					{isSuperAdmin && (
						<a href={`/api/admin/${loaderData.slug}/export`} className="btn btn-primary">
							<IconDownload size={16} /> Export CSV
						</a>
					)}
				</div>
			</div>

			{/* Stats */}
			<div style={{ marginBottom: "var(--spacing-xl)" }}>
				<StatsPanel slug={loaderData.slug} />
			</div>

			{/* Two-column layout */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--spacing-lg)" }} className="md:grid-cols-[1fr_320px]">
				<div>
					<h2 style={{ fontSize: 20, marginBottom: "var(--spacing-lg)" }}>รายชื่อผู้ลงทะเบียน</h2>
					<RegistrantTable slug={loaderData.slug} />
				</div>
				<div>
					<CheckinFeed slug={loaderData.slug} />
				</div>
			</div>
		</div>
	);
}
