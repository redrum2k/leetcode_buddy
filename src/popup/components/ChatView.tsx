import { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '@/chat/components/Message';
import type { ChatSession, ChatMessage } from '@/types';

interface PortInInit { type: 'INIT'; sessionId: string }
interface PortInSend { type: 'SEND'; sessionId: string; content: string }
interface PortInSendCopilot { type: 'SEND_COPILOT'; sessionId: string; content: string }
interface PortInNewConversation { type: 'NEW_CONVERSATION'; currentSessionId: string }
type PortIn = PortInInit | PortInSend | PortInSendCopilot | PortInNewConversation;

interface PortOutSession { type: 'SESSION'; session: ChatSession }
interface PortOutChunk { type: 'AI_CHUNK'; chunk: string }
interface PortOutDone { type: 'AI_DONE' }
interface PortOutError { type: 'AI_ERROR'; error: string }
interface PortOutCodeWritten { type: 'CODE_WRITTEN' }
interface PortOutCodeWriteFailed { type: 'CODE_WRITE_FAILED'; reason: string }
type PortOut =
  | PortOutSession | PortOutChunk | PortOutDone | PortOutError
  | PortOutCodeWritten | PortOutCodeWriteFailed;

const CODE_REQUEST_RE =
  /\b(write|just code|implement|give me|show me the (?:code|solution)|can you (?:write|code|implement)|just (?:write|do it)|entire solution|full solution|solve it for me)\b/i;

type ChatMode = 'socratic' | 'offer' | 'copilot';
type CodeWriteStatus = 'idle' | 'writing' | 'done' | 'failed';

interface ChatViewProps {
  sessionId: string;
  onClose: () => void;
}

export function ChatView({ sessionId, onClose }: ChatViewProps) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForFirst, setIsWaitingForFirst] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [mode, setMode] = useState<ChatMode>('socratic');
  const [pendingMessage, setPendingMessage] = useState('');
  const [codeWriteStatus, setCodeWriteStatus] = useState<CodeWriteStatus>('idle');
  const [codeWriteError, setCodeWriteError] = useState('');

  const portRef = useRef<chrome.runtime.Port | null>(null);
  const fullContentRef = useRef('');   // total received from API
  const charQueueRef = useRef<string[]>([]); // pending chars for typewriter
  const displayRef = useRef('');       // chars shown so far
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiDoneRef = useRef(false);    // true once AI_DONE received
  const modeRef = useRef<ChatMode>('socratic');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);

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
                if (modeRef.current === 'copilot') setCodeWriteStatus('writing');
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
        // If interval isn't running (no chunks or already drained), finalize immediately
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
          if (modeRef.current === 'copilot') setCodeWriteStatus('writing');
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
      if (msg.type === 'CODE_WRITTEN') setCodeWriteStatus('done');
      if (msg.type === 'CODE_WRITE_FAILED') {
        setCodeWriteStatus('failed');
        setCodeWriteError(msg.reason);
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
  }, [session?.messages.length, streamingContent, mode]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || isStreaming || !portRef.current) return;

    if (mode === 'socratic' && CODE_REQUEST_RE.test(content)) {
      setPendingMessage(content);
      setMode('offer');
      setInput('');
      return;
    }

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

    if (mode === 'copilot') {
      setCodeWriteStatus('idle');
      sendPort({ type: 'SEND_COPILOT', sessionId: currentSessionId, content });
    } else {
      sendPort({ type: 'SEND', sessionId: currentSessionId, content });
    }
  }, [input, isStreaming, mode, currentSessionId, sendPort]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAcceptCopilot = useCallback(() => {
    setMode('copilot');
    setPendingMessage('');
  }, []);

  const handleRejectCopilot = useCallback(() => {
    const content = pendingMessage;
    setPendingMessage('');
    setMode('socratic');
    if (!content || !portRef.current) return;
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
  }, [pendingMessage, currentSessionId, sendPort]);

  const handleNewConversation = useCallback(() => {
    if (!portRef.current) return;
    setError(null);
    setMode('socratic');
    setPendingMessage('');
    setCodeWriteStatus('idle');
    sendPort({ type: 'NEW_CONVERSATION', currentSessionId });
  }, [currentSessionId, sendPort]);

  const allMessages = session?.messages ?? [];
  const problemTitle = session?.problemContext?.title;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#1a1a1a]">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#ffa116] flex items-center justify-center text-[10px] font-bold text-[#1a1a1a] shrink-0">
            LB
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-[#ffa116]">Buddy Chat</p>
              {mode === 'copilot' && (
                <span className="text-[9px] font-bold text-[#00b8a3] bg-[#00b8a3]/10 border border-[#00b8a3]/30 px-1.5 py-0.5 rounded-full">
                  Copilot
                </span>
              )}
            </div>
            {problemTitle && (
              <p className="text-[10px] text-white/30 truncate max-w-[180px]">{problemTitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {mode === 'copilot' && (
            <button
              onClick={() => setMode('socratic')}
              className="text-[10px] text-white/35 hover:text-white/70 transition-colors px-2 py-1 rounded hover:bg-white/[0.06]"
            >
              ← Socratic
            </button>
          )}
          <button
            onClick={handleNewConversation}
            className="text-[10px] text-white/35 hover:text-white/70 transition-colors px-2 py-1 rounded hover:bg-white/[0.06]"
          >
            New chat
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/[0.08] rounded transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {allMessages.length === 0 && !isStreaming && !error && mode !== 'offer' && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-white/30 text-sm">
              {problemTitle ? `Ask me about "${problemTitle}"` : 'Ask me anything'}
            </p>
          </div>
        )}

        {allMessages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {/* Copilot offer */}
        {mode === 'offer' && (
          <div className="flex items-end gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-[#ffa116] flex items-center justify-center text-[10px] font-bold text-[#1a1a1a] shrink-0 mb-0.5">
              LB
            </div>
            <div className="max-w-[85%] rounded-[20px] rounded-bl-[4px] px-3 py-3 bg-[#282828] border border-white/[0.08] text-[#eff1f6] text-sm">
              <p className="mb-3 text-sm leading-snug">
                Looks like you want code written. Switch to{' '}
                <span className="text-[#00b8a3] font-bold">Copilot mode</span>?{' '}
                I'll write directly to your editor.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptCopilot}
                  className="flex-1 py-1.5 rounded-lg bg-[#00b8a3]/15 border border-[#00b8a3]/40 text-[#00b8a3] text-xs font-bold hover:bg-[#00b8a3]/25 transition-colors"
                >
                  Switch to Copilot
                </button>
                <button
                  onClick={handleRejectCopilot}
                  className="flex-1 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 text-xs hover:bg-white/[0.1] transition-colors"
                >
                  Stay Socratic
                </button>
              </div>
            </div>
          </div>
        )}

        {isStreaming && (
          <Message
            msg={{ role: 'assistant', content: streamingContent, timestamp: Date.now() }}
            streaming={isWaitingForFirst && !streamingContent}
          />
        )}

        {mode === 'copilot' && codeWriteStatus === 'writing' && (
          <div className="flex items-center gap-1.5 ml-9 mb-2 text-[11px] text-[#00b8a3]/70">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b8a3] animate-pulse shrink-0" />
            Writing to editor…
          </div>
        )}
        {mode === 'copilot' && codeWriteStatus === 'done' && (
          <div className="ml-9 mb-2 text-[11px] text-[#00b8a3]">✓ Written to editor</div>
        )}
        {mode === 'copilot' && codeWriteStatus === 'failed' && (
          <div className="ml-9 mb-2 text-[11px] text-[#ef4743]">⚠ Could not write: {codeWriteError}</div>
        )}

        {error && (
          <div className="mx-auto rounded-lg px-3 py-2 bg-[#ef4743]/10 border border-[#ef4743]/30 text-xs text-[#ef4743] mb-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.08] px-3 py-2.5 shrink-0 bg-[#1a1a1a]">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'copilot'
                ? "Describe what you'd like me to write…"
                : 'Ask Buddy… (Shift+Enter for newline)'
            }
            rows={1}
            className="flex-1 bg-[#282828] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-[#eff1f6] placeholder-white/20 focus:outline-none focus:border-[#ffa116]/50 resize-none min-h-[36px] max-h-[100px] leading-5 transition-colors"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 100) + 'px';
            }}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold disabled:opacity-35 disabled:cursor-not-allowed transition-colors shrink-0 ${
              mode === 'copilot'
                ? 'bg-[#00b8a3] text-white hover:bg-[#00b8a3]/90'
                : 'bg-[#ffa116] text-[#1a1a1a] hover:bg-[#ffa116]/90'
            }`}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
