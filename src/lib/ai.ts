import OpenAI from 'openai';
import { ParsedData, Transaction } from '@/types/transaction';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface AIInsight {
  type: 'suggestion' | 'warning' | 'tip';
  title: string;
  description: string;
  category?: string;
}

// Lista dei modelli in ordine di preferenza (principale + fallback)
const AI_MODELS = [
  'deepseek/deepseek-r1-0528:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-001'
];

export async function generateFinancialInsights(data: ParsedData): Promise<AIInsight[]> {
  if (!data.transactions.length) {
    throw new Error('Nessuna transazione disponibile per l\'analisi');
  }

  // Verifica API key
  if (!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
    throw new Error('API key OpenRouter non configurata. Configura NEXT_PUBLIC_OPENROUTER_API_KEY nel file .env.local');
  }

  const prompt = `
Analizza questi dati finanziari e fornisci consigli utili in italiano:

Dati finanziari:
- Entrate totali: €${data.totalIncome.toFixed(2)}
- Uscite totali: €${data.totalExpenses.toFixed(2)}
- Flusso netto: €${data.netFlow.toFixed(2)}
- Numero transazioni: ${data.transactions.length}

Spese per categoria:
${getCategoryBreakdown(data.transactions)}

Transazioni recenti:
${data.transactions.slice(0, 10).map(t => 
  `${t.date}: ${t.description} - €${t.amount.toFixed(2)} (${t.category})`
).join('\n')}

Fornisci 4-6 consigli specifici e personalizati in formato JSON con questa struttura:
{
  "insights": [
    {
      "type": "suggestion|warning|tip",
      "title": "Titolo del consiglio",
      "description": "Descrizione dettagliata del consiglio",
      "category": "categoria se applicabile"
    }
  ]
}

Concentrati su:
- Identificare pattern di spesa problematici specifici
- Suggerire aree di risparmio concrete
- Evidenziare trend positivi o negativi
- Fornire consigli pratici e actionable
- Analizzare le categorie di spesa più significative
- Dare suggerimenti per migliorare il flusso di cassa
`;

  // Prova ogni modello in sequenza
  for (let i = 0; i < AI_MODELS.length; i++) {
    const model = AI_MODELS[i];
    try {
      
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'Sei un consulente finanziario esperto che fornisce consigli pratici e actionable per la gestione del budget personale. Rispondi sempre in italiano con un tono professionale ma accessibile. Analizza i dati forniti e genera consigli specifici e personalizzati.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn(`❌ Risposta vuota da ${model}`);
        continue;
      }

      try {
        const parsed = JSON.parse(content);
        if (parsed.insights && Array.isArray(parsed.insights) && parsed.insights.length > 0) {
          return parsed.insights;
        } else {
          console.warn(`❌ Formato risposta non valido da ${model}`);
          continue;
        }
      } catch (parseError) {
        console.warn(`❌ Errore parsing JSON da ${model}:`, parseError);
        // Prova a estrarre JSON dalla risposta se è embedded in altro testo
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.insights && Array.isArray(parsed.insights)) {
              return parsed.insights;
            }
          } catch (secondParseError) {
            console.warn(`❌ Anche parsing alternativo fallito per ${model}`);
          }
        }
        continue;
      }
    } catch (error: any) {
      console.warn(`❌ Errore con modello ${model}:`, error?.message || error);
      continue;
    }
  }

  // Se tutti i modelli falliscono, lancia errore
  console.error('🚨 Tutti i modelli AI hanno fallito');
  throw new Error('I servizi AI sono temporaneamente non disponibili. Riprova tra qualche minuto.');
}

function getCategoryBreakdown(transactions: Transaction[]): string {
  const categories = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const cat = t.category || 'Altro';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  return Object.entries(categories)
    .sort(([,a], [,b]) => b - a)
    .map(([cat, amount]) => `- ${cat}: €${amount.toFixed(2)}`)
    .join('\n');
}

