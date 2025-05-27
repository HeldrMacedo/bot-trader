useEffect(() => {

    const listenerId = derivService.observerInstance.on("message", async (data) => {
     
      if (data.msg_type === "transaction" || data.msg_type === "proposal_open_contract" || data.msg_type === "buy") {
        console.log("Received message:", data);
      }

      if (isPaused) return

      if (
        data.msg_type === "transaction" &&
        data.transaction.action === "buy"
      ) {
        if (!forgetId) {
          setForgetId(data.subscription.id);
        }

        const contractId = data.transaction.contract_id;
        
        const  teste = await derivService.subscribe({
          proposal_open_contract: 1,
          contract_id: contractId,
        });

        subscribeIdProposal.current = teste.subscription.id;
      }

      if (botConfig.deveEntrarNaContaReal() && 
      !botConfig.pauseTimeActiveAndQuantityLossZero &&
      data.msg_type === "proposal_open_contract" &&
      data.proposal_open_contract.status === "open"
      ) {
        setBotConfig((prev) => {
          const newConfig = new BotConfig(prev);
          newConfig.isRealAccount = true;
          newConfig.pauseTimeActiveAndQuantityLossZero = true;
          return newConfig;
        });

        const payload = {
          buy: 1,
          price: botConfig.currentStake,
          parameters: {
            amount: botConfig.currentStake  ,
            //app_markup_percentage: "3",
            basis: "stake",
            contract_type:  data.proposal_open_contract.contract_type,
            currency: "USD",
            duration: 1,
            duration_unit: "t",
            symbol:  data.proposal_open_contract.underlying || data.transaction.symbol,
            ...(data.proposal_open_contract.barrier && { barrier: data.proposal_open_contract.barrier }),
          },
        };
        setPayloadEntry(payload);
        const response = await derivService.send(payload);
        if (response.error) {
          toast.error(response.error.message);
          return;
        }

        const contractId = response.buy.contract_id;
        contractTypeIdRealRef.current = contractId;
        return;
      } 

      if (
        data.msg_type === "proposal_open_contract" &&
        (data.proposal_open_contract.status === "won" ||
          data.proposal_open_contract.status === "lost")
      ) {

        if (botConfig.deveEntrarNaContaReal() && (contractTypeIdRealRef.current !== data.proposal_open_contract.contract_id)) {
          return;
        }
          


        const isWin = data.proposal_open_contract.profit > 0;
        const profit = data.proposal_open_contract.profit;
        const stake = data.proposal_open_contract.buy_price;
        
         

        const newTrade = {
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
          contador: contatador,
        };
        setContatador((prev) => prev + 1);
        setListTrade((prev) => [newTrade, ...prev]);

        if (botConfig.isRealAccount) {
          setListTradeReal((prev) => [newTrade, ...prev]);
        }        

        // Atualizar estatísticas gerais
        //setQuantityTrade(prev => prev + 1);

        if (isWin) {
          setQuantityWin((prev) => prev + 1);

          // Processar vitória na configuração do bot
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
        } else {
          setQuantityLoss((prev) => prev + 1);

          // Processar perda na configuração do bot
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
        }

        if (botConfig.shouldPause(isWin) && botConfig.quantityLoss <= 0) {
          setBotConfig(prev => {
            const newConfig = new BotConfig(prev);
            newConfig.isRealAccount = true;
            return newConfig;
          });
        }

        if (botConfig.shouldPause(isWin) && botConfig.isRealAccount) {
          setIsPaused(true);
          isPausedRef.current = true;
          handleStopBot();

          if (!botConfig.deveEntrarNaContaReal()) {
            setBotConfig(prev => {
              const newConfig = new BotConfig(prev);
              newConfig.isRealAccount = false; // Aqui alteramos o estado
              return newConfig;
            });
          };
          

          // Calcular tempo final
          const endTime = Date.now() + botConfig.pauseTime * 1000;

          // Iniciar contagem regressiva
          const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            setRemainingTime(Math.ceil(remaining / 1000));
            console.log("Tempo restante:", remaining);
            if (remaining <= 0) {
              clearInterval(interval);
              setIsPaused(false);
              isPausedRef.current = false;
            }
          }, 1000);

          setCountdownInterval(interval);

          // Configurar retomada automática
          const timer = setTimeout(() => {
            handleStartBot();
            setIsPaused(false);
            isPausedRef.current = false;
            setRemainingTime(0);
            console.log("Retomando bot...");
            clearInterval(interval);

          }, botConfig.pauseTime * 1000);

          setPauseTimer(timer);

          return;
        }

        
        console.log("IS PAUSED REF", isPausedRef.current);
        //FAZ A COMPRA NA CONTA REAL
        if (botConfig.isRealAccount) {
          console.log("Entrou na conta real");
          const response = await derivService.send(payloadEntry);
          if (response.error) {
            toast.error(response.error.message);
            return;
          }
          const contractId = response.buy.contract_id;
          contractTypeIdRealRef.current = contractId;
        }
      }
    });

    return () => {
      derivService.observerInstance.removeById(listenerId);
      if (pauseTimer) clearTimeout(pauseTimer);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [botConfig, isPaused]);