"use client";

import { useState } from 'react';
import { DerivService } from '@/app/services/DerivService';
import { format } from 'date-fns';

interface MarkupStatistics {
  total_app_markup_usd: number;
  total_transactions_count: number;
  breakdown: []
}

interface MarkupStatisticsResponse {
  app_markup_statistics: MarkupStatistics;
}

export default function MarkupStatisticsReport() {
  const derivService = DerivService.getInstance();
  const [reportData, setReportData] = useState<MarkupStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    date_from: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    date_to: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchMarkupStatistics = async () => {
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
        app_markup_statistics: 1,
        date_from: filters.date_from + ' 00:00:00',
        date_to: filters.date_to + ' 23:59:59',
        passthrough: {},
      };
      
      console.log("Enviando requisição:", requestObj);
      
      // Enviar a requisição usando o DerivService
      const response = await derivService.send<MarkupStatisticsResponse>(requestObj);
      
      console.log("Resposta recebida:", response);
      
    //   if (response.error) {
    //     throw new Error(response.error.message || "Erro ao obter estatísticas de markup");
    //   }
      
      setReportData(response.app_markup_statistics);
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
    fetchMarkupStatistics();
  };

  // Função para formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };


  return (
    <div className="bg-principal p-6 rounded-lg shadow-md text-gray-400">
      <h1 className="text-xl font-bold mb-6">Relatório de Estatísticas de Markup</h1>
      
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Total de Transações</h3>
              <p className="text-2xl font-bold">{reportData.total_transactions_count}</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Total de Markup</h3>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(reportData.total_app_markup_usd)}</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Total de Pagamentos</h3>
              <p className="text-2xl font-bold text-blue-500">{formatCurrency(reportData.total_app_markup_usd)}</p>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Transações por App</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-4 py-2 text-left">App ID</th>
                    <th className="px-4 py-2 text-right">Quantidade de Transações</th>
                    <th className="px-4 py-2 text-right">Markup USD</th>
                    <th className="px-4 py-2 text-right">Valor do Markup</th>
                    <th className="px-4 py-2 text-left">Moeda</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.breakdown.map((data, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-750"}>
                      <td className="px-4 py-2">{data['app_id']}</td>
                      <td className="px-4 py-2 text-right">{data['transactions_count']}</td>
                      <td className="px-4 py-2 text-right text-green-500">{formatCurrency(data['app_markup_usd'])}</td>
                      <td className="px-4 py-2 text-right text-blue-500">{formatCurrency(data['app_markup_value'])}</td>
                      <td className="px-4 py-2">{data['dev_currcode']}</td>
                    </tr>
                  ))}
                  
                  {reportData.breakdown.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-center">Nenhum registro encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}