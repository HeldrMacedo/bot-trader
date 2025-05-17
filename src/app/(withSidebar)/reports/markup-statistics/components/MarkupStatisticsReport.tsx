"use client";

import { useState } from 'react';
import { DerivService } from '@/app/services/DerivService';
import { format } from 'date-fns';

interface MarkupStatistics {
  total_markup: number;
  total_payout: number;
  total_count: number;
  transactions_per_day: {
    [date: string]: {
      count: number;
      markup: number;
      payout: number;
    }
  };
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
    date_from: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd HH:mm:ss'),
    date_to: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
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
        date_from: filters.date_from,
        date_to: filters.date_to,
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

  // Função para extrair dados para o gráfico
  const getChartData = () => {
    if (!reportData || !reportData.transactions_per_day) return [];
    
    return Object.entries(reportData.transactions_per_day).map(([date, data]) => ({
      date,
      count: data.count,
      markup: data.markup,
      payout: data.payout
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  return (
    <div className="bg-principal p-6 rounded-lg shadow-md text-gray-400">
      <h1 className="text-xl font-bold mb-6">Relatório de Estatísticas de Markup</h1>
      
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data Inicial</label>
            <input
              type="datetime-local"
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
              type="datetime-local"
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
              <p className="text-2xl font-bold">{reportData.total_count}</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Total de Markup</h3>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(reportData.total_markup)}</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Total de Pagamentos</h3>
              <p className="text-2xl font-bold text-blue-500">{formatCurrency(reportData.total_payout)}</p>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Transações por Dia</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-4 py-2 text-left">Data</th>
                    <th className="px-4 py-2 text-right">Quantidade</th>
                    <th className="px-4 py-2 text-right">Markup</th>
                    <th className="px-4 py-2 text-right">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {getChartData().map((dayData, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-750"}>
                      <td className="px-4 py-2">{new Date(dayData.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-right">{dayData.count}</td>
                      <td className="px-4 py-2 text-right text-green-500">{formatCurrency(dayData.markup)}</td>
                      <td className="px-4 py-2 text-right text-blue-500">{formatCurrency(dayData.payout)}</td>
                    </tr>
                  ))}
                  
                  {getChartData().length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center">Nenhum registro encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => {
                // Exportar para CSV
                const chartData = getChartData();
                if (chartData.length === 0) return;
                
                const headers = ["Data", "Quantidade", "Markup", "Pagamento"];
                const csvData = chartData.map(day => [
                  new Date(day.date).toLocaleDateString(),
                  day.count,
                  day.markup,
                  day.payout
                ]);
                
                // Adicionar linha de totais
                csvData.push([
                  "TOTAL",
                  reportData.total_count,
                  reportData.total_markup,
                  reportData.total_payout
                ]);
                
                const csvContent = [
                  headers.join(","),
                  ...csvData.map(row => row.join(","))
                ].join("\n");
                
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `markup-statistics-${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              disabled={!reportData.transactions_per_day || Object.keys(reportData.transactions_per_day).length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Exportar para CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}