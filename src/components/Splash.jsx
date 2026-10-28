import { btn } from './ui.js';

export default function Splash({ error = false, onRetry }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      {error ? (
        <>
          <p>Cannot reach the server.</p>
          <button type="button" className={btn} onClick={onRetry}>
            Retry
          </button>
        </>
      ) : (
        <>
          <div
            role="status"
            aria-label="Loading"
            className="h-7 w-7 animate-spin rounded-full border-[3px] border-border border-t-accent"
          />
          <p className="text-muted">Loading...</p>
        </>
      )}
    </div>
  );
}
