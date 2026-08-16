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
    on: vi.fn().mockReturnValue('mock_id'),
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
    const vlHeading = screen.getByRole('heading', { name: /LOSS VIRTUAL/i });
    const vlCard = vlHeading.closest('div');
    const vlToggle = vlCard?.querySelector('button');
    if (vlToggle) fireEvent.click(vlToggle);

    // Agora deve exibir o botão de Dígito Automático
    expect(screen.getByText('Dígito Automático')).toBeInTheDocument();
  });

  it('bloqueia a seleção manual de dígitos e exibe badge quando Dígito Automático é ativado', async () => {
    render(<BearBotUltra />);

    // Clica em 'differ'
    const differBtn = screen.getByRole('button', { name: /differ/i });
    fireEvent.click(differBtn);

    // Ativa Loss Virtual
    const vlHeading = screen.getByRole('heading', { name: /LOSS VIRTUAL/i });
    const vlCard = vlHeading.closest('div');
    const vlToggle = vlCard?.querySelector('button');
    if (vlToggle) fireEvent.click(vlToggle);

    // Ativa Dígito Automático
    const autoDigitToggle = screen.getByTestId('toggle-auto-digit');
    fireEvent.click(autoDigitToggle);

    // Deve exibir o badge "DÍGITO AUTO ATIVO"
    expect(screen.getByText('DÍGITO AUTO ATIVO')).toBeInTheDocument();

    // O card do Padrão A->B deve estar oculto
    expect(screen.queryByRole('heading', { name: /PADRÃO A→B/i })).not.toBeInTheDocument();
  });
});
