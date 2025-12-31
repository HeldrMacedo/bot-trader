import React from 'react';
import { Brain, TrendingUp, Target, BarChart3, Cpu, Trash } from 'lucide-react';
import { AnalysisData, MLPerformanceStats } from '../types';

interface MLAnalysisPanelProps {
  analysisData: AnalysisData | null;
  mlStats: MLPerformanceStats;
  onTrainModels: () => void;
  onHandleClearModels: () => void;
}

export const MLAnalysisPanel: React.FC<MLAnalysisPanelProps> = ({ 
  analysisData, 
  mlStats,
  onTrainModels,
  onHandleClearModels
}) => {
  const getMLPredictions = () => {
    if (!analysisData?.analyses) return null;
    
    const firstSymbol = Object.keys(analysisData.analyses)[0];
    return analysisData.analyses[firstSymbol]?.ml_predictions;
  };

  const mlPredictions = getMLPredictions();

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain size={24} className="text-purple-400" />
          <h3 className="text-lg font-semibold text-white">
            Análise de Machine Learning
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
          onClick={onTrainModels}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Cpu size={16} />
          Treinar Modelos
        </button>
        <button
            onClick={onHandleClearModels}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-sm text-white font-medium transition-colors"
          >
           <Trash size={16}/> Limpar Modelos ML
          </button>
        </div>
        
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estatísticas ML */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-400" />
            Estatísticas do Sistema
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Acurácia ML</div>
              <div className={`text-xl font-bold ${mlStats.ml_accuracy > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                {mlStats.ml_accuracy.toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Latência</div>
              <div className={`text-xl font-bold ${mlStats.prediction_latency < 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                {mlStats.prediction_latency.toFixed(1)}ms
              </div>
            </div>
            
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Amostras</div>
              <div className="text-xl font-bold text-blue-400">
                {mlStats.training_samples.toLocaleString()}
              </div>
            </div>
            
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Modelos</div>
              <div className="text-xl font-bold text-purple-400">
                {Object.keys(mlStats.model_versions).length}
              </div>
            </div>
          </div>

          {/* Status de Coleta de Dados */}
          <div className="bg-gray-800/30 p-3 rounded-lg">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">Status de Coleta de Dados</span>
              <span className={`text-xs font-medium ${mlStats.data_collection_active ? 'text-green-400' : 'text-red-400'}`}>
                {mlStats.data_collection_active ? 'ATIVO' : 'INATIVO'}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${mlStats.data_collection_active ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: mlStats.data_collection_active ? '100%' : '30%' }}
              ></div>
            </div>
          </div>

          {/* Status de Treinamento */}
          <div className="bg-gray-800/30 p-3 rounded-lg">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">Status de Treinamento</span>
              <span className={`text-xs font-medium ${mlStats.is_training ? 'text-green-400' : 'text-yellow-400'}`}>
                {mlStats.is_training ? 'TREINANDO' : 'AGUARDANDO'}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${mlStats.is_training ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-yellow-500'}`}
                style={{ width: mlStats.is_training ? '100%' : '40%' }}
              ></div>
            </div>
          </div>

          {/* Progresso de Treinamento */}
          <div className="bg-gray-800/30 p-3 rounded-lg">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">Progresso do Treinamento</span>
              <span className="text-gray-300">
                {Math.min(100, (mlStats.training_samples / 10000) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (mlStats.training_samples / 10000) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Previsões Atuais */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Target size={16} className="text-green-400" />
            Previsões Atuais
          </h4>
          
          {mlPredictions ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Confiança ML:</span>
                <span className={`text-lg font-bold ${mlPredictions.confidence > 80 ? 'text-green-400' : mlPredictions.confidence > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {mlPredictions.confidence.toFixed(1)}%
                </span>
              </div>
              
              {mlPredictions.predicted_digit !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Dígito Previsto:</span>
                  <span className="text-2xl font-bold text-white bg-gray-700 w-10 h-10 flex items-center justify-center rounded-lg">
                    {mlPredictions.predicted_digit}
                  </span>
                </div>
              )}
              
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-xs text-gray-400 mb-2">Top 3 Probabilidades:</div>
                <div className="space-y-1">
                  {mlPredictions.next_digit_probabilities
                    .map((prob, idx) => ({ digit: idx, prob }))
                    .sort((a, b) => b.prob - a.prob)
                    .slice(0, 3)
                    .map((item, index) => (
                      <div key={item.digit} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                          <span className="text-sm text-gray-300">Dígito {item.digit}</span>
                        </div>
                        <span className="text-sm font-medium text-white">
                          {(item.prob * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              
              <div className="text-xs text-gray-500 italic">
                Último treino: {new Date(mlStats.last_trained).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">Aguardando dados para análise ML</p>
              <p className="text-sm text-gray-500">
                O sistema precisa coletar mais ticks para fazer previsões
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recomendações ML */}
      {analysisData?.signals && analysisData.signals.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-yellow-400" />
            Recomendações Baseadas em ML
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysisData.signals
              .filter(signal => signal.strategy.includes('ML_'))
              .slice(0, 2)
              .map((signal, index) => (
                <div key={index} className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-white">{signal.type}</div>
                      <div className="text-xs text-gray-400">{signal.symbol}</div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${signal.confidence > 85 ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        ML: {signal.confidence.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {signal.reasons.slice(0, 1).map((reason, i) => (
                      <div key={i} className="truncate">{reason}</div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Informações Detalhadas de Treinamento */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Cpu size={16} className="text-blue-400" />
          Informações de Treinamento Detalhadas
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Fila de Treinamento</div>
            <div className="text-xl font-bold text-blue-400">
              {mlStats.training_queue_size}
            </div>
            <div className="text-xs text-gray-500 mt-1">Amostras aguardando</div>
          </div>
          
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Tamanho do Batch</div>
            <div className="text-xl font-bold text-purple-400">
              {mlStats.current_batch_size}
            </div>
            <div className="text-xs text-gray-500 mt-1">Amostras por treino</div>
          </div>
          
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Taxa de Aprendizado</div>
            <div className="text-xl font-bold text-green-400">
              {mlStats.learning_rate}
            </div>
            <div className="text-xs text-gray-500 mt-1">Valor do LR</div>
          </div>
        </div>

        <div className="mt-4 bg-gray-800/30 p-4 rounded-lg">
          <h5 className="text-xs font-medium text-gray-400 mb-2">Status dos Modelos</h5>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Probabilidade Predictor:</span>
              <span className={`font-medium ${mlStats.models_trained.probability_predictor ? 'text-green-400' : 'text-yellow-400'}`}>
                {mlStats.models_trained.probability_predictor ? 'TREINADO' : 'AGUARDANDO'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Pattern Detector:</span>
              <span className={`font-medium ${mlStats.models_trained.pattern_detector ? 'text-green-400' : 'text-yellow-400'}`}>
                {mlStats.models_trained.pattern_detector ? 'TREINADO' : 'AGUARDANDO'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Versão do Modelo:</span>
              <span className="font-medium text-blue-400">
                {mlStats.model_versions.current || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-gray-800/30 p-4 rounded-lg">
          <h5 className="text-xs font-medium text-gray-400 mb-2">Características do Treinamento</h5>
          <div className="text-sm text-gray-300">
            <div className="mb-1">• <span className="text-blue-400">Features utilizadas:</span> {mlStats.features_count} características extraídas dos dados de mercado</div>
            <div className="mb-1">• <span className="text-blue-400">Arquitetura:</span> Redes neurais com {mlStats.model_architecture} camadas</div>
            <div className="mb-1">• <span className="text-blue-400">Frequência de treinamento:</span> Atualização contínua com novos dados</div>
            <div>• <span className="text-blue-400">Tipo de aprendizado:</span> Aprendizado online incremental</div>
          </div>
        </div>
      </div>
    </div>
  );
};