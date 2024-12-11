import { ChatRequest } from '../types/chat';
const API_URL = 'http://127.0.0.1:5000/';

export const sendMessage = async (chatRequest: ChatRequest) => {
  let body = {
    chatverlauf: {
      content: {
        text: chatRequest.chatverlauf[0].content.text,
        files: chatRequest.chatverlauf[0].content.files || [],
      }
    },
    thread_id: chatRequest.threadId || "",
    isDriver: chatRequest.isDriver,
    companies: chatRequest.companies,
    user: chatRequest.user

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
export const uploadFile = async (file: File): Promise<string> => {
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
    return data.file_id;
  } catch (error) {
    console.error('Fehler beim Hochladen der Datei:', error);
    throw error;
  }
};