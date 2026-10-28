import { Fragment } from 'react';

export default function Snippet({ text }) {
  if (!text) return null;
  const parts = String(text).split(/(\[\[[\s\S]*?\]\])/g);

  return (
    <>
      {parts.map((part, i) =>
        part.length >= 4 && part.startsWith('[[') && part.endsWith(']]') ? (
          <mark key={i} className="rounded bg-accent/30 px-0.5 text-text">
            {part.slice(2, -2)}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
