"use client";

import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const tokenList = JSON.parse(localStorage.getItem("token_list") || "[]");
    const ws = new WebSocket(
      `wss://ws.derivws.com/websockets/v3?app_id=${process.env.NEXT_PUBLIC_APPID}`
    );
    let collectedTrades = [];
    let currentTokenIndex = 0;

    const sendAuthorizeAndRequest = () => {
      const token = tokenList[currentTokenIndex]?.token;
      if (!token) {
        setTrades(collectedTrades);
        setLoading(false);
        return;
      }

      ws.send(
        JSON.stringify({
          authorize: token,
        })
      );
    };

    ws.onopen = () => {
      sendAuthorizeAndRequest();
    };

    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);

      if (data.msg_type === "authorize") {
        ws.send(
          JSON.stringify({
            profit_table: 1,
            description: 1,
            limit: limit,
            offset: 0,
            req_id: currentTokenIndex, // identificador por token
          })
        );
      }

      if (data.msg_type === "profit_table") {
        const account = tokenList[currentTokenIndex].acct;
        const tradesWithAccount = (data.profit_table?.transactions || []).map(
          (trade) => ({
            ...trade,
            account,
          })
        );

        collectedTrades = [...collectedTrades, ...tradesWithAccount];
        currentTokenIndex++;

        sendAuthorizeAndRequest(); // Chama o próximo token
      }

      if (data.error) {
        setError(data.error.message);
        setLoading(false);
        ws.close();
      }
    };

    ws.onerror = (e) => {
      setError("Erro na conexão com o WebSocket.");
      setLoading(false);
    };

    return () => ws.close();
  }, [limit]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-75">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-black text-lg">
            Carregando histórico de negociações...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-gray-800">
        <h1 className="text-2xl font-bold mb-4">Histórico</h1>
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md text-gray-800">
      <h1 className="text-2xl font-bold mb-6">Histórico de Operações</h1>

      {trades.length === 0 ? (
        <p>Nenhuma negociação encontrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID da Transação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dt. Operação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entrada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.transaction_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {trade.transaction_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                    {trade.account}
                    {trade.account.startsWith("VRTC") ? (
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
      )}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => {
            setIsLoading(true);
            setLimit(limit + 10);
            setTimeout(() => {
              setIsLoading(false);
            }, 1500);
          }}
          className={`px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors`}
        >
          + Carregar Mais
        </button>
      </div>
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
