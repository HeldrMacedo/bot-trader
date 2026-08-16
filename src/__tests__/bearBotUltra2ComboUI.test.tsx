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
    emit: vi.fn()
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

describe('BearBotUltra 2 COMBO UI Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('exibe o painel de configuração COMBO com seletores UNDER/OVER e régua visual quando COMBO está selecionado', async () => {
    render(<BearBotUltra />);

    // Por padrão o modo é OVER, então não deve exibir "Configuração COMBO"
    expect(screen.queryByText(/Configuração COMBO/i)).toBeNull();

    // Clica no botão COMBO
    const comboBtn = screen.getByRole('button', { name: /COMBO/i });
    act(() => {
      fireEvent.click(comboBtn);
    });

    // Agora o painel COMBO deve estar visível
    expect(screen.getByText(/Configuração COMBO/i)).toBeDefined();
    expect(screen.getByText(/80% WIN RATE TEÓRICO/i)).toBeDefined();
    expect(screen.getByText(/UNDER \(< 4\)/i)).toBeDefined();
    expect(screen.getByText(/OVER \(> 5\)/i)).toBeDefined();
    expect(screen.getByText(/Zona dos Dígitos \(Verde: WIN · Vermelho: LOSS\)/i)).toBeDefined();
  });

  it('permite ajustar a barreira UNDER e OVER atualizando o cálculo de Win Rate Teórico', async () => {
    render(<BearBotUltra />);

    // Seleciona COMBO
    const comboBtn = screen.getByRole('button', { name: /COMBO/i });
    act(() => {
      fireEvent.click(comboBtn);
    });

    // Clica no dígito '3' do seletor UNDER
    const underLabel = screen.getByText(/UNDER \(< 4\)/i);
    const underContainer = underLabel.closest('div')!.parentElement!;
    const underButtons = underContainer.querySelectorAll('button');
    const btn3 = Array.from(underButtons).find(b => b.textContent?.trim() === '3');
    expect(btn3).toBeDefined();

    act(() => {
      fireEvent.click(btn3!);
    });

    // Agora UNDER é 3 e OVER é 5 -> (3 + (9 - 5)) * 10 = 70% WIN RATE
    expect(screen.getByText(/70% WIN RATE TEÓRICO/i)).toBeDefined();
    expect(screen.getByText(/UNDER \(< 3\)/i)).toBeDefined();
  });
});
