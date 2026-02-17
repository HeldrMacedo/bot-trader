import { PaperAirplaneIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { useEffect, useMemo, useRef, useState } from "react";

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  image?: ImageData;
  timestamp: Date;
}

interface AiChatPanelProps {
  onStrategyGenerated: (strategy: any) => void;
  isProcessing: boolean;
  onSendMessage: (text: string, image?: ImageData) => void;
  messages: Message[];
  mode: 'strategy' | 'chat';
  onModeChange: (mode: 'strategy' | 'chat') => void;
  progressMessage?: string | null;
  onRequestSuggestions?: () => void;
  draftStorageKey?: string | null;
}
export default function AiChatPanel(
  { 
    onStrategyGenerated, 
    isProcessing, 
    onSendMessage, 
    messages, 
    mode, 
    onModeChange, 
    progressMessage, 
    onRequestSuggestions, 
    draftStorageKey }: AiChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
  
    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 100)}px`;
  };

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if ((!input.trim()) || isProcessing) return;
      
      onSendMessage(input|| undefined);
      if (mode === 'chat') {
        setInput('');
        if (draftStorageKey) {
          try {
            localStorage.setItem(draftStorageKey, '');
          } catch {
          }
        }
      }
    };

    const placeholder = useMemo(() => {
        if (mode === 'strategy') {
          return (
            'Digite aqui sua estratégia de monitoramento...\n\n' +
            'Exemplo:\n' +
            '- Monitorar quando o preço subir 3 pontos consecutivos\n' +
            '- Alertar quando atingir resistência de 1.2500\n' +
            '- Acompanhar padrão de reversão...'
          );
        }
        return 'Digite sua pergunta...';
      }, [mode]);
  return (
    <div className="flex flex-col h-full bg-[#13111c] border border-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-white flex items-center gap-2">
              ✨ IA Trader
              <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-0.5 rounded">Gemini</span>
          </h3>
          <div className="flex bg-[#0d0a18] border border-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => onModeChange('strategy')}
              className={`px-2 py-1 text-xs rounded ${mode === 'strategy' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
              disabled={isProcessing}
            >
              Estratégia
            </button>
            <button
              type="button"
              onClick={() => onModeChange('chat')}
              className={`px-2 py-1 text-xs rounded ${mode === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
              disabled={isProcessing}
            >
              Chat
            </button>
          </div>
        </div>
        {onRequestSuggestions && (
          <button
            type="button"
            onClick={onRequestSuggestions}
            disabled={isProcessing}
            className="text-xs px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white"
          >
            Sugestões
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
                <p>Olá! Eu sou a IA Trader.</p>
                <p className="text-sm mt-2">{mode === 'strategy' ? 'Descreva sua estratégia e eu a configurarei para você.' : 'Faça perguntas sobre mercado, dígitos, preços e indicadores.'}</p>
                <div className="mt-4 text-xs bg-gray-800/50 p-3 rounded-lg inline-block text-left">
                    <p className="font-bold mb-1">Exemplos:</p>
                    <ul className="list-disc list-inside space-y-1">
                        {mode === 'strategy' ? (
                          <>
                            <li>&quot;Compre CALL se o RSI for menor que 30&quot;</li>
                            <li>&quot;Se o último dígito for par, compre DIGITOVER 5&quot;</li>
                            <li>&quot;Use Martingale fator 2 com stop loss de $50&quot;</li>
                          </>
                        ) : (
                          <>
                            <li>&quot;Quais foram os últimos 25 dígitos?&quot;</li>
                            <li>&quot;Como está o RSI agora?&quot;</li>
                            <li>&quot;Qual o dígito com maior e menor probabilidade?&quot;</li>
                          </>
                        )}
                    </ul>
                </div>
            </div>
        )}
        
        {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-800 text-gray-200 rounded-bl-none'
                }`}>
                    {msg.content}
                </div>
            </div>
        ))}
        
        {isProcessing && (
            <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg p-3 rounded-bl-none flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                    {progressMessage && (
                      <span className="text-xs text-gray-300 ml-2">{progressMessage}</span>
                    )}
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 flex gap-2">
       
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            const next = e.target.value;
            setInput(next);
            if (draftStorageKey) {
              try {
                localStorage.setItem(draftStorageKey, next);
              } catch {
              }
            }
          }}
          onKeyDown={(e) => {
            if (mode === 'chat') {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
              }
              return;
            }

            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-[#0d0a18] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none min-h-[100px] overflow-y-hidden resize-none"
          disabled={isProcessing}
        />
        <button 
            type="submit"
            disabled={(!input.trim()) || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
        >
            <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
