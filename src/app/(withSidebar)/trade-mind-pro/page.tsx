"use client";

import { ChartBarIcon, ChatBubbleLeftIcon, CodeBracketIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid';
import { toast ,ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AccountSelector from './components/AccountSelector';
import AiChatPanel from './components/AiChatPanel';
import AiSuggestionsModal from './components/AiSuggestionsModal';
import StrategyValidationModal, { StrategyValidationResult } from './components/StrategyValidationModal';
import BlocklyEditor from './components/BlocklyEditor';
import BotDashboard from './components/BotDashboard';
import ControllerConfig, { ControllerConfigData, DEFAULT_CONTROLLER_CONFIG } from './components/ControllerConfig';
import ManagementConfig, { ManagementConfigData, DEFAULT_MANAGEMENT_CONFIG } from './components/ManagementConfig';
import MarketAnalysisPanel from './components/MarketAnalysisPanel';
import TradeConfig, { TradeConfigData, DEFAULT_CONFIG as DEFAULT_TRADE_CONFIG } from './components/TradeConfig';
import VolatilitySelector from './components/VolatilitySelector';
import { useEffect, useState, useCallback, useRef } from 'react';
import { DerivService } from '@/app/services/DerivService';
import { monitoringService, RulesVisualData } from './service/Monitoring';
import { LegacyBridgeService } from './service/LegacyBridge';
import { AdvancedGeminiService } from './service/AdvancedGeminiService';
import { AdvancedRulesEngine } from './service/AdvancedRulesEngine';
import { Cog6ToothIcon } from '@heroicons/react/16/solid';

export default function TradeMindPro() {
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedSymbol') || '';
    }
    return '';
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiMode, setAiMode] = useState<'strategy' | 'chat' | 'config' | 'advanced'>('strategy');
  const [advancedRules, setAdvancedRules] = useState<any | null>(null);
  const advancedEngineRef = useRef<AdvancedRulesEngine | null>(null);
  const advancedGeminiRef = useRef(new AdvancedGeminiService());
  const [aiProgressMessage, setAiProgressMessage] = useState<string | null>(null);
  const [translatedRules, setTranslatedRules] = useState<any | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultsList, setResultsList] = useState<any[]>([]);
  
  // Modal de validação de estratégia
  const [validationModal, setValidationModal] = useState<{
    result: StrategyValidationResult;
    pendingText: string;
  } | null>(null);
  const pendingStrategyRef = useRef<{ text: string; proceed: () => void } | null>(null);

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
  const [rulesVisualData, setRulesVisualData] = useState<RulesVisualData | null>(null);
  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  }, []);

  const detectIsVirtualAccount = useCallback((): boolean => {
    try {
      const accountsStr = localStorage.getItem('deriv_accounts');
      if (!accountsStr) return true;
      const accounts = JSON.parse(accountsStr);
      const account = Array.isArray(accounts) ? accounts[0] : null;
      if (!account) return true;
      // Check if active token belongs to a virtual account
      const activeToken = account.activeToken;
      const tokenInfo = account.tokens?.find((t: any) => t.token === activeToken);
      return tokenInfo?.is_virtual ?? true;
    } catch {
      return true;
    }
  }, []);

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
                const response  = deriv.authenticate(activeToken);
                console.log("authenticate response ", response);
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

  // Cache de assinaturas de trades recentes para deduplicação entre bridge e window event
  const recentTradeKeysRef = useRef<Set<string>>(new Set());

  // Effect para listeners do LegacyBridge (trade results, mode changes, stop limits)
  useEffect(() => {
    const bridge = LegacyBridgeService.getInstance();

    // Chave de deduplicação: type + status + exit arredondado + stake (janela de 2s)
    const makeTradeKey = (d: any) => {
      const exitRounded = parseFloat(d.exitPrice || d.exit || '0').toFixed(2);
      const ts = Math.floor(Date.now() / 2000); // janela de 2 segundos
      return `${d.contractType || d.type}|${d.status}|${exitRounded}|${d.stake}|${ts}`;
    };

    const addTradeIfNew = (entry: any, key: string) => {
      if (recentTradeKeysRef.current.has(key)) return; // duplicata — ignorar
      recentTradeKeysRef.current.add(key);
      setTimeout(() => recentTradeKeysRef.current.delete(key), 4000); // limpar após 4s
      setResultsList(prev => [entry, ...prev]);
    };

    const handleTrade = (data: any) => {
      const entry = {
        ...data,
        type: data.contractType,
        target: String(data.prediction ?? data.entryPrice ?? ''),
        exit: String(data.exitPrice ?? ''),
      };
      addTradeIfNew(entry, makeTradeKey({ ...data, exit: data.exitPrice }));
      const emoji = data.status === 'WIN' ? '✅' : '❌';
      addLog(`${emoji} ${data.mode} Trade: ${data.contractType} | Profit: $${data.profit?.toFixed(2)}`);
      monitoringService.notifyTradeResult(data.status, data.mode === 'SIMULACAO');
      advancedEngineRef.current?.notifyTradeResult();
    };

    const handleModeChange = (data: any) => {
      addLog(`🔄 Modo: ${data.mode} - ${data.reason}`);
      toast.info(`Modo: ${data.mode}`);
    };

    const handleStop = (data: any) => {
      setIsRunning(false);
      monitoringService.stopExecution();
      bridge.stopTradeManager();
      addLog(`🛑 ${data.message || `Stop: ${data.type}`}`);
    };

    // Listener direto do window: fallback para quando o interceptor do LegacyBridge não captura
    const handleTradeResultFront = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data) return;
      addTradeIfNew(data, makeTradeKey(data));
      const emoji = data.status === 'WIN' ? '✅' : '❌';
      addLog(`${emoji} ${data.mode} Trade: ${data.type} | Profit: $${Number(data.profit ?? 0).toFixed(2)}`);
      monitoringService.notifyTradeResult(data.status, data.isSimulation === 'SIMULACAO');
      advancedEngineRef.current?.notifyTradeResult();
    };

    bridge.on('trade', handleTrade);
    bridge.on('mode_change', handleModeChange);
    bridge.on('stop_limit', handleStop);
    window.addEventListener('tradeResultFront', handleTradeResultFront);

    return () => {
      bridge.removeListener('trade', handleTrade);
      bridge.removeListener('mode_change', handleModeChange);
      bridge.removeListener('stop_limit', handleStop);
      window.removeEventListener('tradeResultFront', handleTradeResultFront);
    };
  }, [addLog]);

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
          },
          onProbabilityUpdate: (stats) => {
            setMarketStats(stats);
          },
          onRulesVisualUpdate: (rulesData) => {
            setRulesVisualData(rulesData);
          },
          onTradeSignal: (groupId, entryPrice, capturedPredictions) => {
            if (typeof window !== 'undefined' && (window as any).tradeManager) {
              const tm = (window as any).tradeManager;
              if (tm.isActive) {
                addLog(`⚡ Sinal detectado! Grupo ${groupId} | Preço: ${entryPrice}`);

                // Setar capturedPredictions no tradeManager (igual legado monitoring.js:6023-6037)
                if (capturedPredictions !== null && capturedPredictions !== undefined) {
                  if (Array.isArray(capturedPredictions)) {
                    tm.capturedPredictionsForTrade = capturedPredictions;
                  } else {
                    tm.capturedPredictionsForTrade = [{ contractType: null, predictionValue: capturedPredictions }];
                  }
                }

                // Ler config do painel via localStorage (fallback para this.config do legado)
                try {
                  const savedConfig = localStorage.getItem('trade_config_full');
                  if (savedConfig) {
                    const parsed = JSON.parse(savedConfig);
                    const cfg = parsed.config || parsed;

                    // Setar contractType do painel se não veio override da regra
                    if (cfg.tradeType && cfg.tradeType !== 'BOTH' && cfg.tradeType.trim() !== '') {
                      tm.config.contractType = cfg.tradeType;
                    }
                    // prediction do painel como fallback — garantir número (barrier deve ser int 0-9)
                    if (cfg.prediction !== undefined && cfg.prediction !== null && cfg.prediction !== '') {
                      tm.config.prediction = { type: 'prediction', value: Number(cfg.prediction) };
                    }
                  }
                } catch (e) {
                  // Silenciar — usa config já carregada no tradeManager
                }

                // Executar trade com proteção — garantir que isAwaitingTrade é resetado
                tm.executeTrade(entryPrice, groupId).catch((err: any) => {
                  console.error('[TradeMindPro] Erro no executeTrade:', err);
                  // Resetar estado para permitir novos sinais
                  monitoringService.notifyTradeResult('LOSS', true);
                });
              }
            }
          }
        });
        
        
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

  const toggleBot = async () => {
    if (isRunning) {
      // STOP
      if (advancedEngineRef.current) {
        advancedEngineRef.current.stop();
      }
      monitoringService.stopExecution();
      const bridge = LegacyBridgeService.getInstance();
      bridge.stopLegacyMonitoring();
      bridge.stopTradeManager();
      setIsRunning(false);
      addLog('Bot parado pelo usuário.');
      return;
    }

    // Validações
    if (!selectedSymbol) { toast.warning('Selecione um símbolo'); return; }

    try {
      setIsStarting(true);
      const bridge = LegacyBridgeService.getInstance();
      await bridge.loadLegacyScripts();

      // Salvar config completa no localStorage
      const fullConfig = { ...tradeConfig, ...managementConfig, ...controllerConfig, selectedSymbol };
      localStorage.setItem('trade_config_full', JSON.stringify({
        config: fullConfig, _timestamp: Date.now(), _autoSaved: true
      }));

      // Configurar trade manager com configs do React
      bridge.configureTradeManager({
        symbol: selectedSymbol,
        contractType: tradeConfig.contractType,
        tradeType: tradeConfig.tradeType,
        duration: tradeConfig.duration,
        durationUnit: tradeConfig.durationUnit,
        prediction: tradeConfig.prediction,
        barrier: tradeConfig.barrier,
        stake: managementConfig.stake,
        galeActive: managementConfig.galeMultiplier > 1,
        galeAdjustment: managementConfig.galeMultiplier,
        galeSplit: managementConfig.galeSplit,
        galeSplitThreshold: managementConfig.galeSplitThreshold,
        sorosLimit: managementConfig.sorosLimit,
        sorosPercentage: managementConfig.sorosProfitPercentage,
        galeRemovesSoros: managementConfig.galeRemovesSoros,
        goal: managementConfig.goal,
        stopLoss: managementConfig.stopLoss,
        winReal: controllerConfig.winReal,
        lossReal: controllerConfig.lossReal,
        winSimulated: controllerConfig.winSimulated,
        lossSimulated: controllerConfig.lossSimulated,
        cooldownPeriod: controllerConfig.cooldownPeriod,
        tradeReal: !detectIsVirtualAccount()
      });

      if (aiMode === 'advanced' && advancedEngineRef.current?.getRulesLoaded()) {
        // Modo avançado: o AdvancedRulesEngine faz a avaliação de regras e dispara trades
        monitoringService.setTranslatedRules({ groups: [], contract_type: null, prediction: null });
        advancedEngineRef.current.start();
        addLog('Motor avançado iniciado.');
      } else {
        // Modo normal: monitoringService avalia as regras
        if (!translatedRules) {
          monitoringService.setTranslatedRules({ groups: [], contract_type: null, prediction: null });
        }
        monitoringService.startExecution(
          translatedRules?.groupActivation || null,
          controllerConfig.cooldownPeriod || 3
        );
      }

      setIsRunning(true);
      setMainView('dashboard');
      addLog('🚀 Bot iniciado');
      addLog(`📊 Símbolo: ${selectedSymbol} | Stake: $${managementConfig.stake}`);
      addLog(`📋 Modo inicial: ${(window as any).tradeManager?.currentMode || (detectIsVirtualAccount() ? 'VIRTUAL' : 'REAL')}`);
    } catch (error: any) {
      toast.error('Erro ao iniciar o bot');
      addLog(`❌ Erro: ${error.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  /** Responde perguntas de mercado no modo Chat com contexto real dos últimos 50 dígitos */
  const handleChatMessage = async (text: string) => {
    try {
      setAiProgressMessage('Coletando dados de mercado...');

      const digits = monitoringService.getProbabilityHistory().slice(-50);
      const stats = monitoringService.getCurrentStats();
      const symbol = selectedSymbol || localStorage.getItem('selectedSymbol') || 'N/A';

      const probLines = stats
        ? Array.from({ length: 10 }, (_, d) => {
            const pct = (stats.probabilities[d] * 100).toFixed(1);
            const marker = d === stats.mostProbable ? ' ← maior' : d === stats.leastProbable ? ' ← menor' : '';
            return `  ${d}: ${pct}%${marker}`;
          }).join('\n')
        : '  (dados insuficientes — aguardando ticks)';

      const digitsLine = digits.length > 0 ? digits.join(' - ') : '(aguardando ticks)';

      const prompt =
        `Você é um analista de mercado especializado em trading de dígitos na plataforma Deriv.

INSTRUÇÕES:
- Responda SEMPRE em português.
- Vá direto ao ponto: use os dados abaixo para responder com números e percentuais concretos.
- NÃO repita os dados brutos de volta — analise-os e dê a resposta.
- Seja conciso: no máximo 3-4 parágrafos curtos.

=== DADOS DE MERCADO ===
Símbolo: ${symbol}
Últimos ${digits.length} dígitos (cronológico, mais recente à direita): ${digitsLine}

Probabilidades por dígito (histórico ponderado):
${probLines}

=== PERGUNTA ===
${text}`;

      setAiProgressMessage('Consultando IA...');

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: 'gemini-2.5-flash',
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 4096 },
        }),
      });

      const data = await response.json().catch(() => null);
      const rawText =
        data?.text ||
        data?.message ||
        data?.response ||
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        null;

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: rawText?.trim() || 'Desculpe, não consegui obter uma resposta. Tente novamente.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsAiProcessing(false);
      setAiProgressMessage(null);
    }
  };

  /** Executa a tradução da estratégia (chamada após aprovação de todas as validações) */
  const executeStrategyTranslation = async (text: string) => {
    setAiProgressMessage('Iniciando processamento...');
    try {
      const response = await monitoringService.translateStrategy(text, (message) => {
        setAiProgressMessage(message);
      });

      if (response?.translatedRules) {
        response.translatedRules = { ...response.translatedRules, originalText: text };
        setTranslatedRules(response.translatedRules);
        monitoringService.setTranslatedRules(response.translatedRules);
        setAiMode('config');
      }
      if (response?.source === 'gemini') {
        setAiProgressMessage('Estratégia criada com sucesso!');
      }
      setTimeout(() => setAiProgressMessage(null), 1200);
    } catch (e) {
      console.warn('Erro ao traduzir estratégia:', e);
    } finally {
      setIsAiProcessing(false);
    }
  };

  /** Salva estratégia avançada no histórico (rules_history_{loginId}) */
  const saveAdvancedToHistory = (text: string, rulesJson: any) => {
    try {
      const loginId = getLoginIdFromStorage();
      if (!loginId) return;
      const key = `rules_history_${loginId}`;
      let history: any[] = [];
      try { history = JSON.parse(localStorage.getItem(key) || '[]'); } catch { /* ignore */ }
      if (!Array.isArray(history)) history = [];

      const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
      const existingIdx = history.findIndex((item: any) => {
        const n = (item.rule || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
        return n === normalized;
      });

      const item = {
        rule: text.trim(),
        timestamp: Date.now(),
        usageCount: 1,
        hasJson: true,
        geminiJson: rulesJson,
        ruleCode: null,
        isAdvanced: true,
      };

      if (existingIdx !== -1) {
        history[existingIdx].usageCount = (history[existingIdx].usageCount || 0) + 1;
        history[existingIdx].timestamp = Date.now();
        history[existingIdx].geminiJson = rulesJson;
        history[existingIdx].hasJson = true;
        history[existingIdx].isAdvanced = true;
        // Mover para o topo
        const [moved] = history.splice(existingIdx, 1);
        history.unshift(moved);
      } else {
        history.unshift(item);
        if (history.length > 50) history = history.slice(0, 50);
      }

      localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.warn('[AdvancedMode] Erro ao salvar histórico:', e);
    }
  };

  /** Traduz estratégia avançada via AdvancedGeminiService e carrega no AdvancedRulesEngine */
  const executeAdvancedStrategyTranslation = async (text: string) => {
    setAiProgressMessage('Iniciando modo avançado...');
    try {
      const result = await advancedGeminiRef.current.translateAdvancedStrategy(text, (msg) => {
        setAiProgressMessage(msg);
      });

      if (!result.success || !result.rulesJson) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: `Erro ao gerar regras avançadas: ${result.error || 'Resposta inválida da IA. Tente reformular a estratégia.'}`,
          timestamp: new Date(),
        }]);
        return;
      }

      setAdvancedRules(result.rulesJson);

      // Criar / recriar o engine com as novas regras
      const engine = new AdvancedRulesEngine({
        symbol: selectedSymbol || localStorage.getItem('selectedSymbol') || 'R_100',
        onTradeSignal: (contractType, prediction) => {
          if (typeof window !== 'undefined' && (window as any).tradeManager?.isActive) {
            const tm = (window as any).tradeManager;
            tm.capturedPredictionsForTrade = [{ contractType, predictionValue: prediction }];
            tm.executeTrade(null, 'advanced').catch((err: any) => {
              console.error('[AdvancedEngine] Erro no executeTrade:', err);
              engine.notifyTradeResult();
            });
          }
        },
        onStatusChange: (msg) => addLog(`[Motor Avançado] ${msg}`),
        onRulesVisualUpdate: (data) => setRulesVisualData(data),
      });
      engine.loadRules(result.rulesJson);
      advancedEngineRef.current = engine;

      // Salvar no histórico
      saveAdvancedToHistory(text, result.rulesJson);

      const ruleName = result.rulesJson.name || 'Regras avançadas';
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: result.fromCache
          ? `Regras carregadas do cache: "${ruleName}". Clique em INICIAR para começar.`
          : `Regras carregadas no motor avançado: "${ruleName}". Clique em INICIAR para começar.`,
        timestamp: new Date(),
      }]);
    } catch (e: any) {
      console.warn('[AdvancedMode] Erro:', e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `Erro inesperado no modo avançado: ${e.message || 'Erro desconhecido'}. Tente novamente.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsAiProcessing(false);
      setAiProgressMessage(null);
    }
  };

  const handleAiMessage = async (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }]);
    setIsAiProcessing(true);
    setAiProgressMessage(null);

    try {
      if (aiMode === 'chat') {
        await handleChatMessage(text);
        return;
      }
      if (aiMode === 'advanced') {
        await executeAdvancedStrategyTranslation(text);
        return;
      }
      if (aiMode !== 'strategy') return;

      // ── 1. Validação de pré-condições (formato básico + compatibilidade contrato/trade-type) ──
      const precondition = await monitoringService._validatePreconditions(text, {
        contractType: tradeConfig.contractType,
        tradeType: tradeConfig.tradeType,
        prediction: tradeConfig.prediction,
      });

      if (!precondition.isValid) {
        setIsAiProcessing(false);
        setAiProgressMessage(null);
        setValidationModal({
          result: {
            valid: false,
            isCritical: true,
            issues: precondition.issues,
            suggestions: precondition.tips,
            warnings: [],
            source: 'precondition',
          },
          pendingText: text,
        });
        return;
      }

      // ── 2. Validação pré-Gemini (semântica: termos vagos, valores fora de limites, etc.) ──
      const preGemini = await monitoringService.validateStrategyForGemini(text);

      if (!preGemini.valid || preGemini.issues.length > 0) {
        setIsAiProcessing(false);
        setAiProgressMessage(null);
        // Guarda callback para o caso do usuário escolher "continuar mesmo assim"
        pendingStrategyRef.current = {
          text,
          proceed: () => executeStrategyTranslation(text),
        };
        setValidationModal({
          result: {
            ...preGemini,
            source: 'pregemini',
          },
          pendingText: text,
        });
        return;
      }

      // ── 3. Tudo ok — traduzir ──
      await executeStrategyTranslation(text);
    } catch (e) {
      console.warn('Erro ao enviar mensagem para o bot:', e);
      setIsAiProcessing(false);
    }
  };

  const requestSuggestions = async () => {}

  const clearChatMessages = () => {
    setMessages([]);
    setAiProgressMessage(null);
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

  /** Usuário clicou em "Continuar mesmo assim" no modal de avisos pré-Gemini */
  const handleValidationContinue = () => {
    setValidationModal(null);
    const pending = pendingStrategyRef.current;
    pendingStrategyRef.current = null;
    if (!pending) return;
    setIsAiProcessing(true);
    pending.proceed();
  };

  /** Usuário clicou em "Editar estratégia" ou "Entendi, vou corrigir" */
  const handleValidationEdit = () => {
    setValidationModal(null);
    pendingStrategyRef.current = null;
    setIsAiProcessing(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#0d0a18] p-4 gap-4">
      <ToastContainer theme="dark" />

      {/* Modal de validação de estratégia */}
      {validationModal && (
        <StrategyValidationModal
          result={validationModal.result}
          onContinue={handleValidationContinue}
          onEdit={handleValidationEdit}
        />
      )}

      <div className="w-80 flex flex-col bg-[#13111c] rounded-lg border border-gray-800 shadow-lg flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Cog6ToothIcon className="w-4 h-4" /> Configuração</h2>
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
            onClick={toggleBot}
            disabled={isStarting}
            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
              isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isRunning ? <StopIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            {isStarting ? 'INICIANDO...' : isRunning ? 'PARAR' : 'INICIAR'}
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
                  onClearMessages={clearChatMessages}
                  onStrategyGenerated={() => {}}
                  mode={aiMode}
                  onModeChange={(m) => setAiMode(m)}
                  advancedRulesLoaded={!!advancedRules}
                  progressMessage={aiProgressMessage}
                  onRequestSuggestions={requestSuggestions}
                  configRules={translatedRules}
                  onConfigRulesChange={(rules) => {
                    setTranslatedRules(rules);
                    monitoringService.updateGroupActivation(rules?.groupActivation || null);
                  }}
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
          <MarketAnalysisPanel
            symbol={selectedSymbol}
            marketStats={marketStats}
            rulesVisualData={rulesVisualData}
          />

        </div>
      )}

      <AiSuggestionsModal />
    </div>
  );
}
