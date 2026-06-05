<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SLA Breach Alert</title>
</head>
<body style="margin:0;padding:0;background:#F7FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFC;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#19405F;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">CommuTech</p>
              <p style="margin:6px 0 0;font-size:13px;color:#93C5D0;font-weight:600;">SLA Breach Alert</p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:#FEF2F2;border-bottom:1px solid #FECACA;padding:14px 32px;text-align:center;">
              <p style="margin:0;font-size:14px;font-weight:800;color:#B91C1C;">
                ⏰ {{ $issues->count() }} report{{ $issues->count() > 1 ? 's have' : ' has' }} exceeded the resolution deadline
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 20px;font-size:14px;color:#64748B;line-height:22px;">
                The following reports have breached their SLA and require immediate attention:
              </p>

              @foreach ($issues as $issue)
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFC;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:15px;font-weight:900;color:#0F172A;">{{ $issue->title }}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#64748B;">
                      {{ $issue->category }} &bull; {{ $issue->location }}
                    </p>
                    <p style="margin:6px 0 0;font-size:12px;">
                      <span style="background:{{ $issue->priority === 'critical' ? '#FEE2E2' : ($issue->priority === 'high' ? '#FEF3C7' : '#EFF6FF') }};color:{{ $issue->priority === 'critical' ? '#B91C1C' : ($issue->priority === 'high' ? '#92400E' : '#1D4ED8') }};font-weight:800;padding:2px 8px;border-radius:6px;">
                        {{ strtoupper($issue->priority) }}
                      </span>
                      &nbsp;
                      <span style="color:#94A3B8;font-size:11px;">Due: {{ $issue->due_at?->format('d M Y, H:i') }}</span>
                    </p>
                  </td>
                </tr>
              </table>
              @endforeach

              <p style="margin:20px 0 0;font-size:13px;color:#64748B;line-height:20px;">
                Log in to the CommuTech admin dashboard to reassign or update these reports.
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
