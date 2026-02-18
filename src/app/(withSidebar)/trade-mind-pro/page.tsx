"use client";

import { ChartBarIcon, ChatBubbleLeftIcon, CodeBracketIcon, PlayIcon } from '@heroicons/react/24/solid';
import { toast ,ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AccountSelector from './components/AccountSelector';
import AiChatPanel from './components/AiChatPanel';
import AiSuggestionsModal from './components/AiSuggestionsModal';
import BlocklyEditor from './components/BlocklyEditor';
import BotDashboard from './components/BotDashboard';
import ControllerConfig, { ControllerConfigData, DEFAULT_CONTROLLER_CONFIG } from './components/ControllerConfig';
import ManagementConfig, { ManagementConfigData, DEFAULT_MANAGEMENT_CONFIG } from './components/ManagementConfig';
import MarketAnalysisPanel from './components/MarketAnalysisPanel';
import TradeConfig, { TradeConfigData, DEFAULT_CONFIG as DEFAULT_TRADE_CONFIG } from './components/TradeConfig';
import VolatilitySelector from './components/VolatilitySelector';
import { useEffect, useState } from 'react';
import { DerivService } from '@/app/services/DerivService';
import { monitoringService } from './service/Monitoring';

export default function TradeMindPro() {
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiMode, setAiMode] = useState<'strategy' | 'chat'>('strategy');
  const [aiProgressMessage, setAiProgressMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultsList, setResultsList] = useState<any[]>([]);
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'trade' | 'management' | 'controller'>('trade');
  const [mainView, setMainView] = useState<'dashboard' | 'chat' | 'blockly'>('chat');
  
  // Configuration states
  const [tradeConfig, setTradeConfig] = useState<TradeConfigData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trade_config_trade');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_TRADE_CONFIG, ...parsed.config };
        } catch (e) {
          console.warn('Erro ao carregar configuração trade:', e);
        }
      }
    }
    return DEFAULT_TRADE_CONFIG;
  });

  const [managementConfig, setManagementConfig] = useState<ManagementConfigData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trade_config_management');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_MANAGEMENT_CONFIG, ...parsed.config };
        } catch (e) {
          console.warn('Erro ao carregar configuração management:', e);
        }
      }
    }
    return DEFAULT_MANAGEMENT_CONFIG;
  });

  const [controllerConfig, setControllerConfig] = useState<ControllerConfigData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trade_config_controller');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_CONTROLLER_CONFIG, ...parsed.config };
        } catch (e) {
          console.warn('Erro ao carregar configuração controller:', e);
        }
      }
    }
    return DEFAULT_CONTROLLER_CONFIG;
  });

  // Estado para estatísticas de mercado (do MonitoringService)
  const [marketStats, setMarketStats] = useState<any>(null);
  const getLoginIdFromStorage = (): string | null => {
    try {
      const accountsStr = localStorage.getItem('deriv_accounts');
      if (!accountsStr) return null;
      const accounts = JSON.parse(accountsStr);
      const a = Array.isArray(accounts) ? accounts[0] : null;
      return a?.selectedLoginId || a?.loginId || a?.tokens?.[0]?.loginid || null;
    } catch {
      return null;
    }
  };
  // Effect para inicialização da conexão Deriv
  useEffect(() => {
    const init = async() => {
      setLoading(true);
      try {
        const accountsStr = localStorage.getItem('deriv_accounts');
        if (!accountsStr) {
        toast.error("Nenhuma conta encontrada. Por favor, adicione uma conta no Dashboard.", {
            autoClose: 5000,
            onClose: () => window.location.href = '/home'
        });
        return; 
        }

        const parsedAccounts = accountsStr ? JSON.parse(accountsStr) : [];
        const activeToken = parsedAccounts?.[0]?.activeToken || null;

        if (!activeToken) {
            toast.warn("Nenhuma conta ativa selecionada.");
        }

        const deriv = DerivService.getInstance();
        if (!deriv.isConnected) {
            if (activeToken) {
                deriv.connect(); 
                setTimeout(() => {
                deriv.authenticate(activeToken);
                },100);
                
            } else {
                deriv.connect();
                setTimeout(() => {deriv.authenticate(activeToken);}, 100);
                
            }
        }
      } catch (error) {
        console.error("Initialization error:", error);
        toast.error("Erro na inicialização do sistema.");
      } finally {
        setTimeout(() => setLoading(false), 1000);
      }
    }
    init();
    
  }, []);

  // Effect para iniciar monitoring quando símbolo é selecionado
  useEffect(() => {
    if (!selectedSymbol) return;

    const startMonitoring = async () => {
      try {
        // Iniciar serviço de monitoramento
        await monitoringService.start({
          symbol: selectedSymbol,
          onTick: (data) => {
            // Callback quando tick é recebido
            console.log('[TradeMindPro] Tick recebido:', data);
          },
          onProbabilityUpdate: (stats) => {
            // Callback quando probabilidades são atualizadas
            setMarketStats(stats);
          }
        });
        
        console.log(`[TradeMindPro] Monitoramento iniciado para ${selectedSymbol}`);
      } catch (error) {
        console.error('[TradeMindPro] Erro ao iniciar monitoramento:', error);
        toast.error('Erro ao iniciar coleta de dados');
      }
    };

    startMonitoring();

    // Cleanup ao desmontar ou trocar símbolo
    return () => {
      monitoringService.stop();
    };
  }, [selectedSymbol]);

  const saveCurrentConfiguration = () => {
    // Combine all configurations
    const fullConfig = {
      ...tradeConfig,
      ...managementConfig,
      ...controllerConfig,
      selectedSymbol
    };
    
    // Save to localStorage with a combined key
    localStorage.setItem('trade_config_full', JSON.stringify({
      config: fullConfig,
      _timestamp: Date.now(),
      _autoSaved: true
    }));
    
    toast.success('Configurações salvas com sucesso!');
  };

  const handleAiMessage = async () => {}

  const requestSuggestions = async () => {}

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

      <div className="w-80 flex flex-col bg-[#13111c] rounded-lg border border-gray-800 shadow-lg flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Configuração</h2>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <AccountSelector />
          <VolatilitySelector 
            selectedSymbol={selectedSymbol} 
            onSelectSymbol={(s) => {
            setSelectedSymbol(s);
            }} 
          />

          <div className="flex mb-4 bg-[#1e1b2e] rounded-lg p-1">
            <button
              onClick={() => setActiveTab('trade')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'trade' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Trade
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'management' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Gestão
            </button>
            <button
              onClick={() => setActiveTab('controller')}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'controller' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Controler
            </button>
          </div>

          <div className="mt-2">
            {activeTab === 'trade' && (
              <TradeConfig 
                config={tradeConfig} 
                onChange={setTradeConfig} 
              />
            )}
            {activeTab === 'management' && (
              <ManagementConfig 
                config={managementConfig} 
                onChange={setManagementConfig} 
              />
            )}
            {activeTab === 'controller' && (
              <ControllerConfig 
                config={controllerConfig} 
                onChange={setControllerConfig} 
              />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={saveCurrentConfiguration}
            className="w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
          >
            <PlayIcon className="w-5 h-5" />
            INICIAR
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMainView('chat')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
              mainView === 'chat' ? 'bg-blue-600 text-white' : 'bg-[#13111c] text-gray-400 hover:text-white'
            }`}
          >
            <ChatBubbleLeftIcon className="w-5 h-5" />
            IA Trader
          </button>
          <button
            onClick={() => setMainView('dashboard')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
              mainView === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-[#13111c] text-gray-400 hover:text-white'
            }`}
          >
            <ChartBarIcon className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => setMainView('blockly')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
              mainView === 'blockly' ? 'bg-blue-600 text-white' : 'bg-[#13111c] text-gray-400 hover:text-white'
            }`}
          >
            <CodeBracketIcon className="w-5 h-5" />
            Editor Visual
          </button>
        </div>

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
                  draftStorageKey={(() => {
                    const loginid = getLoginIdFromStorage();
                    return loginid ? `monitoring_strategy_${loginid}` : null;
                  })()}
                />
              </div>
            </div>
          ) : mainView === 'blockly' ? (
            <BlocklyEditor />
          ) : (
            <BotDashboard 
              logs={logs} running={isRunning} resultsList={resultsList}
            />
          )}
        </div>
      </div>

      {selectedSymbol && mainView !== 'blockly' && (
        <div className="flex-1 flex flex-col min-w-0">
          <MarketAnalysisPanel symbol={selectedSymbol} marketStats={marketStats} />

        </div>
      )}

      <AiSuggestionsModal />
    </div>
  );
}
