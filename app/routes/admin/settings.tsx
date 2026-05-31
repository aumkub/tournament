import type { Route } from "./+types/admin/settings";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";
import { DEFAULT_EMAIL_BODY } from "../../../lib/email";
import { useState, useRef, useMemo } from "react";
import {
	IconArrowLeft,
	IconSave,
	IconCheck,
	IconX,
	IconCamera,
	IconEye,
	IconCode,
	IconRotateCcw,
	IconSettings,
	IconCalendar,
	IconLink,
	IconKey,
	IconMail,
	ImageIcon,
	IconUser,
	IconUsers,
} from "../../../components/ui/icons";

type Tab = "general" | "schedule" | "registration" | "passwords" | "email";

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug;

	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const tournament = await env.DB.prepare("SELECT * FROM tournaments WHERE slug = ?")
		.bind(slug)
		.first();

	if (!tournament) {
		throw new Response("Tournament not found", { status: 404 });
	}

	let coverPhotoUrl: string | null = null;
	if (tournament.photo_url) {
		coverPhotoUrl = `/api/file?key=${encodeURIComponent(tournament.photo_url as string)}`;
	}

	return { tournament, coverPhotoUrl };
}

export function meta({ data }: Route.MetaArgs) {
	return [{ title: `${data?.tournament?.name || "Admin"} — Settings` }];
}

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
	const t = loaderData.tournament as any;
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
	const coverInputRef = useRef<HTMLInputElement>(null);

	const [activeTab, setActiveTab] = useState<Tab>("general");
	const [coverPreview, setCoverPreview] = useState<string | null>(loaderData.coverPhotoUrl);
	const [coverFile, setCoverFile] = useState<File | null>(null);
	const [emailView, setEmailView] = useState<"edit" | "preview">("edit");

	const [form, setForm] = useState({
		name: t.name || "",
		registration_limit: t.registration_limit || "",
		competitor_limit: t.competitor_limit || "",
		attendee_limit: t.attendee_limit || "",
		registration_open_at: t.registration_open_at ? new Date(t.registration_open_at).toISOString().slice(0, 16) : "",
		registration_close_at: t.registration_close_at ? new Date(t.registration_close_at).toISOString().slice(0, 16) : "",
		checkin_open_at: t.checkin_open_at ? new Date(t.checkin_open_at).toISOString().slice(0, 16) : "",
		checkin_close_at: t.checkin_close_at ? new Date(t.checkin_close_at).toISOString().slice(0, 16) : "",
		email_template_html: t.email_template_html || "",
		competitor_url: t.competitor_url || "competitor",
		attendee_url: t.attendee_url || "attendee",
		passwords: { assistant: "", admin: "", super_admin: "" },
	});

	const previewSrcDoc = useMemo(() => {
		const bodyHtml = form.email_template_html.trim() || DEFAULT_EMAIL_BODY;
		let rendered = bodyHtml;
		const sampleVars: Record<string, string> = {
			registrant_name: "สมชาย ใจดี",
			tournament_name: t.name || "Tournament Name",
			registration_type: "ผู้เข้าแข่งขัน",
			preferred_date: "วันเสาร์ที่ 15 มีนาคม 2568",
			checkin_open_date: "15 มี.ค. 68, 08:00",
			checkin_close_date: "15 มี.ค. 68, 17:00",
			qr_code_image: '<div style="width:200px;height:200px;background:#f0f0f0;border:2px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;margin:0 auto;">QR Code Preview</div>',
			submission_id: "preview-000-000",
		};
		for (const [key, value] of Object.entries(sampleVars)) {
			rendered = rendered.replaceAll("{{" + key + "}}", value);
		}
		return "<!DOCTYPE html><html lang=\"th\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body style=\"margin:0;padding:0;background:#f5f0e8;font-family:sans-serif;font-size:16px;line-height:1.7;\">" + rendered + "</body></html>";
	}, [form.email_template_html, t.name]);

	const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > 10 * 1024 * 1024) {
			setMessage({ ok: false, text: "รูปปกต้องไม่เกิน 10MB" });
			return;
		}
		setCoverFile(file);
		const reader = new FileReader();
		reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
		reader.readAsDataURL(file);
		setMessage(null);
	};

	const handleSave = async () => {
		setSaving(true);
		setMessage(null);
		try {
			const fd = new FormData();
			fd.append("name", form.name);
			fd.append("registration_limit", form.registration_limit || "");
			fd.append("competitor_limit", form.competitor_limit || "");
			fd.append("attendee_limit", form.attendee_limit || "");
			if (form.registration_open_at) fd.append("registration_open_at", form.registration_open_at);
			if (form.registration_close_at) fd.append("registration_close_at", form.registration_close_at);
			if (form.checkin_open_at) fd.append("checkin_open_at", form.checkin_open_at);
			if (form.checkin_close_at) fd.append("checkin_close_at", form.checkin_close_at);
			fd.append("email_template_html", form.email_template_html);
			fd.append("competitor_url", form.competitor_url);
			fd.append("attendee_url", form.attendee_url);
			if (coverFile) fd.append("cover_photo", coverFile);
			if (form.passwords.assistant) fd.append("password_assistant", form.passwords.assistant);
			if (form.passwords.admin) fd.append("password_admin", form.passwords.admin);
			if (form.passwords.super_admin) fd.append("password_super_admin", form.passwords.super_admin);

			const res = await fetch("/api/admin/" + t.slug + "/tournament", { method: "PUT", body: fd });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to save");
			}
			setCoverFile(null);
			setMessage({ ok: true, text: "บันทึกสำเร็จ" });
		} catch (err: any) {
			setMessage({ ok: false, text: err.message });
		} finally {
			setSaving(false);
		}
	};

	const tabs: { id: Tab; label: string; icon: any }[] = [
		{ id: "general", label: "ทั่วไป", icon: <IconSettings size={16} /> },
		{ id: "schedule", label: "วันเวลา", icon: <IconCalendar size={16} /> },
		{ id: "registration", label: "ลงทะเบียน", icon: <IconLink size={16} /> },
		{ id: "passwords", label: "รหัสผ่าน", icon: <IconKey size={16} /> },
		{ id: "email", label: "อีเมล", icon: <IconMail size={16} /> },
	];

	return (
		<div style={{ maxWidth: 800, margin: "0 auto", padding: "var(--spacing-lg)" }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-lg)" }}>
				<h1 style={{ fontSize: 28, display: "flex", alignItems: "center", gap: 8 }}>
					<a href={"/admin/" + t.slug} style={{ color: "var(--color-muted)", textDecoration: "none" }}>
						<IconArrowLeft size={20} />
					</a>
					Settings
				</h1>
				<button className="btn btn-primary" onClick={handleSave} disabled={saving}>
					<IconSave size={16} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
				</button>
			</div>

			{/* Message */}
			{message && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 8,
						padding: "var(--spacing-md)",
						background: message.ok ? "#f0fdf4" : "#fef2f2",
						border: "1px solid " + (message.ok ? "var(--color-success)" : "var(--color-error)"),
						borderRadius: "var(--radius-md)",
						fontSize: 14,
						marginBottom: "var(--spacing-lg)",
					}}
				>
					{message.ok ? <IconCheck size={16} color="var(--color-success)" /> : <IconX size={16} color="var(--color-error)" />}
					{message.text}
				</div>
			)}

			{/* Tabs */}
			<div role="tablist" className="tabs tabs-bordered" style={{ marginBottom: "var(--spacing-lg)" }}>
				{tabs.map((tab) => (
					<button
						key={tab.id}
						role="tab"
						className={"tab" + (activeTab === tab.id ? " tab-active" : "")}
						style={{ gap: 6, fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400 }}
						onClick={() => setActiveTab(tab.id)}
					>
						{tab.icon} {tab.label}
					</button>
				))}
			</div>

			{/* ── Tab: General ──────────────────────────── */}
			{activeTab === "general" && (
				<>
					<div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
						<h2 style={{ fontSize: 18, marginBottom: "var(--spacing-lg)" }}>รูปปกทัวร์นาเมนต์</h2>
						<div
							onClick={() => coverInputRef.current?.click()}
							style={{
								position: "relative",
								width: "100%",
								aspectRatio: "16/7",
								borderRadius: "var(--radius-lg)",
								overflow: "hidden",
								background: "#f5f0e8",
								cursor: "pointer",
								border: "2px dashed #e6dfd8",
								transition: "border-color 0.15s",
							}}
							onMouseOver={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
							onMouseOut={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
						>
							{coverPreview ? (
								<>
									<img src={coverPreview} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
									<div
										style={{
											position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
											display: "flex", alignItems: "center", justifyContent: "center",
											opacity: 0, transition: "opacity 0.2s",
										}}
										onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
										onMouseOut={(e) => (e.currentTarget.style.opacity = "0")}
									>
										<span style={{ color: "white", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
											<IconCamera size={18} color="white" /> เปลี่ยนรูปปก
										</span>
									</div>
								</>
							) : (
								<div style={{
									position: "absolute", inset: 0,
									display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#6c6a64",
								}}>
									<ImageIcon size={40} color="#8e8b82" />
									<span style={{ fontSize: 14 }}>คลิกเพื่ออัพโหลดรูปปก</span>
									<span style={{ fontSize: 12, color: "#8e8b82" }}>แนะนำขนาด 1200x520px, สูงสุด 10MB</span>
								</div>
							)}
						</div>
						<input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} style={{ display: "none" }} />
					</div>

					<div className="card">
						<h2 style={{ fontSize: 18, marginBottom: "var(--spacing-lg)" }}>ข้อมูลทัวร์นาเมนต์</h2>
						<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
							<div>
								<label className="label">ชื่อ</label>
								<input className="input input-bordered w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)", marginBottom: "var(--spacing-lg)" }}>
								<div>
									<label className="label">จำกัดจำนวนรวม (ว่าง = ไม่จำกัด)</label>
									<input className="input input-bordered w-full" type="number" value={form.registration_limit} onChange={(e) => setForm({ ...form, registration_limit: e.target.value })} />
								</div>
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-md)" }}>
									<div>
										<label className="label">จำกัดผู้เข้าแข่งขัน</label>
										<input className="input input-bordered w-full" type="number" placeholder="ว่าง = ตามรวม" value={form.competitor_limit} onChange={(e) => setForm({ ...form, competitor_limit: e.target.value })} />
									</div>
									<div>
										<label className="label">จำกัดผู้เข้าร่วมงาน</label>
										<input className="input input-bordered w-full" type="number" placeholder="ว่าง = ตามรวม" value={form.attendee_limit} onChange={(e) => setForm({ ...form, attendee_limit: e.target.value })} />
									</div>
								</div>
							</div>
						</div>
					</div>
				</>
			)}

			{/* ── Tab: Schedule ─────────────────────────── */}
			{activeTab === "schedule" && (
				<div className="card">
					<h2 style={{ fontSize: 18, marginBottom: "var(--spacing-lg)" }}>วันเวลา</h2>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-md)" }}>
						<div>
							<label className="label">เปิดลงทะเบียน</label>
							<input className="input input-bordered w-full" type="datetime-local" value={form.registration_open_at} onChange={(e) => setForm({ ...form, registration_open_at: e.target.value })} />
						</div>
						<div>
							<label className="label">ปิดลงทะเบียน</label>
							<input className="input input-bordered w-full" type="datetime-local" value={form.registration_close_at} onChange={(e) => setForm({ ...form, registration_close_at: e.target.value })} />
						</div>
						<div>
							<label className="label">เปิดเช็คอิน</label>
							<input className="input input-bordered w-full" type="datetime-local" value={form.checkin_open_at} onChange={(e) => setForm({ ...form, checkin_open_at: e.target.value })} />
						</div>
						<div>
							<label className="label">ปิดเช็คอิน</label>
							<input className="input input-bordered w-full" type="datetime-local" value={form.checkin_close_at} onChange={(e) => setForm({ ...form, checkin_close_at: e.target.value })} />
						</div>
					</div>
				</div>
			)}

			{/* ── Tab: Registration URLs ────────────────── */}
			{activeTab === "registration" && (
				<div className="card">
					<h2 style={{ fontSize: 18, marginBottom: "var(--spacing-sm)" }}>ลิงก์ลงทะเบียน</h2>
					<p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: "var(--spacing-lg)", marginTop: 0 }}>
						แก้ไขชื่อ path หลัง /register/ หรือใส่ URL ภายนอก (เริ่มด้วย https://)
					</p>
					<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
						<div>
							<label className="label">
								<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
									<IconUser size={14} /> ผู้เข้าแข่งขัน (Competitor)
								</span>
							</label>
							<div style={{ display: "flex", alignItems: "center", gap: 0 }}>
								<span style={{
									padding: "8px 12px",
									background: "#f5f0e8",
									border: "1px solid #d5cfc4",
									borderRight: "none",
									borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
									fontSize: 14,
									color: "var(--color-muted)",
									whiteSpace: "nowrap",
									userSelect: "all",
								}}>
									/{t.slug}/register/
								</span>
								<input
									className="input input-bordered"
									style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0", flex: 1 }}
									placeholder="competitor"
									value={form.competitor_url}
									onChange={(e) => setForm({ ...form, competitor_url: e.target.value })}
								/>
							</div>
							<p style={{ fontSize: 12, color: "var(--color-muted)", margin: "4px 0 0" }}>
								URL เต็ม: /{t.slug}/register/{form.competitor_url || "competitor"}
							</p>
						</div>
						<div style={{ borderTop: "1px solid #e6dfd8", paddingTop: "var(--spacing-lg)" }}>
							<label className="label">
								<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
									<IconUsers size={14} /> ผู้เข้าร่วมงาน (Attendee)
								</span>
							</label>
							<div style={{ display: "flex", alignItems: "center", gap: 0 }}>
								<span style={{
									padding: "8px 12px",
									background: "#f5f0e8",
									border: "1px solid #d5cfc4",
									borderRight: "none",
									borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
									fontSize: 14,
									color: "var(--color-muted)",
									whiteSpace: "nowrap",
									userSelect: "all",
								}}>
									/{t.slug}/register/
								</span>
								<input
									className="input input-bordered"
									style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0", flex: 1 }}
									placeholder="attendee"
									value={form.attendee_url}
									onChange={(e) => setForm({ ...form, attendee_url: e.target.value })}
								/>
							</div>
							<p style={{ fontSize: 12, color: "var(--color-muted)", margin: "4px 0 0" }}>
								URL เต็ม: /{t.slug}/register/{form.attendee_url || "attendee"}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* ── Tab: Passwords ────────────────────────── */}
			{activeTab === "passwords" && (
				<div className="card">
					<h2 style={{ fontSize: 18, marginBottom: "var(--spacing-sm)" }}>รหัสผ่าน</h2>
					<p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: "var(--spacing-lg)", marginTop: 0 }}>
						เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน
					</p>
					<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
						<div>
							<label className="label">Assistant Password</label>
							<input className="input input-bordered w-full" type="password" placeholder="......" value={form.passwords.assistant} onChange={(e) => setForm({ ...form, passwords: { ...form.passwords, assistant: e.target.value } })} />
						</div>
						<div>
							<label className="label">Admin Password</label>
							<input className="input input-bordered w-full" type="password" placeholder="......" value={form.passwords.admin} onChange={(e) => setForm({ ...form, passwords: { ...form.passwords, admin: e.target.value } })} />
						</div>
						<div>
							<label className="label">Super Admin Password</label>
							<input className="input input-bordered w-full" type="password" placeholder="......" value={form.passwords.super_admin} onChange={(e) => setForm({ ...form, passwords: { ...form.passwords, super_admin: e.target.value } })} />
						</div>
					</div>
				</div>
			)}

			{/* ── Tab: Email ────────────────────────────── */}
			{activeTab === "email" && (
				<div className="card">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-lg)" }}>
						<h2 style={{ fontSize: 18, margin: 0 }}>Email Template</h2>
						<div style={{ display: "flex", gap: 4 }}>
							<button
								className={"btn btn-sm " + (emailView === "edit" ? "btn-primary" : "btn-ghost")}
								onClick={() => setEmailView("edit")}
							>
								<IconCode size={14} /> HTML
							</button>
							<button
								className={"btn btn-sm " + (emailView === "preview" ? "btn-primary" : "btn-ghost")}
								onClick={() => setEmailView("preview")}
							>
								<IconEye size={14} /> Preview
							</button>
						</div>
					</div>

					{emailView === "edit" ? (
						<div>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-sm)" }}>
								<p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
									ใส่ HTML <strong>เนื้อหาอีเมล</strong> (ส่วน body เท่านั้น)
								</p>
								<button
									className="btn btn-sm btn-ghost"
									onClick={() => setForm({ ...form, email_template_html: DEFAULT_EMAIL_BODY })}
									title="รีเซ็ตเป็นเทมเพลตเริ่มต้น"
								>
									<IconRotateCcw size={14} /> เทมเพลตเริ่มต้น
								</button>
							</div>
							<p style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: "var(--spacing-sm)", marginTop: 0 }}>
								ตัวแปร: {"{{registrant_name}}"} {"{{tournament_name}}"} {"{{registration_type}}"} {"{{preferred_date}}"} {"{{checkin_open_date}}"} {"{{checkin_close_date}}"} {"{{qr_code_image}}"} {"{{submission_id}}"}
							</p>
							<textarea
								className="textarea textarea-bordered w-full"
								style={{ height: 300, fontFamily: "var(--font-mono)", fontSize: 13 }}
								value={form.email_template_html}
								onChange={(e) => setForm({ ...form, email_template_html: e.target.value })}
								placeholder={"Paste your HTML email body here...\nLeave empty to use the default template."}
							/>
						</div>
					) : (
						<div style={{
							border: "1px solid #e6dfd8",
							borderRadius: "var(--radius-md)",
							overflow: "hidden",
							background: "#f5f0e8",
						}}>
							<div style={{
								padding: "8px 12px",
								background: "#faf9f5",
								borderBottom: "1px solid #e6dfd8",
								fontSize: 12,
								color: "#6c6a64",
								display: "flex",
								alignItems: "center",
								gap: 8,
							}}>
								<IconEye size={14} />
								<span>{"ตัวอย่างอีเมล — แสดงผลด้วยข้อมูลตัวอย่าง" + (!form.email_template_html.trim() ? " (ใช้เทมเพลตเริ่มต้น)" : "")}</span>
							</div>
							<iframe
								srcDoc={previewSrcDoc}
								style={{ width: "100%", height: 600, border: "none", display: "block" }}
								sandbox="allow-same-origin"
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
