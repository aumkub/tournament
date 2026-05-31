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
		return <div style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-muted)" }}>กำลังโหลด...</div>;
	}

	if (!stats) {
		return <div style={{ padding: "var(--spacing-xl)", color: "var(--color-error)" }}>ไม่สามารถโหลดข้อมูลได้</div>;
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
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--spacing-lg)" }}>
				<div className="card">
					<p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 4 }}>ผู้เข้าแข่งขัน</p>
					<p style={{ fontSize: 32, fontFamily: "var(--font-serif)", color: "var(--color-ink)", margin: 0 }}>
						{stats.competitors}
						{stats.limits.competitor && <span style={{ fontSize: 16, color: "var(--color-muted)", fontWeight: 400 }}> / {stats.limits.competitor}</span>}
					</p>
					<p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>
						เช็คอินแล้ว {stats.competitorsCheckedIn}
					</p>
					{competitorLeft !== null && (
						<div style={{ marginTop: 8 }}>
							<span style={{
								fontSize: 12,
								fontWeight: 600,
								padding: "2px 8px",
								borderRadius: "var(--radius-pill)",
								background: competitorLeft <= 0 ? "#fef2f2" : competitorLeft <= 5 ? "#fffbeb" : "#f0fdf4",
								color: competitorLeft <= 0 ? "var(--color-error)" : competitorLeft <= 5 ? "#b45309" : "var(--color-success)",
							}}>
								{competitorLeft <= 0 ? "เต็มแล้ว" : `เหลือ ${competitorLeft} ที่นั่ง`}
							</span>
						</div>
					)}
				</div>
				<div className="card">
					<p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 4 }}>ผู้เข้าร่วมงาน</p>
					<p style={{ fontSize: 32, fontFamily: "var(--font-serif)", color: "var(--color-ink)", margin: 0 }}>
						{stats.attendees}
						{stats.limits.attendee && <span style={{ fontSize: 16, color: "var(--color-muted)", fontWeight: 400 }}> / {stats.limits.attendee}</span>}
					</p>
					<p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>
						เช็คอินแล้ว {stats.attendeesCheckedIn}
					</p>
					{attendeeLeft !== null && (
						<div style={{ marginTop: 8 }}>
							<span style={{
								fontSize: 12,
								fontWeight: 600,
								padding: "2px 8px",
								borderRadius: "var(--radius-pill)",
								background: attendeeLeft <= 0 ? "#fef2f2" : attendeeLeft <= 5 ? "#fffbeb" : "#f0fdf4",
								color: attendeeLeft <= 0 ? "var(--color-error)" : attendeeLeft <= 5 ? "#b45309" : "var(--color-success)",
							}}>
								{attendeeLeft <= 0 ? "เต็มแล้ว" : `เหลือ ${attendeeLeft} ที่นั่ง`}
							</span>
						</div>
					)}
				</div>
				<div className="card">
					<p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 4 }}>ทั้งหมด</p>
					<p style={{ fontSize: 32, fontFamily: "var(--font-serif)", color: "var(--color-ink)", margin: 0 }}>
						{stats.total}
						{stats.limits.total && <span style={{ fontSize: 16, color: "var(--color-muted)", fontWeight: 400 }}> / {stats.limits.total}</span>}
					</p>
					<p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>
						เช็คอินแล้ว {stats.checkedIn}
					</p>
					{totalLeft !== null && (
						<div style={{ marginTop: 8 }}>
							<span style={{
								fontSize: 12,
								fontWeight: 600,
								padding: "2px 8px",
								borderRadius: "var(--radius-pill)",
								background: totalLeft <= 0 ? "#fef2f2" : totalLeft <= 5 ? "#fffbeb" : "#f0fdf4",
								color: totalLeft <= 0 ? "var(--color-error)" : totalLeft <= 5 ? "#b45309" : "var(--color-success)",
							}}>
								{totalLeft <= 0 ? "เต็มแล้ว" : `เหลือ ${totalLeft} ที่นั่ง`}
							</span>
						</div>
					)}
				</div>
				<div className="card">
					<p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 4 }}>ความคืบหน้า</p>
					<p style={{ fontSize: 32, fontFamily: "var(--font-serif)", color: "var(--color-primary)", margin: 0 }}>
						{checkinPercent}%
					</p>
					<p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>
						{stats.checkedIn} / {stats.total}
					</p>
					<div className="progress-bar" style={{ marginTop: 8 }}>
						<div className="progress-bar-fill" style={{ width: `${checkinPercent}%` }} />
					</div>
				</div>
			</div>

			{/* Summary row when limits exist */}
			{hasAnyLimit && (
				<div style={{
					display: "flex",
					gap: "var(--spacing-lg)",
					marginTop: "var(--spacing-lg)",
					padding: "var(--spacing-md) var(--spacing-lg)",
					background: "#faf9f5",
					borderRadius: "var(--radius-md)",
					border: "1px solid #e6dfd8",
					fontSize: 13,
					color: "var(--color-muted)",
				}}>
					{stats.limits.total && (
						<span>รวม: {stats.total}/{stats.limits.total}</span>
					)}
					{stats.limits.competitor && (
						<span>ผู้เข้าแข่งขัน: {stats.competitors}/{stats.limits.competitor}</span>
					)}
					{stats.limits.attendee && (
						<span>ผู้เข้าร่วมงาน: {stats.attendees}/{stats.limits.attendee}</span>
					)}
				</div>
			)}
		</div>
	);
}
