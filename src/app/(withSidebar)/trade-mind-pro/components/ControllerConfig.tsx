import { useState, useEffect, useCallback } from 'react';

// Storage key
const STORAGE_KEY = 'trade_config_controller';

// Default configuration values - mirrors original configurations.js
export const DEFAULT_CONTROLLER_CONFIG = {
  winReal: 5,
  lossReal: 1,
  winSimulated: 0,
  lossSimulated: 1,
  tradeLimit: 0,
  cooldownPeriod: 3,
  pauseTime: null as number | null,
  pauseTrades: 2,
  pauseOnWins: false,
  countRepeated: true
};

export interface ControllerConfigData {
  winReal: number;
  lossReal: number;
  winSimulated: number;
  lossSimulated: number;
  tradeLimit: number;
  cooldownPeriod: number;
  pauseTime: number | null;
  pauseTrades: number;
  pauseOnWins: boolean;
  countRepeated: boolean;
}

interface ControllerConfigProps {
  config: ControllerConfigData;
  onChange: (config: ControllerConfigData) => void;
}

export default function ControllerConfig({ config, onChange }: ControllerConfigProps) {
  // Auto-save configuration - mirrors original saveCurrentConfiguration
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const dataToSave = {
        config,
        _timestamp: Date.now(),
        _autoSaved: true
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [config]);

  // Integer validation - mirrors original addIntegerValidation
  const validateInteger = useCallback((value: string): number => {
    // Remove non-numeric characters
    const cleanValue = value.replace(/[^\d]/g, '');
    return Math.floor(Math.abs(parseInt(cleanValue) || 0));
  }, []);

  // Handle configuration changes - mirrors original saveCurrentConfiguration
  const handleConfigChange = useCallback((field: keyof ControllerConfigData, value: string | number | boolean) => {
    const newConfig = { ...config };

    // Handle boolean fields
    if (field === 'pauseOnWins' || field === 'countRepeated') {
      newConfig[field] = value as boolean;
    } else if (field === 'pauseTime') {
      // Special handling for pauseTime (can be empty/null)
      if (value === '' || value === null || value === undefined) {
        newConfig[field] = null;
      } else {
        newConfig[field] = validateInteger(value as string) || null;
      }
    } else {
      // Integer validation for all other numeric fields
      (newConfig[field] as number) = validateInteger(value as string);
    }

    onChange(newConfig);
  }, [config, validateInteger, onChange]);

  return (
    <div className="space-y-4">
      {/* Win/Loss Limits Section - mirrors original win-real-input, loss-real-input, win-simulated-input, loss-simulated-input */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Vitórias Reais
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={config.winReal}
            onChange={(e) => handleConfigChange('winReal', e.target.value)}
            title="Apenas números inteiros"
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Perdas Reais
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={config.lossReal}
            onChange={(e) => handleConfigChange('lossReal', e.target.value)}
            title="Apenas números inteiros"
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Vitórias Simuladas
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={config.winSimulated}
            onChange={(e) => handleConfigChange('winSimulated', e.target.value)}
            title="Apenas números inteiros"
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Perdas Simuladas
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={config.lossSimulated}
            onChange={(e) => handleConfigChange('lossSimulated', e.target.value)}
            title="Apenas números inteiros"
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* Trade Limit - mirrors original trade-limit-input */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Limite de Trades
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={config.tradeLimit}
          onChange={(e) => handleConfigChange('tradeLimit', e.target.value)}
          title="Apenas números inteiros (0 = Sem limite)"
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Cooldown Period - mirrors original cooldown-period-input */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Tempo Delay (Cooldown)
        </label>
        <input
          type="number"
          min={1}
          step={1}
          value={config.cooldownPeriod}
          onChange={(e) => handleConfigChange('cooldownPeriod', e.target.value)}
          title="Ticks extras após duração do contrato"
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Pause Configuration - mirrors original pause-time-input, pause-trades-input, pause-on-wins */}
      <div className="border-t border-gray-700 pt-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-400">
            Configuração de Pausa
          </label>
          <span className="text-xs text-gray-500">Vazio = Desativado</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Tempo (minutos)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={config.pauseTime ?? ''}
              onChange={(e) => handleConfigChange('pauseTime', e.target.value)}
              placeholder="Minutos"
              title="Tempo de pausa em minutos"
              className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              A cada (trades)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={config.pauseTrades}
              onChange={(e) => handleConfigChange('pauseTrades', e.target.value)}
              placeholder="Trades"
              title="Quantidade de trades para ativar a pausa"
              className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        {/* Pause on Wins Checkbox - mirrors original pause-on-wins */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pause-on-wins"
            checked={config.pauseOnWins}
            onChange={(e) => handleConfigChange('pauseOnWins', e.target.checked)}
            title="Ativado = Pausar em ganhos, Desativado = Pausar em perdas"
            className="w-4 h-4 rounded border-gray-600 bg-[#1e1b2e] text-purple-500 focus:ring-purple-500 cursor-pointer"
          />
          <label 
            htmlFor="pause-on-wins" 
            className="text-xs text-gray-400 cursor-pointer select-none"
          >
            Pausar em vitórias (desmarcar para pausar em derrotas)
          </label>
        </div>
      </div>

      {/* Count Repeated Digits - mirrors original count-repeated-digits-input */}
      <div className="border-t border-gray-700 pt-3 mt-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="count-repeated-digits"
            checked={config.countRepeated}
            onChange={(e) => handleConfigChange('countRepeated', e.target.checked)}
            title="Marcado = Contar dígitos repetidos consecutivos | Desmarcado = Pular dígitos repetidos"
            className="w-4 h-4 rounded border-gray-600 bg-[#1e1b2e] text-purple-500 focus:ring-purple-500 cursor-pointer"
          />
          <label 
            htmlFor="count-repeated-digits" 
            className="text-xs text-gray-400 cursor-pointer select-none"
          >
            Contar Dígitos Repetidos
          </label>
        </div>
      </div>
    </div>
  );
}
