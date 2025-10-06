"use client";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import Head from "next/head";
import {
  ChevronDoubleRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import moment from "moment";

interface Stats {
  demoToken: string;
  realToken: string;
  errors: number;
  isProcessingEnabled: boolean;
  lastSignalTime: string;
  lastTradeTime: string;
  realAccount: RealAccount[]; // Array de transações
  virtualAccount: VirtualAccount[]; // Array de transações
  isRunning: boolean;
  signalsReceived: number;
  tradesExecuted: number;
  console: Console[];
  totalLoss: number;
  totalWin: number;
  totalTrader: number;
  totalValueWin: number;
  totalValueLoss: number;
  consecutiveLoss: number;
  totalProfit: number;
  // Novos campos baseados na API:
  currentStake?: number;
  isPaused?: boolean;
  pauseEndTime?: number;
  timePause: number;
  balance: number;
  detalhes: any[];
}

interface Console {
  status: string;
  message: string;
  contract_id: number;
  amount: number;
  isDemo: boolean;
}

interface RealAccount {
  data: string;
  entry_spot_display_value?: string;
  exit_tick_display_value?: string;
  contract_id?: number | string;
  contract_type?: string;
  display_name?: string;
  payout?: number;
  profit?: number;
  status?: string;
  buy_price?: number;
}

interface VirtualAccount {
  status?: string;
  contract_id?: number | string;
}

interface Configure {
  quantityLoss: number;
  stopLoss: number;
  stopWin: number;
  initialValue: number;
  stakeMultiple: number;
  pauseTime: number;
  pauseTimeLoss: boolean;
  pauseTimeWin: boolean;
}

export default function BotTraderX() {
  const [stats, setStats] = useState<Stats>({
    demoToken: "",
    realToken: "",
    errors: 0,
    isProcessingEnabled: false,
    lastSignalTime: "",
    lastTradeTime: "",
    realAccount: [],
    virtualAccount: [],
    isRunning: false,
    signalsReceived: 0,
    tradesExecuted: 0,
    totalLoss: 0,
    totalWin: 0,
    totalTrader: 0,
    totalValueWin: 0,
    totalValueLoss: 0,
    totalProfit: 0,
    consecutiveLoss: 0,
    console: [] as Console[],
    timePause: 0,
    balance: 0,
    detalhes: [],
  });

  const [loading, setLoading] = useState(false);
  const [demoToken, setDemoToken] = useState("ehOXyajRlX3TdOu");
  const [realToken, setRealToken] = useState("xa5kGNBaSNP232p");
  //const [demoToken, setDemoToken] = useState("");
  //const [realToken, setRealToken] = useState("");
  const [isStart, setIsStart] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [configure, setConfigure] = useState<Configure>({
    quantityLoss: 0,
    stopLoss: 0,
    stopWin: 0,
    initialValue: 0,
    stakeMultiple: 0,
    pauseTime: 0,
    pauseTimeLoss: false,
    pauseTimeWin: false,
  });
  const [inputStopLoss, setInputStopLoss] = useState("");
  const [inputStopWin, setInputStopWin] = useState("");
  const [inputInitialValue, setInputInitialValue] = useState("");
  const [inputStakeMultiple, setInputStakeMultiple] = useState("");
  const [inputPauseTime, setInputPauseTime] = useState("");
  const [checkedPauseTimeLoss, setCheckedPauseTimeLoss] = useState(false);
  const [checkedPauseTimeWin, setCheckedPauseTimeWin] = useState(false);
  const [disabledFields, setDisabledFields] = useState(false);

  useEffect(() => {
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  });

  const fetchStatus = async () => {
    try {
      // Obter tokens do usuário atual (implementar conforme sua lógica de autenticação)
      const token = localStorage.getItem("access_token");

      const response = await fetch("/api/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data?.copyTrading?.isRunning) {
        setStats((prev) => ({
          ...prev,
          console: data.console,
          consecutiveLoss: data.consecutiveLosses,
          totalLoss: data.realAccount.totalLoss,
          totalWin: data.realAccount.totalWin,
          totalTrader: data.realAccount.transactions.length,
          totalValueWin: data.realAccount.totalValueWin,
          totalValueLoss: data.realAccount.totalValueLoss,
          totalProfit: data.realAccount.totalProfit,
          realAccount: data.realTransactions,
          timePause: data.timePause,
          balance: data.balance,
          detalhes: data.errors.errors,
        }));
      }
      console.log("fetchStatus ", data);
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  const startCopyTrading = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ demoToken, realToken, configure }),
      });
      const data = await response.json();;

      if (response.ok) {
        setDisabledFields(true);
        toast.success('Copy trading iniciado com sucesso!');
        setIsStart(true);
        fetchStatus();
      } else {
        toast.error(`Erro ao iniciar: ${data.error}`);
      }
    } catch (error) {
      toast.error("Erro ao iniciar copy trading");
    } finally {
      setLoading(false);
    }
  };

  const stopCopyTrading = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stopAll: true }),
      });

      const data = await response.json();

      if (response.ok) {
        setDisabledFields(false);
        toast.success("Copy trading parado com sucesso!");
        setIsStart(false);
        fetchStatus();
      } else {
        toast.error(`Erro: ${data.error}`);
      }
    } catch (error) {
      toast.error("Erro ao parar copy trading");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formateInputMoney = (value: string) => {
    let cleanedValue = value.replace(/[^0-9.]/g, "");
    const parts = cleanedValue.split(".");
    if (parts.length > 2) {
      cleanedValue = parts[0] + "." + parts.slice(1).join("");
    }
    return cleanedValue;
  };
  return (
    <div className="w-full mx-auto py-4 max-w-[1500px]">
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
            d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z"
          />
        </svg>
        Bot Trade
      </div>
      <div className="flex flex-col bg-principal rounded-lg p-6 mt-4 shadow-md hover:shadow-lg transition-shadow">
        <div className="text-gray-400 text-sm flex">
          <div className="w-1/3 flex gap-2">
            <div className="self-end">Configuração</div>
          </div>
          <div className="w-2/3 flex justify-between">
            <div className="flex gap-2">
              <div className="self-end">Trader Action</div>

              <div className="text-yellow-500 text-sm self-end">
                <ClockIcon className="inline-block w-4 h-4 mr-1 " />
                Retomando em: {stats.timePause}s
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <input
                  type="text"
                  disabled={isStart}
                  className="w-full appearance-none rounded-md border border-gray-300 bg-gray-800 py-1.5 pl-2 pr-3 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                  placeholder="Demo Token"
                  value={demoToken}
                  onChange={(e) => setDemoToken(e.target.value)}
                />
              </div>

              <div>
                <input
                  type="text"
                  disabled={isStart}
                  className="w-full appearance-none rounded-md border border-gray-300 bg-gray-800 py-1.5 pl-2 pr-3 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                  placeholder="Real Token"
                  value={realToken}
                  onChange={(e) => setRealToken(e.target.value)}
                />
              </div>

              {isStart ? (
                <button
                  onClick={stopCopyTrading}
                  className={`flex items-center gap-3 rounded-md pr-4 pl-4 ${
                    isPaused ? "bg-yellow-600" : "bg-red-600"
                  } px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-${
                    isPaused ? "yellow-500" : "red-500"
                  } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-${
                    isPaused ? "yellow-600" : "red-600"
                  }`}
                >
                  {isPaused ? (
                    <>
                      <ClockIcon className="w-5 h-5" />
                      Pausado
                    </>
                  ) : (
                    <>
                      <StopIcon className="w-5 h-5" />
                      Parar
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={startCopyTrading}
                  className="flex items-center gap-3 rounded-md bg-green-600 pr-4 pl-4 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
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
                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                    />
                  </svg>
                  Start
                </button>
              )}
            </div>
          </div>
        </div>
        <hr className="my-2" />
        <div className="flex">
          <div className="w-1/3 text-sm text-gray-400">
            <div className="flex gap-2 text-center">
              <div>
                <div>
                  <span>Trade</span>
                </div>
                <div>
                  <span className="text-indigo-600">{stats.totalTrader}</span>
                </div>
              </div>
              <div>
                <div>
                  <span>Win</span>
                </div>
                <div>
                  <span className="text-green-600">{stats.totalWin}</span>
                </div>
              </div>
              <div>
                <div>
                  <span>Loss</span>
                </div>
                <div>
                  <span className="text-red-600">{stats.totalLoss}</span>
                </div>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-green-600">Valor Total Win {Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalValueWin)}</div>
              <div className="text-red-600">Valor Total Loss {Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalValueLoss)}</div>
              <div className="text-yellow-600">Lucro {Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalProfit)}</div>

              <div className="text-blue-600">Balance Real: {Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.balance)}</div>
            </div>

            <div className="mt-2 flex flex-col lg:flex-row">
              <div className="w-2/5">
                <span className="text-nowrap">Consecutive loss</span>
              </div>
              <div className="w-3/5 flex">
                <div className="relative">
                  <input
                    disabled={true}
                    value={stats.consecutiveLoss}
                    type="text"
                    id="entrada-inicial"
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-col lg:flex-row">
              <div className="w-2/5">
                <span className="text-nowrap">Quantity loss</span>
              </div>
              <div className="w-3/5 flex">
                <div className="relative">
                  <div className="icone-configuracao absolute inset-y-0 text-gray-700 start-0 flex items-center pointer-events-none">
                    <span className="text-gray-500">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                    </span>
                  </div>
                  <input
                    disabled={disabledFields}
                    id="quantity-loss"
                    value={configure.quantityLoss}
                    type="text"
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      setConfigure({
                        ...configure,
                        quantityLoss: Number(value),
                      });
                    }}
                    placeholder="0"
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-col lg:flex-row">
              <div className="w-2/5">
                <span className="text-nowrap">Stop Loss</span>
              </div>

              <div className="w-3/5 flex">
                <div className="relative">
                  <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    disabled={disabledFields}
                    type="text"
                    id="stop-loss"
                    value={inputStopLoss}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanedValueString = formateInputMoney(rawValue);
                      const numericValue = parseFloat(cleanedValueString) || 0;
                      setInputStopLoss(cleanedValueString);
                      setConfigure((prev) => ({
                        ...prev,
                        stopLoss: numericValue,
                      }));
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-gray-800  pl-8 pr-3 text-base text-gray-400 focus:border-slate-500  focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-col lg:flex-row">
              <div className="w-2/5">
                <span className="text-nowrap">Stop Win</span>
              </div>

              <div className="w-3/5 flex">
                <div className="relative">
                  <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    disabled={disabledFields}
                    type="text"
                    id="stop-win"
                    value={inputStopWin}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanedValueString = formateInputMoney(rawValue);
                      const numericValue = parseFloat(cleanedValueString) || 0;
                      setInputStopWin(cleanedValueString);
                      setConfigure((prev) => ({
                        ...prev,
                        stopWin: numericValue,
                      }));
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-col lg:flex-row">
              <div className="w-2/5">
                <span className="text-nowrap">Initial Value</span>
              </div>

              <div className="w-3/5 flex">
                <div className="relative">
                  <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    disabled={disabledFields}
                    type="text"
                    id="entrada-inicial"
                    value={inputInitialValue}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanedValueString = formateInputMoney(rawValue);
                      const numericValue = parseFloat(cleanedValueString) || 0;
                      setInputInitialValue(cleanedValueString);
                      setConfigure((prev) => ({
                        ...prev,
                        initialValue: numericValue,
                      }));
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-col lg:flex-row">
              <div className="w-2/5">
                <span className="text-nowrap">Stake Multiple</span>
              </div>

              <div className="w-3/5 flex">
                <div className="relative">
                  <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                    <span className="text-gray-500">X</span>
                  </div>
                  <input
                    disabled={disabledFields}
                    type="text"
                    id="stake-multiple"
                    value={inputStakeMultiple}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanValue = rawValue.replace(/[^0-9.]/g, "");
                      setInputStakeMultiple(cleanValue);
                      setConfigure((prev) => ({
                        ...prev,
                        stakeMultiple: parseFloat(cleanValue) || 0,
                      }));
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-col lg:flex-row">
              <div className="w-2/5 flex items-center gap-1">
                <span className="text-nowrap">Pause Time </span>
                <div className="bg-indigo-600 rounded-full w-4 h-4 text-center flex justify-center items-center group relative">
                  <span className="text-white text-[10px]">?</span>
                  <span
                    id="tooltip-logout"
                    role="tooltip"
                    className="absolute -top-10 left-1/2 -translate-x-1/2 w-max px-3 py-1.5 text-sm bg-gray-800 text-white rounded-md opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none
       before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-800"
                  >
                    Tempo em segundos
                  </span>
                </div>
              </div>

              <div className="w-3/5 flex flex-col">
                <div className="relative">
                  <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center icone-configuracao pointer-events-none">
                    <span className="text-gray-500">
                      <ClockIcon className="w-4 h-4" />
                    </span>
                  </div>
                  <input
                    disabled={disabledFields}
                    type="text"
                    id="pause-time"
                    value={inputPauseTime}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanValue = rawValue.replace(/[^0-9]/g, "");
                      setInputPauseTime(cleanValue);
                      setConfigure((prev) => ({
                        ...prev,
                        pauseTime: parseInt(cleanValue) || 0,
                      }));
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                    placeholder="segundos"
                  />
                </div>
                <div className="flex flex-row gap-1">
                  <div className="mt-2 flex gap-2">
                    <input
                      disabled={disabledFields}
                      type="checkbox"
                      checked={checkedPauseTimeWin}
                      onChange={(e) => {
                        setCheckedPauseTimeWin(e.target.checked);
                        setConfigure((prev) => ({
                          ...prev,
                          pauseTimeWin: e.target.checked,
                        }));
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm">Win</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      disabled={disabledFields}
                      type="checkbox"
                      checked={checkedPauseTimeLoss}
                      onChange={(e) => {
                        setCheckedPauseTimeLoss(e.target.checked);
                        setConfigure((prev) => ({
                          ...prev,
                          pauseTimeLoss: e.target.checked,
                        }));
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm">Loss</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-2/3">
            <div className="flex flex-col h-[180px] bg-black rounded-lg overflow-y-auto">
              {stats.console?.length > 0 ? (
                stats.console?.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <span>
                      <ChevronDoubleRightIcon width={20} height={20} />
                    </span>
                    <span
                      className={
                        item.amount > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {index + 1} {item.isDemo ? '[DEMO] ==> ' : '[REAL] ==> '} - {item.amount > 0 ? 'WIN' : 'LOSE'} 

                    </span>
                  </div>
                ))
              ).reverse() : (
                <div className="flex items-center justify-center h-full">
                  {isStart ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <p className="text-blue-500 text-sm font-medium">
                        Aguardando operações...
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      Nenhuma negociação realizada ainda.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="relative  shadow-md sm:rounded-lg mt-4 overflow-auto  h-[200px]">
              <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-sm text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Contract</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Start</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Exit</div>
                    </th>

                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Buy Price</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Profit</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Payout</div>
                    </th>
                    
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Status</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Strategy</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.realAccount?.map((item, index) => (
                    <tr
                      key={index}
                      className={`bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200 ${
                        item.profit > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <td className="px-6 py-2">{item.contract_id}</td>
                      <td className="px-6 py-2">
                        {item.entry_spot_display_value}
                      </td>
                      <td className="px-6 py-2">
                        {item.exit_tick_display_value}
                      </td>
                      <td className="px-6 py-2">{item.buy_price}</td>
                      <td className="px-6 py-2">{item.profit}</td>
                      <td className="px-6 py-2">{item.payout}</td>
                      <td className="px-6 py-2">{item.status}</td>
                      <td className="px-6 py-2">{item.display_name}</td>
                    </tr>
                  )).reverse()}
                </tbody>
              </table>
            </div>

            <div className="mt-4 h-[100px] text-blue-300 overflow-auto">
              {stats.detalhes?.map((item, index) => (
                <div key={index}>
                  <small>{item.message}</small>
                </div>
              )).reverse()}              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
