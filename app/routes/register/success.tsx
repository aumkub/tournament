import type { Route } from "./+types/register/success";
import { generateQRCodeDataURL } from "../../../lib/qrcode";
import { IconPartyPopper, IconCamera, IconCheckCircle } from "../../../components/ui/icons";

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

	const qrDataUrl = await generateQRCodeDataURL(reg.qr_code_token as string);

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

export default function SuccessPage({ loaderData }: Route.ComponentProps) {
	return (
		<div className="min-h-screen bg-canvas">
			{/* Cover Banner */}
			<div className="w-full relative overflow-hidden" style={{ aspectRatio: "16/7", maxHeight: 280, background: "var(--color-surface-soft)" }}>
				{loaderData.coverUrl ? (
					<img src={loaderData.coverUrl} alt={loaderData.tournamentName} className="w-full h-full object-cover" />
				) : (
					<div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ color: "var(--color-muted-soft)" }}>
						<IconCamera size={36} color="var(--color-muted-soft)" />
					</div>
				)}
				<div className="absolute bottom-0 left-0 right-0 p-lg" style={{ background: "linear-gradient(transparent, rgba(20,20,19,0.72))" }}>
					<h1 className="text-[22px] text-white m-0" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
						{loaderData.tournamentName}
					</h1>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-[480px] mx-auto px-xl p-lg">

				{/* Success header */}
				<div className="text-center mb-xl">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#f0fdf4] mb-md">
						<IconPartyPopper size={32} color="var(--color-success)" />
					</div>
					<h2 className="text-[26px] font-bold m-0 mb-1.5">ลงทะเบียนสำเร็จ!</h2>
					<p className="text-sm text-muted m-0">กรุณาบันทึก QR Code ด้านล่างเพื่อใช้เช็คอินวันงาน</p>
				</div>

				{/* Card */}
				<div className="card p-0 overflow-hidden mb-lg">
					{/* Name + type */}
					<div className="p-lg p-lg p-md border-b border-hairline-soft">
						<span className="badge-pill text-[12px] mb-2 inline-block">
							{loaderData.typeLabel}
						</span>
						<p className="text-[20px] font-semibold text-ink m-0">
							{loaderData.name || "—"}
						</p>
					</div>

					{/* QR Code */}
					<div className="p-xl flex flex-col items-center gap-md bg-surface-soft">
						<div className="bg-white rounded-lg p-4 shadow inline-block">
							<img src={loaderData.qrDataUrl} alt="QR Code" className="w-[200px] h-[200px] block" />
						</div>
						<p className="text-xs text-muted m-0 text-center">
							แสดง QR Code นี้ที่จุดเช็คอิน
						</p>
					</div>

					{/* Registration ID */}
					<div className="p-md p-lg border-t border-hairline-soft flex items-center gap-2">
						<IconCheckCircle size={14} color="var(--color-success)" />
						<span className="text-xs text-muted">รหัสการลงทะเบียน:</span>
						<span className="text-xs font-mono text-body select-all">{loaderData.id}</span>
					</div>
				</div>

				<p className="text-xs text-muted text-center">
					ระบบได้ส่งอีเมลยืนยันไปที่อีเมลที่ลงทะเบียนแล้ว
				</p>
			</div>
		</div>
	);
}