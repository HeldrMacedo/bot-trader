import React from 'react';

const LoadingScreen = () => {
  return (
    <div id="loading-screen" className="loading-screen fixed inset-0 bg-gray-900 z-[99999] flex items-center justify-center">
      <div className="loading-container text-center">
        <div className="app-version text-blue-400 mb-4">Versão Pro 2.0</div>
        <h1 className="app-title text-3xl font-bold mb-6 text-white">Strategy Free</h1>

        <div className="promotional-phrase-container mb-8">
          <div id="promotional-phrase" className="promotional-phrase text-lg text-gray-300">
            Crie seus próprios robôs apenas com o prompt de sua estratégia
          </div>
        </div>

        <div className="progress-container w-full max-w-md mx-auto">
          <div className="progress-bar bg-gray-700 rounded-full h-2 mb-2">
            <div id="progress-fill" className="progress-fill bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: '30%' }}></div>
          </div>
          <div id="progress-percentage" className="progress-percentage text-blue-400 font-semibold">30%</div>
          <div id="progress-text" className="progress-text text-gray-400 mt-2">Inicializando sistema...</div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;