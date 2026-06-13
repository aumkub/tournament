export const ATTENDEE_EMAIL_TEMPLATE = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <tr>
            <td style="background:#cc785c;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-family:'Noto Sans Thai','Open Sans',sans-serif;font-size:24px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;">
                {{tournament_name}}
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">ผู้ชม / Spectator</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:16px;color:#141413;font-weight:600;">
                สวัสดี {{registrant_name}},
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#3d3d3a;line-height:1.6;">
                การลงทะเบียน{{registration_type}}เสร็จสมบูรณ์แล้ว
                กรุณาแสดง QR Code นี้ที่ประตูเข้างานในวันที่ท่านเลือก
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:24px;background:#faf9f5;border-radius:12px;border:1px dashed #e6dfd8;">
                    <p style="margin:0 0 16px;font-size:13px;color:#6c6a64;font-weight:500;letter-spacing:0.5px;">QR CODE สำหรับเช็คอิน</p>
                    {{qr_code_image}}
                    <p style="margin:16px 0 0;font-size:12px;color:#8e8b82;">รหัส: {{submission_id}}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <!-- Name + Phone -->
                <tr>
                  <td width="50%" style="padding:12px 16px;background:#faf9f5;border-radius:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6c6a64;font-weight:500;">ชื่อ-นามสกุล</p>
                    <p style="margin:0;font-size:15px;color:#141413;">{{registrant_name}}</p>
                  </td>
                  <td style="padding:4px;"></td>
                  <td width="50%" style="padding:12px 16px;background:#faf9f5;border-radius:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6c6a64;font-weight:500;">เบอร์โทร</p>
                    <p style="margin:0;font-size:15px;color:#141413;">{{phone}}</p>
                  </td>
                </tr>
                <tr><td colspan="3" height="8"></td></tr>

                <!-- Attendance days (full width) -->
                <tr>
                  <td colspan="3" style="padding:12px 16px;background:#faf9f5;border-radius:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6c6a64;font-weight:500;">วันที่เข้าชม</p>
                    <p style="margin:0;font-size:15px;color:#141413;">{{attendance_days}}</p>
                  </td>
                </tr>
                <tr><td colspan="3" height="8"></td></tr>

                <!-- Check-in window -->
                <tr>
                  <td width="50%" style="padding:12px 16px;background:#faf9f5;border-radius:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6c6a64;font-weight:500;">เปิดเช็คอิน</p>
                    <p style="margin:0;font-size:15px;color:#141413;">{{checkin_open_date}}</p>
                  </td>
                  <td style="padding:4px;"></td>
                  <td width="50%" style="padding:12px 16px;background:#faf9f5;border-radius:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6c6a64;font-weight:500;">ปิดเช็คอิน</p>
                    <p style="margin:0;font-size:15px;color:#141413;">{{checkin_close_date}}</p>
                  </td>
                </tr>
              </table>

              <hr style="margin:28px 0;border:none;border-top:1px solid #e6dfd8;" />
              <p style="margin:0;font-size:13px;color:#6c6a64;line-height:1.6;">
                หากมีข้อสงสัย กรุณาติดต่อผู้จัดงาน อีเมลนี้สร้างโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#181715;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;color:#a09d96;">{{tournament_name}}</p>
              <p style="margin:0;font-size:11px;color:#8e8b82;">All Thailand Registration System &bull; Powered by Cloudflare Workers</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
`;
