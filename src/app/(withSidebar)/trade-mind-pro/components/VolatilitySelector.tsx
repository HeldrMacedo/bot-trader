import { DerivService } from '@/app/services/DerivService';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface VolatilitySelectorProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

interface SymbolData {
  symbol: string;
  display_name: string;
  market_display_name: string;
}

export default function VolatilitySelector({ selectedSymbol, onSelectSymbol }: VolatilitySelectorProps) {
  const [symbols, setSymbols] = useState<SymbolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const derivService = DerivService.getInstance();
        // Wait for connection if needed, but send() should handle it or queue it
        // We might need to ensure connection is open. 
        // Assuming DerivService handles queueing or we retry.
        
        const response = await derivService.send({ 
          active_symbols: 'brief', 
          product_type: 'basic' 
        });

        if (response.active_symbols) {
            // Filter for Volatility Indices (synthetic_index) usually, 
            // but user asked for "Volatilidades", so we focus on derived/synthetic.
            // Adjust filter as per actual API response structure for Volatility Indices.
            const volatilitySymbols = response.active_symbols.filter((s: any) => 
                s.market === 'synthetic_index' && s.submarket === 'random_index'
            );

            setSymbols(volatilitySymbols);
            
            // Set default if none selected
            if (!selectedSymbol && volatilitySymbols.length > 0) {
                onSelectSymbol(volatilitySymbols[1].symbol);
            }
        }
      } catch (error) {
        console.error("Error fetching symbols:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSymbols();
  }, []);

  const selectedSymbolData = symbols.find(s => s.symbol === selectedSymbol);

  return (
    <div className="mb-6 relative">
      <label className="block text-sm font-medium text-gray-400 mb-2">Ativo (Volatilidade)</label>
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full bg-[#1e1b2e] border border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between text-white hover:border-gray-500 transition-colors"
      >
        <span className="flex items-center gap-2">
            {loading ? (
                <span className="text-gray-500">Carregando...</span>
            ) : (
                <>
                    {/* Icon placeholder */}
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {selectedSymbolData ? selectedSymbolData.display_name : 'Selecione um ativo'}
                </>
            )}
        </span>
        <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !loading && (
        <div className="absolute z-10 mt-1 w-full bg-[#1e1b2e] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {symbols.map((symbol) => (
                <button
                    key={symbol.symbol}
                    onClick={() => {
                        onSelectSymbol(symbol.symbol);
                        setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors flex items-center gap-2 ${selectedSymbol === symbol.symbol ? 'bg-gray-800 text-blue-400' : 'text-gray-300'}`}
                >
                    <span className={`w-2 h-2 rounded-full ${selectedSymbol === symbol.symbol ? 'bg-blue-400' : 'bg-gray-600'}`}></span>
                    {symbol.display_name}
                </button>
            ))}
        </div>
      )}
    </div>
  );
}

