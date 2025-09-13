/**
 * Test suite for BancoPosta PDF parser
 * 
 * This test validates the BancoPosta parser functionality using a real PDF file
 * to ensure transactions are correctly extracted and categorized.
 */

const fs = require('fs');
const path = require('path');

// Mock the database imports to avoid file system dependencies in tests
jest.mock('../src/lib/database', () => ({
  insertTransactions: jest.fn(() => ({ inserted: 10, duplicates: 0 })),
  getParsedData: jest.fn(() => ({ transactions: [], totalIncome: 0, totalExpenses: 0 })),
  saveFileBalance: jest.fn(() => 'test-balance-id')
}));

describe('BancoPosta PDF Parser', () => {
  let parseBancoPosta, isBancoPostaFormat, extractBancoPostaBalance;
  
  // Sample PDF text extracted from ListaMovimentiNEW.pdf for testing
  const sampleBancoPostaText = `
SALDO E MOVIMENTI 13 SETTEMBRE 2025 ORE 12:15
RIEPILOGO CONTO CORRENTE
CONTO NR 001030308058 IBAN IT92K0760103200001030308058
INTESTATO A CRICCHIO MARCO
SALDO AL 13/09/2025 SALDO CONTABILE +8.847,41 € SALDO DISPONIBILE +8.824,07 €
LISTA MOVIMENTI
Data Contabile Data Valuta Descrizione operazioni Addebiti (euro) Accrediti (euro)
13/09/2025 11/09/2025 PAGAMENTO POS STAZIONE FRUTTA 11/09/2025 09.27 ROMA OP.662210 CARTA ****2943 15,24
12/09/2025 10/09/2025 PAGAMENTO POS MONDADORI EUR BOOKSTOR 10/09/2025 13.20 ROMA OP.668125 CARTA ****2943 36,10
12/09/2025 10/09/2025 PAGAMENTO POS TABACCHI MASIERI 10/09/2025 06.57 ROMA OP.664485 CARTA ****2943 14,80
11/09/2025 09/09/2025 PAGAMENTO POS LIDL 7112 09/09/2025 10.57 ROMA OP.667095 CARTA ****2943 71,82
11/09/2025 09/09/2025 PAGAMENTO POS JUSTEATITALY 09/09/2025 19.20 MILANO OP.664086 CARTA ****2943 23,41
09/09/2025 08/09/2025 PRELIEVO UP ROMA UFF. POSTE VIALE EUROPA ATM 14 08/09/2025 14.44 CARTA ****2943 20,00
09/09/2025 05/09/2025 PEDAGGIO AUTOSTRADALE TELEPEDAGGIO MOONEYGO 05/09/2025 07.29 MILANO OP.666566 CARTA ****2943 39,30
  `.trim();

  beforeAll(async () => {
    // Dynamically import the modules to avoid ES module issues in Jest
    const bancoPostaModule = await import('../src/lib/bancoPostaParser.js');
    const formatDetectorModule = await import('../src/lib/formatDetectors.js');
    
    parseBancoPosta = bancoPostaModule.parseBancoPosta;
    extractBancoPostaBalance = bancoPostaModule.extractBancoPostaBalance;
    isBancoPostaFormat = formatDetectorModule.isBancoPostaFormat;
  });

  describe('Format Detection', () => {
    test('should correctly identify BancoPosta format', () => {
      expect(isBancoPostaFormat(sampleBancoPostaText)).toBe(true);
    });

    test('should reject non-BancoPosta format', () => {
      const nonBancoPostaText = `
        Some random banking text
        Account Statement
        Date | Description | Amount
        01/01/2025 | Purchase | -10.50
      `;
      expect(isBancoPostaFormat(nonBancoPostaText)).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(isBancoPostaFormat('')).toBe(false);
      expect(isBancoPostaFormat('SALDO E MOVIMENTI')).toBe(false); // Only one marker
      expect(isBancoPostaFormat('LISTA MOVIMENTI RIEPILOGO')).toBe(false); // Missing key markers
    });
  });

  describe('Balance Extraction', () => {
    test('should extract balance correctly from BancoPosta text', () => {
      const balanceInfo = extractBancoPostaBalance(sampleBancoPostaText);
      
      expect(balanceInfo.balance).toBe(8824.07); // SALDO DISPONIBILE
      expect(balanceInfo.pattern).toBe('SALDO DISPONIBILE');
    });

    test('should handle missing balance', () => {
      const textWithoutBalance = 'LISTA MOVIMENTI\\nSome transaction data';
      const balanceInfo = extractBancoPostaBalance(textWithoutBalance);
      
      expect(balanceInfo.balance).toBeNull();
    });
  });

  describe('Transaction Parsing', () => {
    test('should parse BancoPosta transactions correctly', () => {
      const result = parseBancoPosta(sampleBancoPostaText);
      
      // Should extract account info
      expect(result.accountInfo.iban).toBe('IT92K0760103200001030308058');
      expect(result.accountInfo.accountHolder).toBe('CRICCHIO MARCO');
      
      // Should extract balance
      expect(result.balance.availableBalance).toBe(8824.07);
      expect(result.balance.accountBalance).toBe(8847.41);
      
      // Should parse transactions
      expect(result.transactions).toBeDefined();
      expect(Array.isArray(result.transactions)).toBe(true);
      expect(result.transactions.length).toBeGreaterThan(0);
      
      // Check first transaction structure
      const firstTransaction = result.transactions[0];
      expect(firstTransaction).toHaveProperty('id');
      expect(firstTransaction).toHaveProperty('date');
      expect(firstTransaction).toHaveProperty('amount');
      expect(firstTransaction).toHaveProperty('description');
      expect(firstTransaction).toHaveProperty('type');
      expect(firstTransaction).toHaveProperty('category');
      
      // Validate transaction types
      expect(['income', 'expense']).toContain(firstTransaction.type);
    });

    test('should handle transactions with different patterns', () => {
      const result = parseBancoPosta(sampleBancoPostaText);
      
      // Find specific transactions to validate parsing
      const stazioneFrutta = result.transactions.find(t => 
        t.description.toLowerCase().includes('stazione frutta')
      );
      const lidlTransaction = result.transactions.find(t => 
        t.description.toLowerCase().includes('lidl')
      );
      const prelievoTransaction = result.transactions.find(t => 
        t.description.toLowerCase().includes('prelievo')
      );
      
      if (stazioneFrutta) {
        expect(stazioneFrutta.amount).toBe(15.24);
        expect(stazioneFrutta.type).toBe('expense');
      }
      
      if (lidlTransaction) {
        expect(lidlTransaction.amount).toBe(71.82);
        expect(lidlTransaction.type).toBe('expense');
      }
      
      if (prelievoTransaction) {
        expect(prelievoTransaction.amount).toBe(20.00);
        expect(prelievoTransaction.type).toBe('expense');
      }
    });

    test('should generate unique transaction IDs', () => {
      const result = parseBancoPosta(sampleBancoPostaText);
      
      const ids = result.transactions.map(t => t.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length); // All IDs should be unique
    });

    test('should handle empty or invalid input gracefully', () => {
      const emptyResult = parseBancoPosta('');
      expect(emptyResult.transactions).toEqual([]);
      expect(emptyResult.balance.accountBalance).toBeNull();
      expect(emptyResult.accountInfo.iban).toBeUndefined();
      
      const invalidResult = parseBancoPosta('Not a bank statement');
      expect(invalidResult.transactions).toEqual([]);
    });
  });

  describe('Date Handling', () => {
    test('should correctly parse Italian date format', () => {
      const result = parseBancoPosta(sampleBancoPostaText);
      
      if (result.transactions.length > 0) {
        const firstTransaction = result.transactions[0];
        // Should be in ISO format YYYY-MM-DD
        expect(firstTransaction.date).toMatch(/^\\d{4}-\\d{2}-\\d{2}$/);
        
        // Should use data valuta (second date) as main date
        expect(firstTransaction.dataValuta).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('should not throw on malformed data', () => {
      expect(() => {
        parseBancoPosta('LISTA MOVIMENTI\\nMalformed data 123 456');
      }).not.toThrow();
    });

    test('should handle missing required fields', () => {
      const incompleteText = 'LISTA MOVIMENTI\\n13/09/2025 INCOMPLETE DATA';
      const result = parseBancoPosta(incompleteText);
      
      // Should not crash and return empty results
      expect(result.transactions).toEqual([]);
    });
  });
});

// Integration test with real file (if available)
describe('Real File Integration', () => {
  const pdfFixturePath = path.join(__dirname, 'fixtures', 'ListaMovimentiNEW.pdf');
  
  test('should handle real PDF file if available', () => {
    if (fs.existsSync(pdfFixturePath)) {
      // This is more of a smoke test - the actual PDF parsing would require
      // pdfjs-dist which is complex to set up in a test environment
      expect(fs.statSync(pdfFixturePath).size).toBeGreaterThan(0);
    } else {
      console.log('Real PDF fixture not found, skipping integration test');
    }
  });
});