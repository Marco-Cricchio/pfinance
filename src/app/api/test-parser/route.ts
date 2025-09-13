import { NextResponse } from 'next/server';
import { 
  parseTransactionLine, 
  formatItalianDate, 
  parseItalianAmount
} from '@/lib/parsingUtils';

export async function GET() {
  try {
    
    const results: any = {
      dateTests: {},
      amountTests: {},
      transactionTests: []
    };
    
    // Test date parsing
    results.dateTests = {
      '02/07/24': formatItalianDate('02/07/24'),
      '29/06/24': formatItalianDate('29/06/24'),
      '15/07/2024': formatItalianDate('15/07/2024')
    };
    
    // Test amount parsing
    results.amountTests = {
      '4,99': parseItalianAmount('4,99'),
      '1.234,56': parseItalianAmount('1.234,56'),
      '430,38': parseItalianAmount('430,38'),
      '72,00': parseItalianAmount('72,00')
    };
    
    // Test transaction line parsing with real examples from the PDF
    
    const testLines = [
      "02/07/24   29/06/24   4,99   PAGAMENTO   POS   29/06/2024   20.42 Google   YouTube Member London   GBR   OPERAZIONE   644320   CARTA   65346485",
      "02/07/24   30/06/24   7,07   PAGAMENTO   POS   30/06/2024   11.48 FARMACI   TORRESINA VIA. ROMA   ITA   OPERAZIONE   645809   CARTA   65346485",
      "08/07/24   08/07/24   5,99   ADDEBITO DIRETTO   SDD   ILIAD CID.IT46ZZZ0000013970161009 080724 MAN.ILIAD-FJ3R4O-1",
      "15/07/24   15/07/24   72,00   POSTAGIRO   Da   LIBERTI MARCO   COSIMO   SABRINA   per amazon TRN   EA24071510249103PO1200003200IT   BPPIITRR",
      "02/07/24   02/07/24   44,00   BONIFICO TRN   EA24070293405094480320003200IT   BENEF MARCO CRICCHIO   PER   lug24"
    ];
    
    testLines.forEach((line, index) => {
      
      const result = parseTransactionLine(line);
      
      const testResult = {
        input: line.substring(0, 100) + '...',
        parsed: !!result,
        result: result ? {
          date1: result.date1,
          date2: result.date2,
          amount: result.amount,
          amountParsed: parseItalianAmount(result.amount),
          type: result.type,
          operationType: result.operationType || 'N/A',
          description: result.description.substring(0, 50) + '...'
        } : null
      };
      
      results.transactionTests.push(testResult);
      
      if (result) {
      } else {
      }
    });
    
    const summary = {
      totalTests: testLines.length,
      successfulParses: results.transactionTests.filter((t: any) => t.parsed).length,
      failedParses: results.transactionTests.filter((t: any) => !t.parsed).length
    };
    
    
    return NextResponse.json({
      success: true,
      summary,
      results
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}