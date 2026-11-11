"use client";

import { DocumentChartBarIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { DerivService } from "@/app/services/DerivService";
import {
  breakdownBy,
  computeHistoryStats,
  contractDescription,
  equityCurve,
  fetchProfitTableRange,
  hourOfDay,
  normalizeTrade,
  type BreakdownRow,
  type EquityPoint,
  type HistoryStats,
  type HistoryTrade,
} from "./stats";

type DerivToken = { token: string; is_virtual: boolean; acct?: string; loginid?: string; cur?: string };
type ViewMode = "demo" | "real";
type Period = "today" | "7d" | "30d" | "90d" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "all", label: "Mais recentes (até 2000)" },
];

const DAY = 86400;
const PAGE_SIZE = 20;
const MAX_TRADES = 2000;

/** Epoch seconds where the period starts; undefined = no lower bound. */
const periodStart = (period: Period): number | undefined => {
  const now = Math.floor(Date.now() / 1000);
  switch (period) {
    case "today": {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      return Math.floor(midnight.getTime() / 1000);
    }
    case "7d":
      return now - 7 * DAY;
    case "30d":
      return now - 30 * DAY;
    case "90d":
      return now - 90 * DAY;
    default:
      return undefined;
  }
};

const formatMoney = (value: number, currency: string, signed = false) => {
  const text = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return signed && value > 0 ? `+${text}` : text;
};

const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const formatRatio = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const profitClass = (value: number) => (value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-gray-300");

const thClass = "px-4 py-3 text-left text-xs font-extrabold text-gray-400 uppercase tracking-wider whitespace-nowrap";
const tdClass = "px-4 py-3 whitespace-nowrap";

function Stat({ id, label, value, hint, valueClass = "" }: { id: string; label: string; value: string; hint?: string; valueClass?: string }) {
  return (
    <div data-testid={`stat-${id}`} className="rounded-lg bg-gray-800 p-4" title={hint}>
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

function StatsPanel({ stats, currency }: { stats: HistoryStats; currency: string }) {
  const streak = stats.currentStreak;
  return (
    <div data-testid="history-stats" className="mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat id="total" label="Operações" value={String(stats.total)} />
        <Stat id="win-rate" label="Taxa de acerto" value={formatPercent(stats.winRate)} hint={`${stats.wins} wins / ${stats.losses} losses`} />
        <Stat
          id="break-even"
          label="Acerto p/ empatar"
          value={formatPercent(stats.breakEvenWinRate)}
          hint="Taxa de acerto mínima para não perder dinheiro, dado o ganho e a perda médios"
          valueClass={
            stats.breakEvenWinRate === null ? "" : stats.winRate >= stats.breakEvenWinRate ? "text-green-500" : "text-red-500"
          }
        />
        <Stat id="profit" label="Lucro líquido" value={formatMoney(stats.profit, currency, true)} valueClass={profitClass(stats.profit)} />
        <Stat id="roi" label="ROI" value={formatPercent(stats.roi)} valueClass={profitClass(stats.roi)} />
        <Stat id="staked" label="Total investido" value={formatMoney(stats.staked, currency)} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat id="profit-factor" label="Fator de lucro" value={formatRatio(stats.profitFactor)} hint="Lucro bruto ÷ perda bruta. Acima de 1 = lucrativo" />
        <Stat id="expectancy" label="Média por operação" value={formatMoney(stats.expectancy, currency, true)} valueClass={profitClass(stats.expectancy)} />
        <Stat id="average-win" label="Ganho médio" value={formatMoney(stats.averageWin, currency)} valueClass="text-green-500" />
        <Stat id="average-loss" label="Perda média" value={formatMoney(stats.averageLoss, currency)} valueClass="text-red-500" />
        <Stat id="max-drawdown" label="Drawdown máximo" value={formatMoney(stats.maxDrawdown, currency)} hint="Maior queda do lucro acumulado a partir de um pico" />
        <Stat id="average-stake" label="Stake médio" value={formatMoney(stats.averageStake, currency)} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat id="max-win-streak" label="Maior sequência de wins" value={String(stats.maxWinStreak)} valueClass="text-green-500" />
        <Stat id="max-loss-streak" label="Maior sequência de losses" value={String(stats.maxLossStreak)} valueClass="text-red-500" />
        <Stat
          id="current-streak"
          label="Sequência atual"
          value={streak ? `${streak.length} ${streak.type === "won" ? "win" : "loss"}${streak.length > 1 ? (streak.type === "won" ? "s" : "es") : ""}` : "—"}
          valueClass={streak ? (streak.type === "won" ? "text-green-500" : "text-red-500") : ""}
        />
        <Stat
          id="extremes"
          label="Melhor / pior operação"
          value={`${formatMoney(stats.bestTrade, currency, true)} / ${formatMoney(stats.worstTrade, currency)}`}
        />
      </div>
    </div>
  );
}

const CHART_WIDTH = 800;
const CHART_HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 24, left: 64 };
const LINE_COLOR = "#818cf8"; // indigo-400, single series on the gray-800 surface

function EquityChart({ points, currency }: { points: EquityPoint[]; currency: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length < 2) return null;

  const values = [0, ...points.map((p) => p.cumulative)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = CHART_WIDTH - PAD.left - PAD.right;
  const innerH = CHART_HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const y = (v: number) => PAD.top + ((max - v) / span) * innerH;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`).join(" ");

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const svgX = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const ratio = (svgX - PAD.left) / innerW;
    setHover(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
  };

  const active = hover === null ? null : points[hover];

  return (
    <div className="mb-6 rounded-lg bg-gray-800 p-4">
      <h2 className="mb-2 text-sm font-bold uppercase text-gray-400">Lucro acumulado</h2>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="Lucro acumulado por operação"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {[max, 0, min].filter((v, i, all) => all.indexOf(v) === i).map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={CHART_WIDTH - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="#4b5563"
                strokeWidth={1}
                strokeDasharray={v === 0 ? "4 4" : undefined}
              />
              <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#9ca3af">
                {formatMoney(v, currency)}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={CHART_HEIGHT - 6} fontSize={11} fill="#9ca3af">
            #1
          </text>
          <text x={CHART_WIDTH - PAD.right} y={CHART_HEIGHT - 6} textAnchor="end" fontSize={11} fill="#9ca3af">
            #{points.length}
          </text>
          <path d={path} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" />
          {active && (
            <g>
              <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={CHART_HEIGHT - PAD.bottom} stroke="#9ca3af" strokeWidth={1} />
              <circle cx={x(hover!)} cy={y(active.cumulative)} r={4} fill={LINE_COLOR} stroke="#1f2937" strokeWidth={2} />
            </g>
          )}
        </svg>
        {active && (
          <div
            className="pointer-events-none absolute top-0 rounded-md bg-gray-900 px-3 py-2 text-xs text-gray-300 shadow-lg"
            style={{ left: `${(x(hover!) / CHART_WIDTH) * 100}%`, transform: hover! > points.length / 2 ? "translateX(-110%)" : "translateX(10%)" }}
          >
            <div className="font-bold">Operação #{active.index}</div>
            <div>{new Date(active.time * 1000).toLocaleString("pt-BR")}</div>
            <div>
              Resultado: <span className={profitClass(active.profit)}>{formatMoney(active.profit, currency, true)}</span>
            </div>
            <div>
              Acumulado: <span className={profitClass(active.cumulative)}>{formatMoney(active.cumulative, currency, true)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownTable({ title, rows, currency }: { title: string; rows: BreakdownRow[]; currency: string }) {
  return (
    <div className="rounded-lg bg-gray-800 p-4">
      <h2 className="mb-3 text-sm font-bold uppercase text-gray-400">{title}</h2>
      <div className="max-h-80 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="py-1 pr-3">Item</th>
              <th className="py-1 pr-3">Ops</th>
              <th className="py-1 pr-3">W / L</th>
              <th className="py-1 pr-3">Acerto</th>
              <th className="py-1 pr-3">Lucro</th>
              <th className="py-1">ROI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-700">
                <td className="py-1 pr-3 whitespace-nowrap">{row.key}</td>
                <td className="py-1 pr-3">{row.total}</td>
                <td className="py-1 pr-3 whitespace-nowrap">
                  <span className="text-green-500">{row.wins}</span> / <span className="text-red-500">{row.losses}</span>
                </td>
                <td className="py-1 pr-3">{formatPercent(row.winRate)}</td>
                <td className={`py-1 pr-3 whitespace-nowrap ${profitClass(row.profit)}`}>{formatMoney(row.profit, currency, true)}</td>
                <td className={`py-1 ${profitClass(row.roi)}`}>{formatPercent(row.roi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [trades, setTrades] = useState<HistoryTrade[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [period, setPeriod] = useState<Period>("7d");
  const [reloadKey, setReloadKey] = useState(0);

  const [demoToken, setDemoToken] = useState<DerivToken | null>(null);
  const [realToken, setRealToken] = useState<DerivToken | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("demo");

  // Carrega os tokens disponíveis (demo/real) e define o modo inicial
  // com base na conta ativa do DerivService.
  useEffect(() => {
    const deriv = DerivService.getInstance();
    const accounts = deriv.getStorageDerivAccount();
    const tokens: DerivToken[] = accounts?.[0]?.tokens || [];

    const demo = tokens.find((t) => t.is_virtual) || null;
    const real = tokens.find((t) => !t.is_virtual) || null;

    if (!demo && !real) {
      setError("Nenhuma conta Deriv conectada.");
      setLoading(false);
      return;
    }

    setDemoToken(demo);
    setRealToken(real);

    const activeToken = accounts?.[0]?.activeToken;
    const activeIsVirtual = tokens.find((t) => t.token === activeToken)?.is_virtual;
    setViewMode(activeIsVirtual === false && real ? "real" : demo ? "demo" : "real");
  }, []);

  const selected = viewMode === "demo" ? demoToken : realToken;
  const currency = selected?.cur || "USD";
  const account = selected?.acct || selected?.loginid || "";

  // Busca todo o profit_table do período da conta selecionada (demo ou real),
  // paginando, sem alterar a conta ativa de trade.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const deriv = DerivService.getInstance();
        const dateFrom = periodStart(period);
        const result = await fetchProfitTableRange(
          (limit, offset) =>
            deriv.getProfitTableForAccount(selected.token, limit, offset, dateFrom === undefined ? {} : { dateFrom }),
          { maxTrades: MAX_TRADES }
        );
        if (cancelled) return;
        setTrades(result.transactions.map(normalizeTrade).sort((a, b) => b.purchaseTime - a.purchaseTime));
        setTruncated(result.truncated);
        setVisible(PAGE_SIZE);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Erro ao buscar o histórico de operações.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selected, period, reloadKey]);

  const stats = useMemo(() => computeHistoryStats(trades), [trades]);
  const curve = useMemo(() => equityCurve(trades), [trades]);
  const bySymbol = useMemo(() => breakdownBy(trades, (t) => t.symbol), [trades]);
  const byContract = useMemo(() => breakdownBy(trades, (t) => contractDescription(t.contractType, t.barrier)), [trades]);
  const byHour = useMemo(
    () => breakdownBy(trades, (t) => `${hourOfDay(t)}h`, (a, b) => a.key.localeCompare(b.key)),
    [trades]
  );

  const switchMode = (mode: ViewMode) => {
    if (mode === viewMode) return;
    setTrades([]);
    setViewMode(mode);
  };

  return (
    <div className="bg-principal mx-auto max-w-[1500px] p-6 rounded-lg shadow-md text-gray-400">
      <h1 className="flex items-center gap-2 text-lg font-bold text-gray-400 mb-4">
        <DocumentChartBarIcon className="w-6 h-6" /> Histórico de Operações
      </h1>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => switchMode("real")}
          disabled={!realToken}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            viewMode === "real" ? "bg-blue-600 text-white shadow-md" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          } ${!realToken ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          Conta Real
        </button>
        <button
          onClick={() => switchMode("demo")}
          disabled={!demoToken}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            viewMode === "demo" ? "bg-yellow-500 text-black shadow-md" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          } ${!demoToken ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          Conta Demo
        </button>
        <label htmlFor="history-period" className="ml-auto text-xs uppercase text-gray-500">
          Período
        </label>
        <select
          id="history-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="p-2 rounded-md border border-gray-300 bg-gray-800 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-white text-lg">Carregando histórico de negociações...</p>
          </div>
        </div>
      ) : error ? (
        <div>
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="login-button flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            Tentar novamente
          </button>
        </div>
      ) : trades.length === 0 ? (
        <p>Nenhuma negociação encontrada no período.</p>
      ) : (
        <>
          {truncated && (
            <p className="mb-4 rounded-md bg-yellow-900/40 px-3 py-2 text-sm text-yellow-300">
              Mostrando as {MAX_TRADES} operações mais recentes do período. Escolha um período menor para analisar tudo.
            </p>
          )}

          <StatsPanel stats={stats} currency={currency} />
          <EquityChart points={curve} currency={currency} />

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <BreakdownTable title="Por ativo" rows={bySymbol} currency={currency} />
            <BreakdownTable title="Por contrato" rows={byContract} currency={currency} />
            <BreakdownTable title="Por hora do dia" rows={byHour} currency={currency} />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-500 text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className={thClass}>ID da Transação</th>
                  <th className={thClass}>Contrato</th>
                  <th className={thClass}>Símbolo</th>
                  <th className={thClass}>Conta</th>
                  <th className={thClass}>Dt. Operação</th>
                  <th className={thClass}>Entrada</th>
                  <th className={thClass}>Retorno</th>
                  <th className={thClass}>Lucro</th>
                  <th className={thClass}>Resultado</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-slate-500">
                {trades.slice(0, visible).map((trade) => (
                  <tr key={trade.transactionId} data-testid={`history-row-${trade.transactionId}`} title={trade.longcode ?? undefined}>
                    <td className={tdClass}>{trade.transactionId}</td>
                    <td className={tdClass}>{contractDescription(trade.contractType, trade.barrier)}</td>
                    <td className={tdClass}>{trade.symbol}</td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        {account}
                        {viewMode === "demo" ? (
                          <span className="bg-yellow-500 text-black text-xs font-medium py-0.5 px-2 rounded-full">Virtual</span>
                        ) : (
                          <span className="bg-blue-600 text-white text-xs font-medium py-0.5 px-2 rounded-full">Real</span>
                        )}
                      </div>
                    </td>
                    <td className={tdClass}>{new Date(trade.purchaseTime * 1000).toLocaleString("pt-BR")}</td>
                    <td className={tdClass}>{formatMoney(trade.stake, currency)}</td>
                    <td className={tdClass}>{formatMoney(trade.sellPrice, currency)}</td>
                    <td data-testid="trade-profit" className={`${tdClass} font-medium ${profitClass(trade.profit)}`}>
                      {formatMoney(trade.profit, currency, true)}
                    </td>
                    <td className={tdClass}>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${trade.won ? "bg-green-600" : "bg-red-600"}`}
                      >
                        {trade.won ? "Win" : "Loss"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visible < trades.length && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="login-button flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500"
              >
                + Carregar Mais ({trades.length - visible} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
