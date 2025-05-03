"use client";

import DerivAPI from "@deriv/deriv-api";
import { useEffect, useState, useRef, useCallback } from "react";
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
import { BotTrade } from "./BotTrade";

interface AccountSelectorProps {
  onAccountChange: (accountInfo: any) => void;
}

export const TicksTest = () => {
  const [ticks, setTicks] = useState({
    R_100: [],
    R_75: [],
    R_50: [],
    R_25: [],
    R_10: [],
  });
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
      console.error("Erro ao buscar dados do usuário:", error);
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
      console.log("user", user);
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
      const authResponse = await deriv.send({ authorize: token });

      const updatedAccount: AccountInfo = {
        ...accountInfo,
        activeToken: token,
        selectedLoginId:
          accountInfo.tokens.find((t) => t.token === token)?.loginid || "",
        tokens: accountInfo.tokens.map((t) => ({
          ...t,
          balance:
            t.token === token ? authResponse.authorize.balance : t.balance,
        })),
      };

      localStorage.setItem("deriv_accounts", JSON.stringify([updatedAccount]));
      deriv.setAccountData(updatedAccount);
      setValorEntrada(updatedAccount.amount.toString());
    } catch (error) {
      console.error("Erro na autenticação:", error);
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

  useEffect(() => {
    formatInputMoney(valorEntrada);
  }, [multiplicador, valorEntrada]);

  useEffect(() => {
    const connection = new WebSocket(
      "wss://ws.derivws.com/websockets/v3?app_id=" +
        process.env.NEXT_PUBLIC_APPID
    );
    const api = new DerivAPI({ connection });

    const fetchTicks = async (symbol) => {
      const ticksStream = await api.ticks(symbol);
      const listTicksReturn = await ticksStream.history({
        count: 500,
        end: new Date(),
      });
      const listTicks = listTicksReturn.map((tick) =>
        parseInt(
          tick.raw.quote
            .toFixed(
              symbol == "R_100"
                ? 2
                : symbol == "R_25" || symbol == "R_10"
                ? 3
                : 4
            )
            .toString()
            .slice(-1)
        )
      );
      setTicks((prev) => ({ ...prev, [symbol]: listTicks }));
      ticksStream.onUpdate((tick) => {
        const lastDigit = parseInt(
          tick.raw.quote
            .toFixed(
              symbol == "R_100"
                ? 2
                : symbol == "R_25" || symbol == "R_10"
                ? 3
                : 4
            )
            .toString()
            .slice(-1)
        );
        setTicks((prev) => ({
          ...prev,
          [symbol]: [...prev[symbol], lastDigit].slice(-500),
        }));
      });
    };

    fetchTicks("R_100");
    fetchTicks("R_75");
    fetchTicks("R_50");
    fetchTicks("R_25");
    fetchTicks("R_10");

    return () => {
      connection.close();
    };
  }, []);

  return (
    <div className="w-full mx-auto py-4 max-w-[1500px]">
      <span className="flex justify-between gap-2 text-lg font-bold  text-gray-800 mb-4 mt-4 pr-2 pl-2">
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
          Índ. Volatilidade {volatility.split("_")[1]}
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
            <div className="flex items-center gap-2 text-lg font-bold  text-gray-800">
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
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-center w-full text-gray-800 border-b pb-4">
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
                    className={`${
                      accountInfo.results.result > 0
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
                  <label className="text-sm font-medium text-gray-700">
                    Conta:
                  </label>
                  <div className="grid grid-cols-1">
                    <select
                      value={accountInfo.activeToken}
                      onChange={(e) => handleAccountChange(e.target.value)}
                      disabled={loading}
                      defaultValue={accountInfo.activeToken}
                      className="col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
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
                    className="text-sm font-medium text-gray-700"
                  >
                    Entrada inicial:
                  </label>
                  <div className="relative mb-6">
                    <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="text"
                      id="entrada-inicial"
                      className="w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
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
                    className="text-sm font-medium text-gray-700"
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
                    <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="text"
                      id="entrada-real"
                      readOnly
                      value={`${valorReal}`}
                      className="w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              {accountInfo.lastTrade && purchaseStatus !== "open" && (
                <div className="flex w-full justify-between text-gray-800 bg-slate-100 p-2 text-sm">
                  <div className="font-bold">Última Operação</div>
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
                    className={`${
                      accountInfo.lastTrade.profit > 0
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

          <BotTrade/>
        </div>

        <div className="w-full md:w-1/3 space-y-4 md:pl-1 md:pr-2 md:mt-0 mt-2">
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            {["R_100", "R_75", "R_50", "R_25", "R_10"].map((symbol) => (
              <div
                key={symbol}
                onClick={() => setVolatility(symbol)}
                className="relative flex flex-col min-w-0 wrap-break-word mb-1 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
                style={{
                  cursor: "pointer",
                  border: volatility === symbol ? "1px solid #111827" : "",
                }}
              >
                <div className="flex-auto flex-col py-1 px-3">
                  <div className="flex mb-1 items-center justify-start text-base">
                    <span>Índice de volatilidade {symbol.split("_")[1]}</span>
                  </div>
                  <div className="mx-auto overflow-hidden w-full">
                    <div
                      className="flex justify-end"
                      style={{
                        transition: "transform 0.2s",
                      }}
                    >
                      {ticks[symbol].slice(-40).map((digit, index) => {
                        const shouldHighlight =
                          activeDigit !== null &&
                          ((hoveredTradeType === "above" &&
                            digit > activeDigit) ||
                            (hoveredTradeType === "below" &&
                              digit < activeDigit) ||
                            (hoveredTradeType === "even" && digit % 2 === 0) ||
                            (hoveredTradeType === "odd" && digit % 2 !== 0) ||
                            (hoveredTradeType === "diff" &&
                              digit !== activeDigit));

                        return (
                          <div
                            key={index}
                            className={`px-1 py-mx-[1px] text-[12px] border ${
                              shouldHighlight
                                ? "bg-slate-400 text-white border-slate-500"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            {digit}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <BuyTable
            authToken={selectedAccount?.token}
            currency={selectedAccount?.currency}
            isVirtual={selectedAccount?.is_virtual}
            multiplicadorProp={handleMultiplicador}
            onPurchaseStatusChange={setPurchaseStatus}
            onHoverTradeType={setHoveredTradeType}
            onDigitHover={setActiveDigit}
          />
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
