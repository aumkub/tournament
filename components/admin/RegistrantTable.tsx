import { useState, useEffect, useRef, useCallback } from "react";
import { IconCheck, IconX, IconEye, IconTrash, IconArrowLeft, IconArrowRight } from "../ui/icons";
import { Select } from "../ui/Select";
import { FORM_CONFIGS } from "../../lib/form-configs/index";

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
	const [copied, setCopied] = useState(false);
	const copy = useCallback(() => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		}).catch(() => {});
	}, [text]);
	return (
		<button
			type="button"
			onClick={(e) => { e.stopPropagation(); copy(); }}
			title="คัดลอกรหัส"
			className={`inline-flex items-center justify-center w-5 h-5 rounded bg-transparent border-0 cursor-pointer transition-colors hover:bg-black/8 flex-shrink-0 ${className}`}
		>
			{copied ? (
				<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
			) : (
				<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)" }}>
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
				</svg>
			)}
		</button>
	);
}

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
		if (data.child_full_name_th) return data.child_full_name_th;
		if (data.full_name) return data.full_name;
		return data.full_name_th || data.full_name_en || "-";
	} catch {
		return "-";
	}
}

function formatPhone(raw: string): string {
	const digits = raw.replace(/\D/g, "");
	if (digits.length >= 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
	return raw;
}

function parsePhone(reg: Registrant): string {
	try {
		const data = JSON.parse(reg.data_json);
		const raw = data.phone || data.parent_phone || data.tel || data.mobile || data.telephone || "";
		return raw ? formatPhone(raw) : "";
	} catch {
		return "";
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
	const [checkingIn, setCheckingIn] = useState(false);
	const [typeOptions, setTypeOptions] = useState<TypeCount[]>([]);

	// Silent background refetch (no loading spinner)
	const silentFetchRef = useRef<() => void>(() => {});
	useEffect(() => {
		silentFetchRef.current = async () => {
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
			} catch {}
		};
	});

	// Live updates via WebSocket
	useEffect(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		let ws: WebSocket;
		let reconnectTimer: ReturnType<typeof setTimeout>;

		const connect = () => {
			ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/${slug}`);
			ws.onmessage = (evt) => {
				try {
					const data = JSON.parse(evt.data);
					if (data.type === "checkin") {
						if (data.registration_id) {
							const checkedInAt = data.checked_in_at ?? Date.now();
							setRegistrants((prev) =>
								prev.map((r) =>
									r.id === data.registration_id
										? { ...r, checked_in: 1, checked_in_at: checkedInAt }
										: r,
								),
							);
							setSelectedReg((prev) =>
								prev?.id === data.registration_id
									? { ...prev, checked_in: 1, checked_in_at: checkedInAt }
									: prev,
							);
						}
						silentFetchRef.current();
					}
					if (data.type === "register") {
						silentFetchRef.current();
					}
				} catch {}
			};
			ws.onclose = () => {
				reconnectTimer = setTimeout(connect, 3000);
			};
			ws.onerror = () => {
				ws.close();
			};
		};

		connect();
		return () => {
			clearTimeout(reconnectTimer);
			ws?.close();
		};
	}, [slug]);

	useEffect(() => {
		fetchRegistrants();
	}, [slug, page, pageSize, filterType, filterCheckedIn, search]);

	useEffect(() => {
		if (!selectedReg) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			const idx = registrants.findIndex((r) => r.id === selectedReg.id);
			if (e.key === "ArrowLeft" && idx > 0) {
				setDeleteConfirm(false);
				setSelectedReg(registrants[idx - 1]);
			} else if (e.key === "ArrowRight" && idx < registrants.length - 1) {
				setDeleteConfirm(false);
				setSelectedReg(registrants[idx + 1]);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [selectedReg, registrants]);

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

	const handleCheckinFromPopup = async (reg: Registrant) => {
		setCheckingIn(true);
		try {
			const res = await fetch(`/api/checkin/${slug}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: reg.id }),
			});
			if (res.ok) {
				await fetchRegistrants();
				setSelectedReg((prev) => prev ? { ...prev, checked_in: 1, checked_in_at: Date.now() } : prev);
			}
		} finally {
			setCheckingIn(false);
		}
	};

	const [uncheckingIn, setUncheckingIn] = useState(false);
	const handleUncheckin = async (reg: Registrant) => {
		setUncheckingIn(true);
		try {
			const res = await fetch(`/api/admin/${slug}/uncheckin`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: reg.id }),
			});
			if (res.ok) {
				await fetchRegistrants();
				setSelectedReg((prev) => prev ? { ...prev, checked_in: 0, checked_in_at: null } : prev);
			}
		} finally {
			setUncheckingIn(false);
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
			<div className="flex gap-md mb-lg flex-wrap">
				<input
					className="input"
					style={{ width: 220 }}
					placeholder="ค้นหาชื่อ / เบอร์โทร"
					value={search}
					onChange={(e) => { setSearch(e.target.value); setPage(1); }}
				/>
				<Select
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
				</Select>
				<Select
					style={{ width: 160 }}
					value={filterCheckedIn}
					onChange={(e) => { setFilterCheckedIn(e.target.value); setPage(1); }}
				>
					<option value="">ทุกสถานะ</option>
					<option value="true">เช็คอินแล้ว</option>
					<option value="false">ยังไม่เช็คอิน</option>
				</Select>
			</div>

			{/* Table */}
			<div className="overflow-x-auto border border-hairline rounded-lg">
				<table className="w-full border-collapse text-sm">
					<thead>
						<tr className="bg-surface-soft">
							<th className="px-4 py-3 text-left text-sm font-medium text-muted">ชื่อ</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-muted">ประเภท</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-muted">อีเมล / เบอร์โทร</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-muted">รหัส</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-muted">เช็คอิน</th>
							<th className="px-4 py-3 text-right text-sm font-medium text-muted">Actions</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr><td colSpan={6} className="px-4 py-xl text-center text-muted">กำลังโหลด...</td></tr>
						) : registrants.length === 0 ? (
							<tr><td colSpan={6} className="px-4 py-xl text-center text-muted">ไม่พบข้อมูล</td></tr>
						) : (
							registrants.map((reg) => (
								<tr
									key={reg.id}
									onClick={() => setSelectedReg(reg)}
									className="cursor-pointer border-b border-black/5 transition-colors hover:bg-surface-soft"
								>
									<td className="px-4 py-3 text-ink">
										{parseName(reg)}
									</td>
									<td className="px-4 py-3">
										<span className="badge-pill text-xs">
											{getTypeLabel(reg.type, typeLabels)}
										</span>
									</td>
									<td className="px-4 py-3">
										{reg.email && <div className="text-body text-sm">{reg.email}</div>}
										{parsePhone(reg) && <div className="text-muted text-sm">{parsePhone(reg)}</div>}
										{!reg.email && !parsePhone(reg) && <span className="text-muted">—</span>}
									</td>
									<td className="px-4 py-3 text-sm font-mono text-muted tracking-wider">
										<span className="inline-flex items-center gap-1">
											{reg.id}
											<CopyButton text={reg.id} />
										</span>
									</td>
									<td className={`px-4 py-3 text-sm ${reg.checked_in ? "text-success" : "text-muted"}`}>
										{reg.checked_in && reg.checked_in_at
											? new Date(reg.checked_in_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })
											: "-"}
									</td>
									<td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
										<div className="inline-flex gap-1">
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
													className="btn btn-sm btn-ghost text-error"
													style={{ padding: "4px 8px", minHeight: "auto" }}
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
			<div className="flex items-center justify-between mt-md pb-xxl flex-wrap gap-sm text-sm">
				{/* Rows per page */}
				<div className="flex items-center gap-xs">
					<span className="text-smtext-muted">แสดง</span>
					<Select
						style={{ width: "auto" }}
						value={pageSize}
						onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
					>
						{[10, 20, 50, 100].map((n) => (
							<option key={n} value={n}>{n} รายการ</option>
						))}
					</Select>
					<span className="text-smtext-muted">จาก {total} รายการ</span>
				</div>

				{/* Page nav */}
				{totalPages > 1 && (
					<div className="flex items-center gap-xs">
						<button
							className="btn btn-secondary btn-sm"
							disabled={page <= 1}
							onClick={() => setPage(page - 1)}
						>
							ก่อนหน้า
						</button>
						<span className="px-3 text-smtext-muted whitespace-nowrap">
							{page} / {totalPages}
						</span>
						<button
							className="btn btn-secondary btn-sm"
							disabled={page >= totalPages}
							onClick={() => setPage(page + 1)}
						>
							ถัดไป
						</button>
					</div>
				)}
			</div>

			{/* Detail Modal */}
			{selectedReg && (
				<div
					className="fixed inset-0 flex items-center justify-center z-[1000]"
					style={{ background: "rgba(0,0,0,0.5)" }}
					onClick={() => setSelectedReg(null)}
				>
					<div
						className="card flex flex-col overflow-hidden m-lg"
						style={{ width: "min(560px, calc(100vw - 2rem))", minWidth: 320, minHeight: "60vh", maxHeight: "85vh", padding: 0 }}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Fixed header */}
						<div className="flex justify-between items-center px-lg py-md border-b border-black/5 flex-shrink-0 bg-white">
							<div>
								<p className="text-xl font-semibold text-ink m-0">{parseName(selectedReg)}</p>
								<div className="flex items-center gap-sm">
									<span className="text-sm text-muted">{getTypeLabel(selectedReg.type, typeLabels)}</span>
									<span className="inline-flex items-center gap-1 font-mono font-semibold tracking-widest text-muted bg-surface-soft px-2 py-0.5 rounded text-xs">
										{selectedReg.id}
										<CopyButton text={selectedReg.id} />
									</span>
								</div>
							</div>
							<button
								onClick={() => { setSelectedReg(null); setDeleteConfirm(false); }}
								className="p-1 text-muted bg-transparent border-none cursor-pointer hover:text-ink"
							>
								<IconX size={20} />
							</button>
						</div>

						{/* Scrollable body */}
						<div className="flex-1 overflow-y-auto p-lg bg-white">
							<DetailData data_json={selectedReg.data_json} type={selectedReg.type} />
							<div className="mt-lg !text-base text-muted">
								<p
									className={`inline-flex items-center gap-1 m-0 text-sm ${
										selectedReg.checked_in ? "bg-green-100 rounded px-2 py-1" : ""
									}`}
								>
									{selectedReg.checked_in ? (
										<>
											<IconCheck size={14} color="var(--color-success)" />
											เช็คอิน: {new Date(selectedReg.checked_in_at!).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
										</>
									) : "ยังไม่เช็คอิน"}
								</p>
			
							</div>
						</div>

						{/* Sticky footer */}
						{(() => {
							const idx = registrants.findIndex((r) => r.id === selectedReg.id);
							const hasPrev = idx > 0;
							const hasNext = idx < registrants.length - 1;
							return (
								<div className="flex items-center justify-between px-lg py-md border-t border-black/5 bg-canvas flex-shrink-0 gap-sm">
									<div className="flex items-center gap-sm">
										{!selectedReg.checked_in ? (
											<button
												className="btn btn-sm btn-secondary"
												disabled={checkingIn}
												onClick={() => handleCheckinFromPopup(selectedReg)}
											>
												<IconCheck size={14} />
												{checkingIn ? "กำลังเช็คอิน..." : "เช็คอิน"}
											</button>
										) : role === "super_admin" && (
											<button
												className="btn btn-sm btn-ghost text-muted"
												disabled={uncheckingIn}
												onClick={() => handleUncheckin(selectedReg)}
												title="ยกเลิกการเช็คอิน"
											>
												<IconX size={14} />
												{uncheckingIn ? "กำลังยกเลิก..." : "ยกเลิกเช็คอิน"}
											</button>
										)}
										{role === "super_admin" && (deleteConfirm ? (
											<>
												<span className="text-smtext-error font-medium">ยืนยันลบ?</span>
												<button
													className="btn btn-sm"
													style={{ background: "var(--color-error)", color: "white", border: "none" }}
													disabled={deleting}
													onClick={() => handleDelete(selectedReg.id)}
												>
													{deleting ? "กำลังลบ..." : "ยืนยัน"}
												</button>
												<button className="btn btn-sm btn-ghost" onClick={() => setDeleteConfirm(false)}>ยกเลิก</button>
											</>
										) : (
											<button
												className="btn btn-sm btn-ghost text-error"
												style={{ padding: "6px 10px" }}
												onClick={() => setDeleteConfirm(true)}
												title="ลบการลงทะเบียน"
											>
												<IconTrash size={16} />
											</button>
										))}
									</div>
									<div className="flex items-center gap-xs">
										<span className="text-smtext-muted">{idx + 1} / {registrants.length}</span>
										<button
											onClick={() => { setDeleteConfirm(false); setSelectedReg(registrants[idx - 1]); }}
											disabled={!hasPrev}
											className="btn btn-sm btn-ghost"
											style={{ padding: "6px 10px", opacity: hasPrev ? 1 : 0.3 }}
										>
											<IconArrowLeft size={16} />
										</button>
										<button
											onClick={() => { setDeleteConfirm(false); setSelectedReg(registrants[idx + 1]); }}
											disabled={!hasNext}
											className="btn btn-sm btn-ghost"
											style={{ padding: "6px 10px", opacity: hasNext ? 1 : 0.3 }}
										>
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

function isUploadKey(v: unknown): v is string {
	return typeof v === "string" && v.includes("/") && !v.startsWith("http");
}

function UploadPreview({ fileKey, onImageClick }: { fileKey: string; onImageClick: (url: string) => void }) {
	const url = `/api/file?key=${encodeURIComponent(fileKey)}`;
	const isImage = /\.(jpe?g|png|gif|webp|avif)$/i.test(fileKey);
	const isPdf = /\.pdf$/i.test(fileKey);
	const name = fileKey.split("/").pop() ?? fileKey;
	if (isImage) {
		return (
			<button type="button" onClick={() => onImageClick(url)} className="bg-transparent border-0 p-0 cursor-pointer flex-shrink-0">
				<img src={url} alt={name} className="w-14 h-14 object-cover rounded-lg border border-hairline hover:opacity-80 transition-opacity" />
			</button>
		);
	}
	return (
		<a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline text-xs break-all">
			{isPdf && (
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
				</svg>
			)}
			{name}
		</a>
	);
}

function FieldRow({ fieldKey, value, formConfig, onImageClick, data }: { fieldKey: string; value: unknown; formConfig: (typeof FORM_CONFIGS)[string] | undefined; onImageClick: (url: string) => void; data?: Record<string, unknown> }) {
	if (value === undefined || value === null) return null;

	const labelMap: Record<string, string> = {};
	if (formConfig) {
		for (const step of formConfig.steps) {
			for (const field of step.fields) {
				labelMap[field.key] = field.label.th;
			}
		}
	}
	// For _other keys, derive label from parent field
	let label: string;
	if (fieldKey.endsWith("_other")) {
		const parentKey = fieldKey.slice(0, -6);
		const parentLabel = labelMap[parentKey];
		label = parentLabel ? `${parentLabel} (ระบุ)` : fieldKey;
	} else {
		label = labelMap[fieldKey] || fieldKey;
	}

	if (typeof value === "boolean") {
		return (
			<div className="flex justify-between py-1.5 border-b border-black/5">
				<span className="text-sm text-muted">{label}</span>
				<span>{value ? <IconCheck size={14} color="var(--color-success)" /> : <IconX size={14} color="var(--color-muted)" />}</span>
			</div>
		);
	}
	if (Array.isArray(value)) {
		const opts = formConfig?.steps.flatMap((s) => s.fields).find((f) => f.key === fieldKey)?.options;
		// Array of upload keys
		if ((value as unknown[]).every(isUploadKey)) {
			return (
				<div className="py-1.5 border-b border-black/5">
					<span className="text-sm text-muted block mb-1.5">{label}</span>
					<div className="flex flex-wrap gap-2">
						{(value as string[]).map((k) => <UploadPreview key={k} fileKey={k} onImageClick={onImageClick} />)}
					</div>
				</div>
			);
		}
		const otherText = data?.[`${fieldKey}_other`] as string | undefined;
		const display = opts
			? (value as string[]).map((v) => {
				if (v === "other" && otherText) return `${opts.find((o) => o.value === v)?.label.th ?? "อื่นๆ"}: ${otherText}`;
				return opts.find((o) => o.value === v)?.label.th ?? v;
			}).join(", ")
			: `${value.length} รายการ`;
		return (
			<div className="flex justify-between py-1.5 border-b border-black/5 gap-sm">
				<span className="text-sm text-muted flex-shrink-0">{label}</span>
				<span className="text-sm text-right">{display}</span>
			</div>
		);
	}
	if (isUploadKey(value)) {
		return (
			<div className="py-1.5 border-b border-black/5">
				<span className="text-sm text-muted block mb-1.5">{label}</span>
				<UploadPreview fileKey={value} onImageClick={onImageClick} />
			</div>
		);
	}
	const fieldCfg = formConfig?.steps.flatMap((s) => s.fields).find((f) => f.key === fieldKey);
	const optLabel = fieldCfg?.options?.find((o) => o.value === value)?.label.th;
	const otherText = data?.[`${fieldKey}_other`] as string | undefined;
	const isUrl = !optLabel && typeof value === "string" && /^https?:\/\//.test(value);
	const isTel = fieldCfg?.type === "tel" || fieldKey.includes("phone") || fieldKey.includes("tel") || fieldKey.includes("mobile");
	const rawVal = (value === "other" && otherText)
		? `${optLabel ?? "อื่นๆ"}: ${otherText}`
		: optLabel || String(value);
	const displayVal = isTel && !optLabel ? formatPhone(rawVal) : rawVal;
	return (
		<div className="flex justify-between py-1.5 border-b border-black/5 gap-sm">
			<span className="text-sm text-muted flex-shrink-0">{label}</span>
			{isUrl ? (
				<a href={value as string} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline text-right break-all">{displayVal}</a>
			) : (
				<span className="text-sm text-ink text-right break-words">{displayVal}</span>
			)}
		</div>
	);
}

type TabGroup = { id: string; label: string; keys: string[] };

function TabBar({ tabs, active, onChange }: { tabs: TabGroup[]; active: string; onChange: (id: string) => void }) {
	return (
		<div className="flex gap-0 border-b border-hairline mb-0 -mx-lg px-lg overflow-x-auto">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					onClick={() => onChange(tab.id)}
					className={`flex-shrink-0 text-sm font-medium px-3 py-2 border-b-2 -mb-px bg-transparent border-x-0 border-t-0 cursor-pointer whitespace-nowrap transition-colors ${
						active === tab.id
							? "border-b-primary text-primary"
							: "border-b-transparent text-muted hover:text-body"
					}`}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}

function DetailData({ data_json, type }: { data_json: string; type: string }) {
	const [activeGroup, setActiveGroup] = useState<string | null>(null);
	const [lightbox, setLightbox] = useState<string | null>(null);

	try {
		const data = JSON.parse(data_json);
		const formConfig = FORM_CONFIGS[type];

		// Keys already shown in popup header — skip to avoid redundancy
		const NAME_KEYS = new Set(["child_full_name_th", "full_name", "full_name_th", "full_name_en"]);
		const skipKey = (k: string) => NAME_KEYS.has(k) || k.endsWith("_other");

		// Build tab groups — prefer explicit groups, fall back to steps
		let tabs: TabGroup[] = [];

		if (formConfig?.groups && formConfig.groups.length > 0) {
			tabs = formConfig.groups.map((g) => ({ id: g.id, label: g.label.th, keys: g.keys.filter((k) => !skipKey(k)) }));
		} else if (formConfig?.steps && formConfig.steps.length > 1) {
			// Auto-group by steps (skip summary steps)
			tabs = formConfig.steps
				.filter((s) => !s.showSummary)
				.map((s) => ({ id: s.id, label: s.title.th, keys: s.fields.map((f) => f.key).filter((k) => !skipKey(k)) }));
		}

		// Append "อื่นๆ" tab for keys not covered
		if (tabs.length > 0) {
			const coveredKeys = new Set(tabs.flatMap((t) => t.keys));
			const extraKeys = Object.keys(data).filter(
				(k) => !coveredKeys.has(k) && !skipKey(k) && data[k] !== undefined && data[k] !== null && data[k] !== "",
			);
			if (extraKeys.length > 0) tabs = [...tabs, { id: "__extra__", label: "อื่นๆ", keys: extraKeys }];
		}

		const lightboxOverlay = lightbox && (
			<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
				<img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" style={{ maxHeight: "90vh", maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()} />
				<button type="button" onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center border-0 cursor-pointer transition-colors">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
		);

		if (tabs.length > 0) {
			const resolvedId = activeGroup && tabs.find((t) => t.id === activeGroup) ? activeGroup : tabs[0].id;
			const resolvedTab = tabs.find((t) => t.id === resolvedId)!;

			return (
				<div>
					{lightboxOverlay}
					<TabBar tabs={tabs} active={resolvedId} onChange={setActiveGroup} />
					<div className="flex flex-col pt-sm">
						{resolvedTab.keys.map((key) => (
							<FieldRow key={key} fieldKey={key} value={data[key]} formConfig={formConfig} onImageClick={setLightbox} data={data} />
						))}
					</div>
				</div>
			);
		}

		// Flat fallback — no config or single step
		const labelMap: Record<string, string> = {};
		if (formConfig) {
			for (const step of formConfig.steps) {
				for (const field of step.fields) {
					labelMap[field.key] = field.label.th;
				}
			}
		}
		const configKeys = Object.keys(labelMap).filter((k) => !skipKey(k));
		const allKeys = configKeys.length > 0
			? [...configKeys, ...Object.keys(data).filter((k) => !labelMap[k] && !skipKey(k))]
			: Object.keys(data).filter((k) => !skipKey(k));

		return (
			<div className="flex flex-col">
				{lightboxOverlay}
				{allKeys.map((key) => (
					<FieldRow key={key} fieldKey={key} value={data[key]} formConfig={formConfig} onImageClick={setLightbox} data={data} />
				))}
			</div>
		);
	} catch {
		return <p className="text-error text-sm">ไม่สามารถอ่านข้อมูลได้</p>;
	}
}
