import type { Route } from "./+types/home";
import { IconCamera } from "../../components/ui/icons";
import { FORM_CONFIGS } from "../../lib/form-configs/index";
import { getSiteSettings } from "../../lib/site-settings";

export function meta({ data }: Route.MetaArgs) {
	return [
		{ title: data?.siteSettings?.metaTitle ?? "all Thailand Registration System" },
		{
			name: "description",
			content: data?.siteSettings?.metaDescription ?? "ระบบลงทะเบียนและเช็คอินสำหรับงานแข่งขัน",
		},
	];
}

export async function loader({ context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const siteSettings = await getSiteSettings(env.DB);

	const results = await env.DB.prepare(
		"SELECT id, name, slug, photo_url, competitor_url, attendee_url, competitor_title, attendee_title, competitor_form_id, attendee_form_id, form_urls_json, registration_open_at, registration_close_at FROM tournaments WHERE deleted_at IS NULL ORDER BY created_at DESC",
	).all();

	const tournaments = results.results.map((t: any) => ({
		...t,
		coverUrl: t.photo_url ? `/api/file?key=${encodeURIComponent(t.photo_url)}` : null,
	}));

	return { tournaments, siteSettings };
}

function thaiFormLabel(
	title: string | null | undefined,
	formId: string | null | undefined,
	fallback: string,
): string {
	if (title?.trim()) return title.trim();
	if (formId && FORM_CONFIGS[formId]?.label.th) return FORM_CONFIGS[formId].label.th;
	return fallback;
}

function buildRegistrationButtons(t: any) {
	const resolveUrl = (val: string | null, fallback: string) => {
		if (!val) return `/${t.slug}/register/${fallback}`;
		if (val.startsWith("http://") || val.startsWith("https://")) return val;
		return `/${t.slug}/register/${val}`;
	};
	const isExternal = (val: string | null) =>
		!!val && (val.startsWith("http://") || val.startsWith("https://"));

	let formUrls: Record<string, string> = {};
	try {
		formUrls = JSON.parse(t.form_urls_json || "{}");
	} catch {
		/* ignore */
	}

	const formUrlEntries = Object.entries(formUrls);
	if (formUrlEntries.length > 0) {
		return formUrlEntries.map(([formId, urlSlug], i) => ({
			href: `/${t.slug}/register/${urlSlug}`,
			label: `ลงทะเบียน ${thaiFormLabel(
				formId === t.competitor_form_id
					? t.competitor_title
					: formId === t.attendee_form_id
						? t.attendee_title
						: null,
				formId,
				formId,
			)}`,
			primary: i === 0,
			external: false,
		}));
	}

	const competitorFallback =
		(t.competitor_form_id && FORM_CONFIGS[t.competitor_form_id]?.defaultUrlSlug) || "competitor";
	const attendeeFallback =
		(t.attendee_form_id && FORM_CONFIGS[t.attendee_form_id]?.defaultUrlSlug) || "attendee";

	return [
		{
			href: resolveUrl(t.competitor_url, competitorFallback),
			label: `ลงทะเบียน ${thaiFormLabel(t.competitor_title, t.competitor_form_id, "ผู้เข้าแข่งขัน")}`,
			primary: true,
			external: isExternal(t.competitor_url),
		},
		{
			href: resolveUrl(t.attendee_url, attendeeFallback),
			label: `ลงทะเบียน ${thaiFormLabel(t.attendee_title, t.attendee_form_id, "ผู้ชม")}`,
			primary: false,
			external: isExternal(t.attendee_url),
		},
	];
}

function TournamentCard({ t }: { t: any }) {
	const now = Date.now();
	const isOpen = now >= t.registration_open_at && now <= t.registration_close_at;
	const registrationButtons = buildRegistrationButtons(t);

	return (
		<div className="card flex flex-col overflow-hidden !p-0">
			{/* Cover Photo */}
			<div className="relative overflow-hidden w-full" style={{ aspectRatio: "16/9", background: "var(--color-surface-soft)" }}>
				{t.coverUrl ? (
					<img src={t.coverUrl} alt={t.name} className="w-full h-full object-cover" />
				) : (
					<div className="flex flex-col items-center justify-center gap-1 w-full h-full" style={{ color: "var(--color-muted-soft)" }}>
						<IconCamera size={32} color="var(--color-muted-soft)" />
						<span className="text-xs">ไม่มีรูปปก</span>
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

				<div className="flex flex-col md:flex-row flex-wrap gap-sm mt-md">
					{registrationButtons.map((btn) => (
						<a
							key={btn.href}
							href={btn.href}
							className={`btn ${btn.primary ? "btn-primary" : "btn-secondary"} text-base min-w-[120px] flex-1`}
							target={btn.external ? "_blank" : undefined}
							rel={btn.external ? "noopener noreferrer" : undefined}
						>
							{btn.label}
						</a>
					))}
				</div>
			</div>
		</div>
	);
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const tournaments = loaderData.tournaments || [];
	const settings = loaderData.siteSettings;
	const descriptionLines = settings.homeDescription.split("\n").filter(Boolean);

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<div className="max-w-[800px] mx-auto px-lg py-xxl text-center">
				<h1 className="!text-[clamp(32px,6vw,40px)] mb-md" style={{ letterSpacing: "-1.5px" }}>
					{settings.homeTitle}
				</h1>
				<p className="text-[clamp(14px,2.5vw,18px)] mx-auto leading-relaxed max-w-[600px]" style={{ color: "var(--color-body)" }}>
					{descriptionLines.map((line, i) => (
						<span key={i}>
							{i > 0 && <br />}
							{line}
						</span>
					))}
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
				<p>{settings.footerLine1}</p>
				{settings.footerLine2 && (
					<p className="text-smmt-1" style={{ color: "var(--color-on-dark-soft)" }}>
						{settings.footerLine2}
					</p>
				)}
			</footer>
		</div>
	);
}