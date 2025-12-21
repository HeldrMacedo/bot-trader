import React from 'react';
import { Brain, Cpu, Database, Zap, Save, Download } from 'lucide-react';
import { MLConfig } from '../types';

interface MLConfigPanelProps {
  mlConfig: MLConfig;
  updateMLConfig: (config: MLConfig) => void;
}

export const MLConfigPanel: React.FC<MLConfigPanelProps> = ({ mlConfig, updateMLConfig }) => {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain size={24} className="text-purple-400" />
          <h3 className="text-lg font-semibold text-white">
            Configurações de Machine Learning
          </h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${mlConfig.useML ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {mlConfig.useML ? 'ML ATIVO' : 'ML INATIVO'}
        </div>
      </div>

      <div className="space-y-4">
        {/* Controle principal */}
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Zap size={18} className="text-yellow-400" />
            <div>
              <span className="text-sm font-medium text-gray-300">
                Sistema ML
              </span>
              <p className="text-xs text-gray-500">
                Ative para usar predições de machine learning
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={mlConfig.useML}
              onChange={(e) => updateMLConfig({ ...mlConfig, useML: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {mlConfig.useML && (
          <>
            {/* Aprendizado Online */}
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Cpu size={18} className="text-green-400" />
                <div>
                  <span className="text-sm font-medium text-gray-300">
                    Aprendizado Online
                  </span>
                  <p className="text-xs text-gray-500">
                    Melhora modelos com novos dados em tempo real
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mlConfig.onlineLearning}
                  onChange={(e) => updateMLConfig({ ...mlConfig, onlineLearning: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Treinamento Automático */}
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-blue-400" />
                <div>
                  <span className="text-sm font-medium text-gray-300">
                    Treinamento Automático
                  </span>
                  <p className="text-xs text-gray-500">
                    Treina modelos periodicamente com dados coletados
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mlConfig.trainingEnabled}
                  onChange={(e) => updateMLConfig({ ...mlConfig, trainingEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Controles de precisão */}
            <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <Brain size={16} className="text-purple-400" />
                    Limite de Confiança ML
                  </span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={mlConfig.confidenceThreshold}
                    onChange={(e) => updateMLConfig({ 
                      ...mlConfig, 
                      confidenceThreshold: parseInt(e.target.value) 
                    })}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
                  />
                  <span className="text-white font-medium min-w-[40px] text-lg">
                    {mlConfig.confidenceThreshold}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Sinal precisa ter confiança ML ≥ {mlConfig.confidenceThreshold}%
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Janela de Análise
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="10"
                    value={mlConfig.featureWindow}
                    onChange={(e) => updateMLConfig({ 
                      ...mlConfig, 
                      featureWindow: parseInt(e.target.value) 
                    })}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                  />
                  <span className="text-white font-medium min-w-[40px]">
                    {mlConfig.featureWindow}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Quantos ticks usar para análise ML
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                onClick={() => {
                  // Ação para treinar modelos
                  alert('Iniciando treinamento dos modelos...');
                }}
              >
                <Save size={16} />
                Salvar Modelos
              </button>
              <button
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                onClick={() => {
                  // Ação para exportar dados
                  alert('Exportando dados de treinamento...');
                }}
              >
                <Download size={16} />
                Exportar Dados
              </button>
            </div>

            {/* Status */}
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                Status do Sistema ML
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-400">TensorFlow.js:</span>
                  <span className="text-green-400">Pronto</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-400">Modelos:</span>
                  <span className="text-green-400">Carregados</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-400">Memória:</span>
                  <span className="text-blue-400">OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-400">Performance:</span>
                  <span className="text-yellow-400">Boa</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};