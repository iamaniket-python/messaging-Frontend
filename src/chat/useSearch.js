import { useCallback, useEffect, useRef, useState } from 'react';
import { searchMessages } from '../api/search.js';
import { errorText } from '../utils/format.js';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 400;

const EMPTY = { results: [], pageInfo: null, loading: false, loadingMore: false, error: null };

export function useSearch(rawQuery) {
  const query = rawQuery.trim();
  const active = query.length >= MIN_CHARS;

  const [state, setState] = useState(EMPTY);
  const [tick, setTick] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const controllerRef = useRef(null);

  // Debounced search (stale request abort hoti hai)
  useEffect(() => {
    if (!active) {
      setState(EMPTY);
      return undefined;
    }

    setState({ ...EMPTY, loading: true });
    const controller = new AbortController();
    controllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const { results, pageInfo } = await searchMessages({ q: query, signal: controller.signal });
        if (controller.signal.aborted) return;
        setState({ ...EMPTY, results, pageInfo });
      } catch (err) {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        setState({ ...EMPTY, error: errorText(err) });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, active, tick]);

  const loadMore = useCallback(async () => {
    const s = stateRef.current;
    const controller = controllerRef.current;
    if (!active || !controller || s.loading || s.loadingMore) return;
    if (!s.pageInfo?.hasMore || !s.pageInfo.nextCursor) return;

    setState((p) => ({ ...p, loadingMore: true, error: null }));
    try {
      const { results, pageInfo } = await searchMessages({
        q: query,
        cursor: s.pageInfo.nextCursor,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setState((p) => ({
        ...p,
        loadingMore: false,
        pageInfo,
        results: [...p.results, ...results.filter((r) => !p.results.some((x) => x.id === r.id))],
      }));
    } catch (err) {
      if (err?.name === 'AbortError' || controller.signal.aborted) return;
      setState((p) => ({ ...p, loadingMore: false, error: errorText(err) }));
    }
  }, [active, query]);

  const retry = useCallback(() => setTick((n) => n + 1), []);

  return {
    results: state.results,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: Boolean(state.pageInfo?.hasMore),
    loadMore,
    retry,
  };
}
