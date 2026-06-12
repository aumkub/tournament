import { useState, useRef, useCallback, useEffect } from "react";
import { FORM_CONFIGS } from "../../lib/form-configs/index";
import jsQR from "jsqr";
import {
	IconCamera,
	IconCheckCircleFilled,
	IconWarningFilled,
	IconXCircleFilled,
	IconQrCode,
	IconCheck,
	IconAlertTriangle,
	IconAlertCircle,
	IconLock,
	IconClock,
} from "../ui/icons";

interface QRScannerProps {
	slug: string;
	testMode?: boolean;
	typeLabels?: Record<string, string>;
}

type ScanResult =
	| { status: "success"; name: string; type: string; checked_in_at: number }
	| { status: "already_checked_in"; name: string; type: string; checked_in_at: number }
	| { status: "not_found"; error: string }
	| { status: "error"; error: string }
	| { status: "closed"; error: string }
	| { status: "not_yet"; error: string };

const DEMO_SCENARIOS: { label: string; icon: JSX.Element; result: ScanResult }[] = [
	{
		label: "เช็คอินสำเร็จ",
		icon: <IconCheck size={14} color="var(--color-success)" />,
		result: { status: "success", name: "สมชาย ใจดี", type: "competitor", checked_in_at: Date.now() },
	},
	{
		label: "เช็คอินแล้ว",
		icon: <IconAlertTriangle size={14} color="var(--color-warning)" />,
		result: { status: "already_checked_in", name: "วิภา รักไทย", type: "attendee", checked_in_at: Date.now() - 300_000 },
	},
	{
		label: "ไม่พบข้อมูล",
		icon: <IconAlertCircle size={14} color="var(--color-error)" />,
		result: { status: "not_found", error: "ไม่พบข้อมูลการลงทะเบียน" },
	},
	{
		label: "หมดเวลา",
		icon: <IconLock size={14} color="var(--color-error)" />,
		result: { status: "closed", error: "เลยเวลาเช็คอินแล้ว" },
	},
	{
		label: "ยังไม่ถึงเวลา",
		icon: <IconClock size={14} color="var(--color-muted)" />,
		result: { status: "not_yet", error: "ยังไม่ถึงเวลาเช็คอิน" },
	},
];

interface LogEntry {
	name: string;
	registration_type: string;
	checked_in_at: number;
	key: number;
}

export function QRScanner({ slug, testMode, typeLabels = {} }: QRScannerProps) {
	const getTypeLabel = (t: string) => typeLabels[t] || FORM_CONFIGS[t]?.label.th || t;
	const [scanning, setScanning] = useState(false);
	const [result, setResult] = useState<ScanResult | null>(null);
	const [emailInput, setEmailInput] = useState("");
	const [idInput, setIdInput] = useState("");
	const [manualTab, setManualTab] = useState<"id" | "email">("id");
	const [showDemo, setShowDemo] = useState(false);
	const [log, setLog] = useState<LogEntry[]>([]);
	const [filterLog, setFilterLog] = useState<string>("");
	const [stats, setStats] = useState<{ total: number; checkedIn: number } | null>(null);
	const fetchStatsRef = useRef<() => void>(() => {});
	useEffect(() => {
		fetchStatsRef.current = async () => {
			try {
				const res = await fetch(`/api/admin/${slug}/stats`);
				if (res.ok) {
					const d = await res.json() as { total: number; checkedIn: number };
					setStats({ total: d.total, checkedIn: d.checkedIn });
				}
			} catch {}
		};
	});
	useEffect(() => { fetchStatsRef.current(); }, [slug]);
	const wsRef = useRef<WebSocket | null>(null);

	// Seed log with recent check-ins from DB
	useEffect(() => {
		fetch(`/api/admin/${slug}/checkin-log?limit=100`)
			.then((r) => r.json())
			.then((data: any) => {
				if (data.events) {
					setLog(data.events.map((e: any, i: number) => ({ ...e, key: e.checked_in_at + i })));
				}
			})
			.catch(() => {});
	}, [slug]);

	// WebSocket live feed with auto-reconnect
	useEffect(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		let ws: WebSocket;
		let reconnectTimer: ReturnType<typeof setTimeout>;
		let dead = false;

		const connect = () => {
			if (dead) return;
			ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/${slug}`);
			wsRef.current = ws;
			ws.onmessage = (evt) => {
				try {
					const data = JSON.parse(evt.data);
					if (data.type === "checkin" && data.name) {
						setLog((prev) => {
							if (prev.length > 0 && prev[0].checked_in_at === data.checked_in_at) return prev;
							return [{ name: data.name, registration_type: data.registration_type, checked_in_at: data.checked_in_at, key: Date.now() + Math.random() }, ...prev].slice(0, 200);
						});
						setStats((prev) => prev ? { ...prev, checkedIn: prev.checkedIn + 1 } : prev);
					}
					if (data.type === "register") {
						setStats((prev) => prev ? { ...prev, total: prev.total + 1 } : prev);
					}
				} catch {}
			};
			ws.onclose = () => {
				if (!dead) reconnectTimer = setTimeout(connect, 3000);
			};
			ws.onerror = () => ws.close();
		};

		connect();
		return () => {
			dead = true;
			clearTimeout(reconnectTimer);
			ws?.close();
		};
	}, [slug]);
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rafRef = useRef<number | null>(null);
	const lastScannedRef = useRef<string | null>(null);

	const handleCheckin = useCallback(
		async (payload: { token?: string; email?: string; id?: string }) => {
			const value = payload.token?.trim() || payload.email?.trim() || payload.id?.trim();
			if (!value) return;
			try {
				const body = payload.token
					? { token: payload.token.trim() }
					: payload.id
					? { id: payload.id.trim().toUpperCase() }
					: { email: payload.email!.trim() };
				const res = await fetch(`/api/checkin/${slug}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
				const data = await res.json();
				setResult(data);
				setTimeout(() => setResult(null), 3000);
				// Push to log immediately on success (don't wait for WS which may lag or fail locally)
				if (data.status === "success" && data.name) {
					setLog((prev) => {
						const entry: LogEntry = {
							name: data.name,
							registration_type: data.type,
							checked_in_at: data.checked_in_at ?? Date.now(),
							key: Date.now(),
						};
						// Avoid duplicate if WS also fires
						if (prev.length > 0 && prev[0].checked_in_at === entry.checked_in_at) return prev;
						return [entry, ...prev].slice(0, 200);
					});
				}
			} catch (err: any) {
				setResult({ status: "error", error: err.message });
			}
		},
		[slug],
	);

	const handleScan = useCallback(
		(code: string) => {
			// UUID format = 36 chars with dashes (old QR codes use qr_code_token)
			// New QR codes = 6-char uppercase alphanumeric registration ID
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
			if (isUUID) {
				handleCheckin({ token: code });
			} else {
				handleCheckin({ id: code });
			}
		},
		[handleCheckin],
	);

	const scanFrame = useCallback(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
			rafRef.current = requestAnimationFrame(scanFrame);
			return;
		}
		const ctx = canvas.getContext("2d");
		if (!ctx) { rafRef.current = requestAnimationFrame(scanFrame); return; }

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const code = jsQR(imageData.data, imageData.width, imageData.height, {
			inversionAttempts: "dontInvert",
		});

		if (code && code.data && code.data !== lastScannedRef.current) {
			lastScannedRef.current = code.data;
			handleScan(code.data);
			// Reset cooldown after 3s to allow re-scan
			setTimeout(() => { lastScannedRef.current = null; }, 3000);
		}

		rafRef.current = requestAnimationFrame(scanFrame);
	}, [handleScan]);

	const startCamera = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "environment" },
			});
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				videoRef.current.onloadedmetadata = () => {
					rafRef.current = requestAnimationFrame(scanFrame);
				};
			}
			setScanning(true);
		} catch (err) {
			console.error("Camera error:", err);
		}
	}, [scanFrame]);

	const stopCamera = useCallback(() => {
		if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((t) => t.stop());
			streamRef.current = null;
		}
		lastScannedRef.current = null;
		setScanning(false);
	}, []);

	useEffect(() => {
		return () => { stopCamera(); };
	}, [stopCamera]);

	const resultBg =
		result?.status === "success"
			? "rgba(22,163,74,0.92)"
			: result?.status === "already_checked_in"
			? "rgba(180,120,0,0.92)"
			: "rgba(185,28,28,0.92)";

	return (
		<div>
			{/* Hidden canvas for QR decoding */}
			<canvas ref={canvasRef} style={{ display: "none" }} />
			{/* Camera viewport */}
			<div
				className="relative w-full rounded-xl overflow-hidden mb-md"
				style={{ aspectRatio: "1/1", background: "#0f0f0e" }}
			>
				<video
					ref={videoRef}
					autoPlay
					muted
					playsInline
					className="w-full h-full object-cover"
					style={{ opacity: scanning ? 1 : 0 }}
				/>

				{/* Idle state */}
				{!scanning && !result && (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
						<div style={{
							width: 72, height: 72, borderRadius: "var(--radius-lg)",
							background: "rgba(255,255,255,0.06)",
							display: "flex", alignItems: "center", justifyContent: "center",
						}}>
							<IconQrCode size={36} color="rgba(255,255,255,0.35)" />
						</div>
						<p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>
							กดเปิดกล้องเพื่อสแกน QR
						</p>
					</div>
				)}

				{/* Corner brackets scanner frame */}
				{scanning && (
					<div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
						<div style={{ position: "relative", width: "65%", aspectRatio: "1/1" }}>
							{/* Top-left */}
							<span style={{ position: "absolute", top: 0, left: 0, width: 24, height: 24, borderTop: "3px solid white", borderLeft: "3px solid white", borderRadius: "4px 0 0 0", opacity: 0.9 }} />
							{/* Top-right */}
							<span style={{ position: "absolute", top: 0, right: 0, width: 24, height: 24, borderTop: "3px solid white", borderRight: "3px solid white", borderRadius: "0 4px 0 0", opacity: 0.9 }} />
							{/* Bottom-left */}
							<span style={{ position: "absolute", bottom: 0, left: 0, width: 24, height: 24, borderBottom: "3px solid white", borderLeft: "3px solid white", borderRadius: "0 0 0 4px", opacity: 0.9 }} />
							{/* Bottom-right */}
							<span style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderBottom: "3px solid white", borderRight: "3px solid white", borderRadius: "0 0 4px 0", opacity: 0.9 }} />
						</div>
					</div>
				)}

				{/* Result overlay */}
				{result && (
					<div
						className="absolute inset-0 flex items-center justify-center"
						style={{ background: resultBg, backdropFilter: "blur(2px)" }}
					>
						<div style={{ textAlign: "center", color: "white", padding: "var(--spacing-xl)" }}>
							{result.status === "success" && (
								<>
									<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block" }}>
										<circle cx="36" cy="36" r="34" stroke="white" strokeWidth="4" fill="rgba(255,255,255,0.15)" />
										<polyline points="20,37 31,48 52,26" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
									</svg>
									<p style={{ fontSize: 22, fontWeight: 800, margin: "14px 0 6px", letterSpacing: "-0.3px" }}>เช็คอินสำเร็จ!</p>
									<p style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>{result.name}</p>
									<p style={{ fontSize: 13, opacity: 0.85, margin: "5px 0 0", fontWeight: 400 }}>
										{result.type === "competitor" ? "ผู้เข้าแข่งขัน" : "ผู้เข้าร่วมงาน"}
									</p>
								</>
							)}
							{result.status === "already_checked_in" && (
								<>
									<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block" }}>
										<circle cx="36" cy="36" r="34" stroke="white" strokeWidth="4" fill="rgba(255,255,255,0.15)" />
										<line x1="36" y1="22" x2="36" y2="42" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
										<circle cx="36" cy="51" r="3" fill="white" />
									</svg>
									<p style={{ fontSize: 22, fontWeight: 800, margin: "14px 0 6px", letterSpacing: "-0.3px" }}>เช็คอินแล้ว</p>
									<p style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>{result.name}</p>
									<p style={{ fontSize: 13, opacity: 0.85, margin: "5px 0 0", fontWeight: 400 }}>
										{new Date(result.checked_in_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" })}
									</p>
								</>
							)}
							{(result.status === "not_found" || result.status === "error" || result.status === "closed" || result.status === "not_yet") && (
								<>
									<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block" }}>
										<circle cx="36" cy="36" r="34" stroke="white" strokeWidth="4" fill="rgba(255,255,255,0.15)" />
										<line x1="24" y1="24" x2="48" y2="48" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
										<line x1="48" y1="24" x2="24" y2="48" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
									</svg>
									<p style={{ fontSize: 20, fontWeight: 800, margin: "14px 0 6px", letterSpacing: "-0.3px" }}>
										{result.status === "not_found" ? "ไม่พบข้อมูล"
										: result.status === "closed" ? "หมดเวลาเช็คอิน"
										: result.status === "not_yet" ? "ยังไม่ถึงเวลา"
										: "ข้อผิดพลาด"}
									</p>
									<p style={{ fontSize: 13, opacity: 0.85, margin: 0, fontWeight: 400 }}>{(result as any).error}</p>
								</>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Camera toggle button */}
			<div className="flex gap-sm mb-lg">
				{scanning ? (
					<button className="btn btn-secondary flex-1" onClick={stopCamera}>
						หยุดสแกน
					</button>
				) : (
					<button className="btn btn-primary flex-1" onClick={startCamera}>
						<IconCamera size={16} /> เปิดกล้อง
					</button>
				)}
			</div>

			{/* Manual input card */}
			<div className="card">
				{/* Tabs */}
				<div className="flex gap-xs mb-md">
					<button
						className={`btn btn-sm flex-1 ${manualTab === "id" ? "btn-primary" : "btn-ghost"}`}
						onClick={() => setManualTab("id")}
					>
						รหัสการจอง
					</button>
					<button
						className={`btn btn-sm flex-1 ${manualTab === "email" ? "btn-primary" : "btn-ghost"}`}
						onClick={() => setManualTab("email")}
					>
						อีเมล
					</button>
				</div>

				{manualTab === "id" && (
					<div className="flex gap-sm">
						<input
							className="input flex-1 uppercase"
							placeholder="รหัส 6 ตัว เช่น AB3X7K"
							value={idInput}
							maxLength={6}
							onChange={(e) => setIdInput(e.target.value.toUpperCase())}
							onKeyDown={(e) => {
								if (e.key === "Enter") { handleCheckin({ id: idInput }); setIdInput(""); }
							}}
						/>
						<button
							className="btn btn-secondary"
							onClick={() => { handleCheckin({ id: idInput }); setIdInput(""); }}
						>
							เช็คอิน
						</button>
					</div>
				)}
				{manualTab === "email" && (
					<div className="flex gap-sm">
						<input
							className="input flex-1"
							type="email"
							placeholder="กรอกอีเมลผู้ลงทะเบียน..."
							value={emailInput}
							onChange={(e) => setEmailInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") { handleCheckin({ email: emailInput }); setEmailInput(""); }
							}}
						/>
						<button
							className="btn btn-secondary"
							onClick={() => { handleCheckin({ email: emailInput }); setEmailInput(""); }}
						>
							เช็คอิน
						</button>
					</div>
				)}
			</div>

			{/* Demo mode panel */}
			{testMode && (
				<div className="mt-lg">
					<button
						className="btn btn-sm btn-ghost w-full gap-1.5 border border-dashed border-warning text-warning hover:bg-[rgba(212,160,23,0.08)]"
						onClick={() => setShowDemo((v) => !v)}
					>
						<span className="text-base">🧪</span>
						{showDemo ? "ซ่อน Demo Scenarios" : "ทดสอบ Scenarios"}
					</button>

					{showDemo && (
						<div className="mt-sm card p-md flex flex-col gap-2" style={{ borderColor: "var(--color-warning)", borderStyle: "dashed" }}>
							<p className="text-xs text-muted m-0 mb-1 font-medium uppercase tracking-wide">Demo Mode — ไม่ได้เช็คอินจริง</p>
							{DEMO_SCENARIOS.map((s) => (
								<button
									key={s.label}
									className="btn btn-sm btn-ghost text-left justify-start gap-2"
									onClick={() => {
										const r = s.result.status === "success" || s.result.status === "already_checked_in"
											? { ...s.result, checked_in_at: Date.now() }
											: s.result;
										setResult(r as ScanResult);
										setTimeout(() => setResult(null), 3000);
									}}
								>
									{s.icon}
									{s.label}
								</button>
							))}
						</div>
					)}
				</div>
			)}
			{/* Live check-in log */}
			<div className="mt-lg">
				<div className="flex items-center gap-2 mb-sm">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
					</svg>
					<h3 className="text-sm font-semibold text-body m-0">เช็คอินล่าสุด</h3>
					{log.length > 0 && (() => {
						const types = Array.from(new Set(log.map((e) => e.registration_type)));
						if (types.length <= 1) return null;
						return (
							<div className="flex items-center gap-1 ml-auto">
								<button type="button" onClick={() => setFilterLog("")} className={`text-xs px-2 py-0.5 rounded-full border-0 cursor-pointer transition-colors ${filterLog === "" ? "bg-primary text-white" : "bg-surface-soft text-muted hover:text-body"}`}>ทั้งหมด</button>
								{types.map((t) => (
									<button key={t} type="button" onClick={() => setFilterLog(t)} className={`text-xs px-2 py-0.5 rounded-full border-0 cursor-pointer transition-colors ${filterLog === t ? "bg-primary text-white" : "bg-surface-soft text-muted hover:text-body"}`}>
										{getTypeLabel(t)}
									</button>
								))}
							</div>
						);
					})()}
				</div>

				{log.length === 0 ? (
					<div className="card text-center py-lg">
						<p className="text-sm text-muted m-0">ยังไม่มีการเช็คอิน</p>
					</div>
				) : (
					<div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 320 }}>
						{(filterLog ? log.filter((e) => e.registration_type === filterLog) : log).map((entry, i) => (
							<div
								key={entry.key}
								className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-colors ${i === 0 && !filterLog ? "bg-[#f0fdf4] border border-[#bbf7d0]" : "bg-surface-soft"}`}
							>
								<IconCheckCircleFilled size={16} color={i === 0 && !filterLog ? "var(--color-success)" : "var(--color-muted-soft)"} className="flex-shrink-0 mt-0.5" />
								<div className="flex flex-col flex-1 min-w-0">
									<span className="text-sm font-medium text-ink">{entry.name}</span>
									<span className="!text-sm text-muted">{getTypeLabel(entry.registration_type)}</span>
								</div>
								<span className="!text-xs text-muted whitespace-nowrap flex-shrink-0">
									{(() => {
										const now = Date.now();
										const diffMs = now - entry.checked_in_at;
										const diffMin = Math.floor(diffMs / 60000);
										const diffHour = Math.floor(diffMin / 60);
										if (diffMin < 1) return "เมื่อสักครู่";
										if (diffMin === 1) return "1 นาทีที่แล้ว";
										if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
										if (diffHour === 1) return "1 ชั่วโมงที่แล้ว";
										if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;
										const d = new Date(entry.checked_in_at);
										return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
									})()}
								</span>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
