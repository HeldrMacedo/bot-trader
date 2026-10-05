// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BearBotUltra from '../app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2';
import React from 'react';

// Mock de localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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

const mockExtractLastDigit = vi.fn().mockImplementation((price) => {
  return Number(String(price).slice(-1));
});

let registeredListeners: Record<string, Function[]> = {};

const mockOn = vi.fn().mockImplementation((event: string, callback: Function) => {
  if (!registeredListeners[event]) registeredListeners[event] = [];
  registeredListeners[event].push(callback);
  return `${event}_listener_id`;
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
        extractLastDigit: mockExtractLastDigit,
        isMarketConnected: true,
        observerInstance: {
          on: mockOn,
          removeById: mockRemoveById
        }
      })
    }
  };
});

/** Envia ticks suficientes para o mercado ativo (R_100) começar a medir o score. */
async function feedScoreHistory(count = 60) {
  const tickCallback = registeredListeners['deriv.tick']?.[0];
  await act(async () => {
    for (let i = 0; i < count; i++) {
      tickCallback({ tick: { symbol: 'R_100', quote: 100 + (i % 10) / 100 } });
    }
  });
}

describe('BearBotUltra 2.0 Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredListeners = {};
  });

  it('deve renderizar a interface do Bear Bot Ultra 2.0 com os elementos corretos', () => {
    render(<BearBotUltra />);
    
    // Verificar título
    expect(screen.getByText(/Bear Bot Ultra 10\.0/i)).toBeDefined();
    
    // Verificar se exibe as volatilidades no IntelPanel ou MarketGrid
    // As volatilitys are inside MarketGrid, let's verify if mode buttons are present
    expect(screen.getByText('over')).toBeDefined();
    expect(screen.getByText('under')).toBeDefined();
    expect(screen.getByText('differ')).toBeDefined();
    expect(screen.getByText('combo')).toBeDefined();
  });

  it('deve poder alternar o modo de execução para automático e permitir ligar o robô', async () => {
    render(<BearBotUltra />);
    
    // Mudar para o modo Automático
    const autoBtn = screen.getByText('Automático');
    fireEvent.click(autoBtn);

    // O botão só libera depois que o mercado ativo tem score medido.
    await feedScoreHistory();

    // Ligar o robô
    const startBtn = screen.getByText('Ligar Robô');
    fireEvent.click(startBtn);

    expect(screen.getByText('Desligar Robô')).toBeDefined();

    // Desligar o robô
    const stopBtn = screen.getByText('Desligar Robô');
    fireEvent.click(stopBtn);

    expect(screen.getByText('Ligar Robô')).toBeDefined();
  });

  it('só libera o Ligar Robô no automático depois que o score começa a ser medido', async () => {
    render(<BearBotUltra />);
    fireEvent.click(screen.getByText('Automático'));

    const startBtn = screen.getByText('Ligar Robô').closest('button')!;
    expect(startBtn.disabled).toBe(true);
    expect(screen.getByText(/Medindo score/i)).toBeDefined();
    fireEvent.click(startBtn);
    expect(screen.queryByText('Desligar Robô')).toBeNull();

    await feedScoreHistory();

    expect(screen.getByText('Ligar Robô').closest('button')!.disabled).toBe(false);
    expect(screen.queryByText(/Medindo score/i)).toBeNull();
  });

  it('deve processar ticks da Deriv e atualizar a interface sem estourar limite de renders', async () => {
    render(<BearBotUltra />);

    const tickCallback = registeredListeners['deriv.tick']?.[0];
    expect(tickCallback).toBeDefined();

    // Simular ticks recebidos
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        tickCallback({ tick: { symbol: 'R_100', quote: 100.02 } });
      }
    });

    // Como o state update é gerenciado pelo useBearBot, ele não deve dar erro
    // E os gráficos ou logs de tick devem existir se os componentes internos renderizam
    expect(screen.getByText(/ÚLTIMAS OPERAÇÕES/i)).toBeDefined();
  });

  it('mostra a cota das proteções e limita máx. trades/hora a 500', () => {
    render(<BearBotUltra />);
    expect(screen.getByText('0/50 nesta hora')).toBeDefined();

    const hourInput = screen.getByDisplayValue('50') as HTMLInputElement;
    fireEvent.change(hourInput, { target: { value: '999' } });
    expect(hourInput.value).toBe('500');

    fireEvent.change(hourInput, { target: { value: 'abc' } });
    expect(hourInput.value).toBe('1');
  });

  it('liga o card Pós-Loss e troca Recuperar / Analisar', () => {
    render(<BearBotUltra />);
    expect(screen.queryByText('🔥 Recuperar')).toBeNull();

    const heading = screen.getByText(/PÓS-LOSS/);
    const toggle = heading.parentElement?.querySelector('button');
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle!);

    expect(screen.getByText('🔥 Recuperar')).toBeDefined();
    expect(screen.getByText('Máx. tentativas')).toBeDefined();

    const attempts = screen.getByDisplayValue('3') as HTMLInputElement;
    fireEvent.change(attempts, { target: { value: '99' } });
    expect(attempts.value).toBe('5');

    fireEvent.click(screen.getByText('🧠 Analisar'));
    expect(screen.getByText('Cooldown (seg)')).toBeDefined();
    expect(screen.queryByText('Máx. tentativas')).toBeNull();

    const cooldown = screen.getByDisplayValue('5') as HTMLInputElement;
    fireEvent.change(cooldown, { target: { value: '90' } });
    expect(cooldown.value).toBe('60');
  });

  it('permite alterar o valor do Martingale livremente sem travar em 1.01', () => {
    render(<BearBotUltra />);
    
    // Obter o input de Martingale pelo valor padrão inicial 2.1
    const galeInput = screen.getByDisplayValue('2.1') as HTMLInputElement;
    expect(galeInput).toBeDefined();

    // 1. Limpar / apagar o valor (backspace)
    fireEvent.change(galeInput, { target: { value: '' } });
    expect(galeInput.value).toBe('');

    // 2. Digitar valor decimal passo a passo
    fireEvent.change(galeInput, { target: { value: '1' } });
    expect(galeInput.value).toBe('1');

    fireEvent.change(galeInput, { target: { value: '1.' } });
    expect(galeInput.value).toBe('1.');

    fireEvent.change(galeInput, { target: { value: '1.5' } });
    expect(galeInput.value).toBe('1.5');

    // 3. Digitar outro valor como 3.2
    fireEvent.change(galeInput, { target: { value: '3.2' } });
    expect(galeInput.value).toBe('3.2');

    // 4. Suportar vírgula decimal (ex: 2,5 -> 2.5)
    fireEvent.change(galeInput, { target: { value: '2,5' } });
    expect(galeInput.value).toBe('2.5');

    // 5. No blur com valor abaixo do mínimo (ex: 0.5), ajusta para 1
    fireEvent.change(galeInput, { target: { value: '0.5' } });
    fireEvent.blur(galeInput);
    expect(galeInput.value).toBe('1');

    // 6. No blur com valor acima de 10 (ex: 15), permite livremente sem limitar a 10
    fireEvent.change(galeInput, { target: { value: '15' } });
    fireEvent.blur(galeInput);
    expect(galeInput.value).toBe('15');
  });

  it('permite alterar Entrada Inicial, Stop Loss e Stop Win livremente', () => {
    render(<BearBotUltra />);

    // Stake
    const stakeInput = screen.getByDisplayValue('0.35') as HTMLInputElement;
    fireEvent.change(stakeInput, { target: { value: '' } });
    expect(stakeInput.value).toBe('');
    fireEvent.change(stakeInput, { target: { value: '0.5' } });
    expect(stakeInput.value).toBe('0.5');

    // Stop Loss and Stop Win (both default to 20)
    const [stopLossInput, stopWinInput] = screen.getAllByDisplayValue('20') as HTMLInputElement[];
    fireEvent.change(stopLossInput, { target: { value: '50' } });
    expect(stopLossInput.value).toBe('50');

    fireEvent.change(stopWinInput, { target: { value: '100' } });
    expect(stopWinInput.value).toBe('100');
  });

  it('ao alternar Paper Trading ou alternar entre Demo e Real, reseta o estado de operação', async () => {
    render(<BearBotUltra />);

    // Alternar para Paper Trading
    const paperHeading = screen.getByText('Paper Trading');
    const paperContainer = paperHeading.closest('div')?.parentElement?.parentElement;
    const paperToggle = paperContainer?.querySelector('button');
    expect(paperToggle).toBeTruthy();
    
    // Liga Paper Trading
    fireEvent.click(paperToggle!);
    expect(screen.getByText('📄 PAPER')).toBeDefined();

    // Desliga Paper Trading
    fireEvent.click(paperToggle!);
    expect(screen.queryByText('📄 PAPER')).toBeNull();

    // Clicar em Real troca de conta e desativa paper mode caso ativo
    fireEvent.click(paperToggle!); // Liga paper
    expect(screen.getByText('📄 PAPER')).toBeDefined();

    const realBtn = screen.getByText('Real');
    await act(async () => {
      fireEvent.click(realBtn);
    });
    expect(screen.queryByText('📄 PAPER')).toBeNull();
  });
});
