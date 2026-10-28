import { useState } from 'react';
import { useUser } from '../chat/useUser.js';
import { errorText, formatTime } from '../utils/format.js';

function SenderName({ senderId }) {
  const u = useUser(senderId);
  return <div className="mb-0.5 text-xs font-semibold text-accent">{u?.name || 'Member'}</div>;
}

const linkBtn = 'text-[11px] text-muted hover:text-text hover:underline disabled:opacity-50';

export default function MessageItem({
  message,
  isOwn,
  showSender,
  onRetry,
  onDiscard,
  onEdit,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (message.type === 'system') {
    return <div className="my-2 text-center text-xs text-muted">{message.content}</div>;
  }

  const pending = message.id == null;
  const canAct = isOwn && !pending && !message.deleted;
  const canEdit = canAct && message.type === 'text';

  function startEdit() {
    setDraft(message.content ?? '');
    setActionError(null);
    setEditing(true);
  }

  async function saveEdit() {
    const content = draft.trim();
    if (!content) {
      setActionError('Message cannot be empty.');
      return;
    }
    if (content === message.content) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await onEdit(message.id, content);
      setEditing(false);
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this message?')) return;
    setBusy(true);
    setActionError(null);
    try {
      await onDelete(message.id);
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function onEditKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  }

  const bubbleCls =
    message.status === 'failed'
      ? 'border-danger bg-danger/10'
      : isOwn
        ? 'border-accent/40 bg-accent/20'
        : 'border-border bg-panel-2';

  return (
    <div
      className={`group flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${
        showSender ? 'mt-3' : 'mt-1'
      }`}
    >
      {showSender && <SenderName senderId={message.senderId} />}

      <div className={`max-w-[85%] rounded-2xl border px-3 py-2 md:max-w-[70%] ${bubbleCls}`}>
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onEditKeyDown}
              maxLength={4000}
              rows={3}
              autoFocus
              className="w-72 max-w-full resize-none rounded-lg border border-border bg-bg px-2 py-1.5 text-[15px] text-text outline-none focus:border-accent"
            />
            <div className="flex gap-3">
              <button type="button" className={linkBtn} onClick={saveEdit} disabled={busy}>
                {busy ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className={linkBtn}
                onClick={() => setEditing(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : message.deleted ? (
          <p className="italic text-muted">This message was deleted</p>
        ) : (
          <>
            {message.content && (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}
            {message.attachments?.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[13px] text-muted">
                {message.attachments.map((a) => (
                  <li key={a.id}>Attachment: {a.name}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-2 px-1 text-[11px] text-muted">
        <span>{formatTime(message.createdAt)}</span>
        {message.editedAt && !message.deleted && <span>(edited)</span>}
        {message.status === 'sending' && <span>Sending...</span>}

        {message.status === 'failed' && (
          <>
            <span className="text-danger">{message.sendError || 'Failed to send'}</span>
            <button type="button" className={linkBtn} onClick={() => onRetry(message)}>
              Retry
            </button>
            <button type="button" className={linkBtn} onClick={() => onDiscard(message)}>
              Discard
            </button>
          </>
        )}

        {canAct && !editing && (
          <span className="flex gap-2 md:opacity-0 md:transition md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            {canEdit && (
              <button type="button" className={linkBtn} onClick={startEdit} disabled={busy}>
                Edit
              </button>
            )}
            <button type="button" className={linkBtn} onClick={handleDelete} disabled={busy}>
              Delete
            </button>
          </span>
        )}
      </div>

      {actionError && <p className="px-1 text-xs text-danger">{actionError}</p>}
    </div>
  );
}
