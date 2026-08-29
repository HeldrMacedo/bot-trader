// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createEngine } from '../app/services/BearBot2Engine';
import { useBearBot } from '../app/hooks/useBearBot2';

// Mock de AudioContext
class MockAudioContext {
  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      type: 'sine',
      frequency: { value: 440 }
    };
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    };
  }
  destination = {};
  currentTime = 0;
  state = 'running';
  resume = vi.fn();
}
(window as any).AudioContext = MockAudioContext;

// Mock do DerivService
let registeredListeners: Record<string, Function[]> = {};
const mockSend = vi.fn().mockResolvedValue({});
const mockSubscribe = vi.fn().mockResolvedValue({ subscription: { id: 'test_sub' } });
const mockSwitchAccount = vi.fn().mockResolvedValue({});
const mockGetStorageDerivAccount = vi.fn().mockReturnValue([
  {
    activeToken: 'vrtc_token',
    tokens: [
      { token: 'vrtc_token', is_virtual: true, balance: 10000 },
      { token: 'real_token', is_virtual: false, balance: 0 }
    ]
  }
]);

const mockOn = vi.fn().mockImplementation((event: string, callback: Function) => {
  if (!registeredListeners[event]) registeredListeners[event] = [];
  registeredListeners[event].push(callback);
  return `${event}_${registeredListeners[event].length}`;
});

const mockRemoveById = vi.fn();

vi.mock('../app/services/DerivService', () => {
  return {
    DerivService: {
      getInstance: () => ({
        send: mockSend,
        subscribe: mockSubscribe,
        switchAccount: mockSwitchAccount,
        getStorageDerivAccount: mockGetStorageDerivAccount,
        isMarketConnected: true,
        observerInstance: {
          on: mockOn,
          removeById: mockRemoveById,
        },
      }),
    },
  };
});

describe('BearBot2Engine - Quick Buy (Compra Rápida)', () => {
  it('gerar payload padrão com parameters quando nenhuma proposta for fornecida', () => {
    const engine = createEngine({
      paperMode: false,
      mode: 'over',
      digit: 5,
      stake: 0.35,
      activeSym: 'R_100',
    });

    const prep = engine.prepareTrade('over');
    expect(prep).not.toBeNull();
    expect(prep?.isPaper).toBe(false);
    expect(prep?.usedProposal).toBe(false);
    expect(prep?.payload).toEqual({
      buy: 1,
      price: 0.35,
      parameters: {
        amount: 0.35,
        basis: 'stake',
        contract_type: 'DIGITOVER',
        currency: 'USD',
        duration: 1,
        duration_unit: 't',
        underlying_symbol: 'R_100',
        barrier: '5',
      },
    });
  });

  it('gerar payload de compra rápida { buy: proposalId, price: stake } quando proposta estiver disponível', () => {
    const engine = createEngine({
      paperMode: false,
      mode: 'over',
      digit: 5,
      stake: 1.5,
      activeSym: 'R_100',
    });

    const proposalMap = new Map<string, string>();
    proposalMap.set('DIGITOVER|5', 'prop_over_5_xyz');

    const prep = engine.prepareTrade('over', proposalMap);
    expect(prep).not.toBeNull();
    expect(prep?.isPaper).toBe(false);
    expect(prep?.usedProposal).toBe(true);
    expect(prep?.payload).toEqual({
      buy: 'prop_over_5_xyz',
      price: 1.5,
    });
  });

  it('gerar payload de compra rápida para modo differ e under', () => {
    const engineUnder = createEngine({
      paperMode: false,
      mode: 'under',
      digit: 3,
      stake: 2.0,
      activeSym: 'R_75',
    });

    const proposalsUnder = new Map<string, string>([['DIGITUNDER|3', 'prop_under_3']]);
    const prepUnder = engineUnder.prepareTrade('under', proposalsUnder);
    expect(prepUnder?.usedProposal).toBe(true);
    expect(prepUnder?.payload).toEqual({
      buy: 'prop_under_3',
      price: 2.0,
    });

    const engineDiffer = createEngine({
      paperMode: false,
      mode: 'differ',
      digit: 7,
      stake: 0.5,
      activeSym: 'R_100',
    });

    const proposalsDiffer = new Map<string, string>([['DIGITDIFF|7', 'prop_diff_7']]);
    const prepDiffer = engineDiffer.prepareTrade('differ', proposalsDiffer);
    expect(prepDiffer?.usedProposal).toBe(true);
    expect(prepDiffer?.payload).toEqual({
      buy: 'prop_diff_7',
      price: 0.5,
    });
  });

  it('gerar payload de compra rápida para combo quando ambas as propostas estiverem disponíveis', () => {
    const engine = createEngine({
      paperMode: false,
      mode: 'combo',
      comboOver: 5,
      comboUnder: 4,
      stake: 1.0,
      activeSym: 'R_100',
    });

    const proposalMap = new Map<string, string>([
      ['DIGITOVER|5', 'prop_combo_over_5'],
      ['DIGITUNDER|4', 'prop_combo_under_4'],
    ]);

    const prep = engine.prepareTrade('combo', proposalMap);
    expect(prep).not.toBeNull();
    expect(prep?.isPaper).toBe(false);
    expect(prep?.usedProposal).toBe(true);
    expect(prep?.legs?.length).toBe(2);

    expect(prep?.legs?.[0]).toEqual({
      ct: 'DIGITOVER',
      barrier: 5,
      legKind: 'over',
      payload: { buy: 'prop_combo_over_5', price: 1.0 },
      usedProposal: true,
    });

    expect(prep?.legs?.[1]).toEqual({
      ct: 'DIGITUNDER',
      barrier: 4,
      legKind: 'under',
      payload: { buy: 'prop_combo_under_4', price: 1.0 },
      usedProposal: true,
    });
  });

  it('gerar fallback individual em pernas de combo quando apenas 1 proposta estiver disponível', () => {
    const engine = createEngine({
      paperMode: false,
      mode: 'combo',
      comboOver: 5,
      comboUnder: 4,
      stake: 1.0,
      activeSym: 'R_100',
    });

    // Apenas Over tem proposta, Under não
    const proposalMap = new Map<string, string>([
      ['DIGITOVER|5', 'prop_combo_over_5'],
    ]);

    const prep = engine.prepareTrade('combo', proposalMap);
    expect(prep).not.toBeNull();
    expect(prep?.usedProposal).toBe(false); // Nem todas usaram proposta

    expect(prep?.legs?.[0].usedProposal).toBe(true);
    expect(prep?.legs?.[0].payload).toEqual({ buy: 'prop_combo_over_5', price: 1.0 });

    expect(prep?.legs?.[1].usedProposal).toBe(false);
    expect(prep?.legs?.[1].payload).toEqual({
      buy: 1,
      price: 1.0,
      parameters: {
        amount: 1.0,
        basis: 'stake',
        contract_type: 'DIGITUNDER',
        currency: 'USD',
        duration: 1,
        duration_unit: 't',
        underlying_symbol: 'R_100',
        barrier: '4',
      },
    });
  });
});

describe('useBearBot2 Hook - Quick Buy Lifecycle & WebSocket integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    registeredListeners = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pré-abre propostas automaticamente ao iniciar conectado com conta', () => {
    renderHook(() => useBearBot());

    // Avança o timer de debounce de 50ms
    act(() => {
      vi.advanceTimersByTime(60);
    });

    // Deve enviar chamada de proposal com subscribe: 1
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        proposal: 1,
        subscribe: 1,
        contract_type: 'DIGITOVER',
        barrier: '2',
        underlying_symbol: 'R_100',
        passthrough: expect.objectContaining({
          pkey: expect.stringContaining('R_100|DIGITOVER|2|0.35'),
        }),
      })
    );
  });

  it('captura ID de proposta pré-aberta via mensagem WebSocket e executa compra rápida com ⚡', async () => {
    mockSend.mockImplementation(async (payload: any) => {
      if (payload.buy) {
        return { buy: { contract_id: 998877 } };
      }
      return {};
    });

    const { result } = renderHook(() => useBearBot());

    act(() => {
      vi.advanceTimersByTime(60);
    });

    // Simula resposta da Deriv WebSocket com a proposta
    const pkey = 'R_100|DIGITOVER|2|0.35';
    const messageListeners = registeredListeners['message'] || [];
    expect(messageListeners.length).toBeGreaterThan(0);

    act(() => {
      messageListeners.forEach((fn) =>
        fn({
          msg_type: 'proposal',
          proposal: { id: 'prop_deriv_12345' },
          passthrough: { pkey },
        })
      );
    });

    // Executa trade manual
    await act(async () => {
      result.current.manualFire('over');
    });

    // Verifica que enviou a compra rápida com o ID da proposta recebida
    expect(mockSend).toHaveBeenCalledWith({
      buy: 'prop_deriv_12345',
      price: 0.35,
    });

    // Verifica que o log contém o indicador ⚡
    const lastLog = result.current.state.logLines[0];
    expect(lastLog.msg).toContain('⚡');
  });

  it('faz fallback para payload com parameters se proposta ainda não estiver pronta', async () => {
    mockSend.mockImplementation(async (payload: any) => {
      if (payload.buy) {
        return { buy: { contract_id: 112233 } };
      }
      return {};
    });

    const { result } = renderHook(() => useBearBot());

    act(() => {
      vi.advanceTimersByTime(60);
    });

    // Não envia evento de proposta (ainda pendente ou não respondido)
    await act(async () => {
      result.current.manualFire('over');
    });

    // Verifica que enviou o payload completo (fallback)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        buy: 1,
        price: 0.35,
        parameters: expect.objectContaining({
          contract_type: 'DIGITOVER',
          barrier: '2',
        }),
      })
    );

    // O log não deve conter ⚡
    const lastLog = result.current.state.logLines[0];
    expect(lastLog.msg).not.toContain('⚡');
  });

  it('esquece e recria propostas quando a configuração de mercado ou dígito muda', () => {
    const { result } = renderHook(() => useBearBot());

    act(() => {
      vi.advanceTimersByTime(60);
    });

    mockSend.mockClear();

    act(() => {
      result.current.updateConfig({ activeSym: 'R_50', digit: 7 });
    });

    // Deve ter chamado forget_all: 'proposal'
    expect(mockSend).toHaveBeenCalledWith({
      forget_all: 'proposal',
    });

    // Avança o debounce de 50ms para o refresh
    act(() => {
      vi.advanceTimersByTime(60);
    });

    // E deve ter chamado proposal para R_50 e barrier 7
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        proposal: 1,
        subscribe: 1,
        underlying_symbol: 'R_50',
        barrier: '7',
      })
    );
  });
});
