import React from 'react';
import { Brain, Zap, TrendingUp } from 'lucide-react';
import { MLPerformanceStats } from '../types';

interface PerformanceStatsProps {
  performance: any;
  mlStats?: MLPerformanceStats;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({ performance, mlStats }) => {
  if (!performance) return null;

  return (
    <div className='bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-sm border border-gray-700 p-6'>
      <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
        <TrendingUp size={20} className="text-blue-400" />
        Estatísticas
      </h3>

      <div className='space-y-3'>
        <div className='flex justify-between'>
          <span className="text-gray-300">Símbolos Monitorados:</span>
          <span className='font-medium text-white'>
            {performance.symbols_monitored}
          </span>
        </div>

        <div className='flex justify-between'>
          <span className="text-gray-300">Total de Dígitos:</span>
          <span className='text-white'>
            {performance.total_digits_analyzed.toLocaleString()}
          </span>
        </div>

        <div className='flex justify-between'>
          <span className="text-gray-300">Sinais Gerados:</span>
          <span className='font-medium text-blue-400'>
            {performance.total_signals}
          </span>
        </div>

        <div className='flex justify-between'>
          <span className="text-gray-300">Alta Confiança:</span>
          <span className='font-medium text-green-400'>
            {performance.high_confidence_signals}
          </span>
        </div>

        <div className='flex justify-between'>
          <span className="text-gray-300">Média Confiança:</span>
          <span className='font-medium text-yellow-400'>
            {performance.medium_confidence_signals}
          </span>
        </div>

        {/* Estatísticas ML */}
        {mlStats && (
          <>
            <div className='border-t border-gray-700 pt-3 mt-3'>
              <div className='flex items-center gap-2 mb-2'>
                <Brain size={16} className="text-purple-400" />
                <span className="text-sm font-medium text-gray-300">Machine Learning</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Acurácia:</span>
                  <span className={`ml-2 font-medium ${mlStats.ml_accuracy > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {mlStats.ml_accuracy.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Latência:</span>
                  <span className="ml-2 font-medium text-blue-400">
                    {mlStats.prediction_latency.toFixed(1)}ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Amostras:</span>
                  <span className="ml-2 font-medium text-purple-400">
                    {mlStats.training_samples.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Modelos:</span>
                  <span className="ml-2 font-medium text-yellow-400">
                    {Object.keys(mlStats.model_versions).length}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};