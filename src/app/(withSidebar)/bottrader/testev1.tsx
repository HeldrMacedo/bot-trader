"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { DerivService } from "@/app/services/DerivService";
import {
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon,
  ChevronDoubleRightIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { BotConfig } from "@/app/models/BotConfig";
import { toast } from "react-toastify";

export default function BotTrade() {
  const [isStart, setIsStart] = useState(false);

  const [listTrade, setListTrade] = useState<any[]>([]);
  const [listTradeReal, setListTradeReal] = useState<any[]>([]);

  const [inputQuantityLoss, setInputQuantityLoss] = useState("");
  const [inputStopLoss, setInputStopLoss] = useState("");
  const [inputStopWin, setInputStopWin] = useState("");
  const [inputInitialValue, setInputInitialValue] = useState("");
  const [inputStakeMultiple, setInputStakeMultiple] = useState("1");
  const [inputPauseTime, setInputPauseTime] = useState("");


  const botConfigRef = useRef<BotConfig>(new BotConfig());
  const [forceUpdate, setForceUpdate] = useState(0); 
  
  const [remainingTime, setRemainingTime] = useState<number>(0);
  
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseEndTimeRef = useRef<number>(0);


  const derivService = DerivService.getInstance();

  const contractTypeIdRealRef = useRef<string[]>([]);
  const isPausedRef = useRef(false);


  const forgetIdRef = useRef<string | null>(null);
  const copyTraderRef = useRef(null);

  const updateBotConfig = useCallback((updates: Partial<BotConfig>) => {
    Object.assign(botConfigRef.current, updates);
    setForceUpdate(prev => prev + 1); 
  }, []);

  const handleWinResult = useCallback((profit: number) => {
    try {
      botConfigRef.current.handleWin(profit);
      setForceUpdate(prev => prev + 1);
    } catch (error: any) {
      handleStopBot();
      toast.error(error.message);
    }
  }, []);
  
  const handleLossResult = useCallback((stake: number) => {
    try {
      botConfigRef.current.handleLoss(stake);
      setForceUpdate(prev => prev + 1); 
    } catch (error: any) {
      handleStopBot();
      toast.error(error.message);
    }
  }, []);

  const verificaMensagem = useCallback(
    (message: any) => {
      if (
        message.msg_type === "transaction" &&
        message.transaction.action === "buy"
      ) {
        
        const contractId = message.transaction.contract_id;
        derivService.subscribe({
          proposal_open_contract: 1,
          contract_id: contractId,
        });
        return;
      }
    },
    []
  );

  const verificaFluxo = useCallback(
    (message: any) => {
      return botConfigRef.current.deveEntrarNaContaReal();
    },
    [] 
  );

  const handleBuy = useCallback(async () => {
    copyTraderRef.current = {
      ...copyTraderRef.current,
      price: botConfigRef.current.currentStake,
      parameters: {
        ...copyTraderRef.current?.parameters,
        amount: botConfigRef.current.currentStake,
      }
    };
    
    console.log("botConfig.currentStake", botConfigRef.current.currentStake);
    const response = await derivService.send(copyTraderRef.current);
    
    if (response.error) {
      toast.error(response.error.message);
      return;
    }

    const contractId = response.buy.contract_id;
    contractTypeIdRealRef.current.push(contractId);
  }, []);

  const flowWithWithoutQuantityLoss = useCallback(
    async (message: any) => {
      if (
        !botConfigRef.current.pauseTimeActiveAndQuantityLossZero &&
        message.msg_type === "proposal_open_contract" &&
        message.proposal_open_contract.status === "open"
      ) {
        copyTraderRef.current = {
          buy: 1,
          price: botConfigRef.current.currentStake,
          parameters: {
            amount: botConfigRef.current.currentStake,
            basis: "stake",
            contract_type: message.proposal_open_contract.contract_type,
            currency: "USD",
            duration: 1,
            duration_unit: "t",
            symbol: message.proposal_open_contract.underlying,
            ...(message.proposal_open_contract.barrier && {
              barrier: message.proposal_open_contract.barrier,
            }),
          },
        };

        updateBotConfig({
          isRealAccount: true,
          pauseTimeActiveAndQuantityLossZero: true
        });
        
        await handleBuy();
      }
    },
    [updateBotConfig, handleBuy]
  );

  const handlePauseLogic = useCallback((isWin: boolean) => {
    console.log(!botConfigRef.current.shouldPause(isWin));
    console.log(!botConfigRef.current.isRealAccount);

    if (!botConfigRef.current.shouldPause(isWin) && !botConfigRef.current.isRealAccount) {
      return false;
    }

    if (!botConfigRef.current.isRealAccount) {
      return false;
    }
    
    if ((!botConfigRef.current.pauseOnWin && isWin) || (!botConfigRef.current.pauseOnLoss && !isWin)) {
      return false;

    }

    handlePauseBot();
    startPauseCountdown();
    return true;
  }, []);


  const startPauseCountdown = useCallback(() => {

    const pauseTimeSeconds = botConfigRef.current.pauseTime;
    pauseEndTimeRef.current = Date.now() + pauseTimeSeconds * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, pauseEndTimeRef.current - now);
      setRemainingTime(Math.ceil(remaining / 1000));
      
      console.log("Tempo restante: " + remaining / 1000 + " segundos");
      
      if (remaining <= 0) {
        console.log("Pausa concluída!");
        clearInterval(interval);
        isPausedRef.current = false;
        countdownIntervalRef.current = null;
      }
    }, 1000);

    countdownIntervalRef.current = interval;

    const timer = setTimeout(async() => {
      
      console.log("Tempo de pausa expirado!");
      isPausedRef.current = false;
      setRemainingTime(0);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (botConfigRef.current.isRealAccount && botConfigRef.current.deveEntrarNaContaReal()) {
        await handleBuy();
      }
    }, pauseTimeSeconds * 1000);

    pauseTimerRef.current = timer;
  }, []); 

  const createTradeRecord = useCallback(
    (data: any, profit: number, stake: number) => {
      return {
        date: new Date().toLocaleString(),
        ref: data.proposal_open_contract.contract_id,
        code: data.proposal_open_contract.shortcode,
        start: data.proposal_open_contract.entry_tick,
        exit: data.proposal_open_contract.exit_tick,
        stake: stake,
        payout: data.proposal_open_contract.payout,
        profit: profit,
        strategy: data.proposal_open_contract.underlying,
        typeAccount: botConfigRef.current.isRealAccount ? "REAL" : "VIRTUAL",
      };
    },
    [] 
  );

  const handleContractResult = useCallback(
    async (message: any) => {
      if (
        message.msg_type !== "proposal_open_contract" ||
        (message.proposal_open_contract.status !== "won" &&
          message.proposal_open_contract.status !== "lost")
      ) {
        return;
      }

      if (
        botConfigRef.current.isRealAccount && 
        !contractTypeIdRealRef.current.includes(message.proposal_open_contract.contract_id)
      ) {
        return;
      }

      const contractId = message.proposal_open_contract.contract_id;
      const isWin = message.proposal_open_contract.profit > 0;
      const profit = message.proposal_open_contract.profit;
      const stake = message.proposal_open_contract.buy_price;

      const newTrade = createTradeRecord(message, profit, stake);
      setListTrade((prev) => [newTrade, ...prev]);
      
      if (botConfigRef.current.isRealAccount) {
        setListTradeReal((prev) => [newTrade, ...prev]);
        contractTypeIdRealRef.current = contractTypeIdRealRef.current.filter(
          id => id !== contractId
        );
      }

      copyTraderRef.current = {
        buy: 1,
        price: botConfigRef.current.currentStake,
        parameters: {
          amount: botConfigRef.current.currentStake,
          basis: "stake",
          contract_type: message.proposal_open_contract.contract_type,
          currency: "USD",
          duration: 1,
          duration_unit: "t",
          symbol: message.proposal_open_contract.underlying,
          ...(message.proposal_open_contract.barrier && {
            barrier: message.proposal_open_contract.barrier,
          })
        }
      };
      
      const shouldPause = handlePauseLogic(isWin);

      if (isWin) {
        handleWinResult(profit);
      } else {
        handleLossResult(stake);
      }     

      if (shouldPause) {
        return true;
      }
      
   
      
      if (botConfigRef.current.isRealAccount) {
        await handleBuy();
      }
    },
    [createTradeRecord, handleWinResult, handleLossResult, handlePauseLogic, handleBuy]
  );

  useEffect(() => {
    const listenerId = derivService.observerInstance.on(
      "message",
      async (message: any) => {
        if (message.msg_type !== "transaction" &&
          message.msg_type !== "proposal_open_contract" &&
          message.msg_type !== "buy") {
            console.log("message.msg_type", message.msg_type);
            return;
        }
        
       
        if (isPausedRef.current) return;
        console.log("Received message:", message);
        verificaMensagem(message);

        const isFlowWithWithoutQuantityLoss = verificaFluxo(message);
       
        if (isFlowWithWithoutQuantityLoss) {
          await flowWithWithoutQuantityLoss(message);
          await handleContractResult(message);
        } else {
          await handleContractResult(message);
        }
      }
    );
    
    return () => {
      derivService.observerInstance.removeById(listenerId);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [handleContractResult, flowWithWithoutQuantityLoss, verificaMensagem, verificaFluxo]);

  const handleStartBot = async () => {
    if (!derivService.hasAuthorized) {
      toast.error(
        "Por favor, autorize o aplicativo na Deriv antes de iniciar o bot."
      );
      return;
    }

    if (botConfigRef.current.initialValue < 0.35) {
      toast.error("Preencha um valor válido para a entrada inicial.");
      return;
    }
  
    console.log("START FORGET ID", forgetIdRef.current);
    if (forgetIdRef.current) {
      await derivService.send({ forget: forgetIdRef.current });
      forgetIdRef.current = null;
    }
  
    setIsStart(true);
    isPausedRef.current = false;
  

    botConfigRef.current.reset();
    setForceUpdate(prev => prev + 1);
    

    const transactionId = await derivService.subscribe({
      transaction: 1,
    });
  
    forgetIdRef.current = transactionId.transaction.id;
  };

  const handleStopBot = () => {
    setIsStart(false);
    isPausedRef.current = false;
   
    if (forgetIdRef.current) {
      derivService.send({ forget: forgetIdRef.current });
      forgetIdRef.current = null;
    }

    botConfigRef.current.reset();
    derivService.observerInstance.clear();
  };

  const handlePauseBot = () => {
    isPausedRef.current = true;
  };

  const handleConfigChange = (field: keyof BotConfig, value: any) => {
    if (field === "quantityLoss") {
      botConfigRef.current.pauseTimeActiveAndQuantityLossZero = false;
    }
    
    // @ts-ignore
    botConfigRef.current[field] = value;
    setForceUpdate(prev => prev + 1); 
  };

  const formateInputMoney = (value: string) => {
    let cleanedValue = value.replace(/[^0-9.]/g, "");
    const parts = cleanedValue.split(".");
    if (parts.length > 2) {
      cleanedValue = parts[0] + "." + parts.slice(1).join("");
    }
    return cleanedValue;
  };

  const botConfig = botConfigRef.current;

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
          <div className="w-1/3">
            <span>Configuração</span>
          </div>
          <div className="w-2/3 flex justify-between">
            <div className="flex flex-col">
              <div>Trade Action</div>
              <div>Conta: {botConfig.isRealAccount ? "REAL" : "VIRTUAL"}</div>
              <div>ENTRADA: {botConfig.currentStake}</div>
              <div>Valor Total Loss: {botConfig.totalLoss}</div>
              <div>Valor total Win: {botConfig.totalWin}</div>
              <div>Multiplicador: {botConfig.stakeMultiple}</div>
              <div className="mt-2 text-yellow-500 text-sm">
                <ClockIcon className="inline-block w-4 h-4 mr-1" />
                Retomando em: {remainingTime}s
              </div>
            </div>

            {isStart ? (
              <button
                onClick={handleStopBot}
                className={`flex items-center gap-3 rounded-md pr-4 pl-4 ${
                  isPausedRef.current ? "bg-yellow-600" : "bg-red-600"
                } px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-${
                  isPausedRef.current ? "yellow-500" : "red-500"
                } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-${
                  isPausedRef.current ? "yellow-600" : "red-600"
                }`}
              >
                {isPausedRef.current ? (
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
                onClick={handleStartBot}
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
        <hr className="my-2 mb-4" />
        <div className="flex">
          <div className="w-1/3 text-sm text-gray-400">
            <div className="flex gap-2 text-center">
              <div>
                <div>
                  <span>Trade</span>
                </div>
                <div>
                  <span className="text-indigo-600">{botConfig.tradeReal}</span>
                </div>
              </div>
              <div>
                <div>
                  <span>Win</span>
                </div>
                <div>
                  <span className="text-green-600">{botConfig.winReal}</span>
                </div>
              </div>
              <div>
                <div>
                  <span>Loss</span>
                </div>
                <div>
                  <span className="text-red-600">{botConfig.lossReal}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex">
              <div className="w-2/5">
                <span className="text-nowrap">Consecutive loss</span>
              </div>
              <div className="w-3/5 flex">
                <div className="relative">
                  <input
                    disabled={true}
                    value={botConfig.consecutiveLoss}
                    type="text"
                    id="entrada-inicial"
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 flex">
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
                    type="number"
                    id="quantity-loss"
                    value={inputQuantityLoss}
                    placeholder="0"
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanedValueString = formateInputMoney(rawValue);
                      const numericValue = parseFloat(cleanedValueString) || 0;
                      setInputQuantityLoss(cleanedValueString);
                      handleConfigChange("quantityLoss", numericValue);
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 flex">
              <div className="w-2/5">
                <span className="text-nowrap">Stop Loss</span>
              </div>

              <div className="w-3/5 flex">
                <div className="relative">
                  <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="text"
                    id="stop-loss"
                    value={inputStopLoss}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanedValueString = formateInputMoney(rawValue);
                      const numericValue = parseFloat(cleanedValueString) || 0;
                      setInputStopLoss(cleanedValueString);
                      handleConfigChange("stopLoss", numericValue);
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-gray-800  pl-8 pr-3 text-base text-gray-400 focus:border-slate-500  focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 flex">
              <div className="w-2/5">
                <span className="text-nowrap">Stop Win</span>
              </div>

              <div className="w-3/5 flex">
                <div className="relative">
                  <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="text"
                    id="stop-win"
                    value={inputStopWin}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanedValueString = formateInputMoney(rawValue);
                      const numericValue = parseFloat(cleanedValueString) || 0;
                      setInputStopWin(cleanedValueString);
                      handleConfigChange("stopWin", numericValue);
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 flex">
              <div className="w-2/5">
                <span className="text-nowrap">Initial Value</span>
              </div>

              <div className="w-3/5 flex">
                <div className="relative">
                  <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="text"
                    id="entrada-inicial"
                    value={inputInitialValue}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanedValueString = formateInputMoney(rawValue); // Usa sua função para limpar
                      const numericValue = parseFloat(cleanedValueString) || 0;
                      setInputInitialValue(cleanedValueString);
                      handleConfigChange("initialValue", Number(numericValue)); //
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 flex">
              <div className="w-2/5">
                <span className="text-nowrap">Stake Multiple</span>
              </div>

              <div className="w-3/5 flex">
                <div className="relative">
                  <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                    <span className="text-gray-500">X</span>
                  </div>
                  <input
                    type="text"
                    id="stake-multiple"
                    value={inputStakeMultiple}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const cleanValue = rawValue.replace(/[^0-9.]/g, "");
                      setInputStakeMultiple(cleanValue);
                      handleConfigChange("stakeMultiple", cleanValue);
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 flex">
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
                    type="text"
                    id="pause-time"
                    value={inputPauseTime}
                    onChange={(e) => {
                      setInputPauseTime(e.target.value);
                      handleConfigChange("pauseTime", Number(e.target.value));
                    }}
                    className="w-[7rem] appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                    placeholder="segundos"
                  />
                </div>
                <div className="flex flex-row gap-1">
                  <div className="mt-2 flex gap-2">
                    <input
                      type="checkbox"
                      checked={botConfig.pauseOnWin}
                      onChange={(e) =>
                        handleConfigChange("pauseOnWin", e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm">Win</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="checkbox"
                      checked={botConfig.pauseOnLoss}
                      onChange={(e) =>
                        handleConfigChange("pauseOnLoss", e.target.checked)
                      }
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
              {listTrade.length > 0 ? (
                listTrade.map((item, index) => (
                  <div
                    key={item.ref || index}
                    className="flex flex-row items-center pl-4"
                  >
                    <span>
                      <ChevronDoubleRightIcon width={20} height={20} />
                    </span>
                    <span
                      className={
                        item.profit > 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      $ {item.typeAccount}{" "}
                      {item.profit > 0 ? " WIN " : " LOSS "} {"ENTRADA $"}{item.stake} {" RESULTADO - "} $
                      {item.profit} 
                    </span>
                  </div> // Adicionado key para melhor performance
                ))
              ) : (
                // Adicionado o caso else para quando listTrade está vazio
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">
                    Nenhuma negociação realizada ainda.
                  </p>
                </div>
              )}
            </div>
            <div className="relative  shadow-md sm:rounded-lg mt-4 overflow-auto  h-[180px]">
              <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-sm text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-2">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Ref</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Code</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Start</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Exit</div>
                    </th>

                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Stake</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Payout</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Profit</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Strategy</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listTradeReal.map((item, index) => (
                    <tr
                      key={item.ref || index}
                      className={`bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200 ${
                        item.profit > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <th
                        scope="row"
                        className="px-6 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                      >
                        {item.date}
                      </th>
                      <td className="px-6 py-2">{item.ref}</td>
                      <td className="px-6 py-2">{item.code}</td>
                      <td className="px-6 py-2">{item.start}</td>
                      <td className="px-6 py-2">{item.exit}</td>
                      <td className="px-6 py-2">{item.stake}</td>
                      <td className="px-6 py-2">{item.payout}</td>
                      <td className="px-6 py-2">{item.profit}</td>
                      <td className="px-6 py-2">{item.strategy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
