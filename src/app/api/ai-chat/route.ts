import { NextRequest, NextResponse } from 'next/server';
import { 
  getOrCreateChatSession, 
  getChatMessages, 
  insertChatMessage,
  initializeWelcomeMessage 
} from '@/lib/database';
import { generateChatCompletion } from '@/lib/aiChat';
import { ChatApiRequest } from '@/types/chat';

// Rate limiting simple in-memory store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // Max 10 messages per minute per user
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit window
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  userLimit.count++;
  return false;
}

/**
 * GET /api/ai-chat - Recupera la conversazione esistente
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Ottieni o crea una sessione
    const session = getOrCreateChatSession(userId);
    
    // Inizializza messaggio di benvenuto se necessario
    initializeWelcomeMessage(session.id);
    
    // Ottieni i messaggi della conversazione
    const messages = getChatMessages(session.id, limit);
    
    return NextResponse.json({
      success: true,
      session,
      messages,
      count: messages.length
    });
    
  } catch (error) {
    console.error('Error in GET /api/ai-chat:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel caricamento della conversazione'
    }, { status: 500 });
  }
}

/**
 * POST /api/ai-chat - Invia un nuovo messaggio e riceve risposta streaming
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatApiRequest = await request.json();
    const { message, userId = 'default_user', sessionId } = body;
    
    if (!message || message.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Messaggio richiesto'
      }, { status: 400 });
    }
    
    // Rate limiting
    if (isRateLimited(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Troppi messaggi. Riprova tra un minuto.'
      }, { status: 429 });
    }
    
    // Ottieni o crea sessione
    const session = sessionId 
      ? { id: sessionId, user_id: userId, created_at: '', last_activity: '' }
      : getOrCreateChatSession(userId);
    
    // Salva il messaggio dell'utente
    const userMessageId = insertChatMessage(session.id, 'user', message.trim());
    if (!userMessageId) {
      throw new Error('Impossibile salvare il messaggio utente');
    }
    
    // Ottieni lo storico della conversazione
    const conversationHistory = getChatMessages(session.id, 20); // Ultimi 20 messaggi per contesto
    
    try {
      // Genera risposta AI con streaming
      const stream = await generateChatCompletion(
        conversationHistory.slice(0, -1), // Escludi l'ultimo messaggio (quello appena inserito)
        message.trim()
      );
      
      // Crea un tee dello stream per poter leggere i dati sia per il client che per il salvataggio
      const [clientStream, saveStream] = stream.tee();
      
      // Salva la risposta completa in background
      let fullResponse = '';
      const saveReader = saveStream.getReader();
      
      // Background task per salvare la risposta
      const saveTask = async () => {
        try {
          while (true) {
            const { done, value } = await saveReader.read();
            
            if (done) {
              // Salva la risposta completa nel database
              if (fullResponse.trim().length > 0) {
                insertChatMessage(session.id, 'assistant', fullResponse.trim());
                console.log('✅ Risposta AI salvata nel database:', fullResponse.length, 'caratteri');
              } else {
                console.warn('⚠️ Nessun contenuto da salvare per la risposta AI');
              }
              break;
            }
            
            // Estrai il contenuto per salvarlo
            const chunk = new TextDecoder().decode(value);
            console.log('🔍 Raw chunk:', JSON.stringify(chunk.substring(0, 100)) + '...');
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                console.log('📦 SSE line:', line.substring(0, 100) + '...');
                try {
                  const data = JSON.parse(line.slice(6));
                  console.log('📊 Parsed data:', { type: data.type, hasContent: !!data.content, contentLength: data.content?.length || 0 });
                  if (data.type === 'chunk' && data.content) {
                    fullResponse += data.content;
                    console.log('✅ Added chunk, total length:', fullResponse.length);
                  } else if (data.type === 'complete' && data.content) {
                    fullResponse = data.content; // Use complete content if available
                    console.log('🏁 Complete response received, length:', fullResponse.length);
                  }
                } catch (parseError) {
                  console.warn('⚠️ Parse error:', parseError, 'for line:', line.substring(0, 50));
                }
              }
            }
          }
        } catch (error) {
          console.error('Errore durante il salvataggio della risposta:', error);
        }
      };
      
      // Avvia il task di salvataggio in background
      saveTask();
      
      // Ritorna lo stream al client
      return new Response(clientStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
      
    } catch (aiError: any) {
      console.error('Errore AI:', aiError);
      
      // Salva un messaggio di errore
      const errorMessage = aiError.message || 'Servizio AI temporaneamente non disponibile';
      insertChatMessage(session.id, 'assistant', `Mi dispiace, ho riscontrato un problema: ${errorMessage}. Riprova tra qualche minuto.`);
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('Error in POST /api/ai-chat:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore interno del server'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/ai-chat - Cancella la conversazione
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    
    const session = getOrCreateChatSession(userId);
    
    // Importa la funzione clearChatSession
    const { clearChatSession } = await import('@/lib/database');
    const cleared = clearChatSession(session.id);
    
    if (cleared) {
      // Reinizializza messaggio di benvenuto
      initializeWelcomeMessage(session.id);
      
      return NextResponse.json({
        success: true,
        message: 'Conversazione cancellata con successo'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Errore nella cancellazione della conversazione'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in DELETE /api/ai-chat:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore interno del server'
    }, { status: 500 });
  }
}

/**
 * OPTIONS - Per CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}