import axios from 'axios';
import {ChatRequest} from '../types/chat.ts';
const API_URL = 'http://127.0.0.1:5000/';

const api = axios.create({
  baseURL: API_URL,
  timeout: 100000,
});


export const sendMessage = async (chatRequest: ChatRequest) => {
  
  const response = await fetch(API_URL+'/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(chatRequest),
  });
  return response.json();
};