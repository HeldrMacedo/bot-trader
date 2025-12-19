"use client";

import { useState, useEffect } from 'react';
import { DerivService } from '@/app/services/DerivService';
import { format } from 'date-fns';

interface MarkupTransaction {
  transaction_id: number;
  transaction_time: string;
  client_loginid: string;
  app_id: number;
  app_markup: number;
  app_markup_usd: number;
  app_markup_value: number;
  client_currcode: string;
  dev_currcode: string;
  dev_loginid: string;
  description?: string;
}

interface MarkupDetailsResponse {
  app_markup_details: {
    transactions: MarkupTransaction[];
  };
}

export default function MarkupDetailsReport() {
  const derivService = DerivService.getInstance();
  const [reportData, setReportData] = useState<MarkupDetailsResponse['app_markup_details'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    app_id: process.env.NEXT_PUBLIC_APP_ID,
    date_from: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    date_to: format(new Date(), 'yyyy-MM-dd'),
    limit: 10,
    offset: 0,
    sort: "DESC",
    sort_fields: ["transaction_time"]
  });

  const fetchMarkupDetails = async () => {
    setLoading(true);
    setError(null);
   
    try {
      // Verificar se o serviço está conectado e autorizado
      if (!derivService.isConnected) {
        throw new Error("Serviço não está conectado. Por favor, aguarde a conexão ou recarregue a página.");
      }
      
      if (!derivService.hasAuthorized) {
        throw new Error("Usuário não está autenticado. Por favor, faça login novamente.");
      }
      
      // Construir o objeto de requisição
      const requestObj = {
        app_markup_details: 1,
        description: 1,
        ...filters,
        date_from: filters.date_from + ' 00:00:00',
        date_to: filters.date_to + ' 23:59:59',
        passthrough: {},
      };
      // Enviar a requisição usando o DerivService
      const response = await derivService.send<MarkupDetailsResponse>(requestObj);
      // if (response.error) {
      //   throw new Error(response.error.message || "Erro ao obter detalhes de markup");
      // }
      
      // Na função fetchMarkupDetails, após receber a resposta:
      setReportData(response.app_markup_details);
      // Calcular total baseado no número de transações retornadas
      setTotalCount(response.app_markup_details.transactions?.length || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchMarkupDetails();
  };

  return (
    <div className="bg-principal p-6 rounded-lg shadow-md text-gray-400">
      <h1 className="text-xl font-bold mb-6">Relatório de Detalhes de Markup</h1>
      
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">          
          <div>
            <label className="block text-sm font-medium mb-1">Data Inicial</label>
            <input
              type="date"
              name="date_from"
              value={filters.date_from.replace(' ', 'T')}
              onChange={(e) => handleFilterChange({
                target: {
                  name: 'date_from',
                  value: e.target.value.replace('T', ' ')
                }
              })}
              className="w-full p-2 border rounded-md bg-gray-800 border-gray-300 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Data Final</label>
            <input
              type="date"
              name="date_to"
              value={filters.date_to.replace(' ', 'T')}
              onChange={(e) => handleFilterChange({
                target: {
                  name: 'date_to',
                  value: e.target.value.replace('T', ' ')
                }
              })}
              className="w-full p-2 border rounded-md bg-gray-800 border-gray-300 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Limite</label>
            <input
              type="number"
              name="limit"
              value={filters.limit}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded-md bg-gray-800 border-gray-300 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Ordenação</label>
            <select
              name="sort"
              value={filters.sort}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded-md bg-gray-800 border-gray-300 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
            >
              <option value="ASC">Crescente</option>
              <option value="DESC">Decrescente</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Gerar Relatório"}
          </button>
        </div>
      </form>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {reportData && (
        <div className="overflow-x-auto">
          <h2 className="text-lg font-semibold mb-2">Resultados</h2>
          <p className="mb-4">Total de registros: {reportData.transactions?.length || 0}</p>
          
  
          <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-4 py-2 text-left">ID da Transação</th>
                <th className="px-4 py-2 text-left">ID do Cliente</th>
                <th className="px-4 py-2 text-left">Data da Transação</th>
                <th className="px-4 py-2 text-right">Markup (USD)</th>
                <th className="px-4 py-2 text-right">Valor do Markup</th>
                <th className="px-4 py-2 text-left">Moeda Cliente</th>
                <th className="px-4 py-2 text-left">Login</th>
              </tr>
            </thead>
            <tbody>
              {reportData.transactions && reportData.transactions.map((transaction, index) => (
                <tr key={transaction.transaction_id} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-750"}>
                  <td className="px-4 py-2">{transaction.transaction_id}</td>
                  <td className="px-4 py-2">{transaction.client_loginid}</td>
                  <td className="px-4 py-2">{new Date(transaction.transaction_time).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{ new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(transaction.app_markup_usd)}</td>
                  <td className="px-4 py-2 text-right">{ new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(transaction.app_markup_value)}</td>
                  <td className="px-4 py-2">{transaction.client_currcode}</td>
                  <td className="px-4 py-2">{transaction.dev_loginid}</td>
                </tr>
              ))}
              
              {(!reportData.transactions || reportData.transactions.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-2 text-center">Nenhum registro encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => {
                if (filters.offset > 0) {
                  setFilters(prev => ({
                    ...prev,
                    offset: Math.max(0, prev.offset - prev.limit)
                  }));
                  fetchMarkupDetails();
                }
              }}
              disabled={filters.offset === 0 || loading}
              className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              Anterior
            </button>
            
            <span>
              Página {Math.floor(filters.offset / filters.limit) + 1}
              {totalCount > 0 ? ` (${totalCount} registros)` : ""}
            </span>
            
            <button
              onClick={() => {
                // Como não temos count total da API, vamos permitir próxima página se retornou dados
                if (reportData.transactions && reportData.transactions.length === filters.limit) {
                  setFilters(prev => ({
                    ...prev,
                    offset: prev.offset + prev.limit
                  }));
                  fetchMarkupDetails();
                }
              }}
              disabled={!reportData.transactions || reportData.transactions.length < filters.limit || loading}
              className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
          
          <div className="mt-6">
            <button
              onClick={async () => {
                // Exportar para CSV - busca separada sem limite
                try {
                  setLoading(true);
                  
                  // Verificar se o serviço está conectado e autorizado
                  if (!derivService.isConnected) {
                    throw new Error("Serviço não está conectado. Por favor, aguarde a conexão ou recarregue a página.");
                  }
                  
                  if (!derivService.hasAuthorized) {
                    throw new Error("Usuário não está autenticado. Por favor, faça login novamente.");
                  }
                  
                  // Construir o objeto de requisição para exportação (sem limite)
                  const exportRequestObj = {
                    app_markup_details: 1,
                    description: 1,
                    app_id: filters.app_id,
                    date_from: filters.date_from + ' 00:00:00',
                    date_to: filters.date_to + ' 23:59:59',
                    sort: filters.sort,
                    sort_fields: filters.sort_fields,
                    // Sem limit e offset para pegar todos os registros
                    passthrough: {},
                  };
                  
                  
                  // Fazer requisição separada para exportação
                  const exportResponse = await derivService.send(exportRequestObj);
                  
                  if (!exportResponse.app_markup_details || !exportResponse.app_markup_details.transactions) {
                    throw new Error("Nenhum dado encontrado para exportação");
                  }
                  
                  const exportTransactions = exportResponse.app_markup_details.transactions;
                  
                  if (exportTransactions.length === 0) {
                    alert("Nenhum registro encontrado para o período selecionado.");
                    return;
                  }
                  
                  // Calcular totais
                  const totalMarkupUsd = exportTransactions.reduce((sum, t) => sum + (t.app_markup_usd || 0), 0);
                  const totalMarkupValue = exportTransactions.reduce((sum, t) => sum + (t.app_markup_value || 0), 0);
                  
                  // Preparar dados para CSV
                  const headers = ["ID da Transação", "ID do Cliente", "Data da Transação", "Markup (USD)", "Valor do Markup", "Moeda Cliente", "Dev Login"];
                  const csvData = exportTransactions.map(t => [
                    t.transaction_id,
                    t.client_loginid,
                    t.transaction_time,
                    t.app_markup_usd,
                    t.app_markup_value,
                    t.client_currcode,
                    t.dev_loginid
                  ]);
                  
                  // Adicionar linha de total
                  const totalRow = [
                    "",
                    "",
                    "TOTAL:",
                    totalMarkupUsd.toFixed(2),
                    totalMarkupValue.toFixed(2),
                    "",
                    ""
                  ];
                  
                  const csvContent = [
                    headers.join(","),
                    ...csvData.map(row => row.join(",")),
                    "", // Linha em branco antes do total
                    totalRow.join(",")
                  ].join("\n");
                  
                  // Criar e baixar o arquivo
                  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `markup-details-completo-${filters.date_from}-${filters.date_to}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  
                  // Mostrar mensagem de sucesso com totais
                  alert(`Exportação concluída!\n${exportTransactions.length} registros exportados.\nTotal Markup USD: $${totalMarkupUsd.toFixed(2)}\nTotal Valor Markup: $${totalMarkupValue.toFixed(2)}`);
                  
                } catch (err) {
                  console.error("Erro na exportação:", err);
                  alert(`Erro ao exportar: ${err.message}`);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Exportando..." : "Exportar para CSV (Todos os Registros)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}