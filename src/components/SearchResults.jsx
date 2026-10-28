import { Link } from 'react-router-dom';
import { useSearch } from '../chat/useSearch.js';
import { useUser } from '../chat/useUser.js';
import { conversationTitle, formatListTime } from '../utils/format.js';
import Snippet from './Snippet.jsx';
import { btn } from './ui.js';

function ResultItem({ result, conversation }) {
  const sender = useUser(result.senderId);
  const title = conversation ? conversationTitle(conversation) : 'Conversation';

  return (
    <Link
      to={`/c/${result.conversationId}`}
      className="block border-b border-border/50 px-4 py-3 hover:bg-panel-2"
    >
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
        <span className="truncate">{title}</span>
        <span className="flex-none">{formatListTime(result.createdAt)}</span>
      </div>
      <div className="mt-0.5 break-words text-[13px]">
        <span className="font-semibold text-accent">{sender?.name || 'Member'}: </span>
        <span className="text-text/90">
          <Snippet text={result.snippet ?? result.content} />
        </span>
      </div>
    </Link>
  );
}

export default function SearchResults({ query, conversations }) {
  const { results, loading, loadingMore, error, hasMore, loadMore, retry } = useSearch(query);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-panel-2" />
        ))}
      </div>
    );
  }

  if (error && results.length === 0) {
    return (
      <div className="m-4 rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
        <p>{error}</p>
        <button type="button" className={`${btn} mt-2`} onClick={retry}>
          Retry
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return <p className="p-4 text-sm text-muted">{`No messages found for "${query}".`}</p>;
  }

  return (
    <div>
      {results.map((r) => (
        <ResultItem
          key={r.id}
          result={r}
          conversation={conversations.find((c) => c.id === r.conversationId)}
        />
      ))}

      {error && <p className="px-4 py-2 text-sm text-danger">{error}</p>}

      {hasMore && (
        <div className="p-4">
          <button type="button" className={`${btn} w-full`} onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
