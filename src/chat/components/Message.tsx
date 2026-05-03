import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { ChatMessage } from '@/types';

function UserBubble({ content }: { content: string }) {
  return (
    <div className="max-w-[80%] rounded-[20px] rounded-br-[4px] px-3 py-2.5 bg-[#ffa116]/15 border border-[#ffa116]/20 text-[#eff1f6] text-sm whitespace-pre-wrap">
      {content}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex gap-1 py-1 px-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#ffa116]/50 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#ffa116]/50 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#ffa116]/50 animate-bounce" />
    </div>
  );
}

function AssistantBubble({ content, showDots }: { content: string; showDots?: boolean }) {
  return (
    <div className="max-w-[85%] rounded-[20px] rounded-bl-[4px] px-3 py-2.5 bg-[#282828] border border-white/[0.08] text-[#eff1f6] text-sm">
      {showDots ? (
        <ThinkingDots />
      ) : (
        <div className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              pre({ children }) {
                return (
                  <pre className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg p-3 overflow-x-auto text-xs my-2 font-mono">
                    {children}
                  </pre>
                );
              },
              code({ children, className }) {
                const isBlock = Boolean(className?.startsWith('language-'));
                if (isBlock) {
                  return <code className={className}>{children}</code>;
                }
                return (
                  <code className="bg-white/[0.08] rounded px-1.5 py-0.5 text-xs font-mono text-[#ffa116]/90">
                    {children}
                  </code>
                );
              },
              p({ children }) {
                return <p className="mb-2 last:mb-0">{children}</p>;
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

interface MessageProps {
  msg: ChatMessage;
  streaming?: boolean;
}

export function Message({ msg, streaming }: MessageProps) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#ffa116] flex items-center justify-center text-[10px] font-bold text-[#1a1a1a] shrink-0 mb-0.5">
          LB
        </div>
      )}
      {isUser ? (
        <UserBubble content={msg.content} />
      ) : (
        <div className="min-w-0">
          <AssistantBubble content={msg.content} showDots={streaming} />
        </div>
      )}
    </div>
  );
}
