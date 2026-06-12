import { useState } from "react";
import type { AttendeeData } from "../../types/registration";
import { PDPASection } from "./PDPASection";
import { IconCheck, IconArrowRight, IconArrowLeft } from "../ui/icons";

interface AttendeeFormProps {
	slug: string;
	tournamentName: string;
	typeLabel: string;
}

type Step = 1 | 2;

const initialData: AttendeeData = {
	gender: "male",
	full_name_th: "",
	full_name_en: "",
	nickname_th: "",
	nickname_en: "",
	age: "",
	phone: "",
	email: "",
	organization: "",
	preferred_date: "",
	want_certificate: false,
	consent_personal_id: false,
	consent_contact_info: false,
	consent_photo_video: false,
	consent_third_party: false,
	consent_international_transfer: false,
	consent_data_retention: false,
	acknowledge_privacy_policy: false,
};

export function AttendeeForm({ slug, tournamentName, typeLabel }: AttendeeFormProps) {
	const [step, setStep] = useState<Step>(1);
	const [data, setData] = useState<AttendeeData>(initialData);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const update = (field: keyof AttendeeData, value: any) => {
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
			const res = await fetch(`/api/register/${slug}/attendee`, {
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
			<div style={{ textAlign: "center", marginBottom: "var(--spacing-xxl)" }}>
				<h1 style={{ fontSize: 28, marginBottom: 8 }}>{tournamentName}</h1>
				<span className="badge-coral">{typeLabel}</span>
			</div>

			{/* Step Indicator */}
			<div className="step-indicator" style={{ marginBottom: "var(--spacing-xxl)" }}>
				<div className={`step-dot ${step >= 1 ? (step > 1 ? "completed" : "active") : ""}`}>
					{step > 1 ? <IconCheck size={16} color="var(--color-on-primary)" /> : 1}
				</div>
				<div className={`step-line ${step > 1 ? "completed" : ""}`} />
				<div className={`step-dot ${step >= 2 ? "active" : ""}`}>2</div>
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
						{ field: "phone", label: "หมายเลขโทรศัพท์ *", type: "tel" },
						{ field: "email", label: "อีเมล *", type: "email" },
						{ field: "organization", label: "หน่วยงาน / องค์กร", type: "text" },
					].map(({ field, label, type }) => (
						<div key={field}>
							<label className="label">{label}</label>
							<input className="input input-bordered w-full" type={type} value={(data as any)[field]} onChange={(e) => update(field as any, e.target.value)} />
						</div>
					))}

					<div>
						<label className="label">วันที่ต้องการเข้าร่วม</label>
						<input className="input input-bordered w-full" type="text" value={data.preferred_date} onChange={(e) => update("preferred_date", e.target.value)} placeholder="เช่น วันเสาร์ที่ 15 มีนาคม" />
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

			{step === 2 && (
				<div>
					<PDPASection
						values={data}
						onChange={(pdpa) => setData((prev) => ({ ...prev, ...pdpa }))}
					/>
					<div style={{ display: "flex", gap: "var(--spacing-md)", marginTop: "var(--spacing-xxl)" }}>
						<button className="btn btn-secondary" onClick={() => setStep(1)}>
							<IconArrowLeft size={16} /> ย้อนกลับ
						</button>
						<button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
							{submitting ? "กำลังส่ง..." : `ลงทะเบียน${typeLabel}`}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
