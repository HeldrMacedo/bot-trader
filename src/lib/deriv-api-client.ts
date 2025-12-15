/**
 * Deriv API Client for Next.js frontend
 * Provides methods to communicate with the Python backend API
 */

export interface ConnectionRequest {
  api_token: string;
}

export interface ConfigUpdate {
  exhaustion_threshold?: number;
  absence_threshold?: number;
  min_signal_strength?: number;
  over2_enabled?: boolean;
  under7_enabled?: boolean;
  differs_enabled?: boolean;
  min_confidence?: number;
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
}

export interface SymbolAnalysis {
  timestamp: string;
  distribution: any;
  exhaustion: any[];
  absence: any[];
  trends: any;
  sequences: any[];
  probabilities: any;
  market_quality: any;
  current_digit: number | null;
}

export interface MarketQuality {
  quality_score: number;
  reasons: string[];
  should_trade: boolean;
  trend_direction: string;
  volatility_symbol: string;
}

export interface AnalysisResponse {
  analyses: Record<string, SymbolAnalysis>;
  signals: TradingSignal[];
  market_quality: Record<string, MarketQuality>;
  should_trade: boolean;
  timestamp: string;
}

export interface PerformanceStats {
  total_signals: number;
  high_confidence_signals: number;
  medium_confidence_signals: number;
  symbols_monitored: number;
  total_digits_analyzed: number;
  timestamp: string;
}

export interface ConfigResponse {
  config: {
    exhaustion_threshold: number;
    absence_threshold: number;
    min_signal_strength: number;
    over2_enabled: boolean;
    under7_enabled: boolean;
    differs_enabled: boolean;
    min_confidence: number;
    max_history_size: number;
  };
}

class DerivApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_DERIV_API_URL || 'http://localhost:8000') {
    const envUrl = baseUrl;
    const invalidTarget = typeof envUrl === 'string' && envUrl.includes('oauth.deriv.com');
    this.baseUrl = invalidTarget ? 'http://localhost:8000' : envUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API request error for ${url}:`, error);
      throw error;
    }
  }

  // Connection methods
  async connect(request: ConnectionRequest): Promise<{ status: string; message: string }> {
    return this.request('/connect', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async disconnect(): Promise<{ status: string; message: string }> {
    return this.request('/disconnect', {
      method: 'POST',
    });
  }

  // Analysis methods
  async getAnalysis(): Promise<AnalysisResponse> {
    return this.request('/analysis');
  }

  async getSymbolAnalysis(symbol: string): Promise<SymbolAnalysis> {
    return this.request(`/analysis/${symbol}`);
  }

  async getSignals(): Promise<{ signals: TradingSignal[] }> {
    return this.request('/signals');
  }

  async getBestSignal(): Promise<{ best_signal: TradingSignal | null }> {
    return this.request('/signals/best');
  }

  // Configuration methods
  async getConfig(): Promise<ConfigResponse> {
    return this.request('/config');
  }

  async updateConfig(config: ConfigUpdate): Promise<ConfigResponse> {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // History and performance methods
  async getHistory(symbol: string, count: number = 100): Promise<{ symbol: string; history: number[]; count: number }> {
    return this.request(`/history/${symbol}?count=${count}`);
  }

  async getPerformance(): Promise<PerformanceStats> {
    return this.request('/performance');
  }

  // Status and market quality
  async getStatus(): Promise<any> {
    return this.request('/status');
  }

  async getMarketQuality(): Promise<any> {
    return this.request('/market-quality');
  }

  async getPredictions(symbol: string): Promise<any> {
    return this.request(`/predictions/${symbol}`);
  }

  // WebSocket connection for real-time updates
  connectWebSocket(): WebSocket {
    const wsUrl = this.baseUrl.replace('http', 'ws');
    return new WebSocket(`${wsUrl}/ws/updates`);
  }
}

// Create a singleton instance
const derivApiClient = new DerivApiClient();

export default derivApiClient;