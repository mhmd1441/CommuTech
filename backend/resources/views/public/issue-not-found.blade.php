<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Issue Not Found — CommuTech</title>
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

        .main {
            flex: 1;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .card {
            width: 100%;
            max-width: 380px;
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 22px;
            padding: 36px 26px;
            text-align: center;
            box-shadow: 0 20px 50px -20px rgba(0, 0, 0, 0.6);
        }

        .icon-wrap {
            width: 52px;
            height: 52px;
            margin: 0 auto 16px;
            border-radius: 14px;
            background: rgba(139, 147, 161, 0.12);
            color: var(--muted);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        h1 {
            font-size: 17px;
            font-weight: 800;
            margin: 0 0 8px;
        }

        p {
            color: var(--muted);
            font-size: 13.5px;
            line-height: 1.5;
            margin: 0;
        }

        .footer {
            margin-top: 22px;
            font-size: 12px;
            color: var(--muted-2);
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="topbar">
            <div class="brand-mark">CT</div>
            <div class="brand-name">CommuTech</div>
        </div>
        <div class="main">
            <div class="card">
                <div class="icon-wrap">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>
                </div>
                <h1>Issue Not Found</h1>
                <p>This report doesn't exist or isn't available for public viewing yet.</p>
            </div>
        </div>
        <div class="footer">CommuTech &middot; Civic Issue Reporting</div>
    </div>
</body>
</html>
