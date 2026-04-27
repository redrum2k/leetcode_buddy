import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { ChatMessage } from '@/types';

// Reuse code‑block style for user messages too (plain text only)
function UserBubble({ content }: { content: string }) {
  return (
    <div className="max-w-[80%] ml-auto rounded-2xl rounded-br-sm px-3 py-2 bg-[#f89f1b]/20 text-white text-sm whitespace-pre-wrap">
      {content}
    </div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-3 py-2 bg-white/5 text-white text-sm">
      <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Block code: wrapped in <pre><code>
          pre({ children }) {
            return (
              <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto text-xs my-2 font-mono">
                {children}
              </pre>
            );
          },
          // Inline code only — block code is handled by <pre>
          code({ children, className }) {
            const isBlock = Boolean(className?.startsWith('language-'));
            if (isBlock) {
              return <code className={className}>{children}</code>;
            }
            return (
              <code className="bg-black/30 rounded px-1 py-0.5 text-xs font-mono">
                {children}
              </code>
            );
          },
          // Tighten paragraph spacing inside bubbles
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
      </div>
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
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#f89f1b] flex items-center justify-center text-[10px] font-bold text-[#1a1a2e] shrink-0 mb-0.5">
          LB
        </div>
      )}
      <div className="min-w-0">
        {isUser ? (
          <UserBubble content={msg.content} />
        ) : (
          <AssistantBubble content={msg.content} />
        )}
        {streaming && (
          <div className="flex gap-1 mt-1.5 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f89f1b]/60 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#f89f1b]/60 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#f89f1b]/60 animate-bounce" />
          </div>
        )}
      </div>
    </div>
  );
}

