import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@/types/transaction';
import { insertTransactions, getParsedData, saveFileBalance } from '@/lib/database';
import { categorizeTransaction } from '@/lib/categorizer';
import {
  parseItalianAmount, 
  generateTransactionId,
  cleanDescription,
  formatItalianDate,
  determineTransactionType
} from '@/lib/parsingUtils';

// Dynamic import for pdfjs-dist to handle ESM in Node.js environment
async function importPdfJs() {
  try {
    // Use legacy build for Node.js compatibility
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Set worker to the distributed worker for Node.js environment
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
    
    return pdfjsLib;
  } catch (error) {
    console.error('Failed to import pdfjs-dist:', error);
    throw new Error('PDF processing library not available');
  }
}

// Helper functions have been moved to src/lib/parsingUtils.ts
// and are now imported at the top of this file

/**
 * Extracts operation type from transaction description
 */
function extractOperationType(description: string): string {
  if (!description) return '';
  
  const desc = description.toUpperCase();
  
  // Look for operation type at the beginning of description
  if (desc.includes('POSTAGIRO')) return 'POSTAGIRO';
  if (desc.includes('BONIFICO')) return 'BONIFICO';
  if (desc.includes('PAGAMENTO POS')) return 'PAGAMENTO POS';
  if (desc.includes('PAGAMENTO')) return 'PAGAMENTO';
  if (desc.includes('ADDEBITO DIRETTO')) return 'ADDEBITO DIRETTO';
  if (desc.includes('ADDEBITO')) return 'ADDEBITO';
  if (desc.includes('PRELIEVO')) return 'PRELIEVO';
  if (desc.includes('ACCR')) return 'ACCR';
  if (desc.includes('ACCREDITO')) return 'ACCREDITO';
  if (desc.includes('F24')) return 'F24';
  if (desc.includes('STIPENDIO')) return 'STIPENDIO';
  
  return '';
}

/**
 * Extracts balance from PDF text using multiple patterns
 * Supports both "SALDO FINALE" and "SALDO DISPONIBILE" formats
 */
function extractBalanceFromPDF(text: string): { balance: number | null; pattern?: string; date?: string } {
  const lines = text.split('\n');
  const balancePatterns = [
    'SALDO FINALE',
    'SALDO DISPONIBILE'
  ];
  
  for (const pattern of balancePatterns) {
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      if (upperLine.includes(pattern)) {
        
        // Try to extract amount from the same line first
        const amountMatch = line.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+)/g);
        
        if (amountMatch && amountMatch.length > 0) {
          // Use the last amount found in the line (usually the balance)
          const lastAmount = amountMatch[amountMatch.length - 1];
          const balance = parseItalianAmount(lastAmount);
          
          // Try to extract date from the same line
          const dateMatch = line.match(/\b(\d{2})\/(\d{2})\/(\d{2})\b/);
          const balanceDate = dateMatch ? formatItalianDate(dateMatch[0]) : undefined;
          
          return { 
            balance, 
            pattern, 
            date: balanceDate 
          };
        }
      }
    }
  }
  
  return { balance: null };
}

export async function POST(request: NextRequest) {
  try {
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    
    if (!file || !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'File PDF richiesto' }, { status: 400 });
    }

    // Check if file is too small (likely corrupted)
    if (file.size < 1000) {
      return NextResponse.json({ error: 'File PDF troppo piccolo o corrotto' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    const pdfjsLib = await importPdfJs();
    
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    
    let fullText = '';
    
    // Extract text from all pages with better layout preservation and column detection
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group items by line (Y position) and sort by X position within each line
      const lineGroups = new Map();
      
      for (let i = 0; i < textContent.items.length; i++) {
        const item = textContent.items[i] as any;
        const currentY = Math.round(item.transform[5]); // Y position (rounded to group nearby items)
        const currentX = item.transform[4]; // X position
        
        if (!lineGroups.has(currentY)) {
          lineGroups.set(currentY, []);
        }
        
        lineGroups.get(currentY).push({
          text: item.str,
          x: currentX,
          y: currentY
        });
      }
      
      // Build text line by line, preserving column structure
      let pageText = '';
      const sortedYPositions = Array.from(lineGroups.keys()).sort((a, b) => b - a); // Top to bottom
      
      for (const yPos of sortedYPositions) {
        const lineItems = lineGroups.get(yPos).sort((a: { x: number }, b: { x: number }) => a.x - b.x); // Left to right
        
        let lineText = '';
        let lastX = null;
        
        for (const item of lineItems) {
          // Add extra spaces for significant X gaps (column separations)
          if (lastX !== null && item.x - lastX > 50) {
            lineText += '   '; // Column separator
          }
          
          lineText += item.text + ' ';
          lastX = item.x;
        }
        
        if (lineText.trim()) {
          pageText += lineText.trim() + '\n';
        }
      }
      
      fullText += pageText + '\n';
    }
    
    
    // Extract balance from PDF text
    const balanceInfo = extractBalanceFromPDF(fullText);
    
    
    // Split text into lines
    const lines = fullText.split('\n').filter(line => line.trim().length > 0);
    
    // Pattern to identify dates
    const datePattern = /\b(\d{2})\/(\d{2})\/(\d{2})\b/g;
    
    const transactions: Transaction[] = [];
    let currentTransaction = null;
    let _lineNumber = 0;
    
    
    for (const line of lines) {
      _lineNumber++;
      const trimmedLine = line.trim();
      
      // Skip empty lines or irrelevant ones
      if (!trimmedLine || 
          trimmedLine.includes('SALDO INIZIALE') ||
          trimmedLine.includes('TOTALE USCITE') ||
          trimmedLine.includes('TOTALE ENTRATE') ||
          trimmedLine.includes('SALDO FINALE') ||
          trimmedLine.includes('CRICCHIO MARCO') ||
          trimmedLine.includes('Pag.')) {
        continue;
      }
      
      // Find all dates in the line
      const dates = [...trimmedLine.matchAll(datePattern)];
      
      if (dates.length >= 2) {
        // If we have a previous transaction, save it
        if (currentTransaction) {
          const cleanedDescription = cleanDescription(currentTransaction.description);
          
          // Extract operation type from description for better classification
          const operationType = extractOperationType(currentTransaction.description);
          const transactionType = determineTransactionType(operationType, cleanedDescription);
          
          
          // Trust the semantic analysis of operation type and description
          
          const dataValuta = formatItalianDate(currentTransaction.dataValuta);
          const uniqueId = generateTransactionId(dataValuta, currentTransaction.amount, cleanedDescription, transactions.length, 'pdf');
          
          const transaction: Transaction = {
            id: uniqueId,
            date: dataValuta, // Use Data Valuta as the main date
            dataValuta: dataValuta,
            amount: currentTransaction.amount,
            description: cleanedDescription,
            category: categorizeTransaction({
              id: uniqueId,
              date: dataValuta,
              amount: currentTransaction.amount,
              description: cleanedDescription,
              type: transactionType,
              is_manual_override: false,
              manual_category_id: null
            } as Transaction),
            type: transactionType
          };
          
          transactions.push(transaction);
        }
        
        // Start a new transaction
        const dataContabile = dates[0][0]; // First date (accounting date)
        const dataValuta = dates[1][0];    // Second date (value date)
        
        // Look for amount after the second date
        const afterSecondDate = trimmedLine.substring(dates[1].index + dates[1][0].length).trim();
        const amountMatch = afterSecondDate.match(/^(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+)/);
        
        if (amountMatch && amountMatch.index !== undefined) {
          const amount = parseItalianAmount(amountMatch[1]);
          const restOfLine = afterSecondDate.substring(amountMatch.index + amountMatch[0].length).trim();
          
          currentTransaction = {
            dataContabile: dataContabile,
            dataValuta: dataValuta,
            amount: amount,
            description: restOfLine
          };
          
        } else {
          // If no amount found, consider the line as continuation
          if (currentTransaction) {
            currentTransaction.description += ' ' + trimmedLine;
          }
        }
      } else if (currentTransaction && dates.length === 0) {
        // Continue the description of the current transaction if no dates
        currentTransaction.description += ' ' + trimmedLine;
      }
    }
    
    // Save the last transaction if present
    if (currentTransaction) {
      const cleanedDescription = cleanDescription(currentTransaction.description);
      
      // Extract operation type from description for better classification
      const operationType = extractOperationType(currentTransaction.description);
      const transactionType = determineTransactionType(operationType, cleanedDescription);
      
      
      // Trust the semantic analysis of operation type and description
      
      const dataValuta = formatItalianDate(currentTransaction.dataValuta);
      const uniqueId = generateTransactionId(dataValuta, currentTransaction.amount, cleanedDescription, transactions.length, 'pdf');
      
      const transaction: Transaction = {
        id: uniqueId,
        date: dataValuta, // Use Data Valuta as the main date
        dataValuta: dataValuta,
        amount: currentTransaction.amount,
        description: cleanedDescription,
        category: categorizeTransaction({
          id: uniqueId,
          date: dataValuta,
          amount: currentTransaction.amount,
          description: cleanedDescription,
          type: transactionType,
          is_manual_override: false,
          manual_category_id: null
        } as Transaction),
        type: transactionType
      };
      
      transactions.push(transaction);
    }
    
    
    if (transactions.length === 0) {
      return NextResponse.json({ error: 'Nessuna transazione trovata nel PDF. Verificare che il formato sia supportato.' }, { status: 400 });
    }
    
    
    // Save transactions to database (automatically avoids duplicates)
    const { inserted, duplicates } = insertTransactions(transactions);
    
    
    // Save balance to file_balances table if found
    if (balanceInfo.balance !== null) {
      const balanceId = saveFileBalance(
        file.name,
        balanceInfo.balance,
        'pdf',
        balanceInfo.date,
        balanceInfo.pattern
      );
      
      if (balanceId) {
      } else {
      }
    } else {
    }
    
    // Retrieve all data from database (including existing transactions)
    const allData = getParsedData();
    
    return NextResponse.json({
      ...allData,
      _uploadStats: {
        newTransactions: inserted,
        duplicatesIgnored: duplicates,
        totalInFile: transactions.length
      }
    });
  } catch (error) {
    console.error('Errore parsing PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json(
      { error: `Errore durante l'elaborazione del PDF: ${errorMessage}` }, 
      { status: 500 }
    );
  }
}

// Parsing complete - no additional helper functions needed
