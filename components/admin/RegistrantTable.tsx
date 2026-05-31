import { useState, useEffect } from "react";
import { IconCheck, IconX } from "../ui/icons";

interface RegistrantTableProps {
	slug: string;
}

interface Registrant {
	id: string;
	type: string;
	email: string;
	data_json: string;
	checked_in: number;
	checked_in_at: number | null;
	submitted_at: number;
}

export function RegistrantTable({ slug }: RegistrantTableProps) {
	const [registrants, setRegistrants] = useState<Registrant[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [filterType, setFilterType] = useState("");
	const [filterCheckedIn, setFilterCheckedIn] = useState("");
	const [search, setSearch] = useState("");
	const [selectedReg, setSelectedReg] = useState<Registrant | null>(null);

	useEffect(() => {
		fetchRegistrants();
	}, [slug, page, filterType, filterCheckedIn, search]);

	const fetchRegistrants = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ page: String(page) });
			if (filterType) params.set("type", filterType);
			if (filterCheckedIn) params.set("checked_in", filterCheckedIn);
			if (search) params.set("search", search);

			const res = await fetch(`/api/admin/${slug}/registrants?${params}`);
			if (res.ok) {
				const data = await res.json();
				setRegistrants(data.registrants || []);
				setTotal(data.total || 0);
			}
		} catch (err) {
			console.error("Failed to fetch registrants:", err);
		} finally {
			setLoading(false);
		}
	};

	const parseName = (reg: Registrant): string => {
		try {
			const data = JSON.parse(reg.data_json);
			return data.full_name_th || data.full_name_en || "-";
		} catch {
			return "-";
		}
	};

	const totalPages = Math.ceil(total / 20);

	return (
		<div>
			{/* Filters */}
			<div style={{ display: "flex", gap: "var(--spacing-md)", marginBottom: "var(--spacing-lg)", flexWrap: "wrap" }}>
				<input
					className="input input-bordered w-full"
					style={{ width: 220 }}
					placeholder="ค้นหาชื่อ / เบอร์โทร"
					value={search}
					onChange={(e) => { setSearch(e.target.value); setPage(1); }}
				/>
				<select
					className="select select-bordered"
					style={{ width: 160 }}
					value={filterType}
					onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
				>
					<option value="">ทุกประเภท</option>
					<option value="competitor">ผู้เข้าแข่งขัน</option>
					<option value="attendee">ผู้เข้าร่วมงาน</option>
				</select>
				<select
					className="select select-bordered"
					style={{ width: 160 }}
					value={filterCheckedIn}
					onChange={(e) => { setFilterCheckedIn(e.target.value); setPage(1); }}
				>
					<option value="">ทุกสถานะ</option>
					<option value="true">เช็คอินแล้ว</option>
					<option value="false">ยังไม่เช็คอิน</option>
				</select>
			</div>

			{/* Table */}
			<div style={{ overflowX: "auto", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-lg)" }}>
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
					<thead>
						<tr style={{ background: "var(--color-surface-soft)" }}>
							<th style={{ padding: "12px 16px", textAlign: "left", color: "var(--color-muted)", fontWeight: 500 }}>ชื่อ</th>
							<th style={{ padding: "12px 16px", textAlign: "left", color: "var(--color-muted)", fontWeight: 500 }}>ประเภท</th>
							<th style={{ padding: "12px 16px", textAlign: "left", color: "var(--color-muted)", fontWeight: 500 }}>อีเมล</th>
							<th style={{ padding: "12px 16px", textAlign: "left", color: "var(--color-muted)", fontWeight: 500 }}>วันที่สมัคร</th>
							<th style={{ padding: "12px 16px", textAlign: "left", color: "var(--color-muted)", fontWeight: 500 }}>สถานะ</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr><td colSpan={5} style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-muted)" }}>กำลังโหลด...</td></tr>
						) : registrants.length === 0 ? (
							<tr><td colSpan={5} style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-muted)" }}>ไม่พบข้อมูล</td></tr>
						) : (
							registrants.map((reg) => (
								<tr
									key={reg.id}
									onClick={() => setSelectedReg(reg)}
									style={{ cursor: "pointer", borderBottom: "1px solid var(--color-hairline-soft)", transition: "background 0.1s" }}
									onMouseOver={(e) => (e.currentTarget.style.background = "var(--color-surface-soft)")}
									onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
								>
									<td style={{ padding: "12px 16px", color: "var(--color-ink)" }}>{parseName(reg)}</td>
									<td style={{ padding: "12px 16px" }}>
										<span className="badge-pill" style={{ fontSize: 12 }}>
											{reg.type === "competitor" ? "ผู้เข้าแข่งขัน" : "ผู้เข้าร่วมงาน"}
										</span>
									</td>
									<td style={{ padding: "12px 16px", color: "var(--color-body)" }}>{reg.email}</td>
									<td style={{ padding: "12px 16px", color: "var(--color-muted)", fontSize: 13 }}>
										{reg.submitted_at ? new Date(reg.submitted_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : "-"}
									</td>
									<td style={{ padding: "12px 16px" }}>
										{reg.checked_in ? (
											<span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-success)", fontSize: 13, fontWeight: 500 }}>
												<IconCheck size={14} color="var(--color-success)" /> เช็คอินแล้ว
											</span>
										) : (
											<span style={{ color: "var(--color-muted)", fontSize: 13 }}>รอเช็คอิน</span>
										)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-md)", justifyContent: "center", alignItems: "center" }}>
					<button
						className="btn btn-secondary"
						disabled={page <= 1}
						onClick={() => setPage(page - 1)}
						style={{ padding: "8px 12px", minHeight: "auto" }}
					>
						ก่อนหน้า
					</button>
					<span style={{ padding: "8px 12px", fontSize: 14, color: "var(--color-muted)" }}>
						หน้า {page} / {totalPages}
					</span>
					<button
						className="btn btn-secondary"
						disabled={page >= totalPages}
						onClick={() => setPage(page + 1)}
						style={{ padding: "8px 12px", minHeight: "auto" }}
					>
						ถัดไป
					</button>
				</div>
			)}

			{/* Detail Modal */}
			{selectedReg && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.5)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
					}}
					onClick={() => setSelectedReg(null)}
				>
					<div
						className="card"
						style={{ maxWidth: 600, maxHeight: "80vh", overflow: "auto", margin: "var(--spacing-lg)" }}
						onClick={(e) => e.stopPropagation()}
					>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-lg)" }}>
							<h3 style={{ fontSize: 18, margin: 0 }}>รายละเอียด</h3>
							<button onClick={() => setSelectedReg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 4 }}>
								<IconX size={20} />
							</button>
						</div>
						<DetailData data_json={selectedReg.data_json} />
						<div style={{ marginTop: "var(--spacing-lg)", fontSize: 13, color: "var(--color-muted)" }}>
							<p style={{ display: "flex", alignItems: "center", gap: 4 }}>
								{selectedReg.checked_in ? (
									<>
										<IconCheck size={14} color="var(--color-success)" />
										เช็คอิน: {new Date(selectedReg.checked_in_at!).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
									</>
								) : "ยังไม่เช็คอิน"}
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function DetailData({ data_json }: { data_json: string }) {
	try {
		const data = JSON.parse(data_json);
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				{Object.entries(data).map(([key, value]) => {
					if (typeof value === "boolean") {
						return (
							<div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--color-hairline-soft)" }}>
								<span style={{ color: "var(--color-muted)", fontSize: 13 }}>{key}</span>
								<span style={{ fontSize: 13 }}>{value ? <IconCheck size={14} color="var(--color-success)" /> : <IconX size={14} color="var(--color-muted)" />}</span>
							</div>
						);
					}
					if (Array.isArray(value)) {
						return (
							<div key={key} style={{ padding: "4px 0", borderBottom: "1px solid var(--color-hairline-soft)" }}>
								<span style={{ color: "var(--color-muted)", fontSize: 13 }}>{key}: </span>
								<span style={{ fontSize: 13 }}>{value.length} file(s)</span>
							</div>
						);
					}
					return (
						<div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--color-hairline-soft)" }}>
							<span style={{ color: "var(--color-muted)", fontSize: 13 }}>{key}</span>
							<span style={{ fontSize: 13, color: "var(--color-ink)" }}>{String(value)}</span>
						</div>
					);
				})}
			</div>
		);
	} catch {
		return <p style={{ color: "var(--color-error)" }}>ไม่สามารถอ่านข้อมูลได้</p>;
	}
}
