export type RegistrationType = "competitor" | "attendee";

export type CompetitorData = {
	gender: "male" | "female";
	full_name_th: string;
	full_name_en: string;
	nickname_th: string;
	nickname_en: string;
	age: string;
	academic_year: string;
	school: string;
	phone: string;
	email: string;
	golf_experience_years: string;
	preferred_date: "both_with_beat" | "both_no_beat" | "sat_with_beat" | "sat_only" | "sun_only";
	want_certificate: boolean;
	applicant_photo_keys: string[];
	intro_video_key: string;
	golf_swing_video_key: string;
	tournament_result_1: string;
	tournament_result_2: string;
	tournament_result_3: string;
	official_scoreboard_key: string;
	consent_personal_id: boolean;
	consent_contact_info: boolean;
	consent_photo_video: boolean;
	consent_third_party: boolean;
	consent_international_transfer: boolean;
	consent_data_retention: boolean;
	acknowledge_privacy_policy: boolean;
};

export type AttendeeData = {
	gender: "male" | "female";
	full_name_th: string;
	full_name_en: string;
	nickname_th: string;
	nickname_en: string;
	age: string;
	phone: string;
	email: string;
	organization: string;
	preferred_date: string;
	want_certificate: boolean;
	consent_personal_id: boolean;
	consent_contact_info: boolean;
	consent_photo_video: boolean;
	consent_third_party: boolean;
	consent_international_transfer: boolean;
	consent_data_retention: boolean;
	acknowledge_privacy_policy: boolean;
};

export type Registration = {
	id: string;
	tournament_id: string;
	type: RegistrationType;
	email: string;
	data_json: string; // CompetitorData | AttendeeData serialized
	qr_code_token: string;
	checked_in: boolean;
	checked_in_at: number | null;
	checked_in_by: string | null;
	submitted_at: number;
};

export type PDPAConsents = {
	consent_personal_id: boolean;
	consent_contact_info: boolean;
	consent_photo_video: boolean;
	consent_third_party: boolean;
	consent_international_transfer: boolean;
	consent_data_retention: boolean;
	acknowledge_privacy_policy: boolean;
};

export const PDPACONSENT_LABELS: Record<keyof PDPAConsents, string> = {
	consent_personal_id: "ข้าพเจ้ายินยอมให้เก็บรวบรวมข้อมูลหมายเลขบัตรประชาชน",
	consent_contact_info: "ข้าพเจ้ายินยอมให้เก็บรวบรวมข้อมูลการติดต่อ",
	consent_photo_video: "ข้าพเจ้ายินยอมให้ถ่ายภาพและวิดีโอระหว่างกิจกรรม",
	consent_third_party: "ข้าพเจ้ายินยอมให้เปิดเผยข้อมูลแก่บุคคลที่สามที่เกี่ยวข้อง",
	consent_international_transfer: "ข้าพเจ้ายินยอมให้โอนข้อมูลไปยังต่างประเทศ",
	consent_data_retention: "ข้าพเจ้ายินยอมให้เก็บรักษาข้อมูลตามระยะเวลาที่กำหนด",
	acknowledge_privacy_policy: "ข้าพเจ้ารับทราบและยอมรับนโยบายความเป็นส่วนตัว",
};

export const PDPACONSENT_KEYS: (keyof PDPAConsents)[] = [
	"consent_personal_id",
	"consent_contact_info",
	"consent_photo_video",
	"consent_third_party",
	"consent_international_transfer",
	"consent_data_retention",
	"acknowledge_privacy_policy",
];

export type PreferredDateCompetitor =
	| "both_with_beat"
	| "both_no_beat"
	| "sat_with_beat"
	| "sat_only"
	| "sun_only";

export const PREFERRED_DATE_LABELS: Record<PreferredDateCompetitor, string> = {
	both_with_beat: "ทั้งสองวัน (ร่วม Beat the Pro)",
	both_no_beat: "ทั้งสองวัน (ไม่ร่วม Beat the Pro)",
	sat_with_beat: "วันเสาร์ (ร่วม Beat the Pro)",
	sat_only: "วันเสาร์เท่านั้น",
	sun_only: "วันอาทิตย์เท่านั้น",
};

export type Role = "assistant" | "admin" | "super_admin";

export type SessionData = {
	role: Role;
	tournamentId: string;
};
