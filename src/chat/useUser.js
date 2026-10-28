import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const cache = new Map();

function loadUser(id) {
  if (!cache.has(id)) {
    const promise = api
      .get(`/users/${id}`)
      .then((data) => data?.user ?? data)
      .catch((err) => {
        cache.delete(id);
        throw err;
      });
    cache.set(id, promise);
  }
  return cache.get(id);
}

export function useUser(id) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    loadUser(id)
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  return user;
}
