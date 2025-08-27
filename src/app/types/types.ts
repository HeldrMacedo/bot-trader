export interface TradeSignal {
  symbol: string;
  contractType: string;
  amount: number;
  barrier?: string;
  duration: number;
  durationUnit: string;
  contractId: string;
  timestamp: string;
  longcode: string; // Adicionar para debug
  isForex: boolean; // Diferenciação Forex/Non-Forex
}

export interface TradeParameters {
  symbol: string;
  contract_type: string;
  duration: number;
  duration_unit: string;
  basis: string;
  amount: number;
  currency: string;
  barrier?: string;
  barrier2?: string; // Para contratos com duas barreiras
  app_markup_percentage?: number;
}

export interface BuyRequest {
  buy: string;
  subscribe?: number;
  price: number;
  req_id: number;
  parameters: TradeParameters;
}

// Novos tipos para melhor organização
export interface DurationInfo {
  duration: number;
  durationUnit: string;
  totalSeconds?: number;
}

export interface ContractInfo {
  type: string;
  barrier?: string;
  barrier2?: string;
  isValid: boolean;
}