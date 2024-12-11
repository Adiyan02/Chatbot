import React, { useState, useRef } from 'react';
import { Send, Paperclip, Camera, Image, X } from 'lucide-react';
import { uploadFile } from '../utils/api';

interface ChatInputProps {
  onSendMessage: (message?: string, files?: File[]) => void;
  disabled?: boolean;
  InputMessage: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled, InputMessage }) => {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      try {
        const file = e.target.files[0];
        setSelectedFile([file]);
        const fileId = await uploadFile(file);
        setUploadedFileId(fileId);
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
    e.preventDefault();
    setInput('');
    setSelectedFile(null);
    setUploadedFileId(null);
    resetTextareaHeight();
    if (uploadedFileId) {
      await onSendMessage(input || undefined, selectedFile || undefined);
    } else if (input.trim()) {
      await onSendMessage(input);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoElement = document.createElement('video');
      const canvas = document.createElement('canvas');
      
      videoElement.srcObject = stream;
      await videoElement.play();

      // Bild aufnehmen
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      canvas.getContext('2d')?.drawImage(videoElement, 0, 0);

      // Stream beenden
      stream.getTracks().forEach(track => track.stop());

      // Canvas zu Blob konvertieren
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          setIsUploading(true);
          try {
            setSelectedFile([file]);
            const fileId = await uploadFile(file);
            setUploadedFileId(fileId);
          } catch (error) {
            console.error('Fehler beim Upload:', error);
          } finally {
            setIsUploading(false);
          }
        }
      }, 'image/jpeg');
    } catch (error) {
      console.error('Fehler beim Zugriff auf die Kamera:', error);
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
              <Image className="h-5 w-5 text-gray-500" />
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

            <button
              type="button"
              onClick={handleCameraCapture}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              disabled={disabled || isUploading}
              title="Foto aufnehmen"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>

          <button
            type="submit"
            disabled={disabled || isUploading || (!input.trim() && !uploadedFileId)}
            className="p-1 text-blue-500 cursor-pointer hover:text-blue-800 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </form>
    </div>
  );
};