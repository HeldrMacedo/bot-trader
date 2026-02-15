import { useState, useEffect, useCallback } from 'react';

// Contract groups definition - same as original configurations.js
const CONTRACT_GROUPS = {
  'Over/Under': {
    label: 'Over/Under',
    contracts: ['DIGITOVER', 'DIGITUNDER'] as string[],
    description: 'Apostar se o último dígito será maior ou menor que um valor',
    hasBarrier: false,
    usesDigitPrediction: true,
    minDuration: 1,
    allowedUnits: ['t'] as string[]
  },
  'Rise/Fall': {
    label: 'Rise/Fall',
    contracts: ['CALL', 'PUT'] as string[],
    description: 'Apostar na direção do preço (subir ou descer)',
    hasBarrier: false,
    usesDigitPrediction: false,
    minDuration: 1,
    allowedUnits: ['t', 's', 'm', 'h'] as string[]
  },
  'Differ/Match': {
    label: 'Differ/Match',
    contracts: ['DIGITDIFF', 'DIGITMATCH'] as string[],
    description: 'Apostar se o último dígito será diferente ou igual a um valor',
    hasBarrier: false,
    usesDigitPrediction: true,
    minDuration: 1,
    allowedUnits: ['t'] as string[]
  },
  'Even/Odd': {
    label: 'Even/Odd',
    contracts: ['DIGITEVEN', 'DIGITODD'] as string[],
    description: 'Apostar se o último dígito será par ou ímpar',
    hasBarrier: false,
    usesDigitPrediction: false,
    minDuration: 1,
    allowedUnits: ['t'] as string[]
  },
    'Higher/Lower': {
    label: 'Higher/Lower',
    contracts: ['CALLE', 'PUTE', 'CALLPUT'] as string[],
    description: 'Apostar se o preço será maior ou menor que uma barreira',
    hasBarrier: true,
    singleBarrier: true,
    usesDigitPrediction: false,
    minDuration: 1,
    allowedUnits: ['t', 's', 'm', 'h'] as string[]
  }
};

// Unit display mapping
const UNIT_DISPLAY_MAP: Record<string, string> = {
  't': 'Ticks',
  's': 'Segundos',
  'm': 'Minutos',
  'h': 'Horas',
  'd': 'Dias'
};

// Contract display names
const CONTRACT_DISPLAY_NAMES: Record<string, string> = {
  'CALLPUT': 'Higher/Lower',
  'CALLE': 'Higher',
  'PUTE': 'Lower',
  'CALL': 'Call',
  'PUT': 'Put',
  'DIGITOVER': 'Over',
  'DIGITUNDER': 'Under',
  'DIGITDIFF': 'Differ',
  'DIGITMATCH': 'Match',
  'DIGITEVEN': 'Even',
  'DIGITODD': 'Odd',
  'BOTH': 'Ambos'
};

// Storage key
const STORAGE_KEY = 'trade_config_trade';

// Default configuration values - mirrors original DEFAULT_CONFIG
export const DEFAULT_CONFIG = {
  contractType: 'DIGITDIFF',
  tradeType: 'DIGITDIFF',
  duration: 1,
  durationUnit: 't',
  prediction: '0',
  barrier: '+1',
  barrierHigh: '0.001',
  barrierLow: '-0.001'
};

export interface TradeConfigData {
  contractType: string;
  tradeType: string;
  duration: number;
  durationUnit: string;
  prediction: string;
  barrier: string;
  barrierHigh: string;
  barrierLow: string;
}

interface TradeConfigProps {
  config: TradeConfigData;
  onChange: (config: TradeConfigData) => void;
}

export default function TradeConfig({ config, onChange }: TradeConfigProps) {
  // Validation errors state - same pattern as original
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Get current contract group
  const getCurrentContractGroup = useCallback(() => {
    for (const [groupName, groupData] of Object.entries(CONTRACT_GROUPS)) {
      if (groupData.contracts.includes(config.contractType)) {
        return { name: groupName, data: groupData };
      }
    }
    return null;
  }, [config.contractType]);

  // Update duration options based on contract type - mirrors original updateDurationOptions
  const getAllowedDurationUnits = useCallback((contractType: string): string[] => {
    // Check if Higher/Lower group
    const higherLowerContracts = ['CALLE', 'PUTE', 'CALLPUT'];
    if (contractType === 'HIGHER_LOWER_GROUP' || higherLowerContracts.indexOf(contractType) >= 0) {
      const higherLowerGroup = CONTRACT_GROUPS['Higher/Lower'];
      return [...(higherLowerGroup?.allowedUnits || ['t', 's', 'm', 'h'])];
    }

    // Find contract group
    for (const [, groupData] of Object.entries(CONTRACT_GROUPS)) {
      if (groupData.contracts.indexOf(contractType) >= 0) {
        return [...groupData.allowedUnits];
      }
    }

    // Legacy mappings for unconfigured contracts
    const contractMappings: Record<string, string[]> = {
      'DIGITDIFF': ['t'],
      'DIGITMATCH': ['t'],
      'DIGITOVER': ['t'],
      'DIGITUNDER': ['t'],
      'DIGITEVEN': ['t'],
      'DIGITODD': ['t'],
      'CALL': ['t', 's', 'm', 'h'],
      'PUT': ['t', 's', 'm', 'h'],
      'CALLE': ['t', 's', 'm', 'h'],
      'PUTE': ['t', 's', 'm', 'h']
    };

    return contractMappings[contractType] || ['t'];
  }, []);

  // Validate duration - mirrors original validateDurationForContract
  const validateDuration = useCallback((duration: number, unit: string, contractType: string): { isValid: boolean; error?: string } => {
    // Validate based on contract type
    if (['DIGITDIFF', 'DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD', 'DIGITMATCH'].includes(contractType)) {
      if (unit === 't' && (duration < 1 || duration > 10)) {
        return { isValid: false, error: 'Para contratos de dígitos, a duração deve ser entre 1 e 10 ticks' };
      }
    }

    // Higher/Lower minimum durations - from original validateAndSaveDuration
    if (['CALLE', 'PUTE', 'CALLPUT'].includes(contractType)) {
      const minimumsByUnit: Record<string, number> = {
        't': 5,
        's': 15,
        'm': 1,
        'h': 1
      };
      const minimum = minimumsByUnit[unit] || 1;
      if (duration < minimum) {
        return { isValid: false, error: `Para Higher/Lower, duração mínima é ${minimum} ${UNIT_DISPLAY_MAP[unit]}` };
      }
    }

    return { isValid: true };
  }, []);

  // Check if contract needs prediction field
  const needsPrediction = useCallback((contractType: string): boolean => {
    const group = getCurrentContractGroup();
    if (!group) return false;
    return group.data.usesDigitPrediction || false;
  }, [getCurrentContractGroup]);

  // Check if contract needs barrier field
  const needsBarrier = useCallback((contractType: string): boolean => {
    // Rise/Fall doesn't need barrier
    if (['CALL', 'PUT'].includes(contractType)) return false;
    
    // Higher/Lower needs barrier
    if (['CALLE', 'PUTE', 'CALLPUT', 'HIGHER_LOWER_GROUP'].includes(contractType)) return true;
    
    const group = getCurrentContractGroup();
    if (!group) return false;
    return group.data.hasBarrier || false;
  }, [getCurrentContractGroup]);

  // Check if contract needs double barriers
  const needsDoubleBarriers = useCallback((contractType: string): boolean => {
    const group = getCurrentContractGroup();
    if (!group) return false;
    return (group.data as any).doubleBarrier || false;
  }, [getCurrentContractGroup]);

  // Handle configuration changes - mirrors original saveCurrentConfiguration
  const handleConfigChange = useCallback((field: keyof TradeConfigData, value: string | number) => {
    const newConfig = { ...config, [field]: value };

    // Special handling for contract type change - mirrors original contract change logic
    if (field === 'contractType') {
      const allowedUnits = getAllowedDurationUnits(value as string);
      
      // Reset duration unit if current is not allowed
      if (!allowedUnits.includes(config.durationUnit)) {
        newConfig.durationUnit = allowedUnits[0];
      }

      // Set default duration based on contract - from original validateAndSaveDuration
      const minimumsByUnit: Record<string, number> = {
        't': ['CALLE', 'PUTE', 'CALLPUT'].includes(value as string) ? 5 : 1,
        's': 15,
        'm': 1,
        'h': 1
      };
      
      if (newConfig.duration < minimumsByUnit[newConfig.durationUnit]) {
        newConfig.duration = minimumsByUnit[newConfig.durationUnit];
      }

      // Update trade type based on contract group - mirrors original updateTradeTypeDropdown
      const group = Object.entries(CONTRACT_GROUPS).find(([, data]) => 
        data.contracts.indexOf(value as string) >= 0
      );
      
      if (group) {
        const [, groupData] = group;
        if (groupData.contracts.length > 1) {
          newConfig.tradeType = value as string;
        }
      }
    }

    // Validate duration on change - mirrors original validateAndSaveDuration
    if (field === 'duration' || field === 'durationUnit') {
      const validation = validateDuration(
        Number(newConfig.duration),
        newConfig.durationUnit,
        newConfig.contractType
      );
      
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, duration: validation.error || '' }));
      } else {
        setErrors(prev => { const { duration, ...rest } = prev; return rest; });
      }
    }

    onChange(newConfig);
  }, [config, getAllowedDurationUnits, validateDuration, onChange]);

  // Validate barrier format - mirrors original validateAndSaveBarrier
  const validateBarrier = useCallback((value: string): boolean => {
    const barrierRegex = /^[+-]\d+(\.\d+)?$/;
    return barrierRegex.test(value);
  }, []);

  // Get allowed units for current contract
  const allowedUnits = getAllowedDurationUnits(config.contractType);

  // Get available trade types for current contract - mirrors original updateTradeTypeDropdown
  const getAvailableTradeTypes = useCallback(() => {
    const group = getCurrentContractGroup();
    if (!group) {
      return [{ value: config.contractType, label: CONTRACT_DISPLAY_NAMES[config.contractType] || config.contractType }];
    }

    const groupContracts = [...group.data.contracts];
    const options = groupContracts.map(contract => ({
      value: contract,
      label: CONTRACT_DISPLAY_NAMES[contract] || contract
    }));

    // Add "Ambos" option if group has 2+ contracts
    if (groupContracts.length >= 2) {
      options.push({ value: 'BOTH', label: 'Ambos' });
    }

    return options;
  }, [config.contractType, getCurrentContractGroup]);

  return (
    <div className="space-y-4">
      {/* Contract Type Selection - mirrors original contract-select */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Tipo de Contrato
        </label>
        <select
          value={config.contractType}
          onChange={(e) => handleConfigChange('contractType', e.target.value)}
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
        >
          <option value="">Selecione um tipo</option>
          {Object.entries(CONTRACT_GROUPS).map(([groupName, groupData]) => (
            <option key={groupName} value={groupData.contracts[0]}>
              {groupData.label}
            </option>
          ))}
        </select>
      </div>

      {/* Trade Type Selection - mirrors original trade-type-select */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Tipo Trade
        </label>
        <select
          value={config.tradeType}
          onChange={(e) => handleConfigChange('tradeType', e.target.value)}
          disabled={getAvailableTradeTypes().length <= 1}
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {getAvailableTradeTypes().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Duration Input - mirrors original duration-input and duration-unit-select */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Duração
          </label>
          <input
            type="number"
            min={1}
            value={config.duration}
            onChange={(e) => handleConfigChange('duration', parseInt(e.target.value) || 1)}
            className={`w-full bg-[#1e1b2e] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors ${
              errors.duration ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          {errors.duration && (
            <span className="text-xs text-red-400 mt-1 block">{errors.duration}</span>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Unidade
          </label>
          <select
            value={config.durationUnit}
            onChange={(e) => handleConfigChange('durationUnit', e.target.value)}
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          >
            {allowedUnits.map((unit) => (
              <option key={unit} value={unit}>
                {UNIT_DISPLAY_MAP[unit]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Prediction Field - mirrors original prediction-input - Conditional */}
      {needsPrediction(config.contractType) && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Previsão
          </label>
          <input
            type="number"
            min={0}
            max={9}
            step={1}
            value={config.prediction}
            onChange={(e) => {
              const val = Math.max(0, Math.min(9, parseInt(e.target.value) || 0));
              handleConfigChange('prediction', val.toString());
            }}
            placeholder="0-9"
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      )}

      {/* Single Barrier Field - mirrors original barrier-input - Conditional */}
      {needsBarrier(config.contractType) && !needsDoubleBarriers(config.contractType) && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Barreira
          </label>
          <input
            type="text"
            value={config.barrier}
            onChange={(e) => {
              const value = e.target.value;
              handleConfigChange('barrier', value);
              if (value && !validateBarrier(value)) {
                setErrors(prev => ({ ...prev, barrier: 'Use formato: +0.5 ou -0.3' }));
              } else {
                setErrors(prev => { const { barrier, ...rest } = prev; return rest; });
              }
            }}
            placeholder="Ex: +0.5 ou -0.3"
            pattern="^[+-]\d+(\.\d+)?$"
            className={`w-full bg-[#1e1b2e] border rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500 transition-colors ${
              errors.barrier ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          {errors.barrier && (
            <span className="text-xs text-red-400 mt-1 block">{errors.barrier}</span>
          )}
        </div>
      )}

      {/* Double Barriers Fields - mirrors original barrier-high-input and barrier-low-input - Conditional */}
      {needsDoubleBarriers(config.contractType) && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Barreira Superior
            </label>
            <input
              type="number"
              step="0.00001"
              value={config.barrierHigh}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                handleConfigChange('barrierHigh', Math.abs(value).toString());
              }}
              placeholder="Ex: 0.001"
              className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Barreira Inferior
            </label>
            <input
              type="number"
              step="0.00001"
              value={config.barrierLow}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                const negativeValue = value > 0 ? -value : value;
                handleConfigChange('barrierLow', negativeValue.toString());
              }}
              placeholder="Ex: -0.001"
              className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
