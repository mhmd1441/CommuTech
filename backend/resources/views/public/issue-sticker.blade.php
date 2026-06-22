<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Print Sticker — CommuTech</title>
    <style>
        :root {
            --bg: #08090b;
            --bg-2: #0d0f12;
            --panel: #15171b;
            --line: #262a30;
            --text: #f5f7fa;
            --muted: #8b93a1;
            --muted-2: #5d6573;
            --navy: #1291ff;
        }

        * { box-sizing: border-box; }

        html, body {
            margin: 0;
            min-height: 100vh;
            background: radial-gradient(circle at 50% 0%, var(--bg-2), var(--bg) 60%);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, ui-sans-serif, system-ui, sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        .page {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            padding: 28px 18px;
        }

        .topbar {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 22px;
        }

        .brand-mark {
            width: 30px;
            height: 30px;
            border-radius: 9px;
            background: linear-gradient(145deg, var(--navy), #0a63c2);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 13px;
            letter-spacing: -0.02em;
            box-shadow: 0 4px 14px rgba(18, 145, 255, 0.35);
        }

        .brand-name {
            font-size: 15px;
            font-weight: 700;
            letter-spacing: -0.01em;
        }

        .hint {
            max-width: 360px;
            text-align: center;
            font-size: 13px;
            color: var(--muted);
            margin: 0 0 22px;
            line-height: 1.5;
        }

        /* The actual sticker — white background, deliberately separate from
           the dark site theme, since this is what gets printed on label
           stock and needs to be ink-economical and high-contrast. */
        .sticker {
            width: 280px;
            background: #ffffff;
            color: #0f172a;
            border-radius: 14px;
            padding: 22px 20px 24px;
            text-align: center;
            box-shadow: 0 20px 50px -20px rgba(0, 0, 0, 0.6);
        }

        .sticker img {
            width: 100%;
            height: auto;
            display: block;
            margin-bottom: 14px;
        }

        .scan-label {
            margin: 0 0 6px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #64748b;
        }

        .brand-line {
            margin: 0 0 4px;
            font-size: 19px;
            font-weight: 800;
            letter-spacing: -0.01em;
            color: #0f172a;
        }

        .sub-line {
            margin: 0;
            font-size: 12px;
            color: #64748b;
        }

        .print-btn {
            margin-top: 24px;
            height: 46px;
            padding: 0 24px;
            border-radius: 12px;
            background: var(--navy);
            color: #fff;
            border: none;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
        }

        .footer {
            margin-top: 18px;
            font-size: 12px;
            color: var(--muted-2);
            text-align: center;
        }

        @media print {
            .topbar, .hint, .print-btn, .footer {
                display: none !important;
            }

            html, body {
                background: #fff !important;
            }

            .page {
                padding: 0;
                min-height: 0;
            }

            .sticker {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="topbar">
            <div class="brand-mark">CT</div>
            <div class="brand-name">CommuTech</div>
        </div>

        <p class="hint">This is the sticker that gets printed and placed near the reported issue. Click Print, then choose your label/sticker paper size in the printer dialog.</p>

        <div class="sticker" id="sticker">
            <img src="{{ $qrUrl }}" alt="QR code linking to this issue's public status page">
            <p class="scan-label">Scan to check status</p>
            <p class="brand-line">CommuTech</p>
            <p class="sub-line">Civic Issue Reporting &middot; Hotline 1244</p>
        </div>

        <button type="button" class="print-btn" onclick="window.print()">Print Sticker</button>

        <div class="footer">CommuTech &middot; Civic Issue Reporting</div>
    </div>
</body>
</html>
