import React from 'react';

interface TradeConfigProps {
  config: any;
  onChange: (key: string, value: any) => void;
}

export default function TradeConfig({ config, onChange }: TradeConfigProps) {
  return (
    <div className="space-y-4">
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
            className="w-2/3 bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            />
            <select
                value={config.durationUnit}
                onChange={(e) => onChange('durationUnit', e.target.value)}
                className="w-1/3 bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            >
                <option value="t">Ticks</option>
                <option value="s">Segundos</option>
                <option value="m">Minutos</option>
                <option value="h">Horas</option>
            </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Tipo de Trade</label>
        <select
            value={config.tradeType}
            onChange={(e) => onChange('tradeType', e.target.value)}
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
        >
            <option value="CALL">Sobe (Call)</option>
            <option value="PUT">Desce (Put)</option>
            <option value="DIGITOVER">Dígito Acima</option>
            <option value="DIGITUNDER">Dígito Abaixo</option>
            <option value="DIGITMATCH">Dígito Combina</option>
            <option value="DIGITDIFF">Dígito Difere</option>
            <option value="EVEN">Par</option>
            <option value="ODD">Ímpar</option>
        </select>
      </div>

      {(config.tradeType === 'DIGITOVER' || config.tradeType === 'DIGITUNDER' || config.tradeType === 'DIGITMATCH' || config.tradeType === 'DIGITDIFF') && (
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
    </div>
  );
}
