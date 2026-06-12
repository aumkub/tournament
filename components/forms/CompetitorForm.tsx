import { useState } from "react";
import type { CompetitorData, PreferredDateCompetitor } from "../../types/registration";
import { PREFERRED_DATE_LABELS } from "../../types/registration";
import { FileUploadField } from "./FileUploadField";
import { PDPASection } from "./PDPASection";
import { IconCheck, IconArrowRight, IconArrowLeft } from "../ui/icons";

interface CompetitorFormProps {
	slug: string;
	tournamentName: string;
	typeLabel: string;
}

type Step = 1 | 2 | 3;

const initialData: CompetitorData = {
	gender: "male",
	full_name_th: "",
	full_name_en: "",
	nickname_th: "",
	nickname_en: "",
	age: "",
	academic_year: "",
	school: "",
	phone: "",
	email: "",
	golf_experience_years: "",
	preferred_date: "both_with_beat",
	want_certificate: false,
	applicant_photo_keys: [],
	intro_video_key: "",
	golf_swing_video_key: "",
	tournament_result_1: "",
	tournament_result_2: "",
	tournament_result_3: "",
	official_scoreboard_key: "",
	consent_personal_id: false,
	consent_contact_info: false,
	consent_photo_video: false,
	consent_third_party: false,
	consent_international_transfer: false,
	consent_data_retention: false,
	acknowledge_privacy_policy: false,
};

export function CompetitorForm({ slug, tournamentName, typeLabel }: CompetitorFormProps) {
	const [step, setStep] = useState<Step>(1);
	const [data, setData] = useState<CompetitorData>(initialData);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [regId] = useState(() => crypto.randomUUID());

	const update = (field: keyof CompetitorData, value: any) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const validateStep1 = (): boolean => {
		if (!data.full_name_th || !data.full_name_en || !data.phone || !data.email) {
			setError("กรุณากรอกข้อมูลที่จำเป็นให้ครบ");
			return false;
		}
		setError(null);
		return true;
	};

	const handleSubmit = async () => {
		if (!data.acknowledge_privacy_policy) {
			setError("ต้องรับทราบนโยบายความเป็นส่วนตัว");
			return;
		}

		setSubmitting(true);
		setError(null);

		try {
			const res = await fetch(`/api/register/${slug}/competitor`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: data.email, data }),
			});

			const result = await res.json();
			if (!res.ok) {
				throw new Error(result.error || "เกิดข้อผิดพลาด");
			}

			window.location.href = `/${slug}/register/success?id=${result.id}`;
		} catch (err: any) {
			setError(err.message);
			setSubmitting(false);
		}
	};

	return (
		<div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--spacing-lg)" }}>
			{/* Header */}
			<div style={{ textAlign: "center", marginBottom: "var(--spacing-xxl)" }}>
				<h1 style={{ fontSize: 28, marginBottom: 8 }}>{tournamentName}</h1>
				<span className="badge-coral">{typeLabel}</span>
			</div>

			{/* Step Indicator */}
			<div className="step-indicator" style={{ marginBottom: "var(--spacing-xxl)" }}>
				{[1, 2, 3].map((s, i) => (
					<div key={s} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
						<div className={`step-dot ${step === s ? "active" : step > s ? "completed" : ""}`}>
							{step > s ? <IconCheck size={16} color="var(--color-on-primary)" /> : s}
						</div>
						{i < 2 && <div className={`step-line ${step > s ? "completed" : ""}`} />}
					</div>
				))}
			</div>

			{error && (
				<div
					style={{
						padding: "var(--spacing-md)",
						background: "#fef2f2",
						border: "1px solid var(--color-error)",
						borderRadius: "var(--radius-md)",
						color: "var(--color-error)",
						fontSize: 14,
						marginBottom: "var(--spacing-lg)",
					}}
				>
					{error}
				</div>
			)}

			{/* Step 1 — ข้อมูลส่วนตัว */}
			{step === 1 && (
				<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
					<h2 style={{ fontSize: 22 }}>ข้อมูลส่วนตัว</h2>

					<div>
						<label className="label">เพศ *</label>
						<div style={{ display: "flex", gap: "var(--spacing-lg)" }}>
							{(["male", "female"] as const).map((g) => (
								<label key={g} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
									<input type="radio" name="gender" checked={data.gender === g} onChange={() => update("gender", g)} />
									{g === "male" ? "ชาย" : "หญิง"}
								</label>
							))}
						</div>
					</div>

					{[
						{ field: "full_name_th", label: "ชื่อ-นามสกุล (ไทย) *", type: "text" },
						{ field: "full_name_en", label: "Full Name (English) *", type: "text" },
						{ field: "nickname_th", label: "ชื่อเล่น (ไทย)", type: "text" },
						{ field: "nickname_en", label: "Nickname (English)", type: "text" },
						{ field: "age", label: "อายุ", type: "text" },
						{ field: "academic_year", label: "ชั้นปีการศึกษา", type: "text" },
						{ field: "school", label: "โรงเรียน", type: "text" },
						{ field: "phone", label: "หมายเลขโทรศัพท์ *", type: "tel" },
						{ field: "email", label: "อีเมล *", type: "email" },
						{ field: "golf_experience_years", label: "มีประสบการณ์เล่นกอล์ฟมาแล้วกี่ปี", type: "text" },
					].map(({ field, label, type }) => (
						<div key={field}>
							<label className="label">{label}</label>
							<input className="input input-bordered w-full" type={type} value={(data as any)[field]} onChange={(e) => update(field as any, e.target.value)} />
						</div>
					))}

					<div>
						<label className="label">เลือกวันที่</label>
						<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
							{(Object.entries(PREFERRED_DATE_LABELS) as [PreferredDateCompetitor, string][]).map(([val, lbl]) => (
								<label key={val} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
									<input type="radio" name="preferred_date" checked={data.preferred_date === val} onChange={() => update("preferred_date", val)} />
									{lbl}
								</label>
							))}
						</div>
					</div>

					<div>
						<label className="label">ต้องการรับใบประกาศนียบัตร</label>
						<div style={{ display: "flex", gap: "var(--spacing-lg)" }}>
							{[true, false].map((v) => (
								<label key={String(v)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
									<input type="radio" name="want_certificate" checked={data.want_certificate === v} onChange={() => update("want_certificate", v)} />
									{v ? "ใช่" : "ไม่"}
								</label>
							))}
						</div>
					</div>

					<button className="btn btn-primary" onClick={() => validateStep1() && setStep(2)} style={{ marginTop: "var(--spacing-md)" }}>
						ถัดไป <IconArrowRight size={16} />
					</button>
				</div>
			)}

			{/* Step 2 — Beat the Pro */}
			{step === 2 && (
				<div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
					<h2 style={{ fontSize: 22 }}>Beat the Pro</h2>

					<FileUploadField
						label="รูปถ่ายผู้สมัคร (1-2 รูป)"
						accept="image/*"
						maxSizeMB={5}
						tournamentId={slug}
						registrationId={regId}
						category="photos"
						hint="ถ่ายภายใน 6 เดือน, สูงสุด 5MB"
						onUploadComplete={(key) =>
							setData((prev) => ({
								...prev,
								applicant_photo_keys: [...prev.applicant_photo_keys, key],
							}))
						}
					/>

					<FileUploadField
						label="คลิปแนะนำตัว (60-120 วินาที)"
						accept="video/*"
						maxSizeMB={100}
						tournamentId={slug}
						registrationId={regId}
						category="videos"
						onUploadComplete={(key) => update("intro_video_key", key)}
					/>

					<FileUploadField
						label="วิดีโอสวิงกอล์ฟ (≤3 นาที)"
						accept="video/*"
						maxSizeMB={100}
						tournamentId={slug}
						registrationId={regId}
						category="videos"
						onUploadComplete={(key) => update("golf_swing_video_key", key)}
					/>

					{[
						{ field: "tournament_result_1", label: "ผลการแข่งขัน 1" },
						{ field: "tournament_result_2", label: "ผลการแข่งขัน 2" },
						{ field: "tournament_result_3", label: "ผลการแข่งขัน 3" },
					].map(({ field, label }) => (
						<div key={field}>
							<label className="label">{label}</label>
							<textarea
								className="textarea textarea-bordered"
								value={(data as any)[field]}
								onChange={(e) => update(field as any, e.target.value)}
								rows={3}
							/>
						</div>
					))}

					<FileUploadField
						label="แนบผลคะแนนอย่างเป็นทางการ"
						accept=".pdf,.jpg,.png"
						maxSizeMB={10}
						tournamentId={slug}
						registrationId={regId}
						category="documents"
						onUploadComplete={(key) => update("official_scoreboard_key", key)}
					/>

					<div style={{ display: "flex", gap: "var(--spacing-md)", marginTop: "var(--spacing-md)" }}>
						<button className="btn btn-secondary" onClick={() => setStep(1)}>
							<IconArrowLeft size={16} /> ย้อนกลับ
						</button>
						<button className="btn btn-primary" onClick={() => setStep(3)}>
							ถัดไป <IconArrowRight size={16} />
						</button>
					</div>
				</div>
			)}

			{/* Step 3 — PDPA */}
			{step === 3 && (
				<div>
					<PDPASection
						values={data}
						onChange={(pdpa) => setData((prev) => ({ ...prev, ...pdpa }))}
					/>
					<div style={{ display: "flex", gap: "var(--spacing-md)", marginTop: "var(--spacing-xxl)" }}>
						<button className="btn btn-secondary" onClick={() => setStep(2)}>
							<IconArrowLeft size={16} /> ย้อนกลับ
						</button>
						<button
							className="btn btn-primary"
							onClick={handleSubmit}
							disabled={submitting}
						>
							{submitting ? "กำลังส่ง..." : `ลงทะเบียน${typeLabel}`}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
