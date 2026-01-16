
interface TradeConfigProps {
  config: any;
  availableContractTypes: string[];
  onChange: (key: string, value: any) => void;
}

type ContractGroupConfig = {
  contracts: string[];
  hasBarrier: boolean;
  singleBarrier?: boolean;
  doubleBarrier?: boolean;
  usesDigitPrediction?: boolean;
  usesPredictionRange?: boolean;
  minDuration: number;
  allowedUnits: string[];
};

const CONTRACT_GROUPS: Record<string, ContractGroupConfig> = {
  'Over/Under': {
    contracts: ['DIGITOVER', 'DIGITUNDER'],
    hasBarrier: false,
    usesDigitPrediction: true,
    minDuration: 1,
    allowedUnits: ['t'],
  },
  'Rise/Fall': {
    contracts: ['CALL', 'PUT'],
    hasBarrier: false,
    usesDigitPrediction: false,
    minDuration: 1,
    allowedUnits: ['t', 's', 'm', 'h'],
  },
  'Differ/Match': {
    contracts: ['DIGITDIFF', 'DIGITMATCH'],
    hasBarrier: false,
    usesDigitPrediction: true,
    minDuration: 1,
    allowedUnits: ['t'],
  },
  'Even/Odd': {
    contracts: ['DIGITEVEN', 'DIGITODD'],
    hasBarrier: false,
    usesDigitPrediction: false,
    minDuration: 1,
    allowedUnits: ['t'],
  },
  'Higher/Lower': {
    contracts: ['CALLE', 'PUTE', 'CALLPUT'],
    hasBarrier: true,
    singleBarrier: true,
    usesDigitPrediction: false,
    minDuration: 1,
    allowedUnits: ['t', 's', 'm', 'h'],
  },
  'Asians': {
    contracts: ['ASIANU', 'ASIAND'],
    hasBarrier: false,
    usesDigitPrediction: false,
    minDuration: 5,
    allowedUnits: ['t'],
  },
  'Reset Call/Put': {
    contracts: ['RESETCALL', 'RESETPUT'],
    hasBarrier: false,
    usesDigitPrediction: false,
    minDuration: 1,
    allowedUnits: ['t', 's', 'm', 'h'],
  },
  'High/Low Ticks': {
    contracts: ['TICKHIGH', 'TICKLOW'],
    hasBarrier: false,
    usesDigitPrediction: false,
    usesPredictionRange: true,
    minDuration: 1,
    allowedUnits: ['t'],
  },
  'Only Ups/Downs': {
    contracts: ['RUNHIGH', 'RUNLOW'],
    hasBarrier: false,
    usesDigitPrediction: false,
    minDuration: 2,
    allowedUnits: ['t'],
  },
  'Touch/No Touch': {
    contracts: ['TOUCH', 'NOTOUCH', 'ONETOUCH'],
    hasBarrier: true,
    singleBarrier: true,
    usesDigitPrediction: false,
    minDuration: 2,
    allowedUnits: ['t', 'm', 'h'],
  },
  'Ends Between/Outside': {
    contracts: ['EXPIRYRANGE', 'EXPIRYMISS'],
    hasBarrier: true,
    doubleBarrier: true,
    usesDigitPrediction: false,
    minDuration: 2,
    allowedUnits: ['m', 'h', 'd'],
  },
  'Stays Between/Goes Outside': {
    contracts: ['RANGE', 'UPORDOWN'],
    hasBarrier: true,
    doubleBarrier: true,
    usesDigitPrediction: false,
    minDuration: 2,
    allowedUnits: ['m', 'h', 'd'],
  },
  'Run High/Low': {
    contracts: ['MULTUP', 'MULTDOWN'],
    hasBarrier: false,
    usesDigitPrediction: false,
    minDuration: 2,
    allowedUnits: ['t'],
  },
  'Contratos Individuais': {
    contracts: ['HIGHLOW', 'HIGHEREVEN', 'LOWEREVENT'],
    hasBarrier: false,
    usesDigitPrediction: false,
    minDuration: 1,
    allowedUnits: ['t', 's', 'm', 'h'],
  },
};

function findGroupByContract(contractType: string | undefined | null): ContractGroupConfig | null {
  if (!contractType) return null;
  if (contractType === 'HIGHER_LOWER_GROUP') return CONTRACT_GROUPS['Higher/Lower'] || null;
  for (const group of Object.values(CONTRACT_GROUPS)) {
    if (group.contracts.includes(contractType)) return group;
  }
  return null;
}

function normalizeUnits(units: string[]): string[] {
  const allowed = new Set(['t', 's', 'm', 'h', 'd']);
  return units.filter((u) => allowed.has(u));
}

function extractEffectiveContractType(config: any): string {
  return config?.contractType || '';
}

export default function TradeConfig({ config, availableContractTypes, onChange }: TradeConfigProps) {
  const selectedContractType = extractEffectiveContractType(config);
  const group = findGroupByContract(selectedContractType);
  const normalizedAvailableContracts = Array.from(new Set(availableContractTypes.filter(Boolean)));

  const isHigherLower = selectedContractType === 'HIGHER_LOWER_GROUP';

  const tradeTypeOptions = (() => {
    if (!selectedContractType) return [];

    if (isHigherLower) {
      return [
        { value: 'CALLE', label: 'Higher' },
        { value: 'PUTE', label: 'Lower' },
        { value: 'BOTH', label: 'Ambos' },
      ];
    }

    const g = group;
    if (g) {
      const contractDisplayNames: Record<string, string> = {
        CALLPUT: 'Higher/Lower',
        CALLE: 'Higher',
        PUTE: 'Lower',
        CALL: 'Call',
        PUT: 'Put',
        DIGITOVER: 'Over',
        DIGITUNDER: 'Under',
        DIGITDIFF: 'Differ',
        DIGITMATCH: 'Match',
        DIGITEVEN: 'Even',
        DIGITODD: 'Odd',
        TOUCH: 'Touch',
        NOTOUCH: 'No Touch',
        ASIANU: 'Asian Up',
        ASIAND: 'Asian Down',
      };

      const options = g.contracts.filter((ct) => normalizedAvailableContracts.includes(ct));
      const finalOptions = options.length > 0 ? options : g.contracts;

      const mapped = finalOptions.map((ct) => ({
        value: ct,
        label: contractDisplayNames[ct] || ct,
      }));

      const withPlaceholder = [{ value: '', label: 'Selecione o tipo' }, ...mapped];
      if (finalOptions.length >= 2) {
        withPlaceholder.push({ value: 'BOTH', label: 'Ambos' });
      }

      return withPlaceholder;
    }

    return [
      { value: '', label: 'Selecione o tipo' },
      { value: selectedContractType, label: selectedContractType },
    ];
  })();

  const durationUnits = (() => {
    if (!selectedContractType) return ['t', 's', 'm', 'h'];
    const g = group;
    if (g) return normalizeUnits(g.allowedUnits);
    if (['DIGITDIFF', 'DIGITMATCH', 'DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD'].includes(selectedContractType)) return ['t'];
    if (['CALL', 'PUT', 'CALLE', 'PUTE', 'RESETCALL', 'RESETPUT'].includes(selectedContractType)) return ['t', 's', 'm', 'h'];
    if (['TOUCH', 'NOTOUCH', 'ONETOUCH'].includes(selectedContractType)) return ['t', 'm', 'h'];
    return ['t'];
  })();

  const minDuration = group?.minDuration ?? 1;
  const shouldShowDigitPrediction = !isHigherLower && ((group?.usesDigitPrediction ?? false) || ['DIGITOVER', 'DIGITUNDER', 'DIGITDIFF', 'DIGITMATCH'].includes(selectedContractType));
  const shouldShowPredictionRange = !isHigherLower && (group?.usesPredictionRange ?? false);
  const shouldShowDoubleBarrier = !isHigherLower && (group?.doubleBarrier ?? false);
  const shouldShowSingleBarrier = isHigherLower || (group?.singleBarrier ?? false);

  const contractOptions = (() => {
    const options: Array<{ value: string; label: string; requires?: string[]; anyOf?: string[] }> = [
      { value: 'DIGITOVER', label: 'Over/Under', anyOf: CONTRACT_GROUPS['Over/Under']?.contracts },
      { value: 'CALL', label: 'Rise/Fall', anyOf: CONTRACT_GROUPS['Rise/Fall']?.contracts },
      { value: 'DIGITDIFF', label: 'Differ/Match', anyOf: CONTRACT_GROUPS['Differ/Match']?.contracts },
      { value: 'DIGITEVEN', label: 'Even/Odd', anyOf: CONTRACT_GROUPS['Even/Odd']?.contracts },
      { value: 'HIGHER_LOWER_GROUP', label: 'Higher/Lower', requires: ['CALLE', 'PUTE'] },
    ];

    return options.filter((opt) => {
      if (opt.requires) {
        return opt.requires.every((ct) => normalizedAvailableContracts.includes(ct));
      }
      if (opt.anyOf && opt.anyOf.length > 0) {
        return opt.anyOf.some((ct) => normalizedAvailableContracts.includes(ct));
      }
      return normalizedAvailableContracts.includes(opt.value);
    });
  })();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Tipo de Contrato</label>
        <select
          value={selectedContractType}
          onChange={(e) => {
            const nextContractType = e.target.value || '';
            onChange('contractType', nextContractType);

            const nextIsHigherLower = nextContractType === 'HIGHER_LOWER_GROUP';
            if (nextIsHigherLower) {
              onChange('tradeType', 'CALLE');
              if (!config.barrier) onChange('barrier', '+1');
            } else {
              const nextGroup = findGroupByContract(nextContractType);
              if (nextGroup?.contracts?.length) {
                const nextAvailable = nextGroup.contracts.filter((ct) => normalizedAvailableContracts.includes(ct));
                const fallback = (nextAvailable.length > 0 ? nextAvailable : nextGroup.contracts)[0];
                if (nextContractType && (nextAvailable.length > 0 ? nextAvailable : nextGroup.contracts).includes(nextContractType)) {
                  onChange('tradeType', nextContractType);
                } else if (fallback) {
                  onChange('tradeType', fallback);
                }
              } else if (nextContractType) {
                onChange('tradeType', nextContractType);
              }
            }

            const nextGroup = findGroupByContract(nextContractType);
            const nextMinDuration = nextGroup?.minDuration ?? 1;
            if (Number(config.duration) < nextMinDuration) {
              onChange('duration', nextMinDuration);
            }

            const nextUnits = nextGroup?.allowedUnits ? normalizeUnits(nextGroup.allowedUnits) : durationUnits;
            if (nextUnits.length > 0 && !nextUnits.includes(config.durationUnit)) {
              onChange('durationUnit', nextUnits[0]);
            }

            const nextUsesDigitPrediction = (nextGroup?.usesDigitPrediction ?? false) || ['DIGITOVER', 'DIGITUNDER', 'DIGITDIFF', 'DIGITMATCH'].includes(nextContractType);
            const nextUsesPredictionRange = nextGroup?.usesPredictionRange ?? false;
            if (nextUsesDigitPrediction) {
              const defaultPrediction = nextContractType.includes('OVER') || nextContractType.includes('UNDER') ? 5 : 0;
              onChange('prediction', defaultPrediction);
            } else if (nextUsesPredictionRange) {
              onChange('prediction', 3);
            }

            const nextSingleBarrier = nextIsHigherLower || (nextGroup?.singleBarrier ?? false);
            const nextDoubleBarrier = nextGroup?.doubleBarrier ?? false;
            if (nextSingleBarrier) {
              if (!config.barrier) onChange('barrier', '+1');
            } else if (nextDoubleBarrier) {
              if (!config.barrierHigh) onChange('barrierHigh', '0.001');
              if (!config.barrierLow) onChange('barrierLow', '-0.001');
            } else {
              onChange('barrier', '');
              onChange('barrierHigh', '');
              onChange('barrierLow', '');
            }
          }}
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
          disabled={normalizedAvailableContracts.length === 0}
        >
          <option value="">{normalizedAvailableContracts.length === 0 ? 'Selecione um ativo primeiro' : 'Selecione um tipo de contrato'}</option>
          {contractOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Entrada Inicial ($)</label>
        <input
          type="number"
          value={config.stake}
          onChange={(e) => onChange('stake', parseFloat(e.target.value))}
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Duração</label>
        <div className="flex gap-2">
            <input
            type="number"
            value={config.duration}
            onChange={(e) => onChange('duration', parseInt(e.target.value))}
            min={minDuration}
            className="w-2/3 bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            />
            <select
                value={config.durationUnit}
                onChange={(e) => onChange('durationUnit', e.target.value)}
                className="w-1/3 bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            >
                {durationUnits.includes('t') && <option value="t">Ticks</option>}
                {durationUnits.includes('s') && <option value="s">Segundos</option>}
                {durationUnits.includes('m') && <option value="m">Minutos</option>}
                {durationUnits.includes('h') && <option value="h">Horas</option>}
                {durationUnits.includes('d') && <option value="d">Dias</option>}
            </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Tipo de Trade</label>
        <select
            value={config.tradeType ?? ''}
            onChange={(e) => onChange('tradeType', e.target.value || '')}
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            disabled={tradeTypeOptions.length === 0}
        >
            {tradeTypeOptions.length === 0 ? (
              <option value="">Selecione um contrato primeiro</option>
            ) : (
              tradeTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            )}
        </select>
      </div>

      {shouldShowDigitPrediction && (
         <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Previsão (Dígito)</label>
            <select
                value={config.prediction}
                onChange={(e) => onChange('prediction', parseInt(e.target.value))}
                className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            >
                {[0,1,2,3,4,5,6,7,8,9].map(d => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </select>
         </div>
      )}

      {shouldShowPredictionRange && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Previsão (1-5)</label>
          <input
            type="number"
            value={config.prediction ?? 3}
            onChange={(e) => onChange('prediction', parseInt(e.target.value))}
            min={1}
            max={5}
            step={1}
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
          />
        </div>
      )}

      {shouldShowSingleBarrier && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Barreira</label>
          <input
            type="text"
            value={config.barrier ?? ''}
            onChange={(e) => onChange('barrier', e.target.value)}
            placeholder="Ex: +0.5 ou -0.3"
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none font-mono"
          />
        </div>
      )}

      {shouldShowDoubleBarrier && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Barreira Superior</label>
            <input
              type="number"
              value={config.barrierHigh ?? ''}
              onChange={(e) => onChange('barrierHigh', e.target.value)}
              step="0.00001"
              className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Barreira Inferior</label>
            <input
              type="number"
              value={config.barrierLow ?? ''}
              onChange={(e) => onChange('barrierLow', e.target.value)}
              step="0.00001"
              className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
