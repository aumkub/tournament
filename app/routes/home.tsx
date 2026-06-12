import type { Route } from "./+types/home";
import { IconCamera } from "../../components/ui/icons";
import { FORM_CONFIGS } from "../../lib/form-configs/index";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Tournament Registration System" },
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
		<div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
			{/* Cover Photo */}
			<div
				style={{
					width: "100%",
					aspectRatio: "16/7",
					background: "#f5f0e8",
					overflow: "hidden",
					position: "relative",
				}}
			>
				{t.coverUrl ? (
					<img src={t.coverUrl} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
				) : (
					<div style={{
						width: "100%",
						height: "100%",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: 4,
						color: "#8e8b82",
					}}>
						<IconCamera size={32} color="#8e8b82" />
						<span style={{ fontSize: 12 }}>No cover photo</span>
					</div>
				)}
				{isOpen && (
					<span style={{
						position: "absolute",
						top: 8,
						right: 8,
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						padding: "4px 10px",
						background: "#5db872",
						color: "white",
						fontSize: 11,
						fontWeight: 600,
						borderRadius: "var(--radius-pill)",
					}}>
						<span style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />
						เปิดรับสมัคร
					</span>
				)}
			</div>

			{/* Content */}
			<div style={{ padding: "var(--spacing-lg)" }}>
				<h3 style={{ fontSize: 20, marginBottom: "var(--spacing-sm)" }}>{t.name}</h3>

				{!isOpen && (
					<p style={{ fontSize: 13, color: now < t.registration_open_at ? "var(--color-warning)" : "var(--color-muted)", marginBottom: "var(--spacing-md)", margin: 0 }}>
						{now < t.registration_open_at
							? `เปิด: ${new Date(t.registration_open_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}`
							: "ปิดรับสมัครแล้ว"
						}
					</p>
				)}

				{hasDynamicForms ? (
					<div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)", marginTop: "var(--spacing-md)" }}>
						{dynamicForms.map((f, i) => (
							<a
								key={f.formId}
								href={`/${t.slug}/register/${f.urlSlug}`}
								className={i === 0 ? "btn btn-primary" : "btn btn-secondary"}
								style={{ textDecoration: "none", flex: 1, fontSize: 13, minWidth: 120 }}
							>
								ลงทะเบียน{f.label}
							</a>
						))}
					</div>
				) : (
					<div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-md)" }}>
						<a
							href={competitorHref}
							className="btn btn-primary"
							style={{ textDecoration: "none", flex: 1, fontSize: 13 }}
							target={externalCompetitor ? "_blank" : undefined}
							rel={externalCompetitor ? "noopener noreferrer" : undefined}
						>
							ลงทะเบียน{competitorLabel}
						</a>
						<a
							href={attendeeHref}
							className="btn btn-secondary"
							style={{ textDecoration: "none", flex: 1, fontSize: 13 }}
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
		<div style={{ minHeight: "100vh" }}>
			{/* Hero */}
			<div
				style={{
					padding: "var(--spacing-xxl) var(--spacing-lg)",
					textAlign: "center",
					maxWidth: 800,
					margin: "0 auto",
				}}
			>
				<h1 style={{ fontSize: "clamp(32px, 6vw, 48px)", marginBottom: "var(--spacing-md)", letterSpacing: "-1.5px" }}>
					Tournament Registration
				</h1>
				<p style={{ fontSize: "clamp(14px, 2.5vw, 18px)", color: "var(--color-body)", lineHeight: 1.6, maxWidth: 600, margin: "0 auto" }}>
					ระบบลงทะเบียนและเช็คอินสำหรับงานแข่งขัน
					<br />
					ลงทะเบียน &rarr; รับ QR Code &rarr; เช็คอินวันงาน
				</p>
			</div>

			{/* Tournament List */}
			<div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 var(--spacing-lg) var(--spacing-section)" }}>
				<h2 style={{ fontSize: 28, marginBottom: "var(--spacing-xl)", textAlign: "center" }}>
					ทัวร์นาเมนต์ที่เปิดรับสมัคร
				</h2>

				{tournaments.length === 0 ? (
					<div className="card" style={{ textAlign: "center", color: "var(--color-muted)", padding: "var(--spacing-xxl)" }}>
						<p style={{ fontSize: 18 }}>ยังไม่มีทัวร์นาเมนต์ในขณะนี้</p>
					</div>
				) : (
					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "var(--spacing-lg)" }}>
						{(tournaments as any[]).map((t) => (
							<TournamentCard key={t.id} t={t} />
						))}
					</div>
				)}
			</div>

			{/* Footer */}
			<footer
				style={{
					background: "var(--color-surface-dark)",
					color: "var(--color-on-dark-soft)",
					padding: "var(--spacing-xxl) var(--spacing-lg)",
					textAlign: "center",
					fontSize: 14,
				}}
			>
				<p>Tournament Registration &amp; Check-in System</p>
				<p style={{ fontSize: 12, color: "var(--color-on-dark-soft)", marginTop: 4 }}>
					Built with Cloudflare Workers &bull; React Router 7
				</p>
			</footer>
		</div>
	);
}
