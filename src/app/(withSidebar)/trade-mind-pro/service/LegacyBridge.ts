import { EventEmitter } from 'events';

// Definição dos tipos globais expostos pelos scripts legados
declare global {
  interface Window {
    // Core Managers
    TradeManager: any; // Class
    tradeManager: any; // Instance
    DerivAPI: any;
    DerivMarketData: any;
    SessionManager: any;
    TokenBackendClient: any;
    AccountManager: any;
    
    // AI & Strategy
    GeminiAI: any;
    getGeminiInstance: () => any;
    
    StrategyPreprocessor: any;
    getStrategyPreprocessorInstance: () => any;
    
    GeminiStrategyValidator: any;
    
    GenerateFormat: any; // Classe
    getFormatGeneratorInstance: () => any;
    
    PromptManager: any;
    getPromptManagerInstance: () => any;
    
    AIChatContext: any;
    
    // Rules & Indicators
    RobotStrategy: any;
    RegrasJS: any; 
    AuxiliarRegras: any;
    RulesHistoryManager: any;
    ProbabilityAccuracy: any;
    ProbabilityAccuracyManager: any;
    RSIIndicator: any;
    SMAIndicator: any;
    
    // Utils
    CommonHelpers: any;
    MarketDataHelpers: any;
    UIHelpers: any;

    // View
    MonitoringView: any;
    TradeMessagesManager: any;
    
    // Stop & Monitor
    StopMonitor: any;
    getTradeManagerInstance: () => any;
    getMarketDataInstance?: (token: string) => any;
    marketDataInstance?: any;
    formatGeneratorInstance?: any;

    // Shims for legacy compatibility
    selectedSymbol: string;
    logConfig: any;
    CreditsManager: any; // Mock
    UserLevels: any; // Mock
  }
}

export class LegacyBridgeService extends EventEmitter {
  private static instance: LegacyBridgeService;
  private scriptsLoaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): LegacyBridgeService {
    if (!LegacyBridgeService.instance) {
      LegacyBridgeService.instance = new LegacyBridgeService();
    }
    return LegacyBridgeService.instance;
  }

  /**
   * Carrega todos os scripts legados na ordem correta.
   * Garante que só sejam carregados uma vez.
   */
  public async loadLegacyScripts(): Promise<void> {
    if (this.scriptsLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.executeLoading();
    return this.loadingPromise;
  }

  private async executeLoading(): Promise<void> {
    console.log('[LegacyBridge] Iniciando carregamento de scripts legados...');

    // 1. Shims e Globais Prévios (Críticos para evitar erros nos scripts)
    this.setupShims();

    // 2. Ordem de Carregamento (Crítica)
    const scripts = [
      // Utils
       '/legacy/js/utils/common-helpers.js',
    //   '/legacy/js/utils/market-data-helpers.js',
    //   '/legacy/js/utils/ui-helpers.js',

      // Core / Infra
    //   '/legacy/js/session.js',
    //   '/legacy/js/token-backend-client.js',
    //   '/legacy/js/frontend-reconnection-manager.js',
    //   '/legacy/js/deriv-api.js',
       '/legacy/js/deriv-market-data.js',

      // Regras e Indicadores (Dependências para Strategy/AI)
      '/legacy/js/rsi-indicator.js',
      '/legacy/js/sma-indicator.js',
      '/legacy/js/probability-accuracy.js',
      '/legacy/js/digit-pattern-rules.js',
      '/legacy/js/percentage-rules.js',
      '/legacy/js/price-movement-rules.js',
      
      // Estratégia Base
      '/legacy/js/regras-json.js',
    //   '/legacy/js/Auxiliar-regras.js',
      '/legacy/js/rules-history-manager.js',
    '/legacy/js/rule-compatibility-validator.js',
    //   '/legacy/js/robot-strategy.js',

      // AI Modules (Factories)
       '/legacy/js/prompt-manager.js',         // Define getPromptManagerInstance
       '/legacy/js/generate-format.js',        // Define getFormatGeneratorInstance
       '/legacy/js/strategy-preprocessor.js',  // Define getStrategyPreprocessorInstance
       '/legacy/js/gemini-strategy-validator.js',
       '/legacy/js/gemini-ai.js',              // Define getGeminiInstance (depende de format/prompt/preprocessor)
      '/legacy/js/ai-chat-context.js',

      // Trade Execution (Depende de tudo acima)
      '/legacy/js/trade/TradeContractSelector.js',
      '/legacy/js/trade/TradeModeRiskController.js',
      '/legacy/js/trade/TradeSessionConfig.js',
      '/legacy/js/trade/TradeSettlementReporter.js',
      '/legacy/js/trade-messages.js',
      '/legacy/js/commission-tracker.js',
      '/legacy/js/stop-monitor.js',
      '/legacy/js/pause_manager.js',
      '/legacy/js/trade-manager.js',
    //   '/legacy/js/headless-monitoring.js',
      
       // Orquestrador headless
    ];

    let generateFormatGetter: any = null;
    for (const src of scripts) {
      await this.loadScript(src);
      if (src === '/legacy/js/generate-format.js' && typeof window.getFormatGeneratorInstance === 'function') {
        generateFormatGetter = window.getFormatGeneratorInstance;
      }
    }

    if (generateFormatGetter) {
      window.getFormatGeneratorInstance = generateFormatGetter;
      try {
        window.formatGeneratorInstance = window.getFormatGeneratorInstance();
      } catch {}
    }

    this.scriptsLoaded = true;
    console.log('[LegacyBridge] Todos os scripts legados carregados com sucesso.');
    
    // Configurar intercepção de mensagens de trade
    this.setupTradeMessageInterceptor();
    this.setupStopMonitorInterceptor();
    this.setupModeChangeInterceptor();
    this.setupTradeManagerInterceptors();
    
    this.emit('ready');
  }

  private setupStopMonitorInterceptor() {
      if (typeof window.StopMonitor !== 'undefined') {
          const self = this;
          
          // Interceptar popup de parada (Stop Loss, Take Profit, etc.)
          window.StopMonitor.showStopTradePopup = function(type: string, currentValue: number, limitValue: number) {
              console.log(`[LegacyBridge] Stop Limit reached: ${type} | ${currentValue}/${limitValue}`);
              
              self.emit('stop_limit', {
                  type,
                  currentValue,
                  limitValue,
                  message: `Limite atingido: ${type}`
              });
              
              // Parar monitoramento via bridge
              self.stopAllMonitoring();
          };
          
          // Interceptar parada total
          window.StopMonitor.stopAllMonitoring = function() {
              console.log('[LegacyBridge] StopMonitor.stopAllMonitoring chamado.');
              self.stopAllMonitoring();
          };
          
          console.log('[LegacyBridge] Interceptador de StopMonitor configurado.');
      }
  }

  private setupModeChangeInterceptor() {
      setTimeout(() => {
          if (typeof window.tradeManager !== 'undefined') {
              const tm = window.tradeManager;
              const originalOnModeChange = tm.onModeChange;
              const self = this;
              let previousMode = tm.currentMode || 'SIMULACAO';

              tm.onModeChange = function(mode: string, reason: string) {
                  console.log(`[LegacyBridge] Mudança de modo: ${previousMode} → ${mode} (${reason})`);

                  self.emit('mode_change', { mode, reason, previousMode });
                  previousMode = mode;

                  if (originalOnModeChange) {
                      originalOnModeChange.call(tm, mode, reason);
                  }
              };
              console.log('[LegacyBridge] Interceptador de ModeChange configurado.');
          } else {
             console.warn('[LegacyBridge] tradeManager instance not found for ModeChange interceptor.');
          }
      }, 2000);
  }

  private setupTradeManagerInterceptors() {
      setTimeout(() => {
          if (typeof window.tradeManager !== 'undefined') {
              const tm = window.tradeManager;
              
              // Intercept onTradeStart
              const originalOnTradeStart = tm.onTradeStart;
              tm.onTradeStart = (contractId: string) => {
                  console.log(`[LegacyBridge] Trade Started: ${contractId}`);
                  this.emit('trade_start', { contractId });
                  if (originalOnTradeStart) originalOnTradeStart(contractId);
              };

              // Intercept onTradeEnd
              const originalOnTradeEnd = tm.onTradeEnd;
              tm.onTradeEnd = (contractId: string, result: any) => {
                  console.log(`[LegacyBridge] Trade Ended: ${contractId}`, result);
                  this.emit('trade_end', { contractId, result });
                  if (originalOnTradeEnd) originalOnTradeEnd(contractId, result);
              };
              
              console.log('[LegacyBridge] TradeManager interceptors set.');
          }
      }, 2000);
  }

  public startMonitoring(strategyText: string) {
      console.log('[LegacyBridge] Starting monitoring with strategy...');
      
      // 1. Shim DOM elements required by MonitoringView
      let strategyTextArea = document.getElementById('strategy-text') as HTMLTextAreaElement;
      if (!strategyTextArea) {
          strategyTextArea = document.createElement('textarea');
          strategyTextArea.id = 'strategy-text';
          strategyTextArea.style.display = 'none';
          document.body.appendChild(strategyTextArea);
      }
      strategyTextArea.value = strategyText;
      
      // Shim other elements if necessary
      if (!document.getElementById('immediate-execution-mode')) {
           const checkbox = document.createElement('input');
           checkbox.type = 'checkbox';
           checkbox.id = 'immediate-execution-mode';
           checkbox.style.display = 'none';
           document.body.appendChild(checkbox);
      }
      
      // Shim start-monitoring-btn to avoid errors when MonitoringView tries to update it
      if (!document.getElementById('start-monitoring-btn')) {
           const btn = document.createElement('button');
           btn.id = 'start-monitoring-btn';
           btn.style.display = 'none';
           document.body.appendChild(btn);
      }

      // 2. Call startMonitoring
      if (typeof window.MonitoringView !== 'undefined') {
          // Passar estratégia diretamente para o modo headless
          window.MonitoringView.startMonitoring(strategyText);
          this.emit('start_monitoring');
      } else {
          console.error('MonitoringView not found');
      }
  }

  public stopAllMonitoring() {
      // Tentar parar via MonitoringView (que limpa timers e UI)
      if (typeof window.MonitoringView !== 'undefined' && window.MonitoringView.stopAll) {
          window.MonitoringView.stopAll();
      } 
      // Fallback para TradeManager direto
      else if (typeof window.tradeManager !== 'undefined') {
          window.tradeManager.stop();
      }
      
      this.emit('stop_monitoring');
  }

  private setupTradeMessageInterceptor() {
      if (typeof window.TradeMessagesManager !== 'undefined' && window.TradeMessagesManager.prototype) {
          const originalAddTradeMessage = window.TradeMessagesManager.prototype.addTradeMessage;
          const self = this;

          window.TradeMessagesManager.prototype.addTradeMessage = function(...args: any[]) {
              const result = originalAddTradeMessage.apply(this, args);

              try {
                  const [contractType, entryPrice, exitPrice, mode, isWin, stake, profit, galeMultiplier, prediction] = args;

                  // Dados completos do trade
                  const tm = typeof window.tradeManager !== 'undefined' ? window.tradeManager : null;
                  const tradeData = {
                      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                      contractType,
                      entryPrice: String(entryPrice || ''),
                      exitPrice: String(exitPrice || ''),
                      mode: mode || 'SIMULACAO',
                      status: isWin ? 'WIN' as const : 'LOSS' as const,
                      stake: parseFloat(stake || 0),
                      profit: parseFloat(profit || 0),
                      prediction: prediction !== undefined ? prediction : null,
                      symbol: tm?.config?.symbol || window.selectedSymbol || '',
                      timestamp: new Date(),
                      payout: tm?.currentProposalPayout || null,
                      isSimulation: mode === 'SIMULACAO' ? 'SIMULACAO' : 'REAL'
                  };

                  self.emit('trade', tradeData);
                  console.log('[LegacyBridge] Trade interceptado:', tradeData);
              } catch (e) {
                  console.error('[LegacyBridge] Erro ao interceptar trade:', e);
              }

              return result;
          };
          console.log('[LegacyBridge] Interceptador de TradeMessagesManager configurado.');
      } else {
          console.warn('[LegacyBridge] TradeMessagesManager não encontrado para intercepção.');
      }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 🎯 FORCE RELOAD: Ignorar script existente se estiver em desenvolvimento ou se precisarmos forçar atualização
      // if (document.querySelector(`script[src="${src}"]`)) {
      //   resolve();
      //   return;
      // }

      // Remover script anterior se existir para forçar recarregamento
      const existingScript = document.querySelector(`script[src^="${src}"]`);
      if (existingScript) {
          existingScript.remove();
      }

      const script = document.createElement('script');
      // Adicionar timestamp para evitar cache do navegador
      script.src = `${src}?v=${Date.now()}`; 
      script.async = false; // Importante para manter a ordem
      script.onload = () => resolve();
      script.onerror = (e) => {
        console.error(`[LegacyBridge] Erro ao carregar: ${src}`, e);
        reject(e);
      };
      document.body.appendChild(script);
    });
  }

  private setupShims() {
    if (typeof window === 'undefined') return;

    // Shim para selectedSymbol
    if (!window.selectedSymbol) {
        Object.defineProperty(window, 'selectedSymbol', {
            get: () => localStorage.getItem('selectedSymbol') || 'R_100',
            set: (val) => localStorage.setItem('selectedSymbol', val),
            configurable: true
        });
    }

    // Shim para logConfig
    if (!window.logConfig) {
      const bridge = LegacyBridgeService.getInstance();
      window.logConfig = {
        shouldLog: () => true,
        info: (ctx: string, msg: string) => { 
            console.log(`[${ctx}] ${msg}`);
            bridge.emit('log', `[INFO] ${msg}`);
        },
        warn: (ctx: string, msg: string) => {
            console.warn(`[${ctx}] ${msg}`);
            bridge.emit('log', `[WARN] ${msg}`);
        },
        error: (ctx: string, msg: string) => {
            console.error(`[${ctx}] ${msg}`);
            bridge.emit('log', `[ERROR] ${msg}`);
        },
        debug: (ctx: string, msg: string) => console.debug(`[${ctx}] ${msg}`),
      };
    }

    // Mock para CreditsManager (Remoção de créditos)
    // Engana o gemini-ai.js fazendo-o acreditar que tem créditos infinitos
    if (!window.CreditsManager) {
      window.CreditsManager = {
        hasCredits: () => true,
        getCurrentCredits: async () => 999999, // Saldo alto
        deductCredit: async () => true,
        checkBalance: () => 999999,
        refreshCredits: () => {},
        init: () => {},
        CREDIT_COSTS: {
            GEMINI_TRANSLATION: 0, // Custo zero
            AI_CHAT: 0
        }
      };
    }
    
    // Mock para UserLevels
    if (!window.UserLevels) {
        window.UserLevels = {
            isVip: () => true,
            getLevel: () => 'vip',
            getCurrentUserLevel: () => 'vip'
        };
    }

    // Shim para SessionManager (usado por gemini-ai.js para autenticação)
    if (!window.SessionManager) {
        window.SessionManager = {
            getUserSessionId: () => {
                try {
                    const accounts = JSON.parse(localStorage.getItem('deriv_accounts') || '[]');
                    return accounts[0]?.loginId || accounts[0]?.selectedLoginId || '';
                } catch { return ''; }
            },
            getLocalToken: () => {
                try {
                    const accounts = JSON.parse(localStorage.getItem('deriv_accounts') || '[]');
                    return accounts[0]?.activeToken || '';
                } catch { return ''; }
            },
            getCurrentUser: () => {
                try {
                    const accounts = JSON.parse(localStorage.getItem('deriv_accounts') || '[]');
                    const account = accounts[0];
                    if (!account) return null;
                    return {
                        authorize: {
                            loginid: account.loginId || account.selectedLoginId,
                            is_virtual: account.tokens?.some((t: any) => t.is_virtual && t.token === account.activeToken) ?? false
                        }
                    };
                } catch { return null; }
            },
            getSessionData: (key: string) => {
                try { return localStorage.getItem(key); } catch { return null; }
            },
            safeStorageOperation: (key: string, fn: () => any) => {
                try { return fn(); } catch { return null; }
            },
            getTokenByLoginId: (loginId: string) => {
                try {
                    const accounts = JSON.parse(localStorage.getItem('deriv_accounts') || '[]');
                    const token = accounts[0]?.tokens?.find((t: any) => t.acct === loginId || t.loginid === loginId);
                    return token?.token || null;
                } catch { return null; }
            }
        };
    }
  }

  /**
   * Configura o TradeManager legado com as configurações do React
   */
  public configureTradeManager(config: any) {
    let tm = window.tradeManager;

    // Se não existe instância, tentar criar via factory
    if (!tm && typeof window.getTradeManagerInstance === 'function') {
      tm = window.getTradeManagerInstance();
    }

    if (!tm) {
      console.error('[LegacyBridge] TradeManager não disponível para configuração.');
      return;
    }

    // Mapear config do React → config do TradeManager legado
    const mappedConfig: any = {};

    if (config.symbol) mappedConfig.symbol = config.symbol;
    if (config.contractType) mappedConfig.contractType = config.contractType;
    if (config.duration !== undefined) mappedConfig.duration = config.duration;
    if (config.durationUnit) mappedConfig.durationUnit = config.durationUnit;
    if (config.prediction !== undefined) {
      mappedConfig.prediction = { type: 'digit', value: config.prediction };
    }
    if (config.barrier !== undefined) mappedConfig.barrier = config.barrier;
    if (config.stake !== undefined) mappedConfig.stake = config.stake;
    if (config.galeActive !== undefined) mappedConfig.galeActive = config.galeActive;
    if (config.galeAdjustment !== undefined) mappedConfig.galeAdjustment = config.galeAdjustment;
    if (config.galeSplit !== undefined) mappedConfig.galeSplit = config.galeSplit;
    if (config.galeSplitThreshold !== undefined) mappedConfig.galeSplitThreshold = config.galeSplitThreshold;
    if (config.cooldownPeriod !== undefined) mappedConfig.cooldownPeriod = config.cooldownPeriod;
    if (config.sorosLimit !== undefined) mappedConfig.sorosLimit = config.sorosLimit;
    if (config.sorosPercentage !== undefined) mappedConfig.sorosPercentage = config.sorosPercentage;
    if (config.galeRemovesSoros !== undefined) mappedConfig.galeRemovesSoros = config.galeRemovesSoros;

    // Controller limits → legacy naming
    if (config.winReal !== undefined) mappedConfig.realWinsLimit = config.winReal;
    if (config.lossReal !== undefined) mappedConfig.realLossesLimit = config.lossReal;
    if (config.winSimulated !== undefined) mappedConfig.simulatedWinsLimit = config.winSimulated;
    if (config.lossSimulated !== undefined) mappedConfig.simulatedLossesLimit = config.lossSimulated;

    // Management: goal/stopLoss
    if (config.goal !== undefined) mappedConfig.goal = config.goal;
    if (config.stopLoss !== undefined) mappedConfig.stopLoss = config.stopLoss;

    // Aplicar config
    Object.assign(tm.config, mappedConfig);

    // Configurar modo real/virtual
    if (config.tradeReal !== undefined) {
      tm.tradeReal = config.tradeReal;
    }

    // Ativar o trade manager
    tm.start();

    console.log('[LegacyBridge] TradeManager configurado:', mappedConfig);
  }

  /**
   * Para o TradeManager legado
   */
  public stopTradeManager() {
    if (typeof window.tradeManager !== 'undefined') {
      window.tradeManager.stop();
      console.log('[LegacyBridge] TradeManager parado.');
    }
    this.emit('stop_monitoring');
  }

  // --- Helpers de Acesso às Instâncias ---

  public getGeminiAI() {
    if (typeof window.getGeminiInstance === 'function') {
        return window.getGeminiInstance();
    }
    return null;
  }

  public getStrategyPreprocessor() {
      if (typeof window.getStrategyPreprocessorInstance === 'function') {
          return window.getStrategyPreprocessorInstance();
      }
      return null;
  }

  public updateTradeConfig(config: any) {
      if (typeof window.tradeManager !== 'undefined') {
          // Tentar método updateConfig se existir
          if (typeof window.tradeManager.updateConfig === 'function') {
              window.tradeManager.updateConfig(config);
          } 
          // Tentar injetar diretamente no objeto de config se acessível
          else if (window.tradeManager.config) {
              Object.assign(window.tradeManager.config, config);
          }
          
          console.log('[LegacyBridge] Configuração atualizada:', config);
      }
  }

  // --- Phase 3: Market Data Verification ---
  
  public verifyMarketDataConnection(symbol: string): Promise<boolean> {
      return new Promise((resolve) => {
          if (!window.DerivMarketData) {
              console.error('[LegacyBridge] DerivMarketData não encontrado.');
              resolve(false);
              return;
          }

          // Se já temos instância, usamos ela
          let marketData = window.getMarketDataInstance ? window.getMarketDataInstance('dummy_token') : null;
          
          // Se não, tentamos criar ou acessar a global
          if (!marketData && window.marketDataInstance) {
              marketData = window.marketDataInstance;
          }

          if (!marketData) {
             console.warn('[LegacyBridge] Instância de MarketData não disponível para verificação.');
             // Tenta instanciar se possível (precisa de token real, mas para teste de estrutura ok)
             // resolve(false);
             // return;
          }

          console.log(`[LegacyBridge] Verificando conexão de dados para ${symbol}...`);
          
          // Verificar se recebemos ticks via evento global
          const timeout = setTimeout(() => {
              window.removeEventListener('marketDataUpdate', listener);
              console.warn('[LegacyBridge] Timeout aguardando dados de mercado.');
              resolve(false);
          }, 5000);

          const listener = (e: any) => {
              if (e.detail && e.detail.symbol === symbol) {
                  console.log('[LegacyBridge] Dados de mercado recebidos com sucesso!', e.detail);
                  clearTimeout(timeout);
                  window.removeEventListener('marketDataUpdate', listener);
                  resolve(true);
              }
          };

          window.addEventListener('marketDataUpdate', listener);
      });
  }
}

export const legacyBridge = LegacyBridgeService.getInstance();
