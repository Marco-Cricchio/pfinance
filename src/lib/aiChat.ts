import OpenAI from 'openai';
import { ParsedData } from '@/types/transaction';
import { FinancialContext, ChatMessage } from '@/types/chat';
import { getParsedData } from '@/lib/database';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Lista dei modelli in ordine di preferenza (riutilizzando da ai.ts)
const AI_MODELS = [
  'deepseek/deepseek-r1-0528:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-001'
];

/**
 * Prepara il contesto finanziario per l'AI partendo dai dati nel database
 */
export function prepareFinancialContext(): FinancialContext {
  const parsedData = getParsedData();
  
  // Calcola breakdown per categoria
  const categoryTotals = parsedData.transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const cat = t.category || 'Altro';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const categoryBreakdown = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: parsedData.totalExpenses > 0 ? (amount / parsedData.totalExpenses) * 100 : 0
    }));

  // Ultime 10 transazioni per contesto
  const recentTransactions = parsedData.transactions
    .slice(0, 10)
    .map(t => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: t.category || 'Altro',
      type: t.type
    }));

  return {
    totalIncome: parsedData.totalIncome,
    totalExpenses: parsedData.totalExpenses,
    netFlow: parsedData.netFlow,
    transactionCount: parsedData.transactions.length,
    categoryBreakdown,
    recentTransactions
  };
}

/**
 * Genera il prompt di sistema per il consulente finanziario AI
 */
function generateSystemPrompt(financialContext: FinancialContext): string {
  const categoryBreakdownText = financialContext.categoryBreakdown
    .slice(0, 8) // Top 8 categorie
    .map(c => `- ${c.category}: €${c.amount.toFixed(2)} (${c.percentage.toFixed(1)}%)`)
    .join('\n');

  return `Sei un consulente finanziario esperto e professionale specializzato nella gestione del budget personale. 

## CONTESTO FINANZIARIO DELL'UTENTE

- **Entrate totali:** €${financialContext.totalIncome.toFixed(2)}
- **Uscite totali:** €${financialContext.totalExpenses.toFixed(2)}
- **Flusso netto:** €${financialContext.netFlow.toFixed(2)}
- **Numero transazioni:** ${financialContext.transactionCount}

## SPESE PER CATEGORIA

${categoryBreakdownText}

## ULTIME TRANSAZIONI

${financialContext.recentTransactions.slice(0, 5).map(t => 
  `- **${t.date}:** ${t.description} - €${t.amount.toFixed(2)} *(${t.category})*`
).join('\n')}

## ISTRUZIONI

1. **Formato delle risposte:** Usa sempre il formato Markdown per formattare le tue risposte
2. **Lingua:** Rispondi sempre in italiano con un tono professionale ma accessibile
3. **Struttura:** Organizza le risposte con intestazioni (##), liste puntate (-), grassetto (**) e corsivo (*)
4. **Consigli pratici:** Fornisci suggerimenti actionable basati sui dati reali dell'utente
5. **Cifre specifiche:** Quando possibile, cita importi precisi e percentuali dai dati
6. **Completezza:** Sii conciso ma esauriente nelle tue risposte
7. **Trasparenza:** Se l'utente chiede informazioni non presenti nei dati, dillo chiaramente
8. **Responsabilità:** Incoraggia abitudini finanziarie sane e responsabili
9. **Personalizzazione:** Personalizza sempre i consigli sui dati specifici dell'utente

## ESEMPI DI FORMATTAZIONE

- Usa **grassetto** per evidenziare importi e percentuali importanti
- Usa *corsivo* per enfatizzare concetti chiave
- Organizza i consigli in liste numerate (1., 2., 3.) o puntate (-)
- Crea sezioni con intestazioni ## per argomenti diversi
- Usa > per citazioni o avvisi importanti

Puoi analizzare pattern di spesa, suggerire ottimizzazioni, identificare opportunità di risparmio, e rispondere a domande specifiche sui movimenti finanziari dell'utente.`;
}

/**
 * Converte i messaggi del database nel formato OpenAI
 */
function formatMessagesForOpenAI(messages: ChatMessage[], systemPrompt: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt
    }
  ];

  // Aggiungi solo messaggi user e assistant (escludiamo i system messages dal DB)
  messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .forEach(msg => {
      openAIMessages.push({
        role: msg.role,
        content: msg.content
      });
    });

  return openAIMessages;
}

/**
 * Testa se un modello funziona correttamente
 */
async function testModelValidity(
  model: string,
  openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<boolean> {
  try {
    console.log(`🔍 Testing model ${model}...`);
    
    const stream = await openai.chat.completions.create({
      model,
      messages: openAIMessages,
      temperature: 0.7,
      max_tokens: 100, // Test limitato
      stream: true,
    });

    let chunkCount = 0;
    let hasContent = false;
    
    for await (const chunk of stream) {
      chunkCount++;
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content && content.trim().length > 0) {
        console.log(`✅ Model ${model} is working (content found in chunk ${chunkCount})`);
        return true;
      }
      
      // Se dopo 20 chunk non c'è contenuto, considera il modello fallito
      if (chunkCount >= 20) {
        console.log(`⚠️ Model ${model} failed (no content after ${chunkCount} chunks)`);
        return false;
      }
      
      if (chunk.choices[0]?.finish_reason) {
        break;
      }
    }
    
    console.log(`⚠️ Model ${model} completed but no content found`);
    return false;
    
  } catch (error) {
    console.log(`❌ Model ${model} test failed:`, error);
    return false;
  }
}

/**
 * Crea uno stream di risposta per un modello già testato
 */
async function createModelStream(
  model: string,
  openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<ReadableStream<Uint8Array>> {
  const stream = await openai.chat.completions.create({
    model,
    messages: openAIMessages,
    temperature: 0.7,
    max_tokens: 1000,
    stream: true,
  });

  const encoder = new TextEncoder();
  let fullResponseText = '';
  
  return new ReadableStream({
    async start(controller) {
      try {
        let chunkCount = 0;
        
        for await (const chunk of stream) {
          chunkCount++;
          const content = chunk.choices[0]?.delta?.content || '';
          
          if (content) {
            fullResponseText += content;
            
            const sseData = `data: ${JSON.stringify({
              type: 'chunk',
              content
            })}\n\n`;
            
            controller.enqueue(encoder.encode(sseData));
          }
          
          if (chunk.choices[0]?.finish_reason) {
            break;
          }
        }
        
        // Segnala completamento
        const completeData = `data: ${JSON.stringify({
          type: 'complete',
          content: fullResponseText
        })}\n\n`;
        
        controller.enqueue(encoder.encode(completeData));
        controller.close();
        
        console.log(`✅ Chat completata con successo usando ${model}, lunghezza: ${fullResponseText.length}`);
        
      } catch (error) {
        console.error(`❌ Errore durante streaming:`, error);
        
        const errorData = `data: ${JSON.stringify({
          type: 'error',
          error: 'Errore durante la generazione della risposta'
        })}\n\n`;
        
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    }
  });
}

/**
 * Genera una risposta chat con streaming support e fallback automatico
 */
export async function generateChatCompletion(
  conversationHistory: ChatMessage[],
  newUserMessage: string
): Promise<ReadableStream<Uint8Array>> {
  // Verifica API key
  if (!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || 
      process.env.NEXT_PUBLIC_OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
    throw new Error('API key OpenRouter non configurata. Configura NEXT_PUBLIC_OPENROUTER_API_KEY nel file .env.local');
  }

  const financialContext = prepareFinancialContext();
  const systemPrompt = generateSystemPrompt(financialContext);
  
  // Aggiungi il nuovo messaggio dell'utente alla conversazione
  const messagesWithNewMessage: ChatMessage[] = [
    ...conversationHistory,
    {
      id: Date.now(),
      session_id: '',
      role: 'user' as const,
      content: newUserMessage,
      created_at: new Date().toISOString()
    }
  ];

  const openAIMessages = formatMessagesForOpenAI(messagesWithNewMessage, systemPrompt);

  // Trova un modello funzionante
  for (let i = 0; i < AI_MODELS.length; i++) {
    const model = AI_MODELS[i];
    
    console.log(`🤖 Tentativo ${i + 1}/${AI_MODELS.length} con modello: ${model}`);
    
    try {
      // Prima testa se il modello funziona
      const isWorking = await testModelValidity(model, openAIMessages);
      
      if (isWorking) {
        console.log(`✅ Modello ${model} funziona, creando stream...`);
        return await createModelStream(model, openAIMessages);
      } else {
        console.log(`⚠️ Modello ${model} non funziona, provo il prossimo...`);
        continue;
      }
      
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`❌ Errore con modello ${model}:`, errorMsg);
      
      // Se non è l'ultimo modello, continua con il prossimo
      if (i < AI_MODELS.length - 1) {
        console.log(`🔄 Provo il modello successivo: ${AI_MODELS[i + 1]}`);
        continue;
      }
    }
  }
  
  // Se arriviamo qui, nessun modello funziona
  throw new Error('Tutti i modelli AI sono temporaneamente non disponibili. Riprova tra qualche minuto.');
}
