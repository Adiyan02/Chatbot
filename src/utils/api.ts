import { ChatRequest } from '../types/chat';
const API_URL = 'http://49.13.25.32:5000/';

export const sendMessage = async (chatRequest: ChatRequest) => {
  const pdfFiles = chatRequest.chatverlauf[0].content.files?.filter(f => f.type === 'pdf_file') || [];
  const imageFiles = chatRequest.chatverlauf[0].content.files?.filter(f => f.type === 'image_file') || [];

  let body = {
    chatverlauf: {
      content: {
        text: chatRequest.chatverlauf[0].content.text,
        files: imageFiles,
      }
    },
    thread_id: chatRequest.threadId || "",
    isDriver: chatRequest.isDriver,
    companies: chatRequest.companies,
    user: chatRequest.user,
    attachments: pdfFiles.map(f => f.data),
  };

  console.log("Sending to backend:", body);
  
  const response = await fetch(API_URL + 'api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return response.json();
};
export const uploadFile = async (file: File): Promise<{file_id: string, file_type: string}> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(API_URL + 'api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Datei-Upload fehlgeschlagen');
    }

    const data = await response.json();
    return {file_id: data.file_id, file_type: data.file_type};
  } catch (error) {
    console.error('Fehler beim Hochladen der Datei:', error);
    throw error;
  }
};