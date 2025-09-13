export interface Transaction {
  id: string;
  date: string;
  dataValuta?: string;
  amount: number;
  description: string;
  category?: string;
  type: 'income' | 'expense';
  balance?: number;
  manual_category_id?: number | null;
  is_manual_override?: boolean;
  operationType?: string; // Type of operation from PDF (PAGAMENTO POS, BONIFICO, etc.)
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string | ArrayBuffer;
  isBase64?: boolean;
}

export interface ParsedData {
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
}