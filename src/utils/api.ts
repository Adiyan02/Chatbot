import { ChatRequest } from '../types/chat';
const API_URL = 'http://127.0.0.1:5000/';

export const sendMessage = async (chatRequest: ChatRequest) => {
  let body: any = {}
  if(chatRequest.threadId){
    body= {
      chatverlauf: chatRequest.chatverlauf[0].content,
      thread_id: chatRequest.threadId
    };
  }else{
    body= {
      chatverlauf: chatRequest.chatverlauf[0].content,
      thread_id: ""
    };
  }
  

  // Falls threadId existiert und nicht leer ist, senden
    
  console.log(body)
  const response = await fetch(API_URL + 'api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log(response);
  return response.json();
};
