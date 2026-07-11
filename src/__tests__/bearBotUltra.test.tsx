// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BearBotUltra from '../app/(withSidebar)/bear-bot-ultra/page';
import React from 'react';

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

const mockOn = vi.fn();
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

describe('BearBotUltra Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
