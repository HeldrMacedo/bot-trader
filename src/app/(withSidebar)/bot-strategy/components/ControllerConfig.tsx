import React from 'react';

interface ControllerConfigProps {
  config: any;
  onChange: (key: string, value: any) => void;
}

export default function ControllerConfig({ config, onChange }: ControllerConfigProps) {
  return (
    <div className="space-y-4">
      {/* Real Limits */}
      <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Vitórias Reais</label>
            <input
                type="number"
                value={config.winReal || 5}
                onChange={(e) => onChange('winReal', parseInt(e.target.value))}
                min="0"
                className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Perdas Reais</label>
            <input
                type="number"
                value={config.lossReal || 1}
                onChange={(e) => onChange('lossReal', parseInt(e.target.value))}
                min="0"
                className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            />
          </div>
      </div>

      {/* Simulated Limits */}
      <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Vitórias Simuladas</label>
            <input
                type="number"
                value={config.winSimulated || 0}
                onChange={(e) => onChange('winSimulated', parseInt(e.target.value))}
                min="0"
                className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Perdas Simuladas</label>
            <input
                type="number"
                value={config.lossSimulated || 1}
                onChange={(e) => onChange('lossSimulated', parseInt(e.target.value))}
                min="0"
                className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            />
          </div>
      </div>

      {/* Session Limits */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Limite de Trades (0 = Infinito)</label>
        <input
            type="number"
            value={config.tradeLimit || 0}
            onChange={(e) => onChange('tradeLimit', parseInt(e.target.value))}
            min="0"
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Tempo Delay (Ticks)</label>
        <input
            type="number"
            value={config.cooldown || 3}
            onChange={(e) => onChange('cooldown', parseInt(e.target.value))}
            min="1"
            className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
            title="Ticks extras após duração do contrato"
        />
      </div>

      <div className="pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-300">Pausar após Loss</label>
            <input
            type="checkbox"
            checked={config.pauseOnLoss}
            onChange={(e) => onChange('pauseOnLoss', e.target.checked)}
            className="toggle checkbox-accent"
            />
        </div>

        <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-300">Pausar após Win</label>
            <input
            type="checkbox"
            checked={config.pauseOnWin}
            onChange={(e) => onChange('pauseOnWin', e.target.checked)}
            className="toggle checkbox-accent"
            />
        </div>

        {(config.pauseOnLoss || config.pauseOnWin) && (
            <div className="mt-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Tempo de Pausa (segundos)</label>
                <input
                type="number"
                value={config.pauseTime}
                onChange={(e) => onChange('pauseTime', parseInt(e.target.value))}
                className="w-full bg-[#1e1b2e] border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                />
            </div>
        )}
      </div>
    </div>
  );
}
