import React, { useState, useRef } from 'react';
import { 
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Camera as CameraIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Description as FileTextIcon
} from '@mui/icons-material';
import { uploadFile } from '../utils/api';

interface ChatInputProps {
  onSendMessage: (message?: string, files?: File[]) => void;
  disabled?: boolean;
  InputMessage: string;
  allowFileUpload?: boolean;
  allowCamera?: boolean;
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkIsMobile = () => {
      const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled, 
  InputMessage,
  allowFileUpload = true,
  allowCamera = true
}) => {
  const isMobile = useIsMobile();
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      try {
        const file = e.target.files[0];
        setSelectedFile([file]);
        const fileId = await uploadFile(file);
        setUploadedFileId(fileId.file_id);
        setSelectedFileType(file.type.startsWith('application/pdf') ? 'pdf_file' : 'image_file');
      } catch (error) {
        console.error('Fehler beim Upload:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();

      if (uploadedFileId) {
        setInput('');
        setSelectedFile(null);
        setUploadedFileId(null);
        resetTextareaHeight();
      await onSendMessage(input || undefined, selectedFile || undefined);
    } else if (input.trim()) {
      setInput('');
      setSelectedFile(null);
      setUploadedFileId(null);
      resetTextareaHeight();
      await onSendMessage(input);
    }
  }
  catch (error) {
    console.error('Fehler beim Senden der Nachricht:', error);
  }
};

  const handleCameraCapture = async () => {
    try {
      // Prüfen ob es ein mobiles Gerät ist
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // Mobile Version mit file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = async (e) => {
          const target = e.target as HTMLInputElement;
          if (target.files && target.files[0]) {
            await handleCapturedFile(target.files[0]);
          }
        };
        input.click();
      } else {
        // Desktop Version mit getUserMedia
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoElement = document.createElement('video');
        const canvas = document.createElement('canvas');
        
        videoElement.srcObject = stream;
        await videoElement.play();

        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        canvas.getContext('2d')?.drawImage(videoElement, 0, 0);

        stream.getTracks().forEach(track => track.stop());

        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            await handleCapturedFile(file);
          }
        }, 'image/jpeg');
      }
    } catch (error) {
      console.error('Fehler beim Zugriff auf die Kamera:', error);
    }
  };

  // Hilfsfunktion für die Dateiverarbeitung
  const handleCapturedFile = async (file: File) => {
    setIsUploading(true);
    try {
      setSelectedFile([file]);
      const fileId = await uploadFile(file);
      setUploadedFileId(fileId.file_id);
      setSelectedFileType(file.type.startsWith('application/pdf') ? 'pdf_file' : 'image_file');
    } catch (error) {
      console.error('Fehler beim Upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {selectedFile && (
        <Box sx={{ display: 'flex', gap: 1, px: 1 }}>
          {selectedFile.map((file, index) => (
            <Paper
              key={index}
              sx={{
                position: 'relative',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              {file.type.startsWith('application/pdf') ? (
                <FileTextIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              ) : (
                <ImageIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              )}
              <Typography variant="body2" color="text.secondary">
                {file.name}
              </Typography>
              {isUploading ? (
                <CircularProgress
                  size={20}
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8
                  }}
                />
              ) : (
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadedFileId(null);
                  }}
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'error.dark'
                    }
                  }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Paper>
          ))}
        </Box>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder={InputMessage}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              paddingBottom: '50px', // Platz für die Buttons
            }
          }}
          InputProps={{
            endAdornment: (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  paddingTop: 10,
                  left: 6,
                  right: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  pt: 1,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {allowFileUpload && (
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled || isUploading}
                      size="small"
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': { color: 'text.primary' }
                      }}
                    >
                      <AttachFileIcon />
                    </IconButton>
                  )}
                  {allowCamera && isMobile && (
                    <IconButton
                      onClick={handleCameraCapture}
                      disabled={disabled || isUploading}
                      size="small"
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': { color: 'text.primary' }
                      }}
                    >
                      <CameraIcon />
                    </IconButton>
                  )}
                </Box>
                <IconButton
                  type="submit"
                  disabled={disabled || isUploading || (!input.trim() && !uploadedFileId)}
                  color="primary"
                  size="small"
                >
                  <SendIcon />
                </IconButton>
              </Box>
            ),
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() || uploadedFileId) {
                handleSubmit(e);
              }
            }
          }}
        />

        {allowFileUpload && (
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
          />
        )}
      </Box>
    </Box>
  );
};