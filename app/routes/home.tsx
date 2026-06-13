import type { Route } from "./+types/home";
import { IconCamera } from "../../components/ui/icons";
import { FORM_CONFIGS } from "../../lib/form-configs/index";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "all Thailand Registration System" },
		{ name: "description", content: "ระบบลงทะเบียนและเช็คอินสำหรับงานแข่งขัน" },
	];
}

export async function loader({ context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const results = await env.DB.prepare(
		"SELECT id, name, slug, photo_url, competitor_url, attendee_url, competitor_title, attendee_title, competitor_title_en, attendee_title_en, form_urls_json, registration_open_at, registration_close_at FROM tournaments ORDER BY created_at DESC",
	).all();

	const tournaments = results.results.map((t: any) => ({
		...t,
		coverUrl: t.photo_url ? `/api/file?key=${encodeURIComponent(t.photo_url)}` : null,
	}));

	return { tournaments };
}

function TournamentCard({ t }: { t: any }) {
	const now = Date.now();
	const isOpen = now >= t.registration_open_at && now <= t.registration_close_at;

	// Parse dynamic form URLs
	let formUrls: Record<string, string> = {};
	try { formUrls = JSON.parse(t.form_urls_json || "{}"); } catch { /* ignore */ }
	const dynamicForms = Object.entries(formUrls).map(([formId, urlSlug]) => {
		const cfg = FORM_CONFIGS[formId];
		return { formId, urlSlug: urlSlug as string, label: cfg?.label.th || formId };
	});
	const hasDynamicForms = dynamicForms.length > 0;

	const resolveUrl = (slug: string, val: string | null, fallback: string) => {
		if (!val) return `/${slug}/register/${fallback}`;
		if (val.startsWith("http://") || val.startsWith("https://")) return val;
		return `/${slug}/register/${val}`;
	};
	const isExternal = (val: string | null) => !!val && (val.startsWith("http://") || val.startsWith("https://"));

	const competitorHref = resolveUrl(t.slug, t.competitor_url, "competitor");
	const attendeeHref = resolveUrl(t.slug, t.attendee_url, "attendee");
	const externalCompetitor = isExternal(t.competitor_url);
	const externalAttendee = isExternal(t.attendee_url);
	const competitorLabel = [t.competitor_title, t.competitor_title_en].filter(Boolean).join(" / ") || "ผู้เข้าแข่งขัน";
	const attendeeLabel = [t.attendee_title, t.attendee_title_en].filter(Boolean).join(" / ") || "ผู้เข้าร่วมงาน";

	return (
		<div className="card flex flex-col overflow-hidden !p-0">
			{/* Cover Photo */}
			<div className="relative overflow-hidden w-full" style={{ aspectRatio: "16/7", background: "var(--color-surface-soft)" }}>
				{t.coverUrl ? (
					<img src={t.coverUrl} alt={t.name} className="w-full h-full object-cover" />
				) : (
					<div className="flex flex-col items-center justify-center gap-1 w-full h-full" style={{ color: "var(--color-muted-soft)" }}>
						<IconCamera size={32} color="var(--color-muted-soft)" />
						<span className="text-xs">No cover photo</span>
					</div>
				)}
				{isOpen && (
					<span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 !text-[13px] font-semibold rounded-md" style={{ background: "rgba(20,20,19,0.55)", color: "#fff", backdropFilter: "blur(6px)" }}>
						<span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] flex-shrink-0" style={{ boxShadow: "0 0 0 2px rgba(74,222,128,0.3)" }} />
						เปิดรับสมัคร
					</span>
				)}
			</div>

			{/* Content */}
			<div className="p-lg">
				<h3 className="text-xl mb-sm">{t.name}</h3>

				{!isOpen && (
					<p className="!text-sm mb-md" style={{
						color: now < t.registration_open_at ? "var(--color-warning)" : "var(--color-muted)",
						margin: 0
					}}>
						{now < t.registration_open_at
							? `เปิด: ${new Date(t.registration_open_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}`
							: "ปิดรับสมัครแล้ว"
						}
					</p>
				)}

				{hasDynamicForms ? (
					<div className="flex flex-wrap gap-sm mt-md">
						{dynamicForms.map((f, i) => (
							<a
								key={f.formId}
								href={`/${t.slug}/register/${f.urlSlug}`}
								className={`btn ${i === 0 ? "btn-primary" : "btn-secondary"} text-base min-w-[120px] flex-1`}
							>
								ลงทะเบียน{f.label}
							</a>
						))}
					</div>
				) : (
					<div className="flex gap-sm mt-md">
						<a
							href={competitorHref}
							className="btn btn-primary text-base flex-1"
							target={externalCompetitor ? "_blank" : undefined}
							rel={externalCompetitor ? "noopener noreferrer" : undefined}
						>
							ลงทะเบียน{competitorLabel}
						</a>
						<a
							href={attendeeHref}
							className="btn btn-secondary text-base flex-1"
							target={externalAttendee ? "_blank" : undefined}
							rel={externalAttendee ? "noopener noreferrer" : undefined}
						>
							ลงทะเบียน{attendeeLabel}
						</a>
					</div>
				)}
			</div>
		</div>
	);
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const tournaments = loaderData.tournaments || [];

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<div className="max-w-[800px] mx-auto px-lg py-xxl text-center">
				<h1 className="!text-[clamp(32px,6vw,40px)] mb-md" style={{ letterSpacing: "-1.5px" }}>
					all Thailand Registration
				</h1>
				<p className="text-[clamp(14px,2.5vw,18px)] mx-auto leading-relaxed max-w-[600px]" style={{ color: "var(--color-body)" }}>
					ระบบลงทะเบียนและเช็คอินสำหรับงานแข่งขัน
					<br />
					ลงทะเบียน &rarr; รับ QR Code &rarr; เช็คอินวันงาน
				</p>
			</div>

			{/* Tournament List */}
			<div className="max-w-[1000px] mx-auto px-lg pb-section">
				<h2 className="!text-2xl mb-xl text-center">
					ทัวร์นาเมนต์ที่เปิดรับสมัคร
				</h2>

				{tournaments.length === 0 ? (
					<div className="card text-center py-xxl" style={{ color: "var(--color-muted)" }}>
						<p className="text-lg">ยังไม่มีทัวร์นาเมนต์ในขณะนี้</p>
					</div>
				) : (
					<div className="grid gap-lg" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
						{(tournaments as any[]).map((t) => (
							<TournamentCard key={t.id} t={t} />
						))}
					</div>
				)}
			</div>

			{/* Footer */}
			<footer className="py-xxl px-lg text-center text-sm" style={{
				background: "var(--color-surface-dark)",
				color: "var(--color-on-dark-soft)"
			}}>
				<p>all Thailand Registration &amp; Check-in System</p>
				<p className="text-smmt-1" style={{ color: "var(--color-on-dark-soft)" }}>
					Built with Cloudflare Workers &bull; React Router 7
				</p>
			</footer>
		</div>
	);
}