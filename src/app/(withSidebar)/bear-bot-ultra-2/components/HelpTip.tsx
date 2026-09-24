"use client";

interface HelpTipProps {
  label: string;
  hint: string;
  /** Prefixo do id do tooltip: evita colisão quando dois painéis usam o mesmo rótulo. */
  idPrefix?: string;
  /** Texto longo (regra geral de uso) fica ilegível na largura padrão de um pilar. */
  wide?: boolean;
}

/** Gatilho "?" com tooltip revelado no hover ou no foco do teclado. */
export default function HelpTip({ label, hint, idPrefix = 'intel-hint', wide = false }: HelpTipProps) {
  const tipId = `${idPrefix}-${label.replace(/[^a-zA-Z0-9]/g, '-')}`;
  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        aria-label={`Como funciona: ${label}`}
        aria-describedby={tipId}
        className="w-3.5 h-3.5 rounded-full bg-[#18202f] border border-[#2e3a52] text-[8px] font-bold text-[#8593aa] leading-none flex items-center justify-center hover:text-[#eef2f8] hover:border-[#3d4a66] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
      >
        ?
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 bottom-full z-20 mb-1.5 ${wide ? 'w-80' : 'w-56'} -translate-x-1/2 rounded-md border border-[#2e3a52] bg-[#070b14] p-2 text-[10px] font-normal leading-snug text-[#c3ccdb] opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        {hint}
      </span>
    </span>
  );
}
