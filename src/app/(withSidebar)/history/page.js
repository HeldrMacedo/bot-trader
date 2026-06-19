"use client";

import { DocumentChartBarIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { DerivService } from "@/app/services/DerivService";

export default function HistoryPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  const [demoToken, setDemoToken] = useState(null);
  const [realToken, setRealToken] = useState(null);
  const [viewMode, setViewMode] = useState("demo"); // 'demo' | 'real'

  // Carrega os tokens disponíveis (demo/real) e define o modo inicial
  // com base na conta ativa do DerivService.
  useEffect(() => {
    const deriv = DerivService.getInstance();
    const accounts = deriv.getStorageDerivAccount();
    const tokens = accounts?.[0]?.tokens || [];

    const demo = tokens.find((t) => t.is_virtual) || null;
    const real = tokens.find((t) => !t.is_virtual) || null;

    if (!demo && !real) {
      setError("Nenhuma conta Deriv conectada.");
      setLoading(false);
      return;
    }

    setDemoToken(demo);
    setRealToken(real);

    const activeToken = accounts?.[0]?.activeToken;
    const activeIsVirtual = tokens.find((t) => t.token === activeToken)?.is_virtual;
    setViewMode(activeIsVirtual === false && real ? "real" : demo ? "demo" : "real");
  }, []);

  // Busca o histórico da conta selecionada sempre que o modo, o limite
  // ou os tokens mudarem.
  useEffect(() => {
    const selected = viewMode === "demo" ? demoToken : realToken;
    if (!selected) return;

    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const deriv = DerivService.getInstance();
        const account = selected.acct || selected.loginid;

        // Busca o profit_table da conta selecionada (demo ou real) via
        // conexão pré-autorizada por OTP, sem alterar a conta ativa de trade.
        const response = await deriv.getProfitTableForAccount(
          selected.token,
          limit,
          0
        );

        const tradesWithAccount = (response?.profit_table?.transactions || [])
          .map((trade) => ({ ...trade, account, is_virtual: selected.is_virtual }))
          .sort((a, b) => b.purchase_time - a.purchase_time);

        if (!cancelled) {
          setTrades(tradesWithAccount);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Erro ao buscar o histórico de operações.");
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [viewMode, limit, demoToken, realToken]);

  const switchMode = (mode) => {
    if (mode === viewMode) return;
    setLimit(20);
    setTrades([]);
    setViewMode(mode);
  };

  return (
    <div className="bg-principal mx-auto max-w-[1500px] p-6 rounded-lg shadow-md text-gray-400">
      <h1 className="flex items-center gap-2 text-lg font-bold text-gray-400 mb-4">
        <DocumentChartBarIcon className="w-6 h-6" /> Histórico de Operações
      </h1>

      {/* Alternância entre conta real e demo */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => switchMode("real")}
          disabled={!realToken}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            viewMode === "real"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          } ${!realToken ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          Conta Real
        </button>
        <button
          onClick={() => switchMode("demo")}
          disabled={!demoToken}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            viewMode === "demo"
              ? "bg-yellow-500 text-black shadow-md"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          } ${!demoToken ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          Conta Demo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-white text-lg">
              Carregando histórico de negociações...
            </p>
          </div>
        </div>
      ) : error ? (
        <div>
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="login-button flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Tentar novamente
          </button>
        </div>
      ) : trades.length === 0 ? (
        <p>Nenhuma negociação encontrada</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-500">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    ID da Transação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Conta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Dt. Operação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Entrada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Resultado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-slate-500">
                {trades.map((trade) => (
                  <tr key={trade.transaction_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {trade.transaction_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                      {trade.account}
                      {trade.is_virtual ? (
                        <span className="bg-yellow-500 text-black text-xs font-medium py-1 px-3 rounded-full shadow-md transition-all hover:bg-yellow-600">
                          Virtual
                        </span>
                      ) : (
                        <span className="bg-blue-600 text-white text-xs font-medium py-1 px-3 rounded-full shadow-md transition-all hover:bg-blue-700">
                          Real
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(trade.purchase_time * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      $
                      {parseFloat(trade.buy_price).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap ${
                        trade.sell_price >= trade.buy_price
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {trade.sell_price === 0 ? "-" : "+"}$
                      {trade.sell_price === 0
                        ? parseFloat(trade.buy_price).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : parseFloat(trade.sell_price).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center mt-6">
            <button
              onClick={() => {
                setIsLoading(true);
                setLimit(limit + 10);
                setTimeout(() => {
                  setIsLoading(false);
                }, 1500);
              }}
              className={`login-button flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`}
            >
              + Carregar Mais
            </button>
          </div>
        </>
      )}

      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-white text-lg">Carregando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
