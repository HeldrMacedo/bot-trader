type MarketAnalysisPanelProps = {
  symbol: string;
};

export default function MarketAnalysisPanel({ symbol }: MarketAnalysisPanelProps) {
  return (
    <div className="bg-[#13111c] border border-gray-800 rounded-lg flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-white font-semibold">Análise de Mercado</h3>
        <div className="text-xs text-gray-400 mt-1">{symbol}</div>
      </div>
      <div className="flex-1 p-4 text-gray-400 text-sm">
        Painel de análise e métricas
      </div>
    </div>
  );
}
