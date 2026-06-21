import type { Route } from "./+types/admin/site-settings";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";
import { getSiteSettings, type HeaderMode } from "../../../lib/site-settings";
import { useRef, useState, useEffect } from "react";
import {
	IconSave,
	IconCheck,
	IconX,
	IconSettings,
	IconCamera,
	IconPlus,
	IconRotateCcw,
	IconShield,
	IconKey,
} from "../../../components/ui/icons";

type Tab = "header" | "home" | "footer" | "seo" | "turnstile" | "passwords" | "tournaments";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const settings = await getSiteSettings(env.DB);

	const activeResults = await env.DB.prepare(
		`SELECT t.id, t.name, t.slug, t.photo_url, t.created_at,
			t.registration_open_at, t.registration_close_at,
			t.checkin_open_at, t.checkin_close_at,
			COUNT(r.id) as registration_count,
			SUM(CASE WHEN r.checked_in = 1 THEN 1 ELSE 0 END) as checkin_count
		FROM tournaments t
		LEFT JOIN registrations r ON r.tournament_id = t.id
		WHERE t.deleted_at IS NULL
		GROUP BY t.id
		ORDER BY t.created_at DESC`,
	).all();

	const deletedResults = await env.DB.prepare(
		`SELECT t.id, t.name, t.slug, t.photo_url, t.deleted_at,
			t.registration_open_at, t.registration_close_at,
			t.checkin_open_at, t.checkin_close_at,
			COUNT(r.id) as registration_count,
			SUM(CASE WHEN r.checked_in = 1 THEN 1 ELSE 0 END) as checkin_count
		FROM tournaments t
		LEFT JOIN registrations r ON r.tournament_id = t.id
		WHERE t.deleted_at IS NOT NULL
		GROUP BY t.id
		ORDER BY t.deleted_at DESC`,
	).all();

	return {
		settings,
		tournaments: activeResults.results,
		deletedTournaments: deletedResults.results,
	};
}

export function meta() {
	return [{ title: "ตั้งค่าเว็บไซต์ — all Thailand" }];
}

const fmtDate = (ts: number | null) => {
	if (!ts) return "—";
	return new Date(ts).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
};

const periodStatus = (
	openAt: number | null,
	closeAt: number | null,
): "upcoming" | "open" | "closed" | "none" => {
	if (!openAt || !closeAt) return "none";
	const now = Date.now();
	if (now < openAt) return "upcoming";
	if (now > closeAt) return "closed";
	return "open";
};

const statusColor = { open: "#16a34a", upcoming: "#ca8a04", closed: "#9ca3af", none: "#9ca3af" } as const;
const statusLabel = { open: "เปิด", upcoming: "เร็วๆ นี้", closed: "ปิด", none: "" } as const;

export default function SiteSettingsPage({ loaderData }: Route.ComponentProps) {
	const [activeTab, setActiveTab] = useState<Tab>("header");

	// Site settings state
	const [form, setForm] = useState(loaderData.settings);
	const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
	const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(
		loaderData.settings.headerImageUrl,
	);
	const [removeHeaderImage, setRemoveHeaderImage] = useState(false);
	const headerImageInputRef = useRef<HTMLInputElement>(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

	// Super admin password state
	const [superAdminPassword, setSuperAdminPassword] = useState("");
	const [superAdminPasswordConfirm, setSuperAdminPasswordConfirm] = useState("");
	const [passwordSaving, setPasswordSaving] = useState(false);

	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [passwordSuccess, setPasswordSuccess] = useState(false);

	const handleSavePassword = async () => {
		setPasswordError(null);
		setPasswordSuccess(false);
		if (!superAdminPassword.trim()) { setPasswordError("กรุณาใส่รหัสผ่านใหม่"); return; }
		if (superAdminPassword !== superAdminPasswordConfirm) { setPasswordError("รหัสผ่านไม่ตรงกัน"); return; }
		setPasswordSaving(true);
		try {
			const fd = new FormData();
			fd.append("super_admin_password", superAdminPassword);
			fd.append("header_mode", form.headerMode);
			fd.append("header_brand", form.headerBrand);
			fd.append("header_logo_letter", form.headerLogoLetter);
			fd.append("home_title", form.homeTitle);
			fd.append("home_description", form.homeDescription);
			fd.append("footer_line1", form.footerLine1);
			fd.append("footer_line2", form.footerLine2);
			fd.append("meta_title", form.metaTitle);
			fd.append("meta_description", form.metaDescription);
			const res = await fetch("/api/admin/site-settings", { method: "PUT", body: fd });
			const data = await res.json() as any;
			if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
			setSuperAdminPassword("");
			setSuperAdminPasswordConfirm("");
			setPasswordSuccess(true);
		} catch (err: unknown) {
			setPasswordError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
		} finally {
			setPasswordSaving(false);
		}
	};

	// Tournament management state
	const createDialogRef = useRef<HTMLDialogElement>(null);
	const [creating, setCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [createForm, setCreateForm] = useState({
		name: "",
		slug: "",
		password_assistant: "",
		password_admin: "",
		registration_open_at: "",
		registration_close_at: "",
		checkin_open_at: "",
		checkin_close_at: "",
	});
	const [restoringId, setRestoringId] = useState<string | null>(null);
	const [restoreError, setRestoreError] = useState<string | null>(null);
	const tournaments = loaderData.tournaments as any[];
	const deletedTournaments = (loaderData.deletedTournaments ?? []) as any[];

	useEffect(() => {
		const slug = createForm.name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.slice(0, 60);
		setCreateForm((prev) => ({ ...prev, slug }));
	}, [createForm.name]);

	const handleHeaderImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			setMessage({ ok: false, text: "โลโก้ต้องไม่เกิน 2MB" });
			return;
		}
		if (!file.type.startsWith("image/")) {
			setMessage({ ok: false, text: "อัปโหลดได้เฉพาะไฟล์รูปภาพ" });
			return;
		}
		setHeaderImageFile(file);
		setRemoveHeaderImage(false);
		const reader = new FileReader();
		reader.onload = (ev) => setHeaderImagePreview(ev.target?.result as string);
		reader.readAsDataURL(file);
		setMessage(null);
	};

	const handleSave = async () => {
		setSaving(true);
		setMessage(null);
		try {
			const fd = new FormData();
			fd.append("header_mode", form.headerMode);
			fd.append("header_brand", form.headerBrand);
			fd.append("header_logo_letter", form.headerLogoLetter);
			fd.append("home_title", form.homeTitle);
			fd.append("home_description", form.homeDescription);
			fd.append("footer_line1", form.footerLine1);
			fd.append("footer_line2", form.footerLine2);
			fd.append("meta_title", form.metaTitle);
			fd.append("meta_description", form.metaDescription);
			fd.append("turnstile_site_key", form.turnstileSiteKey || "");
			fd.append("turnstile_secret_key", form.turnstileSecretKey || "");
			if (headerImageFile) fd.append("header_image", headerImageFile);
			if (removeHeaderImage) fd.append("remove_header_image", "1");

			const res = await fetch("/api/admin/site-settings", {
				method: "PUT",
				body: fd,
			});
			const data = await res.json() as any;
			if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
			setForm(data.settings);
			setHeaderImageFile(null);
			setRemoveHeaderImage(false);
			setHeaderImagePreview(data.settings.headerImageUrl);
			setMessage({ ok: true, text: "บันทึกการตั้งค่าเรียบร้อยแล้ว" });
		} catch (err: unknown) {
			setMessage({ ok: false, text: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ" });
		} finally {
			setSaving(false);
		}
	};

	const setHeaderMode = (mode: HeaderMode) => {
		setForm({ ...form, headerMode: mode });
		setMessage(null);
	};

	const handleCreate = async () => {
		if (!createForm.name.trim()) { setCreateError("กรุณาใส่ชื่อรายการ"); return; }
		if (!createForm.registration_open_at || !createForm.registration_close_at) { setCreateError("กรุณากำหนดช่วงเวลาลงทะเบียน"); return; }
		if (!createForm.checkin_open_at || !createForm.checkin_close_at) { setCreateError("กรุณากำหนดช่วงเวลาเช็คอิน"); return; }

		setCreating(true);
		setCreateError(null);
		try {
			const res = await fetch("/api/admin/tournaments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: createForm.name,
					slug: createForm.slug || undefined,
					registration_open_at: new Date(createForm.registration_open_at).getTime(),
					registration_close_at: new Date(createForm.registration_close_at).getTime(),
					checkin_open_at: new Date(createForm.checkin_open_at).getTime(),
					checkin_close_at: new Date(createForm.checkin_close_at).getTime(),
					passwords: {
						assistant: createForm.password_assistant || undefined,
						admin: createForm.password_admin || undefined,
					},
				}),
			});
			const data = await res.json() as any;
			if (!res.ok) {
				throw new Error(data.error || "ไม่สามารถสร้างรายการได้");
			}
			window.location.href = `/portal/${data.slug}/settings`;
		} catch (err: any) {
			setCreateError(err.message);
		} finally {
			setCreating(false);
		}
	};

	const handleRestore = async (id: string) => {
		setRestoringId(id);
		setRestoreError(null);
		try {
			const res = await fetch(`/api/admin/tournaments/${id}/restore`, { method: "POST" });
			const json = await res.json() as { ok?: boolean; error?: string };
			if (!res.ok) { setRestoreError(json.error ?? "กู้คืนไม่สำเร็จ"); setRestoringId(null); return; }
			window.location.reload();
		} catch {
			setRestoreError("กู้คืนไม่สำเร็จ");
			setRestoringId(null);
		}
	};

	const TournamentCard = ({ t, deleted }: { t: any; deleted?: boolean }) => {
		const coverUrl = t.photo_url ? `/api/file?key=${encodeURIComponent(t.photo_url)}` : null;
		const regStatus = periodStatus(t.registration_open_at, t.registration_close_at);
		const checkinStatus = periodStatus(t.checkin_open_at, t.checkin_close_at);
		const regCount = t.registration_count ?? 0;
		const checkinCount = t.checkin_count ?? 0;

		const cardInner = (
			<>
				<div className="relative w-full flex-shrink-0 overflow-hidden" style={{ aspectRatio: "16/9", background: "var(--color-surface-soft)" }}>
					{coverUrl
						? <img src={coverUrl} alt={t.name} className={`w-full h-full object-cover ${!deleted ? "transition-transform group-hover:scale-[1.02]" : "opacity-60 grayscale"}`} style={{ transitionDuration: "400ms" }} />
						: <div className="w-full h-full flex items-center justify-center text-[40px] font-black select-none opacity-60" style={{ color: "var(--color-muted-soft)" }}>{t.name.charAt(0).toUpperCase()}</div>
					}
					{deleted && (
						<span className="absolute top-3 left-3 px-2 py-0.5 rounded-full !text-xs font-semibold" style={{ background: "rgba(220,38,38,0.85)", color: "#fff" }}>ถูกลบ</span>
					)}
					<div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 50%, transparent 100%)" }} />
					<div className="absolute bottom-0 left-0 right-0 px-md pb-sm pt-lg flex items-end justify-between gap-sm">
						<span className="text-white font-semibold !text-[18px] leading-snug line-clamp-2" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{t.name}</span>
						<div className="flex-shrink-0 flex gap-xs">
							<span className="flex items-center gap-1 px-2 py-0.5 rounded-full !text-xs font-semibold" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", backdropFilter: "blur(4px)" }}>
								{regCount} <span style={{ opacity: 0.75 }}>ลง</span>
							</span>
							<span className="flex items-center gap-1 px-2 py-0.5 rounded-full !text-xs font-semibold" style={{ background: "rgba(22,163,74,0.55)", color: "#fff", backdropFilter: "blur(4px)" }}>
								{checkinCount} <span style={{ opacity: 0.75 }}>เช็ค</span>
							</span>
						</div>
					</div>
				</div>
				<div className="px-md py-sm grid gap-xs text-sm" style={{ gridTemplateColumns: "1fr 1fr" }}>
					{[
						{ label: "ลงทะเบียน", status: regStatus, open: t.registration_open_at, close: t.registration_close_at },
						{ label: "เช็คอิน", status: checkinStatus, open: t.checkin_open_at, close: t.checkin_close_at },
					].map(({ label, status, open, close }) => (
						<div key={label} className="flex flex-col gap-0.5">
							<div className="flex items-center gap-1">
								<span className="text-xs font-medium text-body">{label}</span>
								<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: statusColor[status] + "20", color: statusColor[status] }}>{statusLabel[status]}</span>
							</div>
							<span className="!text-[12px] text-muted leading-tight">เริ่ม: {fmtDate(open)}</span>
							<span className="!text-[12px] text-muted leading-tight">สิ้นสุด: {fmtDate(close)}</span>
						</div>
					))}
				</div>
			</>
		);

		if (deleted) {
			return (
				<div className="card !p-0 flex flex-col overflow-hidden opacity-90">
					{cardInner}
					<div className="px-md py-sm border-t border-hairline flex items-center justify-between gap-sm">
						<span className="!text-xs text-muted">ลบเมื่อ: {fmtDate(t.deleted_at)}</span>
						<button
							type="button"
							className="btn btn-sm btn-secondary"
							disabled={restoringId === t.id}
							onClick={() => handleRestore(t.id)}
						>
							<IconRotateCcw size={14} />
							{restoringId === t.id ? "กำลังกู้คืน..." : "กู้คืน"}
						</button>
					</div>
				</div>
			);
		}

		return (
			<a href={`/portal/${t.slug}`} className="card !p-0 flex flex-col overflow-hidden no-underline group transition-all hover:shadow-lg">
				{cardInner}
			</a>
		);
	};

	const WEBSITE_TABS: { id: Tab; label: string }[] = [
		{ id: "header", label: "ส่วนหัว" },
		{ id: "home", label: "หน้าแรก" },
		{ id: "footer", label: "Footer" },
		{ id: "seo", label: "SEO" },
		{ id: "turnstile", label: "Turnstile" },
		{ id: "passwords", label: "รหัสผ่าน" },
	];

	const ALL_TABS = [...WEBSITE_TABS, { id: "tournaments" as Tab, label: "รายการ" }];

	const NavBtn = ({ id, label }: { id: Tab; label: string }) => (
		<button
			onClick={() => { setActiveTab(id); setMessage(null); }}
			className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors border-0 cursor-pointer w-full ${
				activeTab === id
					? "bg-primary/10 text-primary"
					: "text-muted hover:text-body hover:bg-surface-soft bg-transparent"
			}`}
		>
			{label}
		</button>
	);

	return (
		<div className="max-w-[1100px] mx-auto px-md sm:px-lg py-lg sm:py-xl">
			{/* Page header */}
			<div className="flex items-start sm:items-center justify-between mb-lg sm:mb-xl gap-sm">
				<div className="flex items-center gap-2">
					<IconSettings size={20} color="var(--color-muted)" className="shrink-0" />
					<div>
						<h1 className="!text-xl sm:!text-2xl m-0">ตั้งค่าเว็บไซต์</h1>
						<p className="text-sm text-muted m-0 mt-0.5 hidden sm:block">จัดการเว็บไซต์และรายการทัวร์นาเมนต์</p>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{activeTab !== "tournaments" && activeTab !== "passwords" && (
						<button className="btn btn-primary btn-sm sm:btn-md" onClick={handleSave} disabled={saving}>
							<IconSave size={15} />
							{saving ? "บันทึก..." : "บันทึก"}
						</button>
					)}
					{activeTab === "tournaments" && (
						<button className="btn btn-primary btn-sm sm:btn-md" onClick={() => createDialogRef.current?.showModal()}>
							<IconPlus size={15} />
							<span className="hidden sm:inline">สร้างรายการ</span>
						</button>
					)}
					<a href="/" className="btn btn-secondary btn-sm sm:btn-md no-underline hidden sm:flex">ดูหน้าแรก</a>
				</div>
			</div>

			{/* Global message */}
			{message && (
				<div className={`flex items-center gap-2 p-md rounded-md text-sm mb-lg ${
					message.ok
						? "bg-[#f0fdf4] border border-[#86efac] text-[#166534]"
						: "bg-[#fef2f2] border border-error text-error"
				}`}>
					{message.ok ? <IconCheck size={16} /> : <IconX size={16} />}
					{message.text}
				</div>
			)}

			{/* Mobile: horizontal scrollable tab strip */}
			<div className="md:hidden overflow-x-auto mb-lg -mx-md px-md">
				<div className="flex gap-2 min-w-fit pb-1">
					{ALL_TABS.map((tab) => (
						<button
							key={tab.id}
							onClick={() => { setActiveTab(tab.id); setMessage(null); }}
							className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border-0 cursor-pointer transition-colors shrink-0 ${
								activeTab === tab.id
									? "bg-primary text-white"
									: "bg-surface-soft text-muted"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Desktop: two-column layout */}
			<div className="flex gap-xl items-start">
				{/* Left: vertical tab nav — desktop only */}
				<div className="hidden md:block shrink-0 w-44">
					<p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1 px-3">เว็บไซต์</p>
					{WEBSITE_TABS.map((tab) => (
						<NavBtn key={tab.id} id={tab.id} label={tab.label} />
					))}
					<div className="border-t border-hairline my-sm" />
					<p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1 px-3">จัดการ</p>
					<NavBtn id="tournaments" label="รายการ" />
				</div>

				{/* Right: tab content */}
				<div className="flex-1 min-w-0">

					{/* ── Header ── */}
					{activeTab === "header" && (
						<div className="flex flex-col gap-md">
							{/* Live preview */}
							<div className="rounded-lg border border-hairline overflow-hidden">
								<div className="px-md py-sm flex items-center gap-3" style={{ background: "var(--color-canvas)", borderBottom: "1px solid var(--color-hairline)" }}>
									<span className="text-xs font-semibold text-muted uppercase tracking-wide">ตัวอย่าง</span>
								</div>
								<div className="px-lg py-sm flex items-center gap-3" style={{ background: "var(--color-canvas)" }}>
									{form.headerMode === "image" && headerImagePreview ? (
										<img src={headerImagePreview} alt={form.headerBrand} style={{ height: 32, maxWidth: 120, objectFit: "contain" }} />
									) : (
										<div className="flex items-center justify-center rounded font-black text-white text-sm shrink-0" style={{ width: 32, height: 32, background: "var(--color-primary)", fontSize: 14 }}>
											{form.headerLogoLetter?.slice(0, 2) || "T"}
										</div>
									)}
									<span className="font-semibold text-body" style={{ fontSize: 16 }}>{form.headerBrand || "all Thailand"}</span>
								</div>
							</div>

							{/* Settings card */}
							<div className="card">
								<h2 className="!text-lg mb-sm">Header</h2>
								<p className="text-sm text-muted mt-0 mb-lg">เลือกแสดงโลโก้เป็นข้อความหรือรูปภาพ</p>

								{/* Mode toggle — segmented control */}
								<div className="flex rounded-lg border border-hairline p-0.5 self-start mb-lg" style={{ background: "var(--color-surface-soft)" }}>
									{(["text", "image"] as const).map((mode) => (
										<button
											key={mode}
											type="button"
											onClick={() => setHeaderMode(mode)}
											className={`px-4 py-1.5 rounded-md text-sm font-medium border-0 cursor-pointer transition-all ${
												form.headerMode === mode
													? "bg-canvas text-body shadow-sm"
													: "bg-transparent text-muted hover:text-body"
											}`}
										>
											{mode === "text" ? "ข้อความ" : "รูปภาพ"}
										</button>
									))}
								</div>

								{form.headerMode === "text" ? (
									<div className="grid gap-md sm:grid-cols-2">
										<div>
											<label className="label">ชื่อแบรนด์</label>
											<input className="input w-full" value={form.headerBrand} onChange={(e) => setForm({ ...form, headerBrand: e.target.value })} placeholder="all Thailand" />
										</div>
										<div>
											<label className="label">ตัวอักษรโลโก้</label>
											<input className="input w-full" maxLength={2} value={form.headerLogoLetter} onChange={(e) => setForm({ ...form, headerLogoLetter: e.target.value })} placeholder="T" />
											<p className="text-xs text-muted mt-1">1–2 ตัวอักษร แสดงในกล่องสีด้านซ้ายชื่อ</p>
										</div>
									</div>
								) : (
									<div className="flex flex-col gap-md">
										<div>
											<label className="label">รูปโลโก้</label>
											<input ref={headerImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderImageSelect} />
											<div
												className="relative flex items-center justify-center rounded-lg border-2 border-dashed overflow-hidden cursor-pointer transition-colors hover:border-primary/50"
												style={{ minHeight: 140, background: "var(--color-surface-soft)", borderColor: "var(--color-hairline)" }}
												onClick={() => headerImageInputRef.current?.click()}
											>
												{headerImagePreview ? (
													<img src={headerImagePreview} alt="ตัวอย่างโลโก้" className="max-h-28 max-w-full object-contain p-md" />
												) : (
													<div className="flex flex-col items-center gap-2 py-xl text-muted">
														<IconCamera size={32} />
														<span className="text-sm font-medium">คลิกเพื่ออัปโหลดโลโก้</span>
														<span className="text-xs">PNG, JPG, SVG — สูงสุด 2MB</span>
													</div>
												)}
											</div>
											{(headerImagePreview || form.headerImageKey) && (
												<button
													type="button"
													className="btn btn-secondary btn-sm mt-sm"
													onClick={() => {
														setHeaderImageFile(null);
														setHeaderImagePreview(null);
														setRemoveHeaderImage(true);
														if (headerImageInputRef.current) headerImageInputRef.current.value = "";
													}}
												>
													<IconX size={14} /> ลบรูปโลโก้
												</button>
											)}
										</div>
										<div>
											<label className="label">ชื่อแบรนด์ (alt text)</label>
											<input className="input w-full" value={form.headerBrand} onChange={(e) => setForm({ ...form, headerBrand: e.target.value })} placeholder="all Thailand" />
											<p className="text-xs text-muted mt-1">แสดงถัดจากรูปโลโก้และใช้เป็น alt text</p>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{/* ── Home ── */}
					{activeTab === "home" && (
						<div className="card">
							<h2 className="!text-lg mb-md">หน้าแรก — Title & Description</h2>
							<div className="grid gap-md">
								<div>
									<label className="label">หัวข้อหลัก (Title)</label>
									<input className="input w-full" value={form.homeTitle} onChange={(e) => setForm({ ...form, homeTitle: e.target.value })} placeholder="Registration System" />
								</div>
								<div>
									<label className="label">คำอธิบาย (Description)</label>
									<textarea className="input w-full min-h-[120px] resize-y" value={form.homeDescription} onChange={(e) => setForm({ ...form, homeDescription: e.target.value })} placeholder="คำอธิบายหน้าแรก (ขึ้นบรรทัดใหม่ได้)" />
									<p className="text-xs text-muted mt-1">ขึ้นบรรทัดใหม่จะแสดงเป็นย่อหน้าแยกบนหน้าแรก</p>
								</div>
							</div>
						</div>
					)}

					{/* ── Footer ── */}
					{activeTab === "footer" && (
						<div className="card">
							<h2 className="!text-lg mb-md">Footer</h2>
							<div className="grid gap-md">
								<div>
									<label className="label">บรรทัดที่ 1</label>
									<input className="input w-full" value={form.footerLine1} onChange={(e) => setForm({ ...form, footerLine1: e.target.value })} />
								</div>
								<div>
									<label className="label">บรรทัดที่ 2</label>
									<input className="input w-full" value={form.footerLine2} onChange={(e) => setForm({ ...form, footerLine2: e.target.value })} />
								</div>
							</div>
						</div>
					)}

					{/* ── SEO ── */}
					{activeTab === "seo" && (
						<div className="card">
							<h2 className="!text-lg mb-md">SEO (Meta)</h2>
							<div className="grid gap-md">
								<div>
									<label className="label">Meta Title</label>
									<input className="input w-full" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
								</div>
								<div>
									<label className="label">Meta Description</label>
									<textarea className="input w-full min-h-[80px] resize-y" value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
								</div>
							</div>
						</div>
					)}

					{/* ── Turnstile ── */}
					{activeTab === "turnstile" && (
						<div className="card">
							<div className="flex items-center gap-2 mb-md">
								<IconShield size={18} color="var(--color-muted)" />
								<h2 className="!text-lg m-0">Cloudflare Turnstile</h2>
							</div>
							<p className="text-sm text-muted mt-0 mb-lg">
								เพิ่มการยืนยัน CAPTCHA ในฟอร์มลงทะเบียนและหน้าเข้าสู่ระบบ — เว้นว่างเพื่อปิดใช้งาน
							</p>
							<div className="grid gap-md">
								<div>
									<label className="label">Site Key (Public)</label>
									<input
										className="input w-full font-mono text-sm"
										value={form.turnstileSiteKey || ""}
										onChange={(e) => setForm({ ...form, turnstileSiteKey: e.target.value || null })}
										placeholder="0x4AAAAAAA..."
									/>
									<p className="text-xs text-muted mt-1">ใช้ในฝั่ง frontend — ปลอดภัยที่จะแสดงต่อสาธารณะ</p>
								</div>
								<div>
									<label className="label">Secret Key (Private)</label>
									<input
										className="input w-full font-mono text-sm"
										type="password"
										value={form.turnstileSecretKey || ""}
										onChange={(e) => setForm({ ...form, turnstileSecretKey: e.target.value || null })}
										placeholder="0x4AAAAAAA..."
									/>
									<p className="text-xs text-muted mt-1">ใช้ยืนยันในฝั่ง server — เก็บเป็นความลับ</p>
								</div>
								<div className="p-md rounded-lg border border-hairline bg-surface-soft text-sm text-muted">
									<p className="m-0 mb-1 font-medium text-body">วิธีรับ Keys:</p>
									<ol className="m-0 pl-5 space-y-1">
										<li>ไปที่ Cloudflare Dashboard → Turnstile</li>
										<li>สร้าง site ใหม่ พร้อมระบุ domain ของเว็บไซต์</li>
										<li>คัดลอก Site Key และ Secret Key มาใส่ด้านบน</li>
									</ol>
								</div>
							</div>
						</div>
					)}

					{/* ── Passwords ── */}
					{activeTab === "passwords" && (
						<div className="card">
							<div className="flex items-center gap-2 mb-sm">
								<IconKey size={18} color="var(--color-muted)" />
								<h2 className="!text-lg m-0">รหัสผ่าน Super Admin</h2>
							</div>
							<p className="text-sm text-muted mt-0 mb-lg">
								รหัสผ่านระดับเว็บไซต์ — เข้าสู่ระบบในฐานะ Super Admin ได้จากทุกรายการ
							</p>

							{/* Current status */}
							<div className="flex items-center gap-2 px-md py-sm rounded-md border border-hairline bg-surface-soft text-sm mb-lg">
								<span style={{ width: 8, height: 8, borderRadius: "50%", background: loaderData.settings.superAdminPasswordHash ? "#16a34a" : "#ca8a04", flexShrink: 0, display: "inline-block" }} />
								<span className="text-body">
									{loaderData.settings.superAdminPasswordHash
										? "ตั้งรหัสผ่านไว้แล้ว — กรอกด้านล่างเพื่อเปลี่ยน"
										: "ยังไม่ได้ตั้งรหัสผ่าน — Super Admin จะไม่สามารถเข้าสู่ระบบได้"}
								</span>
							</div>

							<div className="flex flex-col gap-md" style={{ maxWidth: 420 }}>
								<div>
									<label className="label">รหัสผ่านใหม่</label>
									<input
										className="input w-full"
										type="password"
										placeholder="ใส่รหัสผ่านใหม่"
										value={superAdminPassword}
										onChange={(e) => { setSuperAdminPassword(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
									/>
								</div>
								<div>
									<label className="label">ยืนยันรหัสผ่าน</label>
									<input
										className={`input w-full ${superAdminPassword && superAdminPasswordConfirm && superAdminPassword !== superAdminPasswordConfirm ? "border-error" : ""}`}
										type="password"
										placeholder="ใส่รหัสผ่านอีกครั้ง"
										value={superAdminPasswordConfirm}
										onChange={(e) => { setSuperAdminPasswordConfirm(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
										onKeyDown={(e) => e.key === "Enter" && handleSavePassword()}
									/>
									{superAdminPassword && superAdminPasswordConfirm && superAdminPassword !== superAdminPasswordConfirm && (
										<p className="text-xs text-error mt-1">รหัสผ่านไม่ตรงกัน</p>
									)}
								</div>

								{passwordError && (
									<div className="flex items-center gap-2 px-md py-sm bg-[#fef2f2] border border-error rounded-md text-error text-sm">
										<IconX size={14} />
										{passwordError}
									</div>
								)}
								{passwordSuccess && (
									<div className="flex items-center gap-2 px-md py-sm bg-[#f0fdf4] border border-[#86efac] rounded-md text-[#166534] text-sm">
										<IconCheck size={14} />
										เปลี่ยนรหัสผ่าน Super Admin เรียบร้อยแล้ว
									</div>
								)}

								<button
									className="btn btn-primary self-start"
									onClick={handleSavePassword}
									disabled={passwordSaving || (!!superAdminPassword && !!superAdminPasswordConfirm && superAdminPassword !== superAdminPasswordConfirm)}
								>
									<IconSave size={16} />
									{passwordSaving ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}
								</button>
							</div>
						</div>
					)}

					{/* ── Tournaments ── */}
					{activeTab === "tournaments" && (
						<div className="flex flex-col gap-lg">
							{restoreError && (
								<div className="px-md py-sm bg-[#fef2f2] border border-error rounded-md text-error text-sm">
									{restoreError}
								</div>
							)}

							{tournaments.length === 0 ? (
								<div className="card text-center text-muted">
									<p className="text-base mb-md">ยังไม่มีรายการ</p>
									<button className="btn btn-primary" onClick={() => createDialogRef.current?.showModal()}>
										<IconPlus size={16} /> สร้างรายการใหม่
									</button>
								</div>
							) : (
								<div className="grid gap-sm" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
									{tournaments.map((t: any) => (
										<TournamentCard key={t.id} t={t} />
									))}
								</div>
							)}

							{deletedTournaments.length > 0 && (
								<div className="pt-lg border-t border-hairline">
									<h3 className="!text-[18px] font-semibold m-0 mb-md text-muted">รายการที่ถูกลบ</h3>
									<div className="grid gap-sm" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
										{deletedTournaments.map((t: any) => (
											<TournamentCard key={t.id} t={t} deleted />
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Create Tournament Dialog */}
			<dialog ref={createDialogRef} className="modal">
				<div className="modal-content max-w-[560px]">
					<div className="flex justify-between items-center mb-lg">
						<h2 className="text-[20px] m-0">สร้างรายการใหม่</h2>
						<button className="btn btn-sm btn-ghost btn-circle" onClick={() => createDialogRef.current?.close()}>
							<IconX size={16} />
						</button>
					</div>

					{createError && (
						<div className="px-md py-sm bg-[#fef2f2] border border-error rounded-md text-error text-sm mb-md">
							{createError}
						</div>
					)}

					<div className="flex flex-col gap-md">
						<div>
							<label className="label">ชื่อรายการ *</label>
							<input className="input w-full" placeholder="เช่น Junior Golf Open 2026" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
						</div>
						<div>
							<label className="label">Slug (URL)</label>
							<input className="input w-full" placeholder="auto-from-name" value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })} />
						</div>
						<div className="border-t border-hairline pt-md">
							<p className="text-sm font-semibold mb-sm">ช่วงเวลาลงทะเบียน</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
								<div>
									<label className="label">เปิด *</label>
									<input className="input w-full" type="datetime-local" value={createForm.registration_open_at} onChange={(e) => setCreateForm({ ...createForm, registration_open_at: e.target.value })} />
								</div>
								<div>
									<label className="label">ปิด *</label>
									<input className="input w-full" type="datetime-local" value={createForm.registration_close_at} onChange={(e) => setCreateForm({ ...createForm, registration_close_at: e.target.value })} />
								</div>
							</div>
						</div>
						<div>
							<p className="text-sm font-semibold mb-sm">ช่วงเวลาเช็คอิน</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
								<div>
									<label className="label">เปิด *</label>
									<input className="input w-full" type="datetime-local" value={createForm.checkin_open_at} onChange={(e) => setCreateForm({ ...createForm, checkin_open_at: e.target.value })} />
								</div>
								<div>
									<label className="label">ปิด *</label>
									<input className="input w-full" type="datetime-local" value={createForm.checkin_close_at} onChange={(e) => setCreateForm({ ...createForm, checkin_close_at: e.target.value })} />
								</div>
							</div>
						</div>
						<div className="border-t border-hairline pt-md">
							<p className="text-sm font-semibold mb-sm">รหัสผ่าน</p>
							<div className="flex flex-col gap-sm">
								<div>
									<label className="label">Admin</label>
									<input className="input w-full" type="password" placeholder="ไม่จำเป็น" value={createForm.password_admin} onChange={(e) => setCreateForm({ ...createForm, password_admin: e.target.value })} />
								</div>
								<div>
									<label className="label">Assistant</label>
									<input className="input w-full" type="password" placeholder="ไม่จำเป็น" value={createForm.password_assistant} onChange={(e) => setCreateForm({ ...createForm, password_assistant: e.target.value })} />
								</div>
							</div>
						</div>
					</div>

					<div className="modal-action">
						<button className="btn btn-ghost" onClick={() => createDialogRef.current?.close()}>ยกเลิก</button>
						<button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
							{creating ? "กำลังสร้าง..." : (<><IconPlus size={16} /> สร้างรายการ</>)}
						</button>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop"><button>close</button></form>
			</dialog>
		</div>
	);
}
