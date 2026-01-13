"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PlayIcon, StopIcon, ChatBubbleLeftIcon, ChartBarIcon, CodeBracketIcon } from '@heroicons/react/24/solid';

import VolatilitySelector from './components/VolatilitySelector';
import TradeConfig from './components/TradeConfig';
import ManagementConfig from './components/ManagementConfig';
import ControllerConfig from './components/ControllerConfig';
import BotDashboard from './components/BotDashboard';
import AiChatPanel from './components/AiChatPanel';
import AccountSelector from './components/AccountSelector';
import BlocklyEditor from './components/BlocklyEditor';
import { DerivService } from '@/app/services/DerivService';
import { GeminiAIService } from './services/GeminiAIService';
import { BotExecutionEngine } from './services/BotExecutionEngine';
import { initBlocklyJavaScriptGenerator } from './services/BlocklyJavaScriptGenerator';
import MarketAnalysisPanel from './components/MarketAnalysisPanel';
import { MarketDataService } from './services/MarketDataService';
import AiSuggestionsModal, { AiSuggestionsPayload, AiSuggestionStrategy } from './components/AiSuggestionsModal';

export default function BotStrategyPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trade' | 'management' | 'controller'>('trade');
  const [mainView, setMainView] = useState<'dashboard' | 'chat' | 'blockly'>('chat');
  
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultsList, setResultsList] = useState<any[]>([]);
  
  // AI Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [generatedStrategy, setGeneratedStrategy] = useState<any>(null);
  const [aiMode, setAiMode] = useState<'strategy' | 'chat'>('strategy');
  const [aiProgressMessage, setAiProgressMessage] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsPayload, setSuggestionsPayload] = useState<AiSuggestionsPayload | null>(null);

  // Configuration State (Expanded with new fields)
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [config, setConfig] = useState({
    // Trade
    stake: 1,
    duration: 5,
    durationUnit: 't',
    tradeType: 'CALL',
    prediction: 0,
    
    // Management
    stopLoss: 10,
    takeProfit: 10,
    martingaleFactor: 2,
    martingaleLevels: 5,
    galeSplitThreshold: 0,
    galeSplitCount: 1,
    sorosLimit: 0,
    sorosProfitPercentage: 100,
    galeRemovesSoros: false,

    // Controller
    winReal: 5,
    lossReal: 1,
    winSimulated: 0,
    lossSimulated: 1,
    tradeLimit: 0,
    cooldown: 3,
    pauseOnLoss: false,
    pauseOnWin: false,
    pauseTime: 5
  });

  // Services Refs
  const geminiService = useRef(new GeminiAIService());
  const botEngine = useRef<BotExecutionEngine | null>(null);

  // Initialization Flow
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const accountsStr = localStorage.getItem('deriv_accounts');
        const activeToken = localStorage.getItem('activeToken') || localStorage.getItem('token'); 

        if (!accountsStr) {
           toast.error("Nenhuma conta encontrada. Por favor, adicione uma conta no Dashboard.", {
               autoClose: 5000,
               onClose: () => window.location.href = '/home'
           });
           return; 
        }

        if (!activeToken) {
            toast.warn("Nenhuma conta ativa selecionada.");
        }

        const deriv = DerivService.getInstance();
        if (!deriv.isConnected) {
             if (activeToken) {
                 deriv.setToken(activeToken);
                 deriv.connect();
             } else {
                 deriv.connect();
             }
        }
        
        // Initialize MarketDataService
        MarketDataService.getInstance();
        
        // Initialize Blockly JavaScript generator
        initBlocklyJavaScriptGenerator();

      } catch (error) {
        console.error("Initialization error:", error);
        toast.error("Erro na inicialização do sistema.");
      } finally {
        setTimeout(() => setLoading(false), 1000);
      }
    };

    init();
    
    // Cleanup on unmount
    return () => {
        if (botEngine.current) {
            botEngine.current.stop();
        }
    };
  }, []);

  // Update Market Data Service when symbol changes
  useEffect(() => {
      if (selectedSymbol) {
          MarketDataService.getInstance().setActiveSymbol(selectedSymbol);
      }
  }, [selectedSymbol]);

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const addLog = (msg: string) => {
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleAiMessage = async (text: string, imageData?: { data: string, mimeType: string, url?: string }) => {
      // Add user message
      const userMsg = { 
          id: Date.now().toString(), 
          role: 'user', 
          content: text, 
          image: imageData,
          timestamp: new Date() 
      };
      setMessages(prev => [...prev, userMsg]);
      setIsAiProcessing(true);
      setAiProgressMessage(null);

      try {
          if (aiMode === 'chat') {
              const response = await geminiService.current.chatWithAI(
                  text,
                  (progressMsg) => setAiProgressMessage(progressMsg),
                  imageData
              );

              if (response.success) {
                  const aiMsg = {
                      id: (Date.now() + 1).toString(),
                      role: 'ai',
                      content: response.rawText || "Entendido.",
                      timestamp: new Date()
                  };
                  setMessages(prev => [...prev, aiMsg]);
              } else {
                  const errorMsg = {
                      id: (Date.now() + 1).toString(),
                      role: 'ai',
                      content: `❌ ${response.error || 'Erro desconhecido'}`,
                      timestamp: new Date()
                  };
                  setMessages(prev => [...prev, errorMsg]);
              }
              return;
          }

          const response = await geminiService.current.translateStrategy(
              text,
              (progressMsg) => setAiProgressMessage(progressMsg),
              imageData
          );

          if (response.success && response.strategy) {
              const aiMsg = {
                  id: (Date.now() + 1).toString(),
                  role: 'ai',
                  content: `Estratégia "${response.strategy.name || 'Sem nome'}" gerada com sucesso!`,
                  timestamp: new Date()
              };
              setMessages(prev => [...prev, aiMsg]);

              setGeneratedStrategy(response.strategy);

              if (response.strategy.money_management) {
                  setConfig(prev => ({
                      ...prev,
                      stake: response.strategy.money_management.stake || prev.stake,
                      stopLoss: response.strategy.money_management.stop_loss || prev.stopLoss,
                      takeProfit: response.strategy.money_management.take_profit || prev.takeProfit
                  }));
              }

              if (response.strategy.action) {
                  setConfig(prev => ({
                      ...prev,
                      tradeType: response.strategy.action
                  }));
              }

              if (typeof response.strategy.prediction === 'number') {
                  setConfig(prev => ({
                      ...prev,
                      prediction: response.strategy.prediction
                  }));
              }

              toast.success("Estratégia configurada pela IA!");
          } else if (response.success && !response.strategy) {
              const aiMsg = {
                  id: (Date.now() + 1).toString(),
                  role: 'ai',
                  content: response.rawText || "Entendido.",
                  timestamp: new Date()
              };
              setMessages(prev => [...prev, aiMsg]);
          } else {
              const errorMsg = {
                  id: (Date.now() + 1).toString(),
                  role: 'ai',
                  content: `Desculpe, não consegui entender a estratégia. Erro: ${response.error || 'Desconhecido'}`,
                  timestamp: new Date()
              };
              setMessages(prev => [...prev, errorMsg]);
          }

      } catch (error) {
          console.error(error);
          toast.error("Erro ao comunicar com a IA");
      } finally {
          setIsAiProcessing(false);
          setAiProgressMessage(null);
      }
  };

  const requestSuggestions = async () => {
      if (!selectedSymbol) {
          toast.warning("Selecione um ativo para gerar sugestões.");
          return;
      }

      setIsAiProcessing(true);
      setAiProgressMessage(null);
      try {
          const res = await geminiService.current.generateSuggestions(
              {
                  symbol: selectedSymbol,
                  tradeType: config.tradeType,
                  prediction: config.prediction,
                  duration: config.duration,
                  durationUnit: config.durationUnit
              },
              (msg) => setAiProgressMessage(msg)
          );

          if (!res.success || !res.suggestions) {
              toast.error(res.error || "Não foi possível gerar sugestões.");
              return;
          }

          setSuggestionsPayload(res.suggestions as AiSuggestionsPayload);
          setSuggestionsOpen(true);
      } finally {
          setIsAiProcessing(false);
          setAiProgressMessage(null);
      }
  };

  const applySuggestion = async (strategy: AiSuggestionStrategy) => {
      setSuggestionsOpen(false);
      if (strategy.json_logic) {
          setGeneratedStrategy(strategy.json_logic);
          toast.success("Estratégia aplicada (JSON).");
          return;
      }

      const text = strategy.rules_text || '';
      if (!text.trim()) {
          toast.error("Estratégia inválida.");
          return;
      }

      setMainView('chat');
      setAiMode('strategy');
      await handleAiMessage(text);
  };

  const toggleBot = () => {
    if (isRunning) {
      // Stop both engines if they're running
      if (botEngine.current) {
        botEngine.current.stop();
      }
      if (typeof window !== 'undefined' && window.BlocklyBot) {
        window.BlocklyBot.stop();
      }
      setIsRunning(false);
      addLog("Bot parado pelo usuário.");
    } else {
      if (!selectedSymbol) {
        toast.warning("Selecione um ativo antes de iniciar.");
        return;
      }
      
      // Check which view we're in to determine which engine to start
      if (mainView === 'blockly') {
        // For Blockly view, we need to start the BlocklyBot engine from within the editor
        toast.info("Inicie o bot diretamente no Editor Visual.");
        return;
      }
      
      // Start the traditional engine for other views
      const botConf = {
        symbol: selectedSymbol,
        ...config
      };
      
      // Use generated strategy or create a default one based on manual inputs
      const strategyToUse = generatedStrategy || {
        name: "Manual Strategy",
        conditions: [], // If manual, maybe we don't have conditions yet or need a manual builder
        action: config.tradeType
      };
      
      if (!generatedStrategy) {
        addLog("⚠️ Iniciando sem estratégia de IA definida. Apenas gestão de risco será aplicada (execução manual não implementada nesta versão).");
        // For migration completeness, we should allow manual execution or basic strategy
      }

      botEngine.current = new BotExecutionEngine(
        botConf, 
        strategyToUse,
        addLog,
        (trade) => {
          toast.info(`Trade ${trade.status}: $${trade.profit}`);
          setResultsList(prev => [trade, ...prev]);
        }
      );
      
      botEngine.current.start();
      setIsRunning(true);
      setMainView('dashboard'); // Switch to dashboard to see logs
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d0a18]">
        <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-semibold text-white">Inicializando Bot Strategy...</h2>
            <p className="text-gray-400 mt-2">Verificando credenciais e conexões</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#0d0a18] p-4 gap-4">
       <ToastContainer theme="dark" />
       
       {/* Left Sidebar - Configuration */}
       <div className="w-80 flex flex-col bg-[#13111c] rounded-lg border border-gray-800 shadow-lg flex-shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
             <h2 className="text-lg font-bold text-white">Configuração</h2>
          </div>

          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
             {/* Account Selector */}
             <AccountSelector />

             {/* Volatility Selector */}
             <VolatilitySelector 
                selectedSymbol={selectedSymbol} 
                onSelectSymbol={setSelectedSymbol} 
             />

             {/* Tabs */}
             <div className="flex mb-4 bg-[#1e1b2e] rounded-lg p-1">
                <button 
                    onClick={() => setActiveTab('trade')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'trade' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Trade
                </button>
                <button 
                    onClick={() => setActiveTab('management')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'management' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Gestão
                </button>
                <button 
                    onClick={() => setActiveTab('controller')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'controller' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Controler
                </button>
             </div>

             {/* Tab Content */}
             <div className="mt-2">
                {activeTab === 'trade' && (
                    <TradeConfig config={config} onChange={handleConfigChange} />
                )}
                {activeTab === 'management' && (
                    <ManagementConfig config={config} onChange={handleConfigChange} />
                )}
                {activeTab === 'controller' && (
                    <ControllerConfig config={config} onChange={handleConfigChange} />
                )}
             </div>
          </div>

          {/* Start/Stop Button */}
          <div className="p-4 border-t border-gray-800">
            <button
                onClick={toggleBot}
                className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {isRunning ? (
                    <>
                        <StopIcon className="w-5 h-5" />
                        PARAR
                    </>
                ) : (
                    <>
                        <PlayIcon className="w-5 h-5" />
                        INICIAR
                    </>
                )}
            </button>
          </div>
       </div>

       {/* Main Content Area */}
       <div className="flex-1 flex flex-col min-w-0">
            {/* View Switcher */}
            <div className="flex gap-2 mb-4">
                <button 
                    onClick={() => setMainView('chat')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${mainView === 'chat' ? 'bg-blue-600 text-white' : 'bg-[#13111c] text-gray-400 hover:text-white'}`}
                >
                    <ChatBubbleLeftIcon className="w-5 h-5" />
                    IA Trader
                </button>
                <button 
                    onClick={() => setMainView('dashboard')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${mainView === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-[#13111c] text-gray-400 hover:text-white'}`}
                >
                    <ChartBarIcon className="w-5 h-5" />
                    Dashboard
                </button>
                <button 
                    onClick={() => setMainView('blockly')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${mainView === 'blockly' ? 'bg-blue-600 text-white' : 'bg-[#13111c] text-gray-400 hover:text-white'}`}
                >
                    <CodeBracketIcon className="w-5 h-5" />
                    Editor Visual
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0">
                {mainView === 'chat' ? (
                    <div className="flex h-full gap-4">
                        <div className="flex-1 min-w-0">
                            <AiChatPanel 
                                messages={messages}
                                isProcessing={isAiProcessing}
                                onSendMessage={handleAiMessage}
                                onStrategyGenerated={() => {}}
                                mode={aiMode}
                                onModeChange={setAiMode}
                                progressMessage={aiProgressMessage}
                                onRequestSuggestions={requestSuggestions}
                            />
                        </div>
                       
                    </div>
                ) : mainView === 'blockly' ? (
                    <BlocklyEditor 
                        onRun={(code) => {
                            // Execute the generated code in the context of the BlocklyBot engine
                            try {
                                eval(code);
                            } catch (error) {
                                toast.error(`Erro ao executar código: ${(error as Error).message}`);
                            }
                        }}
                        onStop={() => {
                            // Stop the BlocklyBot engine
                            if (typeof window !== 'undefined' && window.BlocklyBot) {
                                window.BlocklyBot.stop();
                            }
                        }}
                    />
                ) : (
                    <BotDashboard logs={logs} running={isRunning} resultsList={resultsList} />
                )}
            </div>
             
       </div>
       
       {/* Market Analysis Panel - Only show when symbol is selected and not in Blockly editor */}
       {selectedSymbol && mainView !== 'blockly' && (
           <div className="flex-1 flex flex-col min-w-0">
               <MarketAnalysisPanel symbol={selectedSymbol} />
           </div>
       )}
       
       <AiSuggestionsModal
         isOpen={suggestionsOpen}
         payload={suggestionsPayload}
         onClose={() => setSuggestionsOpen(false)}
         onApply={applySuggestion}
       />
    </div>
  );
}
