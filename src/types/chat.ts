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
  content?: string | { type: string; text: string }[] | { arguments?: string; name?: string };
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
    role: 'user' | 'assistant' | 'tool_calls' | 'tool';
    content?: string | { type: string; text: string }[] | { arguments?: string; name?: string };
    function_name?: string;
    tool_call_id?: string;
    tool_calls?: ToolCall[]
  }[];
  threadId?: string;
}
