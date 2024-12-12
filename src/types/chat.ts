interface ToolCallFunction {
  name: string;
  arguments: string;
}

interface ToolCall {
  id: string;
  type: string;
  function: ToolCallFunction;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool_calls' | 'tool';
  content: MessageContent;
  timestamp: Date | undefined;
  function_name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  isTyping?: boolean; // Neue Eigenschaft

}
export interface TicketReport {
  licensePlate: string;
  dateTime: string;
  location: string;
  ticketType: string;
}

export interface ChatRequest {
  chatverlauf: {
    content: MessageContent;
  }[];
  threadId?: string | undefined;
  isDriver: boolean;
  companies: { name: string; id: string; }[];
  user: { name: string; lang: string; id: string; };
  attachments?: string[];
}

export type MessageContent = {
  text: {
    type: 'text';
    text: string;
  };
  files?: {
    type: 'image_url' | 'image_file';
    data: string;
  }[];
};

export type FileType = 'image_file' | 'pdf_file';
