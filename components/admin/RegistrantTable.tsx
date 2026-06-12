import { useState, useEffect } from "react";
import { IconCheck, IconX, IconEye, IconTrash, IconArrowLeft, IconArrowRight } from "../ui/icons";
import { FORM_CONFIGS } from "../../lib/form-configs/index";

interface RegistrantTableProps {
	slug: string;
	typeLabels?: Record<string, string>;
	role?: string;
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

interface TypeCount {
	type: string;
	cnt: number;
}

const LEGACY_TYPE_LABELS: Record<string, string> = {
	competitor: "ผู้เข้าแข่งขัน",
	attendee: "ผู้เข้าร่วมงาน",
};

function getTypeLabel(type: string, custom?: Record<string, string>): string {
	if (custom?.[type]) return custom[type];
	if (FORM_CONFIGS[type]) return FORM_CONFIGS[type].label.th;
	return LEGACY_TYPE_LABELS[type] || type;
}

function parseName(reg: Registrant): string {
	try {
		const data = JSON.parse(reg.data_json);
		// dynamic forms
		if (data.child_full_name_th) return data.child_full_name_th;
		if (data.full_name) return data.full_name;
		// legacy forms
		return data.full_name_th || data.full_name_en || "-";
	} catch {
		return "-";
	}
}

export function RegistrantTable({ slug, typeLabels, role }: RegistrantTableProps) {
	const [registrants, setRegistrants] = useState<Registrant[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [filterType, setFilterType] = useState("");
	const [filterCheckedIn, setFilterCheckedIn] = useState("");
	const [search, setSearch] = useState("");
	const [pageSize, setPageSize] = useState(20);
	const [selectedReg, setSelectedReg] = useState<Registrant | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState(false);
	const [typeOptions, setTypeOptions] = useState<TypeCount[]>([]);

	useEffect(() => {
		fetchRegistrants();
	}, [slug, page, pageSize, filterType, filterCheckedIn, search]);

	const fetchRegistrants = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
			if (filterType) params.set("type", filterType);
			if (filterCheckedIn) params.set("checked_in", filterCheckedIn);
			if (search) params.set("search", search);

			const res = await fetch(`/api/admin/${slug}/registrants?${params}`);
			if (res.ok) {
				const data = await res.json();
				setRegistrants(data.registrants || []);
				setTotal(data.total || 0);
				if (data.types) setTypeOptions(data.types);
			}
		} catch (err) {
			console.error("Failed to fetch registrants:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: string) => {
		setDeleting(true);
		try {
			const res = await fetch(`/api/admin/${slug}/registrants/${id}`, { method: "DELETE" });
			if (res.ok) {
				setSelectedReg(null);
				setDeleteConfirm(false);
				fetchRegistrants();
			}
		} finally {
			setDeleting(false);
		}
	};

	const totalPages = Math.ceil(total / pageSize);

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
					style={{ width: 180 }}
					value={filterType}
					onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
				>
					<option value="">ทุกประเภท</option>
					{typeOptions.map((t) => (
						<option key={t.type} value={t.type}>
							{getTypeLabel(t.type, typeLabels)} ({t.cnt})
						</option>
					))}
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
							<th style={{ padding: "12px 16px", textAlign: "left", color: "var(--color-muted)", fontWeight: 500 }}>เช็คอิน</th>
						<th style={{ padding: "12px 16px", textAlign: "right", color: "var(--color-muted)", fontWeight: 500 }}>Actions</th>
							</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr><td colSpan={6} style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-muted)" }}>กำลังโหลด...</td></tr>
						) : registrants.length === 0 ? (
							<tr><td colSpan={6} style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-muted)" }}>ไม่พบข้อมูล</td></tr>
						) : (
							registrants.map((reg) => (
								<tr
									key={reg.id}
									onClick={() => setSelectedReg(reg)}
									style={{ cursor: "pointer", borderBottom: "1px solid var(--color-hairline-soft)", transition: "background 0.1s" }}
									onMouseOver={(e) => (e.currentTarget.style.background = "var(--color-surface-soft)")}
									onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
								>
									<td style={{ padding: "12px 16px", color: "var(--color-ink)" }}>
										<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
											{reg.checked_in
												? <IconCheck size={14} color="var(--color-success)" />
												: <IconX size={14} color="var(--color-muted)" />}
											{parseName(reg)}
										</div>
									</td>
									<td style={{ padding: "12px 16px" }}>
										<span className="badge-pill" style={{ fontSize: 12 }}>
											{getTypeLabel(reg.type, typeLabels)}
										</span>
									</td>
									<td style={{ padding: "12px 16px", color: "var(--color-body)" }}>{reg.email}</td>
									<td style={{ padding: "12px 16px", color: "var(--color-muted)", fontSize: 13 }}>
										{reg.submitted_at ? new Date(reg.submitted_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : "-"}
									</td>
									<td style={{ padding: "12px 16px", fontSize: 13, color: reg.checked_in ? "var(--color-success)" : "var(--color-muted)" }}>
										{reg.checked_in && reg.checked_in_at
											? new Date(reg.checked_in_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })
											: "-"}
									</td>
									<td style={{ padding: "12px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
										<div style={{ display: "inline-flex", gap: 4 }}>
											<button
												className="btn btn-sm btn-ghost"
												style={{ padding: "4px 8px", minHeight: "auto" }}
												onClick={() => setSelectedReg(reg)}
												title="ดูรายละเอียด"
											>
												<IconEye size={15} />
											</button>
											{role === "super_admin" && (
												<button
													className="btn btn-sm btn-ghost"
													style={{ padding: "4px 8px", minHeight: "auto", color: "var(--color-error)" }}
													onClick={() => { setSelectedReg(reg); setDeleteConfirm(true); }}
													title="ลบ"
												>
													<IconTrash size={15} />
												</button>
											)}
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "var(--spacing-md)", paddingBottom: "var(--spacing-xxl)", flexWrap: "wrap", gap: "var(--spacing-sm)" }}>
				{/* Rows per page */}
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<span style={{ fontSize: 13, color: "var(--color-muted)" }}>แสดง</span>
					<select
						className="select"
						style={{ width: "auto", padding: "4px 10px", minHeight: "auto", fontSize: 13 }}
						value={pageSize}
						onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
					>
						{[10, 20, 50, 100].map((n) => (
							<option key={n} value={n}>{n} รายการ</option>
						))}
					</select>
					<span style={{ fontSize: 13, color: "var(--color-muted)" }}>จาก {total} รายการ</span>
				</div>

				{/* Page nav */}
				{totalPages > 1 && (
					<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
						<button
							className="btn btn-secondary btn-sm"
							disabled={page <= 1}
							onClick={() => setPage(page - 1)}
							style={{ padding: "6px 12px", minHeight: "auto" }}
						>
							ก่อนหน้า
						</button>
						<span style={{ padding: "6px 12px", fontSize: 13, color: "var(--color-muted)", whiteSpace: "nowrap" }}>
							{page} / {totalPages}
						</span>
						<button
							className="btn btn-secondary btn-sm"
							disabled={page >= totalPages}
							onClick={() => setPage(page + 1)}
							style={{ padding: "6px 12px", minHeight: "auto" }}
						>
							ถัดไป
						</button>
					</div>
				)}
			</div>

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
						style={{ width: "min(560px, calc(100vw - 2rem))", minWidth: 320, maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 0, margin: "var(--spacing-lg)", overflow: "hidden" }}
						onClick={(e) => e.stopPropagation()}
					>
					{/* Fixed header */}
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-md) var(--spacing-lg)", borderBottom: "1px solid var(--color-hairline-soft)", flexShrink: 0 }}>
						<div>
							<h3 style={{ fontSize: 18, margin: 0 }}>{parseName(selectedReg)}</h3>
							<span style={{ fontSize: 12, color: "var(--color-muted)" }}>{getTypeLabel(selectedReg.type, typeLabels)}</span>
						</div>
						<button onClick={() => { setSelectedReg(null); setDeleteConfirm(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 4 }}>
							<IconX size={20} />
						</button>
					</div>
					{/* Scrollable body */}
					<div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-lg)" }}>
						<DetailData data_json={selectedReg.data_json} type={selectedReg.type} />
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
					</div>{/* end scrollable */}
					{/* Sticky footer */}
					{(() => {
						const idx = registrants.findIndex((r) => r.id === selectedReg.id);
						const hasPrev = idx > 0;
						const hasNext = idx < registrants.length - 1;
						return (
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-md) var(--spacing-lg)", borderTop: "1px solid var(--color-hairline-soft)", background: "var(--color-bg)", flexShrink: 0, gap: 8 }}>
								<div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
									{role === "super_admin" && (deleteConfirm ? (
										<>
											<span style={{ fontSize: 13, color: "var(--color-error)", fontWeight: 500 }}>ยืนยันลบ?</span>
											<button className="btn btn-sm" style={{ background: "var(--color-error)", color: "white", border: "none" }} disabled={deleting} onClick={() => handleDelete(selectedReg.id)}>
												{deleting ? "กำลังลบ..." : "ยืนยัน"}
											</button>
											<button className="btn btn-sm btn-ghost" onClick={() => setDeleteConfirm(false)}>ยกเลิก</button>
										</>
									) : (
										<button style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", cursor: "pointer", padding: "6px 10px", color: "var(--color-error)", display: "flex", alignItems: "center" }} onClick={() => setDeleteConfirm(true)} title="ลบการลงทะเบียน">
											<IconTrash size={16} />
										</button>
									))}
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
									<span style={{ fontSize: 12, color: "var(--color-muted)" }}>{idx + 1} / {registrants.length}</span>
									<button onClick={() => { setDeleteConfirm(false); setSelectedReg(registrants[idx - 1]); }} disabled={!hasPrev} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", cursor: hasPrev ? "pointer" : "default", padding: "6px 10px", opacity: hasPrev ? 1 : 0.3, display: "flex", alignItems: "center" }}>
										<IconArrowLeft size={16} />
									</button>
									<button onClick={() => { setDeleteConfirm(false); setSelectedReg(registrants[idx + 1]); }} disabled={!hasNext} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", cursor: hasNext ? "pointer" : "default", padding: "6px 10px", opacity: hasNext ? 1 : 0.3, display: "flex", alignItems: "center" }}>
										<IconArrowRight size={16} />
									</button>
								</div>
							</div>
						);
					})()}
				</div>
				</div>
			)}
		</div>
	);
}

function DetailData({ data_json, type }: { data_json: string; type: string }) {
	try {
		const data = JSON.parse(data_json);
		const formConfig = FORM_CONFIGS[type];

		// Build an ordered label map from form config fields if available
		const labelMap: Record<string, string> = {};
		if (formConfig) {
			for (const step of formConfig.steps) {
				for (const field of step.fields) {
					labelMap[field.key] = field.label.th;
				}
			}
		}

		// Render entries in config order (if available), then any extra keys
		const configKeys = Object.keys(labelMap);
		const allKeys = configKeys.length > 0
			? [...configKeys, ...Object.keys(data).filter((k) => !labelMap[k])]
			: Object.keys(data);

		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				{allKeys.map((key) => {
					const value = data[key];
					if (value === undefined) return null;
					const label = labelMap[key] || key;

					if (typeof value === "boolean") {
						return (
							<div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--color-hairline-soft)" }}>
								<span style={{ color: "var(--color-muted)", fontSize: 13 }}>{label}</span>
								<span style={{ fontSize: 13 }}>{value ? <IconCheck size={14} color="var(--color-success)" /> : <IconX size={14} color="var(--color-muted)" />}</span>
							</div>
						);
					}
					if (Array.isArray(value)) {
						const opts = formConfig?.steps.flatMap((s) => s.fields).find((f) => f.key === key)?.options;
						const display = opts
							? (value as string[]).map((v) => opts.find((o) => o.value === v)?.label.th ?? v).join(", ")
							: `${value.length} รายการ`;
						return (
							<div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--color-hairline-soft)" }}>
								<span style={{ color: "var(--color-muted)", fontSize: 13, flexShrink: 0, marginRight: 8 }}>{label}</span>
								<span style={{ fontSize: 13, textAlign: "right" }}>{display}</span>
							</div>
						);
					}
					// Resolve option label for select/radio fields
					const fieldCfg = formConfig?.steps.flatMap((s) => s.fields).find((f) => f.key === key);
					const optLabel = fieldCfg?.options?.find((o) => o.value === value)?.label.th;
					const displayVal = optLabel || (typeof value === "string" && value.startsWith("uploads/") ? "(ไฟล์อัปโหลดแล้ว)" : String(value));

					return (
						<div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--color-hairline-soft)" }}>
							<span style={{ color: "var(--color-muted)", fontSize: 13, flexShrink: 0, marginRight: 8 }}>{label}</span>
							<span style={{ fontSize: 13, color: "var(--color-ink)", textAlign: "right", wordBreak: "break-word" }}>{displayVal}</span>
						</div>
					);
				})}
			</div>
		);
	} catch {
		return <p style={{ color: "var(--color-error)" }}>ไม่สามารถอ่านข้อมูลได้</p>;
	}
}
