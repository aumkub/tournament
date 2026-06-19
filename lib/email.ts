interface SendEmailOptions {
	to: string | string[];
	from?: string | { email: string; name?: string };
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
}

interface SendEmailResult {
	messageId?: string;
}

export function renderEmailTemplate(
	template: string,
	vars: Record<string, string>,
): string {
	let html = template;
	for (const [key, value] of Object.entries(vars)) {
		html = html.replaceAll(`{{${key}}}`, value);
	}
	return html;
}

/**
 * Wraps a rendered email body HTML into a full email document.
 */
export function wrapEmailBody(bodyHtml: string): string {
	return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Open Sans','Noto Sans Thai Looped',sans-serif;-webkit-font-smoothing:antialiased;font-size:16px;line-height:1.7;">
${bodyHtml}
</body>
</html>`;
}

export function htmlToPlainText(html: string): string {
	return html
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function resolveFromAddress(env: Env): string {
	return env.EMAIL_FROM || "welcome@gooddrive.golf";
}

function resolveFromName(env: Env, override?: string): string {
	return override || env.EMAIL_FROM_NAME || "GoodDrive Golf";
}

export async function sendEmail(
	env: Env,
	options: {
		to: string;
		subject: string;
		html: string;
		text?: string;
		fromName?: string;
	},
): Promise<SendEmailResult> {
	if (!env.EMAIL) {
		throw new Error("Email binding not configured");
	}

	const payload: SendEmailOptions = {
		to: options.to,
		from: {
			email: resolveFromAddress(env),
			name: resolveFromName(env, options.fromName),
		},
		subject: options.subject,
		html: options.html,
		text: options.text ?? htmlToPlainText(options.html),
	};

	const response = await (env.EMAIL as SendEmail & {
		send(message: SendEmailOptions): Promise<SendEmailResult>;
	}).send(payload);

	return response ?? {};
}

export async function enqueueEmail(
	env: Env,
	payload: { registrationId: string; tournamentId: string },
): Promise<void> {
	await env.EMAIL_QUEUE.send(payload);
}

/**
 * Default email body template — just the <body> content, NOT a full HTML document.
 */
export const DEFAULT_EMAIL_BODY = `
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 0;">
    <tr>
      <td align="center">
        <!-- Main card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Coral header bar -->
          <tr>
            <td style="background:#cc785c;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-family:'Noto Sans Thai','Open Sans',sans-serif;font-size:24px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;">
                {{tournament_name}}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:16px;color:#141413;font-weight:600;">
                สวัสดี {{registrant_name}},
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#3d3d3a;line-height:1.6;">
                การลงทะเบียน{{registration_type}}เสร็จสมบูรณ์
                กรุณาแสดง QR Code ด้านล่างนี้เมื่อถึงวันเช็คอิน
              </p>

              <!-- QR Code section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:24px;background:#faf9f5;border-radius:12px;border:1px dashed #e6dfd8;">
                    <p style="margin:0 0 16px;font-size:13px;color:#6c6a64;font-weight:500;letter-spacing:0.5px;">
                      QR CODE สำหรับเช็คอิน
                    </p>
                    {{qr_code_image}}
                    <p style="margin:16px 0 0;font-size:12px;color:#8e8b82;">
                      รหัส: {{submission_id}}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Info grid -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td width="50%" style="padding:12px 16px;background:#faf9f5;border-radius:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6c6a64;font-weight:500;">ประเภท</p>
                    <p style="margin:0;font-size:15px;color:#141413;">{{registration_type}}</p>
                  </td>
                  <td style="padding:4px;"></td>
                  <td width="50%" style="padding:12px 16px;background:#faf9f5;border-radius:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6c6a64;font-weight:500;">วันที่ต้องการเข้าร่วม</p>
                    <p style="margin:0;font-size:15px;color:#141413;">{{preferred_date}}</p>
                  </td>
                </tr>
                <tr><td colspan="3" height="8"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:#faf9f5;border-radius:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6c6a64;font-weight:500;">เปิดเช็คอิน</p>
                    <p style="margin:0;font-size:15px;color:#141413;">{{checkin_open_date}}</p>
                  </td>
                  <td></td>
                  <td style="padding:12px 16px;background:#faf9f5;border-radius:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6c6a64;font-weight:500;">ปิดเช็คอิน</p>
                    <p style="margin:0;font-size:15px;color:#141413;">{{checkin_close_date}}</p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="margin:28px 0;border:none;border-top:1px solid #e6dfd8;" />

              <!-- Footer note -->
              <p style="margin:0;font-size:13px;color:#6c6a64;line-height:1.6;">
                หากมีข้อสงสัย กรุณาติดต่อผู้จัดงาน
                อีเมลฉบับนี้สร้างโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ
              </p>
            </td>
          </tr>

          <!-- Bottom bar -->
          <tr>
            <td style="background:#181715;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;color:#a09d96;">
                {{tournament_name}}
              </p>
              <p style="margin:0;font-size:11px;color:#8e8b82;">
                Tournament Registration System &bull; Powered by Cloudflare Workers
              </p>
            </td>
          </tr>

        </table>
        <!-- /Main card -->
      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->
`;
