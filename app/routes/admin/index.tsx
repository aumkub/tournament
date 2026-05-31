import type { Route } from "./+types/admin/index";
import { parseCookie, verifySession } from "../../../lib/kv-session";
import { useState, useEffect, useRef } from "react";
import {
	IconLock,
	IconPlus,
	IconLogOut,
	IconArrowRight,
	IconArrowLeft,
	IconX,
	IconCheck,
	IconCamera,
} from "../../../components/ui/icons";
import type { Role } from "../../../types/registration";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");

	const results = await env.DB.prepare(
		"SELECT id, name, slug, photo_url, created_at FROM tournaments ORDER BY created_at DESC",
	).all();

	if (!session) {
		return { authenticated: false as const, role: null, tournamentId: null, tournaments: results.results, redirectSlug: null };
	}

	if (session.role === "assistant") {
		const t = results.results.find((r: any) => r.id === session.tournamentId) as any;
		return {
			authenticated: true as const,
			role: session.role as Role,
			tournamentId: session.tournamentId,
			tournaments: results.results,
			redirectSlug: t?.slug || null,
		};
	}

	return {
		authenticated: true as const,
		role: session.role as Role,
		tournamentId: session.tournamentId,
		tournaments: results.results,
		redirectSlug: null,
	};
}

export function meta() {
	return [{ title: "Admin — Tournament Management" }];
}

export default function AdminIndexPage({ loaderData }: Route.ComponentProps) {
	const [authenticating, setAuthenticating] = useState(false);
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [selectedSlug, setSelectedSlug] = useState("");
	const tournaments = loaderData.tournaments as any[];

	// Create tournament state
	const createDialogRef = useRef<HTMLDialogElement>(null);
	const [creating, setCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [createForm, setCreateForm] = useState({
		name: "",
		slug: "",
		password_assistant: "",
		password_admin: "",
		password_super_admin: "",
		registration_open_at: "",
		registration_close_at: "",
		checkin_open_at: "",
		checkin_close_at: "",
	});

	// Auto-suggest slug from name
	useEffect(() => {
		const slug = createForm.name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.slice(0, 60);
		setCreateForm((prev) => ({ ...prev, slug }));
	}, [createForm.name]);

	useEffect(() => {
		if (!selectedSlug && tournaments.length > 0) {
			setSelectedSlug(tournaments[0].slug);
		}
	}, [tournaments, selectedSlug]);

	useEffect(() => {
		if (loaderData.authenticated && loaderData.redirectSlug) {
			window.location.href = `/admin/${loaderData.redirectSlug}/checkin`;
		}
	}, [loaderData.authenticated, loaderData.redirectSlug]);

	const handleCreate = async () => {
		if (!createForm.name.trim()) {
			setCreateError("กรุณาใส่ชื่อทัวร์นาเมนต์");
			return;
		}
		if (!createForm.password_super_admin.trim()) {
			setCreateError("กรุณาตั้งรหัสผ่าน Super Admin");
			return;
		}
		if (!createForm.registration_open_at || !createForm.registration_close_at) {
			setCreateError("กรุณากำหนดช่วงเวลาลงทะเบียน");
			return;
		}
		if (!createForm.checkin_open_at || !createForm.checkin_close_at) {
			setCreateError("กรุณากำหนดช่วงเวลาเช็คอิน");
			return;
		}

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
						super_admin: createForm.password_super_admin,
					},
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "ไม่สามารถสร้างทัวร์นาเมนต์ได้");
			}

			const data = await res.json();
			window.location.href = `/admin/${data.slug}/settings`;
		} catch (err: any) {
			setCreateError(err.message);
		} finally {
			setCreating(false);
		}
	};

	// ─── Login view ──────────────────────────────
	if (!loaderData.authenticated) {
		const handleLogin = async () => {
			if (!password) { setError("กรุณาใส่รหัสผ่าน"); return; }
			if (!selectedSlug) { setError("กรุณาเลือกทัวร์นาเมนต์"); return; }
			setAuthenticating(true);
			setError(null);

			try {
				const res = await fetch(`/api/auth/${selectedSlug}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ password }),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "รหัสผ่านไม่ถูกต้อง");
				if (data.role === "assistant") {
					window.location.href = `/admin/${selectedSlug}/checkin`;
				} else {
					window.location.reload();
				}
			} catch (err: any) {
				setError(err.message);
			} finally {
				setAuthenticating(false);
			}
		};

		return (
			<div style={{ maxWidth: 400, margin: "0 auto", padding: "var(--spacing-section) var(--spacing-lg)" }}>
				<div style={{ textAlign: "center", marginBottom: "var(--spacing-lg)" }}>
					<a href="/" style={{ fontSize: 13, color: "var(--color-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
						<IconArrowLeft size={14} /> กลับหน้าหลัก
					</a>
				</div>
				<div className="card">
					<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: "var(--spacing-lg)" }}>
						<IconLock size={22} />
						<h1 style={{ fontSize: 24, margin: 0 }}>Admin Login</h1>
					</div>

					{error && (
						<div style={{ padding: "var(--spacing-sm) var(--spacing-md)", background: "#fef2f2", border: "1px solid var(--color-error)", borderRadius: "var(--radius-md)", color: "var(--color-error)", fontSize: 14, marginBottom: "var(--spacing-md)" }}>
							{error}
						</div>
					)}

					<div style={{ marginBottom: "var(--spacing-md)" }}>
						<label className="label">ทัวร์นาเมนต์</label>
						{tournaments.length === 0 ? (
							<p style={{ color: "var(--color-muted)", fontSize: 14 }}>ยังไม่มีทัวร์นาเมนต์ในระบบ</p>
						) : (
							<select className="select select-bordered w-full" value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)}>
								<option value="" disabled>-- เลือกทัวร์นาเมนต์ --</option>
								{tournaments.map((t: any) => (
									<option key={t.id} value={t.slug}>{t.name}</option>
								))}
							</select>
						)}
					</div>

					<div style={{ marginBottom: "var(--spacing-md)" }}>
						<label className="label">รหัสผ่าน</label>
						<input className="input input-bordered w-full" type="password" placeholder="ใส่รหัสผ่าน..." value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
					</div>

					<button className="btn btn-primary" onClick={handleLogin} disabled={authenticating || tournaments.length === 0} style={{ width: "100%" }}>
						{authenticating ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
					</button>
				</div>
			</div>
		);
	}

	// ─── Authenticated view ──────────────────────
	const role = loaderData.role as Role;
	const isSuperAdmin = role === "super_admin";
	const sessionTournament = tournaments.find((t: any) => t.id === loaderData.tournamentId);

	return (
		<div style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--spacing-lg)" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-xl)" }}>
				<div>
					<h1 style={{ fontSize: 28, marginBottom: 4 }}>
						{isSuperAdmin ? "Tournaments" : (sessionTournament?.name || "Dashboard")}
					</h1>
					<span style={{ fontSize: 13, color: "var(--color-muted)" }}>
						บทบาท: {role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "Assistant"}
					</span>
				</div>
				<div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
					<a href="/" className="btn btn-ghost" style={{ textDecoration: "none" }}>
						<IconArrowLeft size={16} /> หน้าหลัก
					</a>
					{isSuperAdmin && (
						<button className="btn btn-primary" onClick={() => createDialogRef.current?.showModal()}>
							<IconPlus size={16} /> สร้างทัวร์นาเมนต์
						</button>
					)}
					<button
						className="btn btn-secondary"
						onClick={async () => {
							await fetch("/api/auth/logout", { method: "POST" });
							window.location.reload();
						}}
					>
						<IconLogOut size={16} /> ออกจากระบบ
					</button>
				</div>
			</div>

			{isSuperAdmin ? (
				tournaments.length === 0 ? (
					<div className="card" style={{ textAlign: "center", color: "var(--color-muted)" }}>
						<p style={{ fontSize: 16, marginBottom: "var(--spacing-md)" }}>ยังไม่มีทัวร์นาเมนต์</p>
						<button className="btn btn-primary" onClick={() => createDialogRef.current?.showModal()}>
							<IconPlus size={16} /> สร้างทัวร์นาเมนต์ใหม่
						</button>
					</div>
				) : (
					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--spacing-lg)" }}>
						{tournaments.map((t: any) => {
							const coverUrl = t.photo_url ? `/api/file?key=${encodeURIComponent(t.photo_url)}` : null;
							return (
								<a
									key={t.id}
									href={`/admin/${t.slug}`}
									className="card"
									style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", textDecoration: "none", transition: "box-shadow 0.15s" }}
								>
									<div style={{ width: "100%", aspectRatio: "16/7", background: "#f5f0e8", overflow: "hidden" }}>
										{coverUrl ? (
											<img src={coverUrl} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
										) : (
											<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8e8b82" }}>
												<IconCamera size={28} color="#8e8b82" />
											</div>
										)}
									</div>
									<div style={{ padding: "var(--spacing-md) var(--spacing-lg)" }}>
										<h3 style={{ fontSize: 18, marginBottom: 4, color: "var(--color-ink)" }}>{t.name}</h3>
										<p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>slug: {t.slug}</p>
									</div>
								</a>
							);
						})}
					</div>
				)
			) : (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--spacing-lg)" }}>
					{sessionTournament ? (() => {
						const coverUrl = sessionTournament.photo_url ? `/api/file?key=${encodeURIComponent(sessionTournament.photo_url)}` : null;
						return (
							<a
								href={`/admin/${sessionTournament.slug}`}
								className="card"
								style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", textDecoration: "none", transition: "box-shadow 0.15s" }}
							>
								<div style={{ width: "100%", aspectRatio: "16/7", background: "#f5f0e8", overflow: "hidden" }}>
									{coverUrl ? (
										<img src={coverUrl} alt={sessionTournament.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
									) : (
										<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8e8b82" }}>
											<IconCamera size={28} color="#8e8b82" />
										</div>
									)}
								</div>
								<div style={{ padding: "var(--spacing-md) var(--spacing-lg)" }}>
									<h3 style={{ fontSize: 18, marginBottom: 4, color: "var(--color-ink)" }}>{sessionTournament.name}</h3>
									<p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
										<IconArrowRight size={14} /> เข้าสู่ Dashboard
									</p>
								</div>
							</a>
						);
					})() : (
						<div className="card" style={{ textAlign: "center", color: "var(--color-muted)" }}>
							ไม่พบทัวร์นาเมนต์ของคุณ — กรุณาเข้าสู่ระบบใหม่
						</div>
					)}
				</div>
			)}

			{/* ─── Create Tournament Dialog ─────────── */}
			<dialog ref={createDialogRef} className="modal">
				<div className="modal-box" style={{ maxWidth: 560 }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-lg)" }}>
						<h2 style={{ fontSize: 20, margin: 0 }}>สร้างทัวร์นาเมนต์ใหม่</h2>
						<button className="btn btn-sm btn-ghost btn-circle" onClick={() => createDialogRef.current?.close()}>
							<IconX size={16} />
						</button>
					</div>

					{createError && (
						<div style={{ padding: "var(--spacing-sm) var(--spacing-md)", background: "#fef2f2", border: "1px solid var(--color-error)", borderRadius: "var(--radius-md)", color: "var(--color-error)", fontSize: 14, marginBottom: "var(--spacing-md)" }}>
							{createError}
						</div>
					)}

					<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
						<div>
							<label className="label">ชื่อทัวร์นาเมนต์ *</label>
							<input className="input input-bordered w-full" placeholder="เช่น Junior Golf Open 2026" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
						</div>
						<div>
							<label className="label">Slug (URL)</label>
							<input className="input input-bordered w-full" placeholder="auto-from-name" value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })} />
						</div>

						<div style={{ borderTop: "1px solid #e6dfd8", paddingTop: "var(--spacing-md)" }}>
							<p style={{ fontSize: 14, fontWeight: 600, marginBottom: "var(--spacing-sm)" }}>ช่วงเวลาลงทะเบียน</p>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
								<div>
									<label className="label">เปิด *</label>
									<input className="input input-bordered w-full" type="datetime-local" value={createForm.registration_open_at} onChange={(e) => setCreateForm({ ...createForm, registration_open_at: e.target.value })} />
								</div>
								<div>
									<label className="label">ปิด *</label>
									<input className="input input-bordered w-full" type="datetime-local" value={createForm.registration_close_at} onChange={(e) => setCreateForm({ ...createForm, registration_close_at: e.target.value })} />
								</div>
							</div>
						</div>

						<div>
							<p style={{ fontSize: 14, fontWeight: 600, marginBottom: "var(--spacing-sm)" }}>ช่วงเวลาเช็คอิน</p>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
								<div>
									<label className="label">เปิด *</label>
									<input className="input input-bordered w-full" type="datetime-local" value={createForm.checkin_open_at} onChange={(e) => setCreateForm({ ...createForm, checkin_open_at: e.target.value })} />
								</div>
								<div>
									<label className="label">ปิด *</label>
									<input className="input input-bordered w-full" type="datetime-local" value={createForm.checkin_close_at} onChange={(e) => setCreateForm({ ...createForm, checkin_close_at: e.target.value })} />
								</div>
							</div>
						</div>

						<div style={{ borderTop: "1px solid #e6dfd8", paddingTop: "var(--spacing-md)" }}>
							<p style={{ fontSize: 14, fontWeight: 600, marginBottom: "var(--spacing-sm)" }}>รหัสผ่าน</p>
							<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
								<div>
									<label className="label">Super Admin *</label>
									<input className="input input-bordered w-full" type="password" placeholder="ต้องระบุ" value={createForm.password_super_admin} onChange={(e) => setCreateForm({ ...createForm, password_super_admin: e.target.value })} />
								</div>
								<div>
									<label className="label">Admin</label>
									<input className="input input-bordered w-full" type="password" placeholder="ไม่จำเป็น" value={createForm.password_admin} onChange={(e) => setCreateForm({ ...createForm, password_admin: e.target.value })} />
								</div>
								<div>
									<label className="label">Assistant</label>
									<input className="input input-bordered w-full" type="password" placeholder="ไม่จำเป็น" value={createForm.password_assistant} onChange={(e) => setCreateForm({ ...createForm, password_assistant: e.target.value })} />
								</div>
							</div>
						</div>
					</div>

					<div className="modal-action">
						<button className="btn btn-ghost" onClick={() => createDialogRef.current?.close()}>ยกเลิก</button>
						<button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
							{creating ? "กำลังสร้าง..." : (<><IconPlus size={16} /> สร้างทัวร์นาเมนต์</>)}
						</button>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop"><button>close</button></form>
			</dialog>
		</div>
	);
}
