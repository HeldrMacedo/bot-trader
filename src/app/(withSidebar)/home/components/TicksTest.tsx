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
} from "@/app/services/DerivService";
import { transform } from "next/dist/build/swc/generated-native";

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
    "above" | "below" | "even" | "odd" | null
  >(null);
  const [activeDigit, setActiveDigit] = useState<number | null>(null);
  const [subscriptionIds, setSubscriptionIds] = useState<string[]>([]);

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

  useEffect(() => {
    deriv.updateVolatility(volatility);
  }, [volatility]);

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
    //console.log("Nova conta selecionada:", newAccount);
    //setSelectedAccount(newAccount);
    //setAccountInfo(newAccount);
  };

  const formatInputMoney = (value: string) => {
    let cleanedValue = value.replace(/[^0-9.]/g, "");
    const parts = cleanedValue.split(".");

    if (parts.length > 2) {
      cleanedValue = parts[0] + "." + parts.slice(1).join("");
    }

    // Atualiza apenas o estado local
    setValorEntrada(cleanedValue);

    // Atualiza o accountInfo após validação
    const numericValue = parseFloat(cleanedValue);
    if (!isNaN(numericValue) && accountInfo) {
      const updatedAccount = {
        ...accountInfo,
        amount: numericValue,
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
        // if (symbol == "R_25" || symbol == "R_10")
        //   console.log(symbol, tick.raw.quote);
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
      <div className="w-full md:w-2/3 flex md:pl-2 md:pr-1">
        <TicksGraph ticksProp={ticks[volatility]} selectedLastTicksProp={10} />
        <TicksGraph ticksProp={ticks[volatility]} selectedLastTicksProp={25} />
        <TicksGraph ticksProp={ticks[volatility]} selectedLastTicksProp={50} />
      </div>
      <div className="w-full md:w-1/3 space-y-4 md:pl-1 md:pr-2 md:mt-0 mt-2">
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
        {["R_100", "R_75", "R_50", "R_25", "R_10"].map((symbol) => (
          <div 
          key={symbol}
          onClick={() => setVolatility(symbol)}
          className="relative flex flex-col min-w-0 wrap-break-word mb-4 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
        style={{
          cursor: "pointer",
          border: volatility === symbol ? "1px solid #111827" : "",
        }}
          >
            <div className="flex-auto flex-col py-2 px-3">
              <div className="flex mb-1 items-center justify-start text-base">
                <span>Índice de volatilidade {symbol.split("_")[1]}</span>
              </div>
              <div className="mx-auto overflow-hidden w-full">
                <div className="flex -translate-x-7 sm:-translate-x-4 md:-translate-x-[60%] lg:-translate-x-1" style={{ 
               
              transition: 'transform 0.2s' 
          }}>

{ticks[symbol].slice(-18).map((digit, index) => {
          const shouldHighlight =
                activeDigit !== null &&
                ((hoveredTradeType === "above" &&
                  digit > activeDigit) ||
                  (hoveredTradeType === "below" &&
                    digit < activeDigit) ||
                  (hoveredTradeType === "even" && digit % 2 === 0) ||
                  (hoveredTradeType === "odd" && digit % 2 !== 0));

                  return (
                    <div
                      key={index}
                      className={`px-1 mx-[1px] text-[12px] border ${
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
      </div>
    </div>
    </div>
    
  );
};

export default TicksTest;
