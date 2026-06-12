import { useState, useRef, useCallback, useEffect } from "react";
import {
	IconCamera,
	IconCheckCircleFilled,
	IconWarningFilled,
	IconXCircleFilled,
	IconQrCode,
} from "../ui/icons";

interface QRScannerProps {
	slug: string;
}

type ScanResult =
	| { status: "success"; name: string; type: string; checked_in_at: number }
	| { status: "already_checked_in"; name: string; type: string; checked_in_at: number }
	| { status: "not_found"; error: string }
	| { status: "error"; error: string };

export function QRScanner({ slug }: QRScannerProps) {
	const [scanning, setScanning] = useState(false);
	const [result, setResult] = useState<ScanResult | null>(null);
	const [manualToken, setManualToken] = useState("");
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const handleScan = useCallback(
		async (token: string) => {
			if (!token.trim()) return;
			try {
				const res = await fetch(`/api/checkin/${slug}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token: token.trim() }),
				});
				const data = await res.json();
				setResult(data);
				setTimeout(() => setResult(null), 2500);
			} catch (err: any) {
				setResult({ status: "error", error: err.message });
			}
		},
		[slug],
	);

	const startCamera = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "environment" },
			});
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
			setScanning(true);
		} catch (err) {
			console.error("Camera error:", err);
		}
	}, []);

	const stopCamera = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((t) => t.stop());
			streamRef.current = null;
		}
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
									<IconCheckCircleFilled size={52} color="white" />
									<p style={{ fontSize: 20, fontWeight: 700, margin: "12px 0 6px" }}>เช็คอินสำเร็จ!</p>
									<p style={{ fontSize: 15, margin: 0, fontWeight: 500 }}>{result.name}</p>
									<p style={{ fontSize: 12, opacity: 0.85, margin: "4px 0 0" }}>
										{result.type === "competitor" ? "ผู้เข้าแข่งขัน" : "ผู้เข้าร่วมงาน"}
									</p>
								</>
							)}
							{result.status === "already_checked_in" && (
								<>
									<IconWarningFilled size={52} color="white" />
									<p style={{ fontSize: 20, fontWeight: 700, margin: "12px 0 6px" }}>เช็คอินแล้ว</p>
									<p style={{ fontSize: 15, margin: 0, fontWeight: 500 }}>{result.name}</p>
									<p style={{ fontSize: 12, opacity: 0.85, margin: "4px 0 0" }}>
										{new Date(result.checked_in_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" })}
									</p>
								</>
							)}
							{(result.status === "not_found" || result.status === "error") && (
								<>
									<IconXCircleFilled size={52} color="white" />
									<p style={{ fontSize: 18, fontWeight: 700, margin: "12px 0 6px" }}>
										{result.status === "not_found" ? "ไม่พบ QR Code" : "ข้อผิดพลาด"}
									</p>
									<p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>{result.error}</p>
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

			{/* Manual token input */}
			<div className="card">
				<p className="text-xs text-muted mb-sm m-0 font-medium">ป้อน Token ด้วยตนเอง</p>
				<div className="flex gap-sm">
					<input
						className="input flex-1"
						placeholder="วาง QR token ที่นี่..."
						value={manualToken}
						onChange={(e) => setManualToken(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleScan(manualToken);
								setManualToken("");
							}
						}}
					/>
					<button
						className="btn btn-secondary"
						onClick={() => { handleScan(manualToken); setManualToken(""); }}
					>
						เช็คอิน
					</button>
				</div>
			</div>
		</div>
	);
}
