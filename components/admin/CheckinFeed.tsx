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
			<div className="card text-center text-muted text-sm">
				ยังไม่มีการเช็คอินแบบเรียลไทม์
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-xs">
			<h3 className="text-sm mb-sm font-serif">
				Live Check-in Feed
			</h3>
			{events.map((evt, i) => (
				<div
					key={`${evt.checked_in_at}-${i}`}
					className={`flex items-center gap-md p-sm p-md rounded-md transition-colors ${i === 0 ? "bg-surface-card" : "bg-transparent"}`}
				>
					<span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
					<span className="text-sm text-ink font-medium">{evt.name}</span>
					<span className="badge-pill text-[11px]">
						{evt.registration_type === "competitor" ? "ผู้เข้าแข่งขัน" : "ผู้เข้าร่วมงาน"}
					</span>
					<span className="text-xs text-muted ml-auto">
						{new Date(evt.checked_in_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" })}
					</span>
				</div>
			))}
		</div>
	);
}