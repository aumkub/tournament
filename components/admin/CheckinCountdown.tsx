import { useState, useEffect, type ReactNode } from "react";
import { IconClock } from "../ui/icons";

interface Props {
	checkinOpenAt: number | null;
	checkinCloseAt: number | null;
	children: ReactNode;
}

function pad(n: number) {
	return String(n).padStart(2, "0");
}

function formatCountdown(ms: number) {
	const totalSec = Math.max(0, Math.floor(ms / 1000));
	const days = Math.floor(totalSec / 86400);
	const hours = Math.floor((totalSec % 86400) / 3600);
	const mins = Math.floor((totalSec % 3600) / 60);
	const secs = totalSec % 60;
	return { days, hours, mins, secs };
}

export function CheckinCountdown({ checkinOpenAt, checkinCloseAt, children }: Props) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	// No time restriction configured — show scanner
	if (!checkinOpenAt) return <>{children}</>;

	// After close
	if (checkinCloseAt && now > checkinCloseAt) {
		return (
			<div className="card p-xl text-center">
				<div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-soft mb-md mx-auto">
					<IconClock size={28} color="var(--color-muted)" />
				</div>
				<p className="text-base font-semibold text-body m-0 mb-1">ปิดการเช็คอินแล้ว</p>
				<p className="text-sm text-muted m-0">
					สิ้นสุด: {new Date(checkinCloseAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
				</p>
			</div>
		);
	}

	// Not yet open
	if (now < checkinOpenAt) {
		const { days, hours, mins, secs } = formatCountdown(checkinOpenAt - now);
		return (
			<div className="card p-xl text-center">
				<div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#fff8f0] mb-md mx-auto">
					<IconClock size={28} color="var(--color-warning)" />
				</div>
				<p className="text-base font-semibold text-body m-0 mb-1">ยังไม่ถึงเวลาเช็คอิน</p>
				<p className="text-xs text-muted m-0 mb-xl">
					เปิด: {new Date(checkinOpenAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
				</p>

				{/* Countdown display */}
				<div className="flex items-end justify-center gap-3">
					{days > 0 && (
						<>
							<CountUnit value={days} label="วัน" />
							<span className="text-2xl font-light text-muted mb-2">:</span>
						</>
					)}
					<CountUnit value={hours} label="ชม." />
					<span className="text-2xl font-light text-muted mb-2">:</span>
					<CountUnit value={mins} label="นาที" />
					<span className="text-2xl font-light text-muted mb-2">:</span>
					<CountUnit value={secs} label="วินาที" />
				</div>
			</div>
		);
	}

	// Open — show scanner
	return <>{children}</>;
}

function CountUnit({ value, label }: { value: number; label: string }) {
	return (
		<div className="flex flex-col items-center gap-1">
			<div className="w-16 h-16 rounded-xl bg-surface-soft border border-hairline flex items-center justify-center">
				<span className="text-2xl font-bold font-mono text-ink tabular-nums">
					{pad(value)}
				</span>
			</div>
			<span className="text-xs text-muted">{label}</span>
		</div>
	);
}
