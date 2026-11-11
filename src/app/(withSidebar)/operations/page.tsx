"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { redirect } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { getOperationFilterOptions, getOperations, getOperationsForExport } from "./actions";
import {
  contractLabel,
  isVirtualAccount,
  operationsToCsv,
  resolveOutcome,
  type BreakdownRow,
  type OperationFilters,
  type OutcomeFilter,
  type ReportSummary,
} from "./report";

type AuditTick = {
  epoch: number;
  tick: number;
  tick_display_value?: string;
  name?: string;
  flag?: string;
};

type ReportOperation = {
  id: number;
  operationId: string;
  contractId: string | null;
  transactionId: string | null;
  derivAccountId: string | null;
  account: string;
  operationDate: Date | string;
  deposit: number;
  result: number;
  outcome: string | null;
  payout: number | null;
  currency: string | null;
  symbol: string | null;
  contractType: string | null;
  barrier: string | null;
  entrySpot: string | null;
  exitSpot: string | null;
  exitDigit: number | null;
  purchaseTime: Date | string | null;
  expiryTime: Date | string | null;
  shortcode: string | null;
  audit: unknown;
  user: { id: number; name: string; email: string };
};

type DateRange = { from: string; to: string };

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_CURRENCY = "USD";

const inputClass =
  "w-full p-2 rounded-md border border-gray-300 bg-gray-800 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6";
const thClass = "px-4 py-3 text-left text-xs font-extrabold text-gray-400 uppercase whitespace-nowrap";
const tdClass = "px-4 py-3 whitespace-nowrap";

const formatMoney = (value: number | null | undefined, currency?: string | null) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: currency || DEFAULT_CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

const formatPercent = (value: number) =>
  `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const formatDateTime = (value?: Date | string | null) =>
  value ? new Date(value).toLocaleString("pt-BR") : "—";

const profitClass = (value: number) => (value > 0 ? "text-green-500" : "text-red-500");

// <input type="date"> gives a local calendar day; the server filters on absolute instants.
const dayStart = (day: string) => (day ? new Date(`${day}T00:00:00`).toISOString() : undefined);
const dayEnd = (day: string) => (day ? new Date(`${day}T23:59:59.999`).toISOString() : undefined);

const auditTicks = (audit: unknown): AuditTick[] => (Array.isArray(audit) ? (audit as AuditTick[]) : []);

function SummaryCard({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg bg-gray-800 p-4">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

function Summary({ summary }: { summary: ReportSummary }) {
  return (
    <div data-testid="operations-summary" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <SummaryCard label="Operações" value={String(summary.total)} />
      <SummaryCard label="Wins" value={String(summary.wins)} valueClass="text-green-500" />
      <SummaryCard label="Losses" value={String(summary.losses)} valueClass="text-red-500" />
      <SummaryCard label="Taxa de acerto" value={formatPercent(summary.winRate)} />
      <SummaryCard label="Total investido" value={formatMoney(summary.staked)} />
      <SummaryCard label="Lucro líquido" value={formatMoney(summary.profit)} valueClass={profitClass(summary.profit)} />
      <SummaryCard label="ROI" value={formatPercent(summary.roi)} valueClass={profitClass(summary.roi)} />
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  formatKey = (key) => key,
}: {
  title: string;
  rows: BreakdownRow[];
  formatKey?: (key: string) => string;
}) {
  return (
    <div className="rounded-lg bg-gray-800 p-4">
      <h2 className="mb-3 text-sm font-bold uppercase text-gray-400">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Sem dados para os filtros atuais.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="py-1 pr-4">Item</th>
                <th className="py-1 pr-4">Ops</th>
                <th className="py-1 pr-4">W / L</th>
                <th className="py-1 pr-4">Acerto</th>
                <th className="py-1 pr-4">Investido</th>
                <th className="py-1 pr-4">Lucro</th>
                <th className="py-1">ROI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-slate-700">
                  <td className="py-1 pr-4">{formatKey(row.key)}</td>
                  <td className="py-1 pr-4">{row.total}</td>
                  <td className="py-1 pr-4">
                    <span className="text-green-500">{row.wins}</span> /{" "}
                    <span className="text-red-500">{row.losses}</span>
                  </td>
                  <td className="py-1 pr-4">{formatPercent(row.winRate)}</td>
                  <td className="py-1 pr-4">{formatMoney(row.staked)}</td>
                  <td className={`py-1 pr-4 ${profitClass(row.profit)}`}>{formatMoney(row.profit)}</td>
                  <td className={`py-1 ${profitClass(row.roi)}`}>{formatPercent(row.roi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="break-all text-gray-300">{value ?? "—"}</dd>
    </div>
  );
}

function OperationDetails({ op }: { op: ReportOperation }) {
  const ticks = auditTicks(op.audit);
  return (
    <div data-testid={`operation-details-${op.id}`} className="grid gap-6 p-4 lg:grid-cols-2">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Detail label="ID Contrato" value={op.contractId ?? op.operationId} />
        <Detail label="ID Transação" value={op.transactionId} />
        <Detail label="Conta Deriv" value={op.derivAccountId} />
        <Detail label="E-mail do usuário" value={op.user.email} />
        <Detail label="Compra" value={formatDateTime(op.purchaseTime)} />
        <Detail label="Expiração" value={formatDateTime(op.expiryTime)} />
        <Detail label="Registrado em" value={formatDateTime(op.operationDate)} />
        <Detail label="Payout" value={formatMoney(op.payout, op.currency)} />
        <Detail label="Spot entrada" value={op.entrySpot} />
        <Detail label="Spot saída" value={op.exitSpot} />
        <div className="col-span-2">
          <Detail label="Shortcode" value={op.shortcode} />
        </div>
      </dl>

      <div>
        <h3 className="mb-2 text-xs uppercase text-gray-500">Ticks da auditoria</h3>
        {ticks.length === 0 ? (
          <p className="text-sm text-gray-500">Sem ticks registrados.</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {ticks.map((tick) => {
              const display = tick.tick_display_value ?? String(tick.tick);
              return (
                <li key={tick.epoch} className="flex items-center gap-3">
                  <span className="w-20 text-gray-500">
                    {new Date(tick.epoch * 1000).toLocaleTimeString("pt-BR")}
                  </span>
                  <span className="font-mono">
                    {display.slice(0, -1)}
                    <span className="font-bold text-yellow-400">{display.slice(-1)}</span>
                  </span>
                  {tick.name && <span className="text-xs text-blue-400">{tick.name}</span>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export default function OperationsPage() {
  const [operations, setOperations] = useState<ReportOperation[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [bySymbol, setBySymbol] = useState<BreakdownRow[]>([]);
  const [byContractType, setByContractType] = useState<BreakdownRow[]>([]);
  const [options, setOptions] = useState<{ symbols: string[]; contractTypes: string[] }>({
    symbols: [],
    contractTypes: [],
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dates, setDates] = useState<DateRange>({ from: "", to: "" });
  const [symbol, setSymbol] = useState("");
  const [contractType, setContractType] = useState("");
  const [outcome, setOutcome] = useState<OutcomeFilter>("");
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Ignores responses from requests superseded by a newer filter change.
  const requestIdRef = useRef(0);

  const filters: OperationFilters = {
    search,
    from: dayStart(dates.from),
    to: dayEnd(dates.to),
    symbol,
    contractType,
    outcome,
  };

  const token = () => localStorage.getItem("access_token") || "";

  const loadOperations = async (reset = false) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const result = await getOperations(filters, reset ? 0 : operations.length, itemsPerPage, token());
    if (requestId !== requestIdRef.current) return;

    if (result.error) {
      redirect("/home");
    }

    const page = result.operations as unknown as ReportOperation[];
    const loaded = reset ? page.length : operations.length + page.length;
    setOperations((prev) => (reset ? page : [...prev, ...page]));
    setHasMore(loaded < result.total);
    setSummary(result.summary);
    setBySymbol(result.bySymbol);
    setByContractType(result.byContractType);
    setLoading(false);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await getOperationsForExport(filters, token());
      if (result.error) return;
      const csv = operationsToCsv(result.operations as unknown as ReportOperation[]);
      // BOM so Excel reads the file as UTF-8 (accents in names and headers).
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `operacoes-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    getOperationFilterOptions(token()).then(setOptions);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setExpandedId(null);
    loadOperations(true);
  }, [search, dates, symbol, contractType, outcome, itemsPerPage]);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setDates({ from: "", to: "" });
    setSymbol("");
    setContractType("");
    setOutcome("");
  };

  return (
    <div className="bg-principal mx-auto max-w-[1500px] p-6 rounded-lg shadow-md text-gray-400">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-lg font-bold text-gray-400">
          <DocumentTextIcon className="w-6 h-6" /> Operações
        </h1>
        <button
          onClick={exportCsv}
          disabled={exporting || !summary?.total}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          {exporting ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 items-end">
        <div className="sm:col-span-2">
          <label htmlFor="op-search" className="mb-1 block text-xs uppercase text-gray-500">
            Busca
          </label>
          <input
            id="op-search"
            type="text"
            placeholder="Buscar por conta, contrato ou usuário..."
            className={inputClass}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="op-from" className="mb-1 block text-xs uppercase text-gray-500">
            De
          </label>
          <input
            id="op-from"
            type="date"
            className={inputClass}
            value={dates.from}
            onChange={(e) => setDates((prev) => ({ ...prev, from: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="op-to" className="mb-1 block text-xs uppercase text-gray-500">
            Até
          </label>
          <input
            id="op-to"
            type="date"
            className={inputClass}
            value={dates.to}
            onChange={(e) => setDates((prev) => ({ ...prev, to: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="op-symbol" className="mb-1 block text-xs uppercase text-gray-500">
            Ativo
          </label>
          <select id="op-symbol" className={inputClass} value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            <option value="">Todos</option>
            {options.symbols.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="op-contract" className="mb-1 block text-xs uppercase text-gray-500">
            Contrato
          </label>
          <select
            id="op-contract"
            className={inputClass}
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
          >
            <option value="">Todos</option>
            {options.contractTypes.map((value) => (
              <option key={value} value={value}>
                {contractLabel(value, null)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="op-outcome" className="mb-1 block text-xs uppercase text-gray-500">
            Resultado
          </label>
          <select
            id="op-outcome"
            className={inputClass}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as OutcomeFilter)}
          >
            <option value="">Todos</option>
            <option value="won">Win</option>
            <option value="lost">Loss</option>
          </select>
        </div>
        <div className="flex gap-2">
          <select
            aria-label="Itens por página"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className={inputClass}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button onClick={clearFilters} className="whitespace-nowrap rounded-md border border-gray-500 px-3 text-sm hover:bg-gray-700">
            Limpar
          </button>
        </div>
      </div>

      {summary && <Summary summary={summary} />}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <BreakdownTable title="Por ativo" rows={bySymbol} />
        <BreakdownTable
          title="Por tipo de contrato"
          rows={byContractType}
          formatKey={(key) => (key === "Sem dado" ? key : contractLabel(key, null))}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-500 text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className={thClass} />
              <th className={thClass}>Data</th>
              <th className={thClass}>Usuário</th>
              <th className={thClass}>Conta</th>
              <th className={thClass}>Ativo</th>
              <th className={thClass}>Contrato</th>
              <th className={thClass}>Stake</th>
              <th className={thClass}>Payout</th>
              <th className={thClass}>Lucro</th>
              <th className={thClass}>Dígito saída</th>
              <th className={thClass}>Resultado</th>
              <th className={thClass}>ID Contrato</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-slate-500">
            {operations.length === 0 && !loading && (
              <tr>
                <td colSpan={12} className="px-4 py-6 text-center text-gray-500">
                  Nenhuma operação encontrada.
                </td>
              </tr>
            )}
            {operations.map((op) => {
              const expanded = expandedId === op.id;
              const won = resolveOutcome(op) === "won";
              return (
                <Fragment key={op.id}>
                  <tr
                    data-testid={`operation-row-${op.id}`}
                    onClick={() => setExpandedId(expanded ? null : op.id)}
                    className="cursor-pointer hover:bg-gray-700"
                  >
                    <td className={tdClass}>
                      {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                    </td>
                    <td className={tdClass}>{formatDateTime(op.purchaseTime ?? op.operationDate)}</td>
                    <td className={tdClass}>{op.user.name}</td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        {op.account}
                        {isVirtualAccount(op.account) ? (
                          <span className="bg-yellow-500 text-black text-xs font-medium py-0.5 px-2 rounded-full">
                            Virtual
                          </span>
                        ) : (
                          <span className="bg-blue-600 text-white text-xs font-medium py-0.5 px-2 rounded-full">
                            Real
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={tdClass}>{op.symbol ?? "—"}</td>
                    <td className={tdClass}>{contractLabel(op.contractType, op.barrier)}</td>
                    <td className={tdClass}>{formatMoney(op.deposit, op.currency)}</td>
                    <td className={tdClass}>{formatMoney(op.payout, op.currency)}</td>
                    <td className={`${tdClass} font-medium ${profitClass(op.result)}`}>
                      {formatMoney(op.result, op.currency)}
                    </td>
                    <td className={`${tdClass} text-center font-mono`}>{op.exitDigit ?? "—"}</td>
                    <td className={tdClass}>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          won ? "bg-green-600 text-white" : "bg-red-600 text-white"
                        }`}
                      >
                        {won ? "Win" : "Loss"}
                      </span>
                    </td>
                    <td className={`${tdClass} font-mono text-xs`}>{op.contractId ?? op.operationId}</td>
                  </tr>
                  {expanded && (
                    <tr className="bg-gray-900">
                      <td colSpan={12}>
                        <OperationDetails op={op} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => loadOperations()}
            disabled={loading}
            className="login-button flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {loading ? "Carregando..." : "Mostrar mais"}
          </button>
        </div>
      )}
    </div>
  );
}
