'use client';
import { XMarkIcon } from '@heroicons/react/16/solid';
import { useCallback, useEffect, useState } from 'react';

interface SharedRule {
  id: number;
  title: string;
  ruleText: string;
  isAdvanced: boolean;
  usageCount: number;
  createdAt: string;
  user: { name: string };
}

interface SharedRulesModalProps {
  onClose: () => void;
  onUseRule: (ruleText: string, isAdvanced: boolean) => void;
  currentMode: 'advanced' | 'chat' | 'config' | 'strategy';
  currentInput?: string;
}

export default function SharedRulesModal({
  onClose,
  onUseRule,
  currentMode,
  currentInput = '',
}: SharedRulesModalProps) {
  const [tab, setTab] = useState<'explore' | 'share'>('explore');
  const [rules, setRules] = useState<SharedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [title, setTitle] = useState('');
  const [ruleText, setRuleText] = useState(currentInput);
  const [isAdvanced, setIsAdvanced] = useState(currentMode === 'advanced');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const currentUserId = (() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId as number;
    } catch {
      return null;
    }
  })();

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shared-rules');
      if (res.ok) setRules(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleUse = async (rule: SharedRule) => {
    try {
      await fetch('/api/shared-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id }),
      });
    } catch { /* ignore */ }
    onUseRule(rule.ruleText, rule.isAdvanced);
  };

  const handleDelete = async (rule: SharedRule) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    setDeletingId(rule.id);
    try {
      const res = await fetch('/api/shared-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: rule.id }),
      });
      if (res.ok) setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch { /* ignore */ }
    setDeletingId(null);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !ruleText.trim()) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      setSubmitMsg({ type: 'err', text: 'Faça login para compartilhar estratégias.' });
      return;
    }

    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch('/api/shared-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, ruleText, isAdvanced }),
      });
      if (res.ok) {
        setSubmitMsg({ type: 'ok', text: 'Estratégia compartilhada com sucesso!' });
        setTitle('');
        setRuleText('');
        await fetchRules();
      } else {
        const data = await res.json();
        setSubmitMsg({ type: 'err', text: data.message || 'Erro ao compartilhar.' });
      }
    } catch {
      setSubmitMsg({ type: 'err', text: 'Erro de conexão.' });
    }
    setSubmitting(false);
  };

  const filtered = rules.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.ruleText.toLowerCase().includes(q);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#0d0a18] border border-gray-700 rounded-lg overflow-hidden flex flex-col"
        style={{ height: '82vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-700 bg-[#13111c] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">🌐 Estratégias da Comunidade</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[#0d0a18] border border-gray-700 rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setTab('explore')}
                className={`px-3 py-1 text-xs rounded transition-colors ${tab === 'explore' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Explorar {!loading && `(${rules.length})`}
              </button>
              <button
                type="button"
                onClick={() => { setTab('share'); setSubmitMsg(null); }}
                className={`px-3 py-1 text-xs rounded transition-colors ${tab === 'share' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                + Compartilhar
              </button>
            </div>
          </div>

          {tab === 'explore' && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar estratégias..."
              className="w-full bg-[#0b0913] border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 outline-none"
            />
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {/* ─── EXPLORE TAB ─── */}
          {tab === 'explore' && (
            <>
              {loading && (
                <div className="text-center text-gray-500 py-12 text-sm">Carregando...</div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                  <div className="text-4xl">{search ? '🔍' : '🌱'}</div>
                  <p className="text-sm text-gray-400 font-medium">
                    {search ? 'Nenhuma estratégia encontrada.' : 'Nenhuma estratégia compartilhada ainda.'}
                  </p>
                  {!search && (
                    <p className="text-xs text-gray-600">
                      Clique em &quot;+ Compartilhar&quot; e seja o primeiro a contribuir!
                    </p>
                  )}
                </div>
              )}
              {!loading && filtered.map((rule) => (
                <div
                  key={rule.id}
                  className="border border-gray-800 rounded-lg p-3 bg-[#13111c] hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-sm font-semibold text-white truncate">{rule.title}</span>
                      {rule.isAdvanced ? (
                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-700/40">
                          🧠 Avançado
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/40">
                          Estratégia
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {rule.usageCount > 0 && (
                        <span className="text-xs text-gray-500">
                          {rule.usageCount} uso{rule.usageCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUse(rule)}
                        className="text-xs px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors"
                      >
                        Usar
                      </button>
                      {currentUserId != null && rule.user && (
                        <button
                          type="button"
                          onClick={() => handleDelete(rule)}
                          disabled={deletingId === rule.id}
                          title="Excluir minha estratégia"
                          className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-red-900/60 hover:text-red-400 text-gray-500 transition-colors disabled:opacity-40"
                        >
                          {deletingId === rule.id ? '...' : '✕'}
                        </button>
                      )}
                    </div>
                  </div>

                  <pre className="text-xs text-gray-400 font-mono mb-2 whitespace-pre-wrap leading-relaxed line-clamp-3">
                    {rule.ruleText}
                  </pre>

                  <div className="text-xs text-gray-600">
                    por {rule.user?.name ?? 'Usuário'} •{' '}
                    {new Date(rule.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ─── SHARE TAB ─── */}
          {tab === 'share' && (
            <form onSubmit={handleShare} className="space-y-4 max-w-xl mx-auto pt-2">
              <div>
                <label className="block text-xs text-gray-300 mb-1.5 font-medium">
                  Título da estratégia <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Dígito dominante com alternância confirmada"
                  maxLength={200}
                  className="w-full bg-[#0b0913] border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-600 mt-1 text-right">{title.length}/200</p>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1.5 font-medium">Tipo</label>
                <div className="flex bg-[#0d0a18] border border-gray-700 rounded-lg p-1 w-fit gap-1">
                  {/* <button
                    type="button"
                    onClick={() => setIsAdvanced(false)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${!isAdvanced ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Estratégia padrão
                  </button> */}
                  <button
                    type="button"
                    onClick={() => setIsAdvanced(true)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${isAdvanced ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    🧠 Avançada
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1.5 font-medium">
                  Descrição da regra <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={ruleText}
                  onChange={(e) => setRuleText(e.target.value)}
                  placeholder={
                    isAdvanced
                      ? 'Ex: Se o dígito mais frequente nos últimos 10 ticks apareceu 4 ou mais vezes, aposte DIGITDIFF nesse dígito'
                      : 'Ex: * Entrar quando último dígito = 9 e RSI < 30'
                  }
                  rows={7}
                  className="w-full bg-[#0b0913] border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 outline-none resize-none font-mono"
                />
              </div>

              {submitMsg && (
                <div
                  className={`text-xs px-3 py-2 rounded border ${
                    submitMsg.type === 'ok'
                      ? 'bg-green-900/40 text-green-400 border-green-700/40'
                      : 'bg-red-900/40 text-red-400 border-red-700/40'
                  }`}
                >
                  {submitMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !title.trim() || !ruleText.trim()}
                className="w-full py-2.5 px-4 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {submitting ? 'Compartilhando...' : '🌐 Compartilhar com a comunidade'}
              </button>
              <p className="text-xs text-gray-600 text-center">
                Sua estratégia ficará visível para todos os usuários da plataforma.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
