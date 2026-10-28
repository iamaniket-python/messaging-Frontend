import { useEffect, useState } from 'react';
import { getNotificationPreferences, updateNotificationPreferences } from '../api/notifications.js';
import { errorText } from '../utils/format.js';
import { btn } from './ui.js';

const MODES = [
  { value: 'all', label: 'All messages' },
  { value: 'mentions', label: 'Mentions only' },
  { value: 'none', label: 'Nothing' },
];

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [status, setStatus] = useState('loading');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getNotificationPreferences()
      .then((p) => {
        if (cancelled) return;
        if (p && p.messagesMode) {
          setPrefs(p);
          setStatus('ready');
        } else {
          setStatus('error');
          setError('Could not read preferences.');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setError(errorText(err));
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  async function update(patch) {
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    setSaving(true);
    setError(null);
    try {
      const saved = await updateNotificationPreferences(patch);
      if (saved && saved.messagesMode) setPrefs(saved);
    } catch (err) {
      setPrefs(previous);
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return <div className="m-4 h-24 animate-pulse rounded-lg bg-panel-2" />;
  }

  if (status === 'error') {
    return (
      <div className="m-4 rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
        <p>{error}</p>
        <button type="button" className={`${btn} mt-2`} onClick={() => setTick((n) => n + 1)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <fieldset disabled={saving} className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">Notify me about</legend>
        {MODES.map((m) => (
          <label key={m.value} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="messagesMode"
              value={m.value}
              checked={prefs.messagesMode === m.value}
              onChange={() => update({ messagesMode: m.value })}
              className="accent-[var(--accent)]"
            />
            {m.label}
          </label>
        ))}
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(prefs.mentionsEnabled)}
          disabled={saving}
          onChange={(e) => update({ mentionsEnabled: e.target.checked })}
          className="accent-[var(--accent)]"
        />
        Notify me when I am @mentioned
      </label>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
