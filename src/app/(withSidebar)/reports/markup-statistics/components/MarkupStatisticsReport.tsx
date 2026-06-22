"use client";

import { useState } from 'react';
import { DerivService } from '@/app/services/DerivService';
import { format } from 'date-fns';

interface MarkupBreakdown {
  app_id: string;
  app_markup_usd: number;
  volume_usd: number;
  payout_usd: number;
  contract_count: number;
  client_count: number;
}

interface MarkupStatisticsData {
  total_app_markup_usd: number;
  total_volume_usd: number;
  total_payout_usd: number;
  total_contract_count: number;
  total_client_count: number;
  breakdown: MarkupBreakdown[];
}

export default function MarkupStatisticsReport() {
  const [reportData, setReportData] = useState<MarkupStatisticsData | null>(null);
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
      const deriv = DerivService.getInstance();
      const accessToken = deriv.getActiveAccessToken();

      if (!accessToken) {
        throw new Error(
          "Conta Deriv (OAuth) não encontrada. Por favor, faça login novamente."
        );
      }

      // Nova API: endpoint REST GET /applications/v1/markup-statistics
      // (proxy server-side em /api/markup-statistics).
      const res = await fetch('/api/markup-statistics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,

        },
        body: JSON.stringify({
          date_from: filters.date_from,
          date_to: filters.date_to,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Erro ao obter estatísticas de markup");
      }

      setReportData(json.data);
    } catch (err: any) {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
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
              value={filters.date_from}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded-md bg-gray-800 border-gray-300 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data Final</label>
            <input
              type="date"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Total de Markup</h3>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(reportData.total_app_markup_usd)}</p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Volume Total</h3>
              <p className="text-2xl font-bold text-blue-500">{formatCurrency(reportData.total_volume_usd)}</p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Payout Total</h3>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(reportData.total_payout_usd)}</p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Total de Contratos</h3>
              <p className="text-2xl font-bold">{reportData.total_contract_count}</p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Total de Clientes</h3>
              <p className="text-2xl font-bold">{reportData.total_client_count}</p>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Detalhamento por App</h3>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-4 py-2 text-left">App ID</th>
                    <th className="px-4 py-2 text-right">Contratos</th>
                    <th className="px-4 py-2 text-right">Clientes</th>
                    <th className="px-4 py-2 text-right">Markup USD</th>
                    <th className="px-4 py-2 text-right">Volume USD</th>
                    <th className="px-4 py-2 text-right">Payout USD</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.breakdown?.map((data, index) => (
                    <tr key={data.app_id ?? index} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-750"}>
                      <td className="px-4 py-2">{data.app_id}</td>
                      <td className="px-4 py-2 text-right">{data.contract_count}</td>
                      <td className="px-4 py-2 text-right">{data.client_count}</td>
                      <td className="px-4 py-2 text-right text-green-500">{formatCurrency(data.app_markup_usd)}</td>
                      <td className="px-4 py-2 text-right text-blue-500">{formatCurrency(data.volume_usd)}</td>
                      <td className="px-4 py-2 text-right text-blue-400">{formatCurrency(data.payout_usd)}</td>
                    </tr>
                  ))}

                  {(!reportData.breakdown || reportData.breakdown.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-center">Nenhum registro encontrado</td>
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
