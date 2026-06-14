// Email consumer — processes email queue jobs
import { generateQRCodeImageHTML } from "../lib/qrcode";
import { renderEmailTemplate, wrapEmailBody } from "../lib/email";
import { getDefaultEmailTemplate } from "../lib/email-templates/index";

interface EmailQueueMessage {
	registrationId: string;
	tournamentId: string;
}

export default {
	async queue(
		batch: MessageBatch<EmailQueueMessage>,
		env: Env,
	): Promise<void> {
		for (const msg of batch.messages) {
			try {
				const { registrationId, tournamentId } = msg.body;

				// Fetch registration
				const reg = await env.DB.prepare(
					"SELECT * FROM registrations WHERE id = ?",
				)
					.bind(registrationId)
					.first();
				if (!reg) continue;

				// Fetch tournament
				const tournament = await env.DB.prepare(
					"SELECT * FROM tournaments WHERE id = ?",
				)
					.bind(tournamentId)
					.first();
				if (!tournament) continue;

				const dataJson = JSON.parse(reg.data_json as string);
				const regType = reg.type as string;
				const name =
					dataJson.child_full_name_th ||
					dataJson.full_name_th ||
					dataJson.full_name ||
					dataJson.full_name_en ||
					"ผู้ลงทะเบียน";
				const TYPE_LABELS: Record<string, string> = {
					competitor: "ผู้เข้าแข่งขัน",
					attendee: "ผู้ชม",
					youth: "เยาวชน",
				};
				const typeLabel = TYPE_LABELS[regType] || regType;

				// Pick template: per-type override → legacy single template → file default
				let emailTemplates: Record<string, string> = {};
				try { emailTemplates = JSON.parse((tournament.email_templates_json as string) || "{}"); } catch { /* ignore */ }
				const bodyTemplate =
					emailTemplates[regType] ||
					(tournament.email_template_html as string) ||
					getDefaultEmailTemplate(regType);

				const youthPath = dataJson.youth_path as string | undefined;
				const youthPathLabel = youthPath === "beat_pro" ? "Beat the Pro (Path B)" : "ทั่วไป (Path A)";
				const attendanceDays = Array.isArray(dataJson.attendance_days)
					? (dataJson.attendance_days as string[]).join(", ")
					: (dataJson.attendance_days as string) || "-";

				let successMessages: Record<string, string> = {};
				try { successMessages = JSON.parse((tournament.success_messages_json as string) || "{}"); } catch { /* ignore */ }
				const rawSuccessMsg = (successMessages[regType] || "").trim();
				const successMessageBlock = rawSuccessMsg
					? `<div style="margin-top:28px;margin-bottom:0;padding:16px 20px;background:#fef9ec;border-left:4px solid #cc785c;border-radius:6px;"><p style="margin:0;font-size:14px;color:#3d3d3a;line-height:1.7;white-space:pre-wrap;">${rawSuccessMsg.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p></div>`
					: "";

				const renderedBody = renderEmailTemplate(bodyTemplate, {
					registrant_name: name,
					tournament_name: tournament.name as string,
					registration_type: typeLabel,
					phone: dataJson.phone || dataJson.parent_phone || "-",
					preferred_date: dataJson.preferred_date || "-",
					child_name: dataJson.child_full_name_th || dataJson.child_full_name_en || name,
					child_name_en: dataJson.child_full_name_en || "-",
					youth_path_label: youthPathLabel,
					attendance_days: attendanceDays,
					parent_full_name: dataJson.parent_full_name || "-",
					parent_phone: dataJson.parent_phone || "-",
					checkin_open_date: new Date(
						tournament.checkin_open_at as number,
					).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
					checkin_close_date: new Date(
						tournament.checkin_close_at as number,
					).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
					qr_code_image: generateQRCodeImageHTML(registrationId),
					submission_id: registrationId,
					success_message_block: successMessageBlock,
				});

				// Wrap body into full email HTML document
				const fullHtml = wrapEmailBody(renderedBody);

				// Send email via Cloudflare Email Service binding (if available)
				console.log(
					`Email would be sent to: ${reg.email}, subject: [${tournament.name}] QR Code`,
				);

				// If env.EMAIL binding is available:
				// await (env as any).EMAIL?.send({
				//   to: [{ email: reg.email as string, name }],
				//   from: { email: 'noreply@yourdomain.com', name: 'Tournament System' },
				//   subject: `[${tournament.name}] QR Code สำหรับเช็คอิน`,
				//   html: fullHtml,
				// });

				msg.ack();
			} catch (err) {
				console.error("Email queue error:", err);
				msg.retry({ delaySeconds: 60 });
			}
		}
	},
} satisfies ExportedHandler<Env, EmailQueueMessage>;
