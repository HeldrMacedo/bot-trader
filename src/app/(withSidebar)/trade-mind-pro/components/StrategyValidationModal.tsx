'use client';

export interface StrategyValidationResult {
  /** true = pode continuar (só avisos), false = bloqueado */
  valid: boolean;
  /** true = erro crítico — botão "continuar" não é exibido */
  isCritical: boolean;
  issues: string[];
  suggestions: string[];
  warnings: string[];
  /** 'precondition' = incompatibilidade de contrato/trade-type
   *  'pregemini'    = problemas semânticos antes de chamar a IA */
  source?: 'precondition' | 'pregemini';
}

interface StrategyValidationModalProps {
  result: StrategyValidationResult;
  onContinue: () => void;
  onEdit: () => void;
}

export default function StrategyValidationModal({
  result,
  onContinue,
  onEdit,
}: StrategyValidationModalProps) {
  const isCritical = result.isCritical || !result.valid;
  const isPrecondition = result.source === 'precondition';

  const borderColor = isCritical ? 'border-red-500' : 'border-yellow-500';
  const titleColor = isCritical ? 'text-red-400' : 'text-yellow-400';
  const icon = isCritical ? '🚫' : '⚠️';
  const title = isPrecondition
    ? isCritical
      ? 'Estratégia incompatível com a configuração'
      : 'Avisos de compatibilidade'
    : isCritical
    ? 'Problemas críticos na estratégia'
    : 'Avisos antes de enviar para a IA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className={` bg-[#0d0a18] border-2 ${borderColor} rounded-xl shadow-2xl overflow-hidden`} style={{width: '600px'}}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b border-gray-800 flex items-center gap-3`}>
          <span className="text-2xl">{icon}</span>
          <h2 className={`text-base font-bold ${titleColor}`}>{title}</h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4 pl-2 pr-2 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Problemas */}
          {result.issues.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Problemas encontrados
              </h3>
              <ul className="space-y-1.5">
                {result.issues.map((issue, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-2 text-sm ${
                      isCritical ? 'text-red-300' : 'text-yellow-300'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">{isCritical ? '✗' : '!'}</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sugestões */}
          {result.suggestions.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Como corrigir
              </h3>
              <ul className="space-y-1.5">
                {result.suggestions.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-blue-300">
                    <span className="mt-0.5 shrink-0">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Avisos extra (warnings distintos de issues) */}
          {result.warnings.length > 0 &&
            result.warnings.some((w) => !result.issues.includes(w)) && (
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Observações
                </h3>
                <ul className="space-y-1.5">
                  {result.warnings
                    .filter((w) => !result.issues.includes(w))
                    .map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <span className="mt-0.5 shrink-0">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                </ul>
              </section>
            )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 pl-2 pr-2 border-t border-gray-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          >
            {isCritical ? 'Entendi, vou corrigir' : 'Editar estratégia'}
          </button>
          {!isCritical && (
            <button
              type="button"
              onClick={onContinue}
              className="px-4 py-2 rounded-lg text-sm bg-yellow-600 hover:bg-yellow-500 text-white font-semibold transition-colors"
            >
              Continuar mesmo assim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
