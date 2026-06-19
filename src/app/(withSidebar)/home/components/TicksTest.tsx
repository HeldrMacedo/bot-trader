"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
import TicksGraph from "./TicksGraph";
import Authentication, { AuthenticationHandle } from "./Authentication";
import { ChevronDownIcon, CpuChipIcon } from "@heroicons/react/16/solid";
import BuyTable from "./buyTable";
import {
  DerivService,
  AccountInfo,
  TokenData,
} from "@/app/services/DerivService";
import { getUser } from "@/app/services/userService";

interface AccountSelectorProps {
  onAccountChange: (accountInfo: any) => void;
}

const SYMBOLS = [
  "R_100",
  "R_75",
  "R_50",
  "R_25",
  "R_10",
  "RDBEAR",
  "RDBULL",
  "JD10",
  "JD25",
  "JD50",
  "JD75",
  "JD100",
] as const;

const MAX_VISIBLE_TICKS = 40;
const TICK_BUFFER_SIZE = 100; // margem para gráficos, mas muito menor que 500

const SYMBOL_LABELS: Record<string, string> = {
  RDBEAR: "Bear Market Index",
  RDBULL: "Bull Market Index",
  JD10: "Jump 10 Index",
  JD25: "Jump 25 Index",
  JD50: "Jump 50 Index",
  JD75: "Jump 75 Index",
  JD100: "Jump 100 Index",
};

function getSymbolLabel(symbol: string): string {
  return SYMBOL_LABELS[symbol] || `Índice de volatilidade ${symbol.split("_")[1]}`;
}

function getDecimalPlaces(symbol: string): number {
  if (symbol === "R_100") return 2;
  if (symbol === "R_25" || symbol === "R_10") return 3;
  if (symbol === "RDBEAR" || symbol === "RDBULL") return 4;
  if (symbol.startsWith("JD")) return 2;
  return 4;
}

function extractDigit(quote: number, symbol: string): number {
  return parseInt(quote.toFixed(getDecimalPlaces(symbol)).toString().slice(-1));
}

// Componente memoizado para cada linha de símbolo - só re-renderiza quando seus props mudam
const SymbolRow = memo(function SymbolRow({
  symbol,
  digits,
  isSelected,
  onSelect,
  hoveredTradeType,
  activeDigit,
}: {
  symbol: string;
  digits: number[];
  isSelected: boolean;
  onSelect: (symbol: string) => void;
  hoveredTradeType: "above" | "below" | "even" | "odd" | "diff" | null;
  activeDigit: number | null;
}) {
  const visibleDigits = digits.slice(-MAX_VISIBLE_TICKS);
  const textColor = isSelected ? "#FFF" : "oklch(92.9% 0.013 255.508)";

  return (
    <div
      onClick={() => onSelect(symbol)}
      className="relative flex flex-col min-w-0 wrap-break-word mb-1 p-2 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
      style={{
        cursor: "pointer",
        border: isSelected ? "1px solid #111827" : "",
        borderColor: isSelected ? "#d1d5db" : "",
        color: textColor,
      }}
    >
      <div className="flex-auto flex-col px-3">
        <div className="flex mb-1 items-center justify-start text-sm">
          <span>{getSymbolLabel(symbol)}</span>
        </div>
        <div className="mx-auto overflow-hidden w-full">
          <div
            className="flex justify-end"
            style={{ transition: "transform 0.2s" }}
          >
            {visibleDigits.map((digit, index) => {
              const shouldHighlight =
                activeDigit !== null &&
                ((hoveredTradeType === "above" && digit > activeDigit) ||
                  (hoveredTradeType === "below" && digit < activeDigit) ||
                  (hoveredTradeType === "even" && digit % 2 === 0) ||
                  (hoveredTradeType === "odd" && digit % 2 !== 0) ||
                  (hoveredTradeType === "diff" && digit !== activeDigit));

              return (
                <div
                  key={index}
                  className={`px-1 py-mx-[1px] text-[12px] border ${shouldHighlight
                    ? "bg-slate-500 text-gray-800 border-slate-500"
                    : "bg-[#454a58] text-[oklch(92.9% 0.013 255.508)] border-gray-500"
                    }`}
                  style={{ color: textColor }}
                >
                  {digit}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

const INITIAL_TICKS: Record<string, number[]> = {};
for (const s of SYMBOLS) INITIAL_TICKS[s] = [];

export const TicksTest = () => {
  const [ticks, setTicks] = useState<Record<string, number[]>>(INITIAL_TICKS);
  const [volatility, setVolatility] = useState("R_100");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const authenticationRef = useRef<AuthenticationHandle>(null);
  const [valorEntrada, setValorEntrada] = useState("");
  const [valorReal, setValorReal] = useState("0.00");
  const [multiplicador, setMultiplicador] = useState(1);
  const deriv = DerivService.getInstance();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<string>("");
  const [hoveredTradeType, setHoveredTradeType] = useState<
    "above" | "below" | "even" | "odd" | "diff" | null
  >(null);
  const [activeDigit, setActiveDigit] = useState<number | null>(null);
  const [isVirtual, setIsVirtual] = useState(true);

  useEffect(() => {
    const savedAccounts = localStorage.getItem("deriv_accounts");
    if (savedAccounts) {
      const accounts: AccountInfo[] = JSON.parse(savedAccounts);
      if (accounts.length > 0) {
        setAccountInfo(accounts[0]);
      }
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const user = await getUser();
      if (!user) return;
      setUserData(user);
    } catch (error) {

    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    // @ts-ignore
    window.updateUserData = fetchUserData;

    return () => {
      // @ts-ignore
      delete window.updateUserData;
    };
  }, [fetchUserData]);

  useEffect(() => {
    if (accountInfo) {
      setValorEntrada(accountInfo.amount.toString());
    }
  }, [accountInfo?.amount]);

  useEffect(() => {
    const fethUser = async () => {
      const user = await getUser();

      if (!user) return;
      setUserData(user);
    };
    fethUser();

    const listener = deriv.observerInstance.on(
      "account.update",
      (newAccount: AccountInfo) => {
        setAccountInfo(newAccount);
      }
    );

    return () => deriv.observerInstance.removeById(listener);
  }, []);

  useEffect(() => {
    deriv.updateVolatility(volatility);
  }, [volatility]);

  const handleAccountChange = async (token: string) => {
    if (!accountInfo) return;

    setLoading(true);
    try {
      await deriv.switchAccount(token);
      const accounts = deriv.getStorageDerivAccount();
      if (accounts && accounts.length > 0) {
        setAccountInfo(accounts[0]);
        setValorEntrada(accounts[0].amount.toString());
        setIsVirtual(accounts[0].tokens.find((t) => t.token === token)?.is_virtual ?? true);
      }
    } catch (error) {
      console.error("Erro ao trocar de conta:", error);
    }
    setLoading(false);
  };

  const formatInputMoney = (value: string) => {
    let cleanedValue = value.replace(/[^0-9.]/g, "");
    const parts = cleanedValue.split(".");

    if (parts.length > 2) {
      cleanedValue = parts[0] + "." + parts.slice(1).join("");
    }

    setValorEntrada(cleanedValue);
    const numericValue = parseFloat(cleanedValue);
    if (!isNaN(numericValue) && accountInfo) {
      const updatedAccount = {
        ...accountInfo,
        amount: numericValue,
      };

      localStorage.setItem("deriv_accounts", JSON.stringify([updatedAccount]));
      deriv.setAccountData(updatedAccount);
    }

    const calculatedValue = (numericValue * multiplicador).toFixed(2);
    setValorReal(isNaN(numericValue) ? "0.00" : calculatedValue);
  };

  const handleLougout = () => {
    if (authenticationRef.current) {
      authenticationRef.current.handleLogout();
      localStorage.removeItem("token_list");
      window.location.reload();
    }
  };

  const handleMultiplicador = (value) => {
    setMultiplicador(value);
  };

  const labelContractType = (type) => {
    switch (type) {
      case "DIGITOVER":
        return "Acima";
      case "DIGITUNDER":
        return "Abaixo";
      case "DIGITEVEN":
        return "Par";
      case "DIGITODD":
        return "Ímpar";
    }
  };

  // Ref para acumular ticks entre frames — evita re-render a cada mensagem WebSocket
  const ticksBufferRef = useRef<Record<string, number[]>>({});
  const rafIdRef = useRef<number>(0);
  const pendingUpdateRef = useRef(false);
  // Armazena IDs de subscriptions para cancelar no cleanup
  const subscriptionIdsRef = useRef<string[]>([]);

  const flushTicksBuffer = useCallback(() => {
    pendingUpdateRef.current = false;
    const buffer = ticksBufferRef.current;
    if (Object.keys(buffer).length === 0) return;

    setTicks((prev) => {
      const next = { ...prev };
      for (const symbol in buffer) {
        next[symbol] = buffer[symbol];
      }
      return next;
    });
    ticksBufferRef.current = {};
  }, []);

  const scheduleFlush = useCallback(() => {
    if (!pendingUpdateRef.current) {
      pendingUpdateRef.current = true;
      rafIdRef.current = requestAnimationFrame(flushTicksBuffer);
    }
  }, [flushTicksBuffer]);

  // Busca histórico de ticks via ticks_history e se inscreve para updates via subscribe:1
  const fetchTicksHistory = useCallback(async (symbol: string) => {
    try {
      // Usa ticks_history com subscribe:1 para obter histórico + streaming em tempo real
      const response = await deriv.send({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: TICK_BUFFER_SIZE,
        end: "latest",
        style: "ticks",
        subscribe: 1,
      });

      // Processar histórico inicial da resposta
      if (response.history) {
        const { prices } = response.history;
        const digits = prices.map((price: number) => extractDigit(price, symbol));
        ticksBufferRef.current[symbol] = digits;
        scheduleFlush();
      }

      // Guardar subscription ID para cleanup
      if (response.subscription?.id) {
        subscriptionIdsRef.current.push(response.subscription.id);
      }
    } catch (error) {
      console.error(`Erro ao buscar ticks para ${symbol}:`, error);
    }
  }, [deriv, scheduleFlush]);

  useEffect(() => {
    formatInputMoney(valorEntrada);
  }, [multiplicador, valorEntrada]);

  // Efeito principal: busca histórico e escuta ticks em tempo real via DerivService
  useEffect(() => {
    let isMounted = true;

    const startTickSubscriptions = async () => {
      if (!isMounted) return;
      // Limpar subscriptions antigas (stale após reconnect)
      subscriptionIdsRef.current = [];
      // Buscar histórico + subscribe para cada símbolo
      for (const symbol of SYMBOLS) {
        if (!isMounted) return;
        await fetchTicksHistory(symbol);
      }
    };

    // Escutar evento "market.open" para saber quando a conexão está pronta
    // Também trata reconexões automáticas (a cada market.open, re-subscriba)
    const marketOpenListenerId = deriv.observerInstance.on("market.open", () => {
      startTickSubscriptions();
    });

    // Se já está conectado, iniciar imediatamente
    if (deriv.isMarketConnected) {
      startTickSubscriptions();
    }

    // Escutar ticks em tempo real via observer do DerivService
    // O subscribe:1 no ticks_history faz com que novos ticks venham como msg_type "tick"
    const tickListenerId = deriv.observerInstance.on("deriv.tick", (data: any) => {
      if (data.tick) {
        const { symbol, quote } = data.tick;
        // Verificar se é um símbolo que estamos monitorando
        if (SYMBOLS.includes(symbol as any)) {
          const lastDigit = extractDigit(quote, symbol);
          // Acumula no buffer ref (sem causar re-render)
          const current = ticksBufferRef.current[symbol];
          if (current) {
            current.push(lastDigit);
            if (current.length > TICK_BUFFER_SIZE) {
              ticksBufferRef.current[symbol] = current.slice(-TICK_BUFFER_SIZE);
            }
          } else {
            // Pega do state atual via closure
            setTicks((prev) => {
              const updated = [...(prev[symbol] || []), lastDigit].slice(-TICK_BUFFER_SIZE);
              ticksBufferRef.current[symbol] = updated;
              return prev; // NÃO atualiza o state aqui, deixa o RAF fazer
            });
          }
          scheduleFlush();
        }
      }
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(rafIdRef.current);
      deriv.observerInstance.removeById(marketOpenListenerId);
      deriv.observerInstance.removeById(tickListenerId);
      // Cancelar todas as subscriptions de ticks
      subscriptionIdsRef.current.forEach((id) => {
        deriv.send({ forget: id }).catch(() => { });
      });
      subscriptionIdsRef.current = [];
    };
  }, []);

  return (
    <div className="w-full mx-auto py-4 max-w-[1500px]">
      <span className="flex justify-between gap-2 text-lg font-bold  text-gray-400 mb-4 mt-1 pr-2 pl-2">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
            />
          </svg>
          Distribuição
        </div>
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
            />
          </svg>
          Índ. Volatilidade:{" "}
          {volatility === "R_100"
            ? "100"
            : volatility === "R_75"
              ? "75"
              : volatility === "R_50"
                ? "50"
                : volatility === "R_25"
                  ? "25"
                  : volatility === "R_10"
                    ? "10"
                    : volatility === "RDBEAR"
                      ? "Bear"
                      : volatility === "RDBULL"
                        ? "Bull"
                        : volatility === "JD10"
                          ? "Jump 10"
                          : volatility === "JD25"
                            ? "Jump 25"
                            : volatility === "JD50"
                              ? "Jump 50"
                              : volatility === "JD75"
                                ? "Jump 75"
                                : volatility === "JD100"
                                  ? "Jump 100"
                                  : ""}
        </div>
      </span>
      <div className="flex w-full flex-col md:flex-row">
        <div className="w-full flex md:w-2/3 md:pl-2 md:pr-1 flex-col space-y-4">
          <div className="w-full flex ">
            <TicksGraph
              ticksProp={ticks[volatility]}
              selectedLastTicksProp={10}
            />
            <TicksGraph
              ticksProp={ticks[volatility]}
              selectedLastTicksProp={25}
            />
            <TicksGraph
              ticksProp={ticks[volatility]}
              selectedLastTicksProp={50}
            />
          </div>
          <div className="flex justify-between w-full">
            <div className="flex items-center gap-2 text-lg font-bold  text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
              Conta conectada
            </div>
            <div>
              <Authentication ref={authenticationRef} />
            </div>
          </div>
          {accountInfo && (
            <div className="bg-principal rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-center w-full text-gray-400 border-b pb-4">
                <div className="text-sm">
                  {userData?.name}
                  {purchaseStatus === "open" && (
                    <span className="ml-2 p-1 text-[11px] bg-indigo-500 text-white rounded-sm font-bold">
                      Operando
                    </span>
                  )}
                  {purchaseStatus === "Comprando" && (
                    <span className="ml-2 p-1 text-[11px] bg-green-500 text-white rounded-sm font-bold">
                      Comprando
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="border-r-[2px] pr-2 text-sm text-nowrap">
                    Wins: {accountInfo.results.wins ?? 0}
                  </div>
                  <div className="border-r-[2px] pr-2 text-sm text-nowrap">
                    Loss: {accountInfo.results.loss ?? 0}
                  </div>
                  <div
                    className={`${accountInfo.results.result > 0
                      ? "text-green-600"
                      : "text-red-600"
                      } border-r-[2px] pr-2 text-sm text-nowrap`}
                  >
                    Resultado:{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(accountInfo.results.result ?? 0)}
                  </div>
                  <div className="group relative inline-block">
                    <button
                      className="flex items-center gap-2 rounded-md bg-red-600 px-1 py-1 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                      onClick={handleLougout}
                      aria-describedby="tooltip-logout"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </button>

                    {/* Tooltip */}
                    <span
                      id="tooltip-logout"
                      role="tooltip"
                      className="absolute -top-10 left-1/2 -translate-x-1/2 w-max px-3 py-1.5 text-sm bg-gray-800 text-white rounded-md opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none
       before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-800"
                    >
                      Desconectar
                      <span className="sr-only">(Ação irreversível)</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex w-full gap-4 text-sm">
                <div className="mt-2 w-full">
                  <label className="text-[13px] lg:text-sm font-medium text-gray-400">
                    Conta:
                  </label>
                  <div className="grid grid-cols-1">
                    <select
                      value={accountInfo.activeToken}
                      onChange={(e) => handleAccountChange(e.target.value)}
                      disabled={loading}
                      className=" col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-gray-800 py-1.5 pl-3 pr-8 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                    >
                      {accountInfo.tokens.map((token) => (
                        <option key={token.token} value={token.token}>
                          {token.is_virtual ? "Virtual " : "Real "}
                          {new Intl.NumberFormat("en-Us", {
                            style: "currency",
                            currency: "USD",
                          }).format(token.balance || "0.00")}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-gray-400"
                    />{" "}
                  </div>
                </div>
                <div className="mt-2 w-full">
                  <label
                    htmlFor="entrada-inicial"
                    className="text-[13px] lg:text-sm font-medium text-gray-400"
                  >
                    Entrada inicial:
                  </label>
                  <div className="relative mb-6">
                    <div className="absolute inset-y-0 text-gray-400 start-0 flex items-center ps-3.5 pointer-events-none">
                      <span className="text-gray-400">$</span>
                    </div>
                    <input
                      type="text"
                      id="entrada-inicial"
                      className="w-full appearance-none rounded-md border border-gray-300 bg-gray-800 py-1.5 pl-8 pr-3 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                      placeholder="0.00"
                      value={valorEntrada}
                      disabled={loading}
                      onChange={(e) => formatInputMoney(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-2 w-full">
                  <label
                    htmlFor="entrada-real"
                    className="text-[13px] lg:text-sm font-medium text-gray-400"
                  >
                    <span>
                      Entrada Real
                      <span className="hidden md:inline">
                        <span className="lg:hidden"> (C. Gale):</span>
                        <span className="hidden lg:inline"> (Com Gale):</span>
                      </span>
                    </span>
                  </label>
                  <div className="relative mb-6">
                    <div className="absolute inset-y-0 text-gray-400 start-0 flex items-center ps-3.5 pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="text"
                      id="entrada-real"
                      readOnly
                      value={`${valorReal}`}
                      className="w-full appearance-none rounded-md border border-gray-300 bg-gray-800  py-1.5 pl-8 pr-3 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              {accountInfo.lastTrade && purchaseStatus !== "open" && (
                <div className="flex w-full justify-between text-gray-400 bg-gray-800 p-2 text-[13px] lg:text-sm">
                  <div className="hidden md:block font-bold">
                    Última Operação
                  </div>
                  <div>Digito Buscado: {accountInfo.lastTrade.barrier}</div>
                  <div>
                    Digito Encontrado: {accountInfo.lastTrade.resultBarrier}
                  </div>
                  <div>
                    Entrada:{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(accountInfo.lastTrade.amount)}
                  </div>
                  <div
                    className={`${accountInfo.lastTrade.profit > 0
                      ? "text-green-600"
                      : "text-red-600"
                      }`}
                  >
                    Resultado:{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(accountInfo.lastTrade.profit)}
                  </div>
                </div>
              )}
            </div>
          )}

          <BuyTable
            authToken={selectedAccount?.token}
            currency={selectedAccount?.currency}
            isVirtual={isVirtual}
            multiplicadorProp={handleMultiplicador}
            onPurchaseStatusChange={setPurchaseStatus}
            onHoverTradeType={setHoveredTradeType}
            onDigitHover={setActiveDigit}
          />
        </div>

        <div className="w-full md:w-1/3 space-y-4 md:pl-1 md:pr-2 md:mt-0 mt-2">
          <div className="bg-[#454a58] rounded-lg shadow-md hover:shadow-lg transition-shadow">
            {SYMBOLS.map((symbol) => (
              <SymbolRow
                key={symbol}
                symbol={symbol}
                digits={ticks[symbol]}
                isSelected={volatility === symbol}
                onSelect={setVolatility}
                hoveredTradeType={hoveredTradeType}
                activeDigit={activeDigit}
              />
            ))}
          </div>
        </div>
      </div>
      {purchaseStatus === "open" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-white text-lg">Operando...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicksTest;
