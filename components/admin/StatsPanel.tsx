import { useState, useEffect } from "react";

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

	useEffect(() => {
		fetchStats();
	}, [slug]);

	const fetchStats = async () => {
		try {
			const res = await fetch(`/api/admin/${slug}/stats`);
			if (res.ok) {
				const data = await res.json();
				setStats(data);
			}
		} catch (err) {
			console.error("Failed to fetch stats:", err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <div className="p-xl text-center text-muted">กำลังโหลด...</div>;
	}

	if (!stats) {
		return <div className="p-xl text-error">ไม่สามารถโหลดข้อมูลได้</div>;
	}

	const checkinPercent = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

	const hasAnyLimit = stats.limits.total || stats.limits.competitor || stats.limits.attendee;

	const remaining = (limit: number | null, count: number) => {
		if (!limit) return null;
		const left = limit - count;
		return left < 0 ? 0 : left;
	};

	const competitorLeft = remaining(stats.limits.competitor, stats.competitors);
	const attendeeLeft = remaining(stats.limits.attendee, stats.attendees);
	const totalLeft = remaining(stats.limits.total, stats.total);

	return (
		<div>
			<div className="grid gap-lg" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
				<div className="card">
					<p className="text-2xl text-black mb-1">ผู้เข้าแข่งขัน</p>
					<p className="text-[32px] font-serif text-ink m-0">
						{stats.competitors}
						{stats.limits.competitor && <span className="text-base text-muted font-normal"> / {stats.limits.competitor}</span>}
					</p>
					<p className="text-sm text-muted mt-1">
						เช็คอินแล้ว {stats.competitorsCheckedIn}
					</p>
					{competitorLeft !== null && (
						<div className="mt-2">
							<span className={`text-smfont-semibold px-2 py-0.5 rounded-full ${
								competitorLeft <= 0 ? "bg-[#fef2f2] text-error" :
								competitorLeft <= 5 ? "bg-[#fffbeb] text-[#b45309]" :
								"bg-[#f0fdf4] text-success"
							}`}>
								{competitorLeft <= 0 ? "เต็มแล้ว" : `เหลือ ${competitorLeft} ที่นั่ง`}
							</span>
						</div>
					)}
				</div>
				<div className="card">
					<p className="text-2xl text-black mb-1">ผู้เข้าร่วมงาน</p>
					<p className="text-[32px] font-serif text-ink m-0">
						{stats.attendees}
						{stats.limits.attendee && <span className="text-base text-muted font-normal"> / {stats.limits.attendee}</span>}
					</p>
					<p className="text-sm text-muted mt-1">
						เช็คอินแล้ว {stats.attendeesCheckedIn}
					</p>
					{attendeeLeft !== null && (
						<div className="mt-2">
							<span className={`text-smfont-semibold px-2 py-0.5 rounded-full ${
								attendeeLeft <= 0 ? "bg-[#fef2f2] text-error" :
								attendeeLeft <= 5 ? "bg-[#fffbeb] text-[#b45309]" :
								"bg-[#f0fdf4] text-success"
							}`}>
								{attendeeLeft <= 0 ? "เต็มแล้ว" : `เหลือ ${attendeeLeft} ที่นั่ง`}
							</span>
						</div>
					)}
				</div>
				<div className="card">
					<p className="text-2xl text-black mb-1">ทั้งหมด</p>
					<p className="text-[32px] font-serif text-ink m-0">
						{stats.total}
						{stats.limits.total && <span className="text-base text-muted font-normal"> / {stats.limits.total}</span>}
					</p>
					<p className="text-sm text-muted mt-1">
						เช็คอินแล้ว {stats.checkedIn}
					</p>
					{totalLeft !== null && (
						<div className="mt-2">
							<span className={`text-smfont-semibold px-2 py-0.5 rounded-full ${
								totalLeft <= 0 ? "bg-[#fef2f2] text-error" :
								totalLeft <= 5 ? "bg-[#fffbeb] text-[#b45309]" :
								"bg-[#f0fdf4] text-success"
							}`}>
								{totalLeft <= 0 ? "เต็มแล้ว" : `เหลือ ${totalLeft} ที่นั่ง`}
							</span>
						</div>
					)}
				</div>
				<div className="card">
					<p className="text-2xl text-black mb-1">ความคืบหน้า</p>
					<p className="text-[32px] font-serif text-primary m-0">
						{checkinPercent}%
					</p>
					<p className="text-sm text-muted mt-1">
						{stats.checkedIn} / {stats.total}
					</p>
					<div className="progress-bar mt-2">
						<div className="progress-bar-fill" style={{ width: `${checkinPercent}%` }} />
					</div>
				</div>
			</div>
		</div>
	);
}