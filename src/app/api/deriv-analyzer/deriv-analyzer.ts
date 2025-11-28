/**
 * Main Analyzer Module
 * Combines WebSocket connection with statistical analysis
 */

import { StatisticalAnalyzer, TradingSignal, MarketQualityResult, Config } from './statistical-analyzer';

export interface TickData {
  quote: number;
  digit: number;
  timestamp: string;
}

export interface SymbolAnalysis {
  timestamp: string;
  distribution: any;
  exhaustion: any;
  absence: any;
  trends: any;
  sequences: any;
  probabilities: any;
  marketQuality: any;
  currentDigit: number | null;
}

export interface PerformanceStats {
  totalSignals: number;
  highConfidenceSignals: number;
  mediumConfidenceSignals: number;
  symbolsMonitored: number;
  totalDigitsAnalyzed: number;
  timestamp: string;
}

export class DerivAnalyzer {
  private apiToken: string;
  private analyzer: StatisticalAnalyzer;
  private running: boolean = false;
  
  // Data storage
  private digitHistories: Map<string, number[]> = new Map();
  private analyses: Map<string, SymbolAnalysis> = new Map();
  private signals: TradingSignal[] = [];
  private marketQuality: Map<string, MarketQualityResult> = new Map();
  
  // Configuration
  private config: Config = {
    exhaustionThreshold: 5,
    absenceThreshold: 15,
    minSignalStrength: 10,
    over2Enabled: true,
    under7Enabled: true,
    differsEnabled: true,
    minConfidence: 70,
    maxHistorySize: 100
  };

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.analyzer = new StatisticalAnalyzer();
  }

  async onTickReceived(symbol: string, quote: number, digit: number) {
    // Add to history
    let history = this.digitHistories.get(symbol) || [];
    history.push(digit);
    
    // Limit history size
    if (history.length > (this.config.maxHistorySize || 100)) {
      history = history.slice(- (this.config.maxHistorySize || 100));
    }
    
    this.digitHistories.set(symbol, history);
    
    // Perform analysis
    await this.analyzeSymbol(symbol);
    
    // Generate signals
    await this.generateSignals(symbol);
  }

  async analyzeSymbol(symbol: string) {
    const digits = this.digitHistories.get(symbol) || [];
    if (digits.length < 10) {
      return;
    }
    
    // Perform statistical analysis
    const distribution = this.analyzer.analyzeDigitDistribution(digits);
    const exhaustion = this.analyzer.detectExhaustion(digits, this.config.exhaustionThreshold || 5);
    const absence = this.analyzer.detectAbsence(digits, this.config.absenceThreshold || 15);
    const trends = this.analyzer.detectTrends(digits);
    const sequences = this.analyzer.findSequences(digits);
    const probabilities = this.analyzer.calculateProbabilities(digits);
    const marketQuality = this.analyzer.analyzeMarketQuality(digits, symbol);
    
    // Store analysis
    const analysis: SymbolAnalysis = {
      timestamp: new Date().toISOString(),
      distribution,
      exhaustion,
      absence,
      trends,
      sequences,
      probabilities,
      marketQuality,
      currentDigit: digits.length > 0 ? digits[digits.length - 1] : null
    };
    
    this.analyses.set(symbol, analysis);
    
    // Update overall market quality
    this.marketQuality.set(symbol, marketQuality);
  }

  async generateSignals(symbol: string) {
    const digits = this.digitHistories.get(symbol) || [];
    if (digits.length < 20) {
      return;
    }
    
    const signals = this.analyzer.generateTradingSignals(digits, this.config);
    
    // Filter by minimum confidence
    const filteredSignals = signals.filter(s => s.confidence >= (this.config.minConfidence || 70));
    
    // Add symbol information
    filteredSignals.forEach(signal => {
      signal['symbol'] = symbol;
      signal['timestamp'] = new Date().toISOString();
    });
    
    // Remove old signals for this symbol
    this.signals = this.signals.filter(s => s['symbol'] !== symbol);
    this.signals.push(...filteredSignals);
    
    // Sort by confidence
    this.signals.sort((a, b) => b.confidence - a.confidence);
  }

  async start() {
    this.running = true;
    console.log("Starting Deriv Analyzer...");
    // In a real implementation, we would connect to the WebSocket here
  }

  async stop() {
    this.running = false;
    console.log("Deriv Analyzer stopped");
    // In a real implementation, we would disconnect from the WebSocket here
  }

  getCurrentAnalysis() {
    const analysesObj: Record<string, SymbolAnalysis> = {};
    this.analyses.forEach((value, key) => {
      analysesObj[key] = value;
    });
    
    return {
      analyses: analysesObj,
      signals: this.signals.slice(0, 10), // Top 10 signals
      marketQuality: Object.fromEntries(this.marketQuality),
      shouldTrade: Array.from(this.marketQuality.values()).some(mq => mq.shouldTrade),
      timestamp: new Date().toISOString()
    };
  }

  getSymbolAnalysis(symbol: string) {
    return this.analyses.get(symbol);
  }

  getTradingSignals() {
    return this.signals;
  }

  getBestSignal() {
    if (this.signals.length === 0) {
      return null;
    }
    return this.signals[0];
  }

  updateConfig(newConfig: Config) {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig() {
    return this.config;
  }

  getDigitHistory(symbol: string, count: number = 100) {
    const history = this.digitHistories.get(symbol) || [];
    return history.slice(-count);
  }

  getPerformanceStats(): PerformanceStats {
    const totalSignals = this.signals.length;
    const highConfidenceSignals = this.signals.filter(s => s.confidence >= 80).length;
    const mediumConfidenceSignals = this.signals.filter(s => s.confidence >= 60 && s.confidence < 80).length;
    
    return {
      totalSignals,
      highConfidenceSignals,
      mediumConfidenceSignals,
      symbolsMonitored: this.digitHistories.size,
      totalDigitsAnalyzed: Array.from(this.digitHistories.values()).reduce((sum, hist) => sum + hist.length, 0),
      timestamp: new Date().toISOString()
    };
  }
}