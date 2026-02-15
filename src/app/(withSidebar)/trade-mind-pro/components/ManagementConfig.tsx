import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useCallback } from 'react';

// Storage key
const STORAGE_KEY = 'trade_config_management';

// Default configuration values - mirrors original configurations.js
export const DEFAULT_MANAGEMENT_CONFIG = {
  stake: 0.35,
  goal: 1,
  stopLoss: 100,
  galeMultiplier: 1.0,
  galeSplit: 1,
  galeSplitThreshold: 0,
  sorosLimit: 0,
  sorosProfitPercentage: 100,
  galeRemovesSoros: false
};

export interface ManagementConfigData {
  stake: number;
  goal: number;
  stopLoss: number;
  galeMultiplier: number;
  galeSplit: number;
  galeSplitThreshold: number;
  sorosLimit: number;
  sorosProfitPercentage: number;
  galeRemovesSoros: boolean;
}

interface ManagementConfigProps {
  config: ManagementConfigData;
  onChange: (config: ManagementConfigData) => void;
}

export default function ManagementConfig({ config, onChange }: ManagementConfigProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSplitDropdownOpen, setIsSplitDropdownOpen] = useState(false);

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
  const handleConfigChange = useCallback((field: keyof ManagementConfigData, value: string | number | boolean) => {
    const newConfig = { ...config };

    // Special validation for different field types
    if (field === 'sorosLimit' || field === 'sorosProfitPercentage') {
      // Integer validation for Soros fields
      (newConfig[field] as number) = validateInteger(value as string);
      
      // Validation for sorosProfitPercentage
      if (field === 'sorosProfitPercentage') {
        const numValue = newConfig[field];
        if (numValue < 0 || numValue > 100) {
          setErrors(prevErrors => ({ ...prevErrors, sorosProfitPercentage: 'Porcentagem deve ser entre 0 e 100' }));
        } else {
          setErrors(prevErrors => { const { sorosProfitPercentage, ...rest } = prevErrors; return rest; });
        }
      }
    } else if (field === 'galeRemovesSoros') {
      // Boolean field
      newConfig[field] = value as boolean;
    } else {
      // Numeric fields
      const numValue = parseFloat(value as string) || 0;
      
      // Validation for stake
      if (field === 'stake' && numValue < 0.35) {
        setErrors(prevErrors => ({ ...prevErrors, stake: 'Stake mínimo é 0.35' }));
      } else if (field === 'stake') {
        setErrors(prevErrors => { const { stake, ...rest } = prevErrors; return rest; });
      }

      (newConfig[field] as number) = numValue;
    }

    onChange(newConfig);
  }, [config, validateInteger, onChange]);

  // Handle split gale selection - mirrors original selectSplitOption
  const handleSplitChange = useCallback((value: number) => {
    onChange({ ...config, galeSplit: value });
  }, [config, onChange]);

  return (
    <div className="space-y-4">
      {/* Stake Input - mirrors original stake-input */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Valor de Entrada (Stake)
        </label>
        <input
          type="number"
          min={0.35}
          step={0.01}
          value={config.stake}
          onChange={(e) => handleConfigChange('stake', e.target.value)}
          className={`w-full bg-[#1e1b2e] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors ${
            errors.stake ? 'border-red-500' : 'border-gray-700'
          }`}
        />
        {errors.stake && (
          <span className="text-xs text-red-400 mt-1 block">{errors.stake}</span>
        )}
      </div>

      {/* Goal Input - mirrors original goal-input */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Valor da Meta (Take Profit)
        </label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={config.goal}
          onChange={(e) => handleConfigChange('goal', e.target.value)}
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Stop Loss Input - mirrors original stop-loss-input */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Valor Stop Loss
        </label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={config.stopLoss}
          onChange={(e) => handleConfigChange('stopLoss', e.target.value)}
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Ajuste de Gale</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={config.galeMultiplier}
            onChange={(e) => handleConfigChange('galeMultiplier', e.target.value)}
            step="0.1"
            min="0"
            max="5.0"
            className="w-1/3 bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            title="Multiplicador"
          />

          <div className="flex-1 flex relative">
            <input
              type="number"
              value={config.galeSplitThreshold}
              onChange={(e) => handleConfigChange('galeSplitThreshold', e.target.value)}
              placeholder="$0.00"
              title="Gatilho de Perda para Split"
              className="w-2/3 bg-[#1e1b2e] border border-gray-700 border-r-0 rounded-l p-2 text-white text-sm focus:border-blue-500 outline-none"
            />
            <button
              onClick={() => setIsSplitDropdownOpen(!isSplitDropdownOpen)}
              className="w-1/3 bg-gray-700 border border-gray-600 rounded-r flex items-center justify-center text-white hover:bg-gray-600"
              title="Parcelas da Divisão"
            >
              <span className="mr-1">{config.galeSplit || 1}</span>
              <ChevronDownIcon className="w-3 h-3" />
            </button>

            {isSplitDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-24 bg-[#2c3e50] border border-gray-600 rounded shadow-xl z-20 max-h-40 overflow-y-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      handleSplitChange(num);
                      setIsSplitDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-600"
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Soros Configuration - mirrors original soros-limit-input and soros-profit-percentage */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Qtde Soros</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={config.sorosLimit}
            onChange={(e) => handleConfigChange('sorosLimit', e.target.value)}
            min="0"
            step="1"
            className="w-1/4 bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            title="Limite de vitórias para Soros"
          />
          <input
            type="number"
            value={config.sorosProfitPercentage}
            onChange={(e) => handleConfigChange('sorosProfitPercentage', e.target.value)}
            min="0"
            max="100"
            className="flex-1 bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            placeholder="100%"
            title="% do Lucro para reinvestir"
          />
          <div className="flex items-center" title="Proteger Soros no Gale">
            <input
              type="checkbox"
              checked={config.galeRemovesSoros}
              onChange={(e) => handleConfigChange('galeRemovesSoros', e.target.checked)}
              className="w-4 h-4 rounded border-gray-700 bg-[#1e1b2e] text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
