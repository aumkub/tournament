import { useState, useEffect, useRef } from "react";
import { FORM_CONFIGS } from "../../lib/form-configs/index";

interface CheckinFeedProps {
	slug: string;
	typeLabels?: Record<string, string>;
}

interface CheckinEvent {
	type: string;
	name: string;
	registration_type: string;
	checked_in_at: number;
}

export function CheckinFeed({ slug, typeLabels = {} }: CheckinFeedProps) {
	const getTypeLabel = (t: string) => typeLabels[t] || FORM_CONFIGS[t]?.label.th || t;
	const [events, setEvents] = useState<CheckinEvent[]>([]);
	const [filterType, setFilterType] = useState<string>("");
	const wsRef = useRef<WebSocket | null>(null);

	// Seed from DB
	useEffect(() => {
		fetch(`/api/admin/${slug}/checkin-log?limit=100`)
			.then((r) => r.json())
			.then((data: any) => {
				if (data.events) setEvents(data.events);
			})
			.catch(() => {});
	}, [slug]);

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
						setEvents((prev) => [data, ...prev].slice(0, 200));
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
			<div className="card text-center text-muted text-base">
				ยังไม่มีการเช็คอิน
			</div>
		);
	}

	const types = Array.from(new Set(events.map((e) => e.registration_type)));
	const filtered = filterType ? events.filter((e) => e.registration_type === filterType) : events;

	return (
		<div className="flex flex-col">
			<div className="flex items-center gap-2 mb-2">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
				</svg>
				<h3 className="!text-sm font-semibold text-body m-0">เช็คอินล่าสุด</h3>
				<div className="flex items-center gap-1 ml-auto">
					{types.length > 1 && (
						<>
							<button type="button" onClick={() => setFilterType("")} className={`text-xs px-2 py-0.5 rounded-full border-0 cursor-pointer transition-colors ${filterType === "" ? "bg-primary text-white" : "bg-surface-soft text-muted hover:text-body"}`}>ทั้งหมด</button>
							{types.map((t) => (
								<button key={t} type="button" onClick={() => setFilterType(t)} className={`text-xs px-2 py-0.5 rounded-full border-0 cursor-pointer transition-colors ${filterType === t ? "bg-primary text-white" : "bg-surface-soft text-muted hover:text-body"}`}>
									{getTypeLabel(t)}
								</button>
							))}
						</>
					)}
					<span className="!text-xs text-muted">{filtered.length} คน</span>
				</div>
			</div>
			<div className="flex flex-col overflow-y-auto" style={{ maxHeight: 320 }}>
					{filtered.map((evt, i) => (
					<div
						key={`${evt.checked_in_at}-${i}`}
						className={`flex items-start gap-2 px-2 py-1.5 rounded-md ${i === 0 && !filterType ? "bg-[#f0fdf4]" : ""}`}
					>
						<span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${i === 0 ? "bg-success" : "bg-muted-soft"}`} />
						<div className="flex flex-col flex-1 min-w-0">
							<span className="text-sm text-ink font-medium">{evt.name}</span>
							<span className="!text-sm text-muted">{getTypeLabel(evt.registration_type)}</span>
						</div>
						<span className="!text-xs text-muted flex-shrink-0 w-10 text-right">
							{new Date(evt.checked_in_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}