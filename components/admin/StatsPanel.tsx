import { useState, useEffect, useRef, useCallback } from "react";

interface StatsPanelProps {
	slug: string;
}

interface Limits {
	total: number | null;
	competitor: number | null;
	attendee: number | null;
}

interface Stats {
	total: number;
	competitors: number;
	attendees: number;
	checkedIn: number;
	competitorsCheckedIn: number;
	attendeesCheckedIn: number;
	limits: Limits;
}

export function StatsPanel({ slug }: StatsPanelProps) {
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true);
	const fetchStatsRef = useRef<() => void>(() => {});

	// Keep fetchStatsRef fresh without triggering re-renders
	useEffect(() => {
		fetchStatsRef.current = async () => {
			try {
				const res = await fetch(`/api/admin/${slug}/stats`);
				if (res.ok) {
					const data = await res.json() as Stats;
					setStats(data);
				}
			} catch {}
		};
	});

	// Initial fetch
	useEffect(() => {
		setLoading(true);
		fetchStatsRef.current();
		setLoading(false);
	}, [slug]);

	// WebSocket for live updates
	useEffect(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		let ws: WebSocket;
		let reconnectTimer: ReturnType<typeof setTimeout>;
		let dead = false;

		const connect = () => {
			if (dead) return;
			ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/${slug}`);

			ws.onmessage = (evt) => {
				try {
					const data = JSON.parse(evt.data);

					if (data.type === "register") {
						// Optimistic: increment total + type count
						setStats((prev) => {
							if (!prev) return prev;
							const type = data.registration_type as string;
							return {
								...prev,
								total: prev.total + 1,
								competitors: type === "competitor" ? prev.competitors + 1 : prev.competitors,
								attendees: type === "attendee" ? prev.attendees + 1 : prev.attendees,
							};
						});
					}

					if (data.type === "checkin") {
						// Optimistic: increment checkedIn + type checkedIn
						setStats((prev) => {
							if (!prev) return prev;
							const type = data.registration_type as string;
							return {
								...prev,
								checkedIn: prev.checkedIn + 1,
								competitorsCheckedIn: type === "competitor" ? prev.competitorsCheckedIn + 1 : prev.competitorsCheckedIn,
								attendeesCheckedIn: type === "attendee" ? prev.attendeesCheckedIn + 1 : prev.attendeesCheckedIn,
							};
						});
					}

					// Re-sync from DB after any event to stay accurate
					fetchStatsRef.current();
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

	if (loading || !stats) {
		return (
			<div className="grid gap-lg" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
				{[0, 1, 2, 3].map((i) => (
					<div key={i} className="card animate-pulse" style={{ height: 110 }} />
				))}
			</div>
		);
	}

	const checkinPercent = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

	const remaining = (limit: number | null, count: number) => {
		if (!limit) return null;
		const left = limit - count;
		return left < 0 ? 0 : left;
	};

	const competitorLeft = remaining(stats.limits.competitor, stats.competitors);
	const attendeeLeft = remaining(stats.limits.attendee, stats.attendees);
	const totalLeft = remaining(stats.limits.total, stats.total);

	const seatBadge = (left: number | null) => {
		if (left === null) return null;
		return (
			<div className="mt-2">
				<span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
					left <= 0 ? "bg-[#fef2f2] text-error" :
					left <= 5 ? "bg-[#fffbeb] text-[#b45309]" :
					"bg-[#f0fdf4] text-success"
				}`}>
					{left <= 0 ? "เต็มแล้ว" : `เหลือ ${left} ที่นั่ง`}
				</span>
			</div>
		);
	};

	return (
		<div className="grid gap-lg" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
			<div className="card">
				<p className="text-sm text-muted mb-1">ผู้เข้าแข่งขัน</p>
				<p className="text-[32px] font-bold text-ink m-0 leading-none">
					{stats.competitors}
					{stats.limits.competitor && <span className="text-base text-muted font-normal"> / {stats.limits.competitor}</span>}
				</p>
				<p className="text-sm text-muted mt-1">เช็คอินแล้ว {stats.competitorsCheckedIn}</p>
				{seatBadge(competitorLeft)}
			</div>

			<div className="card">
				<p className="text-sm text-muted mb-1">ผู้เข้าร่วมงาน</p>
				<p className="text-[32px] font-bold text-ink m-0 leading-none">
					{stats.attendees}
					{stats.limits.attendee && <span className="text-base text-muted font-normal"> / {stats.limits.attendee}</span>}
				</p>
				<p className="text-sm text-muted mt-1">เช็คอินแล้ว {stats.attendeesCheckedIn}</p>
				{seatBadge(attendeeLeft)}
			</div>

			<div className="card">
				<p className="text-sm text-muted mb-1">ทั้งหมด</p>
				<p className="text-[32px] font-bold text-ink m-0 leading-none">
					{stats.total}
					{stats.limits.total && <span className="text-base text-muted font-normal"> / {stats.limits.total}</span>}
				</p>
				<p className="text-sm text-muted mt-1">เช็คอินแล้ว {stats.checkedIn}</p>
				{seatBadge(totalLeft)}
			</div>

			<div className="card">
				<p className="text-sm text-muted mb-1">ความคืบหน้า</p>
				<p className="text-[32px] font-bold text-primary m-0 leading-none">{checkinPercent}%</p>
				<p className="text-sm text-muted mt-1">{stats.checkedIn} / {stats.total}</p>
				<div className="progress-bar mt-2">
					<div className="progress-bar-fill" style={{ width: `${checkinPercent}%`, transition: "width 0.5s ease" }} />
				</div>
			</div>
		</div>
	);
}
