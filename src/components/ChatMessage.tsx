// ChatMessage.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UserCircle, Bot, Code } from 'lucide-react';
import { Message } from '../types/chat';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isToolCall = message.tool_calls && message.role === 'assistant';
  const isToolResponse = message.role === 'tool';
  const isTyping = message.isTyping; // Prüfe, ob es eine "Tippen"-Nachricht ist

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
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : isToolCall
            ? 'bg-purple-100 text-purple-800'
            : isToolResponse
            ? 'bg-orange-100 text-orange-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {/* "Tippen"-Nachricht anzeigen */}
        {isTyping ? (
          <div className="flex space-x-1">
            <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce animation-delay-200"></span>
            <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce animation-delay-400"></span>
          </div>
        ) : (
          // Typische Nachrichten anzeigen
          Array.isArray(message.content) ? (
            message.content.map((item, idx) => (
              <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]}>
                {item.text}
              </ReactMarkdown>
            ))
          ) : typeof message.content === 'string' ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
          ) : null
        )}

        {/* Tool-Details anzeigen */}
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