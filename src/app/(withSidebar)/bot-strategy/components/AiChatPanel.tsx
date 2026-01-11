import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, PhotoIcon } from '@heroicons/react/24/solid';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AiChatPanelProps {
  onStrategyGenerated: (strategy: any) => void;
  isProcessing: boolean;
  onSendMessage: (text: string) => void;
  messages: Message[];
}

export default function AiChatPanel({ onStrategyGenerated, isProcessing, onSendMessage, messages }: AiChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#13111c] border border-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h3 className="font-bold text-white flex items-center gap-2">
            ✨ IA Trader
            <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-0.5 rounded">Gemini 2.0</span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
                <p>Olá! Eu sou a IA Trader.</p>
                <p className="text-sm mt-2">Descreva sua estratégia e eu a configurarei para você.</p>
                <div className="mt-4 text-xs bg-gray-800/50 p-3 rounded-lg inline-block text-left">
                    <p className="font-bold mb-1">Exemplos:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>"Compre CALL se o RSI for menor que 30"</li>
                        <li>"Se o último dígito for par, compre DIGITOVER 5"</li>
                        <li>"Use Martingale fator 2 com stop loss de $50"</li>
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
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 flex gap-2">
        <button 
            type="button"
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Upload de imagem (em breve)"
        >
            <PhotoIcon className="w-6 h-6" />
        </button>
        <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descreva sua estratégia..."
            className="flex-1 bg-[#0d0a18] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
            disabled={isProcessing}
        />
        <button 
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
        >
            <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
