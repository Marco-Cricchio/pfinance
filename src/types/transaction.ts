export interface Transaction {
  id: string;
  date: string;
  dataValuta?: string;
  amount: number;
  description: string;
  category?: string;
  type: 'income' | 'expense';
  balance?: number;
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