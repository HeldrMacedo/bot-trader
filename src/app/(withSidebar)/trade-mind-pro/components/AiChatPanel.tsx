import { CommandLineIcon, PaperAirplaneIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { Bars3Icon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HelpManualModal from "./HelpManualModal";
import { DeleteIcon } from "lucide-react";

interface RuleHistoryItem {
  rule: string;
  timestamp: number;
  usageCount: number;
  hasJson: boolean;
  geminiJson: any | null;
  ruleCode?: string | null;
  loadedFromFile?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  image?: ImageData;
  timestamp: Date;
}

interface AiChatPanelProps {
  onStrategyGenerated: (strategy: any) => void;
  isProcessing: boolean;
  onSendMessage: (text: string, image?: ImageData) => void;
  onClearMessages?: () => void;
  messages: Message[];
  mode: 'strategy' | 'chat' | 'config' | 'advanced';
  onModeChange: (mode: 'strategy' | 'chat' | 'config' | 'advanced') => void;
  progressMessage?: string | null;
  onRequestSuggestions?: () => void;
  draftStorageKey?: string | null;
  configRules?: any | null;
  onConfigRulesChange?: (rules: any) => void;
  advancedRulesLoaded?: boolean;
}
export default function AiChatPanel(
  {
    onStrategyGenerated,
    isProcessing,
    onSendMessage,
    onClearMessages,
    messages,
    mode,
    onModeChange,
    progressMessage,
    onRequestSuggestions,
    draftStorageKey,
    configRules,
    onConfigRulesChange,
    advancedRulesLoaded }: AiChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [openDropdownGroup, setOpenDropdownGroup] = useState<string | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [historyRules, setHistoryRules] = useState<RuleHistoryItem[]>([]);
  const historyFileInputRef = useRef<HTMLInputElement>(null);
  const hamburgerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
  
    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target as Node)) {
          setOpenDropdownGroup(null);
        }
        if (hamburgerRef.current && !hamburgerRef.current.contains(e.target as Node)) {
          setShowHamburgerMenu(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 100)}px`;
  };

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if ((!input.trim()) || isProcessing) return;
      
      onSendMessage(input|| undefined);
      if (mode === 'chat') {
        setInput('');
        if (draftStorageKey) {
          try {
            localStorage.setItem(draftStorageKey, '');
          } catch {
          }
        }
      }
    };

    const placeholder = useMemo(() => {
        if (mode === 'strategy') {
          return (
            'Digite aqui sua estratégia de monitoramento...\n' +
            '* Entrar quando ultimo digito = 9\n' +
            '* Entrar quando percentual de digitos impares > 60%\n'
          );
        }
        if (mode === 'advanced') {
          return (
            'Descreva sua estratégia avançada em linguagem natural...\n' +
            '* Contar dígitos nos últimos 10 ticks\n' +
            '* Escolher o mais frequente com desempate por recência\n' +
            '* Só operar se os 2 últimos dígitos forem diferentes\n'
          );
        }
        if (mode === 'config') {
          return 'Parâmetros da estratégia...';
        }
        return 'Digite sua pergunta...';
      }, [mode]);
      
    const groupedParameters = useMemo(() => {
      const parameters = configRules?.parameters || [];
      const grouped: Record<string, any[]> = {};
      parameters.forEach((param: any) => {
        const match = typeof param.label === 'string' ? param.label.match(/\(G(\d+)R\d+\)/) : null;
        const groupNum = match ? match[1] : '1';
        const groupKey = `Grupo ${groupNum}`;
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(param);
      });
      return grouped;
    }, [configRules]);

    const getGroupRuleText = (groupKey: string) => {
      const groupMatch = groupKey.match(/Grupo (\d+)/);
      const groupNum = groupMatch ? parseInt(groupMatch[1], 10) : 1;
      const rules = configRules?.groups || [];
      const group = rules.find((g: any) => Number(g.id) === groupNum);
      if (!group?.rules?.length) return null;
      const texts = group.rules.map((rule: any) => rule.description || rule.type).filter(Boolean);
      return texts.length > 0 ? texts.join(' + ') : null;
    };

    const parsePath = (path: string) => {
      const tokens: Array<string | number> = [];
      const regex = /([^[.\]]+)|\[(\d+)\]/g;
      let match;
      while ((match = regex.exec(path)) !== null) {
        if (match[1]) tokens.push(match[1]);
        if (match[2]) tokens.push(Number(match[2]));
      }
      return tokens;
    };

    const setValueByPath = (obj: any, path: string, value: any) => {
      if (!obj || !path) return obj;
      const tokens = parsePath(path);
      if (tokens.length === 0) return obj;
      const next = Array.isArray(obj) ? [...obj] : { ...obj };
      let current: any = next;
      for (let i = 0; i < tokens.length - 1; i++) {
        const token = tokens[i];
        const nextToken = tokens[i + 1];
        const currentValue = current[token as any];
        const cloned = Array.isArray(currentValue) ? [...currentValue] : { ...(currentValue || (typeof nextToken === 'number' ? [] : {})) };
        current[token as any] = cloned;
        current = cloned;
      }
      const lastToken = tokens[tokens.length - 1];
      current[lastToken as any] = value;
      return next;
    };

    const getGroupActivationConfig = (groupNum: number) => {
      const groups = configRules?.groupActivation || {};
      const config = groups[groupNum];
      return {
        initial: config?.initial ?? true,
        winReal: config?.winReal ?? true,
        lossReal: config?.lossReal ?? true,
        winSimulated: config?.winSimulated ?? true,
        lossSimulated: config?.lossSimulated ?? true,
      };
    };

    const handleGroupActivationChange = (groupNum: number, type: string, checked: boolean) => {
      if (!configRules) return;
      const currentActivation = configRules.groupActivation || {};
      const currentGroup = currentActivation[groupNum] || {
        initial: true, winReal: true, lossReal: true, winSimulated: true, lossSimulated: true,
      };
      const updatedActivation = {
        ...currentActivation,
        [groupNum]: { ...currentGroup, [type]: checked },
      };
      onConfigRulesChange?.({ ...configRules, groupActivation: updatedActivation });
    };

    const handleParameterChange = (param: any, rawValue: string) => {
      if (!configRules) return;
      let updatedValue: any = rawValue;
      if (param.isArray) {
        updatedValue = rawValue
          .split(',')
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0)
          .map((v: string) => Number(v))
          .filter((v: number) => !Number.isNaN(v));
      } else if (param.type === 'number') {
        updatedValue = rawValue === '' ? '' : Number(rawValue);
        if (Number.isNaN(updatedValue)) updatedValue = rawValue;
      }

      let updatedRules = setValueByPath(configRules, param.path, updatedValue);
      if (updatedRules?.parameters) {
        updatedRules = {
          ...updatedRules,
          parameters: updatedRules.parameters.map((p: any) =>
            p.key === param.key ? { ...p, value: param.isArray ? rawValue : updatedValue } : p
          )
        };
      }
      onConfigRulesChange?.(updatedRules);
    };

    const getLoginId = (): string | null => {
      try {
        const accounts = JSON.parse(localStorage.getItem('deriv_accounts') || '[]');
        const a = Array.isArray(accounts) ? accounts[0] : null;
        return a?.selectedLoginId || a?.loginId || a?.tokens?.[0]?.loginid || null;
      } catch { return null; }
    };

    const loadHistory = useCallback((): RuleHistoryItem[] => {
      try {
        const loginId = getLoginId();
        if (!loginId) return [];
        const data = localStorage.getItem(`rules_history_${loginId}`);
        if (!data) return [];
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return [];
        return parsed.sort((a, b) => b.timestamp - a.timestamp);
      } catch { return []; }
    }, []);

    const openHistoryModal = () => {
      setHistoryRules(loadHistory());
      setShowHistoryModal(true);
      setShowHamburgerMenu(false);
    };

    const deleteHistoryRule = (index: number) => {
      try {
        const loginId = getLoginId();
        if (!loginId) return;
        const key = `rules_history_${loginId}`;
        const current = JSON.parse(localStorage.getItem(key) || '[]') as RuleHistoryItem[];
        current.splice(index, 1);
        localStorage.setItem(key, JSON.stringify(current));
        setHistoryRules(loadHistory());
      } catch { /* ignore */ }
    };

    const clearAllHistory = () => {
      try {
        const loginId = getLoginId();
        if (!loginId) return;
        localStorage.removeItem(`rules_history_${loginId}`);
        setHistoryRules([]);
      } catch { /* ignore */ }
    };

    const applyHistoryRule = (item: RuleHistoryItem, useInstant: boolean) => {
      setInput(item.rule);
      onModeChange('strategy');
      setShowHistoryModal(false);
      if (useInstant && item.hasJson && item.geminiJson) {
        onStrategyGenerated(item.geminiJson);
      }
    };

    const handleHistoryFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter(f => f.name.endsWith('.json'));
      if (!files.length) return;
      const loginId = getLoginId();
      if (!loginId) return;
      const key = `rules_history_${loginId}`;

      Promise.all(files.map(file => file.text())).then(contents => {
        let current: RuleHistoryItem[] = [];
        try { current = JSON.parse(localStorage.getItem(key) || '[]'); } catch { /* ignore */ }

        contents.forEach(content => {
          try {
            const data = JSON.parse(content);
            if (!data.rule) return;
            const normalized = data.rule.toLowerCase().replace(/\s+/g, ' ').trim();
            const existing = current.findIndex(r => r.rule.toLowerCase().replace(/\s+/g, ' ').trim() === normalized);
            const item: RuleHistoryItem = {
              rule: data.rule,
              timestamp: data.timestamp || Date.now(),
              usageCount: 1,
              hasJson: !!data.geminiJson,
              geminiJson: data.geminiJson || null,
              loadedFromFile: true,
            };
            if (existing === -1) { current.unshift(item); }
            else { current[existing] = { ...current[existing], ...item, usageCount: current[existing].usageCount + 1 }; current.unshift(current.splice(existing, 1)[0]); }
          } catch { /* ignore */ }
        });

        localStorage.setItem(key, JSON.stringify(current));
        setHistoryRules(loadHistory());
        if (e.target) e.target.value = '';
      });
    };

    const generateRulePreview = (ruleText: string) => {
      const lines = ruleText.split('\n').filter(l => l.trim());
      if (lines.length === 0) return <span className="text-gray-500 italic">vazia</span>;
      if (lines.length === 1) return <span>{lines[0]}</span>;
      return (
        <>
          {lines.slice(0, 3).map((l, i) => <div key={i} className="truncate">{l}</div>)}
          {lines.length > 3 && <div className="text-gray-500 text-xs">... e mais {lines.length - 3} linha(s)</div>}
        </>
      );
    };

    const clearChat = () => {
      onClearMessages?.();
      setInput('');
      if (draftStorageKey) {
        try {
          localStorage.setItem(draftStorageKey, '');
        } catch {
        }
      }
      setShowHamburgerMenu(false);
    };

  return (
    <div className="flex flex-col h-full bg-[#13111c] border border-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-white flex items-center gap-2">
              <CommandLineIcon className="w-5 h-5" /> IA Trader
              <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-0.5 rounded">Gemini</span>
          </h3>
          <div className="flex bg-[#0d0a18] border border-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => onModeChange('strategy')}
              className={`px-2 py-1 text-xs rounded ${mode === 'strategy' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
              disabled={isProcessing}
            >
              Estratégia
            </button>
            <button
              type="button"
              onClick={() => onModeChange('config')}
              className={`px-2 py-1 text-xs rounded ${mode === 'config' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
              disabled={isProcessing}
            >
              Configuração
            </button>
            <button
              type="button"
              onClick={() => onModeChange('chat')}
              className={`px-2 py-1 text-xs rounded ${mode === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
              disabled={isProcessing}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => onModeChange('advanced')}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${mode === 'advanced' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:text-white'}`}
              disabled={isProcessing}
              title="Modo avançado: estratégias complexas com linguagem natural"
            >
              Avançado
              {advancedRulesLoaded && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
            </button>
          </div>
        </div>
        <div className="relative" ref={hamburgerRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowHamburgerMenu(prev => !prev); }}
            className="flex items-center justify-center w-8 h-8 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            title="Menu"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          {showHamburgerMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-[#1e1b2e] border border-gray-700 rounded-lg shadow-xl py-1 w-52">
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => { setShowHamburgerMenu(false); setShowExamplesModal(true); }}
              >
                Modelos de Estratégias
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={openHistoryModal}
              >
                Histórico de Regras
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => { setShowHamburgerMenu(false); setShowHelpModal(true); }}
              >
                Manual de Instruções
              </button>
            </div>
          )}
        </div>
      </div>
      {mode !== 'config' && (
      <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 &&  (
            <div className="text-center text-gray-500 mt-10">
                <p>Olá! Eu sou a IA Trader.</p>
                <p className="text-sm mt-2">
                  {mode === 'strategy'
                    ? 'Descreva sua estratégia e eu a configurarei para você.'
                    : mode === 'advanced'
                    ? 'Descreva uma estratégia complexa em linguagem natural — eu gero as regras no motor avançado.'
                    : 'Faça perguntas sobre mercado, dígitos, preços e indicadores.'}
                </p>
                <div className="mt-4 text-xs bg-gray-800/50 p-3 rounded-lg inline-block text-left">
                    <p className="font-bold mb-1">Exemplos:</p>
                    <ul className="list-disc list-inside space-y-1">
                        {mode === 'strategy' ? (
                          <>
                            <li>&quot;Compre CALL se o RSI for menor que 30&quot;</li>
                            <li>&quot;Se o último dígito for par, compre DIGITOVER 5&quot;</li>
                            <li>&quot;Use Martingale fator 2 com stop loss de $50&quot;</li>
                          </>
                        ) : mode === 'advanced' ? (
                          <>
                            <li>&quot;Contar dígitos nos últimos 10 ticks, operar no mais frequente&quot;</li>
                            <li>&quot;Só operar se os 2 últimos dígitos forem diferentes entre si&quot;</li>
                            <li>&quot;Se dígito 3 apareceu 3+ vezes nos últimos 10, entrar DIGITDIFF 3&quot;</li>
                          </>
                        ) : (
                          <>
                            <li>&quot;Quais foram os últimos 25 dígitos?&quot;</li>
                            <li>&quot;Como está o RSI agora?&quot;</li>
                            <li>&quot;Qual o dígito com maior e menor probabilidade?&quot;</li>
                          </>
                        )}
                    </ul>
                </div>
                {mode === 'advanced' && advancedRulesLoaded && (
                  <div className="mt-3 text-xs bg-green-900/30 border border-green-700/40 text-green-400 px-3 py-2 rounded-lg">
                    Regras avançadas carregadas. Clique em INICIAR para começar.
                  </div>
                )}
            </div>
        )}
        
        {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-800 text-gray-200 rounded-bl-none'
                }`}>
                    {msg.content}
                </div>
            </div>
        ))}
        
        {isProcessing && (
            <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg p-3 rounded-bl-none flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                    {progressMessage && (
                      <span className="text-xs text-gray-300 ml-2">{progressMessage}</span>
                    )}
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
  
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 flex gap-2">
       
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            const next = e.target.value;
            setInput(next);
            if (draftStorageKey) {
              try {
                localStorage.setItem(draftStorageKey, next);
              } catch {
              }
            }
          }}
          onKeyDown={(e) => {
            if (mode === 'chat') {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
              }
              return;
            }

            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-[#0d0a18] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder:text-xs focus:border-blue-500 outline-none min-h-[100px] overflow-y-hidden resize-none"
          disabled={isProcessing}
        />
        <button
                type="button"
                title="Limpar Chat"
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                onClick={clearChat}
                disabled={messages.length === 0 || isProcessing}
              >
                <DeleteIcon className="w-5 h-5" />
              </button>
        <button 
            type="submit"
            disabled={(!input.trim()) || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
        >
            <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
      </>
      )}
      {mode === 'config' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className="flex justify-between items-center">
            <h4 className="text-white font-semibold">Parâmetros da Estratégia</h4>
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white"
              onClick={() => setShowJsonModal(true)}
              disabled={!configRules}
            >
              🔍 Ver JSON
            </button>
          </div>
          {!configRules && (
            <div className="text-sm text-gray-400">
              Nenhum parâmetro disponível.
            </div>
          )}
          {configRules && Object.keys(groupedParameters).length === 0 && (
            <div className="text-sm text-gray-400">
              Nenhum parâmetro disponível.
            </div>
          )}
          {configRules && Object.keys(groupedParameters).sort().map((groupKey) => {
            const groupParams = groupedParameters[groupKey];
            const ruleText = getGroupRuleText(groupKey);
            const groupMatch = groupKey.match(/Grupo (\d+)/);
            const groupNum = groupMatch ? parseInt(groupMatch[1], 10) : 1;
            const activationConfig = getGroupActivationConfig(groupNum);
            const isDropdownOpen = openDropdownGroup === groupKey;
            return (
              <div key={groupKey} className="border border-gray-800 rounded-lg p-3 bg-[#0d0a18] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="relative" ref={isDropdownOpen ? dropdownContainerRef : undefined}>
                      <button
                        type="button"
                        className="text-gray-400  hover:text-white text-xs px-1 py-0.5 rounded hover:bg-gray-700 transition-colors"
                        title="Configurar ativação deste grupo"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownGroup(isDropdownOpen ? null : groupKey);
                        }}
                      >
                        ▼
                      </button>
                      {isDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1 z-50 bg-[#1e1b2e] border border-gray-700 rounded-lg shadow-xl p-3 w-[200px]">
                          <div className="text-xs text-gray-300 font-semibold mb-2">Ativar este grupo em:</div>
                          <div className="space-y-1.5">
                            {/* Iniciar (Full Width) */}
                            <label className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer py-1">
                                <input
                                type="checkbox"
                                checked={activationConfig['initial']}
                                onChange={(e) => handleGroupActivationChange(groupNum, 'initial', e.target.checked)}
                                className="accent-blue-500 w-3.5 h-3.5"
                                />
                                <span>🚀 Iniciar</span>
                            </label>

                            <div className="border-t border-gray-700 my-1.5" />

                            {/* Grid 2x2 para os demais */}
                            <div className="grid grid-cols-2 gap-x-2 mt-2 gap-y-2">
                                {([
                                    { key: 'winReal', label: 'Win Real' },
                                    { key: 'lossReal', label: 'Loss Real' },
                                    { key: 'winSimulated', label: 'Win Sim' },
                                    { key: 'lossSimulated', label: 'Loss Sim' },
                                ] as const).map((option) => (
                                    <label key={option.key} className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={activationConfig[option.key]}
                                            onChange={(e) => handleGroupActivationChange(groupNum, option.key, e.target.checked)}
                                            className="accent-blue-500 w-3.5 h-3.5"
                                        />
                                        <span className="whitespace-nowrap">{option.label}</span>
                                    </label>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-white font-semibold">{groupKey}</div>
                  </div>
                  {ruleText && (
                    <div className="text-xs text-gray-400">{ruleText}</div>
                  )}
                </div>
                <div className="space-y-2">
                  {groupParams.map((param: any) => {
                    const isPattern = param.type === 'text' && param.validation === 'pattern';
                    const isArray = param.isArray;
                    const inputType = isPattern || isArray ? 'text' : (param.type || 'text');
                    const inputValue = isArray ? String(param.value ?? '') : String(param.value ?? '');
                    return (
                      <div key={param.key} className="flex flex-row gap-1 items-center">
                        <label className="text-xs text-gray-300 w-1/4">{param.label || param.key}</label>
                        <input
                          type={inputType}
                          value={inputValue}
                          onChange={(e) => handleParameterChange(param, e.target.value)}
                          className="w-full bg-[#13111c] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                          placeholder={isPattern ? 'Ex: XXOX' : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {showJsonModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
              onClick={() => setShowJsonModal(false)}
            >
              <div
                className="w-full max-w-3xl bg-[#0d0a18] border border-gray-700 rounded-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#13111c]">
                  <div className="text-sm font-semibold text-white">JSON da Estratégia</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(configRules, null, 2))}
                      className="text-xs text-white bg-blue-600 hover:bg-blue-500 rounded px-3 py-1.5"
                      disabled={!configRules}
                    >
                      Copiar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowJsonModal(false)}
                      className="text-xs text-gray-200 bg-gray-700 hover:bg-gray-600 rounded px-3 py-1.5"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <textarea
                    value={configRules ? JSON.stringify(configRules, null, 2) : 'Nenhum JSON disponível.'}
                    readOnly
                    className="w-full h-[60vh] bg-[#0b0913] border border-gray-700 rounded p-3 text-xs text-gray-200 font-mono outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showExamplesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowExamplesModal(false)}
        >
          <div
            className="w-full max-w-3xl !h-[70vh] !min-h-[70vh] !max-h-[70vh] bg-[#0d0a18] border border-gray-700 rounded-lg overflow-hidden flex flex-col"
            style={{ height: '70vh', minHeight: '70vh', maxHeight: '70vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#13111c]">
              <div className="text-sm font-semibold text-white">{mode === 'advanced' ? 'Modelos de Estratégias Avançadas' : 'Modelos de Estratégias'}</div>
              <button
                type="button"
                onClick={() => setShowExamplesModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {[
                ...(mode === 'advanced' ? [
                  {
                    title: '🧠 Frequência de Dígitos',
                    items: [
                      { label: 'Dígito dominante com confiança', code: 'Nos últimos 15 ticks, se um dígito apareceu 5 vezes ou mais, aposte que ele vai aparecer novamente' },
                      { label: 'Dígito saturado — apostar contra', code: 'Se o dígito mais frequente nos últimos 10 ticks apareceu 4 ou mais vezes, aposte que o próximo será DIFERENTE dele' },
                      { label: 'Dígito em falta', code: 'Se o dígito 9 não apareceu nos últimos 10 ticks, aposte que ele vai aparecer agora' },
                      { label: 'Dígito raro — apostar na aparição', code: 'Se o dígito 3 não apareceu nos últimos 12 ticks, aposte DIGITMATCH 3' },
                    ],
                  },
                  {
                    title: '🧠 Sequências e Repetições',
                    items: [
                      { label: 'Quebra de sequência', code: 'Se os últimos 3 dígitos são iguais, aposte que o próximo será diferente' },
                      { label: 'Alternância confirmada', code: 'Se os últimos 2 dígitos são diferentes entre si, e o dígito mais frequente nos últimos 10 apareceu 3 ou mais vezes, aposte nesse dígito mais frequente' },
                      { label: 'Série longa — reversão', code: 'Se o mesmo dígito se repetiu 4 vezes consecutivas, aposte em DIFERENTE dele' },
                      { label: 'Repetição curta', code: 'Se os últimos 2 dígitos são iguais, aposte que o próximo será diferente' },
                    ],
                  },
                  {
                    title: '🧠 Par / Ímpar',
                    items: [
                      { label: 'Após sequência par — apostar ímpar', code: 'Se os últimos 2 dígitos foram pares, aposte no próximo como ímpar' },
                      { label: 'Após sequência ímpar — apostar par', code: 'Se os últimos 3 dígitos foram ímpares, aposte em par' },
                    ],
                  },
                  {
                    title: '🧠 Faixas (Over/Under)',
                    items: [
                      { label: 'Dígitos baixos — apostar alto', code: 'Se os últimos 3 dígitos foram todos menores que 3, aposte DIGITOVER 5' },
                      { label: 'Pressão para cima', code: 'Se o dígito mais frequente nos últimos 10 é menor que 4, aposte DIGITOVER 4' },
                      { label: 'Dígitos altos — apostar baixo', code: 'Se os últimos 3 dígitos foram todos maiores que 6, aposte DIGITUNDER 4' },
                    ],
                  },
                  {
                    title: '🧠 Condições Compostas (AND + OR)',
                    items: [
                      { label: 'Dois critérios juntos', code: 'Os últimos 2 dígitos são diferentes E o dígito 7 não apareceu nos últimos 8 ticks — apostar DIGITMATCH 7' },
                      { label: 'Qualquer um de dois cenários', code: 'Se o dígito 0 apareceu 3 ou mais vezes nos últimos 10 ticks OU se houve 4 ou mais dígitos iguais consecutivos, aposte DIGITOVER 5' },
                      { label: 'Dois dígitos em falta', code: 'Se o dígito 3 não apareceu nos últimos 8 ticks OU o dígito 7 não apareceu nos últimos 8 ticks, aposte DIGITOVER 2' },
                    ],
                  },
                ] : [
                {
                  title: 'Regras de Dígitos',
                  items: [
                    { label: 'Últimos 3 dígitos maiores que 8', code: '* Entrar quando os ultimos 3 digitos > 8' },
                    { label: 'Sequência de dígitos pares', code: '* Entrar quando os ultimos 5 digitos forem todos pares' },
                    { label: 'Dígito específico', code: '* Entrar quando ultimo digito = 9' },
                  ],
                },
                {
                  title: 'Padrões de Dígitos (XO)',
                  items: [
                    { label: 'Padrão XXOX (3 iguais-diferente-igual)', code: '* Entrar quando o padrão dos digitos for XXOX' },
                    { label: 'Padrão XOXO (alternado)', code: '* Entrar quando o padrão dos digitos for XOXO' },
                    { label: 'Padrão XXXO (3 iguais + diferente)', code: '* Entrar quando o padrão dos digitos for XXXO' },
                    { label: 'Padrão OXXX (diferente + 3 iguais)', code: '* Entrar quando o padrão dos digitos for OXXX' },
                    { label: 'Padrão XOXOX (5 dígitos alternados)', code: '* Entrar quando o padrão dos digitos for XOXOX' },
                    { label: 'Padrão OXOXO (5 dígitos alternados)', code: '* Entrar quando o padrão dos digitos for OXOXO' },
                    { label: 'Padrão XXOO (2 iguais + 2 diferentes)', code: '* Entrar quando o padrão dos digitos for XXOO' },
                    { label: 'Padrão OOXX (2 diferentes + 2 iguais)', code: '* Entrar quando o padrão dos digitos for OOXX' },
                    { label: 'Padrão XXXXOO (4 iguais + 2 diferentes)', code: '* Entrar quando o padrão dos digitos for XXXXOO' },
                    { label: 'Padrão OOXXXX (2 diferentes + 4 iguais)', code: '* Entrar quando o padrão dos digitos for OOXXXX' },
                    { label: 'Padrão OOOOXXO (sequência complexa)', code: '* Entrar quando o padrão dos digitos for OOOOXXO' },
                  ],
                },
                {
                  title: 'Regras com RSI',
                  items: [
                    { label: 'RSI Sobrecomprado', code: '* Entrar quando RSI > 70' },
                    { label: 'RSI Sobrevendido', code: '* Entrar quando RSI < 30' },
                    { label: 'RSI entre níveis', code: '* Entrar quando RSI > 50 e RSI < 60' },
                  ],
                },
                {
                  title: 'Regras com SMA',
                  items: [
                    { label: 'Preço acima da média', code: '* Entrar quando preço > SMA 20' },
                    { label: 'Cruzamento de médias', code: '* Entrar quando SMA 10 > SMA 20' },
                    { label: 'SMA com suporte', code: '* Entrar quando SMA 14 > suporte' },
                  ],
                },
                {
                  title: 'Regras de Suporte e Resistência',
                  items: [
                    { label: 'Quebra de resistência', code: '* Entrar quando preço > resistencia' },
                    { label: 'Teste de suporte', code: '* Entrar quando preço < suporte' },
                    { label: 'Entre níveis', code: '* Entrar quando preço > suporte e preço < resistencia' },
                  ],
                },
                {
                  title: 'Regras com Percentuais',
                  items: [
                    { label: 'Variação percentual', code: '* Entrar quando os dígitos inferiores a 4 > 50%' },
                    { label: 'Dígitos ímpares', code: '* Entrar quando percentual de digitos impares > 60%' },
                    { label: 'Dígitos baixos', code: '* Entrar quando percentual de digitos abaixo de 3 > 40%' },
                  ],
                },
                {
                  title: 'Regras com Preço',
                  items: [
                    { label: 'Preço acima da resistência', code: '* Entrar quando ultimo tick > resistencia' },
                    { label: 'Movimento percentual', code: '* Entrar quando preco subiu 0.5%' },
                    { label: 'Sequência de dígitos', code: '* Entrar quando 3 ticks consecutivos subindo' },
                  ],
                },
                {
                  title: 'Trader Ambos (Múltiplas Entradas)',
                  items: [
                    { label: 'Entradas individuais', code: '* Entrar Higher quando RSI > 70, * Entrar Lower quando RSI < 30' },
                    { label: 'Entradas simultâneas', code: '* Entrar Higher e Lower quando preço > SMA 20 e RSI > 50' },
                    { label: 'Combinação complexa', code: '* Entrar quando ultimo digito > 7 e RSI > 60, * Entrar quando SMA 10 > SMA 20' },
                  ],
                },
                {
                  title: 'Estratégias Combinadas',
                  items: [
                    { label: 'Dígito + RSI', code: '* Entrar quando ultimo digito é par e RSI > 50' },
                    { label: 'Preço + Percentual', code: '* Entrar quando preço > 1.2400 e variação % > 0.3%' },
                    { label: 'Múltiplas condições', code: '* Entrar quando RSI > 70 e SMA(10) > SMA(20) e ultimo digito > 5' },
                  ],
                },
              ])].map((category) => (
                <div key={category.title} className="border border-gray-800 rounded-lg p-3 bg-[#13111c]">
                  <h4 className="text-sm font-semibold text-white mb-2">{category.title}</h4>
                  <div className="space-y-2">
                    {category.items.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        className="w-full text-left p-2 rounded bg-[#0d0a18] border border-gray-700 hover:border-blue-500 hover:bg-[#1a1730] transition-colors group"
                        onClick={() => {
                          setInput(item.code);
                          setShowExamplesModal(false);
                          onModeChange(mode === 'advanced' ? 'advanced' : 'strategy');
                        }}
                      >
                        <div className="text-xs font-medium text-gray-200 group-hover:text-white">{item.label}</div>
                        <code className="text-xs text-blue-400 mt-1 block">{item.code}</code>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 text-center pb-2">
                Clique em qualquer exemplo para aplicá-lo ao campo de estratégia.
              </p>
            </div>
          </div>
        </div>
      )}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-[#0d0a18] border border-gray-700 rounded-lg overflow-hidden flex flex-col"
            style={{ height: '75vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#13111c]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => historyFileInputRef.current?.click()}
                  className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                  title="Carregar regras de arquivo JSON"
                >
                  Carregar
                </button>
                <button
                  type="button"
                  onClick={clearAllHistory}
                  disabled={historyRules.length === 0}
                  className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  title="Limpar todo o histórico"
                >
                  Limpar
                </button>
              </div>
              <div className="text-sm font-semibold text-white">
                Histórico de Regras ({historyRules.length})
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {historyRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-2">
                  <div className="text-3xl">📝</div>
                  <div className="text-sm font-semibold text-gray-400">Nenhuma Regra Salva</div>
                  <p className="text-xs max-w-xs">
                    Você ainda não executou nenhuma estratégia. Quando iniciar o monitoramento, suas regras serão salvas automaticamente aqui.
                  </p>
                </div>
              ) : (
                historyRules.map((item, index) => {
                  const date = new Date(item.timestamp).toLocaleString('pt-BR');
                  const usageText = item.usageCount > 1 ? ` • Usada ${item.usageCount}x` : '';
                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 bg-[#13111c] cursor-pointer hover:border-blue-500 transition-colors ${item.hasJson ? 'border-blue-900/60' : 'border-gray-800'}`}
                      onClick={() => applyHistoryRule(item, false)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
                          {item.hasJson && (
                            <span className="text-yellow-400 text-xs" title="Tem JSON cached — monitoramento instantâneo">⚡</span>
                          )}
                          {item.loadedFromFile && (
                            <span className="text-xs text-gray-400" title="Carregada de arquivo">📁</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{date}{usageText}</span>
                      </div>
                      <div className="text-xs text-gray-300 mb-2 font-mono leading-relaxed">
                        {generateRulePreview(item.rule)}
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {item.hasJson && item.geminiJson ? (
                          <button
                            type="button"
                            className="text-xs px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors"
                            onClick={() => applyHistoryRule(item, true)}
                            title="Usar com JSON cached — sem re-tradução"
                          >
                            ⚡ Usar Instant
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-xs px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                            onClick={() => applyHistoryRule(item, false)}
                          >
                            Usar
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-red-900/60 hover:text-red-400 text-gray-400 transition-colors"
                          onClick={() => deleteHistoryRule(index)}
                          title="Remover esta regra"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {historyRules.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-800 bg-[#13111c]">
                <p className="text-xs text-gray-500">
                  Clique em qualquer regra para aplicá-la ao campo de estratégia.
                  {' '}Regras com ⚡ têm JSON cached para monitoramento instantâneo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      <input
        ref={historyFileInputRef}
        type="file"
        accept=".json"
        multiple
        className="hidden"
        onChange={handleHistoryFileLoad}
      />
      {showHelpModal && <HelpManualModal onClose={() => setShowHelpModal(false)} />}
    </div>
  );
}
