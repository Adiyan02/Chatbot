import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Markdown Erweiterungen:
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

// Icons
import { UserCircle, Bot, Code } from 'lucide-react';
import { Message } from '../types/chat';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isToolCall = message.tool_calls && message.role === 'assistant';
  const isToolResponse = message.role === 'tool';
  const isTyping = message.isTyping;

  // Custom components für Markdown
  const components = {
    h1: (props: any) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
    h2: (props: any) => <h2 className="text-xl font-semibold mt-3 mb-1" {...props} />,
    h3: (props: any) => <h3 className="text-lg font-semibold mt-2 mb-1" {...props} />,
    p: (props: any) => <span className="leading-relaxed  mb-3" {...props} />,
    
    // Code-Blöcke und Inline-Code
    code: ({ node, inline, className, children, ...rest }: any) => {
      return !inline ? (
        <pre className="bg-gray-900 text-gray-100 rounded-md p-3 overflow-x-auto">
          <code className={className} {...rest}>{children}</code>
        </pre>
      ) : (
        <code className="bg-gray-200 rounded px-1 py-0.5 text-sm" {...rest}>{children}</code>
      );
    },
  
    // Blockquotes
    blockquote: (props: any) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2" {...props} />
    ),
  
    // Listen
    ul: (props: any) => <ul className="list-disc list-inside mb-2 pl-4" {...props} />,
    ol: (props: any) => <ol className="list-decimal list-inside mb-2 pl-4" {...props} />,
    li: (props: any) => <li className="leading-normal" {...props} />,
  
    // Horizontale Linie
    hr: (props: any) => <hr className="border-gray-300 my-4" {...props} />,
  
    // Links
    a: (props: any) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
  
    // Typografische Elemente
    strong: (props: any) => <strong className="font-semibold" {...props} />,
    em: (props: any) => <em className="italic" {...props} />,
    del: (props: any) => <del className="line-through" {...props} />,
  
    // Tabellen
    table: (props: any) => (
      <table className="min-w-full border-collapse border border-gray-300 mt-2 mb-4" {...props} />
    ),
    thead: (props: any) => <thead className="bg-gray-100" {...props} />,
    tbody: (props: any) => <tbody {...props} />,
    tr: (props: any) => <tr className="border-b border-gray-300" {...props} />,
    th: (props: any) => <th className="border border-gray-300 px-2 py-1 text-left font-semibold" {...props} />,
    td: (props: any) => <td className="border border-gray-300 px-2 py-1" {...props} />
  };
  

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0">
        {isUser ? (
          <UserCircle className="w-8 h-8 text-blue-500" />
        ) : isToolCall ? (
          <Code className="w-8 h-8 text-purple-500" />
        ) : isToolResponse ? (
          <Code className="w-8 h-8 text-orange-500" />
        ) : (
          <Bot className="w-8 h-8 text-green-500" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 prose ${
          isUser
            ? 'bg-blue-500 text-white prose-invert'
            : isToolCall
            ? 'bg-purple-100 text-purple-800'
            : isToolResponse
            ? 'bg-orange-100 text-orange-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {isTyping ? (
          <div className="flex space-x-1 pt-1">
            <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce animation-delay-200"></span>
            <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce animation-delay-400"></span>
          </div>
        ) : Array.isArray(message.content) ? (
          message.content.map((item, idx) => (
            <ReactMarkdown
              key={idx}
              className="markdown-content"
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeKatex]}
              components={components}
            >
              {item.text}
            </ReactMarkdown>
          ))
        ) : typeof message.content === 'string' ? (
          <ReactMarkdown
            className="markdown-content"
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeHighlight, rehypeKatex]}
            components={components}
          >
            {message.content}
          </ReactMarkdown>
        ) : isToolCall && message.content ? (
          <>
            <p>
              <strong>Tool:</strong> {message.function_name || (message.content as { name?: string }).name}
            </p>
            <p>
              <strong>Arguments:</strong>{' '}
              <code className="bg-gray-200 p-1 rounded">
                {(message.content as { arguments?: string }).arguments}
              </code>
            </p>
          </>
        ) : null}

        {isToolCall && (
          <div className="mt-2">
            <p>
              <strong>Tool Name:</strong> {message.tool_calls ? message.tool_calls[0].function.name : ""}
            </p>
          </div>
        )}
        {isToolResponse && (
          <div className="mt-2">
            <p>
              <strong>Tool Call ID:</strong> {message.tool_call_id}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
