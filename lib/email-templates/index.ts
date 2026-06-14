import { ATTENDEE_EMAIL_TEMPLATE } from "./attendee";
import { YOUTH_EMAIL_TEMPLATE } from "./youth";

export { ATTENDEE_EMAIL_TEMPLATE } from "./attendee";
export { YOUTH_EMAIL_TEMPLATE } from "./youth";

export const EMAIL_TEMPLATE_DEFAULTS: Record<string, string> = {
	attendee: ATTENDEE_EMAIL_TEMPLATE,
	youth: YOUTH_EMAIL_TEMPLATE,
};

export function getDefaultEmailTemplate(type: string): string {
	return EMAIL_TEMPLATE_DEFAULTS[type] ?? ATTENDEE_EMAIL_TEMPLATE;
}

export const EMAIL_TEMPLATE_LABELS: Record<string, { th: string; en: string }> = {
	attendee: { th: "ผู้ชม", en: "Attendee" },
	youth: { th: "เยาวชน", en: "Youth" },
};

export const EMAIL_TEMPLATE_VARS: Record<string, string[]> = {
	attendee: ["registrant_name", "tournament_name", "registration_type", "phone", "attendance_days", "checkin_open_date", "checkin_close_date", "qr_code_image", "submission_id", "success_message_block"],
	youth: ["registrant_name", "tournament_name", "registration_type", "child_name", "child_name_en", "youth_path_label", "attendance_days", "parent_full_name", "parent_phone", "checkin_open_date", "checkin_close_date", "qr_code_image", "submission_id", "success_message_block"],
};
