// Chat message types
export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// Chat session types
export interface ChatSession {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  last_activity: string;
}

// API request/response types
export interface ChatApiRequest {
  message: string;
  userId?: string;
  sessionId?: string;
  systemPassword?: string;
}

export interface ChatApiResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
}

// Streaming chat response chunk
export interface ChatStreamChunk {
  type: 'chunk' | 'complete' | 'error';
  content?: string;
  message?: ChatMessage;
  error?: string;
}

// Financial context for AI
export interface FinancialContext {
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  transactionCount: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  recentTransactions: Array<{
    date: string;
    description: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
  }>;
  monthlyTrends?: Array<{
    month: string;
    income: number;
    expenses: number;
    netFlow: number;
  }>;
}

// Chat UI component props
export interface ChatBoxProps {
  userId?: string;
  className?: string;
  maxHeight?: string;
  // Note: Chat sempre mostra importi reali per decisioni informate
}

// Quick action suggestions
export interface QuickSuggestion {
  id: string;
  text: string;
  question: string;
}