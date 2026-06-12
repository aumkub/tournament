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
		<div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
			{/* Cover Banner */}
			<div style={{ width: "100%", aspectRatio: "16/7", maxHeight: 280, overflow: "hidden", position: "relative", background: "#f5f0e8" }}>
				{loaderData.coverUrl ? (
					<img src={loaderData.coverUrl} alt={loaderData.tournamentName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
				) : (
					<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "#8e8b82" }}>
						<IconCamera size={36} color="#8e8b82" />
					</div>
				)}
				<div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "var(--spacing-lg)", background: "linear-gradient(transparent, rgba(20,20,19,0.72))" }}>
					<h1 style={{ fontSize: 22, color: "white", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
						{loaderData.tournamentName}
					</h1>
				</div>
			</div>

			{/* Content */}
			<div style={{ maxWidth: 480, margin: "0 auto", padding: "var(--spacing-xl) var(--spacing-lg)" }}>

				{/* Success header */}
				<div style={{ textAlign: "center", marginBottom: "var(--spacing-xl)" }}>
					<div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4", marginBottom: "var(--spacing-md)" }}>
						<IconPartyPopper size={32} color="var(--color-success)" />
					</div>
					<h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>ลงทะเบียนสำเร็จ!</h2>
					<p style={{ fontSize: 14, color: "var(--color-muted)", margin: 0 }}>กรุณาบันทึก QR Code ด้านล่างเพื่อใช้เช็คอินวันงาน</p>
				</div>

				{/* Card */}
				<div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "var(--spacing-lg)" }}>
					{/* Name + type */}
					<div style={{ padding: "var(--spacing-lg) var(--spacing-lg) var(--spacing-md)", borderBottom: "1px solid var(--color-hairline-soft)" }}>
						<span className="badge-pill" style={{ fontSize: 12, marginBottom: 8, display: "inline-block" }}>
							{loaderData.typeLabel}
						</span>
						<p style={{ fontSize: 20, fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>
							{loaderData.name || "—"}
						</p>
					</div>

					{/* QR Code */}
					<div style={{ padding: "var(--spacing-xl)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-md)", background: "var(--color-surface-soft)" }}>
						<div style={{
							background: "white",
							borderRadius: "var(--radius-lg)",
							padding: 16,
							boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
							display: "inline-block",
						}}>
							<img src={loaderData.qrDataUrl} alt="QR Code" style={{ width: 200, height: 200, display: "block" }} />
						</div>
						<p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0, textAlign: "center" }}>
							แสดง QR Code นี้ที่จุดเช็คอิน
						</p>
					</div>

					{/* Registration ID */}
					<div style={{ padding: "var(--spacing-md) var(--spacing-lg)", borderTop: "1px solid var(--color-hairline-soft)", display: "flex", alignItems: "center", gap: 8 }}>
						<IconCheckCircle size={14} color="var(--color-success)" />
						<span style={{ fontSize: 12, color: "var(--color-muted)" }}>รหัสการลงทะเบียน:</span>
						<span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--color-body)", userSelect: "all" }}>{loaderData.id}</span>
					</div>
				</div>

				<p style={{ fontSize: 13, color: "var(--color-muted)", textAlign: "center" }}>
					ระบบได้ส่งอีเมลยืนยันไปที่อีเมลที่ลงทะเบียนแล้ว
				</p>
			</div>
		</div>
	);
}
