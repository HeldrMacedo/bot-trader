import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface ManagementConfigProps {
  config: any;
  onChange: (key: string, value: any) => void;
}

export default function ManagementConfig({ config, onChange }: ManagementConfigProps) {
  const [isSplitDropdownOpen, setIsSplitDropdownOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Valor de Entrada ($)</label>
        <input
          type="number"
          value={config.stake}
          onChange={(e) => onChange('stake', parseFloat(e.target.value))}
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Valor da Meta (Goal) ($)</label>
        <input
          type="number"
          value={config.takeProfit}
          onChange={(e) => onChange('takeProfit', parseFloat(e.target.value))}
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Valor Stop Loss ($)</label>
        <input
          type="number"
          value={config.stopLoss}
          onChange={(e) => onChange('stopLoss', parseFloat(e.target.value))}
          className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
        />
      </div>

      {/* Gale Adjustment Section */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Ajuste de Gale</label>
        <div className="flex gap-2 items-center">
             {/* Multiplier */}
            <input
                type="number"
                value={config.martingaleFactor}
                onChange={(e) => onChange('martingaleFactor', parseFloat(e.target.value))}
                step="0.1"
                min="0"
                max="5.0"
                className="w-1/3 bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                title="Multiplicador"
            />
            
            {/* Hybrid Split Selector */}
            <div className="flex-1 flex relative">
                 <input
                    type="number"
                    value={config.galeSplitThreshold ?? ''}
                    onChange={(e) => onChange('galeSplitThreshold', parseFloat(e.target.value))}
                    placeholder="$0.00"
                    title="Gatilho de Perda para Split"
                    className="w-2/3 bg-[#1e1b2e] border border-gray-700 border-r-0 rounded-l p-2 text-white text-sm focus:border-blue-500 outline-none"
                 />
                 <button
                    onClick={() => setIsSplitDropdownOpen(!isSplitDropdownOpen)}
                    className="w-1/3 bg-gray-700 border border-gray-600 rounded-r flex items-center justify-center text-white hover:bg-gray-600"
                    title="Parcelas da Divisão"
                 >
                     <span className="mr-1">{config.galeSplitCount ?? 1}</span>
                     <ChevronDownIcon className="w-3 h-3" />
                 </button>

                 {isSplitDropdownOpen && (
                     <div className="absolute top-full right-0 mt-1 w-24 bg-[#2c3e50] border border-gray-600 rounded shadow-xl z-20 max-h-40 overflow-y-auto">
                         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                             <button
                                key={num}
                                onClick={() => {
                                    onChange('galeSplitCount', num);
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

      {/* Soros Section */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Qtde Soros</label>
        <div className="flex gap-2 items-center">
             <input
                type="number"
                value={config.sorosLimit ?? 0}
                onChange={(e) => onChange('sorosLimit', parseInt(e.target.value))}
                min="0"
                step="1"
                className="w-1/4 bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                title="Limite de vitórias para Soros"
            />
            <input
                type="number"
                value={config.sorosProfitPercentage ?? 100}
                onChange={(e) => onChange('sorosProfitPercentage', parseInt(e.target.value))}
                min="0"
                max="100"
                className="flex-1 bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                placeholder="100%"
                title="% do Lucro para reinvestir"
            />
             <div className="flex items-center" title="Proteger Soros no Gale">
                <input
                    type="checkbox"
                    checked={config.galeRemovesSoros ?? false}
                    onChange={(e) => onChange('galeRemovesSoros', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-[#1e1b2e] text-blue-600 focus:ring-blue-500"
                />
            </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-800">
           <div className="text-xs text-gray-500 text-center">
               Configurações avançadas de Martingale e Soros
           </div>
      </div>
    </div>
  );
}
