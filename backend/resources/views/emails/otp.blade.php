<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset Code</title>
</head>
<body style="margin:0;padding:0;background:#F7FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFC;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#19405F;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:0.5px;">CommuTech</p>
              <p style="margin:6px 0 0;font-size:13px;color:#93C5D0;font-weight:600;">Smart Civic Reporting</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:#0F172A;">Hello, {{ $userName }}</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748B;line-height:22px;">
                CommuTech received a request to reset your account password. Use the code below to continue. This code expires in <strong>10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <div style="display:inline-block;background:#EAF1F7;border:2px dashed #19405F;border-radius:16px;padding:20px 40px;">
                      <p style="margin:0;font-size:42px;font-weight:900;color:#19405F;letter-spacing:10px;">{{ $otp }}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#64748B;line-height:20px;">
                Enter this code in the CommuTech app to reset your password. Do not share it with anyone.
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;line-height:20px;">
                If you did not request a password reset, you can safely ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F7FAFC;border-top:1px solid #E2E8F0;padding:18px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">
                &copy; {{ date('Y') }} CommuTech &mdash; Beirut, Lebanon
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
