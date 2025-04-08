"use client";

import DerivAPI from "@deriv/deriv-api";
import { useEffect, useState, useRef } from "react";
import TicksGraph from "./TicksGraph";
import Authentication, { AuthenticationHandle } from "./Authentication";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import BuyTable from "./buyTable";
import {
  DerivService,
  AccountInfo,
  TokenData,
} from "@/app/services/DerivServiceTest";

const APP_ID = process.env.NEXT_PUBLIC_APPID;
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

  // Carregar dados iniciais
  useEffect(() => {
    const savedAccounts = localStorage.getItem("deriv_accounts");
    if (savedAccounts) {
      const accounts: AccountInfo[] = JSON.parse(savedAccounts);
      if (accounts.length > 0) {
        setAccountInfo(accounts[0]);
        
      }
    }
  }, []);

  useEffect(() => {
    if (accountInfo) {
      setValorEntrada(accountInfo.amount.toString());
    }
  }, [accountInfo?.amount]);

  // Atualizar quando houver mudanças via observer
  useEffect(() => {
    const listener = deriv.observerInstance.on(
      "account.update",
      (newAccount: AccountInfo) => {
        setAccountInfo(newAccount);
      }
    );

    return () => deriv.observerInstance.removeById(listener);
  }, []);

  const handleAccountChange = async (token: string) => {
    if (!accountInfo) return;

    setLoading(true);
    try {
      // 1. Atualizar autenticação
      const authResponse = await deriv.send({ authorize: token });

      // 2. Atualizar dados locais
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

      // 3. Persistir e notificar
      localStorage.setItem("deriv_accounts", JSON.stringify([updatedAccount]));
      deriv.setAccountData(updatedAccount);
      onAccountChange(updatedAccount);
      setValorEntrada(updatedAccount.amount.toString());
    } catch (error) {
      console.error("Erro na autenticação:", error);
    }
    setLoading(false);
  };

  const onAccountChange = (newAccount: AccountInfo) => {
    console.log("Nova conta selecionada:", newAccount);
    //setSelectedAccount(newAccount);
    //setAccountInfo(newAccount);
  };


  const formatInputMoney = (value: string) => {
    let cleanedValue = value.replace(/[^0-9.]/g, "");
    const parts = cleanedValue.split('.');
  
    if (parts.length > 2) {
      cleanedValue = parts[0] + '.' + parts.slice(1).join('');
    }
  
    // Atualiza apenas o estado local
    setValorEntrada(cleanedValue);
  
    // Atualiza o accountInfo após validação
    const numericValue = parseFloat(cleanedValue);
    if (!isNaN(numericValue) && accountInfo) {
      const updatedAccount = {
        ...accountInfo,
        amount: numericValue
      };
      
      localStorage.setItem("deriv_accounts", JSON.stringify([updatedAccount]));
      deriv.setAccountData(updatedAccount);
    }
  
    // Atualiza valorReal
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
        if (symbol == "R_25" || symbol == "R_10")
          console.log(symbol, tick.raw.quote);
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
  //if (!accountInfo) return <div>Carregando contas...</div>;
  return (
    <div>
      <span className="flex justify-between gap-2 text-lg font-bold  text-gray-800 mb-4 mt-4">
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

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 grid grid-cols-3 auto-rows-min gap-4 items-start">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow self-start">
            <TicksGraph
              ticksProp={ticks[volatility]}
              selectedLastTicksProp={10}
            />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow self-start">
            <TicksGraph
              ticksProp={ticks[volatility]}
              selectedLastTicksProp={25}
            />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow self-start">
            <TicksGraph
              ticksProp={ticks[volatility]}
              selectedLastTicksProp={50}
            />
          </div>
          <div className="grid col-span-3">
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
              <div className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow mt-4">
                <div className="flex justify-between items-center w-full text-gray-800 border-b pb-4">
                  <div>Bem vindo {accountInfo.name}</div>
                  <div className="flex gap-2 items-center">
                    <div className="border-r-[2px] pr-2">
                      Wins: {accountInfo.results.wins}
                    </div>
                    <div className="border-r-[2px] pr-2">
                      Loss: {accountInfo.results.loss}
                    </div>
                    <div className="border-r-[2px] pr-2">
                      Resultado: ${accountInfo.results.result}
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
                <div className="flex w-full gap-4">
                  <div className="mt-2 w-full">
                    <label className="text-sm font-medium text-gray-700">
                      Conta: 
                    </label>
                    <div className="grid grid-cols-1">
                      <select
                        value={accountInfo.activeToken}
                        onChange={(e) => handleAccountChange(e.target.value)}
                        disabled={loading}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                      >
                        {accountInfo.tokens.map((token) => (
                          <option key={token.token} value={token.token}>
                            {token.is_virtual ? "Virtual" : "Real"} -
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
                      Entrada Real (Com Gale):
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
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow space-y-4">
            <div
              onClick={() => setVolatility("R_100")}
              className="mb-4 p-2  text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
              style={{
                cursor: "pointer",
                border: volatility === "R_100" ? "1px solid #111827" : "",
              }}
            >
              <h2 className="text-base mb-1">Índice de volatilidade 100</h2>
              <div className="flex">
                {ticks.R_100.slice(-18).map((digit, index) => (
                  <span key={index} className="pr-1 pl-1 text-[12px] border">
                    {digit}
                  </span>
                ))}
              </div>
            </div>

            <div
              onClick={() => setVolatility("R_75")}
              className="mb-4 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827] "
              style={{
                cursor: "pointer",
                border: volatility === "R_75" ? "1px solid #111827" : "",
              }}
            >
              <h2 className="text-base mb-1">Índice de volatilidade 75</h2>
              <div className="flex">
                {ticks.R_75.slice(-18).map((digit, index) => (
                  <span key={index} className="pr-1 pl-1 text-[12px] border">
                    {digit}
                  </span>
                ))}
              </div>
            </div>

            <div
              onClick={() => setVolatility("R_50")}
              className="mb-4 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
              style={{
                cursor: "pointer",
                border: volatility === "R_50" ? "1px solid #111827" : "",
              }}
            >
              <h2 className="text-base mb-1">Índice de volatilidade 50</h2>
              <div className="flex">
                {ticks.R_50.slice(-18).map((digit, index) => (
                  <span key={index} className="pr-1 pl-1 text-[12px] border">
                    {digit}
                  </span>
                ))}
              </div>
            </div>

            <div
              onClick={() => setVolatility("R_25")}
              className="mb-4 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
              style={{
                cursor: "pointer",
                border: volatility === "R_25" ? "1px solid #111827" : "",
              }}
            >
              <h2 className="text-base mb-1">Índice de volatilidade 25</h2>
              <div className="flex ">
                {ticks.R_25.slice(-18).map((digit, index) => (
                  <span key={index} className="pr-1 pl-1 text-[12px] border">
                    {digit}
                  </span>
                ))}
              </div>
            </div>

            <div
              onClick={() => setVolatility("R_10")}
              className="mb-4 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
              style={{
                cursor: "pointer",
                border: volatility === "R_10" ? "1px solid #111827" : "",
              }}
            >
              <h2 className="text-base mb-1 ">Índice de volatilidade 10</h2>
              <div className="flex">
                {ticks.R_10.slice(-18).map((digit, index) => (
                  <span key={index} className="pr-1 pl-1 text-[12px] border">
                    {digit}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <BuyTable
            authToken={selectedAccount?.token}
            currency={selectedAccount?.currency}
            isVirtual={selectedAccount?.is_virtual}
            multiplicadorProp={handleMultiplicador}
            // className="mt-4 pt-4 border-t border-gray-200"
          />
        </div>
      </div>
    </div>
  );
};

export default TicksTest;
