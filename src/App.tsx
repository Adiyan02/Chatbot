import React, { useState } from 'react';
import { Message,ChatRequest } from './types/chat';
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

    // Temporäre "Tippen"-Nachricht hinzufügen
    const typingMessage: Message = {
      id: 'typing', // Eine eindeutige ID für die "Tippen"-Nachricht
      role: 'assistant',
      isTyping: true, // Kennzeichne diese Nachricht als "Tippen"
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
      const chatverlauf: Message[] = messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        function_name: msg.function_name,
        tool_call_id: msg.tool_call_id,
        tool_calls: msg.tool_calls,
      }));

      // Füge die aktuelle Nachricht hinzu
      chatverlauf.push({
        role: 'user',
        content: [{ type: 'text', text: content }],
        function_name: undefined,
        tool_call_id: undefined,
        id: "",
        timestamp: undefined
      });

      const chatRequest: ChatRequest = { chatverlauf };
      const response = await sendMessage(chatRequest);
      if (response.success) {
        const { message, tools_used } = response.response;

        // Mapping von tool_call_id zu function_name erstellen
        const toolCallIdToFunctionName: Record<string, string> = {};
        setMessages((prev) => prev.filter(msg => msg.id !== 'typing'));

        const newMessages: Message[] = [];

        tools_used?.forEach((tool: any) => {
          if (tool.role === 'assistant' && tool.tool_calls?.length > 0) {
            const toolCall = tool.tool_calls[0];

            const functionName = toolCall.function?.name || 'Unbekanntes Tool';
            const toolCallId = toolCall.id || 'Unbekannte ID';
            const arguments_list = toolCall.function.arguments|| 'Unbekannte ID';

            // Mapping speichern
            toolCallIdToFunctionName[toolCallId] = functionName;
            const toolCallMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              tool_calls: [
                {
                  id: toolCallId,
                  type: "function",
                  function: {
                    name: functionName,
                    arguments: arguments_list,
                  },
                },
              ],
              timestamp: new Date(),
            };

            newMessages.push(toolCallMessage);
          }

          if (tool.role === 'tool') {
            const toolCallId = tool.tool_call_id;

            // function_name aus dem Mapping abrufen

            const toolResponseMessage: Message = {
              id: Date.now().toString(),
              role: 'tool',
              tool_call_id: toolCallId,
              content: tool.content,
              timestamp: new Date(),
            };

            newMessages.push(toolResponseMessage);
          }
        });

        // Assistent-Antwort hinzufügen
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: [{ type: 'text', text: message }],
          timestamp: new Date(),
        };

        newMessages.push(assistantMessage);

        setMessages((prev) => [...prev, ...newMessages]);
      } else {
        setMessages((prev) => prev.filter(msg => msg.id !== 'typing'));

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
      setMessages((prev) => prev.filter(msg => msg.id !== 'typing'));
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
            Assistent für Ihr Unternehmen
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