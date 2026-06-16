import type { Route } from "./+types/admin/settings";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";
import { FORM_CONFIGS } from "../../../lib/form-configs/index";
import { getDefaultEmailTemplate, EMAIL_TEMPLATE_LABELS, EMAIL_TEMPLATE_VARS } from "../../../lib/email-templates/index";
import { useState, useRef, useMemo } from "react";
import {
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
	IconAlertTriangle,
} from "../../../components/ui/icons";
import { AdminNav } from "../../../components/admin/AdminNav";

type Tab = "general" | "schedule" | "registration" | "passwords" | "email" | "reset";

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

	const [form, setForm] = useState({
		name: t.name || "",
		slug: t.slug || "",
		registration_limit: t.registration_limit || "",
		competitor_limit: t.competitor_limit || "",
		attendee_limit: t.attendee_limit || "",
		registration_open_at: t.registration_open_at ? new Date(t.registration_open_at).toISOString().slice(0, 16) : "",
		registration_close_at: t.registration_close_at ? new Date(t.registration_close_at).toISOString().slice(0, 16) : "",
		checkin_open_at: t.checkin_open_at ? new Date(t.checkin_open_at).toISOString().slice(0, 16) : "",
		checkin_close_at: t.checkin_close_at ? new Date(t.checkin_close_at).toISOString().slice(0, 16) : "",
		competitor_url: t.competitor_url || "competitor",
		attendee_url: t.attendee_url || "attendee",
		competitor_title: t.competitor_title || "",
		attendee_title: t.attendee_title || "",
		competitor_title_en: t.competitor_title_en || "",
		attendee_title_en: t.attendee_title_en || "",
		passwords: { assistant: "", admin: "", super_admin: "" },
	});

	// Dynamic form config state
	const [competitorFormId, setCompetitorFormId] = useState<string>(t.competitor_form_id || "");
	const [attendeeFormId, setAttendeeFormId] = useState<string>(t.attendee_form_id || "");
	const [testMode, setTestMode] = useState<boolean>(!!t.test_mode);
	const [successMessages, setSuccessMessages] = useState<Record<string, string>>(() => {
		try { return JSON.parse(t.success_messages_json || "{}"); } catch { return {}; }
	});
	const [emailTemplates, setEmailTemplates] = useState<Record<string, string>>(() => {
		try { return JSON.parse(t.email_templates_json || "{}"); } catch { return {}; }
	});
	const [activeEmailType, setActiveEmailType] = useState<string>("attendee");
	const [emailView, setEmailView] = useState<"edit" | "preview">("edit");

	const emailFormTypes = Object.keys(FORM_CONFIGS);

	const SAMPLE_VARS: Record<string, Record<string, string>> = {
		attendee: {
			registrant_name: "สมชาย ใจดี",
			tournament_name: t.name || "Tournament Name",
			registration_type: "ผู้ชม",
			attendance_days: "วันเสาร์, วันอาทิตย์",
			checkin_open_date: "15 มี.ค. 68, 08:00",
			checkin_close_date: "15 มี.ค. 68, 17:00",
			qr_code_image: '<div style="width:200px;height:200px;background:#f0f0f0;border:2px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;margin:0 auto;">QR Code Preview</div>',
			submission_id: "preview-000-000",
		},
		youth: {
			registrant_name: "พ่อแม่ผู้ปกครอง",
			tournament_name: t.name || "Tournament Name",
			registration_type: "เยาวชน",
			child_name: "น้องกอล์ฟ",
			youth_path_label: "ทั่วไป (Path A)",
			checkin_open_date: "15 มี.ค. 68, 08:00",
			checkin_close_date: "15 มี.ค. 68, 17:00",
			qr_code_image: '<div style="width:200px;height:200px;background:#f0f0f0;border:2px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;margin:0 auto;">QR Code Preview</div>',
			submission_id: "preview-000-000",
		},
	};

	const buildPreview = useMemo(() => {
		return (type: string) => {
			const bodyHtml = emailTemplates[type] || getDefaultEmailTemplate(type);
			let rendered = bodyHtml;
			const vars = SAMPLE_VARS[type] || SAMPLE_VARS["attendee"];
			for (const [key, value] of Object.entries(vars)) {
				rendered = rendered.replaceAll("{{" + key + "}}", value);
			}
			return "<!DOCTYPE html><html lang=\"th\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body style=\"margin:0;padding:0;background:#f5f0e8;font-family:sans-serif;font-size:16px;line-height:1.7;\">" + rendered + "</body></html>";
		};
	}, [emailTemplates, t.name]);

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
			fd.append("slug", form.slug);
			fd.append("registration_limit", form.registration_limit || "");
			fd.append("competitor_limit", form.competitor_limit || "");
			fd.append("attendee_limit", form.attendee_limit || "");
			if (form.registration_open_at) fd.append("registration_open_at", form.registration_open_at);
			if (form.registration_close_at) fd.append("registration_close_at", form.registration_close_at);
			if (form.checkin_open_at) fd.append("checkin_open_at", form.checkin_open_at);
			if (form.checkin_close_at) fd.append("checkin_close_at", form.checkin_close_at);
			fd.append("email_templates_json", JSON.stringify(emailTemplates));
			fd.append("success_messages_json", JSON.stringify(successMessages));
			fd.append("competitor_url", form.competitor_url);
			fd.append("attendee_url", form.attendee_url);
			fd.append("competitor_title", form.competitor_title);
			fd.append("attendee_title", form.attendee_title);
			fd.append("competitor_title_en", form.competitor_title_en);
			fd.append("attendee_title_en", form.attendee_title_en);
			if (coverFile) fd.append("cover_photo", coverFile);
			fd.append("competitor_form_id", competitorFormId);
			fd.append("attendee_form_id", attendeeFormId);
			fd.append("test_mode", testMode ? "1" : "0");
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
			if (form.slug && form.slug !== t.slug) {
				window.location.href = `/portal/${form.slug}/settings`;
			}
		} catch (err: any) {
			setMessage({ ok: false, text: err.message });
		} finally {
			setSaving(false);
		}
	};

	const tabs: { id: Tab; label: string; icon: any }[] = [
		{ id: "general", label: "ทั่วไป", icon: <IconSettings size={16} /> },
		{ id: "schedule", label: "วันเวลา", icon: <IconCalendar size={16} /> },
		{ id: "registration", label: "ลงทะเบียน & ฟอร์ม", icon: <IconLink size={16} /> },
		{ id: "passwords", label: "รหัสผ่าน", icon: <IconKey size={16} /> },
		{ id: "email", label: "อีเมล", icon: <IconMail size={16} /> },
		{ id: "reset", label: "ล้างค่า", icon: <IconAlertTriangle size={16} /> },
	];

	// Reset tab state
	const [resetRegConfirm, setResetRegConfirm] = useState("");
	const [resetCheckinConfirm, setResetCheckinConfirm] = useState("");
	const [resetRegLoading, setResetRegLoading] = useState(false);
	const [resetCheckinLoading, setResetCheckinLoading] = useState(false);
	const [resetMessage, setResetMessage] = useState<{ ok: boolean; text: string } | null>(null);

	const handleClearRegistrations = async () => {
		if (resetRegConfirm !== "ยืนยันการลบ") return;
		setResetRegLoading(true);
		setResetMessage(null);
		try {
			const res = await fetch(`/api/admin/${t.slug}/clear-registrations`, { method: "POST" });
			const json = await res.json() as { ok?: boolean; error?: string };
			setResetMessage(json.ok ? { ok: true, text: "ลบข้อมูลการลงทะเบียนและไฟล์แนบทั้งหมดแล้ว" } : { ok: false, text: json.error ?? "เกิดข้อผิดพลาด" });
			if (json.ok) setResetRegConfirm("");
		} catch { setResetMessage({ ok: false, text: "เกิดข้อผิดพลาด" }); }
		setResetRegLoading(false);
	};

	const handleClearCheckins = async () => {
		if (resetCheckinConfirm !== "ยืนยันการลบ") return;
		setResetCheckinLoading(true);
		setResetMessage(null);
		try {
			const res = await fetch(`/api/admin/${t.slug}/clear-checkins`, { method: "POST" });
			const json = await res.json() as { ok?: boolean; error?: string };
			setResetMessage(json.ok ? { ok: true, text: "รีเซ็ตการเช็คอินทั้งหมดแล้ว" } : { ok: false, text: json.error ?? "เกิดข้อผิดพลาด" });
			if (json.ok) setResetCheckinConfirm("");
		} catch { setResetMessage({ ok: false, text: "เกิดข้อผิดพลาด" }); }
		setResetCheckinLoading(false);
	};

	return (
		<>
		<AdminNav slug={t.slug} name={t.name} role="super_admin" current="settings" />
		<div style={{ maxWidth: 800, margin: "0 auto", padding: "var(--spacing-lg)" }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-lg)" }}>
				<h1 style={{ fontSize: 28 }}>Settings</h1>
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
			<div className="flex gap-1 mb-lg border-b border-hairline overflow-x-auto">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors bg-transparent border-x-0 border-t-0 cursor-pointer ${
							activeTab === tab.id
								? "border-b-primary text-primary"
								: "border-b-transparent text-muted hover:text-body hover:border-b-hairline"
						}`}
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
								aspectRatio: "16/9",
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
							<div>
								<label className="label">Slug (URL)</label>
								<div style={{ display: "flex", alignItems: "center" }}>
									<span style={{ padding: "8px 12px", background: "#f5f0e8", border: "1px solid #d5cfc4", borderRight: "none", borderRadius: "var(--radius-md) 0 0 var(--radius-md)", fontSize: 13, color: "var(--color-muted)", whiteSpace: "nowrap" }}>
										/admin/
									</span>
									<input
										className="input input-bordered"
										style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0", flex: 1 }}
										value={form.slug}
										onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })}
									/>
								</div>
								<p style={{ fontSize: 12, color: "var(--color-muted)", margin: "4px 0 0" }}>เปลี่ยน slug จะ redirect ไปหน้าใหม่อัตโนมัติ</p>
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

			{/* ── Tab: Registration & Forms ─────────────── */}
			{activeTab === "registration" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>

					{/* ── Test Mode ── */}
					<div className={`card flex items-center justify-between gap-md transition-colors ${testMode ? "border-warning bg-[#fffbeb]" : ""}`}>
						<div className="flex items-center gap-3 min-w-0">
							<div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${testMode ? "bg-warning/15" : "bg-surface-soft"}`}>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={testMode ? "#d4a017" : "var(--color-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M9 3v8.5L4.5 18A2 2 0 0 0 6.31 21h11.38a2 2 0 0 0 1.81-2.5L15 11.5V3"/>
									<line x1="9" y1="3" x2="15" y2="3"/>
								</svg>
							</div>
							<div>
								<p className="text-sm font-semibold text-ink m-0">โหมดทดสอบ</p>
								<p className={`!text-xs m-0 mt-0.5 ${testMode ? "text-[#92400e]" : "text-muted"}`}>
									{testMode
										? "เปิดอยู่ — ปุ่มกรอกข้อมูลอัตโนมัติ + demo scenarios แสดงในฟอร์ม"
										: "ปิดอยู่ — ผู้ใช้จะไม่เห็นฟีเจอร์ทดสอบ"}
								</p>
							</div>
						</div>

						<button
							type="button"
							role="switch"
							aria-checked={testMode}
							onClick={() => setTestMode((v) => !v)}
							className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none border-0 cursor-pointer ${testMode ? "bg-warning" : "bg-hairline"}`}
						>
							<span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${testMode ? "left-[22px]" : "left-0.5"}`} />
						</button>
					</div>

					{/* ── ผู้เข้าแข่งขัน card ── */}
					<div className="card">
						<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--spacing-lg)" }}>
							<IconUser size={16} />
							<h2 style={{ fontSize: 18, margin: 0 }}>ผู้เข้าแข่งขัน</h2>
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
							{/* Slug */}
							<div>
								<label className="label">URL Path (slug)</label>
								<div style={{ display: "flex", alignItems: "center" }}>
									<span style={{ padding: "8px 12px", background: "#f5f0e8", border: "1px solid #d5cfc4", borderRight: "none", borderRadius: "var(--radius-md) 0 0 var(--radius-md)", fontSize: 13, color: "var(--color-muted)", whiteSpace: "nowrap" }}>
										/{t.slug}/register/
									</span>
									<input className="input input-bordered" style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0", flex: 1 }} placeholder="competitor" value={form.competitor_url} onChange={(e) => setForm({ ...form, competitor_url: e.target.value })} />
								</div>
							</div>
							{/* Titles */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
								<div>
									<label className="label" style={{ fontSize: 12 }}>ชื่อแสดง (ไทย)</label>
									<input className="input input-bordered w-full" placeholder="ผู้เข้าแข่งขัน" value={form.competitor_title} onChange={(e) => setForm({ ...form, competitor_title: e.target.value })} />
								</div>
								<div>
									<label className="label" style={{ fontSize: 12 }}>ชื่อแสดง (EN)</label>
									<input className="input input-bordered w-full" placeholder="Competitor" value={form.competitor_title_en} onChange={(e) => setForm({ ...form, competitor_title_en: e.target.value })} />
								</div>
							</div>
							{/* Form select */}
							<div>
								<label className="label" style={{ fontSize: 12 }}>ฟอร์ม</label>
								<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
									{/* Legacy option */}
									<label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1px solid ${competitorFormId === "" ? "var(--color-primary, #4f8ef7)" : "var(--color-border)"}`, borderRadius: "var(--radius-md)", cursor: "pointer", background: competitorFormId === "" ? "var(--color-surface-soft)" : "transparent" }}>
										<input type="radio" name="competitor-form" checked={competitorFormId === ""} onChange={() => setCompetitorFormId("")} style={{ accentColor: "var(--color-primary)" }} />
										<div>
											<span style={{ fontWeight: 500, fontSize: 14 }}>ลิงก์เดิม (Legacy)</span>
											<p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--color-muted)" }}>ใช้ฟอร์มลงทะเบียนเดิม</p>
										</div>
									</label>
									{Object.values(FORM_CONFIGS).map((cfg) => (
										<label key={cfg.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1px solid ${competitorFormId === cfg.id ? "var(--color-primary, #4f8ef7)" : "var(--color-border)"}`, borderRadius: "var(--radius-md)", cursor: "pointer", background: competitorFormId === cfg.id ? "var(--color-surface-soft)" : "transparent" }}>
											<input type="radio" name="competitor-form" checked={competitorFormId === cfg.id} onChange={() => setCompetitorFormId(cfg.id)} style={{ accentColor: "var(--color-primary)" }} />
											<div>
												<span style={{ fontWeight: 500, fontSize: 14 }}>{cfg.label.th}</span>
												<span style={{ marginLeft: 6, fontSize: 12, color: "var(--color-muted)" }}>{cfg.label.en}</span>
												<p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--color-muted)" }}>{cfg.steps.length} ขั้นตอน · {cfg.steps.reduce((n, s) => n + s.fields.length, 0)} ฟิลด์</p>
											</div>
										</label>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* ── ผู้ชม card ── */}
					<div className="card">
						<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--spacing-lg)" }}>
							<IconUsers size={16} />
							<h2 style={{ fontSize: 18, margin: 0 }}>ผู้ชม</h2>
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
							{/* Slug */}
							<div>
								<label className="label">URL Path (slug)</label>
								<div style={{ display: "flex", alignItems: "center" }}>
									<span style={{ padding: "8px 12px", background: "#f5f0e8", border: "1px solid #d5cfc4", borderRight: "none", borderRadius: "var(--radius-md) 0 0 var(--radius-md)", fontSize: 13, color: "var(--color-muted)", whiteSpace: "nowrap" }}>
										/{t.slug}/register/
									</span>
									<input className="input input-bordered" style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0", flex: 1 }} placeholder="attendee" value={form.attendee_url} onChange={(e) => setForm({ ...form, attendee_url: e.target.value })} />
								</div>
							</div>
							{/* Titles */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
								<div>
									<label className="label" style={{ fontSize: 12 }}>ชื่อแสดง (ไทย)</label>
									<input className="input input-bordered w-full" placeholder="ผู้ชม" value={form.attendee_title} onChange={(e) => setForm({ ...form, attendee_title: e.target.value })} />
								</div>
								<div>
									<label className="label" style={{ fontSize: 12 }}>ชื่อแสดง (EN)</label>
									<input className="input input-bordered w-full" placeholder="Attendee" value={form.attendee_title_en} onChange={(e) => setForm({ ...form, attendee_title_en: e.target.value })} />
								</div>
							</div>
							{/* Form select */}
							<div>
								<label className="label" style={{ fontSize: 12 }}>ฟอร์ม</label>
								<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
									{/* Legacy option */}
									<label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1px solid ${attendeeFormId === "" ? "var(--color-primary, #4f8ef7)" : "var(--color-border)"}`, borderRadius: "var(--radius-md)", cursor: "pointer", background: attendeeFormId === "" ? "var(--color-surface-soft)" : "transparent" }}>
										<input type="radio" name="attendee-form" checked={attendeeFormId === ""} onChange={() => setAttendeeFormId("")} style={{ accentColor: "var(--color-primary)" }} />
										<div>
											<span style={{ fontWeight: 500, fontSize: 14 }}>ลิงก์เดิม (Legacy)</span>
											<p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--color-muted)" }}>ใช้ฟอร์มลงทะเบียนเดิม</p>
										</div>
									</label>
									{Object.values(FORM_CONFIGS).map((cfg) => (
										<label key={cfg.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1px solid ${attendeeFormId === cfg.id ? "var(--color-primary, #4f8ef7)" : "var(--color-border)"}`, borderRadius: "var(--radius-md)", cursor: "pointer", background: attendeeFormId === cfg.id ? "var(--color-surface-soft)" : "transparent" }}>
											<input type="radio" name="attendee-form" checked={attendeeFormId === cfg.id} onChange={() => setAttendeeFormId(cfg.id)} style={{ accentColor: "var(--color-primary)" }} />
											<div>
												<span style={{ fontWeight: 500, fontSize: 14 }}>{cfg.label.th}</span>
												<span style={{ marginLeft: 6, fontSize: 12, color: "var(--color-muted)" }}>{cfg.label.en}</span>
												<p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--color-muted)" }}>{cfg.steps.length} ขั้นตอน · {cfg.steps.reduce((n, s) => n + s.fields.length, 0)} ฟิลด์</p>
											</div>
										</label>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* ── ข้อความยืนยันการลงทะเบียน ── */}
					<div className="card">
						<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--spacing-sm)" }}>
							<IconMail size={16} />
							<h2 style={{ fontSize: 18, margin: 0 }}>ข้อความยืนยันการลงทะเบียน</h2>
						</div>
						<p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 0, marginBottom: "var(--spacing-lg)" }}>
							แสดงหลังลงทะเบียนสำเร็จ และในอีเมลยืนยัน — แยกตามประเภทผู้ลงทะเบียน
						</p>
						<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
							{Object.values(FORM_CONFIGS).map(({ id, label }) => ({
								id,
								label: `${label.th} (${label.en})`,
							})).map(({ id, label }) => (
								<div key={id}>
									<label className="label" style={{ fontSize: 13 }}>{label}</label>
									<textarea
										className="input textarea"
										rows={3}
										placeholder={`เช่น กำหนดการ, เวลานัดหมาย, ข้อมูลติดต่อ, ข้อควรทราบ... (เว้นว่างไว้ถ้าไม่ต้องการแสดง)`}
										value={successMessages[id] || ""}
										onChange={(e) => setSuccessMessages((prev) => ({ ...prev, [id]: e.target.value }))}
										style={{ resize: "vertical" }}
									/>
								</div>
							))}
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
				<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
					{emailFormTypes.map((type) => {
						const label = EMAIL_TEMPLATE_LABELS[type] || { th: type, en: type };
						const customHtml = emailTemplates[type] ?? "";
						const isCustom = customHtml.trim().length > 0;
						const vars = EMAIL_TEMPLATE_VARS[type] || EMAIL_TEMPLATE_VARS["competitor"];
						const isActive = activeEmailType === type;

						return (
							<div key={type} className="card" style={{ padding: 0, overflow: "hidden" }}>
								{/* Card header — click to expand */}
								<button
									type="button"
									onClick={() => setActiveEmailType(isActive ? "" : type)}
									style={{
										width: "100%",
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "16px var(--spacing-lg)",
										background: "none",
										border: "none",
										cursor: "pointer",
										textAlign: "left",
										gap: "var(--spacing-md)",
									}}
								>
									<div>
										<span style={{ fontWeight: 600, fontSize: 15 }}>{label.th}</span>
										<span style={{ marginLeft: 8, fontSize: 13, color: "var(--color-muted)" }}>{label.en}</span>
										{isCustom && (
											<span style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#fef9c3", color: "#854d0e", fontWeight: 500 }}>
												แก้ไขแล้ว
											</span>
										)}
									</div>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isActive ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
										<polyline points="6 9 12 15 18 9" />
									</svg>
								</button>

								{isActive && (
									<div style={{ borderTop: "1px solid var(--color-hairline-soft)", padding: "var(--spacing-lg)" }}>
										{/* Sub-tabs: edit / preview */}
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)" }}>
											<div style={{ display: "flex", gap: 4 }}>
												<button className={"btn btn-sm " + (emailView === "edit" ? "btn-primary" : "btn-ghost")} onClick={() => setEmailView("edit")}>
													<IconCode size={14} /> HTML
												</button>
												<button className={"btn btn-sm " + (emailView === "preview" ? "btn-primary" : "btn-ghost")} onClick={() => setEmailView("preview")}>
													<IconEye size={14} /> Preview
												</button>
											</div>
											<button
												className="btn btn-sm btn-ghost"
												onClick={() => setEmailTemplates((prev) => ({ ...prev, [type]: getDefaultEmailTemplate(type) }))}
												title="โหลดเทมเพลตเริ่มต้นของระบบ"
											>
												<IconRotateCcw size={14} /> ใช้เทมเพลตเริ่มต้น
											</button>
										</div>

										{emailView === "edit" ? (
											<div>
												<p style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: "var(--spacing-sm)", marginTop: 0 }}>
													ตัวแปร: {vars.map((v) => `{{${v}}}`).join(" ")}
												</p>
												<textarea
													className="textarea textarea-bordered w-full"
													style={{ height: 320, fontFamily: "var(--font-mono)", fontSize: 13 }}
													value={customHtml || getDefaultEmailTemplate(type)}
													onChange={(e) => setEmailTemplates((prev) => ({ ...prev, [type]: e.target.value }))}
													placeholder="วางโค้ด HTML email body ที่นี่..."
												/>
											</div>
										) : (
											<div style={{ border: "1px solid #e6dfd8", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
												<div style={{ padding: "8px 12px", background: "#faf9f5", borderBottom: "1px solid #e6dfd8", fontSize: 12, color: "#6c6a64", display: "flex", alignItems: "center", gap: 8 }}>
													<IconEye size={14} />
													<span>ตัวอย่างอีเมล — ข้อมูลตัวอย่าง{!isCustom ? " (เทมเพลตเริ่มต้น)" : ""}</span>
												</div>
												<iframe
													srcDoc={buildPreview(type)}
													style={{ width: "100%", height: 600, border: "none", display: "block" }}
													sandbox="allow-same-origin"
												/>
											</div>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
			{/* ── Tab: Reset ────────────────────────────── */}
			{activeTab === "reset" && (
				<div className="flex flex-col gap-lg">
					{resetMessage && (
						<div className={`flex items-center gap-2 px-md py-sm rounded-lg border text-sm ${resetMessage.ok ? "bg-[#f0fdf4] border-success text-success" : "bg-[#fef2f2] border-error text-error"}`}>
							{resetMessage.ok ? <IconCheck size={14} color="var(--color-success)" /> : <IconX size={14} color="var(--color-error)" />}
							{resetMessage.text}
						</div>
					)}

					{/* Clear registrations */}
					<div className="card border-2 border-error/30">
						<div className="flex items-start gap-3 mb-md">
							<div className="flex-shrink-0 w-9 h-9 rounded-lg bg-error/10 flex items-center justify-center mt-0.5">
								<IconAlertTriangle size={16} color="var(--color-error)" />
							</div>
							<div>
								<h3 className="text-base font-semibold text-ink m-0 mb-1">ล้างข้อมูลการลงทะเบียน</h3>
								<p className="text-sm text-muted m-0">ลบข้อมูลผู้ลงทะเบียนทั้งหมดและไฟล์แนบ (รูปภาพ, เอกสาร) ออกจากระบบ การกระทำนี้ไม่สามารถย้อนกลับได้</p>
							</div>
						</div>
						<label className="label text-sm">พิมพ์ <strong>ยืนยันการลบ</strong> เพื่อยืนยัน</label>
						<input
							className="input mb-md"
							value={resetRegConfirm}
							onChange={(e) => setResetRegConfirm(e.target.value)}
							placeholder="ยืนยันการลบ"
						/>
						<button
							className="btn"
							style={{ background: "var(--color-error)", color: "#fff", opacity: resetRegConfirm === "ยืนยันการลบ" ? 1 : 0.4, cursor: resetRegConfirm === "ยืนยันการลบ" ? "pointer" : "not-allowed" }}
							disabled={resetRegConfirm !== "ยืนยันการลบ" || resetRegLoading}
							onClick={handleClearRegistrations}
						>
							{resetRegLoading ? "กำลังลบ..." : "ลบข้อมูลการลงทะเบียนทั้งหมด"}
						</button>
					</div>

					{/* Clear check-ins */}
					<div className="card border-2 border-amber-400/40">
						<div className="flex items-start gap-3 mb-md">
							<div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mt-0.5">
								<IconAlertTriangle size={16} color="#d97706" />
							</div>
							<div>
								<h3 className="text-base font-semibold text-ink m-0 mb-1">ล้างข้อมูลการเช็คอิน</h3>
								<p className="text-sm text-muted m-0">รีเซ็ตสถานะเช็คอินของผู้ลงทะเบียนทั้งหมดกลับเป็นยังไม่ได้เช็คอิน ข้อมูลการลงทะเบียนยังคงอยู่</p>
							</div>
						</div>
						<label className="label text-sm">พิมพ์ <strong>ยืนยันการลบ</strong> เพื่อยืนยัน</label>
						<input
							className="input mb-md"
							value={resetCheckinConfirm}
							onChange={(e) => setResetCheckinConfirm(e.target.value)}
							placeholder="ยืนยันการลบ"
						/>
						<button
							className="btn"
							style={{ background: "#d97706", color: "#fff", opacity: resetCheckinConfirm === "ยืนยันการลบ" ? 1 : 0.4, cursor: resetCheckinConfirm === "ยืนยันการลบ" ? "pointer" : "not-allowed" }}
							disabled={resetCheckinConfirm !== "ยืนยันการลบ" || resetCheckinLoading}
							onClick={handleClearCheckins}
						>
							{resetCheckinLoading ? "กำลังรีเซ็ต..." : "รีเซ็ตการเช็คอินทั้งหมด"}
						</button>
					</div>
				</div>
			)}
		</div>
		</>
	);
}
