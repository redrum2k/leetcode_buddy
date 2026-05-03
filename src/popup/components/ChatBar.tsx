import { useState, useEffect, useCallback } from 'react';
import { sendMessageWithResponse } from '@/lib/messaging';
import type { BgContextMsg } from '@/lib/messaging';
import type { ProblemContext } from '@/types';

interface ChatBarProps {
  onOpenChat: (sessionId: string) => void;
}

export function ChatBar({ onOpenChat }: ChatBarProps) {
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
      const res = await sendMessageWithResponse<'POPUP_OPEN_CHAT', { sessionId: string }>(
        { type: 'POPUP_OPEN_CHAT', initialMessage: trimmed },
      );
      setMessage('');
      onOpenChat(res.sessionId);
    } finally {
      setSending(false);
    }
  }, [message, sending, onOpenChat]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleSend();
  };

  return (
    <div className="border-t border-white/[0.08] px-3 py-2.5 bg-[#1a1a1a] shrink-0">
      {context && (
        <p className="text-[10px] text-white/30 mb-1.5 truncate">
          <span className="text-[#ffa116]/60">●</span>{' '}
          {context.title}
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={context ? `Ask about "${context.title}"…` : 'Ask Buddy…'}
          disabled={sending}
          className="flex-1 bg-[#282828] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#eff1f6] placeholder-white/20 focus:outline-none focus:border-[#ffa116]/50 disabled:opacity-60 transition-colors"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!message.trim() || sending}
          className="px-3 py-2 rounded-lg bg-[#ffa116] text-[#1a1a1a] text-xs font-bold disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[#ffa116]/90 transition-colors shrink-0"
        >
          →
        </button>
      </div>
    </div>
  );
}
