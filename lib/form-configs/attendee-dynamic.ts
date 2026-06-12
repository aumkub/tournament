import type { FormConfig, DataGroup } from "../../types/form-config";

export const attendeeDynamicConfig: FormConfig = {
	id: "attendee",
	label: { th: "ผู้ชม", en: "Attendee" },
	defaultUrlSlug: "attendee",
	emailField: "email",
	steps: [
		{
			id: "dates",
			title: { th: "เลือกวันที่เข้าชม", en: "Select Attendance Days" },
			fields: [
				{
					key: "attendance_days",
					type: "multiselect",
					label: { th: "วันที่ต้องการเข้าชมงาน (เลือกได้มากกว่า 1 วัน)", en: "Select days to attend (can choose multiple)" },
					required: true,
					options: [
						{ value: "thursday", label: { th: "วันพฤหัสบดี", en: "Thursday" } },
						{ value: "friday", label: { th: "วันศุกร์", en: "Friday" } },
						{ value: "saturday", label: { th: "วันเสาร์", en: "Saturday" } },
						{ value: "sunday", label: { th: "วันอาทิตย์", en: "Sunday" } },
					],
				},
			],
		},
		{
			id: "info",
			title: { th: "ข้อมูลผู้ชม & ยินยอม PDPA", en: "Attendee Info & PDPA Consent" },
			fields: [
				{
					key: "full_name",
					type: "text",
					label: { th: "ชื่อ-นามสกุล", en: "Full Name" },
					required: true,
				},
				{
					key: "age",
					type: "number",
					label: { th: "อายุ", en: "Age" },
					required: true,
					min: 1,
					max: 120,
				},
				{
					key: "phone",
					type: "tel",
					label: { th: "เบอร์โทรศัพท์", en: "Phone Number" },
					required: true,
				},
				{
					key: "email",
					type: "email",
					label: { th: "อีเมล", en: "Email" },
					required: true,
				},
				{
					key: "occupation",
					type: "select",
					label: { th: "ปัจจุบันประกอบอาชีพ", en: "Current Occupation" },
					required: true,
					options: [
						{ value: "student", label: { th: "นักเรียน / นักศึกษา", en: "Student" } },
						{ value: "government", label: { th: "ข้าราชการ / พนักงานรัฐวิสาหกิจ", en: "Government / State Enterprise Employee" } },
						{ value: "private", label: { th: "พนักงานบริษัทเอกชน", en: "Private Company Employee" } },
						{ value: "business", label: { th: "ค้าขาย / ธุรกิจส่วนตัว", en: "Business Owner" } },
						{ value: "freelance", label: { th: "อาชีพอิสระ / รับจ้าง", en: "Freelance / Contract Work" } },
						{ value: "professional", label: { th: "อาชีพเฉพาะ เช่น แพทย์ พยาบาล ทนาย", en: "Professional (Doctor, Nurse, Lawyer, etc.)" } },
						{ value: "farmer", label: { th: "เกษตรกร", en: "Farmer" } },
						{ value: "unemployed", label: { th: "ว่างงาน", en: "Unemployed" } },
						{ value: "other", label: { th: "อื่นๆ (ระบุเอง)", en: "Other (Please specify)" } },
					],
				},
				{
					key: "heard_from",
					type: "multiselect",
					label: { th: "รู้จักงานนี้จาก", en: "How did you hear about this event?" },
					required: true,
					options: [
						{ value: "facebook", label: { th: "Facebook", en: "Facebook" } },
						{ value: "instagram", label: { th: "Instagram", en: "Instagram" } },
						{ value: "line", label: { th: "Line", en: "Line" } },
						{ value: "acquaintance", label: { th: "คนรู้จัก", en: "Acquaintance" } },
						{ value: "news", label: { th: "สื่อข่าวสาร", en: "News Media" } },
						{ value: "school", label: { th: "จากโรงเรียน", en: "From School" } },
						{ value: "coach", label: { th: "จากผู้ฝึกสอน", en: "From Coach" } },
						{ value: "golf_course", label: { th: "จากสนามซ้อมต่างๆ", en: "From Golf Courses" } },
						{ value: "other", label: { th: "อื่นๆ ระบุ", en: "Other (Please specify)" } },
					],
				},
				{
					key: "consent_pdpa",
					type: "checkbox",
					label: { th: "ยินยอมให้เก็บและใช้ข้อมูลส่วนบุคคล", en: "I consent to the collection and use of personal data" },
					required: true,
				},
				{
					key: "consent_photo_video",
					type: "checkbox",
					label: { th: "ยินยอมให้เผยแพร่รูปภาพและวิดีโอในสื่อของงาน", en: "I consent to publication of photos and videos in event media" },
					required: true,
				},
			],
		},
	],
	groups: [
		{
			id: "info",
			label: { th: "ข้อมูลผู้ชม", en: "Attendee Info" },
			keys: ["attendance_days", "full_name", "age", "phone", "email", "occupation", "heard_from"],
		},
		{
			id: "consent",
			label: { th: "ยินยอม", en: "Consent" },
			keys: ["consent_pdpa", "consent_photo_video"],
		},
	],
};
