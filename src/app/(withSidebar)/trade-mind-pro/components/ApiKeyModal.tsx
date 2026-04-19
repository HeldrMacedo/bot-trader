import { XMarkIcon } from "@heroicons/react/16/solid";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

const STORAGE_KEY = 'user_api_keys';

export interface ClientApiKeys {
  gemini?: string;
  cerebras?: string;
  groq?: string;
}

export function loadClientApiKeys(): ClientApiKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ClientApiKeys;
  } catch {
    return {};
  }
}

function saveClientApiKeys(keys: ClientApiKeys) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {}
}

interface Props {
  onClose: () => void;
}

interface Provider {
  id: keyof ClientApiKeys;
  name: string;
  placeholder: string;
  url: string;
  urlLabel: string;
  description: string;
  freeInfo: string;
}

const PROVIDERS: Provider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    placeholder: 'AIzaSy...',
    url: 'https://aistudio.google.com/app/apikey',
    urlLabel: 'aistudio.google.com',
    description: 'Modelo principal de IA para geração de estratégias.',
    freeInfo: 'Gratuito: 250 requisições/dia no gemini-2.5-flash-lite',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    placeholder: 'csk-...',
    url: 'https://cloud.cerebras.ai',
    urlLabel: 'cloud.cerebras.ai',
    description: 'Fallback gratuito quando Gemini atinge o limite de uso.',
    freeInfo: 'Gratuito: 1 milhão de tokens/dia — sem cartão de crédito',
  },
  {
    id: 'groq',
    name: 'Groq',
    placeholder: 'gsk_...',
    url: 'https://console.groq.com/keys',
    urlLabel: 'console.groq.com',
    description: 'Fallback gratuito de alta velocidade para inferência.',
    freeInfo: 'Gratuito: 1.000 requisições/dia — sem cartão de crédito',
  },
];

export default function ApiKeyModal({ onClose }: Props) {
  const [keys, setKeys] = useState<ClientApiKeys>(() => loadClientApiKeys());
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const cleaned: ClientApiKeys = {};
    for (const p of PROVIDERS) {
      const v = keys[p.id]?.trim();
      if (v) cleaned[p.id] = v;
    }
    saveClientApiKeys(cleaned);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = (id: keyof ClientApiKeys) => {
    setKeys(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#0d0a18] border border-gray-700 rounded-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#13111c]">
          <div className="text-sm font-semibold text-white">Chaves de API Pessoais</div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <p className="text-xs text-gray-400 leading-relaxed">
            Insira suas próprias chaves de API para usar no lugar das chaves padrão do sistema.
            As chaves ficam salvas apenas no seu navegador (localStorage) e nunca são enviadas para nossos servidores.
          </p>

          {PROVIDERS.map((provider) => {
            const isVisible = visible[provider.id];
            const value = keys[provider.id] ?? '';
            const hasKey = !!value.trim();

            return (
              <div key={provider.id} className="border border-gray-800 rounded-lg p-3 bg-[#13111c] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{provider.name}</span>
                    {hasKey && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-700/40">
                        ativa
                      </span>
                    )}
                  </div>
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
                  >
                    Obter chave → {provider.urlLabel}
                  </a>
                </div>

                <p className="text-xs text-gray-500">{provider.description}</p>
                <p className="text-xs text-green-600">{provider.freeInfo}</p>

                <div className="flex gap-2">
                  <div className="relative flex-1 mr-3">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={value}
                      onChange={(e) => setKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                      placeholder={provider.placeholder}
                      className="w-full bg-[#0b0913] border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-blue-500 outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-xs"
                      title={isVisible ? 'Ocultar' : 'Mostrar'}
                    >
                      {isVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  {hasKey && (
                    <button
                      type="button"
                      onClick={() => handleClear(provider.id)}
                      className="text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-red-900/40 hover:text-red-400 text-gray-400 transition-colors"
                      title="Remover chave"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="text-xs text-gray-600 bg-gray-900/50 rounded p-2 leading-relaxed">
            As chaves pessoais têm prioridade sobre as chaves padrão do sistema. Deixe em branco para usar as chaves padrão.
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800 bg-[#13111c] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="text-sm px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            {saved ? '✓ Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
