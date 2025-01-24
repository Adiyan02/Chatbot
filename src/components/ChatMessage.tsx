import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { UserCircle, Bot, Code, Image, FileText } from 'lucide-react';
import { Message } from '../types/chat';
import { Box, Typography, Paper, styled, Link } from '@mui/material';

interface ChatMessageProps {
  message: Message;
}

// Styled Components
const MessageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
}));

const MessageContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<{ isUser?: boolean }>(({ theme, isUser }) => ({
  maxWidth: '80%',
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1, 2),
  backgroundColor: isUser ? theme.palette.primary.main : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
}));

const FilePreview = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
}));

const TypingDots = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  paddingTop: theme.spacing(0.5),
  '& span': {
    width: 8,
    height: 8,
    backgroundColor: theme.palette.grey[600],
    borderRadius: '50%',
    animation: 'bounce 0.8s infinite',
  },
}));

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isToolCall = message.tool_calls && message.role === 'assistant';
  const isToolResponse = message.role === 'tool';
  const isTyping = message.isTyping;

  // Custom components für Markdown
  const components = {
    h1: ({ ...props }) => (
      <Typography variant="h4" gutterBottom {...props} />
    ),
    h2: ({ ...props }) => (
      <Typography variant="h5" gutterBottom {...props} />
    ),
    h3: ({ ...props }) => (
      <Typography variant="h6" gutterBottom {...props} />
    ),
    h4: ({ ...props }) => (
      <Typography variant="subtitle1" gutterBottom {...props} />
    ),
    h5: ({ ...props }) => (
      <Typography variant="subtitle2" gutterBottom {...props} />
    ),
    h6: ({ ...props }) => (
      <Typography variant="body1" gutterBottom {...props} />
    ),
    p: ({ ...props }) => (
      <Typography paragraph {...props} />
    ),
    a: ({ ...props }) => (
      <Link {...props} target="_blank" rel="noopener noreferrer" />
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
      return !inline ? (
        <Paper sx={{ bgcolor: 'grey.900', color: 'grey.100', p: 1.5, my: 1, overflow: 'auto' }}>
          <code className={className} {...props}>{children}</code>
        </Paper>
      ) : (
        <code style={{ 
          backgroundColor: 'rgba(0,0,0,0.1)', 
          padding: '2px 4px', 
          borderRadius: 4,
          fontSize: '0.875em' 
        }} {...props}>
          {children}
        </code>
      );
    },
    blockquote: ({ ...props }) => (
      <Box sx={{ 
        borderLeft: 4, 
        borderColor: 'grey.300',
        pl: 2,
        my: 2,
        fontStyle: 'italic',
        color: 'text.secondary'
      }} {...props} />
    ),
    ul: ({ ...props }) => (
      <Box component="ul" sx={{ pl: 4, mb: 2 }} {...props} />
    ),
    ol: ({ ...props }) => (
      <Box component="ol" sx={{ pl: 4, mb: 2 }} {...props} />
    ),
    li: ({ ...props }) => (
      <Box component="li" sx={{ mb: 1 }} {...props} />
    ),
    table: ({ ...props }) => (
      <Paper sx={{ overflow: 'auto', my: 2 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }} {...props} />
      </Paper>
    ),
    th: ({ ...props }) => (
      <th style={{ 
        border: '1px solid rgba(0,0,0,0.12)', 
        padding: 8, 
        backgroundColor: 'rgba(0,0,0,0.04)' 
      }} {...props} />
    ),
    td: ({ ...props }) => (
      <td style={{ border: '1px solid rgba(0,0,0,0.12)', padding: 8 }} {...props} />
    ),
    hr: ({ ...props }) => (
      <Box component="hr" sx={{ border: 0, borderTop: '1px solid', borderColor: 'divider', my: 2 }} {...props} />
    ),
    strong: ({ ...props }) => (
      <Box component="strong" sx={{ fontWeight: 'bold' }} {...props} />
    ),
    em: ({ ...props }) => (
      <Box component="em" sx={{ fontStyle: 'italic' }} {...props} />
    ),
    del: ({ ...props }) => (
      <Box component="del" sx={{ textDecoration: 'line-through' }} {...props} />
    ),
    img: ({ ...props }) => (
      <Box component="img" sx={{ maxWidth: '100%', my: 2 }} {...props} />
    ),
  };

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection) {
        const plainText = selection.toString();
        e.clipboardData?.setData('text/plain', plainText);
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  return (
    <MessageContainer sx={{ flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <Box sx={{ flexShrink: 0 }}>
        {isUser ? (
          <UserCircle style={{ width: 32, height: 32, color: '#2196f3' }} />
        ) : isToolCall ? (
          <Code style={{ width: 32, height: 32, color: '#9c27b0' }} />
        ) : isToolResponse ? (
          <Code style={{ width: 32, height: 32, color: '#ff9800' }} />
        ) : (
          <Bot style={{ width: 32, height: 32, color: '#4caf50' }} />
        )}
      </Box>

      <MessageContent isUser={isUser}>
        {isTyping ? (
          <TypingDots>
            <span />
            <span style={{ animationDelay: '0.2s' }} />
            <span style={{ animationDelay: '0.4s' }} />
          </TypingDots>
        ) : message.content && 'text' in message.content ? (
          <Box className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeKatex]}
              components={components}
            >
              {message.content.text.text}
            </ReactMarkdown>
          </Box>
        ) : null}

        {isToolCall && message.tool_calls && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              Tool Name: {message.tool_calls[0].function.name}
            </Typography>
          </Box>
        )}

        {isToolResponse && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              Tool Call ID: {message.tool_call_id}
            </Typography>
          </Box>
        )}

        {message.content.files && message.content.files.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            {message.content.files.map((file, index) => (
              <FilePreview key={index}>
                {file.type === 'image_file' ? (
                  <Image style={{ width: 20, height: 20, color: '#757575' }} />
                ) : (
                  <FileText style={{ width: 20, height: 20, color: '#757575' }} />
                )}
                <Typography variant="body2" color="text.secondary">
                  {file.type === 'image_file' ? `Bild ${index + 1}` : `Datei ${index + 1}`}
                </Typography>
                {message.role === 'user' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 16,
                      height: 16,
                      bgcolor: 'success.main',
                      borderRadius: '50%'
                    }}
                  />
                )}
              </FilePreview>
            ))}
          </Box>
        )}
      </MessageContent>
    </MessageContainer>
  );
};
