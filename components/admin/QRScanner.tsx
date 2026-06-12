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
		<div className="max-w-[480px] mx-auto">
			{/* Camera View */}
			<div
				className="relative w-full rounded-lg overflow-hidden mb-lg"
				style={{ aspectRatio: "1", background: "var(--color-surface-dark)" }}
			>
				<video
					ref={videoRef}
					autoPlay
					muted
					playsInline
					className="w-full h-full object-cover"
				/>

				{/* Scanner overlay */}
				{scanning && (
					<div
						style={{
							position: "absolute", inset: 0,
							display: "flex", alignItems: "center", justifyContent: "center",
							background: "rgba(0,0,0,0.1)",
						}}
					>
						<div style={{
							width: "70%",
							aspectRatio: "1",
							border: "2px dashed " + (result ? resultColor : "white"),
							borderRadius: "var(--radius-lg)",
						}} />
					</div>
				)}

				{/* Scan result overlay */}
				{result && (
					<div
						style={{
							position: "absolute", inset: 0,
							display: "flex", alignItems: "center", justifyContent: "center",
							background: resultColor === "var(--color-success)"
								? "rgba(93, 184, 114, 0.9)"
								: resultColor === "var(--color-warning)"
									? "rgba(212, 160, 23, 0.9)"
									: "rgba(198, 69, 69, 0.9)",
						}}
					>
						<div style={{ textAlign: "center", color: "white", padding: "var(--spacing-lg)" }}>
							{result.status === "success" && (
								<>
									<IconCheckCircleFilled size={48} color="white" />
									<p style={{ fontSize: 18, fontWeight: 600, margin: "var(--spacing-sm) 0 4px" }}>
										เช็คอินสำเร็จ!
									</p>
									<p style={{ fontSize: 14, margin: 0 }}>{result.name}</p>
									<p style={{ fontSize: 12, opacity: 0.9, margin: "4px 0 0" }}>
										{result.type === "competitor" ? "ผู้เข้าแข่งขัน" : "ผู้เข้าร่วมงาน"}
									</p>
								</>
							)}
							{result.status === "already_checked_in" && (
								<>
									<IconWarningFilled size={48} color="white" />
									<p style={{ fontSize: 18, fontWeight: 600, margin: "var(--spacing-sm) 0 4px" }}>
										เช็คอินแล้ว
									</p>
									<p style={{ fontSize: 14, margin: 0 }}>{result.name}</p>
									<p style={{ fontSize: 12, opacity: 0.9, margin: "4px 0 0" }}>
										{new Date(result.checked_in_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" })}
									</p>
								</>
							)}
							{result.status === "not_found" && (
								<>
									<IconXCircleFilled size={48} color="white" />
									<p style={{ fontSize: 16, fontWeight: 600, margin: "var(--spacing-md) 0 4px" }}>
										ไม่พบ QR
									</p>
									<p style={{ fontSize: 14, margin: 0 }}>{result.error}</p>
								</>
							)}
							{result.status === "error" && (
								<>
									<IconXCircleFilled size={48} color="white" />
									<p style={{ fontSize: 16, fontWeight: 600, margin: "var(--spacing-md) 0 4px" }}>
										ข้อผิดพลาด
									</p>
									<p style={{ fontSize: 14, margin: 0 }}>{result.error}</p>
								</>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Controls */}
			<div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
				{scanning ? (
					<button
						className="btn btn-secondary flex-1"
						onClick={stopCamera}
					>
						หยุดสแกน
					</button>
				) : (
					<button
						className="btn btn-primary flex-1"
						onClick={startCamera}
					>
						<IconCamera size={16} /> เปิดกล้อง
					</button>
				)}

				<button
					className="btn btn-secondary"
					onClick={() => document.getElementById("html5-qrcode-barcode-scanner")?.remove()}
				>
					<IconQrCode size={16} />
				</button>
			</div>
		</div>
	);
}