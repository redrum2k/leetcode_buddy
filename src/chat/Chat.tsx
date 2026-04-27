import { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from './components/Message';
import type { ChatSession, ChatMessage } from '@/types';

// ── Port message types (internal to chat ↔ background) ────────────────────────

interface PortInInit { type: 'INIT'; sessionId: string }
interface PortInSend { type: 'SEND'; sessionId: string; content: string }
interface PortInNewConversation { type: 'NEW_CONVERSATION'; currentSessionId: string }
type PortIn = PortInInit | PortInSend | PortInNewConversation;

interface PortOutSession { type: 'SESSION'; session: ChatSession }
interface PortOutChunk { type: 'AI_CHUNK'; chunk: string }
interface PortOutDone { type: 'AI_DONE' }
interface PortOutError { type: 'AI_ERROR'; error: string }
type PortOut = PortOutSession | PortOutChunk | PortOutDone | PortOutError;

// ── Chat component ────────────────────────────────────────────────────────────

export function Chat() {
  const sessionId = new URLSearchParams(window.location.search).get('sessionId') ?? '';

  const [session, setSession] = useState<ChatSession | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForFirst, setIsWaitingForFirst] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  const portRef = useRef<chrome.runtime.Port | null>(null);
  const streamingRef = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Port setup ───────────────────────────────────────────────────────────────

  const sendPort = useCallback((msg: PortIn) => {
    portRef.current?.postMessage(msg);
  }, []);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'ai-chat' });
    portRef.current = port;

    port.onMessage.addListener((msg: PortOut) => {
      if (msg.type === 'SESSION') {
        setSession(msg.session);
        setCurrentSessionId(msg.session.id);
        const msgs = msg.session.messages;
        if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') {
          setIsWaitingForFirst(true);
          setIsStreaming(true);
          setStreamingContent('');
          streamingRef.current = '';
        }
      }

      if (msg.type === 'AI_CHUNK') {
        setIsWaitingForFirst(false);
        streamingRef.current += msg.chunk;
        setStreamingContent(streamingRef.current);
      }

      if (msg.type === 'AI_DONE') {
        const content = streamingRef.current;
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content,
          timestamp: Date.now(),
        };
        setSession((prev) =>
          prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : null,
        );
        streamingRef.current = '';
        setStreamingContent('');
        setIsStreaming(false);
        setIsWaitingForFirst(false);
      }

      if (msg.type === 'AI_ERROR') {
        setError(msg.error);
        setIsStreaming(false);
        setIsWaitingForFirst(false);
        streamingRef.current = '';
        setStreamingContent('');
      }
    });

    port.onDisconnect.addListener(() => {
      portRef.current = null;
    });

    // Kick off session load
    port.postMessage({ type: 'INIT', sessionId } as PortIn);

    return () => {
      port.disconnect();
    };
  }, [sessionId]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length, streamingContent]);

  // ── Send message ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || isStreaming || !portRef.current) return;

    setInput('');
    setError(null);
    setIsWaitingForFirst(true);
    setIsStreaming(true);
    setStreamingContent('');
    streamingRef.current = '';

    // Optimistic update
    const userMsg: ChatMessage = { role: 'user', content, timestamp: Date.now() };
    setSession((prev) =>
      prev ? { ...prev, messages: [...prev.messages, userMsg] } : null,
    );

    sendPort({ type: 'SEND', sessionId: currentSessionId, content });
  }, [input, isStreaming, currentSessionId, sendPort]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── New conversation ──────────────────────────────────────────────────────────

  const handleNewConversation = useCallback(() => {
    if (!portRef.current) return;
    setError(null);
    sendPort({ type: 'NEW_CONVERSATION', currentSessionId });
  }, [currentSessionId, sendPort]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const allMessages = session?.messages ?? [];
  const problemTitle = session?.problemContext?.title;

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] text-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#f89f1b] flex items-center justify-center text-xs font-bold text-[#1a1a2e]">
            LB
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f89f1b]">Leetcode Buddy</p>
            {problemTitle && (
              <p className="text-[10px] text-white/40 truncate max-w-[380px]">{problemTitle}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleNewConversation}
          className="text-xs text-white/40 hover:text-white/80 transition-colors px-2 py-1 rounded hover:bg-white/5"
        >
          New chat
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {allMessages.length === 0 && !isStreaming && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f89f1b]/20 flex items-center justify-center text-xl">
              💬
            </div>
            <p className="text-white/40 text-sm max-w-[240px]">
              {problemTitle
                ? `Ask me anything about "${problemTitle}"`
                : 'Ask me anything about a LeetCode problem'}
            </p>
          </div>
        )}

        {allMessages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {/* Streaming assistant message */}
        {isStreaming && (
          <Message
            msg={{ role: 'assistant', content: streamingContent, timestamp: Date.now() }}
            streaming={isWaitingForFirst && !streamingContent}
          />
        )}

        {error && (
          <div className="mx-auto max-w-[90%] rounded-lg px-3 py-2 bg-red-900/30 border border-red-700/40 text-xs text-red-300 mb-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Buddy… (Shift+Enter for newline)"
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#f89f1b]/50 resize-none min-h-[40px] max-h-[120px] leading-5"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-9 h-9 rounded-xl bg-[#f89f1b] text-[#1a1a2e] flex items-center justify-center text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f89f1b]/90 transition-colors shrink-0"
          >
            ↑
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-1.5 text-center">
          Powered by Anthropic · Responses may be incorrect — verify solutions
        </p>
      </div>
    </div>
  );
}
