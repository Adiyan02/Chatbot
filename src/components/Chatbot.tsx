import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatRequest } from '../types/chat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { 
  Box, 
  IconButton, 
  Paper, 
  Typography,
  Select,
  MenuItem,
  FormControl,
  styled
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
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

// Styled Components
const ChatbotContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  zIndex: 50,
  width: '100%',
  height: '100dvh',
  [theme.breakpoints.up('sm')]: {
    width: '500px',
    height: 'auto'
  }
}));

const ChatbotWindow = styled(Paper)(({ theme }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.up('sm')]: {
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[10]
  }
}));

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: 0,
  [theme.breakpoints.up('sm')]: {
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius
  }
}));

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
      <IconButton
        onClick={() => setIsOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: position === 'bottom-right' ? 32 : 'auto',
          left: position === 'bottom-left' ? 32 : 'auto',
          backgroundColor: 'primary.main',
          color: 'white',
          '&:hover': {
            backgroundColor: 'primary.dark'
          },
          display: isOpen ? 'none' : 'flex'
        }}
      >
        <ChatIcon />
      </IconButton>

      <ChatbotContainer
        sx={{
          right: position === 'bottom-right' ? { xs: 0, sm: 32 } : 'auto',
          left: position === 'bottom-left' ? { xs: 0, sm: 32 } : 'auto',
          bottom: { xs: 0, sm: 32 },
          transform: isOpen ? 'translateY(0)' : 'translateY(100vh)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <ChatbotWindow>
          <Header>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" >
                {greetingsTitle[user.lang]}
              </Typography>
              
              {!isDriver && (
                <FormControl size="small" variant="outlined">
                  <Select
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
                    sx={{
                      color: 'white',
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.5)'
                      }
                    }}
                  >
                    {companys.map(company => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                color="inherit"
                onClick={() => setIsMinimized(!isMinimized)}
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                <MinimizeIcon />
              </IconButton>
              <IconButton color="inherit" onClick={() => setIsOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Header>

          {!isMinimized && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              height: '100%',
              minHeight: { xs: '50vh', sm: '30vh' },
              maxHeight: { xs: '100vh', sm: '70vh' }
            }}>
              <Box sx={{ 
                flexGrow: 1,
                overflow: 'auto',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </Box>

              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={isProcessing}
                  InputMessage={greetingsInputMessage[user.lang]}
                  allowFileUpload={allowFileUpload}
                  allowCamera={allowCamera}
                />
              </Box>
            </Box>
          )}
        </ChatbotWindow>
      </ChatbotContainer>
    </>
  );
}; 