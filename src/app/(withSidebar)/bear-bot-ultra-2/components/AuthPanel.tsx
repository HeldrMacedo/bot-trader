"use client";

import { useState } from 'react';
import { useDerivAuth } from '../hooks/useDerivAuth';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function AuthPanel() {
  const { isAuthenticated, accounts, activeToken, login, loginWithToken, logout, switchAccount, isLoading } = useDerivAuth();
  const [manualToken, setManualToken] = useState('');
  const [isVirtual, setIsVirtual] = useState(true);
  const [showTokenInput, setShowTokenInput] = useState(false);

  const activeAccount = accounts.find(a => a.token === activeToken);

  if (isLoading) {
    return (
      <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-6 text-center">
        <div className="animate-pulse text-[#8593aa]">Conectando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-200 font-bold">Conta Deriv não conectada</p>
            <p className="text-xs text-red-300/70">Conecte via OAuth2 ou insira um token de API para operar com dinheiro real.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={login}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            🔐 Login com Deriv (OAuth2)
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2e3a52]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#131925] px-2 text-[#8593aa]">ou</span>
            </div>
          </div>

          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="w-full bg-[#18202f] border border-[#2e3a52] hover:bg-[#222c3f] text-[#8593aa] py-2 rounded-lg font-bold text-xs transition-all"
          >
            {showTokenInput ? '▲ Ocultar' : '▼ Usar Token de API'}
          </button>

          {showTokenInput && (
            <div className="flex flex-col gap-2 bg-[#0e131d] border border-[#2e3a52] rounded-lg p-3">
              <input
                type="password"
                placeholder="Cole seu token da Deriv aqui..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsVirtual(!isVirtual)}
                  className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${isVirtual ? 'bg-yellow-600/30 text-yellow-400 border border-yellow-500/50' : 'bg-red-600/30 text-red-400 border border-red-500/50'}`}
                >
                  {isVirtual ? 'Conta Demo' : 'Conta Real'}
                </button>
                <button
                  onClick={() => { if (manualToken) loginWithToken(manualToken, isVirtual); }}
                  disabled={!manualToken}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-[#04140a] py-2 rounded-md text-xs font-bold transition-all"
                >
                  Conectar
                </button>
              </div>
              <p className="text-[9px] text-gray-500">
                O token é armazenado localmente no seu navegador. Nunca compartilhe seu token.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] text-[#8593aa] uppercase tracking-wider">CONTA ATIVA</p>
          <p className="font-bold font-mono text-sm text-cyan-400">
            {activeAccount?.is_virtual ? 'VIRTUAL' : 'REAL'} · {activeAccount?.loginid}
          </p>
        </div>
        <button onClick={logout} className="text-[10px] text-red-400 hover:text-red-300 font-bold transition-all">
          Sair
        </button>
      </div>

      {accounts.length > 1 && (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-[#8593aa] uppercase tracking-wider mb-1">Trocar Conta</p>
          <div className="flex gap-2">
            {accounts.map(acc => (
              <button
                key={acc.token}
                onClick={() => switchAccount(acc.token)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all border ${
                  acc.token === activeToken
                    ? acc.is_virtual
                      ? 'bg-yellow-600/30 text-yellow-400 border-yellow-500/50'
                      : 'bg-red-600/30 text-red-400 border-red-500/50'
                    : 'bg-[#18202f] text-[#8593aa] border-[#2e3a52] hover:bg-[#222c3f]'
                }`}
              >
                {acc.is_virtual ? 'Demo' : 'Real'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
