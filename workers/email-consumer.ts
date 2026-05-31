// Email consumer — processes email queue jobs
import { generateQRCodeImageHTML } from "../lib/qrcode";
import { renderEmailTemplate, wrapEmailBody, DEFAULT_EMAIL_BODY } from "../lib/email";

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
				const name = dataJson.full_name_th || dataJson.full_name_en || "ผู้ลงทะเบียน";
				const typeLabel =
					(reg.type as string) === "competitor"
						? "ผู้เข้าแข่งขัน"
						: "ผู้เข้าร่วมงาน";

				// Use tournament template or default body
				const bodyTemplate =
					(tournament.email_template_html as string) || DEFAULT_EMAIL_BODY;

				// Render variables into the body
				const renderedBody = renderEmailTemplate(bodyTemplate, {
					registrant_name: name,
					tournament_name: tournament.name as string,
					registration_type: typeLabel,
					preferred_date: dataJson.preferred_date || "-",
					checkin_open_date: new Date(
						tournament.checkin_open_at as number,
					).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
					checkin_close_date: new Date(
						tournament.checkin_close_at as number,
					).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
					qr_code_image: generateQRCodeImageHTML(reg.qr_code_token as string),
					submission_id: registrationId,
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
