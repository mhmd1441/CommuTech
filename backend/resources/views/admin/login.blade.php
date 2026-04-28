<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>CommuTech Admin Login</title>
    <style>
        :root {
            --bg: #050607;
            --panel: #151719;
            --panel-2: #1c1f22;
            --text: #f7fafc;
            --muted: #8d98a8;
            --line: #2a2f35;
            --blue: #1291ff;
            --green: #42d392;
            --orange: #f4a340;
            --red: #ef5350;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: var(--bg);
            color: var(--text);
            display: grid;
            place-items: center;
            padding: 24px;
        }

        .shell {
            width: min(980px, 100%);
            display: grid;
            grid-template-columns: 1fr 420px;
            border: 1px solid var(--line);
            background: #090a0b;
            min-height: 600px;
        }

        .brand {
            padding: 44px;
            border-right: 1px solid var(--line);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .brand-mark {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 20%, #ffffff, #73efff 30%, #7d5cff 66%, #121417 100%);
        }

        h1 {
            font-size: 44px;
            line-height: 1;
            margin: 30px 0 12px;
        }

        .brand p {
            color: var(--muted);
            max-width: 420px;
            line-height: 1.7;
            margin: 0;
        }

        .mini-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-top: 34px;
        }

        .mini-card {
            border: 1px solid var(--line);
            background: var(--panel);
            padding: 14px;
            min-height: 92px;
        }

        .mini-card strong {
            display: block;
            font-size: 22px;
        }

        .mini-card span {
            display: block;
            margin-top: 8px;
            color: var(--muted);
            font-size: 12px;
            font-weight: 700;
        }

        .form-panel {
            padding: 44px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .eyebrow {
            color: var(--green);
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .12em;
        }

        h2 {
            margin: 12px 0 8px;
            font-size: 28px;
        }

        .hint {
            color: var(--muted);
            margin: 0 0 24px;
            line-height: 1.5;
        }

        label {
            display: block;
            color: var(--muted);
            font-size: 13px;
            font-weight: 800;
            margin: 16px 0 8px;
        }

        input {
            width: 100%;
            height: 48px;
            border: 1px solid var(--line);
            background: var(--panel);
            color: var(--text);
            padding: 0 14px;
            outline: none;
        }

        input:focus {
            border-color: var(--blue);
        }

        .remember {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 16px 0;
            color: var(--muted);
            font-weight: 700;
            font-size: 13px;
        }

        .remember input {
            width: 16px;
            height: 16px;
        }

        button {
            width: 100%;
            height: 50px;
            border: 0;
            background: var(--blue);
            color: white;
            font-weight: 900;
            cursor: pointer;
        }

        .error {
            margin: 0 0 16px;
            border: 1px solid rgba(239, 83, 80, .5);
            background: rgba(239, 83, 80, .1);
            color: #ffb4b2;
            padding: 12px;
            font-weight: 700;
            font-size: 13px;
        }

        .footer {
            color: var(--muted);
            font-size: 12px;
            margin-top: 22px;
            line-height: 1.6;
        }

        @media (max-width: 820px) {
            .shell {
                grid-template-columns: 1fr;
            }

            .brand {
                border-right: 0;
                border-bottom: 1px solid var(--line);
            }
        }
    </style>
</head>
<body>
    <main class="shell">
        <section class="brand">
            <div>
                <div class="brand-mark"></div>
                <h1>CommuTech Admin</h1>
                <p>Private operations dashboard for reviewing reports, monitoring community activity, and coordinating civic response work.</p>
                <div class="mini-grid">
                    <div class="mini-card">
                        <strong>24/7</strong>
                        <span>Monitoring</span>
                    </div>
                    <div class="mini-card">
                        <strong>Live</strong>
                        <span>Reports</span>
                    </div>
                    <div class="mini-card">
                        <strong>Role</strong>
                        <span>Protected</span>
                    </div>
                </div>
            </div>
            <p class="footer">Only admin accounts can enter. Citizens and workers continue using the mobile app.</p>
        </section>

        <section class="form-panel">
            <div class="eyebrow">Secure Access</div>
            <h2>Sign in</h2>
            <p class="hint">Use the admin account you created from the API.</p>

            @if ($errors->any())
                <div class="error">{{ $errors->first() }}</div>
            @endif

            <form method="POST" action="{{ route('admin.login.store') }}">
                @csrf
                <label for="email">Email</label>
                <input id="email" name="email" type="email" value="{{ old('email') }}" autocomplete="email" required>

                <label for="password">Password</label>
                <input id="password" name="password" type="password" autocomplete="current-password" required>

                <label class="remember">
                    <input name="remember" type="checkbox" value="1">
                    Remember this browser
                </label>

                <button type="submit">Open Dashboard</button>
            </form>
        </section>
    </main>
</body>
</html>
