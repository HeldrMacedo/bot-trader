// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BearBotUltra from '../app/(withSidebar)/bear-bot-ultra-2/page';
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

    // Ligar o robô
    const startBtn = screen.getByText('Ligar Robô');
    fireEvent.click(startBtn);

    expect(screen.getByText('Desligar Robô')).toBeDefined();

    // Desligar o robô
    const stopBtn = screen.getByText('Desligar Robô');
    fireEvent.click(stopBtn);

    expect(screen.getByText('Ligar Robô')).toBeDefined();
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
});
