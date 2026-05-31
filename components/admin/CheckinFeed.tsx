import { useState, useEffect, useRef } from "react";

interface CheckinFeedProps {
	slug: string;
}

interface CheckinEvent {
	type: string;
	name: string;
	registration_type: string;
	checked_in_at: number;
}

export function CheckinFeed({ slug }: CheckinFeedProps) {
	const [events, setEvents] = useState<CheckinEvent[]>([]);
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		// Connect WebSocket
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/api/ws/${slug}`;

		try {
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.type === "checkin") {
						setEvents((prev) => [data, ...prev].slice(0, 20));
					}
				} catch {}
			};

			ws.onerror = () => {};

			return () => {
				ws.close();
			};
		} catch {
			// WebSocket not available
		}
	}, [slug]);

	if (events.length === 0) {
		return (
			<div className="card" style={{ textAlign: "center", color: "var(--color-muted)", fontSize: 14 }}>
				ยังไม่มีการเช็คอินแบบเรียลไทม์
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
			<h3 style={{ fontSize: 16, marginBottom: "var(--spacing-sm)", fontFamily: "var(--font-serif)" }}>
				Live Check-in Feed
			</h3>
			{events.map((evt, i) => (
				<div
					key={`${evt.checked_in_at}-${i}`}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "var(--spacing-md)",
						padding: "var(--spacing-sm) var(--spacing-md)",
						background: i === 0 ? "var(--color-surface-card)" : "transparent",
						borderRadius: "var(--radius-md)",
						transition: "background 0.3s",
					}}
				>
					<span
						style={{
							width: 8,
							height: 8,
							borderRadius: "50%",
							background: "var(--color-success)",
							flexShrink: 0,
						}}
					/>
					<span style={{ fontSize: 14, color: "var(--color-ink)", fontWeight: 500 }}>{evt.name}</span>
					<span className="badge-pill" style={{ fontSize: 11 }}>
						{evt.registration_type === "competitor" ? "ผู้เข้าแข่งขัน" : "ผู้เข้าร่วมงาน"}
					</span>
					<span style={{ fontSize: 12, color: "var(--color-muted)", marginLeft: "auto" }}>
						{new Date(evt.checked_in_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" })}
					</span>
				</div>
			))}
		</div>
	);
}
