"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { AccountInfo, DerivService, TokenData } from "@/app/services/DerivService";
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
  const [disabledQuantityLoss, setDisabledQuantityLoss] = useState(false);

  const botConfigRef = useRef<BotConfig>(new BotConfig());
  const [forceUpdate, setForceUpdate] = useState(0);

  const [remainingTime, setRemainingTime] = useState<number>(0);

  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseEndTimeRef = useRef<number>(0);

  const derivService = DerivService.getInstance();

  const contractTypeIdRealRef = useRef(null);
  const isPausedRef = useRef(false);

  const forgetIdRef = useRef<string | null>(null);
  const copyTraderRef = useRef(null);

  const contadorRef = useRef(0);
  const isProporsalCopyRef = useRef(false);
  const copiarDadosRef = useRef(false);
  const [isWaitingForOperations, setIsWaitingForOperations] = useState(false);
  const contractIdVirtualRef = useRef(null);
  const [accountReal, setAccountReal] = useState<TokenData>();
  const [isTest, setIsTest] = useState(false);
  const tokensRef = useRef({
    contaReal: null,
    contaVirtual: null,
  })
  const firstOperationRef = useRef(false);

  const updateBotConfig = useCallback((updates: Partial<BotConfig>) => {
    Object.assign(botConfigRef.current, updates);
    setForceUpdate((prev) => prev + 1);
  }, []);

  const copiarDados = useCallback(async (message) => {
    setForceUpdate((prev) => prev + 1);
    let token = "";

    if (isTest) {
      token = tokensRef.current.contaVirtual.token;
    } else {
      token = tokensRef.current.contaReal.token;
    }
    copyTraderRef.current = {
      buy_contract_for_multiple_accounts: 1,
      price: botConfigRef.current.currentStake,
      parameters: {
        amount: botConfigRef.current.currentStake,
        basis: "stake",
        contract_type: message.proposal_open_contract.contract_type,
        currency: "USD",
        duration: message.proposal_open_contract.tick_count,
        duration_unit: "t",
        symbol: message.proposal_open_contract.underlying,
        ...(message.proposal_open_contract.barrier && {
          barrier: message.proposal_open_contract.barrier,
        }),
      },
      tokens: [token],
    };
  }, [isTest]);

  const tradeConsole = useCallback(
    (type: string, isWin: boolean, contador: number) => {
      return {
        type: type,
        isWin: isWin,
        contador: contador,
      };
    },
    []
  );

  const createTradeRecord = useCallback(
    (data: any, profit: number, stake: number, typeAccount: string) => {
      return {
        date: new Date().toLocaleString(),
        ref: data.proposal_open_contract.contract_id,
        code: data.proposal_open_contract.shortcode,
        start: data.proposal_open_contract.entry_tick_display_value,
        exit: data.proposal_open_contract.exit_tick_display_value,
        stake: stake,
        payout: data.proposal_open_contract.payout,
        profit: profit,
        strategy: data.proposal_open_contract.underlying,
        typeAccount: typeAccount,
      };
    },
    []
  );

  const startPauseCountdown = useCallback(() => {
    const pauseTimeSeconds = botConfigRef.current.pauseTime;
    pauseEndTimeRef.current = Date.now() + pauseTimeSeconds * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, pauseEndTimeRef.current - now);
      setRemainingTime(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        clearInterval(interval);

        countdownIntervalRef.current = null;
      }
    }, 1000);
    countdownIntervalRef.current = interval;

    const timer = setTimeout(async () => {
      isPausedRef.current = false;
      setRemainingTime(0);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, pauseTimeSeconds * 1000);
    pauseTimerRef.current = timer;
  }, []);

  const handleVirtualTransactions = useCallback(async (message: any) => {
    if (
      message.msg_type === "transaction" &&
      message.transaction.action === "sell" &&
      message.transaction.contract_id == contractIdVirtualRef.current
    ) {
      contadorRef.current = contadorRef.current + 1;
      const isWin = message.transaction.amount > 0;

      const newTrade = tradeConsole("VIRTUAL", isWin, contadorRef.current);
      setListTrade((prev) => [newTrade, ...prev]);

      if (isWin) {
        handleWinResult(0);
      } else {
        handleLossResult(0);
        setForceUpdate((prev) => prev + 1);
      }

      if (!botConfigRef.current.isRealAccount) {
        firstOperationRef.current = true;
      }
    }
  }, []);

  const sendProposal = useCallback((contractId) => {
    derivService.subscribe({
      proposal_open_contract: 1,
      contract_id: contractId,
    });
    return;
  }, []);

  const handleFirstOperation = useCallback(
    (message) => {
      if (
        message.msg_type === "transaction" &&
        message.transaction.action === "buy"
      ) {
        contractIdVirtualRef.current = message.transaction.contract_id;
        isProporsalCopyRef.current = true;
        sendProposal(message.transaction.contract_id);
      }

      if (
        message.msg_type === "proposal_open_contract" &&
        message.proposal_open_contract.status === "open" &&
        isProporsalCopyRef.current
      ) {
        isProporsalCopyRef.current = false;
        firstOperationRef.current = false;
        derivService.send({ forget: message.subscription.id });
        copiarDados(message);
        setIsWaitingForOperations(false);
      }
    },
    [sendProposal, copiarDados]
  );

  const verificaFluxo = useCallback(() => {
    return botConfigRef.current.fluxoSomenteComPauseTime();
  }, []);

  

  const handleStartBot = async () => {
    // try {
    //   derivService.handleDemoAccountChange();
    // } catch (error) {
    //   toast.error("Erro ao autenticar demo account");
    //   return;
    // }

    if (!tokensRef.current.contaReal || !tokensRef.current.contaVirtual) {
      toast.error("Tenha uma conta real ou virtual ativa.");
      return;
    }

    if (botConfigRef.current.initialValue < 0.35) {
      toast.error("Preencha um valor válido para a entrada inicial.");
      return;
    }

    if (
      botConfigRef.current.pauseTime > 0 &&
      !botConfigRef.current.pauseOnWin &&
      !botConfigRef.current.pauseOnLoss
    ) {
      toast.error("Selecione pelo menos um tipo de pausa.");
      return;
    }

    if (
      botConfigRef.current.pauseTime <= 0 &&
      botConfigRef.current.quantityLoss <= 0
    ) {
      toast.error("Preencha o Pause Time ou Quantity Loss.");
      return;
    }

    if (forgetIdRef.current) {
      await derivService.send({ forget: forgetIdRef.current });
      forgetIdRef.current = null;
    }

    setIsStart(true);
    isPausedRef.current = false;
    setRemainingTime(0);
    contractTypeIdRealRef.current = null;
    contractIdVirtualRef.current = null;
    botConfigRef.current.reset();

    const isFlowWithoutQuantityLoss = verificaFluxo();
    setIsWaitingForOperations(true);
    setDisabledQuantityLoss(true);

    if (isFlowWithoutQuantityLoss) {
      isProporsalCopyRef.current = false;
      botConfigRef.current.isRealAccount = true;
      firstOperationRef.current = true;
    } else {
      isProporsalCopyRef.current = false;
      botConfigRef.current.isRealAccount = false;
      firstOperationRef.current = true;
    }

    contadorRef.current = 0;

    setForceUpdate((prev) => prev + 1);

    copyTraderRef.current = {};

    const transactionId = await derivService.subscribe({
      transaction: 1,
    });

    if (
      transactionId &&
      transactionId.transaction &&
      transactionId.transaction.id
    ) {
      forgetIdRef.current = transactionId.transaction.id;
    } else {
      toast.error("Falha ao iniciar o stream de transações.");
      setIsStart(false);
    }
  };

  const handleStopBot = useCallback(() => {
    setIsStart(false);
    isPausedRef.current = false;

    if (forgetIdRef.current) {
      derivService.send({ forget: forgetIdRef.current });
      forgetIdRef.current = null;
    }
    setDisabledQuantityLoss(false);
    botConfigRef.current.isRealAccount = false;
    copiarDadosRef.current = false;
    botConfigRef.current.isCopyTrader = false;
    botConfigRef.current.reset();
    setForceUpdate((prev) => prev + 1);
    //derivService.observerInstance.clear();
  }, []);

  const handleWinResult = useCallback(
    (profit) => {
      try {
        botConfigRef.current.handleWin(profit);
        setForceUpdate((prev) => prev + 1);
        setTimeout(() => setForceUpdate((prev) => prev + 1), 0);
      } catch (error: any) {
        handleStopBot();
        toast.error(error.message);
      }
    },
    [handleStopBot]
  );

  const handleLossResult = useCallback(
    (stake) => {
      try {
        botConfigRef.current.handleLoss(stake);
        setForceUpdate((prev) => prev + 1);
        setTimeout(() => setForceUpdate((prev) => prev + 1), 0);
      } catch (error: any) {
        handleStopBot();
        toast.error(error.message);
      }
    },
    [handleStopBot]
  );

  const handleBuy = useCallback(
    async (message) => {
      copyTraderRef.current.price = botConfigRef.current.currentStake;
      copyTraderRef.current.parameters.amount =
        botConfigRef.current.currentStake;

      const response = await derivService.send(copyTraderRef.current);
      console.log("RESPONSE BUY ", response);
      if (response.error) {
        toast.error(response.error.message);
        handleStopBot();
        return;
      }

      const contractId = response.buy_contract_for_multiple_accounts.result[0].contract_id;
      contractTypeIdRealRef.current = contractId;
      sendProposal(contractId);
      setForceUpdate((prev) => prev + 1);
    },
    [handleStopBot, sendProposal]
  );

  const handlePauseBot = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const handlePauseLogic = useCallback(
    (isWin: boolean) => {
      if (botConfigRef.current.shouldPause(isWin)) {
        handlePauseBot();
        startPauseCountdown();
        return true;
      }
      return false;
    },
    [handlePauseBot, startPauseCountdown]
  );

  const handleRealContractResult = useCallback(
    (message) => {
      const poc = message.proposal_open_contract;
      const contractId = poc.contract_id;
      const isWin = poc.profit > 0;
      const profit = poc.profit;
      const stake = poc.buy_price;

      contadorRef.current = contadorRef.current + 1;

      contractTypeIdRealRef.current = null;

      const trade = tradeConsole("REAL", isWin, contadorRef.current);
      setListTrade((prev) => [trade, ...prev]);

      const newTrade = createTradeRecord(message, profit, stake, "REAL");
      setListTradeReal((prev) => [newTrade, ...prev]);

      const shouldPause = handlePauseLogic(isWin);

      if (isWin) {
        handleWinResult(profit);
      } else {
        handleLossResult(stake);
        setForceUpdate((prev) => prev + 1);
      }

      if (!botConfigRef.current.isRealAccount) {
        firstOperationRef.current = true;
      }

      if (shouldPause) {
        return;
      }
    },
    [
      tradeConsole,
      createTradeRecord,
      handlePauseLogic,
      handleWinResult,
      handleLossResult,
    ]
  );

  const copiarEComprar = useCallback(
    async (message) => {
      if (
        message.msg_type === "transaction" &&
        message.transaction.action === "buy" &&
        contractTypeIdRealRef.current !== message.transaction.contract_id
      ) {
        handleBuy(message);
        sendProposal(message.transaction.contract_id);
        return;
      }

      if (
        message.proposal_open_contract?.status === "open" &&
        message.proposal_open_contract.contract_id !==
          contractTypeIdRealRef.current
      ) {
        derivService.send({ forget: message.subscription.id });
        copiarDados(message);
        return;
      }

      if (
        message.proposal_open_contract?.is_valid_to_sell &&
        contractTypeIdRealRef.current ===
          message.proposal_open_contract.contract_id
      ) {
        handleRealContractResult(message);
        return;
      }
    },
    [handleBuy, sendProposal, copiarDados, handleRealContractResult]
  );

  useEffect(() => {
    const listenerId = derivService.observerInstance.on(
      "message",
      async (message) => {
        if (
          message.msg_type !== "transaction" &&
          message.msg_type !== "proposal_open_contract" &&
          message.msg_type !== "buy"
        ) {
          return;
        }
        console.log("MESSAGE", message);
        if (isPausedRef.current) return;

        if (firstOperationRef.current) {
          await handleFirstOperation(message);
          return;
        }

        if (botConfigRef.current.isRealAccount && !firstOperationRef.current) {
          await copiarEComprar(message);
          return;
        }

        if (!botConfigRef.current.isRealAccount && !firstOperationRef.current) {
          await handleVirtualTransactions(message);
          return;
        }
      }
    );

    return () => {
      derivService.observerInstance.removeById(listenerId);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
    };
  }, [handleFirstOperation, copiarEComprar, handleVirtualTransactions]);

  const getAccountReal = () => {
    return accountReal;
  }

  useEffect(() => {
    const adicionaToken = async () => {
      let tokens = derivService.getTokens();
      tokensRef.current.contaReal = tokens.find((tokens) => tokens.is_virtual == false);
      tokensRef.current.contaVirtual = tokens.find((tokens) => tokens.is_virtual == true);
    };
    adicionaToken();

    const listenerId = derivService.observerInstance.on("account.update", 
      (data: AccountInfo) => {
        const contaReal = data.tokens.find((tokens) => tokens.is_virtual == false);

        if (contaReal) {
          setAccountReal(contaReal);
        }
      }
    );
    return () => derivService.observerInstance.removeById(listenerId);
  },[])

  const handleConfigChange = (field: keyof BotConfig, value: any) => {
    // @ts-ignore
    botConfigRef.current[field] = value;
    setForceUpdate((prev) => prev + 1);
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
            <div className="flex">
              <div>Trade Action</div>
             
              <div className="ml-2 text-yellow-500 text-sm">
                <ClockIcon className="inline-block w-4 h-4 mr-1" />
                Retomando em: {remainingTime}s
              </div>
            </div>
      <div className="flex items-center gap-2">
        <div>
           <input type="checkbox" checked={isTest} onChange={(e) => {
               //isTestRef.current = e.target.checked;
               setIsTest(e.target.checked)

           }} className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" /> Testar
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
                  <span className="text-indigo-600">
                    {botConfigRef.current.tradeReal}
                  </span>
                </div>
              </div>
              <div>
                <div>
                  <span>Win</span>
                </div>
                <div>
                  <span className="text-green-600">
                    {botConfigRef.current.winReal}
                  </span>
                </div>
              </div>
              <div>
                <div>
                  <span>Loss</span>
                </div>
                <div>
                  <span className="text-red-600">
                    {botConfigRef.current.lossReal}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-green-600">Valor Total Loss: {Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(botConfigRef.current.totalLoss)}</div>
              <div className="text-red-600">Valor Total Win: {Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(botConfigRef.current.totalWin)}</div>
              {getAccountReal()?.token ? (
                <div className="text-blue-600">{getAccountReal().acct} {Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(getAccountReal().balance)}</div>
              ): (
                <div className="text-gray-500">Conta não conectada</div>
              )}
              
            </div>
            <div className="mt-2 flex flex-col lg:flex-row">
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
                    type="number"
                    disabled={disabledQuantityLoss}
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
                      checked={botConfigRef.current.pauseOnWin}
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
                      checked={botConfigRef.current.pauseOnLoss}
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
                      className={item.isWin ? "text-green-600" : "text-red-600"}
                    >
                      {item.contador} - {item.type}{" "}
                      {item.isWin ? " WIN " : " LOSS "}
                    </span>
                  </div> // Adicionado key para melhor performance
                ))
              ) : (
                // Loading ou mensagem vazia
                <div className="flex items-center justify-center h-full">
                  {isStart && isWaitingForOperations ? (
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
