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
  const proposalIdRef = useRef<string | null>(null);
  const proposalKeyRef = useRef<string | null>(null);
  const pendingTradeRef = useRef<{ sym: string; digit: number; t0: number } | null>(null);
  const openContractsRef = useRef<Map<number, { sym: string; digit: number }>>(new Map());
  const simPendingOrderRef = useRef<{ sym: string; digit: number; stake: number } | null>(null);

  // Loss Virtual
  const [vlossState, setVlossState] = useState<{
    armed: boolean;
    sym: string;
    targetDigit: number;
    targetLosses: number;
    seenLosses: number;
    ticksChecked: number;
  }>({
    armed: false,
    sym: '',
    targetDigit: 0,
    targetLosses: 1,
    seenLosses: 0,
    ticksChecked: 0,
  });

  const updateConfig = useCallback((newConfig: Partial<DifferConfig>) => {
    engineRef.current.updateConfig(newConfig);
    setConfigState(engineRef.current.getConfig());
  }, []);

  // Troca de Conta (Real vs Demo)
  const switchAccount = useCallback(
    async (isVirtual: boolean) => {
      const derivService = DerivService.getInstance();
      const targetToken = accountInfo?.tokens?.find((t: any) => t.is_virtual === isVirtual)?.token;
      if (targetToken) {
        await derivService.switchAccount(targetToken);
      }
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
          count: 1000,
          end: 'latest',
          style: 'ticks',
          subscribe: 1,
        }).catch(() => {});
      });
  }, []);

  // Execução de Trade
  const executeTrade = useCallback(
    async (sym: string, digit: number) => {
      const engine = engineRef.current;
      const guardErr = engine.checkGuards();
      if (guardErr) {
        engine.addLog(`Bloqueado: ${guardErr}`, 'dn');
        return;
      }

      const cfg = engine.getConfig();
      const prep = engine.prepareTrade(sym, digit);

      if (prep.isPaper) {
        engine.addLog(`[SIM] Operação enviada em ${sym} ≠${digit} · $${prep.stake}`, 'nt');
        simPendingOrderRef.current = { sym, digit, stake: prep.stake };
        setTimeout(() => {
          if (simPendingOrderRef.current && simPendingOrderRef.current.sym === sym) {
            const pending = simPendingOrderRef.current;
            simPendingOrderRef.current = null;
            const digits = engine.getDigits(sym);
            const nextDigit =
              digits.length > 0 ? digits[digits.length - 1] : Math.floor(Math.random() * 10);
            const isLoss = nextDigit === pending.digit;
            const profit = isLoss
              ? -pending.stake
              : +(pending.stake * (engine.getState().payout - 1)).toFixed(2);
            engine.settleContract(profit, isLoss, sym, pending.digit, nextDigit);
          }
        }, 800);
        return;
      }

      // Modo Real
      const derivService = DerivService.getInstance();
      pendingTradeRef.current = { sym, digit, t0: Date.now() };

      try {
        let buyResponse: any = null;

        // Se tiver proposta pré-aberta pronta compatível, compra pelo proposal_id
        if (cfg.fastExec && proposalIdRef.current) {
          buyResponse = await derivService.send({
            buy: proposalIdRef.current,
            price: prep.stake,
          });
          proposalIdRef.current = null;
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
              symbol: sym,
              barrier: String(digit),
            },
          });
        }

        if (buyResponse?.buy?.contract_id) {
          const contractId = Number(buyResponse.buy.contract_id);
          openContractsRef.current.set(contractId, { sym, digit });
          derivService.subscribe({
            proposal_open_contract: 1,
            contract_id: contractId,
          }).catch(() => {});
          engine.addLog(`▶ Ordem Differ enviada em ${sym} ≠${digit} · $${prep.stake}`, 'nt');
        } else {
          engine.addLog(`Erro ao enviar ordem: ${buyResponse?.error?.message || 'Falha na Deriv'}`, 'dn');
        }
      } catch (err: any) {
        engine.addLog(`Erro na compra: ${err?.message || err}`, 'dn');
      }
    },
    []
  );

  // Armar Loss Virtual
  const armVirtualLoss = useCallback((sym: string, targetDigit: number, targetLosses: number) => {
    setVlossState({
      armed: true,
      sym,
      targetDigit,
      targetLosses,
      seenLosses: 0,
      ticksChecked: 0,
    });
    engineRef.current.addLog(`Loss Virtual armado em ${sym} ≠${targetDigit} (aguardando ${targetLosses} loss(es))`, 'am');
  }, []);

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

    const unsubAuto = engine.onAutoTrade((sym, digit) => {
      executeTrade(sym, digit);
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
            engine.settleContract(profit, isLoss, symbol, pending.digit, lastDigit);
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
              if (engine.getConfig().vlossRepick) {
                const repick = engine.deepScan(engine.getConfig().onceLogic);
                if (repick && repick.sym === symbol) tradeDigit = repick.digit;
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

              executeTrade(symbol, tradeDigit);
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
          engine.settleContract(profit, isLoss, open.sym, open.digit, exitDigit, poc.audit_details);
        }
      }
    });

    // Resposta de proposal pré-aberta
    const onProposal = derivService.observerInstance.on('message', (data: any) => {
      if (data?.msg_type === 'proposal' && data.proposal?.id) {
        proposalIdRef.current = data.proposal.id;
        if (data.proposal.payout && data.proposal.ask_price) {
          engine.setPayout(data.proposal.payout / data.proposal.ask_price);
        }
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
      const key = `${sym}_${barrier}_${stake}`;
      if (proposalKeyRef.current === key && proposalIdRef.current) return;

      proposalKeyRef.current = key;
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
          symbol: sym,
          barrier: String(barrier),
        })
        .catch((err) => {
          console.error('Error subscribing to proposal:', err);
        });
    },
    [activeAccount]
  );

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
    armVirtualLoss,
    cancelVirtualLoss,
    vlossState,
    exportCSV,
  };
}
