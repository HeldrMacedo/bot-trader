export interface MarketQuality {
  quality_score: number;
  reasons: string[];
  should_trade: boolean;
  trend_direction: string;
  volatility_symbol: string;
}

export interface TradingSignal {
  strategy: string;
  type: string;
  confidence: number;
  reasons: string[];
  assertiveness: string;
  expected_profit: number;
  symbol: string;
  timestamp: string;
  barrier?: number;
  ml_confidence?: number;
  combined_confidence?: number;
}

export interface Volatility {
  symbol: string;
  name: string;
  color: string;
}

export interface MLPredictions {
  next_digit_probabilities: number[];
  pattern_score: number[];
  volatility_prediction: number[];
  confidence: number;
  predicted_digit?: number;
}

export type SymbolAnalysis = {
  timestamp: string;
  distribution: any;
  exhaustion: any[];
  absence: any[];
  trends: any;
  sequences: any[];
  probabilities: any;
  market_quality: MarketQuality;
  current_digit: number | null;
  ml_predictions?: MLPredictions;
  combined_confidence?: number;
  features?: number[];
};

export interface TickData {
  quote: number;
  digit: number;
  time: number;
}

export interface VolatilityData {
  currentTick: TickData | null;
  digitHistory: number[];
  patterns: {};
  stats: {
    over2: number;
    under7: number;
    total: number;
  };
}

export interface SpecificOperations {
  over: {
    enabled: boolean;
    digits: number[];
  };
  under: {
    enabled: boolean;
    digits: number[];
  };
  matches: {
    enabled: boolean;
    digit: number;
  };
  differs: {
    enabled: boolean;
    digits: number[];
  };
}

export interface MartingaleConfig {
  enabled: boolean;
  multiplier: number;
  maxLevels: number;
  resetOnWin: boolean;
  currentLevel: number;
  currentStake: number;
}

export interface Account {
  balance: number;
  is_virtual: number;
  broker: string;
}

export interface MLConfig {
  useML: boolean;
  onlineLearning: boolean;
  modelRefreshInterval: number;
  confidenceThreshold: number;
  featureWindow: number;
  trainingEnabled: boolean;
}

export interface MLPerformanceStats {
  ml_accuracy: number;
  ml_precision: number;
  ml_recall: number;
  model_versions: Record<string, number>;
  training_samples: number;
  prediction_latency: number;
  last_trained: string;
}

export const VOLATILITIES: Volatility[] = [
  { symbol: 'ALL', name: 'All Volatilities', color: 'gray' },
  { symbol: 'R_10', name: 'Volatility 10', color: 'sky' },
  { symbol: '1HZ10V', name: 'Volatility 10 (1s)', color: 'sky' },
  { symbol: 'R_25', name: 'Volatility 25', color: 'sky' },
  { symbol: '1HZ25V', name: 'Volatility 25 (1s)', color: 'sky' },
  { symbol: 'R_50', name: 'Volatility 50', color: 'sky' },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s)', color: 'sky' },
  { symbol: 'R_75', name: 'Volatility 75', color: 'sky' },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s)', color: 'sky' },
  { symbol: 'R_100', name: 'Volatility 100', color: 'sky' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s)', color: 'sky' },
];

export interface AnalysisData {
  analyses: Record<string, SymbolAnalysis>;
  signals: TradingSignal[];
  market_quality: Record<string, MarketQuality>;
  should_trade: boolean;
  timestamp: string;
  ml_stats?: MLPerformanceStats;
}

export interface AnalysisConfig {
    minConfidence: number;
    exhaustionThreshold: number;
    absenceThreshold: number;
    ticksToAnalyze: number;
    specificOperations: SpecificOperations;
}

export interface MLAnalysisConfig extends AnalysisConfig {
    mlConfig: MLConfig;
}

export interface CompatibilityCheck {
  webgl: boolean;
  memory: boolean;
  backendAvailable: boolean;
  features: {
    hasWebGL: boolean;
    hasCPU: boolean;
  };
}