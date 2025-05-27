const verificaMensagem = useCallback(
    (message) => {
      if (
        message.msg_type === "transaction" &&
        message.transaction.action === "buy"
      ) {
        if (!forgetId) {
          console.log("FORGET ID", message.subscription.id);
          setForgetId(message.subscription.id);
        }

        const contractId = message.transaction.contract_id;
        derivService.subscribe({
          proposal_open_contract: 1,
          contract_id: contractId,
        });
        return;
      }
    },
    [forgetId]
  );

  const verificaFluxo = useCallback(
    (message) => {
      if (botConfig.deveEntrarNaContaReal()) {
        return true;
      }
      return false;
    },
    [botConfig]
  );

  const handleBuy = async () => {
    const response = await derivService.send(payloadPauseTime.current);
        if (response.error) {
          toast.error(response.error.message);
          return;
        }

        const contractId = response.buy.contract_id;
        contractTypeIdRealRef.current = contractId;
  };

  const flowWithWithoutQuantityLoss = useCallback(
    async (message) => {
      //se for true significa que já passou por aqui e não precisa mais verificar
      if (botConfig.pauseTimeActiveAndQuantityLossZero) {
        await handleBuy();
        return;
      }

      if (
        !botConfig.pauseTimeActiveAndQuantityLossZero &&
        message.msg_type === "proposal_open_contract" &&
        message.proposal_open_contract.status === "open"
      ) {
        payloadPauseTime.current = {
          buy: 1,
          price: botConfig.currentStake,
          parameters: {
            amount: botConfig.currentStake,
            //app_markup_percentage: "3",
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

        setBotConfig((prev) => {
          const newConfig = new BotConfig(prev);
          newConfig.isRealAccount = true;
          newConfig.pauseTimeActiveAndQuantityLossZero = true;
          return newConfig;
        });
        await handleBuy();
        
      }
      
    },
    [botConfig]
  );

  const flowNormal = useCallback(() => {}, []);

  const handleWinResult = useCallback((profit) => {
    setBotConfig((prev) => {
      const newConfig = new BotConfig(prev);
      try {
        newConfig.handleWin(profit);
        return newConfig;
      } catch (error) {
        handleStopBot();
        toast.error(error.message);
        return prev;
      }
    });
  }, []);

  const handleLossResult = useCallback((stake) => {
    setBotConfig((prev) => {
      const newConfig = new BotConfig(prev);
      try {
        newConfig.handleLoss(stake);
        return newConfig;
      } catch (error) {
        handleStopBot();
        toast.error(error.message);
        return prev;
      }
    });
  }, []);

  const handlePauseLogic = useCallback(
    (isWin) => {
      if (!botConfig.shouldPause(isWin) && !botConfig.isRealAccount){
        return false;
      }

      handleStopBot();
      startPauseCountdown();
      return true;
    },
    [botConfig]
  );

  const startPauseCountdown = useCallback(() => {
    const endTime = Date.now() + botConfig.pauseTime * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setRemainingTime(Math.ceil(remaining / 1000));
      console.log("Tempo restante: " + remaining / 1000 + " segundos");
      if (remaining <= 0) {
        console.log("Pausa concluída!");
        clearInterval(interval);
        setIsPaused(false);
        isPausedRef.current = false;
      }
    }, 1000);

    setCountdownInterval(interval);

    const timer = setTimeout(() => {
      handleStartBot();
      console.log("Tempo de pausa expirado!");
      setIsPaused(false);
      isPausedRef.current = false;
      setRemainingTime(0);
      clearInterval(interval);
    }, botConfig.pauseTime * 1000);

    setPauseTimer(timer);
  }, [botConfig.pauseTime]);

  const handleRealAccountPurchase = useCallback(async () => {
    if (!botConfig.isRealAccount) return;

    const response = await derivService.send(payloadEntry);
    if (response.error) {
      toast.error(response.error.message);
      return;
    }

    contractTypeIdRealRef.current = response.buy.contract_id;
  }, [botConfig.isRealAccount, payloadEntry]);

  const createTradeRecord = useCallback(
    (data, profit, stake) => {
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
        typeAccount: botConfig.isRealAccount ? "REAL" : "VIRTUAL",
      };
    },
    [botConfig.isRealAccount]
  );

  const handleContractResult = useCallback(
    async (message) => {
      if (
        message.msg_type !== "proposal_open_contract" ||
        (message.proposal_open_contract.status !== "won" &&
          message.proposal_open_contract.status !== "lost")
      ) {
        return;
      }

      if (
        botConfig.isRealAccount &&
        contractTypeIdRealRef.current !==
          message.proposal_open_contract.contract_id
      ) {
        return;
      }

      const isWin = message.proposal_open_contract.profit > 0;
      const profit = message.proposal_open_contract.profit;
      const stake = message.proposal_open_contract.buy_price;

      const newTrade = createTradeRecord(message, profit, stake);
      setListTrade((prev) => [newTrade, ...prev]);
      if (botConfig.isRealAccount) {
        setListTradeReal((prev) => [newTrade, ...prev]);
      }

      // Processar resultado
      if (isWin) {
        handleWinResult(profit);
      } else {
        handleLossResult(stake);
      }

      const shouldPause = handlePauseLogic(isWin);

      if (shouldPause) {
        return;
      }

      await handleRealAccountPurchase();
    },
    [
      botConfig,
      createTradeRecord,
      handleWinResult,
      handleLossResult,
      handlePauseLogic,
      handleRealAccountPurchase,
    ]
  );

  useEffect(() => {
    const listenerId = derivService.observerInstance.on(
      "message",
      async (message) => {

        if (message.msg_type !== "transaction" &&
          message.msg_type !== "proposal_open_contract" &&
          message.msg_type !== "buy") {
            console.log("message.msg_type", message.msg_type);
            return;
        }
        console.log("Received message:", message);
        if (isPaused) return;


        verificaMensagem(message);

        const isFlowWithWithoutQuantityLoss = verificaFluxo(message);

        if (isFlowWithWithoutQuantityLoss) {
          await flowWithWithoutQuantityLoss(message);
          await handleContractResult(message)
        } else {
        }
      }
    );
    return () => {
      derivService.observerInstance.removeById(listenerId);
      if (pauseTimer) clearTimeout(pauseTimer);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [botConfig, isPaused, handleContractResult]);

  const handleStartBot = () => {
    if (!derivService.hasAuthorized) {
      toast.error(
        "Por favor, autorize o aplicativo na Deriv antes de iniciar o bot."
      );
      return;
    }

    if (inputInitialValue === "" || Number(inputInitialValue) < 0.35) {
      toast.error("Preencha um valor válido para a entrada inicial.");
      return;
    }

    handleStopBot();
    setIsStart(true);
    setIsPaused(false);
    isPausedRef.current = false;

    // Resetar configurações do bot
    setBotConfig((prev) => {
      const newConfig = new BotConfig(prev);
      newConfig.reset();
      return newConfig;
    });

    derivService.subscribe({
      transaction: 1,
    });
  };

  const handleStopBot = () => {
    setIsStart(false);
    setIsPaused(false);
    isPausedRef.current = false;
    //if (pauseTimer) clearTimeout(pauseTimer);
    if (forgetId) {
      //derivService.send({ forget_all: ["proposal_open_contract", "buy", "transaction"] });
      derivService.send({ forget: forgetId });
      setForgetId(null);
    }

    derivService.observerInstance.clear();
  };

  const handleConfigChange = (field: keyof BotConfig, value: any) => {
    setBotConfig((prev) => {
      const newConfig = new BotConfig(prev);
      if (field === "quantityLoss") {
        newConfig["pauseTimeActiveAndQuantityLossZero"] = false;
      }
      //@ts-ignore
      newConfig[field] = value;
      return newConfig;
    });
  };

  const formateInputMoney = (value: string) => {
    let cleanedValue = value.replace(/[^0-9.]/g, "");
    const parts = cleanedValue.split(".");

    if (parts.length > 2) {
      cleanedValue = parts[0] + "." + parts.slice(1).join("");
    }

    return cleanedValue;
  };
