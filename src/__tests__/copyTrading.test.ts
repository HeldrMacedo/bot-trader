import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { CopyTradingService } from '../app/services/copyTradingService';


// Mocks para as dependências do CopyTradingService
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('../app/services/wsListener', () => {
  return {
    WsListener: class extends EventEmitter {
      connect = mockConnect;
      disconnect = mockDisconnect;
    }
  };
});

const mockConnectToMaster = vi.fn().mockResolvedValue(undefined);
const mockTradeExecutorDisconnect = vi.fn();
const mockSetDuplicateProtection = vi.fn();
const mockSetCurrency = vi.fn();
const mockSetAppMarkupPercentage = vi.fn();

vi.mock('../app/services/tradeExecutor', () => {
  return {
    TradeExecutor: class extends EventEmitter {
      connectToMaster = mockConnectToMaster;
      disconnect = mockTradeExecutorDisconnect;
      setDuplicateProtection = mockSetDuplicateProtection;
      setCurrency = mockSetCurrency;
      setAppMarkupPercentage = mockSetAppMarkupPercentage;
    }
  };
});

const mockSetEnabled = vi.fn();
const mockProcessSignal = vi.fn().mockResolvedValue(undefined);

vi.mock('../app/services/signalProcessor', () => {
  return {
    SignalProcessor: class {
      setEnabled = mockSetEnabled;
      processSignal = mockProcessSignal;
    }
  };
});

describe('CopyTradingService - Fluxo de Execução e Duplicadas', () => {
  let service: CopyTradingService;
  let mockWsListener: any;
  let mockTradeExecutor: any;
  let mockSignalProcessor: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const configure = {
      quantityLoss: 2,
      initialValue: 0.35,
      stakeMultiple: 1.0, // Multiplicador de martingale: 1.0 significa dobrar (1 + 1 = 2x)
      stopLoss: 10,
      stopWin: 10,
      pauseTime: 0,
      pauseTimeLoss: false,
      pauseTimeWin: false,
    };

    service = new CopyTradingService('demo_token', 'real_token', 'session_id', configure);
    
    // Acessa as instâncias mockadas criadas no construtor
    mockWsListener = (service as any).wsListener;
    mockTradeExecutor = (service as any).tradeExecutor;
    mockSignalProcessor = (service as any).signalProcessor;
  });

  it('deve gerenciar corretamente consecutiveLosses e entrar na conta real após 2 losses na demo', async () => {
    // Inicia o serviço
    await service.start();

    // 1. Recebe transação de LOSS na demo (delta/amount = 0 ou negativo)
    mockWsListener.emit('sellTransaction', { contract_id: 1001, amount: 0 });
    let stats = service.getStats();
    expect(stats.trading.consecutiveLosses).toBe(1);

    // 2. Recebe outra transação de LOSS na demo
    mockWsListener.emit('sellTransaction', { contract_id: 1002, amount: 0 });
    stats = service.getStats();
    expect(stats.trading.consecutiveLosses).toBe(2);

    // 3. Recebe um sinal de compra da conta demo (sinal de entrada)
    const signal = {
      contractId: 1003,
      symbol: '1HZ100V',
      contractType: 'CALL',
      duration: 1,
      durationUnit: 't',
      amount: 0.35,
    };

    mockWsListener.emit('tradeSignal', signal);

    // Verifica se onTrade foi ativado
    stats = service.getStats();
    expect(stats.trading.onTrade).toBe(true);
    expect(stats.trading.isInRealMode).toBe(true);
    expect(mockSignalProcessor.processSignal).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: 1003, amount: 0.35 })
    );
  });

  it('deve ignorar sinais da demo quando onTrade for verdadeiro (bloqueio de sobreposição)', async () => {
    await service.start();

    // Força consecutiveLosses = 2 para permitir trade
    (service as any).consecutiveLosses = 2;

    const signal = {
      contractId: 1003,
      symbol: '1HZ100V',
      contractType: 'CALL',
      duration: 1,
      durationUnit: 't',
      amount: 0.35,
    };

    // Primeiro sinal entra
    mockWsListener.emit('tradeSignal', signal);
    let stats = service.getStats();
    expect(stats.trading.onTrade).toBe(true);

    // Segundo sinal recebido enquanto o primeiro ainda está rodando (onTrade = true)
    mockWsListener.emit('tradeSignal', { ...signal, contractId: 1004 });
    
    // Deve ignorar o sinal
    expect(mockSignalProcessor.processSignal).toHaveBeenCalledTimes(1);
    
    // Verifica se os erros registram o bloqueio
    stats = service.getStats();
    const errorBlock = stats.errors.errors.find((e: any) => e.title === 'Trade Bloqueado');
    expect(errorBlock).toBeDefined();
  });

  it('deve ignorar eventos de transações reais duplicados para o mesmo contrato (bug de entrada dupla)', async () => {
    await service.start();

    // Prepara o estado: consecutiveLosses = 2, modo real ativo, executando trade
    (service as any).consecutiveLosses = 2;
    (service as any).onTrade = true;
    (service as any).contract_id = 1003; // demo contract id
    (service as any).isInRealMode = true;

    // Simula a primeira resposta de transação real (ex: status lost)
    const realTxResponse = {
      contract_id: 2560441779, // real contract id
      profit: '-0.35',
      status: 'lost',
    };

    // Envia o primeiro evento de transação finalizada
    mockTradeExecutor.emit('transaction', realTxResponse);

    let stats = service.getStats();
    expect(stats.trading.onTrade).toBe(false); // Liberou o guard
    expect(stats.trading.martingaleLevel).toBe(1); // Incrementou o martingale level para 1
    expect(stats.trading.currentStake).toBe(0.70); // Stake passa a ser 0.35 * 2 = 0.70
    expect(stats.realTransactions.length).toBe(1);

    // Simula o segundo evento duplicado para o MESMO contrato ID (bug do Deriv API)
    mockTradeExecutor.emit('transaction', realTxResponse);

    stats = service.getStats();
    // O nível de martingale e a stake NÃO devem ter sido alterados novamente!
    expect(stats.trading.martingaleLevel).toBe(1); 
    expect(stats.trading.currentStake).toBe(0.70);
    expect(stats.realTransactions.length).toBe(1); // Não deve duplicar no histórico
  });
});
