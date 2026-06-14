import { useState, useEffect } from "react";
import type { Route } from "./+types/register/success";
import { generateQRCodeDataURL } from "../../../lib/qrcode";
import { IconCamera, IconCheckCircle, IconMail } from "../../../components/ui/icons";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;
	const url = new URL(request.url);
	const id = url.searchParams.get("id");

	if (!id) {
		throw new Response("Missing registration ID", { status: 400 });
	}

	const reg = await env.DB.prepare(
		"SELECT r.*, t.name as tournament_name, t.photo_url, t.competitor_title, t.attendee_title, t.success_messages_json FROM registrations r JOIN tournaments t ON r.tournament_id = t.id WHERE r.id = ? AND t.slug = ?",
	)
		.bind(id, slug)
		.first();

	if (!reg) {
		throw new Response("Registration not found", { status: 404 });
	}

	const qrDataUrl = await generateQRCodeDataURL(reg.id as string);

	let name = "";
	try {
		const data = JSON.parse(reg.data_json as string);
		name = data.child_full_name_th || data.full_name || data.full_name_th || data.full_name_en || "";
	} catch {}

	const typeLabel =
		reg.type === "competitor"
			? ((reg.competitor_title as string) || "ผู้เข้าแข่งขัน")
			: reg.type === "attendee"
			? ((reg.attendee_title as string) || "ผู้เข้าร่วมงาน")
			: (reg.type as string);

	let successMessage = "";
	try {
		const msgs = JSON.parse((reg.success_messages_json as string) || "{}") as Record<string, string>;
		successMessage = (msgs[reg.type as string] || "").trim();
	} catch {}

	return {
		id,
		name,
		email: reg.email as string,
		tournamentName: reg.tournament_name as string,
		coverUrl: reg.photo_url ? `/api/file?key=${encodeURIComponent(reg.photo_url as string)}` : null,
		type: reg.type as string,
		typeLabel,
		qrDataUrl,
		successMessage,
	};
}

export function meta({ data }: Route.MetaArgs) {
	return [{ title: "ลงทะเบียนสำเร็จ" }];
}

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
			<path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8"/>
			<path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4"/>
			<rect x="25" width="10" height="40" fill="#fff"/>
			<rect y="15" width="60" height="10" fill="#fff"/>
			<rect x="27" width="6" height="40" fill="#C8102E"/>
			<rect y="17" width="60" height="6" fill="#C8102E"/>
		</svg>
	);
}

// Confetti particle — pure CSS, no lib needed
function Confetti() {
	const pieces = Array.from({ length: 48 }, (_, i) => i);
	const colors = ["#cc785c", "#5db8a6", "#e8a55a", "#5db872", "#a78bfa", "#f472b6"];

	return (
		<div className="pointer-events-none fixed inset-0 overflow-hidden z-50" aria-hidden>
			<style>{`
				@keyframes confetti-fall {
					0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
					80%  { opacity: 1; }
					100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
				}
				@keyframes confetti-sway {
					0%, 100% { margin-left: 0; }
					50%       { margin-left: 40px; }
				}
				.confetti-piece {
					position: absolute;
					top: -10px;
					animation: confetti-fall linear forwards, confetti-sway ease-in-out infinite;
				}
			`}</style>
			{pieces.map((i) => {
				const color = colors[i % colors.length];
				const left = (i / pieces.length) * 100 + (Math.sin(i * 2.5) * 4);
				const delay = (i * 0.07) % 1.8;
				const duration = 2.2 + (i % 7) * 0.18;
				const swayDuration = 0.8 + (i % 5) * 0.15;
				const size = 6 + (i % 4) * 3;
				const isRect = i % 3 !== 0;
				return (
					<div
						key={i}
						className="confetti-piece"
						style={{
							left: `${left}%`,
							animationDuration: `${duration}s, ${swayDuration}s`,
							animationDelay: `${delay}s, ${delay}s`,
							width: isRect ? size : size * 0.7,
							height: isRect ? size * 0.4 : size * 0.7,
							borderRadius: isRect ? 2 : "50%",
							background: color,
						}}
					/>
				);
			})}
		</div>
	);
}

function QRSaveShare({ qrDataUrl, tournamentName, lang }: { qrDataUrl: string; tournamentName: string; lang: "th" | "en" }) {
	const [canShare, setCanShare] = useState(false);

	useEffect(() => {
		setCanShare(typeof navigator !== "undefined" && !!navigator.share);
	}, []);

	const handleSave = () => {
		const a = document.createElement("a");
		a.href = qrDataUrl;
		a.download = `qr-checkin-${tournamentName.replace(/\s+/g, "-")}.png`;
		a.click();
	};

	const handleShare = async () => {
		try {
			const res = await fetch(qrDataUrl);
			const blob = await res.blob();
			const file = new File([blob], "qr-checkin.png", { type: "image/png" });
			await navigator.share({
				files: [file],
				title: lang === "th" ? `QR Check-in — ${tournamentName}` : `QR Check-in — ${tournamentName}`,
				text: lang === "th"
					? "กรุณาแสดง QR Code นี้ที่จุดเช็คอิน"
					: "Please show this QR Code at the check-in counter",
			});
		} catch {
			// user cancelled or share failed — fall back to save
			handleSave();
		}
	};

	return (
		<div className="flex gap-3">
			<button
				type="button"
				onClick={handleSave}
				className="btn btn-secondary flex-1"
				style={{ gap: 8 }}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
					<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
				</svg>
				{lang === "th" ? "บันทึกรูป" : "Save Image"}
			</button>
			{canShare && (
				<button
					type="button"
					onClick={handleShare}
					className="btn btn-secondary flex-1"
					style={{ gap: 8 }}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
						<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
					</svg>
					{lang === "th" ? "แชร์" : "Share"}
				</button>
			)}
		</div>
	);
}

const LANG_KEY = "register_lang";

export default function SuccessPage({ loaderData }: Route.ComponentProps) {
	const [lang, setLang] = useState<"th" | "en">("th");

	useEffect(() => {
		const saved = localStorage.getItem(LANG_KEY);
		if (saved === "th" || saved === "en") setLang(saved);
	}, []);

	const toggleLang = () => {
		const next = lang === "th" ? "en" : "th";
		setLang(next);
		localStorage.setItem(LANG_KEY, next);
	};

	const hasEmail = !!loaderData.email;

	return (
		<div className="min-h-screen bg-canvas">
			<Confetti />

			{/* Cover Banner */}
			<div className="w-full relative overflow-hidden" style={{ aspectRatio: "16/7", maxHeight: 280, background: "var(--color-surface-soft)" }}>
				{loaderData.coverUrl ? (
					<img src={loaderData.coverUrl} alt={loaderData.tournamentName} className="w-full h-full object-cover" />
				) : (
					<div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ color: "var(--color-muted-soft)" }}>
						<IconCamera size={36} color="var(--color-muted-soft)" />
					</div>
				)}
				<div className="absolute bottom-0 left-0 right-0 p-lg" style={{ background: "linear-gradient(transparent, rgba(20,20,19,0.72))" }} />
			</div>

			{/* Content */}
			<div className="max-w-[480px] mx-auto px-md sm:px-xl py-lg">

				{/* Success header */}
				<div className="text-center mb-xl">
					<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#f0fdf4] mb-md" style={{ boxShadow: "0 0 0 8px rgba(93,184,114,0.12)" }}>
						<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
							<circle cx="20" cy="20" r="18" stroke="#5db872" strokeWidth="3" fill="rgba(93,184,114,0.1)" />
							<polyline points="11,21 17,27 29,14" stroke="#5db872" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
						</svg>
					</div>
					<h2 className="!text-[28px] font-bold m-0 !mb-1">
						{lang === "th" ? "ลงทะเบียนสำเร็จ!" : "Registration Complete!"}
					</h2>
					<p className="text-sm text-muted m-0">{loaderData.tournamentName}</p>
				</div>

				{/* Card */}
				<div className="card !p-0 overflow-hidden mb-lg">
					{/* QR Code */}
					<div className="p-xl flex flex-col items-center gap-md bg-surface-soft">
						<div className="bg-white rounded-xl p-4 shadow-sm inline-block">
							<img src={loaderData.qrDataUrl} alt="QR Code" className="w-[200px] h-[200px] block" />
						</div>
						<p className="text-sm font-medium text-body m-0 text-center">
							{lang === "th"
								? "กรุณาแสดง QR Code นี้ที่จุดเช็คอิน"
								: "Please present this QR Code at the check-in counter"}
						</p>
					</div>

					{/* Registration ID */}
					<div className="flex items-center px-lg py-md border-t border-hairline-soft flex items-center gap-2 text">
						<IconCheckCircle size={14} color="var(--color-success)" />
						<span className="text-sm text-muted">{lang === "th" ? "รหัสการลงทะเบียน:" : "Registration ID:"}</span>
						<span className="text-sm font-mono font-semibold text-body select-all tracking-widest">{loaderData.id}</span>
					</div>
				</div>

				{/* Custom success message from organizer */}
				{loaderData.successMessage && (
					<div className="card mb-lg" style={{ borderLeft: "4px solid var(--color-primary)", background: "var(--color-surface-soft)" }}>
						<p className="text-sm font-semibold text-body m-0 mb-2">
							{lang === "th" ? "ข้อความจากผู้จัดงาน" : "Message from organizer"}
						</p>
						<p className="text-sm text-body m-0 whitespace-pre-wrap leading-relaxed">{loaderData.successMessage}</p>
					</div>
				)}

				{/* Email sent notice */}
				{hasEmail ? (
					<div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-hairline bg-surface-soft mb-md">
						<div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
							<IconMail size={16} color="var(--color-primary)" />
						</div>
						<div className="min-w-0">
							<p className="text-base font-medium text-body m-0">
								{lang === "th" ? "ส่งอีเมลยืนยันแล้ว" : "Confirmation email sent"}
							</p>
							<p className="text-base text-muted m-0 truncate">{loaderData.email}</p>
						</div>
						<svg className="flex-shrink-0 ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</div>
				) : (
					<div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-warning/40 bg-warning/5 mb-md">
						<svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
						</svg>
						<p className="text-sm text-body m-0">
							{lang === "th"
								? "ไม่มีการส่งอีเมลยืนยัน กรุณาบันทึกหรือแชร์ QR Code นี้ไว้เพื่อใช้เช็คอินในวันงาน"
								: "No confirmation email will be sent. Save or share this QR Code — you'll need it to check in on the event day."}
						</p>
					</div>
				)}

				{/* Save/Share QR — always visible */}
				<QRSaveShare qrDataUrl={loaderData.qrDataUrl} tournamentName={loaderData.tournamentName} lang={lang} />
			</div>

			{/* Floating language toggle */}
			<button
				onClick={toggleLang}
				className="fixed bottom-6 left-6 z-[999] flex items-center gap-2 px-3 py-2 rounded-full border border-hairline bg-canvas text-sm font-medium text-body shadow-sm hover:bg-surface-soft transition-colors"
			>
				{lang === "th" ? <FlagGB size={20} /> : <FlagTH size={20} />}
				{lang === "th" ? "English" : "ภาษาไทย"}
			</button>
		</div>
	);
}
