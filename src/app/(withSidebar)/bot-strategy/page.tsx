"use client";

import { ChartBarIcon, ChatBubbleLeftIcon, CodeBracketIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid';
import { useEffect, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { DerivService } from '@/app/services/DerivService';
import AccountSelector from './components/AccountSelector';
import AiChatPanel from './components/AiChatPanel';
import AiSuggestionsModal, { AiSuggestionsPayload, AiSuggestionStrategy } from './components/AiSuggestionsModal';
import BlocklyEditor from './components/BlocklyEditor';
import BotDashboard from './components/BotDashboard';
import ControllerConfig from './components/ControllerConfig';
import ManagementConfig from './components/ManagementConfig';
import MarketAnalysisPanel from './components/MarketAnalysisPanel';
import TradeConfig from './components/TradeConfig';
import VolatilitySelector from './components/VolatilitySelector';
import { initBlocklyJavaScriptGenerator } from './services/BlocklyJavaScriptGenerator';
import { BotExecutionEngine, TradeRecord } from './services/BotExecutionEngine';
import { GeminiAIService } from './services/GeminiAIService';
import { MarketDataService } from './services/MarketDataService';
import { TradeContractSelector } from './services/TradeContractSelector';
import { TradeMode } from './services/TradeModeRiskController';

export default function BotStrategyPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trade' | 'management' | 'controller'>('trade');
  const [mainView, setMainView] = useState<'dashboard' | 'chat' | 'blockly'>('chat');
  
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [engineState, setEngineState] = useState<any | null>(null);
  
  // AI Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [generatedStrategy, setGeneratedStrategy] = useState<any>(null);
  const [strategyText, setStrategyText] = useState<string>(''); // Store the raw strategy text
  const [aiMode, setAiMode] = useState<'strategy' | 'chat'>('strategy');
  const [aiProgressMessage, setAiProgressMessage] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsPayload, setSuggestionsPayload] = useState<AiSuggestionsPayload | null>(null);
  const [lastTradeOutcome, setLastTradeOutcome] = useState<{ result: 'WIN' | 'LOSS'; simulated: boolean } | null>(null);

  // Configuration State (Complete with all fields from legacy system)
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [availableContractTypes, setAvailableContractTypes] = useState<string[]>([]);
  const [config, setConfig] = useState({
    // Trade
    stake: 0.35,
    duration: 1,
    durationUnit: 't',
    contractType: '',
    tradeType: 'CALL',
    prediction: 0,
    barrier: '',
    barrierHigh: '',
    barrierLow: '',
    
    // Management
    stopLoss: 10,
    takeProfit: 10,
    
    // Gale settings (migrated from bot-ia)
    galeActive: true,
    martingaleFactor: 1,  // Gale adjustment multiplier
    martingaleLevels: 5,
    galeSplitThreshold: 0,
    galeSplitCount: 1,
    
    // Soros settings (migrated from bot-ia)
    sorosLimit: 0,
    sorosProfitPercentage: 100,
    galeRemovesSoros: false,

    // Controller (mode limits from bot-ia)
    winReal: 0,
    lossReal: 0,
    winSimulated: 0,
    lossSimulated: 0,
    tradeLimit: 0,
    cooldown: 3,
    
    // Pause settings
    pauseOnLoss: false,
    pauseOnWin: false,
    pauseTime: 5
  });

  // Services Refs
  const geminiService = useRef(new GeminiAIService());
  const botEngine = useRef<BotExecutionEngine | null>(null);

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

  const saveCurrentConfiguration = (nextConfig: any, nextSymbol: string) => {
    try {
      const loginid = getLoginIdFromStorage();
      if (!loginid) return;

      const configToSave: any = {
        symbol: nextSymbol,
        contractType: nextConfig.contractType || '',
        tradeType: nextConfig.tradeType || '',
        duration: Number.isFinite(nextConfig.duration) ? nextConfig.duration : parseInt(nextConfig.duration) || 1,
        durationUnit: nextConfig.durationUnit || 't',
        stake: Number.isFinite(nextConfig.stake) ? nextConfig.stake : parseFloat(nextConfig.stake) || 0.35,
        goal: nextConfig.takeProfit ?? 1,
        stopLoss: nextConfig.stopLoss ?? 100,
        galeMultiplier: nextConfig.martingaleFactor ?? 1.0,
        galeSplit: nextConfig.galeSplitCount ?? 1,
        galeSplitThreshold: nextConfig.galeSplitThreshold ?? 0,
        winReal: nextConfig.winReal ?? 5,
        lossReal: nextConfig.lossReal ?? 1,
        winSimulated: nextConfig.winSimulated ?? 0,
        lossSimulated: nextConfig.lossSimulated ?? 1,
        tradeLimit: nextConfig.tradeLimit ?? 0,
        cooldownPeriod: nextConfig.cooldown ?? 3,
      };

      if (nextConfig.prediction !== undefined && nextConfig.prediction !== null && nextConfig.prediction !== '') {
        configToSave.prediction = nextConfig.prediction;
      }
      if (nextConfig.barrier !== undefined && nextConfig.barrier !== null && nextConfig.barrier !== '') {
        configToSave.barrier = nextConfig.barrier;
      }
      if (nextConfig.barrierHigh !== undefined && nextConfig.barrierHigh !== null && nextConfig.barrierHigh !== '') {
        configToSave.barrierHigh = nextConfig.barrierHigh;
      }
      if (nextConfig.barrierLow !== undefined && nextConfig.barrierLow !== null && nextConfig.barrierLow !== '') {
        configToSave.barrierLow = nextConfig.barrierLow;
      }

      const userConfigKey = `trade_config_user_${loginid}`;
      localStorage.setItem(
        userConfigKey,
        JSON.stringify({
          config: configToSave,
          _timestamp: Date.now(),
          _autoSaved: true,
          _userId: loginid,
        })
      );

      if (botEngine.current) {
        botEngine.current.updateConfig({
          stake: nextConfig.stake,
          duration: nextConfig.duration,
          durationUnit: nextConfig.durationUnit,
          tradeType: nextConfig.tradeType,
          prediction: nextConfig.prediction,
          stopLoss: nextConfig.stopLoss,
          takeProfit: nextConfig.takeProfit,
          galeActive: nextConfig.galeActive,
          martingaleFactor: nextConfig.martingaleFactor,
          martingaleLevels: nextConfig.martingaleLevels,
          galeSplitThreshold: nextConfig.galeSplitThreshold,
          galeSplitCount: nextConfig.galeSplitCount,
          sorosLimit: nextConfig.sorosLimit,
          sorosProfitPercentage: nextConfig.sorosProfitPercentage,
          galeRemovesSoros: nextConfig.galeRemovesSoros,
          winReal: nextConfig.winReal,
          lossReal: nextConfig.lossReal,
          winSimulated: nextConfig.winSimulated,
          lossSimulated: nextConfig.lossSimulated,
          tradeLimit: nextConfig.tradeLimit,
          cooldown: nextConfig.cooldown,
          pauseOnWin: nextConfig.pauseOnWin,
          pauseOnLoss: nextConfig.pauseOnLoss,
          pauseTime: nextConfig.pauseTime,
          symbol: nextSymbol,
          contractType: nextConfig.contractType,
          barrier: nextConfig.barrier,
          barrierHigh: nextConfig.barrierHigh,
          barrierLow: nextConfig.barrierLow,
        });
      }
    } catch {
    }
  };

  const normalizeSavedConfig = (raw: any) => {
    const saved = raw?.config || raw;
    if (!saved) return null;

    return {
      symbol: saved.symbol ?? '',
      contractType: saved.contractType ?? '',
      tradeType: saved.tradeType ?? 'CALL',
      duration: parseInt(saved.duration) || 1,
      durationUnit: saved.durationUnit ?? 't',
      stake: typeof saved.stake === 'number' ? saved.stake : parseFloat(saved.stake) || 0.35,
      prediction: saved.prediction !== undefined ? parseInt(saved.prediction) : 0,
      barrier: saved.barrier ?? '',
      barrierHigh: saved.barrierHigh ?? '',
      barrierLow: saved.barrierLow ?? '',
      stopLoss: typeof saved.stopLoss === 'number' ? saved.stopLoss : parseFloat(saved.stopLoss) || 100,
      takeProfit: saved.takeProfit !== undefined
        ? (typeof saved.takeProfit === 'number' ? saved.takeProfit : parseFloat(saved.takeProfit) || 1)
        : (typeof saved.goal === 'number' ? saved.goal : parseFloat(saved.goal) || 1),
      galeActive: saved.galeActive ?? true,
      martingaleFactor: saved.martingaleFactor !== undefined
        ? (typeof saved.martingaleFactor === 'number' ? saved.martingaleFactor : parseFloat(saved.martingaleFactor) || 1)
        : (typeof saved.galeMultiplier === 'number' ? saved.galeMultiplier : parseFloat(saved.galeMultiplier) || 1),
      martingaleLevels: typeof saved.martingaleLevels === 'number' ? saved.martingaleLevels : parseInt(saved.martingaleLevels) || 5,
      galeSplitThreshold: saved.galeSplitThreshold !== undefined ? (typeof saved.galeSplitThreshold === 'number' ? saved.galeSplitThreshold : parseFloat(saved.galeSplitThreshold) || 0) : 0,
      galeSplitCount: saved.galeSplitCount !== undefined
        ? (typeof saved.galeSplitCount === 'number' ? saved.galeSplitCount : parseInt(saved.galeSplitCount) || 1)
        : (typeof saved.galeSplit === 'number' ? saved.galeSplit : parseInt(saved.galeSplit) || 1),
      sorosLimit: typeof saved.sorosLimit === 'number' ? saved.sorosLimit : parseInt(saved.sorosLimit) || 0,
      sorosProfitPercentage: typeof saved.sorosProfitPercentage === 'number' ? saved.sorosProfitPercentage : parseInt(saved.sorosProfitPercentage) || 100,
      galeRemovesSoros: saved.galeRemovesSoros ?? false,
      winReal: saved.winReal !== undefined ? parseInt(saved.winReal) : (saved.realWinsLimit !== undefined ? parseInt(saved.realWinsLimit) : 0),
      lossReal: saved.lossReal !== undefined ? parseInt(saved.lossReal) : (saved.realLossesLimit !== undefined ? parseInt(saved.realLossesLimit) : 0),
      winSimulated: saved.winSimulated !== undefined ? parseInt(saved.winSimulated) : (saved.simulatedWinsLimit !== undefined ? parseInt(saved.simulatedWinsLimit) : 0),
      lossSimulated: saved.lossSimulated !== undefined ? parseInt(saved.lossSimulated) : (saved.simulatedLossesLimit !== undefined ? parseInt(saved.simulatedLossesLimit) : 0),
      tradeLimit: saved.tradeLimit !== undefined ? parseInt(saved.tradeLimit) : 0,
      cooldown: saved.cooldown !== undefined ? parseInt(saved.cooldown) : (saved.cooldownPeriod !== undefined ? parseInt(saved.cooldownPeriod) : 3),
      pauseOnLoss: saved.pauseOnLoss ?? false,
      pauseOnWin: saved.pauseOnWin ?? false,
      pauseTime: saved.pauseTime !== undefined ? parseInt(saved.pauseTime) : 5,
    };
  };

  // Initialization Flow
  useEffect(() => {
    const init = async () => {
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
                 deriv.setToken(activeToken);
                 deriv.connect(); 
                 setTimeout(() => {
                  deriv.authenticate(activeToken);
                 },100);
                 
             } else {
                 deriv.connect();
                 setTimeout(() => {deriv.authenticate(activeToken);}, 100);
                 
             }
        }
        
        // Initialize MarketDataService
        MarketDataService.getInstance();
        
        // Initialize Blockly JavaScript generator
        initBlocklyJavaScriptGenerator();

        const loginid = getLoginIdFromStorage();
        if (loginid) {
          const key = `trade_config_user_${loginid}`;
          const savedStr = localStorage.getItem(key);
          if (savedStr) {
            const saved = normalizeSavedConfig(JSON.parse(savedStr));
            if (saved) {
              if (saved.symbol) setSelectedSymbol(saved.symbol);
              setConfig(prev => ({
                ...prev,
                stake: saved.stake,
                duration: saved.duration,
                durationUnit: saved.durationUnit,
                contractType: saved.contractType,
                tradeType: saved.tradeType,
                prediction: saved.prediction,
                barrier: saved.barrier,
                barrierHigh: saved.barrierHigh,
                barrierLow: saved.barrierLow,
                stopLoss: saved.stopLoss,
                takeProfit: saved.takeProfit,
                galeActive: saved.galeActive,
                martingaleFactor: saved.martingaleFactor,
                martingaleLevels: saved.martingaleLevels,
                galeSplitThreshold: saved.galeSplitThreshold,
                galeSplitCount: saved.galeSplitCount,
                sorosLimit: saved.sorosLimit,
                sorosProfitPercentage: saved.sorosProfitPercentage,
                galeRemovesSoros: saved.galeRemovesSoros,
                winReal: saved.winReal,
                lossReal: saved.lossReal,
                winSimulated: saved.winSimulated,
                lossSimulated: saved.lossSimulated,
                tradeLimit: saved.tradeLimit,
                cooldown: saved.cooldown,
                pauseOnLoss: saved.pauseOnLoss,
                pauseOnWin: saved.pauseOnWin,
                pauseTime: saved.pauseTime,
              }));
            }
          }
        }
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

  useEffect(() => {
    if (!isRunning) {
      setEngineState(null);
      return;
    }

    const interval = setInterval(() => {
      const state = botEngine.current?.getState?.();
      if (!state) return;
      setEngineState(state);
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Update Market Data Service when symbol changes
  useEffect(() => {
      if (selectedSymbol) {
          MarketDataService.getInstance().setActiveSymbol(selectedSymbol);
      }
  }, [selectedSymbol]);

  useEffect(() => {
    let cancelled = false;
    const loadContracts = async () => {
      if (!selectedSymbol) {
        setAvailableContractTypes([]);
        return;
      }

      try {
        const marketData = MarketDataService.getInstance();
        const contractsData = await marketData.getContractsFor(selectedSymbol);
        const available = contractsData?.contracts_for?.available || contractsData?.available || [];
        const types = Array.from(
          new Set(
            (available as any[])
              .map((c) => c?.contract_type)
              .filter((t) => typeof t === 'string' && t.trim() !== '')
          )
        );

        const withGroups = [...types];
        if (withGroups.includes('CALLE') && withGroups.includes('PUTE') && !withGroups.includes('HIGHER_LOWER_GROUP')) {
          withGroups.unshift('HIGHER_LOWER_GROUP');
        }

        if (cancelled) return;
        setAvailableContractTypes(withGroups);

        setConfig((prev) => {
          const nextContractType =
            prev.contractType && withGroups.includes(prev.contractType)
              ? prev.contractType
              : (withGroups.includes('DIGITDIFF') ? 'DIGITDIFF' : (withGroups[0] || ''));

          const nextTradeType = nextContractType === 'HIGHER_LOWER_GROUP'
            ? (prev.tradeType === 'BOTH' || prev.tradeType === 'CALLE' || prev.tradeType === 'PUTE' ? prev.tradeType : 'CALLE')
            : (prev.tradeType && withGroups.includes(prev.tradeType) ? prev.tradeType : (nextContractType || prev.tradeType));

          const next = {
            ...prev,
            contractType: nextContractType,
            tradeType: nextTradeType,
          };

          saveCurrentConfiguration(next, selectedSymbol);
          return next;
        });
      } catch {
        if (!cancelled) setAvailableContractTypes([]);
      }
    };

    loadContracts();
    return () => {
      cancelled = true;
    };
  }, [selectedSymbol]);

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => {
      const updated = { ...prev, [key]: value };
      saveCurrentConfiguration(updated, selectedSymbol);
      return updated;
    });
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

              // Store the original strategy text that was sent to the AI
              setStrategyText(text);
              setGeneratedStrategy(response.strategy);

              if (response.strategy.money_management) {
                  setConfig(prev => ({
                      ...prev,
                      stake: response.strategy.money_management.stake ?? prev.stake,
                      stopLoss: response.strategy.money_management.stop_loss ?? prev.stopLoss,
                      takeProfit: response.strategy.money_management.take_profit ?? prev.takeProfit
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

  const validateBeforeStart = () => {
    if (!selectedSymbol) {
      return { ok: false as const, message: 'Selecione um ativo antes de iniciar.' };
    }

    if (!config.contractType) {
      return { ok: false as const, message: 'Selecione um tipo de contrato antes de iniciar.' };
    }

    if (!config.tradeType) {
      return { ok: false as const, message: 'Selecione um tipo de trade antes de iniciar.' };
    }

    const stakeValue = Number(config.stake);
    if (!Number.isFinite(stakeValue) || stakeValue < 0.35) {
      return { ok: false as const, message: 'Entrada inicial mínima é $0.35.' };
    }

    const durationValue = Number(config.duration);
    if (!Number.isFinite(durationValue) || durationValue <= 0) {
      return { ok: false as const, message: 'Duração inválida.' };
    }

    if (!config.durationUnit) {
      return { ok: false as const, message: 'Selecione a unidade de duração.' };
    }

    const selector = new TradeContractSelector(availableContractTypes);
    if (config.tradeType === 'BOTH') {
      const both = selector.getBothContracts(config.contractType || config.tradeType);
      if (!both || both.contracts.length < 2) {
        return { ok: false as const, message: 'Modo Ambos indisponível para o contrato selecionado.' };
      }

      const invalid = both.contracts.find((ct) => !selector.validateContract(ct, config.prediction ?? null).isValid);
      if (invalid) {
        return { ok: false as const, message: 'Configuração inválida para modo Ambos (previsão/barreira).' };
      }
    } else {
      const validation = selector.validateContract(config.tradeType, config.prediction ?? null);
      if (!validation.isValid) {
        return { ok: false as const, message: 'Configuração inválida para o contrato selecionado (previsão/barreira).' };
      }
    }

    return { ok: true as const };
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
      if (isAiProcessing) {
        toast.warning('Aguarde a IA finalizar antes de iniciar.');
        return;
      }
      
      const validation = validateBeforeStart();
      if (!validation.ok) {
        toast.warning(validation.message);
        return;
      }

      // Check which view we're in to determine which engine to start
      if (mainView === 'blockly') {
        // For Blockly view, we need to start the BlocklyBot engine from within the editor
        toast.info("Inicie o bot diretamente no Editor Visual.");
        return;
      }
      
      // Detect if virtual account from localStorage
       const accountsStr = localStorage.getItem('deriv_accounts');
      const activeToken = JSON.parse(accountsStr)[0]?.activeToken || [];
      let isVirtualAccount = true;
      
      if (accountsStr && activeToken) {
        try {
          const accounts = JSON.parse(accountsStr);
          const activeAccount = accounts.find((a: any) => a.token === activeToken);
          if (activeAccount) {
            isVirtualAccount = activeAccount.is_virtual === true || activeAccount.is_virtual === 1;
          }
        } catch (e) {
          console.error('Error parsing accounts:', e);
        }
      }
      
      // Build complete bot configuration with all legacy fields
      const botConf = {
        symbol: selectedSymbol,
        stake: config.stake,
        duration: config.duration,
        durationUnit: config.durationUnit,
        contractType: config.contractType,
        tradeType: config.tradeType,
        prediction: config.prediction,
        barrier: config.barrier,
        barrierHigh: config.barrierHigh,
        barrierLow: config.barrierLow,
        stopLoss: config.stopLoss,
        takeProfit: config.takeProfit,
        
        // Gale settings
        galeActive: config.galeActive,
        martingaleFactor: config.martingaleFactor,
        martingaleLevels: config.martingaleLevels,
        galeSplitThreshold: config.galeSplitThreshold,
        galeSplitCount: config.galeSplitCount,
        
        // Soros settings
        sorosLimit: config.sorosLimit,
        sorosProfitPercentage: config.sorosProfitPercentage,
        galeRemovesSoros: config.galeRemovesSoros,
        
        // Controller limits
        winReal: config.winReal,
        lossReal: config.lossReal,
        winSimulated: config.winSimulated,
        lossSimulated: config.lossSimulated,
        tradeLimit: config.tradeLimit,
        cooldown: config.cooldown,
        
        // Pause settings
        pauseOnWin: config.pauseOnWin,
        pauseOnLoss: config.pauseOnLoss,
        pauseTime: config.pauseTime
      };
      
      // Use generated strategy or create a default one based on manual inputs
      const strategyToUse = generatedStrategy || {
        name: "Manual Strategy",
        conditions: [],
        action: config.tradeType
      };
      
      if (!generatedStrategy) {
        addLog("⚠️ Iniciando sem estratégia de IA definida. Gestão de risco será aplicada.");
      }

      setIsStarting(true);

      // Create engine with all callbacks
      botEngine.current = new BotExecutionEngine(
        botConf, 
        strategyToUse,
        addLog,
        (trade: TradeRecord) => {
          const emoji = trade.status === 'WIN' ? '✅' : '❌';
          toast.info(`${emoji} ${trade.mode} Trade ${trade.status}: $${trade.profit.toFixed(2)}`);
          setResultsList(prev => [trade, ...prev]);
          setLastTradeOutcome({ result: trade.status, simulated: trade.mode === 'SIMULACAO' });
        },
        (mode: TradeMode, reason: string) => {
          // Mode change callback
          toast.info(`🔄 Modo: ${mode} - ${reason}`);
        },
        (reason: string) => {
          // Stop callback
          setIsRunning(false);
          toast.warning(reason);
        },
        isVirtualAccount,
        getLoginIdFromStorage()
      );
      
      botEngine.current.start();
      setIsRunning(true);
      setMainView('dashboard'); // Switch to dashboard to see logs
      setIsStarting(false);
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
                onSelectSymbol={(s) => {
                  setSelectedSymbol(s);
                  saveCurrentConfiguration(config, s);
                }} 
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
                    <TradeConfig config={config} availableContractTypes={availableContractTypes} onChange={handleConfigChange} />
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
                disabled={isStarting}
                className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {isRunning ? (
                    <>
                        <StopIcon className="w-5 h-5" />
                        PARAR
                    </>
                ) : (
                    <>
                        <PlayIcon className="w-5 h-5" />
                        {isStarting ? 'INICIANDO...' : 'INICIAR'}
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
                                draftStorageKey={(() => {
                                  const loginid = getLoginIdFromStorage();
                                  return loginid ? `monitoring_strategy_${loginid}` : null;
                                })()}
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
               <MarketAnalysisPanel
                 symbol={selectedSymbol}
                 strategyText={strategyText}
                 generatedStrategy={generatedStrategy}
                 userKey={getLoginIdFromStorage()}
                 lastTradeOutcome={lastTradeOutcome}
                 cooldownTicksRemaining={engineState?.cooldownTicks}
                 cooldownTicksTotal={engineState?.cooldownTicksTotal}
                 isTrading={engineState?.isTrading}
               />
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
