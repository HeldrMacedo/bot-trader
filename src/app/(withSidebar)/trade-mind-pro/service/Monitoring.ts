import { DerivService } from "@/app/services/DerivService";
import { LegacyBridgeService } from "./LegacyBridge";

export interface ProbabilityStats {
  probabilities: number[];
  mostProbable: number;
  leastProbable: number;
  mostProbableValue: number;
  leastProbableValue: number;
  highestStrength: number;
  lowestStrength: number;
  sortedScores: { digit: number; prob: number }[];
  topN?: number;
  topNDigits?: number[];
}

export interface TickData {
  symbol: string;
  price: number;
  digit: number;
  timestamp: number;
}

export interface CapturedPrediction {
  contractType: string;
  predictionValue: number | string | null;
  _triggerDigit?: number;
  rule?: any;
}

interface Config {
  symbol: string;
  onTick?: (data: TickData) => void;
  onProbabilityUpdate?: (stats: ProbabilityStats) => void;
  onRulesVisualUpdate?: (rulesData: RulesVisualData) => void;
  onTradeSignal?: (groupId: number | string, entryPrice: number, capturedPredictions: CapturedPrediction[] | null) => void;
}

export interface RulesVisualRule {
  id: string | number;
  displayText: string;
  status: string;
}

export interface RulesVisualGroup {
  id: string | number;
  rules: RulesVisualRule[];
}

export interface RulesVisualData {
  groups: RulesVisualGroup[];
  isPreview: boolean;
  timestamp: number;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private deriv: DerivService;
  private legacyBridge: LegacyBridgeService;
  private config: Config | null = null;
  private isSubscribed = false;
  private tickListenerId: string | null = null;
  
  // History for probability calculations
  private probabilityHistory: number[] = [];
  private globalTickCounter = 0;
  private state: string;
  private currentTranslatedRules: any = null;
  private currentRulesVisualData: RulesVisualData | null = null;

  // Current tick price for trade signals
  private currentTickPrice = 0;

  // Trade execution state
  private isExecutionActive = false;
  private isAwaitingTrade = false;
  private groupActivationConfig: Record<number, any> | null = null;
  private lastTradeOutcome: { result: string; simulated: boolean } | null = null;
  private cooldownTicksRemaining = 0;
  private cooldownTicksTotal = 0;
  private constructor() {
    this.deriv = DerivService.getInstance();
    this.legacyBridge = LegacyBridgeService.getInstance();
    this.state = 'IDLE';
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
      if (typeof window !== 'undefined') {
        (window as any).MonitoringServiceInstance = MonitoringService.instance;
      }
    }
    return MonitoringService.instance;
  }

  /**
   * Inicializa o monitoramento para um símbolo específico
   * Carrega scripts legados se necessário e inicia coleta de ticks
   */
  public async start(config: Config): Promise<void> {
    this.config = config;

    // 1. Carregar scripts legados primeiro
    try {
      await this.legacyBridge.loadLegacyScripts();
    } catch (error) {
      // Continua mesmo sem scripts legados (modo fallback)
    }

    // 2. Inscrever nos ticks
    await this.subscribeToTicks();
    
    // 3. Configurar monitor de probabilidades
    this.setupProbabilityMonitor();
  }

  /**
   * Para o monitoramento atual
   */
  public stop(): void {
    if (this.tickListenerId) {
      this.deriv.observerInstance.removeById(this.tickListenerId);
      this.tickListenerId = null;
    }
    
    this.isSubscribed = false;
    this.probabilityHistory = [];
    this.globalTickCounter = 0;
    this.state = 'IDLE';
  }

  public async translateStrategy(strategyText: string, onProgress?: (message: string) => void) {
    const normalized = (strategyText || '').trim();
    if (!normalized) {
      return { translatedRules: null, source: 'empty', corrections: [] };
    }

    try {
      onProgress?.('Carregando módulos da IA...');
      await this.legacyBridge.loadLegacyScripts();
    } catch {
      return { translatedRules: null, source: 'legacy_unavailable', corrections: [] };
    }

    if (typeof window === 'undefined') {
      return { translatedRules: null, source: 'window_unavailable', corrections: [] };
    }

    const regrasJsonManager = typeof window.getRegrasJsonManagerInstance === 'function'
      ? window.getRegrasJsonManagerInstance()
      : null;

    if (regrasJsonManager?.hasCachedJson?.()) {
      onProgress?.('Encontrando JSON em cache...');
      const cachedJson = regrasJsonManager.getCachedGeminiJson?.();
      if (cachedJson) {
        regrasJsonManager.clearCachedGeminiJson?.();
        return { translatedRules: cachedJson, source: 'cached_json', corrections: [] };
      }
    }

    try {
      onProgress?.('Buscando código de regra...');
      const ruleCode = regrasJsonManager?.extractRuleCodeFromText?.(normalized);
      if (ruleCode) {
        const jsonByCode = regrasJsonManager.getJsonByRuleCode?.(ruleCode);
        if (jsonByCode) {
          return { translatedRules: jsonByCode, source: 'rule_code', corrections: [] };
        }
      }
    } catch {}

    onProgress?.('Verificando histórico...');
    const historicalJson = this.checkForHistoricalJson(normalized);
    if (historicalJson) {
      return { translatedRules: historicalJson, source: 'historical', corrections: [] };
    }

    if (regrasJsonManager?.getCachedTranslation) {
      try {
        onProgress?.('Verificando cache de traduções...');
        const cachedTranslation = await regrasJsonManager.getCachedTranslation(normalized);
        if (cachedTranslation) {
          return { translatedRules: cachedTranslation, source: 'cached_translation', corrections: [] };
        }
      } catch {}
    }

    onProgress?.('Pré-processando estratégia...');
    const preprocessResult = this.preprocessStrategyForGemini(normalized);
    const gemini = this.legacyBridge.getGeminiAI();
    if (!gemini || typeof gemini.translateStrategy !== 'function') {
      return { translatedRules: null, source: 'gemini_unavailable', corrections: preprocessResult.corrections };
    }

    try {
      onProgress?.('Gerando estratégia da IA...');
      const translatedRules = await gemini.translateStrategy(preprocessResult.processedStrategy);
      if (translatedRules && regrasJsonManager?.saveCachedTranslation) {
        regrasJsonManager.saveCachedTranslation(normalized, translatedRules);
      }
      if (window?.rulesHistoryManager?.saveRule) {
        window?.rulesHistoryManager.saveRule(normalized, translatedRules);
      }
      onProgress?.('Estratégia criada com sucesso!');
      return { translatedRules, source: 'gemini', corrections: preprocessResult.corrections };
    } catch (error: any) {
      return { translatedRules: null, source: 'gemini_error', corrections: preprocessResult.corrections, error };
    }
  }

  private preprocessStrategyForGemini(strategyValue: string) {
    if (!strategyValue || typeof strategyValue !== 'string') {
      return { processedStrategy: strategyValue, corrections: [] };
    }

    const lines = strategyValue.split('\n');
    const processedLines: string[] = [];
    const corrections: Array<{ original: string; corrected: string; type: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('*')) {
        const contentAfterAsterisk = trimmedLine.substring(1).trim();
        const startsWithEntrar = /^entrar\s+/i.test(contentAfterAsterisk);

        if (!startsWithEntrar && contentAfterAsterisk.length > 0) {
          const indentation = line.match(/^\s*/)?.[0] || '';
          const correctedLine = `${indentation}* Entrar quando ${contentAfterAsterisk}`;
          processedLines.push(correctedLine);
          corrections.push({
            original: trimmedLine,
            corrected: `* Entrar quando ${contentAfterAsterisk}`,
            type: 'add_entrar_quando'
          });
        } else {
          processedLines.push(line);
        }
      } else {
        processedLines.push(line);
      }
    }

    const processedStrategy = processedLines.join('\n');
    return { processedStrategy, corrections };
  }

  private normalizeRuleForComparison(ruleText: string) {
    if (!ruleText) return '';
    return ruleText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .replace(/\s*([,;:.])\s*/g, '$1')
      .trim();
  }

  private checkForHistoricalJson(strategyText: string) {
    if (typeof window === 'undefined') return null;
    try {
      const allKeys = Object.keys(localStorage);
      const historyKeys = allKeys.filter(key => key.startsWith('rules_history_'));
      const normalizedStrategy = this.normalizeRuleForComparison(strategyText);

      for (const key of historyKeys) {
        const historyData = localStorage.getItem(key);
        if (!historyData) continue;
        let history: any[] = [];
        try {
          history = JSON.parse(historyData);
        } catch {
          continue;
        }
        if (!Array.isArray(history)) continue;

        for (const item of history) {
          if (item?.hasJson && item?.geminiJson && item?.rule) {
            if (!item.geminiJson.parameters) continue;
            const normalizedHistoryRule = this.normalizeRuleForComparison(item.rule);
            if (normalizedHistoryRule === normalizedStrategy) {
              return item.geminiJson;
            }
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  

  public async _validatePreconditions(strategyText: string, config: { contractType: string; tradeType: string; prediction?: string | number }) {
    const issues: string[] = [];
    const tips: string[] = [];
    const raw: any[] = [];

    const normalized = (strategyText || '').trim();
    if (!normalized) {
      issues.push('Estratégia não pode estar vazia.');
      tips.push('Digite ao menos uma regra iniciada com *.');
      return { isValid: false, issues, tips, raw };
    }

    const hasRules = normalized.split('\n').some(line => line.trim().startsWith('*') && line.trim().length > 1);
    if (!hasRules) {
      issues.push('Estratégia deve conter pelo menos uma regra iniciada com *.');
      tips.push('Exemplo: * Entrar quando o último dígito for par');
      return { isValid: false, issues, tips, raw };
    }

    try {
      await this.legacyBridge.loadLegacyScripts();
    } catch {
      return { isValid: true, issues, tips, raw };
    }

    if (typeof window === 'undefined' || typeof window.getRuleCompatibilityValidatorInstance !== 'function') {
      return { isValid: true, issues, tips, raw };
    }

    const createdElements: HTMLElement[] = [];
    const restoreValues: Array<() => void> = [];
    const ensureValue = (id: string, tag: 'input' | 'select' | 'textarea', value: string) => {
      const existing = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (existing) {
        const prev = existing.value;
        existing.value = value;
        restoreValues.push(() => { existing.value = prev; });
        return;
      }
      const el = document.createElement(tag);
      el.id = id;
      el.value = value;
      el.style.display = 'none';
      document.body.appendChild(el);
      createdElements.push(el);
    };

    ensureValue('contract-select', 'select', config.contractType || '');
    ensureValue('trade-type-select', 'select', config.tradeType || '');
    ensureValue('prediction-input', 'input', config.prediction !== undefined ? String(config.prediction) : '');
    ensureValue('strategy-text', 'textarea', normalized);

    const validator = window.getRuleCompatibilityValidatorInstance();
    const compatibility = validator.validateStrategyContractCompatibility();

    raw.push(compatibility);
    if (!compatibility.isValid) {
      if (compatibility.type === 'nonsense_trading_logic') {
        issues.push(compatibility.message || 'A estratégia não parece válida para trading.');
        tips.push('Use termos como preço, dígito, CALL/PUT, RSI, SMA ou barreira.');
      } else if (compatibility.type === 'prediction_logic_error') {
        issues.push(compatibility.issue || 'Previsão inválida para o tipo de contrato.');
        tips.push('Ajuste a previsão para um valor possível (0 a 9).');
      } else if (compatibility.type === 'single_contract_mismatch') {
        issues.push('Tipo Trade não combina com termos detectados na estratégia.');
        tips.push('Alinhe o Tipo Trade com os contratos citados na estratégia.');
      } else {
        issues.push('Incompatibilidade entre estratégia e configuração.');
        tips.push('Revise contrato, tipo trade e termos usados na estratégia.');
      }
    }

    const bothMode = validator.validateBothModeBeforeStart();
    raw.push(bothMode);
    if (!bothMode.isValid) {
      issues.push(bothMode.error || 'Modo "Ambos" configurado de forma incompatível.');
      tips.push('Ajuste a previsão para valores válidos quando usar modo "Ambos".');
    }

    createdElements.forEach(el => el.remove());
    restoreValues.forEach(fn => fn());

    const isValid = issues.length === 0;
    return { isValid, issues, tips, raw };
  }

  /**
   * Ativa execução de trades (o MonitoringService passa a emitir sinais)
   */
  public startExecution(groupActivation?: Record<number, any> | null, cooldownTicks?: number) {
    this.isExecutionActive = true;
    this.isAwaitingTrade = false;
    this.groupActivationConfig = groupActivation || null;
    this.lastTradeOutcome = null;
    this.cooldownTicksRemaining = 0;
    this.cooldownTicksTotal = cooldownTicks || 3;
  }

  /**
   * Desativa execução de trades
   */
  public stopExecution() {
    this.isExecutionActive = false;
    this.isAwaitingTrade = false;
    this.cooldownTicksRemaining = 0;
  }

  /**
   * Notifica o resultado de um trade (chamado pelo page.tsx via interceptor)
   */
  public notifyTradeResult(result: 'WIN' | 'LOSS', simulated: boolean) {
    this.lastTradeOutcome = { result, simulated };
    this.isAwaitingTrade = false;
    this.cooldownTicksRemaining = this.cooldownTicksTotal;
  }

  /**
   * Retorna os IDs dos grupos ativos com base no groupActivationConfig e último resultado
   */
  private getActiveGroupIds(): number[] | null {
    const cfg = this.groupActivationConfig;
    if (!cfg) return null;

    const keys = Object.keys(cfg).filter(k => k !== '_meta');
    if (keys.length === 0) return null;

    if (!this.lastTradeOutcome) {
      // Sem trade anterior → usar flag 'initial'
      return keys.filter(k => cfg[k]?.initial !== false).map(k => parseInt(k, 10));
    }

    const conditionKey = this.lastTradeOutcome.result === 'WIN'
      ? (this.lastTradeOutcome.simulated ? 'winSimulated' : 'winReal')
      : (this.lastTradeOutcome.simulated ? 'lossSimulated' : 'lossReal');

    return keys.filter(k => cfg[k]?.[conditionKey] !== false).map(k => parseInt(k, 10));
  }

  /**
   * Inscreve nos ticks da Deriv
   */
  private async subscribeToTicks(): Promise<void> {
    if (!this.config?.symbol) return;
    try {
      await this.deriv.send({ 
        ticks: this.config.symbol, 
        subscribe: 1 
      });
      
      this.isSubscribed = true;
    } catch (error: any) {
      if (!error.message?.includes('already subscribed')) {
        console.error('[Monitoring] Erro ao inscrever:', error);
      }
    }
  }

  /**
   * Configura o monitor de probabilidades
   * Usa DerivService para receber ticks em tempo real
   */
  private setupProbabilityMonitor(): void {
    // Remove listener anterior se existir
    if (this.tickListenerId) {
      this.deriv.observerInstance.removeById(this.tickListenerId);
    }

    // Criar novo listener
    this.tickListenerId = this.deriv.observerInstance.on('deriv.tick', (data: any) => {
      if (data.tick && data.tick.symbol === this.config?.symbol) {
        this.handleTick(data.tick);
      }
    });
  }

  private getTopN(): number {
    if (typeof window === 'undefined') return 5;
    const raw = localStorage.getItem('prob_accuracy_topN');
    const val = raw ? parseInt(raw, 10) : 5;
    return Number.isFinite(val) && val >= 1 && val <= 10 ? val : 5;
  }

  /**
   * Processa cada tick recebido
   */
  private handleTick(tick: any): void {

    const { symbol, quote: price } = tick;
    this.currentTickPrice = price;

    // Resetar contador de trades por tick (substitui monitoring.js que não está carregado)
    // Sem esse reset, tradesExecutedInCurrentTick permanece em 1 após o primeiro trade
    // bloqueando todos os trades seguintes via canExecuteTrade()
    if (typeof (window as any).tradeManager?.resetTradesCounter === 'function') {
      (window as any).tradeManager.resetTradesCounter(tick.epoch || Date.now());
    }

    const digit = this.extractLastDigit(price, symbol);
    
    if (digit === null || digit === undefined || isNaN(digit) || digit < 0 || digit > 9) {
      return;
    }

    // Adicionar ao histórico
    this.addTickToHistory(symbol, price, digit);
    
    // Calcular probabilidades
    const stats = this.calculateProbabilities();
    
    // Notificar callback se existir
    if (this.config?.onProbabilityUpdate && stats) {
      this.config.onProbabilityUpdate(stats);
    }

    if (this.config?.onTick) {
      this.config.onTick({
        symbol,
        price,
        digit,
        timestamp: Date.now()
      });
    }
    if (this.currentTranslatedRules) {
      this.setTranslatedRules(this.currentTranslatedRules, false);
    }

    // Atualizar via legado se disponível
    this.updateLegacySystem(symbol, price, digit, stats);
  }

  /**
   * Extrai o último dígito do preço baseado no tipo de símbolo
   */
  private extractLastDigit(price: number, symbol: string): number {
    const precision =
      symbol === "R_100" ? 2 :
      symbol === "R_25" || symbol === "R_10" ? 3 :
      symbol === "RDBEAR" || symbol === "RDBULL" ? 4 :
      symbol.startsWith("JD") ? 2 : 
      symbol.includes("1HZ") ? 2 : 4;
    
    return parseInt(price.toFixed(precision).slice(-1));
  }

  /**
   * Adiciona tick ao histórico de probabilidades
   */
  private addTickToHistory(symbol: string, price: number, digit: number): void {
    this.probabilityHistory.push(digit);
    this.globalTickCounter++;
    
    // Manter tamanho fixo de 200
    if (this.probabilityHistory.length > 200) {
      this.probabilityHistory.shift();
    }
  }

  /**
   * Calcula probabilidades baseado no histórico
   * Implementação baseada no monitoring.js legado
   */
  public calculateProbabilities(excludeLastTick = false): ProbabilityStats | null {
    if (!this.probabilityHistory || this.probabilityHistory.length < 10) {
      return null;
    }

    const fullHistory = this.probabilityHistory;
    const dataForStructure = excludeLastTick && fullHistory.length > 0
      ? fullHistory.slice(0, -1)
      : fullHistory;
    
    let dataForStats = dataForStructure;

    // Períodos com pesos
    const periods = [
      { name: '1-10', data: dataForStats.slice(-10), weight: 5.0 },
      { name: '10-25', data: dataForStats.slice(-25, -10), weight: 2.5 },
      { name: '25-50', data: dataForStats.slice(-50, -25), weight: 1.0 },
      { name: '50-100', data: dataForStats.slice(-100, -50), weight: 0.5 },
      { name: '1-100', data: dataForStats.slice(-100), weight: 0.5 }
    ];

    // Analisar cada período
    const analyses = periods.map(p => {
      const analysis = this.analyzePeriod(p.data, p.name);
      if (!analysis) return null;
      return { ...analysis, weight: p.weight };
    }).filter(Boolean) as any[];

    const gaps = this.calculateDigitGaps(dataForStructure, false);
    const longTerm = analyses.find((a: any) => a.periodName === '1-100');

    const finalScores: { digit: number; score: number; rawProb: number; consensusHigh: number; consensusLow: number }[] = [];
    
    // Pre-calcular aparições e repetições
    const longTermHistory = dataForStructure.slice(-100);
    const lastDigit = dataForStructure[dataForStructure.length - 1];
    const appearancesMap = new Array(10).fill(0);
    const repetitionsMap = new Array(10).fill(0);
    
    for (let i = 0; i < longTermHistory.length - 1; i++) {
      const d = longTermHistory[i];
      appearancesMap[d]++;
      if (longTermHistory[i + 1] === d) {
        repetitionsMap[d]++;
      }
    }

    for (let digit = 0; digit <= 9; digit++) {
      let weightedSum = 0;
      let totalWeight = 0;
      let cHigh = 0;
      let cLow = 0;
      
      analyses.forEach((analysis: any) => {
        if (analysis && analysis.probabilities) {
          const prob = Number(analysis.probabilities[digit]) || 0;
          weightedSum += prob * analysis.weight;
          totalWeight += analysis.weight;
          if (analysis.mostProbable === digit) cHigh++;
          if (analysis.leastProbable === digit) cLow++;
        }
      });
      
      const base = totalWeight > 0 ? weightedSum / totalWeight : 0;
      
      // Penalidade de saturação
      let saturationPenalty = 0;
      if (longTerm && longTerm.probabilities) {
        const longFreq = Number(longTerm.probabilities[digit]) || 0;
        if (longFreq > 15) {
          saturationPenalty = (longFreq - 15) * 2.0;
        }
      }
      
      // Bias dinâmico
      let dynamicBias = 0;
      const appearances = appearancesMap[digit];
      const repetitions = repetitionsMap[digit];
      const repRate = appearances > 0 ? (repetitions / appearances) * 100 : 0;
      
      if (digit === lastDigit) {
        if (repRate < 5) {
          dynamicBias = 8;
        } else if (repRate > 15) {
          dynamicBias = -10;
        } else {
          dynamicBias = -5;
        }
      } else {
        if (repRate < 5) dynamicBias = 2;
      }
      
      // Bônus de gap
      let gapBonus = 0;
      if (gaps[digit] >= 10) {
        gapBonus = Math.pow(gaps[digit] / 10, 2);
      }
      
      const final = (base + gapBonus + dynamicBias) - saturationPenalty;
      finalScores.push({ digit, score: final, rawProb: base, consensusHigh: cHigh, consensusLow: cLow });
    }
    
    const sortedByScore = [...finalScores].sort((a, b) => b.score - a.score);
    const best = sortedByScore[0];
    const worst = sortedByScore[sortedByScore.length - 1];
    const topN = this.getTopN();
    
    return {
      probabilities: finalScores.map(s => s.rawProb),
      mostProbable: best.digit,
      leastProbable: worst.digit,
      mostProbableValue: best.rawProb,
      leastProbableValue: worst.rawProb,
      highestStrength: Math.max(1, best.consensusHigh),
      lowestStrength: Math.max(1, worst.consensusLow),
      sortedScores: sortedByScore.map(s => ({ digit: s.digit, prob: s.rawProb })),
      topN,
      topNDigits: sortedByScore.slice(0, topN).map(s => s.digit)
    };
  }

  /**
   * Analisa um período específico
   */
  private analyzePeriod(digits: number[], periodName: string) {
    if (!digits || !digits.length) return null;
    
    const freq = Array(10).fill(0);
    let total = 0;
    
    for (let i = 0; i < digits.length; i++) {
      const d = digits[i];
      if (Number.isInteger(d) && d >= 0 && d <= 9) {
        freq[d]++;
        total++;
      }
    }
    
    const sum = freq.reduce((a, b) => a + b, 0);
    if (!sum) return null;
    
    const probs = freq.map(score => (score / sum) * 100);
    let maxProb = -1, maxIdx = -1;
    let minProb = 101, minIdx = -1;
    
    for (let i = 0; i < probs.length; i++) {
      const p = probs[i];
      if (p > maxProb) {
        maxProb = p;
        maxIdx = i;
      }
      if (p < minProb) {
        minProb = p;
        minIdx = i;
      }
    }
    
    return {
      probabilities: probs,
      mostProbable: maxIdx,
      leastProbable: minIdx,
      mostProbableValue: maxProb,
      leastProbableValue: minProb,
      periodName
    };
  }

  /**
   * Calcula gaps (ausências) de cada dígito
   */
  private calculateDigitGaps(history: number[], excludeLastTick: boolean): number[] {
    const gaps = Array(10).fill(0);
    const lastIndices = Array(10).fill(-1);
    const effective = excludeLastTick && history.length > 0 ? history.slice(0, -1) : history;
    const total = effective.length;
    
    for (let i = 0; i < total; i++) {
      const d = effective[i];
      lastIndices[d] = i;
    }
    
    for (let d = 0; d <= 9; d++) {
      if (lastIndices[d] === -1) {
        gaps[d] = total;
      } else {
        gaps[d] = (total - 1) - lastIndices[d];
      }
    }
    return gaps;
  }

  /**
   * Avalia se uma regra está sendo atendida no tick atual
   * Delega para o FormatGenerator legado (checkRuleCondition)
   */
  private checkRuleCondition(rule: any): boolean {
    try {
      if (typeof window === 'undefined') return false;

      const formatGenerator = (window as any).getFormatGeneratorInstance?.();
      if (!formatGenerator || typeof formatGenerator.checkRuleCondition !== 'function') {
        return false;
      }

      // Configurar símbolo e marketData no formatGenerator usando DerivService migrado
      const needsMarketData = ['last_digits', 'digit_repetition', 'digit_pattern', 'dynamic_prediction', 'isolated_digits'];
      if (needsMarketData.includes(rule?.type)) {
        const currentSymbol = this.config?.symbol;
        if (currentSymbol) {
          formatGenerator.currentSymbol = currentSymbol;
          formatGenerator.marketData = this.deriv;
        }
      }

      // Resolver variáveis especiais ($LOWER_PROB, $HIGHER_PROB)
      if (typeof (window as any).getProbabilityResolver === 'function') {
        const resolver = (window as any).getProbabilityResolver();
        if (resolver) {
          const stats = this.calculateProbabilities(true);
          if (stats?.sortedScores) {
            resolver.updateProbabilityData(stats.sortedScores.map((s: { digit: number; prob: number }) => s.digit));
          }

          const hasSpecialVar = resolver.isSpecialVariable(rule.targetValue) ||
            resolver.isSpecialVariable(rule.target) ||
            resolver.isSpecialVariable(rule.value) ||
            resolver.isSpecialVariable(rule.parameters?.targetValue) ||
            resolver.isSpecialVariable(rule.parameters?.condition?.value) ||
            resolver.isSpecialVariable(rule.parameters?.condition?.probabilityVariable);

          if (hasSpecialVar) {
            if (rule.type !== 'isolated_digits' && rule.type !== 'sequence') {
              const ruleCopy = JSON.parse(JSON.stringify(rule));
              const processed = resolver.processRule(ruleCopy);
              if (processed.type === 'probability_check' && processed._probabilityVariable) {
                return resolver.validateProbabilityCheck(processed);
              }
              return formatGenerator.checkRuleCondition(processed, null);
            }
          }
        }
      }

      return formatGenerator.checkRuleCondition(rule, null);
    } catch (error) {
      console.error(`[MonitoringService] checkRuleCondition error for ${rule?.type}:`, error);
      return false;
    }
  }

  /**
   * Extrai contractType e predictionValue das regras do grupo satisfeito.
   * Replica o fluxo do legado monitoring.js:5773-5828
   */
  private extractCapturedPredictions(satisfiedGroupId: number | string): CapturedPrediction[] | null {
    if (!this.currentTranslatedRules?.groups) return null;

    const satisfiedGroup = this.currentTranslatedRules.groups.find(
      (g: any) => g.id === satisfiedGroupId
    );
    if (!satisfiedGroup?.rules) return null;

    const TYPE_MAP: Record<string, string> = {
      over: 'DIGITOVER',
      under: 'DIGITUNDER',
      match: 'DIGITMATCH',
      diff: 'DIGITDIFF',
      differ: 'DIGITDIFF',
      even: 'DIGITEVEN',
      odd: 'DIGITODD',
      call: 'CALL',
      put: 'PUT',
      rise: 'CALL',
      fall: 'PUT',
    };

    const contractPredictions: CapturedPrediction[] = [];

    for (const rule of satisfiedGroup.rules) {
      const params = rule.parameters || {};

      // Tentar obter tipo de contrato de várias fontes
      const contractType =
        rule.contractType || params.contractType ||
        rule.predictionAction || params.predictionAction;

      // Tentar obter previsão de várias fontes
      const contractPrediction =
        rule.contractPrediction !== undefined ? rule.contractPrediction :
        params.contractPrediction !== undefined ? params.contractPrediction :
        rule.targetValue !== undefined ? rule.targetValue :
        params.targetValue;

      if (contractType && contractPrediction !== undefined) {
        const normalizedType =
          TYPE_MAP[contractType.toLowerCase()] || contractType.toUpperCase();

        contractPredictions.push({
          contractType: normalizedType,
          predictionValue: contractPrediction,
          _triggerDigit: rule._triggerDigit,
          rule,
        });
      }
    }

    if (contractPredictions.length > 0) return contractPredictions;

    // Fallback: tentar getDynamicPredictionFromRules do legado
    if (typeof window !== 'undefined' && typeof (window as any).getDynamicPredictionFromRules === 'function') {
      const dynamicResult = (window as any).getDynamicPredictionFromRules(satisfiedGroupId, null);
      if (dynamicResult !== null) {
        if (Array.isArray(dynamicResult)) return dynamicResult;
        return [{ contractType: '', predictionValue: dynamicResult }];
      }
    }

    return null;
  }

  /**
   * Verifica se o cooldown está ativo (via legado CooldownOverlay)
   */
  private isCooldownActive(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const getCooldownInstance = (window as any).getCooldownOverlayInstance;
      if (typeof getCooldownInstance === 'function') {
        const instance = getCooldownInstance();
        if (instance?.getCooldownState) {
          const state = instance.getCooldownState();
          return !!(state && state.active);
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  public generateVisualFormat(rule: any, statusIcon: string) {
    try {
      if (typeof window === 'undefined') {
        return `${statusIcon} ${rule?.description || rule?.type || 'Regra'}`;
      }
      const formatGenerator = (window as any).getFormatGeneratorInstance?.();
      if (!formatGenerator || typeof formatGenerator.generateVisualFormat !== 'function') {
        return `${statusIcon} ${rule?.description || rule?.type || 'Regra'}`;
      }
      if (rule?.type === 'rsi' || rule?.type === 'sma' || rule?.type === 'percentage') {
        const hasMinimumHistoricalData = (window as any).MonitoringView?.hasMinimumHistoricalData;
        if (typeof hasMinimumHistoricalData === 'function' && !hasMinimumHistoricalData.call((window as any).MonitoringView)) {
          return `⏳ ${rule?.description || rule?.type} (coletando dados...)`;
        }
      }
      if (rule?.type === 'last_digits' || rule?.type === 'digit_repetition' || rule?.type === 'digit_pattern' || rule?.type === 'dynamic_prediction' || rule?.type === 'isolated_digits') {
        const currentSymbol = this.config?.symbol;
        if (currentSymbol) {
          formatGenerator.currentSymbol = currentSymbol;
          formatGenerator.marketData = this.deriv;
        }
      }
      return formatGenerator.generateVisualFormat(rule, statusIcon);
    } catch (error) {
      console.error(`[MonitoringService] generateVisualFormat error for ${rule?.type}:`, error);
      return `${statusIcon} ${rule?.description || rule?.type || 'Regra'}`;
    }
  }

  public setTranslatedRules(translatedRules, isPreview = false) {
    try {
      if (!translatedRules || !Array.isArray(translatedRules.groups)) {
        return;
      }

      this.currentTranslatedRules = translatedRules;
      if (!isPreview) {
        this.state = 'MONITORING';
      }

      const rulesData: RulesVisualData = {
        groups: [],
        isPreview,
        timestamp: Date.now()
      };

      translatedRules.groups.forEach((group) => {
        if (group.rules && group.rules.length > 0) {
          const formattedGroup: RulesVisualGroup = {
            id: group.id,
            rules: []
          };

          const cooldownActive = this.isCooldownActive();

          group.rules.forEach((rule) => {
            let statusIcon: string;
            let ruleStatus: string;

            if (isPreview) {
              statusIcon = '⚪';
              ruleStatus = 'waiting';
            } else {
              const isRuleSatisfied = this.checkRuleCondition(rule);
              if (isRuleSatisfied) {
                statusIcon = '🟢';
                ruleStatus = cooldownActive ? 'satisfied-cooldown' : 'satisfied';
              } else {
                statusIcon = '🔴';
                ruleStatus = 'failed';
              }
            }

            // Preservar $LOWER_PROB/$HIGHER_PROB de parameters
            const ruleForDisplay = { ...rule };
            if (rule.parameters) {
              ruleForDisplay.parameters = { ...rule.parameters };
              if (rule.parameters.value !== null && rule.parameters.value !== undefined) {
                ruleForDisplay.value = rule.parameters.value;
              }
            }

            let visualFormat = this.generateVisualFormat(ruleForDisplay, statusIcon);

            // Resolver $LOWER_PROB/$HIGHER_PROB no texto visual
            if (visualFormat && typeof (window as any).getProbabilityResolver === 'function') {
              const resolver = (window as any).getProbabilityResolver();
              if (resolver) {
                // console.log("RESOLVER", resolver);
                // console.log("visualFormat", visualFormat);
                if (visualFormat.includes('$LOWER_PROB')) {
                  const val = resolver.resolve('$LOWER_PROB');
                  console.log("LOWER_PROB", val);
                  if (val !== null) visualFormat = visualFormat.replace(/\$LOWER_PROB/g, val);
                }
                if (visualFormat.includes('$HIGHER_PROB')) {
                  const val = resolver.resolve('$HIGHER_PROB');
                  if (val !== null) visualFormat = visualFormat.replace(/\$HIGHER_PROB/g, val);
                }
              }
            }

            formattedGroup.rules.push({
              id: rule.id,
              displayText: visualFormat,
              status: ruleStatus
            });
          });

          rulesData.groups.push(formattedGroup);
        }
      });

      this.currentRulesVisualData = rulesData;

      if (this.config?.onRulesVisualUpdate) {
        this.config.onRulesVisualUpdate(rulesData);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rulesUpdated', {
          detail: rulesData
        }));
      }

      // Trade signal: verificar se algum grupo ativo está satisfeito
      if (this.isExecutionActive && !isPreview && !this.isAwaitingTrade && this.cooldownTicksRemaining <= 0) {
        // Modo imediato: sem grupos de regras = disparar em todo tick (igual legado groups.length === 0)
        if (rulesData.groups.length === 0) {
          this.isAwaitingTrade = true;
          this.config?.onTradeSignal?.('immediate', this.currentTickPrice || 0, null);
        } else {
          const activeGroupIds = this.getActiveGroupIds();

          for (const group of rulesData.groups) {
            const groupId = Number(group.id);

            // Verificar se grupo está ativo por activation config
            if (activeGroupIds !== null && !activeGroupIds.includes(groupId)) continue;

            // Verificar se TODAS as regras do grupo estão satisfeitas (AND)
            const allSatisfied = group.rules.every(r => r.status === 'satisfied' || r.status === 'satisfied-cooldown');

            if (allSatisfied && group.rules.length > 0) {
              this.isAwaitingTrade = true;
              const entryPrice = this.currentTickPrice || 0;

              // Extrair contractType/prediction das regras satisfeitas (igual legado)
              const capturedPredictions = this.extractCapturedPredictions(groupId);

              this.config?.onTradeSignal?.(groupId, entryPrice, capturedPredictions);
              break; // OR entre grupos — executa no primeiro que satisfaz
            }
          }
        }
      }

      // Decrementar cooldown
      if (this.cooldownTicksRemaining > 0) {
        this.cooldownTicksRemaining--;
      }
    } catch (error) {
      console.error('[MonitoringService] setTranslatedRules error:', error);
    }
  }

  /**
   * Atualiza sistema legado se disponível
   */
  private updateLegacySystem(symbol: string, price: number, digit: number, stats: ProbabilityStats | null): void {
    // Verificar se window.ProbabilityAccuracyManager existe (legado)
    if (typeof window !== 'undefined' && (window as any).ProbabilityAccuracyManager) {
      try {
        const accManager = (window as any).ProbabilityAccuracyManager.getInstance();
        accManager.updateOutcome(digit);
        if (stats && stats.sortedScores) {
          accManager.recordPrediction(stats.sortedScores);
        }
      } catch (e) {
        // Silenciar erros do legado
      }
    }

    // Disparar evento global para outros componentes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('marketDataUpdate', {
        detail: { symbol, price, digit, stats }
      }));
    }
  }

  /**
   * Retorna o histórico atual de probabilidades
   */
  public getProbabilityHistory(): number[] {
    return [...this.probabilityHistory];
  }

  /**
   * Retorna as estatísticas atuais
   */
  public getCurrentStats(): ProbabilityStats | null {
    return this.calculateProbabilities();
  }

 
}

// Singleton export
export const monitoringService = MonitoringService.getInstance();
