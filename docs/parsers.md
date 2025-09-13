# PDF Parsers Documentation

This document describes the PDF parsing system used in pFinance to extract transaction data from various bank statement formats.

## Architecture Overview

The parsing system uses a plugin-style architecture that allows for easy extension to support new bank formats without breaking existing functionality.

### Core Components

1. **Format Detectors** (`src/lib/formatDetectors.ts`)
   - Automatically identify document formats
   - Use pattern matching to detect bank-specific markers
   - Return format name for specialized parser selection

2. **Specialized Parsers** 
   - Format-specific parsing logic (e.g., `bancoPostaParser.ts`)
   - Extract transactions, balances, and account information
   - Produce standardized Transaction objects

3. **Fallback Parser**
   - Legacy parser in `parse-pdf/route.ts`
   - Handles unknown or generic formats
   - Provides backward compatibility

## Supported Formats

### BancoPosta Format

**Detection Markers:**
- "SALDO E MOVIMENTI"
- "RIEPILOGO CONTO CORRENTE" 
- "LISTA MOVIMENTI"
- "BANCOPOSTA"

**Features:**
- ✅ Account information extraction (IBAN, holder name)
- ✅ Balance extraction (SALDO CONTABILE, SALDO DISPONIBILE)
- ✅ Transaction parsing with dual dates
- ✅ Automatic transaction type detection (income/expense)
- ✅ Structured table parsing

**File:** `src/lib/bancoPostaParser.ts`

**Sample Transaction Format:**
```
Data Contabile | Data Valuta | Descrizione operazioni | Addebiti | Accrediti
13/09/2025 | 11/09/2025 | PAGAMENTO POS STAZIONE FRUTTA ... | 15,24 | 
```

**Limitations:**
- Requires text-based PDF (not scanned images)
- Depends on consistent table structure
- Italian locale date formats only

### Legacy Format

**Detection:** Default fallback when no specific format is detected

**Features:**
- ✅ Flexible date pattern matching
- ✅ Multi-line transaction descriptions
- ✅ Operation type extraction
- ✅ Balance detection with multiple patterns

**File:** `src/app/api/parse-pdf/route.ts`

**Limitations:**
- Less precise than specialized parsers
- May miss format-specific optimizations

## Adding New Bank Formats

To add support for a new bank format:

### 1. Create Format Detector

Add a new detector function in `src/lib/formatDetectors.ts`:

```typescript
export function isNewBankFormat(text: string): boolean {
  const markers = [
    'BANK_SPECIFIC_HEADER',
    'UNIQUE_TABLE_HEADER',
    'DISTINCTIVE_FOOTER'
  ];
  
  return markers.every(marker => text.includes(marker));
}

// Update the registry
export const formatDetectors = [
  { name: 'NewBank', detect: isNewBankFormat },
  { name: 'BancoPosta', detect: isBancoPostaFormat },
  // ... existing detectors
];
```

### 2. Implement Specialized Parser

Create a new parser file `src/lib/newBankParser.ts`:

```typescript
import { Transaction } from '@/types/transaction';
import { parseItalianAmount, formatItalianDate, cleanDescription } from '@/lib/parsingUtils';

export function parseNewBank(text: string): {
  transactions: Transaction[];
  balance: { balance: number | null; date?: string };
  accountInfo: { iban?: string; accountHolder?: string };
} {
  // Implementation specific to new bank format
  // Return standardized structure
}
```

### 3. Integrate with Main Route

Update `src/app/api/parse-pdf/route.ts`:

```typescript
import { parseNewBank } from '@/lib/newBankParser';

// In the main parsing function:
if (detectedFormat === 'NewBank') {
  const result = parseNewBank(fullText);
  // ... handle result
}
```

### 4. Add Tests

Create test file `tests/newBankParser.test.js`:

```javascript
describe('NewBank Parser', () => {
  test('should detect NewBank format correctly', () => {
    expect(isNewBankFormat(sampleText)).toBe(true);
  });
  
  test('should parse transactions correctly', () => {
    const result = parseNewBank(sampleText);
    expect(result.transactions).toHaveLength(expectedCount);
  });
});
```

### 5. Update Documentation

- Add format description to this file
- Update README.md with supported formats
- Add categorization rules to `categorizer.ts` if needed

## Parser Utilities

### Available Helper Functions (`parsingUtils.ts`)

```typescript
// Date handling
formatItalianDate(dateStr: string): string
getMainTransactionDate(pattern: TransactionPattern): string

// Amount parsing
parseItalianAmount(amountStr: string): number

// Description cleaning
cleanDescription(description: string): string
extractMeaningfulDescription(description: string, operationType: string): string

// Type detection
determineTransactionType(operationType: string, description: string): 'income' | 'expense'

// ID generation
generateTransactionId(date: string, amount: number, description: string, index: number): string
```

### Transaction Object Structure

All parsers must produce Transaction objects with this structure:

```typescript
interface Transaction {
  id: string;                    // Unique identifier
  date: string;                  // ISO format YYYY-MM-DD
  dataValuta?: string;           // Value date (optional)
  amount: number;                // Positive number
  description: string;           // Clean, meaningful description
  type: 'income' | 'expense';    // Transaction type
  category: string;              // Will be assigned by categorizer
  is_manual_override: boolean;   // Always false from parser
  manual_category_id: number | null; // Always null from parser
}
```

## Error Handling

### Common Issues and Solutions

1. **Regex Escape Sequences**
   ```typescript
   // ❌ Wrong
   const pattern = /\\d{2}\\/\\d{2}\\/\\d{4}/;
   
   // ✅ Correct
   const pattern = /\d{2}\/\d{2}\/\d{4}/;
   ```

2. **Missing Transactions**
   - Check format detection logic
   - Verify table parsing boundaries
   - Add debug logging for line processing

3. **Incorrect Amounts**
   - Validate Italian number format handling
   - Check decimal separator conversion
   - Ensure positive amounts

4. **Date Parsing Errors**
   - Verify date format expectations
   - Handle both DD/MM/YYYY and DD/MM/YY
   - Use formatItalianDate utility

### Debug Mode

Enable debug logging by adding console.log statements:

```typescript
console.log('Detected format:', detectedFormat);
console.log('Parsed transactions:', result.transactions.length);
console.log('Sample transaction:', result.transactions[0]);
```

## Performance Considerations

- **Large Files**: Process in chunks if memory issues occur
- **Regex Performance**: Use specific patterns, avoid greedy matching
- **Database Inserts**: Leverage batch insertion for multiple transactions
- **Caching**: Consider caching parsed results for duplicate uploads

## Testing Strategy

1. **Unit Tests**: Test individual parser functions
2. **Integration Tests**: Test full PDF processing pipeline  
3. **Fixture Files**: Use real (anonymized) bank statements
4. **Edge Cases**: Empty files, corrupted data, unusual formats
5. **Performance Tests**: Large file handling

## Security Considerations

- **File Validation**: Verify PDF file headers
- **Size Limits**: Prevent oversized file uploads
- **Content Sanitization**: Clean extracted text
- **Data Privacy**: Avoid logging sensitive financial information

## Future Enhancements

- **OCR Support**: Handle scanned/image-based PDFs
- **Machine Learning**: Improve transaction categorization
- **Multi-Language**: Support for non-Italian banks
- **Schema Evolution**: Handle format changes over time
- **Batch Processing**: Process multiple files simultaneously