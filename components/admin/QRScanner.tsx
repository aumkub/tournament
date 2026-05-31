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

				setTimeout(() => setResult(null), 2000);
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

	const resultColor = result
		? result.status === "success"
			? "var(--color-success)"
			: result.status === "already_checked_in"
				? "var(--color-warning)"
				: "var(--color-error)"
		: "";

	return (
		<div style={{ maxWidth: 480, margin: "0 auto" }}>
			{/* Camera View */}
			<div
				style={{
					position: "relative",
					width: "100%",
					aspectRatio: "1",
					background: "var(--color-surface-dark)",
					borderRadius: "var(--radius-lg)",
					overflow: "hidden",
					marginBottom: "var(--spacing-lg)",
				}}
			>
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
				/>
				{!scanning && (
					<div
						style={{
							position: "absolute",
							inset: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexDirection: "column",
							gap: "var(--spacing-md)",
						}}
					>
						<IconQrCode size={48} color="var(--color-on-dark)" />
						<button className="btn btn-primary" onClick={startCamera}>
							<IconCamera size={16} /> เปิดกล้อง
						</button>
					</div>
				)}
				{scanning && (
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							width: "60%",
							aspectRatio: "1",
							border: "3px solid var(--color-primary)",
							borderRadius: "var(--radius-lg)",
							boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
						}}
					/>
				)}
			</div>

			{scanning && (
				<button className="btn btn-secondary" onClick={stopCamera} style={{ width: "100%", marginBottom: "var(--spacing-lg)" }}>
					ปิดกล้อง
				</button>
			)}

			{/* Manual token input */}
			<div style={{ marginBottom: "var(--spacing-lg)" }}>
				<label className="label">หรือกรอก QR Token เอง</label>
				<div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
					<input
						className="input input-bordered w-full"
						placeholder="วาง token ที่นี่..."
						value={manualToken}
						onChange={(e) => setManualToken(e.target.value)}
					/>
					<button className="btn btn-primary" onClick={() => handleScan(manualToken)} style={{ whiteSpace: "nowrap" }}>
						เช็คอิน
					</button>
				</div>
			</div>

			{/* Result overlay */}
			{result && (
				<div
					style={{
						padding: "var(--spacing-xl)",
						background: resultColor,
						color: "white",
						borderRadius: "var(--radius-lg)",
						textAlign: "center",
					}}
				>
					{result.status === "success" && (
						<>
							<IconCheckCircleFilled size={48} color="white" />
							<p style={{ fontSize: 18, fontWeight: 600, margin: "8px 0 4px" }}>เช็คอินสำเร็จ</p>
							<p style={{ fontSize: 16, margin: 0 }}>{(result as any).name}</p>
							<p style={{ fontSize: 13, opacity: 0.8, margin: "4px 0 0" }}>
								{(result as any).type === "competitor" ? "ผู้เข้าแข่งขัน" : "ผู้เข้าร่วมงาน"}
							</p>
						</>
					)}
					{result.status === "already_checked_in" && (
						<>
							<IconWarningFilled size={48} color="white" />
							<p style={{ fontSize: 18, fontWeight: 600, margin: "8px 0 4px" }}>เช็คอินแล้ว</p>
							<p style={{ fontSize: 16, margin: 0 }}>{(result as any).name}</p>
							<p style={{ fontSize: 13, opacity: 0.8, margin: "4px 0 0" }}>
								เวลาเดิม: {new Date((result as any).checked_in_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" })}
							</p>
						</>
					)}
					{result.status === "not_found" && (
						<>
							<IconXCircleFilled size={48} color="white" />
							<p style={{ fontSize: 18, fontWeight: 600, margin: "8px 0" }}>ไม่พบ QR นี้</p>
						</>
					)}
					{result.status === "error" && (
						<>
							<IconXCircleFilled size={48} color="white" />
							<p style={{ fontSize: 18, fontWeight: 600, margin: "8px 0" }}>เกิดข้อผิดพลาด</p>
							<p style={{ fontSize: 14, margin: 0 }}>{(result as any).error}</p>
						</>
					)}
				</div>
			)}
		</div>
	);
}
