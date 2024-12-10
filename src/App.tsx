import React, { useState } from 'react';
import { Message, ChatRequest } from './types/chat';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { sendMessage } from './utils/api';
import { Car } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hallo! Ich bin hier, um Ihnen zu Helfen. Was kann ich für Sie tun?' }],
      timestamp: new Date(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  // NEU: State für threadId
  const [threadId, setThreadId] = useState<string | null>(null);

  const typingMessage: Message = {
    id: 'typing',
    role: 'assistant',
    isTyping: true,
    timestamp: new Date(),
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: [{ type: 'text', text: content }],
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, typingMessage]);
    setIsProcessing(true);

    try {
      const lastUserMessage = userMessage;

      const chatRequest: ChatRequest = {
        chatverlauf: [lastUserMessage],
      };

      // Wenn bereits eine threadId existiert, mitgeben
      if (threadId) {
        chatRequest.threadId = threadId;
      }

      const response = await sendMessage(chatRequest);

      // Beispielhafte Response-Struktur:
      // {
      //   success: true,
      //   response: {
      //     id: "THREAD_ID", // threadId, die vom Backend kommt
      //     message: "Antwort des Assistenten"
      //   }
      // }
      
      setMessages((prev) => prev.filter((msg) => msg.id !== 'typing'));

      if (response.success) {
        // Wenn noch keine threadId und die API liefert eine, dann hier setzen
        if (!threadId && response.response.id) {
          setThreadId(response.response.id);
        }

        const { message } = response.response;

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: [{ type: 'text', text: message }],
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: [{ type: 'text', text: `Fehler: ${response.error}` }],
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== 'typing'));
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: [{ type: 'text', text: 'Entschuldigung, ein Fehler ist aufgetreten.' }],
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <Car className="w-8 h-8 text-blue-500" />
          <h1 className="text-xl font-semibold text-gray-800">
            FahrerApp Assistent
          </h1>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 overflow-hidden flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-gray-50 pt-4">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
