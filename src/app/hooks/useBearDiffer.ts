import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BearDifferEngine,
  createDifferEngine,
  EngineState,
} from '../services/BearDifferEngine';
import { DerivService } from '../services/DerivService';
import { DifferConfig, PIP_FALLBACK } from '../services/beardiffer.types';

export function extractDifferDigit(price: number, symbol: string): number | null {
  const pip = PIP_FALLBACK[symbol] ?? 2;
  const priceStr = price.toFixed(pip);
  const lastChar = priceStr.slice(-1);
  const digit = Number(lastChar);
  return isNaN(digit) ? null : digit;
}

export function propKey(sym: string, barrier: number, stake: number): string {
  return `${sym}|DIGITDIFF|${barrier}|${stake.toFixed(2)}`;
}

export function useBearDiffer() {
  const engineRef = useRef<BearDifferEngine>(createDifferEngine());
  const [state, setState] = useState<EngineState>(engineRef.current.getState());
  const [config, setConfigState] = useState<DifferConfig>(engineRef.current.getConfig());
  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);

  const activeAccount = accountInfo?.tokens?.find(
    (t: any) => t.token === accountInfo.activeToken
  );

  // Proposal Keeper para compra rápida ⚡
  // Propostas ficam indexadas pela chave sym|DIGITDIFF|barreira|stake. O
  // DerivService é um singleton compartilhado com os outros bots, então só a
  // chave devolvida no passthrough distingue uma proposta nossa da de outro
  // módulo — e o preço da proposta é amarrado à stake, de modo que um degrau
  // de martingale invalida a proposta anterior.
  const propsRef = useRef<Map<string, string | null>>(new Map());
  const pendingTradeRef = useRef<{ sym: string; digit: number; t0: number } | null>(null);
  const openContractsRef = useRef<Map<number, { sym: string; digit: number; logicId?: string }>>(
    new Map()
  );
  const simPendingOrderRef = useRef<{
    sym: string;
    digit: number;
    stake: number;
    logicId?: string;
  } | null>(null);

  // Loss Virtual
  const [vlossState, setVlossState] = useState<{
    armed: boolean;
    sym: string;
    targetDigit: number;
    targetLosses: number;
    seenLosses: number;
    ticksChecked: number;
    logicId?: string;
  }>({
    armed: false,
    sym: '',
    targetDigit: 0,
    targetLosses: 1,
    seenLosses: 0,
    ticksChecked: 0,
  });

  // Alvo em foco na tela, mantido aquecido pelo proposal keeper
  const warmTargetRef = useRef<{ sym: string; digit: number } | null>(null);
  const vlossRef = useRef(vlossState);
  vlossRef.current = vlossState;

  const setWarmTarget = useCallback((sym: string | null, digit?: number) => {
    warmTargetRef.current =
      sym && digit !== undefined ? { sym, digit } : null;
  }, []);

  const updateConfig = useCallback((newConfig: Partial<DifferConfig>) => {
    engineRef.current.updateConfig(newConfig);
    setConfigState(engineRef.current.getConfig());
  }, []);

  // Troca de Conta (Real vs Demo)
  const switchAccount = useCallback(
    async (isVirtual: boolean) => {
      const derivService = DerivService.getInstance();
      const targetToken = accountInfo?.tokens?.find((t: any) => t.is_virtual === isVirtual)?.token;
      // Sem token não há troca. Sair em silêncio faria a interface anunciar
      // sucesso numa conta que continua a mesma.
      if (!targetToken) {
        throw new Error(
          `Nenhuma conta ${isVirtual ? 'demo' : 'real'} disponível nesta sessão.`
        );
      }
      await derivService.switchAccount(targetToken);
    },
    [accountInfo]
  );

  // Inscrição em Mercados
  const subscribeToMarkets = useCallback(() => {
    const derivService = DerivService.getInstance();
    const st = engineRef.current.getState();
    st.markets
      .filter((m) => m.on)
      .forEach((m) => {
        derivService.subscribe({
          ticks_history: m.sym,
          // 5000 é o teto da Deriv e o valor do legado: abaixo disso o
          // laboratório nunca alcança a amostra mínima de 2000 ticks.
          count: 5000,
          end: 'latest',
          style: 'ticks',
          subscribe: 1,
        }).catch(() => {});
      });
  }, []);

  // Execução de Trade
  const executeTrade = useCallback(
    async (sym: string, digit: number, analysisTickCount?: number, logicId?: string) => {
      const engine = engineRef.current;

      // Trava de ticks vencidos: entre a análise e a confirmação o mercado
      // pode ter andado. Executar com leitura vencida era um furo silencioso.
      if (analysisTickCount !== undefined) {
        const stale = engine.getMarketData(sym).tickCount - analysisTickCount;
        if (stale > engine.getConfig().maxStale) {
          engine.addLog(
            `Entrada abortada: ${stale} ticks passaram desde a análise (limite ${engine.getConfig().maxStale}).`,
            'dn'
          );
          return;
        }
      }

      // Uma operação por vez. Sem esta trava a segunda ordem sobrescreve a
      // primeira, que desaparece sem liquidar.
      if (engine.isTradeLocked()) {
        engine.addLog(`Ignorado: já existe uma operação aberta em ${sym}.`, 'am');
        return;
      }

      const guardErr = engine.checkGuards();
      if (guardErr) {
        engine.addLog(`Bloqueado: ${guardErr}`, 'dn');
        return;
      }

      const cfg = engine.getConfig();
      // A lógica que gerou o alvo decide papel ou real: é a janela dela que
      // está sendo medida, não a da lógica que estiver liderando agora.
      const prep = engine.prepareTrade(sym, digit, logicId);
      engine.setTradeLock(true);
      // O intervalo mínimo conta a partir da última ordem enviada, venha do
      // automático ou de um clique: as duas vão para a mesma conta.
      engine.noteEntryFired(logicId);

      if (prep.isPaper) {
        engine.addLog(`[SIM] Operação enviada em ${sym} ≠${digit} · $${prep.stake}`, 'nt');
        // O contrato fica aberto até chegar o próximo tick deste mercado. É o
        // listener de 'deriv.tick' que liquida — um Digit Differ só se resolve
        // na cotação seguinte, nunca no tick que originou a análise.
        simPendingOrderRef.current = { sym, digit, stake: prep.stake, logicId };
        return;
      }

      // Modo Real
      const derivService = DerivService.getInstance();
      pendingTradeRef.current = { sym, digit, t0: Date.now() };

      try {
        let buyResponse: any = null;

        // Só usa a proposta pré-aberta cuja chave bate exatamente com esta
        // ordem: mesmo mercado, mesma barreira e mesma stake.
        const warmId = cfg.fastExec
          ? propsRef.current.get(propKey(sym, digit, prep.stake))
          : null;

        if (warmId) {
          buyResponse = await derivService.send({
            buy: warmId,
            price: prep.stake,
          });
          // Uma proposta só serve para uma compra
          propsRef.current.clear();
        } else {
          // Compra direta com parâmetros
          buyResponse = await derivService.send({
            buy: 1,
            price: prep.stake,
            parameters: {
              amount: prep.stake,
              basis: 'stake',
              contract_type: 'DIGITDIFF',
              currency: 'USD',
              duration: 1,
              duration_unit: 't',
              // A API Options nomeia o ativo como `underlying_symbol` e
              // declara `additionalProperties: false`: o `symbol` do v3
              // legado derruba a ordem com "Input validation failed".
              underlying_symbol: sym,
              barrier: String(digit),
            },
          });
        }

        if (buyResponse?.buy?.contract_id) {
          const contractId = Number(buyResponse.buy.contract_id);
          openContractsRef.current.set(contractId, { sym, digit, logicId });
          derivService.subscribe({
            proposal_open_contract: 1,
            contract_id: contractId,
          }).catch(() => {});
          engine.addLog(`▶ Ordem Differ enviada em ${sym} ≠${digit} · $${prep.stake}`, 'nt');
        } else {
          engine.addLog(`Erro ao enviar ordem: ${buyResponse?.error?.message || 'Falha na Deriv'}`, 'dn');
          // Nenhum contrato foi aberto: liberar a trava, senão o bot congela
          engine.setTradeLock(false);
        }
      } catch (err: any) {
        engine.addLog(`Erro na compra: ${err?.message || err}`, 'dn');
        engine.setTradeLock(false);
      }
    },
    []
  );

  // Armar Loss Virtual
  const armVirtualLoss = useCallback(
    (sym: string, targetDigit: number, targetLosses: number, logicId?: string) => {
      setVlossState({
        armed: true,
        sym,
        targetDigit,
        targetLosses,
        seenLosses: 0,
        ticksChecked: 0,
        logicId,
      });
      engineRef.current.addLog(
        `Loss Virtual armado em ${sym} ≠${targetDigit} (aguardando ${targetLosses} loss(es))`,
        'am'
      );
    },
    []
  );

  const cancelVirtualLoss = useCallback(() => {
    setVlossState((prev) => ({ ...prev, armed: false }));
    engineRef.current.addLog('Loss Virtual cancelado.', 'nt');
  }, []);

  // Exportar CSV
  const exportCSV = useCallback(() => {
    const trades = engineRef.current.getState().trades;
    if (trades.length === 0) return;
    const header = 'Horário,Mercado,Tipo,Alvo,Dígito Saída,Stake,Lucro,Resultado,Modo\n';
    const rows = trades
      .map(
        (t) =>
          `${t.time},${t.sym},DIFFER,≠${t.digit},${t.exitDigit ?? ''},${t.stake},${t.profit},${t.result},${t.paper ? 'SIM' : 'REAL'}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bear-bot-differ-trades-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Listener da Engine e DerivService
  useEffect(() => {
    const engine = engineRef.current;
    const derivService = DerivService.getInstance();

    const unsub = engine.subscribe((newState) => {
      setState(newState);
      setConfigState(engine.getConfig());
    });

    const unsubAuto = engine.onAutoTrade((sym, digit, logicId) => {
      executeTrade(sym, digit, undefined, logicId);
    });

    const checkConn = () => {
      setIsConnected(derivService.isMarketConnected);
    };
    checkConn();

    const onOpen = derivService.observerInstance.on('open', checkConn);
    const onClose = derivService.observerInstance.on('close', checkConn);
    const onMarketOpen = derivService.observerInstance.on('market.open', () => {
      checkConn();
      subscribeToMarkets();
    });

    // Ticks em streaming
    const onTick = derivService.observerInstance.on('deriv.tick', (data: any) => {
      if (data?.tick) {
        const { symbol, quote } = data.tick;
        const lastDigit = extractDifferDigit(quote, symbol);
        if (lastDigit !== null) {
          // Resolver trade de simulação pendente com o próximo tick recebido
          if (simPendingOrderRef.current && simPendingOrderRef.current.sym === symbol) {
            const pending = simPendingOrderRef.current;
            simPendingOrderRef.current = null;
            const isLoss = lastDigit === pending.digit;
            const profit = isLoss
              ? -pending.stake
              : +(pending.stake * (engine.getState().payout - 1)).toFixed(2);
            engine.settleContract(
              profit,
              isLoss,
              symbol,
              pending.digit,
              lastDigit,
              undefined,
              pending.logicId
            );
          }

          engine.processTick(symbol, lastDigit);

          // Conferência de Loss Virtual armado
          setVlossState((prev) => {
            if (!prev.armed || prev.sym !== symbol) return prev;
            const isLoss = lastDigit === prev.targetDigit;
            const newSeen = prev.seenLosses + (isLoss ? 1 : 0);
            const newChecked = prev.ticksChecked + 1;

            if (newSeen >= prev.targetLosses) {
              // Dispara ordem real
              let tradeDigit = prev.targetDigit;
              let tradeLogicId = prev.logicId;
              if (engine.getConfig().vlossRepick) {
                // O repick segue a fonte do sinal configurada, e não mais
                // sempre uma lógica: com fonte 'motor2' a ordem tem de sair
                // pelo critério do motor, que é o que a tela mostra.
                const repick = engine.resolveTarget(symbol);
                if (!repick.reason && repick.digit !== null) {
                  tradeDigit = repick.digit;
                  tradeLogicId = repick.logicId;
                }
              }

              // Conferência do filtro de exaustão antes de disparar
              if (engine.getConfig().exFilter) {
                const exh = engine.getExhaustion(symbol, tradeDigit);
                if (exh && !exh.ok) {
                  engine.addLog(
                    `Loss virtual em ${symbol} ≠${tradeDigit} cancelado: dígito perdeu exaustão.`,
                    'am'
                  );
                  return { ...prev, armed: false };
                }
              }

              if (engine.getConfig().exOnlyLosers) {
                if (engine.getLoserCount(symbol, tradeDigit) === 0) {
                  engine.addLog(
                    `Loss virtual em ${symbol} ≠${tradeDigit} cancelado: dígito nunca deu loss.`,
                    'am'
                  );
                  return { ...prev, armed: false };
                }
              }

              executeTrade(symbol, tradeDigit, undefined, tradeLogicId);
              return { ...prev, armed: false, seenLosses: newSeen, ticksChecked: newChecked };
            }
            return { ...prev, seenLosses: newSeen, ticksChecked: newChecked };
          });
        }
      }
    });

    // Histórico inicial de ticks
    const onHistory = derivService.observerInstance.on('deriv.history' as any, (data: any) => {
      if (data?.history && data?.echo_req?.ticks_history) {
        const sym = data.echo_req.ticks_history;
        const prices: number[] = data.history.prices || [];
        const digits = prices
          .map((p) => extractDifferDigit(p, sym))
          .filter((d): d is number => d !== null);
        engine.setHistory(sym, digits);
      }
    });

    // Liquidação de contrato
    const onPoc = derivService.observerInstance.on('deriv.proposal_open_contract', (data: any) => {
      const poc = data?.proposal_open_contract;
      if (poc && (poc.is_sold || poc.is_expired || poc.status === 'won' || poc.status === 'lost')) {
        const cid = Number(poc.contract_id);
        const open = openContractsRef.current.get(cid);
        if (open) {
          openContractsRef.current.delete(cid);
          const profit = Number(poc.profit);
          const isLoss = profit < 0;
          let exitDigit: number | null = null;
          if (poc.exit_spot !== undefined) {
            exitDigit = Number(String(poc.exit_spot).slice(-1));
          }
          engine.settleContract(
            profit,
            isLoss,
            open.sym,
            open.digit,
            exitDigit,
            poc.audit_details,
            open.logicId
          );
        }
      }
    });

    // Resposta de proposal pré-aberta
    const onProposal = derivService.observerInstance.on('message', (data: any) => {
      if (data?.msg_type !== 'proposal' || !data.proposal?.id) return;

      // Aceita apenas propostas abertas por este módulo. Sem essa checagem,
      // uma proposta de outro bot no mesmo socket seria comprada no lugar da
      // nossa, e o payout dela corromperia o ponto de equilíbrio do Differ.
      const pkey = data.passthrough?.pkey;
      if (!pkey || !propsRef.current.has(pkey)) return;

      propsRef.current.set(pkey, data.proposal.id);
      if (data.proposal.payout && data.proposal.ask_price) {
        engine.setPayout(data.proposal.payout / data.proposal.ask_price);
      }
    });

    // Atualização de Conta
    const onAccount = derivService.observerInstance.on('account.update', (data: any) => {
      setAccountInfo(data);
    });

    const stor = derivService.getStorageDerivAccount();
    if (stor && stor.length > 0) {
      setAccountInfo(stor[0]);
    }

    subscribeToMarkets();

    return () => {
      unsub();
      unsubAuto();
      derivService.observerInstance.removeById(onOpen);
      derivService.observerInstance.removeById(onClose);
      derivService.observerInstance.removeById(onMarketOpen);
      derivService.observerInstance.removeById(onTick);
      derivService.observerInstance.removeById(onHistory);
      derivService.observerInstance.removeById(onPoc);
      derivService.observerInstance.removeById(onProposal);
      derivService.observerInstance.removeById(onAccount);
    };
  }, [subscribeToMarkets, executeTrade]);

  const resetSession = useCallback(() => {
    engineRef.current.resetSession();
  }, []);

  const ensureProposal = useCallback(
    (sym: string, barrier: number, stake: number) => {
      const derivService = DerivService.getInstance();
      const cur = activeAccount?.currency || 'USD';
      const key = propKey(sym, barrier, stake);
      if (propsRef.current.has(key)) return;

      // Registra a chave antes de enviar: é ela que autoriza a resposta a ser
      // aceita quando voltar pelo passthrough.
      propsRef.current.set(key, null);
      derivService
        .send({
          proposal: 1,
          subscribe: 1,
          amount: +stake.toFixed(2),
          basis: 'stake',
          contract_type: 'DIGITDIFF',
          currency: cur,
          duration: 1,
          duration_unit: 't',
          underlying_symbol: sym,
          barrier: String(barrier),
          passthrough: { pkey: key },
        })
        .catch((err) => {
          console.error('Error subscribing to proposal:', err);
        });
    },
    [activeAccount]
  );

  // Vigilância contínua dos mercados, a cada 5s. Roda no hook e não na aba:
  // no legado o scanner era global, e alertas só apareciam se a aba
  // Vigilância estivesse aberta seriam alertas que ninguém vê.
  useEffect(() => {
    const id = setInterval(() => {
      engineRef.current.runWatch();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Proposal keeper: mantém uma proposta subscrita e quente para o alvo em
  // foco, renovada a cada 4s como na 7.7.9. Na hora de operar a compra sai
  // pelo id já pronto, sem a ida-e-volta do cálculo de preço.
  useEffect(() => {
    const id = setInterval(() => {
      const engine = engineRef.current;
      if (!engine.getConfig().fastExec) return;

      const stake = engine.getState().curStake;
      const target = warmTargetRef.current;
      if (target) ensureProposal(target.sym, target.digit, stake);

      const v = vlossRef.current;
      if (v.armed) ensureProposal(v.sym, v.targetDigit, stake);
    }, 4000);
    return () => clearInterval(id);
  }, [ensureProposal]);

  return {
    engine: engineRef.current,
    state,
    config,
    updateConfig,
    isConnected,
    accountInfo,
    activeAccount,
    switchAccount,
    executeTrade,
    resetSession,
    ensureProposal,
    setWarmTarget,
    armVirtualLoss,
    cancelVirtualLoss,
    vlossState,
    exportCSV,
  };
}
