import { renderEmailTemplate, wrapEmailBody, sendEmail, htmlToPlainText } from "./email";
import { generateQRCodeImageHTML } from "./qrcode";
import { getDefaultEmailTemplate } from "./email-templates/index";
import { FORM_CONFIGS } from "./form-configs/index";

const TYPE_LABELS: Record<string, string> = {
	competitor: "ผู้เข้าแข่งขัน",
	attendee: "ผู้ชม",
	youth: "เยาวชน",
};

function getTypeLabel(regType: string): string {
	return FORM_CONFIGS[regType]?.label.th || TYPE_LABELS[regType] || regType;
}

function parseJsonRecord(raw: unknown): Record<string, string> {
	try {
		return JSON.parse((raw as string) || "{}") as Record<string, string>;
	} catch {
		return {};
	}
}

function extractRegistrantName(dataJson: Record<string, unknown>): string {
	return (
		(dataJson.child_full_name_th as string) ||
		(dataJson.full_name_th as string) ||
		(dataJson.full_name as string) ||
		(dataJson.full_name_en as string) ||
		"ผู้ลงทะเบียน"
	);
}

function buildSuccessMessageBlock(regType: string, successMessagesJson: unknown): string {
	const successMessages = parseJsonRecord(successMessagesJson);
	const rawSuccessMsg = (successMessages[regType] || "").trim();
	if (!rawSuccessMsg) return "";
	return `<div style="margin-top:28px;margin-bottom:0;padding:16px 20px;background:#fef9ec;border-left:4px solid #cc785c;border-radius:6px;"><p style="margin:0;font-size:14px;color:#3d3d3a;line-height:1.7;white-space:pre-wrap;">${rawSuccessMsg.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p></div>`;
}

function buildTemplateVars(
	tournament: Record<string, unknown>,
	regType: string,
	dataJson: Record<string, unknown>,
	registrationId: string,
): Record<string, string> {
	const youthPath = dataJson.youth_path as string | undefined;
	const youthPathLabel = youthPath === "beat_pro" ? "Beat the Pro (Path B)" : "ทั่วไป (Path A)";
	const attendanceDays = Array.isArray(dataJson.attendance_days)
		? (dataJson.attendance_days as string[]).join(", ")
		: (dataJson.attendance_days as string) || "-";
	const name = extractRegistrantName(dataJson);

	return {
		registrant_name: name,
		tournament_name: tournament.name as string,
		registration_type: getTypeLabel(regType),
		phone: (dataJson.phone as string) || (dataJson.parent_phone as string) || "-",
		preferred_date: (dataJson.preferred_date as string) || "-",
		child_name: (dataJson.child_full_name_th as string) || (dataJson.child_full_name_en as string) || name,
		child_name_en: (dataJson.child_full_name_en as string) || "-",
		youth_path_label: youthPathLabel,
		attendance_days: attendanceDays,
		parent_full_name: (dataJson.parent_full_name as string) || "-",
		parent_phone: (dataJson.parent_phone as string) || "-",
		checkin_open_date: new Date(tournament.checkin_open_at as number).toLocaleString("th-TH", {
			timeZone: "Asia/Bangkok",
		}),
		checkin_close_date: new Date(tournament.checkin_close_at as number).toLocaleString("th-TH", {
			timeZone: "Asia/Bangkok",
		}),
		qr_code_image: generateQRCodeImageHTML(registrationId),
		submission_id: registrationId,
		success_message_block: buildSuccessMessageBlock(regType, tournament.success_messages_json),
	};
}

function resolveBodyTemplate(
	tournament: Record<string, unknown>,
	regType: string,
	templateOverride?: string,
): string {
	if (templateOverride?.trim()) return templateOverride;
	const emailTemplates = parseJsonRecord(tournament.email_templates_json);
	return (
		emailTemplates[regType] ||
		(tournament.email_template_html as string) ||
		getDefaultEmailTemplate(regType)
	);
}

export function buildRegistrationEmailHtml(
	tournament: Record<string, unknown>,
	regType: string,
	dataJson: Record<string, unknown>,
	registrationId: string,
	templateOverride?: string,
): string {
	const bodyTemplate = resolveBodyTemplate(tournament, regType, templateOverride);
	const renderedBody = renderEmailTemplate(
		bodyTemplate,
		buildTemplateVars(tournament, regType, dataJson, registrationId),
	);
	return wrapEmailBody(renderedBody);
}

export function getTestEmailVars(
	tournament: Record<string, unknown>,
	formType: string,
): Record<string, string> {
	const tournamentName = (tournament.name as string) || "Tournament Name";
	const checkinOpen = tournament.checkin_open_at
		? new Date(tournament.checkin_open_at as number).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
		: "15 มี.ค. 68, 08:00";
	const checkinClose = tournament.checkin_close_at
		? new Date(tournament.checkin_close_at as number).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
		: "15 มี.ค. 68, 17:00";
	const qrPreview =
		'<div style="width:200px;height:200px;background:#f0f0f0;border:2px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;margin:0 auto;">QR Code Preview</div>';

	if (formType === "youth") {
		return {
			registrant_name: "พ่อแม่ผู้ปกครอง",
			tournament_name: tournamentName,
			registration_type: getTypeLabel("youth"),
			child_name: "น้องกอล์ฟ",
			child_name_en: "Golf Junior",
			youth_path_label: "ทั่วไป (Path A)",
			attendance_days: "วันเสาร์, วันอาทิตย์",
			parent_full_name: "สมชาย ใจดี",
			parent_phone: "081-234-5678",
			checkin_open_date: checkinOpen,
			checkin_close_date: checkinClose,
			qr_code_image: qrPreview,
			submission_id: "PREVIEW",
			success_message_block: buildSuccessMessageBlock("youth", tournament.success_messages_json),
		};
	}

	return {
		registrant_name: "สมชาย ใจดี",
		tournament_name: tournamentName,
		registration_type: getTypeLabel(formType),
		phone: "081-234-5678",
		attendance_days: "วันเสาร์, วันอาทิตย์",
		checkin_open_date: checkinOpen,
		checkin_close_date: checkinClose,
		qr_code_image: qrPreview,
		submission_id: "PREVIEW",
		success_message_block: buildSuccessMessageBlock(formType, tournament.success_messages_json),
	};
}

export function buildTestEmailHtml(
	tournament: Record<string, unknown>,
	formType: string,
	templateOverride?: string,
): string {
	const bodyTemplate = resolveBodyTemplate(tournament, formType, templateOverride);
	const renderedBody = renderEmailTemplate(bodyTemplate, getTestEmailVars(tournament, formType));
	return wrapEmailBody(renderedBody);
}

export async function sendRegistrationEmail(
	env: Env,
	tournament: Record<string, unknown>,
	reg: {
		id: string;
		type: string;
		email: string;
		data_json: string;
	},
): Promise<void> {
	const dataJson = JSON.parse(reg.data_json) as Record<string, unknown>;
	const html = buildRegistrationEmailHtml(tournament, reg.type, dataJson, reg.id);
	const tournamentName = tournament.name as string;

	await sendEmail(env, {
		to: reg.email,
		subject: `[${tournamentName}] QR Code สำหรับเช็คอิน`,
		html,
		text: htmlToPlainText(html),
		fromName: tournamentName,
	});
}

export async function sendTestEmail(
	env: Env,
	tournament: Record<string, unknown>,
	formType: string,
	to: string,
	templateOverride?: string,
): Promise<{ messageId?: string }> {
	const html = buildTestEmailHtml(tournament, formType, templateOverride);
	const tournamentName = tournament.name as string;

	return sendEmail(env, {
		to,
		subject: `[${tournamentName}] ทดสอบอีเมล — ${getTypeLabel(formType)}`,
		html,
		text: htmlToPlainText(html),
		fromName: tournamentName,
	});
}
