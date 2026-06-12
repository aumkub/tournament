import { useState, useCallback } from "react";
import type { FormConfig, FieldConfig, StepConfig } from "../../types/form-config";
import { FileUploadField } from "./FileUploadField";
import { IconCheck, IconArrowRight, IconArrowLeft } from "../ui/icons";

type Lang = "th" | "en";

interface DynamicMultiStepFormProps {
	config: FormConfig;
	slug: string;
	tournamentName: string;
	typeLabel: string;
	lang?: Lang;
	testMode?: boolean;
}

function t(val: { th: string; en: string }, lang: Lang): string {
	return val[lang] ?? val.th;
}

function Field({
	field,
	value,
	onChange,
	lang,
	slug,
	registrationId,
}: {
	field: FieldConfig;
	value: unknown;
	onChange: (key: string, val: unknown) => void;
	lang: Lang;
	slug: string;
	registrationId: string;
}) {
	const label = t(field.label, lang);
	const note = field.note ? t(field.note, lang) : undefined;

	const inputStyle: React.CSSProperties = {
		width: "100%",
		padding: "10px 12px",
		border: "1px solid var(--color-border)",
		borderRadius: "var(--radius-md)",
		fontSize: 15,
		background: "var(--color-input-bg, #fff)",
		boxSizing: "border-box",
	};

	const wrapStyle: React.CSSProperties = { marginBottom: "var(--spacing-lg)" };

	if (field.type === "multiselect") {
		const selected = Array.isArray(value) ? (value as string[]) : [];
		return (
			<div style={wrapStyle}>
				<label className="label">{label}{field.required && <span style={{ color: "var(--color-error)" }}> *</span>}</label>
				{note && <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2, marginBottom: 8 }}>{note}</p>}
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					{field.options?.map((opt) => {
						const checked = selected.includes(opt.value);
						return (
							<label
								key={opt.value}
								style={{
									display: "flex", alignItems: "center", gap: 12,
									padding: "12px 16px",
									border: `1.5px solid ${checked ? "var(--color-primary, #cc785c)" : "var(--color-border)"}`,
									borderRadius: "var(--radius-md)",
									background: checked ? "var(--color-surface-soft)" : "transparent",
									cursor: "pointer", fontSize: 15, transition: "border-color 0.15s, background 0.15s",
								}}
							>
								<input
									type="checkbox"
									checked={checked}
									onChange={() => {
										const next = checked
											? selected.filter((v) => v !== opt.value)
											: [...selected, opt.value];
										onChange(field.key, next);
									}}
									style={{ width: 18, height: 18, accentColor: "var(--color-primary)", flexShrink: 0 }}
								/>
								{t(opt.label, lang)}
							</label>
						);
					})}
				</div>
			</div>
		);
	}

	if (field.type === "radio") {
		return (
			<div style={wrapStyle}>
				<label className="label">{label}{field.required && <span style={{ color: "var(--color-error)" }}> *</span>}</label>
				{note && <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2, marginBottom: 8 }}>{note}</p>}
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					{field.options?.map((opt) => {
						const checked = value === opt.value;
						return (
							<label
								key={opt.value}
								style={{
									display: "flex", alignItems: "center", gap: 12,
									padding: "12px 16px",
									border: `1.5px solid ${checked ? "var(--color-primary, #cc785c)" : "var(--color-border)"}`,
									borderRadius: "var(--radius-md)",
									background: checked ? "var(--color-surface-soft)" : "transparent",
									cursor: "pointer", fontSize: 15, transition: "border-color 0.15s, background 0.15s",
								}}
							>
								<input
									type="radio"
									name={field.key}
									value={opt.value}
									checked={checked}
									onChange={() => onChange(field.key, opt.value)}
									style={{ width: 18, height: 18, accentColor: "var(--color-primary)", flexShrink: 0 }}
								/>
								{t(opt.label, lang)}
							</label>
						);
					})}
				</div>
			</div>
		);
	}

	if (field.type === "select") {
		return (
			<div style={wrapStyle}>
				<label className="label">{label}{field.required && <span style={{ color: "var(--color-error)" }}> *</span>}</label>
				{note && <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2, marginBottom: 8 }}>{note}</p>}
				<select
					value={(value as string) || ""}
					onChange={(e) => onChange(field.key, e.target.value)}
					style={{ ...inputStyle }}
				>
					<option value="">{lang === "th" ? "-- เลือก --" : "-- Select --"}</option>
					{field.options?.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{t(opt.label, lang)}
						</option>
					))}
				</select>
			</div>
		);
	}

	if (field.type === "checkbox") {
		return (
			<div style={{ ...wrapStyle, display: "flex", alignItems: "flex-start", gap: 10 }}>
				<input
					type="checkbox"
					id={field.key}
					checked={!!value}
					onChange={(e) => onChange(field.key, e.target.checked)}
					style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--color-primary)", flexShrink: 0 }}
				/>
				<label htmlFor={field.key} style={{ cursor: "pointer", fontSize: 15, lineHeight: 1.5 }}>
					{label}
					{field.required && <span style={{ color: "var(--color-error)" }}> *</span>}
				</label>
			</div>
		);
	}

	if (field.type === "textarea") {
		return (
			<div style={wrapStyle}>
				<label className="label">{label}{field.required && <span style={{ color: "var(--color-error)" }}> *</span>}</label>
				{note && <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2, marginBottom: 8 }}>{note}</p>}
				<textarea
					value={(value as string) || ""}
					onChange={(e) => onChange(field.key, e.target.value)}
					rows={4}
					style={{ ...inputStyle, resize: "vertical" }}
				/>
			</div>
		);
	}

	if (field.type === "file") {
		const keys = Array.isArray(value) ? (value as string[]) : value ? [value as string] : [];
		const category = field.accept?.includes("image") ? "photos" : "documents";

		return (
			<FileUploadField
				key={field.key}
				label={`${label}${field.required ? " *" : ""}${note ? ` — ${note}` : ""}`}
				accept={field.accept}
				tournamentId={slug}
				registrationId={registrationId}
				category={category as "photos" | "documents"}
				multiple={field.multiple}
				onUploadComplete={(key) => {
					if (field.multiple) {
						onChange(field.key, [...keys, key]);
					} else {
						onChange(field.key, key);
					}
				}}
			/>
		);
	}

	// text, email, tel, date, number, url
	return (
		<div style={wrapStyle}>
			<label className="label">{label}{field.required && <span style={{ color: "var(--color-error)" }}> *</span>}</label>
			{note && <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2, marginBottom: 8 }}>{note}</p>}
			<input
				type={field.type}
				value={(value as string) || ""}
				min={field.min}
				max={field.max}
				onChange={(e) => onChange(field.key, e.target.value)}
				style={inputStyle}
			/>
		</div>
	);
}

function SummaryCard({ data, config, lang }: { data: Record<string, unknown>; config: FormConfig; lang: Lang }) {
	const rows: { label: string; value: string }[] = [];
	const activeSteps = resolveActiveSteps(config.steps, data);
	for (const step of activeSteps) {
		if (step.showSummary) continue;
		for (const field of step.fields) {
			const val = data[field.key];
			if (val === undefined || val === null || val === "") continue;
			let display = "";
			if (Array.isArray(val)) {
				const opts = field.options;
				display = (val as string[])
					.map((v) => opts?.find((o) => o.value === v)?.label[lang] ?? v)
					.join(", ");
			} else if (field.options) {
				display = field.options.find((o) => o.value === val)?.label[lang] ?? String(val);
			} else if (typeof val === "boolean") {
				display = val ? (lang === "th" ? "ใช่" : "Yes") : (lang === "th" ? "ไม่" : "No");
			} else if (typeof val === "string" && val.startsWith("uploads/")) {
				display = lang === "th" ? "(ไฟล์อัปโหลดแล้ว)" : "(file uploaded)";
			} else {
				display = String(val);
			}
			rows.push({ label: t(field.label, lang), value: display });
		}
	}

	return (
		<div className="card" style={{ padding: "var(--spacing-lg)", marginBottom: "var(--spacing-xl)", fontSize: 14 }}>
			<p style={{ fontWeight: 600, marginBottom: 12 }}>{lang === "th" ? "สรุปข้อมูลที่กรอก" : "Summary"}</p>
			{rows.map((r) => (
				<div key={r.label} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
					<span style={{ color: "var(--color-muted)", minWidth: 140, flexShrink: 0 }}>{r.label}:</span>
					<span style={{ wordBreak: "break-word" }}>{r.value}</span>
				</div>
			))}
		</div>
	);
}

const THAI_FIRST = ["สมชาย","สมหญิง","กมล","วิไล","ปิยะ","นภา","ธนภัทร","อรุณ","ชลธิชา","ภาณุวัฒน์","พิมพ์ชนก","ศิริพร","เอกชัย","นันทิตา","วรวุฒิ"];
const THAI_LAST = ["ใจดี","รักษาดี","มีสุข","สว่างศรี","ทองดี","ดีงาม","มั่นคง","สุขสวัสดิ์","ศรีสมบัติ","วงศ์สุวรรณ","ประเสริฐ","แสงทอง"];
const EN_FIRST = ["James","Emma","Liam","Olivia","Noah","Ava","William","Sophia","Benjamin","Isabella","Lucas","Mia"];
const EN_LAST = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Anderson","Taylor"];
const SCHOOLS = ["โรงเรียนสาธิตมหาวิทยาลัย","โรงเรียนอัสสัมชัญ","โรงเรียนเซนต์คาเบรียล","โรงเรียนวัฒนาวิทยาลัย","โรงเรียนกรุงเทพคริสเตียน","โรงเรียนมหิดลวิทยานุสรณ์"];
const PROVINCES = ["กรุงเทพมหานคร","เชียงใหม่","ขอนแก่น","นครราชสีมา","สงขลา","ภูเก็ต","ชลบุรี","อยุธยา","สุราษฎร์ธานี","นนทบุรี"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randPhone(): string { return "08" + Array.from({ length: 8 }, () => randInt(0, 9)).join(""); }
function randEmail(nameTh: string): string {
	const slug = nameTh.replace(/\s/g, "").toLowerCase() || "user";
	return `${slug}${randInt(10, 99)}@example.com`;
}

function generateTestValue(field: FieldConfig): unknown {
	const k = field.key.toLowerCase();
	if (field.type === "file") return undefined;
	if (field.type === "multiselect") {
		const opts = field.options ?? [];
		if (opts.length === 0) return [];
		const count = randInt(1, Math.min(2, opts.length));
		return opts.sort(() => Math.random() - 0.5).slice(0, count).map((o) => o.value);
	}
	if (field.type === "radio" || field.type === "select") {
		const opts = field.options ?? [];
		return opts.length ? rand(opts).value : "";
	}
	if (field.type === "checkbox") return field.options ? [rand(field.options).value] : true;
	if (field.type === "date") {
		if (k.includes("birth") || k.includes("dob")) {
			const y = randInt(2005, 2015);
			const m = String(randInt(1, 12)).padStart(2, "0");
			const d = String(randInt(1, 28)).padStart(2, "0");
			return `${y}-${m}-${d}`;
		}
		return "2025-03-15";
	}
	if (field.type === "number") return String(randInt(Number(field.min ?? 10), Number(field.max ?? 99)));
	if (field.type === "url") return "https://example.com";
	// text / tel / email
	const thFirst = rand(THAI_FIRST);
	const thLast = rand(THAI_LAST);
	const enFirst = rand(EN_FIRST);
	const enLast = rand(EN_LAST);
	if (field.type === "email" || k.includes("email")) return randEmail(thFirst);
	if (field.type === "tel" || k.includes("phone") || k.includes("tel")) return randPhone();
	if (field.type === "textarea") return "ข้อมูลทดสอบ #" + randInt(100, 999);
	if (k.includes("name_th") || k.includes("fullname_th") || k === "full_name_th") return `${thFirst} ${thLast}`;
	if (k.includes("name_en") || k.includes("fullname_en") || k === "full_name_en") return `${enFirst} ${enLast}`;
	if (k.includes("full_name") || k.includes("fullname") || k === "full_name") return `${thFirst} ${thLast}`;
	if (k.includes("first") && k.includes("th")) return thFirst;
	if (k.includes("last") && k.includes("th")) return thLast;
	if (k.includes("first") && k.includes("en")) return enFirst;
	if (k.includes("last") && k.includes("en")) return enLast;
	if (k.includes("name")) return `${thFirst} ${thLast}`;
	if (k.includes("school") || k.includes("inst")) return rand(SCHOOLS);
	if (k.includes("province")) return rand(PROVINCES);
	if (k.includes("weight")) return String(randInt(40, 90));
	if (k.includes("height")) return String(randInt(140, 185));
	if (k.includes("age")) return String(randInt(8, 18));
	if (k.includes("id") || k.includes("citizen")) return String(randInt(1000000000000, 1999999999999));
	return "ทดสอบ " + randInt(100, 999);
}

function resolveActiveSteps(steps: StepConfig[], data: Record<string, unknown>): StepConfig[] {
	return steps.filter((s) => {
		if (!s.condition) return true;
		return data[s.condition.field] === s.condition.value;
	});
}

export function DynamicMultiStepForm({
	config,
	slug,
	tournamentName,
	typeLabel,
	lang = "th",
	testMode = false,
}: DynamicMultiStepFormProps) {
	const [stepIndex, setStepIndex] = useState(0);
	const [data, setData] = useState<Record<string, unknown>>({});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [registrationId] = useState(() => crypto.randomUUID());

	// Re-evaluate active steps whenever data changes (conditions may change)
	const activeSteps = resolveActiveSteps(config.steps, data);
	const currentStep: StepConfig = activeSteps[stepIndex] ?? activeSteps[activeSteps.length - 1];
	const totalSteps = activeSteps.length;

	const update = useCallback((key: string, val: unknown) => {
		setData((prev) => ({ ...prev, [key]: val }));
	}, []);

	const validateStep = (step: StepConfig): boolean => {
		for (const field of step.fields) {
			if (!field.required) continue;
			const val = data[field.key];
			if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0) || val === false) {
				setError(lang === "th" ? "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" : "Please fill in all required fields");
				return false;
			}
		}
		setError(null);
		return true;
	};

	const handleNext = () => {
		if (!validateStep(currentStep)) return;
		// Clamp in case step count shrunk due to condition change
		setStepIndex((i) => Math.min(i + 1, resolveActiveSteps(config.steps, data).length - 1));
		window.scrollTo(0, 0);
	};

	const handleBack = () => {
		setError(null);
		setStepIndex((i) => Math.max(i - 1, 0));
		window.scrollTo(0, 0);
	};

	const handleSubmit = async () => {
		if (!validateStep(currentStep)) return;

		setSubmitting(true);
		setError(null);

		try {
			const email = data[config.emailField] as string;
			const res = await fetch(`/api/register/${slug}/form`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ form_id: config.id, email, data }),
			});

			const text = await res.text();
			let result: any = {};
			try { result = JSON.parse(text); } catch { throw new Error(text || "เกิดข้อผิดพลาด"); }
			if (!res.ok) throw new Error(result.error || `เกิดข้อผิดพลาด (${res.status})`);

			window.location.href = `/${slug}/register/success?id=${result.id}`;
		} catch (err: any) {
			setError(err.message);
			setSubmitting(false);
		}
	};

	const isLastStep = stepIndex === totalSteps - 1;

	const handleAutoFill = () => {
		const allSteps = resolveActiveSteps(config.steps, data);
		const updates: Record<string, unknown> = {};
		for (const step of allSteps) {
			for (const field of step.fields) {
				if (field.type === "file") continue;
				const val = generateTestValue(field);
				if (val !== undefined) updates[field.key] = val;
			}
		}
		setData((prev) => ({ ...prev, ...updates }));
	};

	return (
		<div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--spacing-lg)" }}>
			{/* Header */}
			<div style={{ textAlign: "center", marginBottom: "var(--spacing-xxl)" }}>
				<h1 style={{ fontSize: 28, marginBottom: 8 }}>{tournamentName}</h1>
				<span className="badge-coral">{typeLabel}</span>
			</div>

			{/* Step progress */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: "var(--spacing-xl)" }}>
				{activeSteps.map((s, i) => (
					<div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<div style={{
							width: 28,
							height: 28,
							borderRadius: "50%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: 13,
							fontWeight: 600,
							background: i < stepIndex ? "var(--color-success)" : i === stepIndex ? "var(--color-primary)" : "var(--color-border)",
							color: i <= stepIndex ? "white" : "var(--color-muted)",
						}}>
							{i < stepIndex ? <IconCheck size={14} color="white" /> : i + 1}
						</div>
						{i < activeSteps.length - 1 && (
							<div style={{ width: 24, height: 2, background: i < stepIndex ? "var(--color-success)" : "var(--color-border)" }} />
						)}
					</div>
				))}
			</div>

			{/* Step title */}
			<div className="card" style={{ padding: "var(--spacing-xl)" }}>
				<h2 style={{ fontSize: 20, marginBottom: "var(--spacing-xl)" }}>
					{lang === "th" ? `ขั้นตอนที่ ${stepIndex + 1} จาก ${totalSteps}` : `Step ${stepIndex + 1} of ${totalSteps}`}
					{" — "}
					{t(currentStep.title, lang)}
				</h2>

				{currentStep.showSummary && (
					<SummaryCard data={data} config={config} lang={lang} />
				)}

				{currentStep.fields.map((field) => (
					<Field
						key={field.key}
						field={field}
						value={data[field.key]}
						onChange={update}
						lang={lang}
						slug={slug}
						registrationId={registrationId}
					/>
				))}

				{error && (
					<p style={{ color: "var(--color-error)", fontSize: 14, marginBottom: "var(--spacing-lg)" }}>
						{error}
					</p>
				)}

				<div style={{ display: "flex", gap: 12, marginTop: "var(--spacing-xl)" }}>
					{stepIndex > 0 && (
						<button
							type="button"
							className="btn btn-secondary"
							onClick={handleBack}
							style={{ flex: 1 }}
						>
							<IconArrowLeft size={16} />
							{lang === "th" ? "ย้อนกลับ" : "Back"}
						</button>
					)}
					{isLastStep ? (
						<button
							type="button"
							className="btn btn-primary"
							onClick={handleSubmit}
							disabled={submitting}
							style={{ flex: 1 }}
						>
							{submitting
								? (lang === "th" ? "กำลังส่ง..." : "Submitting...")
								: (lang === "th" ? "ส่งใบสมัคร" : "Submit")}
							{!submitting && <IconCheck size={16} />}
						</button>
					) : (
						<button
							type="button"
							className="btn btn-primary"
							onClick={handleNext}
							style={{ flex: 1 }}
						>
							{lang === "th" ? "ถัดไป" : "Next"}
							<IconArrowRight size={16} />
						</button>
					)}
				</div>
			</div>

			{/* Test mode floating button */}
			{testMode && (
				<button
					type="button"
					onClick={handleAutoFill}
					title="กรอกข้อมูลทดสอบอัตโนมัติ"
					style={{
						position: "fixed",
						bottom: 24,
						right: 24,
						zIndex: 1000,
						display: "flex",
						alignItems: "center",
						gap: 8,
						padding: "10px 18px",
						borderRadius: 999,
						background: "#f59e0b",
						color: "white",
						fontWeight: 600,
						fontSize: 14,
						border: "none",
						cursor: "pointer",
						boxShadow: "0 4px 16px rgba(245,158,11,0.5)",
						transition: "transform 0.1s, box-shadow 0.1s",
					}}
					onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
					onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
					</svg>
					กรอกข้อมูลทดสอบ
				</button>
			)}
		</div>
	);
}
