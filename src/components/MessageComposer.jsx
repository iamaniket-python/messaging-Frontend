import { useEffect, useRef, useState } from 'react';

export default function MessageComposer({ onSend, onTyping, onStopTyping }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  function handleChange(e) {
    const value = e.target.value;
    setText(value);
    if (value.trim()) onTyping?.();
    else onStopTyping?.();
  }

  function submit() {
    const content = text.trim();
    if (!content) return;
    onStopTyping?.();
    onSend(content);
    setText('');
    ref.current?.focus();
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-border bg-panel p-3">
      <textarea
        ref={ref}
        value={text}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onBlur={() => onStopTyping?.()}
        maxLength={4000}
        rows={1}
        placeholder="Write a message..."
        className="max-h-40 flex-1 resize-none rounded-lg border border-border bg-bg px-3 py-2.5 text-[15px] text-text outline-none placeholder:text-muted focus:border-accent"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!text.trim()}
        className="rounded-lg border border-accent bg-accent px-4 py-2.5 font-semibold text-[#0b0d12] transition hover:border-accent-hover hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
