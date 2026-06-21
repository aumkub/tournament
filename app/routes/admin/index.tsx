import type { Route } from "./+types/admin/index";
import { parseCookie, verifySession, hasRole } from "../../../lib/kv-session";
import { getSiteSettings } from "../../../lib/site-settings";
import { useState, useEffect } from "react";
import { IconLock } from "../../../components/ui/icons";
import type { Role } from "../../../types/registration";
import { TurnstileWidget } from "../../../components/ui/TurnstileWidget";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	const siteSettings = await getSiteSettings(env.DB);
	const isLocal = ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
	const turnstileSiteKey = isLocal ? null : (siteSettings.turnstileSiteKey || null);

	const results = await env.DB.prepare(
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

	if (!session) {
		return { authenticated: false as const, role: null, tournamentId: null, tournaments: results.results, redirectSlug: null, turnstileSiteKey, isLocal };
	}

	if (session.role === "super_admin") {
		return { authenticated: true as const, role: session.role as Role, tournamentId: session.tournamentId, tournaments: results.results, redirectSlug: null, turnstileSiteKey, isLocal };
	}

	if (session.role === "assistant") {
		const t = results.results.find((r: any) => r.id === session.tournamentId) as any;
		return {
			authenticated: true as const,
			role: session.role as Role,
			tournamentId: session.tournamentId,
			tournaments: results.results,
			redirectSlug: t?.slug || null,
			turnstileSiteKey,
			isLocal,
		};
	}

	return {
		authenticated: true as const,
		role: session.role as Role,
		tournamentId: session.tournamentId,
		tournaments: results.results,
		redirectSlug: null,
		turnstileSiteKey,
		isLocal,
	};
}

export function meta() {
	return [{ title: "Admin — all Thailand" }];
}


export default function AdminIndexPage({ loaderData }: Route.ComponentProps) {
	const [authenticating, setAuthenticating] = useState(false);
	const [password, setPassword] = useState("");
	const [honeypot, setHoneypot] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
	const [selectedSlug, setSelectedSlug] = useState("");
	const [turnstileToken, setTurnstileToken] = useState("");
	const tournaments = loaderData.tournaments as any[];
	const turnstileSiteKey = loaderData.turnstileSiteKey as string | null;
	const isLocal = (loaderData as any).isLocal as boolean;

	useEffect(() => {
		if (!selectedSlug && tournaments.length > 0) {
			setSelectedSlug(tournaments[0].slug);
		}
	}, [tournaments, selectedSlug]);

	useEffect(() => {
		if (!loaderData.authenticated || !loaderData.redirectSlug) return;
		if (loaderData.redirectSlug === "$$site-settings$$") {
			window.location.href = "/portal/site-settings";
		} else {
			window.location.href = `/portal/${loaderData.redirectSlug}/checkin`;
		}
	}, [loaderData.authenticated, loaderData.redirectSlug]);

	// ─── Login view ──────────────────────────────
	if (!loaderData.authenticated) {
		const handleLogin = async () => {
			if (!password) { setError("กรุณาใส่รหัสผ่าน"); return; }
			if (!selectedSlug) { setError("กรุณาเลือกรายการ"); return; }
			if (honeypot) return;
			if (turnstileSiteKey && !turnstileToken) { setError("กรุณายืนยัน Turnstile ก่อน"); return; }

			setAuthenticating(true);
			setError(null);

			try {
				const res = await fetch(`/api/auth/${selectedSlug}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ password, website: honeypot || undefined, turnstileToken: turnstileToken || undefined }),
				});
				const data = await res.json() as any;
				if (!res.ok) {
					if (typeof data.attemptsLeft === "number") setAttemptsLeft(data.attemptsLeft);
					throw new Error(data.error || "รหัสผ่านไม่ถูกต้อง");
				}
				setAttemptsLeft(null);
				if (data.role === "assistant") {
					window.location.href = `/portal/${selectedSlug}/checkin`;
				} else if (data.role === "super_admin") {
					window.location.href = "/portal/site-settings";
				} else {
					window.location.reload();
				}
			} catch (err: any) {
				setError(err.message);
			} finally {
				setAuthenticating(false);
			}
		};

		const handleDevLogin = async (role: "admin" | "assistant" | "super_admin") => {
				if (!selectedSlug) { setError("กรุณาเลือกรายการก่อน"); return; }
				setAuthenticating(true);
				setError(null);
				try {
					const res = await fetch(`/api/auth/${selectedSlug}`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ password: "", devBypass: role }),
					});
					const data = await res.json() as any;
					if (!res.ok) throw new Error(data.error || "failed");
					if (role === "assistant") window.location.href = `/portal/${selectedSlug}/checkin`;
					else if (role === "super_admin") window.location.href = "/portal/site-settings";
					else window.location.reload();
				} catch (err: any) {
					setError(err.message);
				} finally {
					setAuthenticating(false);
				}
			};

		return (
			<div className="max-w-[400px] mx-auto px-lg py-xl">
				<div className="card">
					<div className="flex items-center justify-center gap-2 mb-lg">
						<IconLock size={20} color="var(--color-muted)" />
						<h2 className="!text-[20px] m-0 font-semibold">เข้าสู่ระบบ Admin</h2>
					</div>

					{/* Honeypot */}
					<div style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true">
						<input tabIndex={-1} autoComplete="off" type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
					</div>

					{error && (
						<div className="px-md py-sm bg-[#fef2f2] border border-error rounded-md text-error text-sm mb-md">
							{error}
							{attemptsLeft !== null && attemptsLeft > 0 && (
								<div className="mt-1 font-medium">เหลืออีก {attemptsLeft} ครั้ง ก่อนถูกล็อก</div>
							)}
						</div>
					)}

					<div className="mb-md">
						<label className="label">รายการ</label>
						{tournaments.length === 0 ? (
							<p className="text-muted text-sm">ยังไม่มีรายการในระบบ</p>
						) : (
							<select className="select w-full" value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)}>
								<option value="" disabled>-- เลือกรายการ --</option>
								{tournaments.map((t: any) => (
									<option key={t.id} value={t.slug}>{t.name}</option>
								))}
							</select>
						)}
					</div>

					<div className="mb-md">
						<label className="label">รหัสผ่าน</label>
						<input className="input w-full" type="password" placeholder="ใส่รหัสผ่าน..." value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
					</div>

					{turnstileSiteKey && (
						<div className="mb-md flex justify-center">
							<TurnstileWidget
								siteKey={turnstileSiteKey}
								onToken={setTurnstileToken}
								onExpire={() => setTurnstileToken("")}
							/>
						</div>
					)}

					<button className="btn btn-primary w-full" onClick={handleLogin} disabled={authenticating || tournaments.length === 0}>
						{authenticating ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
					</button>

					{isLocal && (
						<div style={{ marginTop: "var(--spacing-lg)", paddingTop: "var(--spacing-md)", borderTop: "1px solid var(--color-hairline-soft)" }}>
							<p style={{ fontSize: 11, color: "var(--color-muted)", margin: "0 0 8px", textAlign: "center", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
								DEV BYPASS — localhost only
							</p>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								{(["super_admin", "admin", "assistant"] as const).map((role) => (
									<button
										key={role}
										className="btn btn-ghost"
										style={{ fontSize: 13, justifyContent: "flex-start", fontFamily: "var(--font-mono)", gap: 8 }}
										onClick={() => handleDevLogin(role)}
										disabled={authenticating || !selectedSlug}
									>
										<span style={{ width: 10, height: 10, borderRadius: "50%", background: role === "super_admin" ? "#f59e0b" : role === "admin" ? "#3b82f6" : "#10b981", flexShrink: 0 }} />
										{role}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}

	// ─── Authenticated admin view ─────────────────
	const role = loaderData.role as Role;
	const sessionTournament = tournaments.find((t: any) => t.id === loaderData.tournamentId);

	const fmtDate = (ts: number | null) => {
		if (!ts) return "—";
		return new Date(ts).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
	};

	const periodStatus = (openAt: number | null, closeAt: number | null): "upcoming" | "open" | "closed" | "none" => {
		if (!openAt || !closeAt) return "none";
		const now = Date.now();
		if (now < openAt) return "upcoming";
		if (now > closeAt) return "closed";
		return "open";
	};

	const TournamentCard = ({ t, href }: { t: any; href: string }) => {
		const coverUrl = t.photo_url ? `/api/file?key=${encodeURIComponent(t.photo_url)}` : null;
		const regStatus = periodStatus(t.registration_open_at, t.registration_close_at);
		const checkinStatus = periodStatus(t.checkin_open_at, t.checkin_close_at);
		const regCount = t.registration_count ?? 0;
		const checkinCount = t.checkin_count ?? 0;
		const statusLabel = { open: "เปิด", upcoming: "เร็วๆ นี้", closed: "ปิด", none: "" } as const;
		const statusColor = { open: "#16a34a", upcoming: "#ca8a04", closed: "#9ca3af", none: "#9ca3af" } as const;

		return (
			<a href={href} className="card !p-0 flex flex-col overflow-hidden no-underline group transition-all hover:shadow-lg">
				<div className="relative w-full shrink-0 overflow-hidden" style={{ aspectRatio: "16/9", background: "var(--color-surface-soft)" }}>
					{coverUrl
						? <img src={coverUrl} alt={t.name} className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]" style={{ transitionDuration: "400ms" }} />
						: <div className="w-full h-full flex items-center justify-center text-[40px] font-black select-none opacity-60" style={{ color: "var(--color-muted-soft)" }}>{t.name.charAt(0).toUpperCase()}</div>
					}
					<div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 50%, transparent 100%)" }} />
					<div className="absolute bottom-0 left-0 right-0 px-md pb-sm pt-lg flex items-end justify-between gap-sm">
						<span className="text-white font-semibold !text-[20px] leading-snug line-clamp-2" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{t.name}</span>
						<div className="shrink-0 flex gap-xs">
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
			</a>
		);
	};

	if (role === "super_admin") {
		return (
			<div className="max-w-[1200px] mx-auto px-lg py-xl">
				<div className="flex justify-between items-center mb-lg">
					<div>
						<h2 className="!text-[26px] font-semibold m-0">ทุกรายการ</h2>
						<span className="text-sm text-muted">Super Admin</span>
					</div>
					<a href="/portal/site-settings" className="btn btn-secondary no-underline">ตั้งค่าเว็บไซต์</a>
				</div>

				{tournaments.length === 0 ? (
					<div className="card text-center text-muted">
						<p className="text-base mb-md">ยังไม่มีรายการ</p>
						<a href="/portal/site-settings" className="btn btn-primary no-underline">ไปที่ตั้งค่าเว็บไซต์</a>
					</div>
				) : (
					<div className="grid gap-sm" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
						{tournaments.map((t: any) => (
							<TournamentCard key={t.id} t={t} href={`/portal/${t.slug}`} />
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="max-w-[1200px] mx-auto px-lg py-xl">
			<div className="flex justify-between items-center mb-lg">
				<div>
					<h2 className="!text-[26px] font-semibold m-0">{sessionTournament?.name || "Dashboard"}</h2>
					<span className="text-sm text-muted">{role === "admin" ? "Admin" : "Assistant"}</span>
				</div>
			</div>

			<div className="grid gap-sm" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
				{sessionTournament ? (
					<TournamentCard t={sessionTournament} href={`/portal/${sessionTournament.slug}`} />
				) : (
					<div className="card text-center text-muted">
						ไม่พบรายการของคุณ — กรุณาเข้าสู่ระบบใหม่
					</div>
				)}
			</div>
		</div>
	);
}