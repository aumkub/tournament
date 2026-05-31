import type { Env } from "../../types/bindings";

interface EmailPayload {
	to: string;
	subject: string;
	html: string;
}

export async function enqueueEmail(env: Env, payload: { registrationId: string; tournamentId: string }): Promise<void> {
	await env.EMAIL_QUEUE.send(payload);
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
 * The body content is what the user edits in settings.
 * This wrapper adds proper email HTML structure.
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

/**
 * Default email body template — just the <body> content, NOT a full HTML document.
 * The wrapEmailBody() function will add the outer structure when sending.
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
