<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Report Under Investigation</title>
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
              <p style="margin:6px 0 0;font-size:13px;color:#93C5D0;font-weight:600;">Admin Alert</p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:#FEF3C7;border-bottom:1px solid #F59E0B;padding:14px 32px;text-align:center;">
              <p style="margin:0;font-size:14px;font-weight:800;color:#92400E;">⚠️ A report has been moved to Under Investigation</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 24px;font-size:14px;color:#64748B;line-height:22px;">
                A citizen has challenged a worker's resolution. This report requires your review and action.
              </p>

              <!-- Report Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFC;border-radius:14px;border:1px solid #E2E8F0;padding:0;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #E2E8F0;">
                    <p style="margin:0;font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Report</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:900;color:#0F172A;">{{ $issue->title }}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #E2E8F0;">
                    <p style="margin:0;font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Category</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0F172A;">{{ $issue->category }}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #E2E8F0;">
                    <p style="margin:0;font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Location</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0F172A;">{{ $issue->location }}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Reported by</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0F172A;">{{ $issue->user?->name ?? 'Unknown' }}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#64748B;line-height:20px;">
                Log in to the CommuTech admin dashboard to review this report and take action.
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
