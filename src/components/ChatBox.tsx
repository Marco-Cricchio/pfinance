'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, MessageCircle, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
// Note: Chat sempre mostra importi reali per decisioni informate
import { ChatMessage, ChatBoxProps, QuickSuggestion } from '@/types/chat';

// Quick suggestion prompts for getting started
const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  {
    id: '1',
    text: 'Spese fisse',
    question: 'Come posso ridurre le mie spese fisse mensili?'
  },
  {
    id: '2',
    text: 'Flusso di cassa',
    question: 'Qual è il mio flusso di cassa medio mensile?'
  },
  {
    id: '3',
    text: 'Categoria principale',
    question: 'In quale categoria spendo di più e come posso ottimizzarla?'
  },
  {
    id: '4',
    text: 'Analisi trend',
    question: 'Ci sono dei pattern nelle mie spese che dovrei conoscere?'
  }
];

export function ChatBox({ 
  userId = 'default_user', 
  className = '',
  maxHeight = '600px' 
}: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Chat mostra sempre importi reali per una consulenza accurata

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversation history on component mount
  useEffect(() => {
    loadConversationHistory();
  }, [userId]);

  // Scroll to bottom when messages or streaming content changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage, scrollToBottom]);

  // Load conversation history from API
  const loadConversationHistory = async () => {
    try {
      setLoadingInitial(true);
      const response = await fetch(`/api/ai-chat?userId=${encodeURIComponent(userId)}&limit=50`);
      
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }
      
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: unknown) {
      console.error('Error loading conversation:', err);
      setError('Errore nel caricamento della conversazione');
    } finally {
      setLoadingInitial(false);
    }
  };

  // Clear conversation
  const clearConversation = async () => {
    try {
      const response = await fetch(`/api/ai-chat?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMessages([]);
        setCurrentStreamingMessage('');
        await loadConversationHistory(); // Reload to get welcome message
      } else {
        throw new Error('Failed to clear conversation');
      }
    } catch (err) {
      console.error('Error clearing conversation:', err);
      setError('Errore nella cancellazione della conversazione');
    }
  };

  // Send message to AI
  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading || isStreaming) return;
    
    const trimmedMessage = message.trim();
    setInputMessage('');
    setError(null);
    setIsLoading(true);
    setIsStreaming(true);
    setCurrentStreamingMessage('');
    
    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: Date.now(),
      session_id: '',
      role: 'user',
      content: trimmedMessage,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Create AbortController for this request
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
          userId
        }),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network error');
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }
      
      let assistantResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk' && data.content) {
                assistantResponse += data.content;
                setCurrentStreamingMessage(assistantResponse);
              } else if (data.type === 'complete') {
                assistantResponse = data.content || assistantResponse;
                setCurrentStreamingMessage('');
                
                // Add final assistant message to messages
                const finalMessage: ChatMessage = {
                  id: Date.now() + 1,
                  session_id: '',
                  role: 'assistant',
                  content: assistantResponse,
                  created_at: new Date().toISOString()
                };
                
                setMessages(prev => [...prev, finalMessage]);
                break;
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Streaming error');
              }
            } catch (parseError) {
              console.warn('Error parsing SSE data:', parseError);
            }
          }
        }
      }
      
    } catch (err: unknown) {
      console.error('Error sending message:', err);
      
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Errore nell\'invio del messaggio';
      setError(errorMessage);
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: Date.now() + 1,
        session_id: '',
        role: 'assistant',
        content: `Mi dispiace, ho riscontrato un problema: ${errorMessage}. Riprova tra qualche minuto.`,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setCurrentStreamingMessage('');
      abortControllerRef.current = null;
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  // Handle quick suggestion click
  const handleQuickSuggestion = (suggestion: QuickSuggestion) => {
    sendMessage(suggestion.question);
  };

  // Handle key press in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  // Chat mostra sempre importi reali - nessuna obfuscation necessaria

  // Render message content with Markdown for AI responses
  const renderMessageContent = (content: string, role: ChatMessage['role']) => {
    if (role === 'assistant') {
      return (
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom styling for markdown elements
              h1: ({ children }) => <h1 className="text-lg font-bold text-slate-100 mt-4 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold text-slate-100 mt-3 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>,
              p: ({ children }) => <p className="mb-2 last:mb-0 text-slate-100">{children}</p>,
              ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-slate-100">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-blue-300">{children}</strong>,
              em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-300 my-2">
                  {children}
                </blockquote>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline 
                  ? <code className="bg-slate-600 text-slate-200 px-1 rounded text-xs">{children}</code>
                  : <code className="block bg-slate-800 text-slate-200 p-2 rounded text-xs overflow-x-auto">{children}</code>;
              },
              pre: ({ children }) => <pre className="bg-slate-800 p-2 rounded overflow-x-auto mb-2">{children}</pre>,
              // Override default link styling
              a: ({ children, href }) => (
                <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              )
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }
    // For user messages, just return plain text
    return <div className="whitespace-pre-wrap">{content}</div>;
  };

  // Get message icon
  const getMessageIcon = (role: ChatMessage['role']) => {
    switch (role) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4 text-blue-400" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  // Get message styling
  const getMessageStyling = (role: ChatMessage['role']) => {
    switch (role) {
      case 'user':
        return 'bg-blue-600 text-white ml-auto max-w-[80%] rounded-br-none';
      case 'assistant':
        return 'bg-slate-700 text-slate-100 mr-auto max-w-[85%] rounded-bl-none';
      default:
        return 'bg-slate-800 text-slate-300 mx-auto max-w-[90%]';
    }
  };

  if (loadingInitial) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Consulente Finanziario AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm text-muted-foreground">Caricamento conversazione...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-400" />
            Consulente Finanziario AI
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={clearConversation}
            className="flex items-center gap-1"
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4" />
            Cancella Chat
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Messages Area */}
        <div 
          className="space-y-3 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 relative"
          style={{ maxHeight }}
          role="log"
          aria-label="Cronologia conversazione"
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div 
              key={`${message.id}-${index}`} 
              className="flex items-start gap-3"
              role={message.role === 'user' ? 'user' : 'assistant'}
              aria-label={message.role === 'user' ? 'Il tuo messaggio' : 'Risposta del consulente AI'}
            >
              <div className="flex-shrink-0 mt-1" aria-hidden="true">
                {getMessageIcon(message.role)}
              </div>
              <div className={`px-4 py-3 rounded-lg ${getMessageStyling(message.role)} shadow-sm`}>
                {renderMessageContent(message.content, message.role)}
              </div>
            </div>
          ))}
          
          {/* Streaming message */}
          {currentStreamingMessage && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Bot className="h-4 w-4 text-blue-400" />
              </div>
              <div className="bg-slate-700 text-slate-100 px-4 py-3 rounded-lg rounded-bl-none mr-auto max-w-[85%]">
                {renderMessageContent(currentStreamingMessage, 'assistant')}
                <span className="inline-block w-2 h-5 bg-slate-400 ml-1 animate-pulse" />
              </div>
            </div>
          )}
          
          {/* Typing indicator */}
          {isLoading && !currentStreamingMessage && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Bot className="h-4 w-4 text-blue-400" />
              </div>
              <div className="bg-slate-700 text-slate-100 px-4 py-3 rounded-lg rounded-bl-none mr-auto">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Quick Suggestions (only show if no messages yet) */}
        {messages.length <= 1 && !isLoading && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Domande rapide per iniziare:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSuggestion(suggestion)}
                  className="text-xs"
                  disabled={isLoading}
                >
                  {suggestion.text}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-600 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              className="mt-2 text-xs"
            >
              Chiudi
            </Button>
          </div>
        )}
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2" role="form" aria-label="Invia messaggio al consulente AI">
          <Textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi la tua domanda sui tuoi dati finanziari..."
            disabled={isLoading}
            className="flex-1 min-h-[44px] max-h-[120px] resize-none"
            autoComplete="off"
            aria-label="Campo messaggio"
            aria-describedby="chat-input-hint"
            rows={1}
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="flex-shrink-0"
            aria-label={isLoading ? 'Invio in corso...' : 'Invia messaggio'}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </form>
        
        {/* Hidden hint for screen readers */}
        <div id="chat-input-hint" className="sr-only">
          Premi Invio per inviare il messaggio, Shift+Invio per andare a capo
        </div>
        
        {/* Footer Info */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-slate-700">
          Powered by OpenRouter AI • Modello: DeepSeek R1 (fallback: Gemini)
        </div>
      </CardContent>
    </Card>
  );
}