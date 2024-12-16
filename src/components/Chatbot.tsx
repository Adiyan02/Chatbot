import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatRequest } from '../types/chat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { MessageCircle, X, Minimize2, ChevronDown } from 'lucide-react';
import { sendMessage, uploadFile } from '../utils/api';

interface ChatbotProps {
  companys: { name: string; id: string; }[];
  user: { name: string; lang: SupportedLanguages; id: string; };
  position?: 'bottom-right' | 'bottom-left';
  isDriver: boolean;
  allowFileUpload?: boolean;
  allowCamera?: boolean;
}

type SupportedLanguages = 'de' | 'en' | 'ar' | 'tr';

export const Chatbot: React.FC<ChatbotProps> = ({ 
  companys, 
  user,
  position = 'bottom-right',
  isDriver,
  allowFileUpload = true,
  allowCamera = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const greetings: Record<SupportedLanguages, string> = {
    de: `Hallo, ${user.name}! Wie kann ich Ihnen helfen?`,
    en: `Hello, ${user.name}! How can I assist you?`,
    ar: `مرحبًا، ${user.name}! كيف يمكنني ساعدتك؟`,
    tr: `Merhaba, ${user.name}! Size nasıl yardımcı olabilirim?`
  };
  const greetingsTitle: Record<SupportedLanguages, string> = {
    de: `Support Chat`,
    en: `Support Chat`,
    ar: `دردشة الدعم`,
    tr: `Destek Chat`
  };
  const greetingsInputMessage: Record<SupportedLanguages, string> = {
    de: `Nachricht eingeben...`,
    en: `Enter message...`,
    ar: `اكتب رسالة...`,
    tr: `Mesaj girin...`
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: {
        text: {
          type: 'text',
          text: greetings[user.lang] || greetings['de'],
        },
      },
      timestamp: new Date(),
    },
  ]);
  const [selectedCompany, setSelectedCompany] = useState(companys[0]);

  const typingMessage: Message = {
    id: 'typing',
    role: 'assistant',
    isTyping: true,
    content: {
      text: {
        type: 'text',
        text: '',
      },
    },
    timestamp: new Date(),
  };

  const handleSendMessage = async (textMessage?: string, files?: File[]) => {
    if (!textMessage && (!files || files.length === 0)) return;
    
    setIsProcessing(true);
    try {
      let fileIds: { type: "image_file" | "image_url"; data: string }[] = [];
      
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: {
          text: {
            type: 'text',
            text: textMessage || (files && files.length > 0 && !textMessage ? 'Bitte analysieren Sie das Dokument.' : ''),
          },
          files: files?.map(file => ({
            type: 'image_file' as const,
            data: 'uploading'
          }))
        },
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setMessages(prev => [...prev, typingMessage]);

      if (files && files.length > 0) {
        fileIds = await Promise.all(files.map(async file => {
          const response = await uploadFile(file);
          return {
            type: 'image_file' as const,
            data: response.file_id,
            extracted_text: response.extracted_text
          };
        }));
      }

      const chatRequest: ChatRequest = {
        chatverlauf: [{
          ...userMessage,
          content: {
            ...userMessage.content,
            files: fileIds
          }
        }],
        threadId: threadId || undefined,
        isDriver,
        companies: [selectedCompany],
        user
      };

      const response = await sendMessage(chatRequest);

      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== 'typing');
        if (!response.success) {
          return [...withoutTyping, {
            id: Date.now().toString(),
            role: 'assistant',
            content: {
              text: {
                type: 'text',
                text: `Fehler: ${response.error}`,
              },
            },
            timestamp: new Date(),
          }];
        }

        if (!threadId && response.response.id) {
          setThreadId(response.response.id);
        }

        return [...withoutTyping, {
          id: Date.now().toString(),
          role: 'assistant',
          content: {
            text: {
              type: 'text',
              text: response.response.message,
            },
          },
          timestamp: new Date(),
        }];
      });

    } catch (error) {
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== 'typing');
        return [...withoutTyping, {
          id: Date.now().toString(),
          role: 'assistant',
          content: {
            text: {
              type: 'text',
              text: 'Entschuldigung, ein Fehler ist aufgetreten.',
            },
          },
          timestamp: new Date(),
        }];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <>
      {/* Chatbot Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${positionClasses[position]} z-50 bg-blue-500 text-white 
          rounded-full p-4 shadow-lg hover:bg-blue-600 transition-all duration-300
          ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chatbot Window */}
      <div className={`fixed z-50 
        w-full h-[100dvh] sm:w-[500px] sm:h-auto
        ${position === 'bottom-right' ? 'right-0 sm:right-4' : 'left-0 sm:left-4'}
        bottom-0 sm:bottom-4
        m-0 sm:m-4
        transition-all duration-300 ease-in-out
        ${isOpen 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-[100vh] sm:translate-y-[50vh] opacity-0 pointer-events-none'}`}
      >
        <div className={`bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full 
          flex flex-col transition-all duration-300
          ${isMinimized ? 'sm:h-[60px]' : ''}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-blue-500 text-white p-4 rounded-none sm:rounded-t-lg">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold">{greetingsTitle[user.lang]}</h2>
              {!isDriver && (
                <div className="relative group">
                  <select
                    value={selectedCompany.id}
                    onChange={(e) => {
                      const company = companys.find(c => c.id === e.target.value);
                      if (company) {
                        setSelectedCompany(company);
                        setMessages([{
                          id: '1',
                          role: 'assistant',
                          content: {
                            text: {
                              type: 'text',
                              text: greetings[user.lang] || greetings['de'],
                            },
                          },
                          timestamp: new Date(),
                        }]);
                        setThreadId(null);
                      }
                    }}
                    className="appearance-none bg-transparent text-white/90 text-sm 
                      pl-2 pr-7 py-1 rounded border border-white/20 
                      cursor-pointer hover:bg-white/10 focus:outline-none 
                      focus:border-white/30 transition-all"
                  >
                    {companys.map(company => (
                      <option 
                        key={company.id} 
                        value={company.id}
                        className="bg-blue-600 text-white"
                      >
                        {company.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 
                    text-white/70 group-hover:text-white/90 pointer-events-none transition-colors" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="hover:bg-blue-600 p-1 rounded sm:block hidden"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-blue-600 p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Chat Container */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col h-full min-h-[50vh] sm:min-h-[30vh] max-h-[100vh] sm:max-h-[70vh]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t mt-auto bg-white">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={isProcessing}
                  InputMessage={greetingsInputMessage[user.lang]}
                  allowFileUpload={allowFileUpload}
                  allowCamera={allowCamera}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}; 