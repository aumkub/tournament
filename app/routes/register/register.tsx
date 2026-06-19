import { useState, useEffect } from "react";
import type { Route } from "./+types/register/register";
import { CompetitorForm } from "../../../components/forms/CompetitorForm";
import { AttendeeForm } from "../../../components/forms/AttendeeForm";
import { DynamicMultiStepForm } from "../../../components/forms/DynamicMultiStepForm";
import { IconClock, IconCamera } from "../../../components/ui/icons";
import { FORM_CONFIGS, getFormConfigBySlug } from "../../../lib/form-configs/index";
import { resolveFormTypeLabel } from "../../../lib/form-labels";
import type { FormConfig } from "../../../types/form-config";

type Lang = "th" | "en";

function FlagTH({ size = 24 }: { size?: number }) {
	return (
		<svg width={size} height={size * 2 / 3} viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
			<rect width="900" height="600" fill="#A51931"/>
			<rect y="100" width="900" height="400" fill="#F4F5F8"/>
			<rect y="200" width="900" height="200" fill="#2D2A4A"/>
		</svg>
	);
}

function FlagGB({ size = 24 }: { size?: number }) {
	const w = size;
	const h = size * 2 / 3;
	return (
		<svg width={w} height={h} viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
			<rect width="60" height="40" fill="#012169"/>
			{/* Diagonals white */}
			<path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8"/>
			{/* Diagonals red */}
			<path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4"/>
			{/* Cross white */}
			<rect x="25" width="10" height="40" fill="#fff"/>
			<rect y="15" width="60" height="10" fill="#fff"/>
			{/* Cross red */}
			<rect x="27" width="6" height="40" fill="#C8102E"/>
			<rect y="17" width="60" height="6" fill="#C8102E"/>
		</svg>
	);
}

export async function loader({ params, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;
	const type = params.type;

	const tournament = await env.DB.prepare(
		"SELECT * FROM tournaments WHERE slug = ? AND deleted_at IS NULL",
	)
		.bind(slug)
		.first();

	if (!tournament) {
		throw new Response("Tournament not found", { status: 404 });
	}

	// Check dynamic form configs first (form_urls_json maps formId → urlSlug)
	let formId: string | null = null;
	let formUrls: Record<string, string> = {};
	try { formUrls = JSON.parse((tournament.form_urls_json as string) || "{}"); } catch { /* column may not exist yet */ }
	for (const [fid, fslug] of Object.entries(formUrls)) {
		if (type === fslug) { formId = fid; break; }
	}
	// Also match defaultUrlSlug from any registered config
	if (!formId) {
		const configMatch = getFormConfigBySlug(type!);
		if (configMatch) formId = configMatch.id;
	}
	if (!formId && type === ((tournament.competitor_url as string) || "competitor") && tournament.competitor_form_id) {
		formId = tournament.competitor_form_id as string;
	}
	if (!formId && type === ((tournament.attendee_url as string) || "attendee") && tournament.attendee_form_id) {
		formId = tournament.attendee_form_id as string;
	}

	const testMode = !!(tournament.test_mode as number | boolean);

	if (formId) {
		const formConfig = FORM_CONFIGS[formId];
		if (!formConfig) throw new Response("Not found", { status: 404 });
		return {
			slug,
			type: formId,
			typeLabelTh: resolveFormTypeLabel(tournament, formId, "th"),
			typeLabelEn: resolveFormTypeLabel(tournament, formId, "en"),
			tournamentName: tournament.name as string,
			coverUrl: tournament.photo_url ? `/api/file?key=${encodeURIComponent(tournament.photo_url as string)}` : null,
			registrationOpen: tournament.registration_open_at as number,
			registrationClose: tournament.registration_close_at as number,
			formConfig,
			testMode,
		};
	}

	// Resolve legacy competitor / attendee types
	const competitorSuffix = (tournament.competitor_url as string) || "competitor";
	const attendeeSuffix = (tournament.attendee_url as string) || "attendee";

	let registrationType: "competitor" | "attendee" | null = null;
	if (type === competitorSuffix) registrationType = "competitor";
	else if (type === attendeeSuffix) registrationType = "attendee";

	if (!registrationType) {
		if (type === "competitor") registrationType = "competitor";
		else if (type === "attendee") registrationType = "attendee";
	}

	if (!registrationType) {
		throw new Response("Not found", { status: 404 });
	}

	const customTitle = registrationType === "competitor"
		? (tournament.competitor_title as string | null)
		: (tournament.attendee_title as string | null);

	return {
		slug,
		type: registrationType,
		typeLabelTh:
			customTitle || (registrationType === "competitor" ? "ผู้เข้าแข่งขัน" : "ผู้เข้าร่วมงาน"),
		typeLabelEn:
			(registrationType === "competitor"
				? (tournament.competitor_title_en as string | null)
				: (tournament.attendee_title_en as string | null)) ||
			(registrationType === "competitor" ? "Competitor" : "Attendee"),
		tournamentName: tournament.name as string,
		coverUrl: tournament.photo_url ? `/api/file?key=${encodeURIComponent(tournament.photo_url as string)}` : null,
		registrationOpen: tournament.registration_open_at as number,
		registrationClose: tournament.registration_close_at as number,
		formConfig: null,
		testMode,
	};
}

export function meta({ data }: Route.MetaArgs) {
	return [
		{ title: `${data?.tournamentName || "Tournament"} — ${data?.typeLabelTh || "ลงทะเบียน"}` },
	];
}

const LANG_KEY = "register_lang";

export default function RegisterPage({ loaderData }: Route.ComponentProps) {
	const [lang, setLang] = useState<Lang | null>(null);
	const now = Date.now();

	// Restore saved language on mount
	useEffect(() => {
		const saved = localStorage.getItem(LANG_KEY);
		if (saved === "th" || saved === "en") setLang(saved);
	}, []);

	const chooseLang = (l: Lang) => {
		setLang(l);
		localStorage.setItem(LANG_KEY, l);
	};
	const isOpen = now >= loaderData.registrationOpen && now <= loaderData.registrationClose;
	const isCompetitor = loaderData.type === "competitor";
	const typeLabel = lang === "en" ? loaderData.typeLabelEn : loaderData.typeLabelTh;

	return (
		<div>
			{/* Cover Banner */}
			<div
				id="register-cover"
				style={{
					width: "100%",
					aspectRatio: "16/9",
					overflow: "hidden",
					position: "relative",
					background: "#f5f0e8",
				}}
			>
				{loaderData.coverUrl ? (
					<img src={loaderData.coverUrl} alt={loaderData.tournamentName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
						<IconCamera size={36} color="#8e8b82" />
						<span style={{ fontSize: 13 }}>No cover photo</span>
					</div>
				)}
				<div style={{
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					padding: "var(--spacing-lg)",
					background: "linear-gradient(transparent, rgba(20,20,19,0.7))",
					display: "flex",
					alignItems: "flex-end",
					justifyContent: "space-between",
				}}>
					<h1 style={{ fontSize: 24, color: "white", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.3)", opacity: 0 }}>
						{loaderData.tournamentName}
					</h1>
					<span style={{
						fontSize: 13,
						fontWeight: 500,
						padding: "4px 12px",
						borderRadius: "var(--radius-pill)",
						background: "rgba(255,255,255,0.2)",
						color: "white",
						backdropFilter: "blur(4px)",
					}}>
						{lang ? typeLabel : loaderData.typeLabelTh}
					</span>
				</div>
			</div>

			{!isOpen ? (
				<div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--spacing-section) var(--spacing-lg)", textAlign: "center" }}>
					<div className="card" style={{ padding: "var(--spacing-xxl)" }}>
						{now < loaderData.registrationOpen ? (
							<>
								<p style={{ fontSize: 20, color: "var(--color-warning)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
									<IconClock color="var(--color-warning)" /> การลงทะเบียนยังไม่เปิด
								</p>
								<p style={{ color: "var(--color-muted)" }}>
									เปิด: {new Date(loaderData.registrationOpen).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
								</p>
							</>
						) : (
							<p style={{ fontSize: 20, color: "var(--color-error)" }}>ปิดรับลงทะเบียนแล้ว</p>
						)}
					</div>
				</div>
			) : !lang ? (
				/* Language picker */
				<div style={{ maxWidth: 480, margin: "0 auto", padding: "var(--spacing-xxl) var(--spacing-lg)" }}>
					<div className="card" style={{ padding: "var(--spacing-xl)", textAlign: "center" }}>
						<p style={{ fontSize: 15, color: "var(--color-muted)", marginBottom: "var(--spacing-lg)", marginTop: 0 }}>
							{"เลือกภาษา / Select Language"}
						</p>
						<div style={{ display: "flex", gap: "var(--spacing-md)" }}>
							<button
								className="btn btn-secondary"
								style={{ flex: 1, fontSize: 16, padding: "14px 0", flexDirection: "column", gap: 4, height: "auto" }}
								onClick={() => chooseLang("th")}
							>
								<FlagTH size={32} />
								<span style={{ fontWeight: 600 }}>ภาษาไทย</span>
							</button>
							<button
								className="btn btn-secondary"
								style={{ flex: 1, fontSize: 16, padding: "14px 0", flexDirection: "column", gap: 4, height: "auto" }}
								onClick={() => chooseLang("en")}
							>
								<FlagGB size={32} />
								<span style={{ fontWeight: 600 }}>English</span>
							</button>
						</div>
					</div>
				</div>
			) : (
				<div style={{ padding: "var(--spacing-xl) 0 var(--spacing-section)" }}>
					{loaderData.formConfig
						? <DynamicMultiStepForm
							config={loaderData.formConfig as any}
							slug={loaderData.slug}
							tournamentName={loaderData.tournamentName}
							typeLabel={typeLabel}
							lang={lang}
							testMode={loaderData.testMode}
						  />
						: isCompetitor
							? <CompetitorForm slug={loaderData.slug} tournamentName={loaderData.tournamentName} typeLabel={typeLabel} />
							: <AttendeeForm slug={loaderData.slug} tournamentName={loaderData.tournamentName} typeLabel={typeLabel} />
					}
					{/* Floating language switch */}
					<button
						onClick={() => chooseLang(lang === "th" ? "en" : "th")}
						className="fixed bottom-6 left-6 z-[999] flex items-center gap-2 px-3 py-2 rounded-full border border-hairline bg-canvas text-sm font-medium text-body shadow-sm hover:bg-surface-soft transition-colors"
					>
						{lang === "th" ? <FlagGB size={20} /> : <FlagTH size={20} />}
						{lang === "th" ? "English" : "ภาษาไทย"}
					</button>
				</div>
			)}
		</div>
	);
}
