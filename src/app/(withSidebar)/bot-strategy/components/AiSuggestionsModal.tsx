import React from 'react';

type RiskLevel = 'baixo' | 'médio' | 'alto' | string;

export interface AiSuggestionStrategy {
  name: string;
  description: string;
  risk_level: RiskLevel;
  rules_text: string;
  json_logic?: any;
}

export interface AiSuggestionsPayload {
  analysis_summary?: string;
  strategies: AiSuggestionStrategy[];
}

export default function AiSuggestionsModal({
  isOpen,
  payload,
  onClose,
  onApply
}: {
  isOpen: boolean;
  payload: AiSuggestionsPayload | null;
  onClose: () => void;
  onApply: (strategy: AiSuggestionStrategy) => void;
}) {
  if (!isOpen || !payload) return null;

  const riskColor = (risk: RiskLevel) => {
    const r = (risk || '').toString().toLowerCase();
    if (r.includes('baixo')) return 'bg-green-900/30 border-green-800 text-green-200';
    if (r.includes('médio') || r.includes('medio')) return 'bg-yellow-900/30 border-yellow-800 text-yellow-200';
    if (r.includes('alto')) return 'bg-red-900/30 border-red-800 text-red-200';
    return 'bg-gray-900/30 border-gray-700 text-gray-200';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-3xl bg-[#13111c] border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="font-bold text-white">💡 Sugestões da IA</div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-300 hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="bg-[#0d0a18] border border-gray-800 rounded-lg p-3 text-sm text-gray-200">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Resumo</div>
            <div>{payload.analysis_summary || 'Análise baseada nos últimos dados disponíveis.'}</div>
          </div>

          <div className="space-y-3">
            {payload.strategies.map((s, idx) => (
              <div key={idx} className="bg-[#0d0a18] border border-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold">{s.name || `Estratégia ${idx + 1}`}</div>
                    <div className="text-sm text-gray-300 mt-1">{s.description}</div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded border ${riskColor(s.risk_level)}`}>
                    {s.risk_level}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Regras</div>
                  <pre className="text-xs whitespace-pre-wrap text-gray-200 bg-black/20 border border-gray-800 rounded p-3 overflow-x-auto">
                    {s.rules_text}
                  </pre>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onApply(s)}
                    className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Usar Esta Estratégia
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

