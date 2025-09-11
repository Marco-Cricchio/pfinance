'use client';

import { useState, useEffect } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { Upload, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploader } from '@/components/FileUploader';
import { ParsedData, UploadedFile } from '@/types/transaction';
import { parseCSV } from '@/lib/parsers';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

export default function OverviewPage() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{newTransactions: number, duplicatesIgnored: number, totalInFile: number} | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [accountBalance, setAccountBalance] = useState<number>(9337.78);
  
  const { obfuscateAmount } = useAmountVisibility();

  // Calculate current account balance based on transactions
  const calculateAccountBalance = (transactions: any[]) => {
    if (!transactions || transactions.length === 0) {
      return 9337.78; // Starting balance
    }
    
    // Sort transactions by value date (dataValuta) or regular date
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.dataValuta || a.date);
      const dateB = new Date(b.dataValuta || b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Calculate balance by applying transactions in chronological order
    let currentBalance = 9337.78;
    
    for (const transaction of sortedTransactions) {
      if (transaction.type === 'income') {
        currentBalance += Math.abs(transaction.amount);
      } else if (transaction.type === 'expense') {
        currentBalance -= Math.abs(transaction.amount);
      }
    }
    
    return currentBalance;
  };

  // Load persisted data on startup
  const loadPersistedData = async () => {
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        const data = await response.json();
        setParsedData(data);
        if (data && data.accountBalance !== undefined) {
          setAccountBalance(data.accountBalance);
        } else if (data && data.transactions) {
          const newBalance = calculateAccountBalance(data.transactions);
          setAccountBalance(newBalance);
        }
      }
    } catch (error) {
      console.error('Error loading persisted data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadPersistedData();
    
    // Check for pending file upload from header button
    const checkPendingUpload = () => {
      const pendingUpload = sessionStorage.getItem('pendingUpload');
      if (pendingUpload) {
        try {
          const fileData = JSON.parse(pendingUpload);
          
          // Convert base64 back to ArrayBuffer if needed
          if (fileData.isBase64 && typeof fileData.content === 'string') {
            const binaryString = atob(fileData.content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            fileData.content = bytes.buffer;
          }
          
          sessionStorage.removeItem('pendingUpload');
          handleFileUpload(fileData);
        } catch (error) {
          console.error('Error processing pending upload:', error);
        }
      }
    };
    
    // Small delay to ensure page is ready
    const timer = setTimeout(checkPendingUpload, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleFileUpload = async (file: UploadedFile) => {
    setLoading(true);
    try {
      let data: ParsedData;
      
      if (file.name.endsWith('.csv')) {
        data = parseCSV(file.content as string);
      } else if (file.name.endsWith('.pdf')) {
        const formData = new FormData();
        const blob = new Blob([file.content as ArrayBuffer], { type: 'application/pdf' });
        formData.append('file', blob, file.name);
        
        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Error processing PDF file');
        }
        
        data = await response.json();
      } else if (file.name.match(/\.(xlsx|xls)$/i)) {
        const formData = new FormData();
        const blob = new Blob([file.content as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        formData.append('file', blob, file.name);
        
        const response = await fetch('/api/parse-xlsx', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Excel API Response:', errorText);
          throw new Error(`Error processing Excel file: ${response.status} - ${errorText}`);
        }
        
        data = await response.json();
      } else {
        throw new Error('Unsupported file format. Use CSV, PDF, or Excel (.xlsx/.xls) files.');
      }
      
      if (data._uploadStats) {
        setUploadStats(data._uploadStats);
      }
      
      setParsedData(data);
      
      // Use account balance from API response or recalculate locally
      if (data && data.accountBalance !== undefined) {
        setAccountBalance(data.accountBalance);
      } else if (data && data.transactions) {
        const newBalance = calculateAccountBalance(data.transactions);
        setAccountBalance(newBalance);
      }
    } catch (error) {
      console.error('File parsing error:', error);
      alert('Error processing file. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!parsedData) {
    return (
      <div className="space-y-6">
        {/* Welcome Alert */}
        <div className="bg-secondary border border-secondary p-6 flex items-start gap-4">
          <Upload className="h-6 w-6 text-secondary-foreground mt-1" />
          <div>
            <h3 className="font-semibold text-secondary-foreground mb-2">Welcome to Overview Dashboard</h3>
            <p className="text-secondary-foreground text-sm">Upload your bank statement to see comprehensive financial overview with charts and analytics.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload Financial Data
              </CardTitle>
              <CardDescription>Drop your bank statement here to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                Overview Features
              </CardTitle>
              <CardDescription>What you'll see in this dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-3">
                <li className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-xs font-semibold">💰</div>
                  <div>
                    <div className="font-medium text-sm">Income vs Expenses</div>
                    <div className="text-muted-foreground text-xs">Monthly and yearly trends</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-secondary text-secondary-foreground w-6 h-6 flex items-center justify-center text-xs font-semibold">📊</div>
                  <div>
                    <div className="font-medium text-sm">Category Breakdown</div>
                    <div className="text-muted-foreground text-xs">Spending by categories</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-accent text-accent-foreground w-6 h-6 flex items-center justify-center text-xs font-semibold">📈</div>
                  <div>
                    <div className="font-medium text-sm">Visual Charts</div>
                    <div className="text-muted-foreground text-xs">Interactive graphs and trends</div>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      {uploadStats && (
        <div className="bg-secondary border border-secondary p-4 flex items-center gap-3">
          <div className="bg-secondary-foreground/10 p-2 rounded">
            <Upload className="h-4 w-4 text-secondary-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-secondary-foreground text-sm">Overview Data Loaded!</div>
            <div className="text-secondary-foreground text-xs font-mono">
              <span className="font-semibold">+{uploadStats.newTransactions}</span> new transactions processed
            </div>
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="space-y-4">        
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <div className="stat-card">
            <div className="stat-value text-secondary text-lg lg:text-xl">{obfuscateAmount(accountBalance)}</div>
            <div className="stat-label">Saldo Contabile</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-accent text-lg lg:text-xl">{parsedData.transactions.length}</div>
            <div className="stat-label">Transactions</div>
          </div>
        </div>
      </div>

      {/* Dashboard Component */}
      <Dashboard data={parsedData} />

      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm">Processing file...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}