import type { Route } from "./+types/register/register";
import { CompetitorForm } from "../../../components/forms/CompetitorForm";
import { AttendeeForm } from "../../../components/forms/AttendeeForm";
import { DynamicMultiStepForm } from "../../../components/forms/DynamicMultiStepForm";
import { IconClock, IconCamera } from "../../../components/ui/icons";
import { FORM_CONFIGS, getFormConfigBySlug } from "../../../lib/form-configs/index";
import type { FormConfig } from "../../../types/form-config";

export async function loader({ params, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;
	const type = params.type;

	const tournament = await env.DB.prepare(
		"SELECT * FROM tournaments WHERE slug = ?",
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

	const testMode = !!(tournament.test_mode as number | boolean);

	if (formId) {
		const formConfig = FORM_CONFIGS[formId];
		if (!formConfig) throw new Response("Not found", { status: 404 });
		return {
			slug,
			type: formId,
			typeLabel: formConfig.label.th,
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
		typeLabel: customTitle || (registrationType === "competitor" ? "ผู้เข้าแข่งขัน" : "ผู้เข้าร่วมงาน"),
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
		{ title: `${data?.tournamentName || "Tournament"} — ${data?.typeLabel || "ลงทะเบียน"}` },
	];
}

export default function RegisterPage({ loaderData }: Route.ComponentProps) {
	const now = Date.now();
	const isOpen = now >= loaderData.registrationOpen && now <= loaderData.registrationClose;
	const isCompetitor = loaderData.type === "competitor";
	const typeLabel = loaderData.typeLabel;

	return (
		<div>
			{/* Cover Banner */}
			<div
				style={{
					width: "100%",
					aspectRatio: "16/7",
					maxHeight: 320,
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
					<h1 style={{ fontSize: 24, color: "white", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
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
						{loaderData.typeLabel}
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
			) : (
				<div style={{ padding: "var(--spacing-xl) 0 var(--spacing-section)" }}>
					{loaderData.formConfig
						? <DynamicMultiStepForm
							config={loaderData.formConfig as any}
							slug={loaderData.slug}
							tournamentName={loaderData.tournamentName}
							typeLabel={loaderData.typeLabel}
							testMode={loaderData.testMode}
						  />
						: isCompetitor
							? <CompetitorForm slug={loaderData.slug} tournamentName={loaderData.tournamentName} typeLabel={loaderData.typeLabel} />
							: <AttendeeForm slug={loaderData.slug} tournamentName={loaderData.tournamentName} typeLabel={loaderData.typeLabel} />
					}
				</div>
			)}
		</div>
	);
}
