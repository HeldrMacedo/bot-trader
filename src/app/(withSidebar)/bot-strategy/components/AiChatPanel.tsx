import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface ImageData {
    data: string; // base64 string
    mimeType: string;
    url?: string; // for preview
}

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
}

export default function AiChatPanel({ onStrategyGenerated, isProcessing, onSendMessage, messages, mode, onModeChange, progressMessage, onRequestSuggestions }: AiChatPanelProps) {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedImage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isProcessing) return;
    
    onSendMessage(input, selectedImage || undefined);
    setInput('');
    setSelectedImage(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
          alert('Por favor, selecione apenas imagens.');
          return;
      }

      if (file.size > 5 * 1024 * 1024) {
          alert('A imagem deve ter no máximo 5MB.');
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          const base64Data = e.target?.result as string;
          setSelectedImage({
              data: base64Data.split(',')[1],
              mimeType: file.type,
              url: base64Data
          });
      };
      reader.readAsDataURL(file);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
      setSelectedImage(null);
  };

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
                    {msg.image && (
                        <div className="mb-2">
                            <img src={msg.image.url} alt="Uploaded" className="max-w-full rounded-lg max-h-48 object-cover" />
                        </div>
                    )}
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

      {/* Image Preview Area */}
      {selectedImage && (
          <div className="px-4 py-2 border-t border-gray-800 bg-[#0d0a18] flex items-center">
              <div className="relative">
                  <img src={selectedImage.url} alt="Preview" className="h-16 w-16 object-cover rounded border border-gray-700" />
                  <button 
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                      <XMarkIcon className="w-3 h-3" />
                  </button>
              </div>
          </div>
      )}

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 flex gap-2">
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
        />
        <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Upload de imagem"
        >
            <PhotoIcon className="w-6 h-6" />
        </button>
        <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'strategy' ? 'Descreva sua estratégia...' : 'Digite sua pergunta...'}
            className="flex-1 bg-[#0d0a18] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
            disabled={isProcessing}
        />
        <button 
            type="submit"
            disabled={(!input.trim() && !selectedImage) || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
        >
            <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
