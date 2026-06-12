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
		"SELECT r.*, t.name as tournament_name, t.photo_url, t.competitor_title, t.attendee_title FROM registrations r JOIN tournaments t ON r.tournament_id = t.id WHERE r.id = ? AND t.slug = ?",
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

	return {
		id,
		name,
		email: reg.email as string,
		tournamentName: reg.tournament_name as string,
		coverUrl: reg.photo_url ? `/api/file?key=${encodeURIComponent(reg.photo_url as string)}` : null,
		type: reg.type as string,
		typeLabel,
		qrDataUrl,
	};
}

export function meta({ data }: Route.MetaArgs) {
	return [{ title: "ลงทะเบียนสำเร็จ" }];
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

export default function SuccessPage({ loaderData }: Route.ComponentProps) {
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
			<div className="max-w-[480px] mx-auto px-xl py-lg">

				{/* Success header */}
				<div className="text-center mb-xl">
					<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#f0fdf4] mb-md" style={{ boxShadow: "0 0 0 8px rgba(93,184,114,0.12)" }}>
						<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
							<circle cx="20" cy="20" r="18" stroke="#5db872" strokeWidth="3" fill="rgba(93,184,114,0.1)" />
							<polyline points="11,21 17,27 29,14" stroke="#5db872" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
						</svg>
					</div>
					<h2 className="!text-[28px] font-bold m-0 !mb-1">ลงทะเบียนสำเร็จ!</h2>
					<p className="text-sm text-muted m-0">{loaderData.tournamentName}</p>
				</div>

				{/* Card */}
				<div className="card !p-0 overflow-hidden mb-lg">
					{/* Name + type */}
					{/* <div className="px-lg pt-lg pb-md border-b border-hairline-soft">
						<span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1">{loaderData.typeLabel}</span>
						<p className="text-[20px] font-semibold text-ink m-0">
							{loaderData.name || "—"}
						</p>
					</div> */}

					{/* QR Code */}
					<div className="p-xl flex flex-col items-center gap-md bg-surface-soft">
						<div className="bg-white rounded-xl p-4 shadow-sm inline-block">
							<img src={loaderData.qrDataUrl} alt="QR Code" className="w-[200px] h-[200px] block" />
						</div>
						<p className="text-sm text-muted m-0 text-center">แสดง QR Code นี้ที่จุดเช็คอิน</p>
					</div>

					{/* Registration ID */}
					<div className="flex items-center px-lg py-md border-t border-hairline-soft flex items-center gap-2 text">
						<IconCheckCircle size={14} color="var(--color-success)" />
						<span className="text-sm text-muted">รหัสการลงทะเบียน:</span>
						<span className="text-sm font-mono font-semibold text-body select-all tracking-widest">{loaderData.id}</span>
					</div>
				</div>

				{/* Email sent notice */}
				<div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-hairline bg-surface-soft">
					<div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
						<IconMail size={16} color="var(--color-primary)" />
					</div>
					<div className="min-w-0">
						<p className="text-base font-medium text-body m-0">ส่งอีเมลยืนยันแล้ว</p>
						{loaderData.email && (
							<p className="text-base text-muted m-0 truncate">{loaderData.email}</p>
						)}
					</div>
					<svg className="flex-shrink-0 ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
			</div>
		</div>
	);
}
