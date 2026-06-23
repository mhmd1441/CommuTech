@extends('admin.panel')

@section('title', 'Chat — ' . $conversation->worker->name)

@section('page_header')
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <a href="{{ route('admin.chat.index') }}" style="color:var(--muted);text-decoration:none;font-size:13px;">← Messages</a>
        <span style="color:var(--line);">/</span>
        <h1 class="page-title" style="margin:0;">{{ $conversation->worker->name }}</h1>
        @if($conversation->status === 'archived')
            <span class="tag">Archived</span>
        @elseif($conversation->assigned_admin_id)
            <span class="tag blue">Handled by {{ $conversation->assignedAdmin?->name }}</span>
        @else
            <span class="tag orange">Unassigned</span>
        @endif
    </div>
@endsection

@section('page_actions')
    <div style="display:flex;gap:8px;align-items:center;">
        @if($conversation->assigned_admin_id !== $admin->id)
            <button onclick="takeOver()" id="takeOverBtn" class="button primary">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:5px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Take Over
            </button>
        @endif
        @if($conversation->status === 'open')
            <button onclick="archiveConv()" id="archiveBtn" class="button">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:5px;"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                Archive
            </button>
        @else
            <button onclick="unarchiveConv()" class="button">Unarchive</button>
        @endif
    </div>
@endsection

@section('content')
<div style="display:flex;flex-direction:column;height:calc(100vh - 180px);max-width:860px;">

    {{-- Message list --}}
    <div id="messageList"
         style="flex:1;overflow-y:auto;padding:24px 20px;display:flex;flex-direction:column;gap:14px;background:var(--bg);border:1px solid var(--line);border-bottom:none;">
        @foreach($messages as $msg)
            @php $isMine = $msg->sender_role === 'admin'; @endphp
            <div style="display:flex;flex-direction:column;max-width:72%;{{ $isMine ? 'align-self:flex-end;align-items:flex-end;' : 'align-self:flex-start;align-items:flex-start;' }}">
                @if(!$isMine)
                    <span style="font-size:11px;font-weight:700;color:var(--blue);margin-bottom:4px;padding-left:4px;">{{ $msg->sender->name }}</span>
                @endif
                @if($msg->issue_id)
                    <div style="display:inline-flex;align-items:center;gap:5px;background:{{ $isMine ? 'rgba(255,255,255,0.08)' : 'rgba(18,145,255,.1)' }};border:1px solid {{ $isMine ? 'rgba(255,255,255,.15)' : 'rgba(18,145,255,.25)' }};padding:4px 10px;margin-bottom:5px;font-size:11px;font-weight:700;color:{{ $isMine ? 'rgba(255,255,255,.75)' : '#9bd4ff' }};">
                        #{{ $msg->issue_id }} — {{ $msg->issue_title }}
                    </div>
                @endif
                <div style="background:{{ $isMine ? '#19405F' : 'var(--panel-2)' }};color:{{ $isMine ? '#fff' : 'var(--text)' }};padding:11px 15px;border:{{ $isMine ? '1px solid rgba(255,255,255,.1)' : '1px solid var(--line)' }};border-radius:{{ $isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px' }};font-size:14px;line-height:1.55;word-break:break-word;">
                    {{ $msg->body }}
                </div>
                <span style="font-size:10px;color:var(--muted);margin-top:4px;{{ $isMine ? 'padding-right:4px;' : 'padding-left:4px;' }}">
                    @if($isMine){{ $msg->sender->name }} · @endif{{ $msg->created_at->format('H:i') }}
                </span>
            </div>
        @endforeach
    </div>

    {{-- Input bar --}}
    @if($conversation->status === 'open')
        @if($canReply)
            <div style="background:var(--panel);border:1px solid var(--line);padding:12px 16px;">

                {{-- Tagged issue preview --}}
                <div id="taggedIssuePreview" style="display:none;align-items:center;gap:8px;background:rgba(18,145,255,.08);border:1px solid rgba(18,145,255,.25);padding:6px 12px;margin-bottom:8px;font-size:12px;color:#9bd4ff;font-weight:700;">
                    <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span id="taggedIssueLabel"></span>
                    <button onclick="clearTag()" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--muted);font-size:16px;line-height:1;padding:0 2px;">&times;</button>
                </div>

                {{-- Issue search dropdown --}}
                <div style="position:relative;margin-bottom:8px;">
                    <div id="issueSearchBox" style="display:none;border:1px solid var(--line);overflow:hidden;background:var(--panel-2);box-shadow:0 4px 20px rgba(0,0,0,.4);">
                        <input id="issueSearchInput" type="text" placeholder="Search by title or issue #..."
                            style="width:100%;border:none;border-bottom:1px solid var(--line);outline:none;padding:10px 14px;font-size:13px;box-sizing:border-box;"
                            oninput="searchIssues(this.value)" />
                        <div id="issueResults" style="max-height:200px;overflow-y:auto;"></div>
                    </div>
                </div>

                <div style="display:flex;gap:10px;align-items:flex-end;">
                    {{-- Tag button --}}
                    <button onclick="toggleIssueSearch()" id="tagBtn" title="Tag an issue" class="button"
                        style="height:44px;padding:0 14px;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:5px;">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                        Tag Issue
                    </button>
                    <textarea id="msgInput" rows="2"
                        style="flex:1;padding:10px 14px;font-size:14px;resize:none;min-height:44px;font-family:inherit;"
                        placeholder="Type a message..."
                        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage();}"></textarea>
                    <button onclick="sendMessage()" id="sendBtn" class="button primary"
                        style="height:44px;padding:0 20px;white-space:nowrap;display:flex;align-items:center;gap:6px;flex-shrink:0;">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        Send
                    </button>
                </div>
            </div>
        @else
            <div style="background:rgba(244,163,64,.08);border:1px solid rgba(244,163,64,.25);border-top:none;padding:14px 20px;font-size:13px;color:#ffd09a;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <span>Handled by <strong>{{ $conversation->assignedAdmin?->name }}</strong>. Take over to reply.</span>
                <button onclick="takeOver()" class="button primary" style="white-space:nowrap;">Take Over</button>
            </div>
        @endif
    @else
        <div style="background:var(--panel-2);border:1px solid var(--line);border-top:none;padding:14px 20px;font-size:13px;color:var(--muted);text-align:center;">
            This conversation is archived. Unarchive it to reply.
        </div>
    @endif
</div>
@endsection

@push('scripts')
<script>
const conversationId = {{ $conversation->id }};
const adminId = {{ $admin->id }};
const adminName = "{{ addslashes($admin->name) }}";
const csrfToken = "{{ csrf_token() }}";
let taggedIssueId = null;
let taggedIssueTitle = null;
let searchTimeout = null;

function toggleIssueSearch() {
    const box = document.getElementById('issueSearchBox');
    const input = document.getElementById('issueSearchInput');
    if (box.style.display === 'none') {
        box.style.display = 'block';
        input.focus();
        input.value = '';
        loadLatestIssues();
    } else {
        box.style.display = 'none';
    }
}

async function loadLatestIssues() {
    const results = document.getElementById('issueResults');
    results.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:var(--muted);">Loading recent issues…</div>';
    try {
        const res = await fetch(`/admin/issues/search?q=`, {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken }
        });
        const issues = await res.json();
        renderIssueResults(issues, 'Recent issues');
    } catch {
        results.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:var(--red);">Could not load issues.</div>';
    }
}

function renderIssueResults(issues, emptyLabel = 'No issues found.') {
    const results = document.getElementById('issueResults');
    if (!issues.length) {
        results.innerHTML = `<div style="padding:10px 14px;font-size:12px;color:var(--muted);">${emptyLabel}</div>`;
        return;
    }
    results.innerHTML = issues.map(issue => `
        <div onclick="selectIssue(${issue.id}, ${JSON.stringify(issue.title)})"
             style="padding:9px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--line);"
             onmouseover="this.style.background='var(--panel)'" onmouseout="this.style.background=''">
            <span style="font-weight:700;color:var(--blue);">#${issue.id}</span>
            <span style="margin-left:6px;">${issue.title}</span>
            ${issue.municipality_en ? `<span style="color:var(--muted);font-size:11px;margin-left:6px;">${issue.municipality_en}</span>` : ''}
        </div>
    `).join('');
}

function searchIssues(q) {
    clearTimeout(searchTimeout);
    const results = document.getElementById('issueResults');
    if (!q.trim()) { loadLatestIssues(); return; }
    searchTimeout = setTimeout(async () => {
        results.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:var(--muted);">Searching…</div>';
        try {
            const res = await fetch(`/admin/issues/search?q=${encodeURIComponent(q)}`, {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken }
            });
            renderIssueResults(await res.json(), 'No issues found.');
        } catch {
            results.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:var(--red);">Search failed.</div>';
        }
    }, 300);
}

function selectIssue(id, title) {
    taggedIssueId = id;
    taggedIssueTitle = title;
    document.getElementById('taggedIssueLabel').textContent = `#${id} — ${title}`;
    document.getElementById('taggedIssuePreview').style.display = 'flex';
    document.getElementById('issueSearchBox').style.display = 'none';
    const btn = document.getElementById('tagBtn');
    btn.style.background = 'rgba(18,145,255,.15)';
    btn.style.color = '#9bd4ff';
    btn.style.borderColor = 'rgba(18,145,255,.4)';
}

function clearTag() {
    taggedIssueId = null;
    taggedIssueTitle = null;
    document.getElementById('taggedIssuePreview').style.display = 'none';
    const btn = document.getElementById('tagBtn');
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
}

const fetchOpts = (method, body = null) => ({
    method,
    credentials: 'same-origin',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
});

document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('messageList');
    if (list) list.scrollTop = list.scrollHeight;
});

function appendMessage(msg, isMine) {
    const list = document.getElementById('messageList');
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `display:flex;flex-direction:column;max-width:72%;align-self:${isMine?'flex-end':'flex-start'};align-items:${isMine?'flex-end':'flex-start'};`;

    let inner = '';
    if (!isMine) inner += `<span style="font-size:11px;font-weight:700;color:var(--blue);margin-bottom:4px;padding-left:4px;">${msg.sender_name}</span>`;
    if (msg.issue_id) {
        const issueBg = isMine ? 'rgba(255,255,255,0.08)' : 'rgba(18,145,255,.1)';
        const issueBorder = isMine ? 'rgba(255,255,255,.15)' : 'rgba(18,145,255,.25)';
        const issueColor = isMine ? 'rgba(255,255,255,.75)' : '#9bd4ff';
        inner += `<div style="display:inline-flex;align-items:center;gap:5px;background:${issueBg};border:1px solid ${issueBorder};padding:4px 10px;margin-bottom:5px;font-size:11px;font-weight:700;color:${issueColor};">#${msg.issue_id} — ${msg.issue_title}</div>`;
    }
    const bubbleBg = isMine ? '#19405F' : 'var(--panel-2)';
    const bubbleColor = isMine ? '#fff' : 'var(--text)';
    const bubbleBorder = isMine ? '1px solid rgba(255,255,255,.1)' : '1px solid var(--line)';
    const radius = isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px';
    inner += `<div style="background:${bubbleBg};color:${bubbleColor};padding:11px 15px;border:${bubbleBorder};border-radius:${radius};font-size:14px;line-height:1.55;word-break:break-word;">${msg.body}</div>`;
    const t = new Date(msg.created_at);
    const time = `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`;
    inner += `<span style="font-size:10px;color:var(--muted);margin-top:4px;${isMine?'padding-right:4px;':'padding-left:4px;'}">${isMine?adminName+' · ':''}${time}</span>`;

    wrapper.innerHTML = inner;
    list.appendChild(wrapper);
    list.scrollTop = list.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('msgInput');
    const body = input.value.trim();
    if (!body) return;
    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    input.value = '';

    const payload = { body };
    if (taggedIssueId) { payload.issue_id = taggedIssueId; }

    try {
        const res = await fetch(`/admin/chat/${conversationId}/messages`, fetchOpts('POST', payload));
        const data = await res.json();
        if (res.ok) {
            appendMessage({ ...data.message, sender_name: adminName }, true);
            clearTag();
        } else {
            alert(data.message || 'Failed to send.');
            input.value = body;
        }
    } catch { input.value = body; }
    finally { btn.disabled = false; }
}

async function takeOver() {
    if (!confirm('Take over this conversation from ' + (@json($conversation->assignedAdmin?->name) ?? 'current admin') + '?')) return;
    const btn = document.getElementById('takeOverBtn');
    if (btn) btn.disabled = true;
    const res = await fetch(`/admin/chat/${conversationId}/assign`, fetchOpts('POST'));
    if (res.ok) location.reload();
    else { alert('Could not take over.'); if (btn) btn.disabled = false; }
}

async function archiveConv() {
    if (!confirm('Archive this conversation?')) return;
    const res = await fetch(`/admin/chat/${conversationId}/archive`, fetchOpts('PATCH'));
    if (res.ok) location.reload();
}

async function unarchiveConv() {
    const res = await fetch(`/admin/chat/${conversationId}/unarchive`, fetchOpts('PATCH'));
    if (res.ok) location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Pusher === 'undefined') return;
    const pusher = new Pusher("{{ config('broadcasting.connections.pusher.key') }}", {
        cluster: "{{ config('broadcasting.connections.pusher.options.cluster') }}",
        authEndpoint: '/broadcasting/auth',
    });
    const channel = pusher.subscribe('private-admins');
    channel.bind('chat.message', (data) => {
        if (data.conversation_id !== conversationId) return;
        if (data.sender_role !== 'worker') return;
        appendMessage(data, false);
    });
    channel.bind('conversation.assigned', (data) => {
        if (data.conversation_id !== conversationId) return;
        if (data.assigned_admin_id !== adminId) location.reload();
    });
});
</script>
@endpush
