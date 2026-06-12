import type { Route } from "./+types/admin/dashboard";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";
import { StatsPanel } from "../../../components/admin/StatsPanel";
import { RegistrantTable } from "../../../components/admin/RegistrantTable";
import { CheckinFeed } from "../../../components/admin/CheckinFeed";
import { AdminNav } from "../../../components/admin/AdminNav";
import { IconDownload } from "../../../components/ui/icons";
import { FORM_CONFIGS } from "../../../lib/form-configs/index";
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
		"SELECT id, name, slug, form_urls_json, competitor_url, attendee_url, competitor_title, attendee_title, competitor_title_en, attendee_title_en FROM tournaments WHERE slug = ?",
	)
		.bind(slug)
		.first();

	if (!tournament) {
		throw new Response("Tournament not found", { status: 404 });
	}

	let formUrls: Record<string, string> = {};
	try { formUrls = JSON.parse((tournament.form_urls_json as string) || "{}"); } catch { /* ignore */ }

	const previewLinks: { label: string; href: string }[] = [];
	for (const [formId, urlSlug] of Object.entries(formUrls)) {
		const cfg = FORM_CONFIGS[formId];
		previewLinks.push({
			label: cfg?.label.th || formId,
			href: `/${slug}/register/${urlSlug}`,
		});
	}
	// Build typeLabels for RegistrantTable — tournament-specific label overrides
	const typeLabels: Record<string, string> = {};
	for (const [formId] of Object.entries(formUrls)) {
		// dynamic forms already resolved via FORM_CONFIGS in client, skip
		void formId;
	}
	const compLabel = (tournament.competitor_title as string) || "ผู้เข้าแข่งขัน";
	const attLabel = (tournament.attendee_title as string) || "ผู้เข้าร่วมงาน";
	typeLabels["competitor"] = compLabel;
	typeLabels["attendee"] = attLabel;

	if (previewLinks.length === 0) {
		const compUrl = (tournament.competitor_url as string) || "competitor";
		const attUrl = (tournament.attendee_url as string) || "attendee";
		previewLinks.push({ label: compLabel, href: `/${slug}/register/${compUrl}` });
		previewLinks.push({ label: attLabel, href: `/${slug}/register/${attUrl}` });
	}

	return {
		id: tournament.id as string,
		name: tournament.name as string,
		slug: tournament.slug as string,
		role: session.role as Role,
		previewLinks,
		typeLabels,
	};
}

export function meta({ data }: Route.MetaArgs) {
	return [{ title: `${data?.name || "Admin"} — Dashboard` }];
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<AdminNav slug={loaderData.slug} name={loaderData.name} role={loaderData.role} current="dashboard" />
			<div className="max-w-[1200px] mx-auto px-lg mt-6">
				{/* Header */}
				<div className="mb-xl flex items-start justify-between gap-md flex-wrap">
					<div>
						<h1 className="!text-[clamp(22px,4vw,28px)] !mb-1">{loaderData.name}</h1>
						<p className="text-sm text-muted m-0">slug: {loaderData.slug}</p>
					</div>
					<div className="flex gap-sm flex-wrap items-center">
						{loaderData.previewLinks.map((link) => (
							<a
								key={link.href}
								href={link.href}
								target="_blank"
								rel="noopener noreferrer"
								className="btn btn-sm btn-ghost no-underline text-base gap-1"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
									<polyline points="15 3 21 3 21 9"/>
									<line x1="10" y1="14" x2="21" y2="3"/>
								</svg>
								{link.label}
							</a>
						))}
						{loaderData.role === "super_admin" && (
							<a
								href={`/api/admin/${loaderData.slug}/export`}
								className="btn btn-sm btn-secondary no-underline gap-1.5"
							>
								<IconDownload size={14} />
								Export
							</a>
						)}
					</div>
				</div>

				{/* Stats */}
				<div className="mb-xl">
					<StatsPanel slug={loaderData.slug} />
				</div>

				{/* Two-column layout */}
				<div className="grid grid-cols-1 gap-lg md:grid-cols-[1fr_320px]">
					<div>
						<h2 className="text-2xl mb-lg">รายชื่อผู้ลงทะเบียน</h2>
						<RegistrantTable slug={loaderData.slug} typeLabels={loaderData.typeLabels} role={loaderData.role} />
					</div>
					<div>
						<CheckinFeed slug={loaderData.slug} typeLabels={loaderData.typeLabels} />
					</div>
				</div>
			</div>
		</>
	);
}