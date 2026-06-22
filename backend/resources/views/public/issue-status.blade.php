<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Issue Status — CommuTech</title>
    <style>
        :root {
            --bg: #08090b;
            --bg-2: #0d0f12;
            --panel: #15171b;
            --panel-2: #1c1f24;
            --line: #262a30;
            --text: #f5f7fa;
            --muted: #8b93a1;
            --muted-2: #5d6573;
            --navy: #1291ff;
            --green: #3dd68c;
            --green-bg: rgba(61, 214, 140, 0.12);
            --amber: #f5b94d;
            --amber-bg: rgba(245, 185, 77, 0.12);
            --blue-bg: rgba(18, 145, 255, 0.12);
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
            padding: 28px 18px 22px;
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
            color: var(--text);
        }

        .main {
            width: 100%;
            display: flex;
            justify-content: center;
            flex: 1 0 auto;
        }

        .card {
            width: 100%;
            max-width: 400px;
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 22px;
            overflow: hidden;
            box-shadow: 0 20px 50px -20px rgba(0, 0, 0, 0.6);
            align-self: flex-start;
        }

        .hero {
            position: relative;
            width: 100%;
            height: 220px;
            background: var(--panel-2);
        }

        .hero img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .hero-fallback {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--muted-2);
            font-size: 13px;
            gap: 6px;
        }

        .chip {
            position: absolute;
            top: 14px;
            right: 14px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 12.5px;
            font-weight: 700;
            backdrop-filter: blur(6px);
        }

        .chip::before {
            content: "";
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
        }

        .chip.success { background: var(--green-bg); color: var(--green); }
        .chip.info { background: var(--blue-bg); color: var(--navy); }
        .chip.warning { background: var(--amber-bg); color: var(--amber); }

        .body {
            padding: 22px 22px 24px;
        }

        .eyebrow {
            margin: 0 0 4px;
            font-size: 12.5px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: var(--muted-2);
        }

        .title {
            margin: 0 0 18px;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.01em;
            line-height: 1.25;
        }

        .meta {
            margin: 0;
            border-top: 1px solid var(--line);
            padding-top: 14px;
        }

        .meta-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 0;
        }

        .meta-row dt {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            font-size: 13.5px;
            color: var(--muted);
            font-weight: 500;
        }

        .meta-row dd {
            margin: 0;
            font-size: 13.5px;
            font-weight: 700;
            color: var(--text);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .overdue-tag {
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 999px;
            background: var(--amber-bg);
            color: var(--amber);
        }

        .icon { flex-shrink: 0; opacity: 0.85; }

        .banner {
            margin-top: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 13px 14px;
            background: var(--green-bg);
            border: 1px solid rgba(61, 214, 140, 0.25);
            border-radius: 14px;
            font-size: 13.5px;
            font-weight: 600;
            color: #d7f7e6;
        }

        .banner svg { flex-shrink: 0; color: var(--green); }

        .cta {
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            background: var(--panel-2);
            border-radius: 14px;
        }

        .cta-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            background: var(--blue-bg);
            color: var(--navy);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .cta-text {
            font-size: 13px;
            line-height: 1.4;
        }

        .cta-text strong {
            display: block;
            font-size: 13.5px;
            color: var(--text);
            font-weight: 700;
        }

        .cta-text span {
            color: var(--muted);
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
                <div class="hero">
                    @if($imageUrl)
                        <img src="{{ $imageUrl }}" alt="Reported issue photo"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="hero-fallback" style="display:none;">Photo unavailable</div>
                    @else
                        <div class="hero-fallback">No photo available</div>
                    @endif
                    <span class="chip {{ $statusTone }}">{{ $statusLabel }}</span>
                </div>

                <div class="body">
                    <p class="eyebrow">{{ $municipality ?? 'Area not specified' }}</p>
                    <h1 class="title">{{ $category }}</h1>

                    <dl class="meta">
                        <div class="meta-row">
                            <dt>
                                <svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                Estimated resolution
                            </dt>
                            <dd>
                                {{ $dueAt ? $dueAt->format('M j, Y') : 'Not yet scheduled' }}
                                @if($isOverdue)
                                    <span class="overdue-tag">Overdue</span>
                                @endif
                            </dd>
                        </div>
                    </dl>

                    <div class="banner">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>This issue has already been reported.</span>
                    </div>

                    <div class="cta">
                        <div class="cta-icon">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l9-7-9-7-9 7 9 7z"/><path d="M12 19v-7"/></svg>
                        </div>
                        <div class="cta-text">
                            <strong>Spotted a different issue?</strong>
                            <span>Open the CommuTech app to report it.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">CommuTech &middot; Civic Issue Reporting</div>
    </div>
</body>
</html>
