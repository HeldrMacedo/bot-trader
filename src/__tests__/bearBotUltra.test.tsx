// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BearBotUltra from '../app/(withSidebar)/bear-bot-ultra/bearBotUltra';
import React from 'react';

// Mock de localStorage para evitar erros de ambiente DOM
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
        observerInstance: {
          on: mockOn,
          removeById: mockRemoveById
        }
      })
    }
  };
});

describe('BearBotUltra Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredListeners = {};
  });

  it('deve renderizar a interface do Bear Bot Ultra com os elementos corretos', () => {
    render(<BearBotUltra />);
    
    // Verificar título
    expect(screen.getByText('Bear Bot Ultra 7.7.9')).toBeDefined();
    
    // Verificar se exibe as volatilidades
    expect(screen.getByText('Volatilidade 100')).toBeDefined();
    expect(screen.getByText('Bear Market')).toBeDefined();
    
    // Verificar botões de estratégias
    expect(screen.getByText('over')).toBeDefined();
    expect(screen.getByText('under')).toBeDefined();
    expect(screen.getByText('differ')).toBeDefined();
    expect(screen.getByText('combo')).toBeDefined();
  });

  it('deve alternar entre contas virtual e real', async () => {
    render(<BearBotUltra />);
    
    // Clica no botão "Real" para alternar de conta
    const realBtn = screen.getByText('Real');
    await act(async () => {
      fireEvent.click(realBtn);
    });

    expect(mockSwitchAccount).toHaveBeenCalledWith('real_token');
  });

  it('deve poder iniciar e pausar o robô no modo automático', async () => {
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

  it('deve respeitar a janela de loss virtual acumulado ao iniciar o robô e não usar o histórico anterior', async () => {
    render(<BearBotUltra />);

    const tickCallback = registeredListeners['deriv.tick']?.[0];
    expect(tickCallback).toBeDefined();

    // 1. Simular 45 ticks perdedores enquanto o robô está DESLIGADO (modo over com dígito 2 -> dígitos 0, 1, 2 são perdedores)
    await act(async () => {
      for (let i = 0; i < 45; i++) {
        tickCallback({ tick: { symbol: 'R_100', quote: 100.02 } }); // dígito 2
      }
    });

    // Ativar o Loss Virtual na interface clicando no botão do card de LOSS VIRTUAL
    const vlCardHeader = screen.getByText(/LOSS VIRTUAL/i);
    const vlToggleBtn = vlCardHeader.parentElement?.querySelector('button')!;
    expect(vlToggleBtn).toBeDefined();
    fireEvent.click(vlToggleBtn);

    // Selecionar modo Acumulado
    const accumBtn = screen.getByText('Acumulado');
    fireEvent.click(accumBtn);

    // Mudar para modo Automático e Ligar o robô
    const autoBtn = screen.getByText('Automático');
    fireEvent.click(autoBtn);

    const startBtn = screen.getByText('Ligar Robô');
    await act(async () => {
      fireEvent.click(startBtn);
    });

    // 2. Enviar 1 novo tick perdedor após ligar o robô
    await act(async () => {
      tickCallback({ tick: { symbol: 'R_100', quote: 100.01 } }); // dígito 1 (perdedor)
    });

    // Verificar se o elemento de Loss exibe janela 1/14 e Loss 1/2 (e NÃO 45/14 nem 45/2)
    expect(screen.getByText(/janela 1\/14/i)).toBeDefined();
    expect(screen.getByText(/1\/2/i)).toBeDefined();

    // 3. Enviar o 2º tick perdedor para atingir a quantidade de perdas (2)
    await act(async () => {
      tickCallback({ tick: { symbol: 'R_100', quote: 100.00 } }); // dígito 0 (perdedor)
    });

    // Deve disparar a compra via derivService.send
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      buy: 1,
      parameters: expect.objectContaining({
        contract_type: 'DIGITOVER',
        underlying_symbol: 'R_100'
      })
    }));
  });
});
