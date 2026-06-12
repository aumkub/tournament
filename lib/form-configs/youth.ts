import type { FormConfig, DataGroup } from "../../types/form-config";
import { THAI_PROVINCES } from "./thai-provinces";
import { HEARD_FROM_OPTIONS } from "./shared-options";

export const youthConfig: FormConfig = {
	id: "youth",
	label: { th: "เยาวชน", en: "Youth" },
	defaultUrlSlug: "youth",
	emailField: "parent_email",
	steps: [
		{
			id: "dates",
			title: { th: "เลือกวันที่เข้าร่วม", en: "Select Participation Days" },
			fields: [
				{
					key: "attendance_days",
					type: "multiselect",
					label: { th: "วันที่ต้องการเข้าร่วมงาน (เลือกได้มากกว่า 1 วัน)", en: "Select days to attend (can choose multiple)" },
					required: true,
					options: [
						{ value: "saturday", label: { th: "วันเสาร์", en: "Saturday" } },
						{ value: "sunday", label: { th: "วันอาทิตย์", en: "Sunday" } },
					],
				},
			],
		},
		{
			id: "path_select",
			title: { th: "เลือกประเภทการเข้าร่วม", en: "Select Participation Type" },
			fields: [
				{
					key: "youth_path",
					type: "radio",
					label: { th: "ประเภทการเข้าร่วม", en: "Participation Type" },
					required: true,
					options: [
						{ value: "general", label: { th: "ร่วมกิจกรรม (ไม่สมัครคัดเลือก Beat the Pro)", en: "General Activity (No Beat the Pro tryout)" } },
						{ value: "beat_pro", label: { th: "ร่วมกิจกรรมและสมัครคัดเลือก Beat the Pro", en: "Activity + Beat the Pro Tryout" } },
					],
				},
			],
		},
		{
			id: "child_info",
			title: { th: "ข้อมูลเด็ก", en: "Child Information" },
			fields: [
				{
					key: "child_full_name_th",
					type: "text",
					label: { th: "ชื่อ-นามสกุล (ภาษาไทย)", en: "Full Name (Thai)" },
					required: true,
				},
				{
					key: "child_full_name_en",
					type: "text",
					label: { th: "ชื่อ-นามสกุล (ภาษาอังกฤษ)", en: "Full Name (English)" },
					required: true,
				},
				{
					key: "child_nickname_th",
					type: "text",
					label: { th: "ชื่อเล่น (ภาษาไทย)", en: "Nickname (Thai)" },
					required: true,
				},
				{
					key: "child_nickname_en",
					type: "text",
					label: { th: "ชื่อเล่น (ภาษาอังกฤษ)", en: "Nickname (English)" },
					required: true,
				},
				{
					key: "child_dob",
					type: "date",
					label: { th: "วัน/เดือน/ปีเกิด", en: "Date of Birth" },
					required: true,
				},
				{
					key: "child_age",
					type: "number",
					label: { th: "อายุ", en: "Age" },
					required: true,
					min: 1,
					max: 25,
				},
				{
					key: "child_gender",
					type: "radio",
					label: { th: "เพศ", en: "Gender" },
					required: true,
					options: [
						{ value: "male", label: { th: "ชาย", en: "Male" } },
						{ value: "female", label: { th: "หญิง", en: "Female" } },
					],
				},
				{
					key: "child_province",
					type: "select",
					label: { th: "ภูมิลำเนาปัจจุบัน (จังหวัด)", en: "Current Province" },
					required: true,
					options: THAI_PROVINCES,
				},
				{
					key: "child_school",
					type: "text",
					label: { th: "โรงเรียน / สังกัด", en: "School / Organization" },
					required: false,
					note: { th: "ถ้ามี", en: "If applicable" },
				},
				{
					key: "golf_experience_years",
					type: "number",
					label: { th: "ประสบการณ์เล่นกอล์ฟมาแล้วกี่ปี", en: "Years of Golf Experience" },
					required: false,
					min: 0,
					max: 30,
					note: { th: "สำหรับผู้สมัคร Beat the Pro กรอกด้วย", en: "Required for Beat the Pro applicants" },
				},
				{
					key: "child_photo",
					type: "file",
					label: { th: "รูปถ่าย", en: "Photo" },
					required: true,
					accept: "image/jpeg,image/png",
					note: { th: "ไฟล์ JPG หรือ PNG", en: "JPG or PNG file" },
				},
			],
		},
		{
			id: "video_results",
			title: { th: "วิดีโอ & ผลงาน", en: "Videos & Results" },
			// Only shown when youth_path === "beat_pro"
			condition: { field: "youth_path", value: "beat_pro" },
			fields: [
				{
					key: "swing_video_url",
					type: "url",
					label: { th: "วิดีโอสวิง (Google Drive link)", en: "Swing Video (Google Drive link)" },
					required: true,
					note: { th: "MP4 หรือ MOV ไม่เกิน 2 นาที ตั้งค่า 'ทุกคนที่มีลิงก์สามารถดูได้'", en: "MP4 or MOV, max 2 min. Set sharing to 'Anyone with the link can view'." },
				},
				{
					key: "intro_video_url",
					type: "url",
					label: { th: "วิดีโอแนะนำตัว (Google Drive link)", en: "Introduction Video (Google Drive link)" },
					required: true,
					note: { th: "MP4 หรือ MOV ไม่เกิน 2 นาที ตั้งค่า 'ทุกคนที่มีลิงก์สามารถดูได้'", en: "MP4 or MOV, max 2 min. Set sharing to 'Anyone with the link can view'." },
				},
				{
					key: "scorecards",
					type: "file",
					label: { th: "Scorecard ผลการแข่งขัน", en: "Competition Scorecards" },
					required: true,
					accept: "application/pdf,image/png,image/jpeg",
					multiple: true,
					note: { th: "PDF หรือ PNG อัปโหลดได้สูงสุด 3 ไฟล์", en: "PDF or PNG, up to 3 files" },
				},
				{
					key: "result_description",
					type: "textarea",
					label: { th: "คำอธิบายผลงาน", en: "Result Description" },
					required: true,
					note: { th: "ระบุ อันดับ, สกอร์, รายการ เช่น อันดับ T12 (+10) 79 75 (154) Royal Hills, TGA Singha Krungthai 2026", en: "Include ranking, score, event name. e.g. T12 (+10) 79 75 (154) Royal Hills, TGA Singha Krungthai 2026" },
				},
			],
		},
		{
			id: "parent_info",
			title: { th: "ข้อมูลผู้ปกครอง", en: "Parent / Guardian Information" },
			fields: [
				{
					key: "parent_full_name",
					type: "text",
					label: { th: "ชื่อ-นามสกุลผู้ปกครอง", en: "Parent / Guardian Full Name" },
					required: true,
				},
				{
					key: "parent_relationship",
					type: "select",
					label: { th: "ความสัมพันธ์", en: "Relationship" },
					required: true,
					options: [
						{ value: "father", label: { th: "บิดา", en: "Father" } },
						{ value: "mother", label: { th: "มารดา", en: "Mother" } },
						{ value: "guardian", label: { th: "ผู้ปกครอง", en: "Guardian" } },
					],
				},
				{
					key: "parent_phone",
					type: "tel",
					label: { th: "เบอร์โทรศัพท์", en: "Phone Number" },
					required: true,
				},
				{
					key: "parent_email",
					type: "email",
					label: { th: "อีเมล (Gmail)", en: "Email (Gmail)" },
					required: true,
					note: { th: "ใช้รับอีเมลยืนยัน", en: "Used to receive confirmation email" },
				},
				{
					key: "heard_from",
					type: "multiselect",
					label: { th: "รู้จักงานนี้จาก", en: "How did you hear about this event?" },
					required: true,
					options: HEARD_FROM_OPTIONS,
				},
			],
		},
		{
			id: "pdpa",
			title: { th: "ยินยอม PDPA & ยืนยันการสมัคร", en: "PDPA Consent & Confirm" },
			showSummary: true,
			fields: [
				{
					key: "consent_pdpa",
					type: "checkbox",
					label: { th: "ยินยอมให้เก็บและใช้ข้อมูลส่วนบุคคลตาม PDPA", en: "I consent to the collection and use of personal data under PDPA" },
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
			id: "child",
			label: { th: "ข้อมูลเด็ก", en: "Child Info" },
			keys: [
				"attendance_days", "youth_path",
				"child_full_name_th", "child_full_name_en", "child_nickname_th", "child_nickname_en",
				"child_dob", "child_age", "child_gender", "child_province", "child_school",
				"golf_experience_years", "child_photo",
			],
		},
		{
			id: "parent",
			label: { th: "ข้อมูลผู้ปกครอง", en: "Parent Info" },
			keys: ["parent_full_name", "parent_relationship", "parent_phone", "parent_email", "heard_from"],
		},
		{
			id: "results",
			label: { th: "วิดีโอ & ผลงาน", en: "Videos & Results" },
			keys: ["swing_video_url", "intro_video_url", "scorecards", "result_description"],
		},
		{
			id: "consent",
			label: { th: "ยินยอม", en: "Consent" },
			keys: ["consent_pdpa", "consent_photo_video"],
		},
	],
};
