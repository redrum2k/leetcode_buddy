import { useState, useEffect, useCallback } from 'react';
import { sendMessage, sendMessageWithResponse } from '@/lib/messaging';
import type { BgContextMsg } from '@/lib/messaging';
import type { ProblemContext } from '@/types';

export function ChatBar() {
  const [message, setMessage] = useState('');
  const [context, setContext] = useState<ProblemContext | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    sendMessageWithResponse<'POPUP_GET_CONTEXT', BgContextMsg>({ type: 'POPUP_GET_CONTEXT' })
      .then((res) => setContext(res.context))
      .catch(() => setContext(null));
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await sendMessage({ type: 'POPUP_OPEN_CHAT', initialMessage: trimmed });
      setMessage('');
    } finally {
      setSending(false);
    }
  }, [message, sending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleSend();
  };

  return (
    <div className="border-t border-white/10 px-3 py-2.5 bg-[#1a1a2e] shrink-0">
      <p className="text-[10px] text-white/35 mb-1.5 truncate">
        {context ? `Currently solving: ${context.title}` : 'Chat with Buddy about a problem'}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Buddy… (opens chat window)"
          disabled={sending}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-[#f89f1b]/50 disabled:opacity-60"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!message.trim() || sending}
          className="px-3 py-1.5 rounded-lg bg-[#f89f1b] text-[#1a1a2e] text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f89f1b]/90 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
