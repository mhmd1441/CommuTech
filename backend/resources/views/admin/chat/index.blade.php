@extends('admin.panel')

@section('title', 'Messages')

@section('page_header')
    <h1 class="page-title">Messages</h1>
    <p class="page-subtitle">Worker conversations with the admin team.</p>
@endsection

@section('content')

{{-- Filter tabs --}}
<div style="display:flex;gap:4px;margin-bottom:20px;background:var(--panel-2);border:1px solid var(--line);padding:4px;width:fit-content;">
    @foreach(['all' => 'All Open', 'mine' => 'Assigned to Me', 'unassigned' => 'Unassigned', 'archived' => 'Archived'] as $key => $label)
        <a href="{{ route('admin.chat.index', ['filter' => $key]) }}"
           style="text-decoration:none;padding:7px 16px;font-size:13px;font-weight:700;transition:background .12s,color .12s;
                  {{ $filter === $key ? 'background:var(--blue);color:#fff;' : 'color:var(--muted);' }}">
            {{ $label }}
        </a>
    @endforeach
</div>

<div class="panel" style="padding:0;overflow:hidden;">
    @forelse($conversations as $conv)
        <a href="{{ route('admin.chat.show', $conv->id) }}"
           style="display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid var(--line);text-decoration:none;color:inherit;transition:background .12s;"
           onmouseover="this.style.background='var(--panel-2)'" onmouseout="this.style.background=''">

            {{-- Avatar --}}
            <div style="width:44px;height:44px;border-radius:50%;background:#19405F;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
                @if($conv->worker->profile_picture_url)
                    <img src="{{ $conv->worker->profile_picture_url }}" style="width:44px;height:44px;object-fit:cover;" />
                @else
                    <span style="color:#fff;font-weight:700;font-size:16px;">{{ strtoupper(substr($conv->worker->name,0,1)) }}</span>
                @endif
            </div>

            {{-- Info --}}
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="font-weight:700;font-size:14px;color:var(--text);">{{ $conv->worker->name }}</span>
                    @if($conv->status === 'archived')
                        <span class="tag" style="font-size:11px;">Archived</span>
                    @elseif($conv->assigned_admin_id)
                        <span class="tag blue" style="font-size:11px;">{{ $conv->assignedAdmin?->name }}</span>
                    @else
                        <span class="tag orange" style="font-size:11px;">Unassigned</span>
                    @endif
                </div>
                <p style="font-size:13px;color:var(--muted);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    {{ $conv->last_message_preview ?? 'No messages yet' }}
                </p>
            </div>

            {{-- Right side --}}
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
                @if($conv->last_message_at)
                    <span style="font-size:11px;color:var(--muted);">{{ $conv->last_message_at->diffForHumans() }}</span>
                @endif
                @if($conv->unread_count_admin > 0)
                    <span style="background:var(--blue);color:#fff;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;">
                        {{ $conv->unread_count_admin }}
                    </span>
                @endif
            </div>
        </a>
    @empty
        <div style="padding:56px;text-align:center;color:var(--muted);font-size:14px;">No conversations found.</div>
    @endforelse
</div>
@endsection
