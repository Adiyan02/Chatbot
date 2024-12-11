import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Markdown Erweiterungen:
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

// Icons
import { UserCircle, Bot, Code, Image } from 'lucide-react';
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
    ul: (props: any) => <ul className="list-disc list-inside mb-3 pl-4" {...props} />,
    ol: (props: any) => <ol className="list-decimal pl-4 mb-3" {...props} />,
    li: (props: any) => <li className="leading-normal mb-2 pl-1" {...props} />,
    p: (props: any) => <p className="leading-relaxed whitespace-pre-line mb-3" {...props} />,
  
    // Container und Inline-Elemente
    div: (props: any) => <div className="mb-2" {...props} />,
    span: (props: any) => <span className="inline" {...props} />,
    
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
    td: (props: any) => <td className="border border-gray-300 px-2 py-1" {...props} />,
    br: (props: any) => <br className="my-1" {...props} />,
    kbd: (props: any) => (
      <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg" {...props} />
    ),
    dl: (props: any) => <dl className="mt-2 mb-4" {...props} />,
    dt: (props: any) => <dt className="font-semibold mb-1" {...props} />,
    dd: (props: any) => <dd className="ml-4 mb-2" {...props} />,
    sub: (props: any) => <sub className="text-sm" {...props} />,
    sup: (props: any) => <sup className="text-sm" {...props} />,
    mark: (props: any) => (
      <mark className="bg-yellow-200 px-1 rounded" {...props} />
    ),
  };
  
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection) {
        // Nur den reinen Text kopieren
        const plainText = selection.toString();
        e.clipboardData?.setData('text/plain', plainText);
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
         onCopy={(e) => e.preventDefault()}
    >
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
        ) : message.content && 'text' in message.content ? (
          <ReactMarkdown
            className="markdown-content"
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeHighlight, rehypeKatex]}
            components={components}
          >
            {message.content.text.text}
          </ReactMarkdown>
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

        {message.content.files && message.content.files.length > 0 && (
          <div className="mt-2 flex gap-2">
            {message.content.files.map((file, index) => (
              <div 
                key={index} 
                className="relative bg-gray-100 rounded-lg p-2 flex items-center gap-2"
              >
                <Image className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Bild {index + 1}
                </span>
                {message.role === 'user' && (
                  <div className="absolute -top-2 -right-2">
                    <div className="h-4 w-4 bg-green-500 rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
