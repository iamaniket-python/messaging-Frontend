import { describeError } from '../api/errors.js';

export function errorText(err) {
  const d = describeError(err);
  return d.details.length ? `${d.message} ${d.details.join('; ')}` : d.message;
}

export function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatDayLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(iso) === dayKey(now.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatListTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (dayKey(iso) === dayKey(now.toISOString())) return formatTime(iso);
  const diffDays = (now.getTime() - d.getTime()) / 86400000;
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function conversationTitle(c) {
  if (!c) return 'Conversation';
  if (c.type === 'dm') return c.otherUser?.name || c.otherUser?.email || 'Direct message';
  if (c.type === 'channel') return `# ${c.name || 'channel'}`;
  return c.name || 'Untitled group';
}

export function avatarInitial(title) {
  const clean = String(title || '?').replace(/^#\s*/, '');
  return (clean.charAt(0) || '?').toUpperCase();
}

export function messagePreview(last, meId) {
  if (!last) return 'No messages yet';
  const prefix = last.senderId === meId ? 'You: ' : '';
  if (last.deleted) return 'Message deleted';
  if (last.type === 'system') return last.content || 'System message';
  if (last.content) return prefix + last.content;
  if (last.attachments?.length) return `${prefix}Attachment`;
  return `${prefix}Message`;
}
