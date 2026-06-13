import React, { useState, useCallback } from "react";
import type { FormConfig, FieldConfig, StepConfig } from "../../types/form-config";
import { FileUploadField } from "./FileUploadField";
import { IconCheck, IconArrowRight, IconArrowLeft } from "../ui/icons";
import { Select } from "../ui/Select";

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
	otherValue,
	onChange,
	lang,
	slug,
	registrationId,
	hasError,
}: {
	field: FieldConfig;
	value: unknown;
	otherValue?: unknown;
	onChange: (key: string, val: unknown) => void;
	lang: Lang;
	slug: string;
	registrationId: string;
	hasError?: boolean;
}) {
	const label = t(field.label, lang);
	const note = field.note ? t(field.note, lang) : undefined;
	const errorBorder = hasError ? "border-[#EFC8C7] ring-1 ring-error/30" : "";

	if (field.type === "multiselect") {
		const selected = Array.isArray(value) ? (value as string[]) : [];
		const showOtherInput = selected.includes("other");
		return (
			<div className="mb-lg">
				<label className="label">
					{label}{field.required && <span className="text-error"> *</span>}
				</label>
				{note && <p className="!text-xs text-muted !-mt-1 mb-3">{note}</p>}
				<div className="flex flex-col gap-2 rounded-lg">
					{field.options?.map((opt) => {
						const checked = selected.includes(opt.value);
						return (
							<label
								key={opt.value}
								className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-base transition-colors ${
									checked
										? "border-[1.5px] border-primary bg-surface-soft"
										: hasError
										? "border-[1.5px] border-[#EFC8C7] bg-transparent hover:bg-surface-soft"
										: "border-[1.5px] border-hairline bg-transparent hover:bg-surface-soft"
								}`}
							>
								<input
									type="checkbox"
									checked={checked}
									onChange={() => {
										const next = checked
											? selected.filter((v) => v !== opt.value)
											: [...selected, opt.value];
										onChange(field.key, next);
										if (opt.value === "other" && checked) onChange(`${field.key}_other`, "");
									}}
									className="checkbox"
								/>
								{t(opt.label, lang)}
							</label>
						);
					})}
				</div>
				{showOtherInput && (
					<input
						className="input mt-2"
						type="text"
						placeholder={lang === "th" ? "โปรดระบุ..." : "Please specify..."}
						value={(otherValue as string) || ""}
						onChange={(e) => onChange(`${field.key}_other`, e.target.value)}
					/>
				)}
			</div>
		);
	}

	if (field.type === "radio") {
		const showOtherInput = value === "other";
		return (
			<div className="mb-lg">
				<label className="label">
					{label}{field.required && <span className="text-error"> *</span>}
				</label>
				{note && <p className="!text-xs text-muted !-mt-1 mb-3">{note}</p>}
				<div className="flex flex-col gap-2 rounded-lg">
					{field.options?.map((opt) => {
						const checked = value === opt.value;
						return (
							<label
								key={opt.value}
								className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-base transition-colors ${
									checked
										? "border-[1.5px] border-primary bg-surface-soft"
										: hasError
										? "border-[1.5px] border-[#EFC8C7] bg-transparent hover:bg-surface-soft"
										: "border-[1.5px] border-hairline bg-transparent hover:bg-surface-soft"
								}`}
							>
								<input
									type="radio"
									name={field.key}
									value={opt.value}
									checked={checked}
									onChange={() => onChange(field.key, opt.value)}
									className="radio"
								/>
								{t(opt.label, lang)}
							</label>
						);
					})}
				</div>
				{showOtherInput && (
					<input
						className="input mt-2"
						type="text"
						placeholder={lang === "th" ? "โปรดระบุ..." : "Please specify..."}
						value={(otherValue as string) || ""}
						onChange={(e) => onChange(`${field.key}_other`, e.target.value)}
					/>
				)}
			</div>
		);
	}

	if (field.type === "select") {
		const showOtherInput = (value as string) === "other";
		return (
			<div className="mb-lg">
				<label className="label">
					{label}{field.required && <span className="text-error"> *</span>}
				</label>
				{note && <p className="!text-xs text-muted !-mt-1 mb-3">{note}</p>}
				<Select
					value={(value as string) || ""}
					onChange={(e) => onChange(field.key, e.target.value)}
					arrowRight={12}
					className={`select ${errorBorder}`}
				>
					<option value="">{lang === "th" ? "-- เลือก --" : "-- Select --"}</option>
					{field.options?.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{t(opt.label, lang)}
						</option>
					))}
				</Select>
				{showOtherInput && (
					<input
						className="input mt-2"
						type="text"
						placeholder={lang === "th" ? "โปรดระบุ..." : "Please specify..."}
						value={(otherValue as string) || ""}
						onChange={(e) => onChange(`${field.key}_other`, e.target.value)}
					/>
				)}
			</div>
		);
	}

	if (field.type === "checkbox") {
		const isConsent = field.key.startsWith("consent_");
		return (
			<label
				htmlFor={field.key}
				className={`mb-xs flex items-start gap-2.5 cursor-pointer ${
					isConsent ? "px-3 py-2.5 rounded-lg bg-surface-soft border border-hairline" : ""
				}`}
			>
				<input
					type="checkbox"
					id={field.key}
					checked={!!value}
					onChange={(e) => onChange(field.key, e.target.checked)}
					className={`checkbox mt-0.5 ${hasError ? "border-[#EFC8C7]" : ""}`}
				/>
				<span className="text-sm leading-relaxed text-body">
					{label}
					{field.required && <span className="text-error"> *</span>}
				</span>
			</label>
		);
	}

	if (field.type === "textarea") {
		return (
			<div className="mb-lg">
				<label className="label">
					{label}{field.required && <span className="text-error"> *</span>}
				</label>
				{note && <p className="!text-xs text-muted !-mt-1 mb-3">{note}</p>}
				<textarea
					className={`input ${errorBorder}`}
					value={(value as string) || ""}
					onChange={(e) => onChange(field.key, e.target.value)}
					rows={4}
					style={{ resize: "vertical" }}
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
				hasError={hasError}
				onUploadComplete={(key) => {
					if (field.multiple) {
						onChange(field.key, [...keys, key]);
					} else {
						onChange(field.key, key);
					}
				}}
				onUploadRemove={(key) => {
					if (field.multiple) {
						onChange(field.key, keys.filter((k) => k !== key));
					} else {
						onChange(field.key, "");
					}
				}}
			/>
		);
	}

	// text, email, tel, date, number, url
	return (
		<div className="mb-lg">
			<label className="label">
				{label}{field.required && <span className="text-error"> *</span>}
			</label>
			{note && <p className="!text-xs text-muted !-mt-1 mb-3">{note}</p>}
			<input
				className={`input ${errorBorder}`}
				type={field.type}
				value={(value as string) || ""}
				min={field.min}
				max={field.max}
				onChange={(e) => onChange(field.key, e.target.value)}
			/>
		</div>
	);
}

function isUploadKey(v: unknown): v is string {
	return typeof v === "string" && v.includes("/") && !v.startsWith("http");
}

function renderUploadKey(key: string, onImageClick?: (url: string) => void, size = "w-20 h-20"): React.ReactNode {
	const isImage = /\.(jpe?g|png|gif|webp|avif)$/i.test(key);
	const url = `/api/file?key=${encodeURIComponent(key)}`;
	return isImage ? (
		<button type="button" onClick={() => onImageClick?.(url)} className="bg-transparent border-0 p-0 cursor-pointer">
			<img src={url} alt="" className={`${size} object-cover rounded-lg border border-hairline hover:opacity-80 transition-opacity`} />
		</button>
	) : (
		<a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs break-all">
			{key.split("/").pop()}
		</a>
	);
}

function fieldDisplay(val: unknown, field: FieldConfig, lang: Lang, onImageClick?: (url: string) => void, otherText?: string): React.ReactNode {
	if (val === undefined || val === null || val === "") return null;
	if (Array.isArray(val)) {
		if (val.length === 0) return null;
		// Array of upload keys
		if ((val as unknown[]).every(isUploadKey)) {
			return (
				<div className="flex flex-wrap gap-2">
					{(val as string[]).map((key) => (
						<React.Fragment key={key}>{renderUploadKey(key, onImageClick, "w-16 h-16")}</React.Fragment>
					))}
				</div>
			);
		}
		return (val as string[]).map((v) => {
			if (v === "other" && otherText) return `${lang === "th" ? "อื่นๆ" : "Other"}: ${otherText}`;
			return field.options?.find((o) => o.value === v)?.label[lang] ?? v;
		}).join(", ");
	}
	if (field.options) {
		const optLabel = field.options.find((o) => o.value === val)?.label[lang] ?? String(val);
		if (val === "other" && otherText) return `${optLabel}: ${otherText}`;
		return optLabel;
	}
	if (typeof val === "boolean") return val ? (lang === "th" ? "ใช่" : "Yes") : (lang === "th" ? "ไม่" : "No");
	if (isUploadKey(val)) return renderUploadKey(val, onImageClick);
	if (typeof val === "string" && /^https?:\/\//.test(val)) {
		return <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{val}</a>;
	}
	return String(val);
}

function SummaryCard({ data, config, lang }: { data: Record<string, unknown>; config: FormConfig; lang: Lang }) {
	const [activeIdx, setActiveIdx] = useState(0);
	const [lightbox, setLightbox] = useState<string | null>(null);
	const activeSteps = resolveActiveSteps(config.steps, data);

	// Build field lookup map
	const fieldMap = new Map<string, FieldConfig>();
	for (const step of activeSteps) {
		if (step.showSummary) continue;
		for (const field of step.fields) fieldMap.set(field.key, field);
	}

	// Determine groups — prefer explicit config.groups, else group by step
	type Group = { label: string; fields: FieldConfig[] };
	let groups: Group[];

	if (config.groups && config.groups.length > 0) {
		groups = config.groups.map((g) => ({
			label: t(g.label, lang),
			fields: g.keys.map((k) => fieldMap.get(k)).filter(Boolean) as FieldConfig[],
		})).filter((g) => g.fields.length > 0);
	} else {
		groups = activeSteps
			.filter((s) => !s.showSummary)
			.map((s) => ({ label: t(s.title, lang), fields: s.fields }))
			.filter((g) => g.fields.length > 0);
	}

	const safeIdx = Math.min(activeIdx, groups.length - 1);
	const activeGroup = groups[safeIdx];

	const visibleRows = activeGroup?.fields
		.map((field) => ({ field, display: fieldDisplay(data[field.key], field, lang, setLightbox, data[`${field.key}_other`] as string | undefined) }))
		.filter((r) => r.display !== null) ?? [];

	return (
		<div className="mb-xl">
			{/* Lightbox */}
			{lightbox && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
					onClick={() => setLightbox(null)}
				>
					<img
						src={lightbox}
						alt=""
						className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
						style={{ maxHeight: "90vh", maxWidth: "90vw" }}
						onClick={(e) => e.stopPropagation()}
					/>
					<button
						type="button"
						onClick={() => setLightbox(null)}
						className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center border-0 cursor-pointer transition-colors"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
			)}

			<p className="text-sm font-semibold text-muted uppercase tracking-wide mb-md m-0">
				{lang === "th" ? "สรุปข้อมูลที่กรอก" : "Summary"}
			</p>

			<div className="card !p-0 overflow-hidden">
				{/* Tab bar */}
				{groups.length > 1 && (
					<div className="flex border-b border-hairline overflow-x-auto">
						{groups.map((g, i) => (
							<button
								key={i}
								type="button"
								onClick={() => setActiveIdx(i)}
								className={`flex-shrink-0 text-sm font-medium px-4 py-2.5 border-b-2 -mb-px bg-transparent border-x-0 border-t-0 cursor-pointer whitespace-nowrap transition-colors ${
									safeIdx === i
										? "border-b-primary text-primary"
										: "border-b-transparent text-muted hover:text-body"
								}`}
							>
								{g.label}
							</button>
						))}
					</div>
				)}

				{/* Table */}
				<table className="w-full text-sm">
					<tbody>
						{visibleRows.map(({ field, display }, ri) => (
							<tr key={field.key} className={ri < visibleRows.length - 1 ? "border-b border-hairline/50" : ""}>
								<td className="py-2.5 px-lg text-muted align-top" style={{ width: "40%", minWidth: 120 }}>
									{t(field.label, lang)}
								</td>
								<td className="py-2.5 px-lg text-ink align-top font-medium break-words" style={{ width: "60%" }}>
									{display}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
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
const EMAIL_SLUGS = ["user","test","demo","player","member","guest","athlete","participant","register","entry"];
function randEmail(): string { return `${rand(EMAIL_SLUGS)}${randInt(100, 9999)}@example.com`; }

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
	const thFirst = rand(THAI_FIRST);
	const thLast = rand(THAI_LAST);
	const enFirst = rand(EN_FIRST);
	const enLast = rand(EN_LAST);
	if (field.type === "email" || k.includes("email")) return randEmail();
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

function matchCondition(cond: import("../../types/form-config").StepCondition, data: Record<string, unknown>): boolean {
	const val = data[cond.field];
	if (cond.operator === "includes") return Array.isArray(val) && (val as string[]).includes(cond.value);
	return val === cond.value;
}

function resolveActiveSteps(steps: StepConfig[], data: Record<string, unknown>): StepConfig[] {
	return steps.filter((s) => {
		if (s.conditions) return s.conditions.every((c) => matchCondition(c, data));
		if (!s.condition) return true;
		return matchCondition(s.condition, data);
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
	const [isDuplicate, setIsDuplicate] = useState(false);
	const [errorFields, setErrorFields] = useState<Set<string>>(new Set());
	const [registrationId] = useState(() => crypto.randomUUID());

	const activeSteps = resolveActiveSteps(config.steps, data);
	const currentStep: StepConfig = activeSteps[stepIndex] ?? activeSteps[activeSteps.length - 1];
	const totalSteps = activeSteps.length;

	const update = useCallback((key: string, val: unknown) => {
		setData((prev) => ({ ...prev, [key]: val }));
		setErrorFields((prev) => { if (!prev.has(key)) return prev; const next = new Set(prev); next.delete(key); return next; });
	}, []);

	const validateStep = (step: StepConfig): boolean => {
		const missing = new Set<string>();
		for (const field of step.fields) {
			if (!field.required) continue;
			const val = data[field.key];
			if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0) || val === false) {
				missing.add(field.key);
			}
		}
		if (missing.size > 0) {
			setErrorFields(missing);
			setError(lang === "th" ? "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" : "Please fill in all required fields");
			return false;
		}
		setErrorFields(new Set());
		setError(null); setIsDuplicate(false);
		return true;
	};

	const handleNext = () => {
		if (!validateStep(currentStep)) return;
		setStepIndex((i) => Math.min(i + 1, resolveActiveSteps(config.steps, data).length - 1));
		window.scrollTo(0, 0);
	};

	const handleBack = () => {
		setError(null); setIsDuplicate(false); setErrorFields(new Set());
		setStepIndex((i) => Math.max(i - 1, 0));
		window.scrollTo(0, 0);
	};

	const handleSubmit = async () => {
		if (!validateStep(currentStep)) return;
		setSubmitting(true);
		setError(null); setIsDuplicate(false);
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
			if (res.status === 409 && result.code === "duplicate_email") {
				setIsDuplicate(true);
				setSubmitting(false);
				return;
			}
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
		<div className="max-w-[640px] mx-auto px-lg">
			{/* Header */}
			<div className="text-center mb-xxl hidden">
				<h1 className="!text-[28px] !mb-3">{tournamentName}</h1>
				<span className="badge-coral">{typeLabel}</span>
			</div>

			{/* Step progress */}
			<div className="flex items-center justify-center mb-xl">
				{activeSteps.map((s, i) => (
					<div key={s.id} className="flex items-center">
						{/* Connector line before circle (except first) */}
						{i > 0 && (
							<div className={`h-0.5 w-8 ${i <= stepIndex ? "bg-success" : "bg-hairline"}`} />
						)}
						<div
							className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
								i < stepIndex
									? "bg-success text-white"
									: i === stepIndex
									? "bg-primary text-white"
									: "bg-hairline text-muted"
							}`}
						>
							{i < stepIndex ? <IconCheck size={14} color="white" /> : i + 1}
						</div>
					</div>
				))}
			</div>

			{/* Step card */}
			<div className="card p-xl">
				<h2 className="!text-xl mb-xl">
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
						otherValue={data[`${field.key}_other`]}
						onChange={update}
						lang={lang}
						slug={slug}
						registrationId={registrationId}
						hasError={errorFields.has(field.key)}
					/>
				))}

				{isDuplicate && (
					<div className="rounded-lg border border-warning p-md mb-lg" style={{ background: "rgba(212,160,23,0.08)" }}>
						<p className="text-sm font-semibold text-warning m-0 mb-1">
							{lang === "th" ? "อีเมลนี้ได้ลงทะเบียนไปแล้ว" : "This email is already registered"}
						</p>
						<p className="text-sm text-muted m-0">
							{lang === "th"
								? "อีเมลที่ใช้ลงทะเบียนนี้มีข้อมูลในระบบแล้ว หากต้องการตรวจสอบกรุณาติดต่อผู้จัดงาน"
								: "This email already exists in the system. Please contact the organizer to verify."}
						</p>
					</div>
				)}

				{error && (
					<div className="rounded-md p-md mb-lg border border-[#EFC8C7]" style={{ background: "rgba(198,69,69,0.08)" }}>
						<p className="text-sm text-error m-0">{error}</p>
					</div>
				)}

				<div className="flex gap-3 mt-xl">
					{stepIndex > 0 && (
						<button type="button" className="btn btn-secondary flex-1" onClick={handleBack}>
							<IconArrowLeft size={16} />
							{lang === "th" ? "ย้อนกลับ" : "Back"}
						</button>
					)}
					{isLastStep ? (
						<button type="button" className="btn btn-primary flex-1" onClick={handleSubmit} disabled={submitting}>
							{submitting
								? (lang === "th" ? "กำลังส่ง..." : "Submitting...")
								: (lang === "th" ? "ส่งใบสมัคร" : "Submit")}
							{!submitting && <IconCheck size={16} />}
						</button>
					) : (
						<button type="button" className="btn btn-primary flex-1" onClick={handleNext}>
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
					className="fixed bottom-6 right-6 z-[1000] flex items-center gap-2 px-[18px] py-[10px] rounded-full text-white font-semibold text-sm border-none cursor-pointer"
					style={{ background: "#f59e0b", boxShadow: "0 4px 16px rgba(245,158,11,0.5)" }}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
					</svg>
					Auto Fill
				</button>
			)}
		</div>
	);
}
