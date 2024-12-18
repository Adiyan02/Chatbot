import React, { useState, useRef } from 'react';
import { Send, Paperclip, Camera, Image, X, FileText } from 'lucide-react';
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
    <div className="flex flex-col gap-2">
      {selectedFile && (
        <div className="flex gap-2 px-2">
          {selectedFile.map((file, index) => (
            <div 
              key={index}
              className="relative bg-gray-100 rounded-lg p-2 flex items-center gap-2 group"
            >
              {file.type.startsWith('application/pdf') ? (
                <FileText className="h-5 w-5 text-gray-500" />
              ) : (
                <Image className="h-5 w-5 text-gray-500" />
              )}
              <span className="text-sm text-gray-600">
                {file.name}
              </span>
              {isUploading ? (
                <div className="absolute -top-2 -right-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadedFileId(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-1 rounded-lg border-gray-300 border">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder={InputMessage}
          rows={1}
          style={{ minHeight: '44px', height: 'auto', maxHeight: '200px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() || uploadedFileId) {
                handleSubmit(e);
              }
            }
          }}
          className="w-full px-4 py-2 
            focus:outline-none focus:inline-none resize-none
            text-sm sm:text-base"
        />

        <div className="flex justify-between items-center px-4 pb-1">
          <div className="flex gap-1">
            {allowFileUpload && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 flex items-center gap-2"
                disabled={disabled || isUploading}
                title="Datei auswählen"
              >
                {isUploading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </button>
            )}

            {allowCamera && isMobile && (
              <button
                type="button"
                onClick={handleCameraCapture}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={disabled || isUploading}
                title="Foto aufnehmen"
              >
                <Camera className="h-5 w-5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={disabled || isUploading || (!input.trim() && !uploadedFileId)}
            className="p-1 text-blue-500 cursor-pointer hover:text-blue-800 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {allowFileUpload && (
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            className="hidden"
          />
        )}
      </form>
    </div>
  );
};