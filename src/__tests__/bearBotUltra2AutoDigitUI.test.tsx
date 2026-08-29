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

const registeredListeners: Record<string, Function[]> = {};

// Mock DerivService
const mockDerivInstance = {
  send: vi.fn().mockResolvedValue({}),
  subscribe: vi.fn().mockResolvedValue({ subscription: { id: 'test_sub' } }),
  switchAccount: vi.fn().mockResolvedValue({}),
  getStorageDerivAccount: () => ([
    {
      activeToken: 'vrtc_token',
      tokens: [
        { token: 'vrtc_token', is_virtual: true, balance: 10000 },
        { token: 'real_token', is_virtual: false, balance: 0 }
      ]
    }
  ]),
  getActiveAccount: () => ({
    token: 'vrtc_token',
    is_virtual: true,
    balance: 10000,
    currency: 'USD'
  }),
  isMarketConnected: true,
  observerInstance: {
    on: vi.fn().mockImplementation((event: string, cb: Function) => {
      if (!registeredListeners[event]) registeredListeners[event] = [];
      registeredListeners[event].push(cb);
      return `${event}_id_${Math.random()}`;
    }),
    removeById: vi.fn(),
  },
  on: vi.fn(),
  off: vi.fn(),
  ping: vi.fn().mockResolvedValue(true),
};

vi.mock('../app/services/DerivService', () => ({
  DerivService: {
    getInstance: () => mockDerivInstance,
  },
  default: {
    getInstance: () => mockDerivInstance,
  }
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }
}));

describe('BearBotUltra2 UI - Dígito Automático', () => {
  beforeEach(() => {
    for (const key of Object.keys(registeredListeners)) {
      delete registeredListeners[key];
    }
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('exibe o switch de Dígito Automático quando modo differ e loss virtual estiverem ativos', async () => {
    render(<BearBotUltra />);

    // Por padrão o modo é 'over' e vlOn é false -> não deve exibir Dígito Automático
    expect(screen.queryByText('Dígito Automático')).not.toBeInTheDocument();

    // Clica em 'differ'
    const differBtn = screen.getByRole('button', { name: /differ/i });
    fireEvent.click(differBtn);

    // Ainda vlOn é false -> não deve exibir
    expect(screen.queryByText('Dígito Automático')).not.toBeInTheDocument();

    // Ativa Loss Virtual
    const vlToggle = screen.getByTestId('toggle-loss-virtual');
    fireEvent.click(vlToggle);

    // Agora deve exibir o botão de Dígito Automático
    expect(screen.getByText('Dígito Automático')).toBeInTheDocument();
  });

  it('bloqueia a seleção manual de dígitos e exibe badge quando Dígito Automático é ativado', async () => {
    render(<BearBotUltra />);

    // Clica em 'differ'
    const differBtn = screen.getByRole('button', { name: /differ/i });
    fireEvent.click(differBtn);

    // Ativa Loss Virtual
    const vlToggle = screen.getByTestId('toggle-loss-virtual');
    fireEvent.click(vlToggle);

    // Ativa Dígito Automático
    const autoDigitToggle = screen.getByTestId('toggle-auto-digit');
    fireEvent.click(autoDigitToggle);

    // Deve exibir o badge "DÍGITO AUTO ATIVO"
    expect(screen.getByText('DÍGITO AUTO ATIVO')).toBeInTheDocument();

    // O card do Padrão A->B deve estar oculto
    expect(screen.queryByRole('heading', { name: /PADRÃO A→B/i })).not.toBeInTheDocument();
  });

  it('exibe o switch de Dígitos Dinâmicos no modo differ mesmo sem Loss Virtual e bloqueia seleção manual ao ativar', async () => {
    render(<BearBotUltra />);

    // No modo over inicial, não deve exibir Dígitos Dinâmicos
    expect(screen.queryByText('Dígitos Dinâmicos')).not.toBeInTheDocument();

    // Clica em 'differ'
    const differBtn = screen.getByRole('button', { name: /differ/i });
    fireEvent.click(differBtn);

    // Deve exibir o switch de Dígitos Dinâmicos imediatamente (sem precisar de Loss Virtual)
    expect(screen.getByText('Dígitos Dinâmicos')).toBeInTheDocument();
    expect(screen.queryByText('DÍGITO DINÂMICO ATIVO')).not.toBeInTheDocument();

    // Ativa Dígitos Dinâmicos
    const dynamicDigitToggle = screen.getByTestId('toggle-dynamic-digit');
    fireEvent.click(dynamicDigitToggle);

    // Deve exibir o badge "DÍGITO DINÂMICO ATIVO"
    // Deve exibir badge DESATIVADO no Padrão A->B e manter Loss Virtual disponível
    expect(screen.getAllByText('DESATIVADO').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('toggle-loss-virtual')).not.toBeDisabled();

    // Deve exibir o painel dedicado DynamicDigitPanel
    expect(screen.getByText(/RADAR DE DÍGITOS DINÂMICOS/i)).toBeInTheDocument();
    expect(screen.getByText(/Ranking de Segurança dos 10 Dígitos/i)).toBeInTheDocument();
    expect(screen.getByText(/Frequência Inversa/i)).toBeInTheDocument();
    expect(screen.getByText(/Inverso Markov/i)).toBeInTheDocument();
    expect(screen.getByText(/Inverso Trigrama/i)).toBeInTheDocument();
    expect(screen.getByText(/Resistência Anomalia/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar Agora no Dígito/i })).toBeInTheDocument();

    // O Dígito Alvo deve refletir o mesmo dígito selecionado no Radar (ambos sincronizados com bg-indigo-600)
    const targetDigitButtons = screen.getAllByRole('button').filter(b => /^[0-9]$/.test(b.textContent?.trim() || ''));
    const selectedTargetBtn = targetDigitButtons.find(b => b.className.includes('bg-indigo-600'));
    expect(selectedTargetBtn).toBeDefined();
  });

  it('permite ativar Contagem sob Foco com Dígito Automático no modo multi-mercado', async () => {
    render(<BearBotUltra />);

    // Clica em 'differ'
    const differBtn = screen.getByRole('button', { name: /differ/i });
    fireEvent.click(differBtn);

    // Ativa Loss Virtual
    const vlToggle = screen.getByTestId('toggle-loss-virtual');
    fireEvent.click(vlToggle);

    // Ativa Multi-Mercado
    const multiToggle = screen.getByTestId('toggle-multi-market');
    fireEvent.click(multiToggle);

    // Ativa Dígito Automático
    const autoDigitToggle = screen.getByTestId('toggle-auto-digit');
    fireEvent.click(autoDigitToggle);

    // Deve exibir o switch de Contagem sob Foco
    expect(screen.getByText(/Contagem sob Foco/i)).toBeInTheDocument();
    const focusOnlyToggle = screen.getByTestId('toggle-vl-focus-only');
    expect(focusOnlyToggle).toBeInTheDocument();

    // Ativa Contagem sob Foco
    fireEvent.click(focusOnlyToggle);

    // Verifica que Dígito Auto continua ativo
    expect(screen.getByText('DÍGITO AUTO ATIVO')).toBeInTheDocument();
  });

  it('sincroniza o Dígito Alvo na UI e na grade de mercados durante a contagem sob foco de dígito automático', async () => {
    render(<BearBotUltra />);

    // Configura modo differ + Loss Virtual + Dígito Automático
    const differBtn = screen.getByRole('button', { name: /differ/i });
    fireEvent.click(differBtn);
    fireEvent.click(screen.getByTestId('toggle-loss-virtual'));
    fireEvent.click(screen.getByTestId('toggle-auto-digit'));

    // Envia ticks para o mercado ativo R_100 com dígito 7 (100.57 tem dígito 7)
    act(() => {
      const tickCbs = registeredListeners['deriv.tick'] || [];
      tickCbs.forEach(cb => cb({ tick: { symbol: 'R_100', quote: 100.57 } }));
    });

    // MarketGrid deve exibir Dígito 7
    expect(screen.getByText(/Dígito 7: 1\/2/)).toBeInTheDocument();

    // No Dígito Alvo (botões 0..9), o botão 7 deve estar com bg-indigo-600 (selecionado/sincronizado)
    const targetDigitButtons = screen.getAllByRole('button').filter(b => /^[0-9]$/.test(b.textContent?.trim() || ''));
    const btn7 = targetDigitButtons.find(b => b.textContent?.trim() === '7');
    expect(btn7).toBeDefined();
    expect(btn7?.className).toContain('bg-indigo-600');
  });
});
