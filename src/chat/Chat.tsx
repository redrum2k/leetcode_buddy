import { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from './components/Message';
import type { ChatSession, ChatMessage } from '@/types';

interface PortInInit { type: 'INIT'; sessionId: string }
interface PortInSend { type: 'SEND'; sessionId: string; content: string }
interface PortInNewConversation { type: 'NEW_CONVERSATION'; currentSessionId: string }
type PortIn = PortInInit | PortInSend | PortInNewConversation;

interface PortOutSession { type: 'SESSION'; session: ChatSession }
interface PortOutChunk { type: 'AI_CHUNK'; chunk: string }
interface PortOutDone { type: 'AI_DONE' }
interface PortOutError { type: 'AI_ERROR'; error: string }
type PortOut = PortOutSession | PortOutChunk | PortOutDone | PortOutError;

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
  const fullContentRef = useRef('');
  const charQueueRef = useRef<string[]>([]);
  const displayRef = useRef('');
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiDoneRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        // Keep URL in sync so refresh loads the correct session
        if (msg.session.id !== new URLSearchParams(window.location.search).get('sessionId')) {
          history.replaceState(null, '', `?sessionId=${msg.session.id}`);
        }
        const msgs = msg.session.messages;
        if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') {
          setIsWaitingForFirst(true);
          setIsStreaming(true);
          setStreamingContent('');
          fullContentRef.current = '';
          displayRef.current = '';
          charQueueRef.current = [];
        }
      }
      if (msg.type === 'AI_CHUNK') {
        setIsWaitingForFirst(false);
        fullContentRef.current += msg.chunk;
        charQueueRef.current.push(...msg.chunk.split(''));
        if (typeIntervalRef.current === null) {
          typeIntervalRef.current = setInterval(() => {
            const char = charQueueRef.current.shift();
            if (char === undefined) {
              if (apiDoneRef.current) {
                clearInterval(typeIntervalRef.current!);
                typeIntervalRef.current = null;
                const content = fullContentRef.current;
                const assistantMsg: ChatMessage = { role: 'assistant', content, timestamp: Date.now() };
                setSession((prev) =>
                  prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : null,
                );
                fullContentRef.current = '';
                displayRef.current = '';
                charQueueRef.current = [];
                apiDoneRef.current = false;
                setStreamingContent('');
                setIsStreaming(false);
                setIsWaitingForFirst(false);
              }
              return;
            }
            displayRef.current += char;
            setStreamingContent(displayRef.current);
          }, 18);
        }
      }
      if (msg.type === 'AI_DONE') {
        apiDoneRef.current = true;
        if (typeIntervalRef.current === null) {
          const content = fullContentRef.current;
          const assistantMsg: ChatMessage = { role: 'assistant', content, timestamp: Date.now() };
          setSession((prev) =>
            prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : null,
          );
          fullContentRef.current = '';
          displayRef.current = '';
          charQueueRef.current = [];
          apiDoneRef.current = false;
          setStreamingContent('');
          setIsStreaming(false);
          setIsWaitingForFirst(false);
        }
      }
      if (msg.type === 'AI_ERROR') {
        if (typeIntervalRef.current !== null) {
          clearInterval(typeIntervalRef.current);
          typeIntervalRef.current = null;
        }
        charQueueRef.current = [];
        displayRef.current = '';
        fullContentRef.current = '';
        setError(msg.error);
        setIsStreaming(false);
        setIsWaitingForFirst(false);
        setStreamingContent('');
      }
    });

    port.onDisconnect.addListener(() => { portRef.current = null; });
    port.postMessage({ type: 'INIT', sessionId } as PortIn);
    return () => {
      port.disconnect();
      if (typeIntervalRef.current !== null) clearInterval(typeIntervalRef.current);
    };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length, streamingContent]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || isStreaming || !portRef.current) return;

    setInput('');
    setError(null);
    setIsWaitingForFirst(true);
    setIsStreaming(true);
    setStreamingContent('');
    fullContentRef.current = '';
    displayRef.current = '';
    charQueueRef.current = [];
    apiDoneRef.current = false;

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

  const handleNewConversation = useCallback(() => {
    if (!portRef.current) return;
    setError(null);
    sendPort({ type: 'NEW_CONVERSATION', currentSessionId });
  }, [currentSessionId, sendPort]);

  const allMessages = session?.messages ?? [];
  const problemTitle = session?.problemContext?.title;

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-[#eff1f6] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] shrink-0 bg-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#ffa116] flex items-center justify-center text-xs font-bold text-[#1a1a1a]">
            LB
          </div>
          <div>
            <p className="text-sm font-bold text-[#ffa116]">Leetcode Buddy</p>
            {problemTitle && (
              <p className="text-[10px] text-white/30 truncate max-w-[420px]">{problemTitle}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleNewConversation}
          className="text-xs text-white/35 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04]"
        >
          New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {allMessages.length === 0 && !isStreaming && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#ffa116]/10 border border-[#ffa116]/20 flex items-center justify-center text-xl">
              💬
            </div>
            <p className="text-white/30 text-sm max-w-[260px]">
              {problemTitle
                ? `Ask me anything about "${problemTitle}"`
                : 'Navigate to a LeetCode problem and ask me anything'}
            </p>
          </div>
        )}

        {allMessages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {isStreaming && (
          <Message
            msg={{ role: 'assistant', content: streamingContent, timestamp: Date.now() }}
            streaming={isWaitingForFirst && !streamingContent}
          />
        )}

        {error && (
          <div className="mx-auto max-w-[90%] rounded-lg px-3 py-2.5 bg-[#ef4743]/10 border border-[#ef4743]/30 text-xs text-[#ef4743] mb-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.08] px-4 py-3 shrink-0 bg-[#1a1a1a]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Buddy… (Shift+Enter for newline)"
            rows={1}
            className="flex-1 bg-[#282828] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#eff1f6] placeholder-white/20 focus:outline-none focus:border-[#ffa116]/50 resize-none min-h-[44px] max-h-[140px] leading-5 transition-colors"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 140) + 'px';
            }}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 rounded-xl bg-[#ffa116] text-[#1a1a1a] flex items-center justify-center text-sm font-bold disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[#ffa116]/90 transition-colors shrink-0"
          >
            ↑
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-2 text-center">
          Powered by Anthropic · Verify all solutions before submitting
        </p>
      </div>
    </div>
  );
}
