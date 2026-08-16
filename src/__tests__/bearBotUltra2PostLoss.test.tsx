// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('BearBotUltra 2.0 — Bloco Pós-Loss (Card & Funcionalidades)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredListeners = {};
  });

  it('1. Renderiza o card PÓS-LOSS inicialmente desligado com conteúdo oculto', () => {
    render(<BearBotUltra />);
    expect(screen.getByText(/PÓS-LOSS/i)).toBeDefined();
    // Conteúdo interno não deve estar visível quando desligado
    expect(screen.queryByText('Ação após LOSS')).toBeNull();
    expect(screen.queryByText('🔥 Recuperar')).toBeNull();
    expect(screen.queryByText('🧠 Analisar')).toBeNull();
  });

  it('2. Alterna o toggle ON/OFF exibindo e ocultando a configuração', () => {
    render(<BearBotUltra />);
    const heading = screen.getByText(/PÓS-LOSS/i);
    const toggleBtn = heading.parentElement?.querySelector('button');
    expect(toggleBtn).toBeTruthy();

    // Ligar Pós-Loss
    fireEvent.click(toggleBtn!);
    expect(screen.getByText('Ação após LOSS')).toBeDefined();
    expect(screen.getByText('🔥 Recuperar')).toBeDefined();
    expect(screen.getByText('🧠 Analisar')).toBeDefined();

    // Desligar Pós-Loss
    fireEvent.click(toggleBtn!);
    expect(screen.queryByText('Ação após LOSS')).toBeNull();
  });

  it('3. Modo "Recuperar" exibe os campos e avisos corretos', () => {
    render(<BearBotUltra />);
    const heading = screen.getByText(/PÓS-LOSS/i);
    const toggleBtn = heading.parentElement?.querySelector('button');
    fireEvent.click(toggleBtn!);

    // Por padrão vem no modo recover
    expect(screen.getByText('Máx. tentativas')).toBeDefined();
    expect(screen.getByText('Delay (ms)')).toBeDefined();
    expect(screen.getByText(/Recuperação forçada usa gale ativo/i)).toBeDefined();

    // Inputs com valores padrão
    const attemptsInput = screen.getByDisplayValue('3') as HTMLInputElement;
    const delayInput = screen.getByDisplayValue('1500') as HTMLInputElement;
    expect(attemptsInput).toBeDefined();
    expect(delayInput).toBeDefined();
  });

  it('4. Validação e clamping do input "Máx. tentativas" (1 a 5)', () => {
    render(<BearBotUltra />);
    const toggleBtn = screen.getByText(/PÓS-LOSS/i).parentElement?.querySelector('button');
    fireEvent.click(toggleBtn!);

    const attemptsInput = screen.getByDisplayValue('3') as HTMLInputElement;

    // Valor maior que 5 -> deve travar em 5
    fireEvent.change(attemptsInput, { target: { value: '10' } });
    expect(attemptsInput.value).toBe('5');

    // Valor menor que 1 -> deve travar em 1
    fireEvent.change(attemptsInput, { target: { value: '0' } });
    expect(attemptsInput.value).toBe('1');

    // Valor inválido (texto) -> deve ir para min (1)
    fireEvent.change(attemptsInput, { target: { value: 'abc' } });
    expect(attemptsInput.value).toBe('1');

    // Valor válido dentro da faixa
    fireEvent.change(attemptsInput, { target: { value: '4' } });
    expect(attemptsInput.value).toBe('4');
  });

  it('5. Validação e clamping do input "Delay (ms)" (mínimo 500ms)', () => {
    render(<BearBotUltra />);
    const toggleBtn = screen.getByText(/PÓS-LOSS/i).parentElement?.querySelector('button');
    fireEvent.click(toggleBtn!);

    const delayInput = screen.getByDisplayValue('1500') as HTMLInputElement;

    // Menor que 500ms -> deve travar em 500
    fireEvent.change(delayInput, { target: { value: '100' } });
    expect(delayInput.value).toBe('500');

    // Valor válido
    fireEvent.change(delayInput, { target: { value: '2500' } });
    expect(delayInput.value).toBe('2500');

    // Valor inválido -> trava em 500
    fireEvent.change(delayInput, { target: { value: 'invalid' } });
    expect(delayInput.value).toBe('500');
  });

  it('6. Alterna para o modo "Analisar" exibindo Cooldown (seg) e banner explicativo', () => {
    render(<BearBotUltra />);
    const toggleBtn = screen.getByText(/PÓS-LOSS/i).parentElement?.querySelector('button');
    fireEvent.click(toggleBtn!);

    // Clicar em Analisar
    const analyzeBtn = screen.getByText('🧠 Analisar');
    fireEvent.click(analyzeBtn);

    // Deve ocultar campos de recuperação
    expect(screen.queryByText('Máx. tentativas')).toBeNull();
    expect(screen.queryByText('Delay (ms)')).toBeNull();

    // Deve exibir Cooldown e explicação
    expect(screen.getByText('Cooldown (seg)')).toBeDefined();
    expect(screen.getByText(/reseta o loss virtual e volta a operar apenas quando o sinal for válido/i)).toBeDefined();

    const cooldownInput = screen.getByDisplayValue('5') as HTMLInputElement;
    expect(cooldownInput).toBeDefined();
  });

  it('7. Validação e clamping do input "Cooldown (seg)" (0 a 60 seg, aceita 0)', () => {
    render(<BearBotUltra />);
    const toggleBtn = screen.getByText(/PÓS-LOSS/i).parentElement?.querySelector('button');
    fireEvent.click(toggleBtn!);

    const analyzeBtn = screen.getByText('🧠 Analisar');
    fireEvent.click(analyzeBtn);

    const cooldownInput = screen.getByDisplayValue('5') as HTMLInputElement;

    // Valor maior que 60 -> deve travar em 60
    fireEvent.change(cooldownInput, { target: { value: '120' } });
    expect(cooldownInput.value).toBe('60');

    // Aceita 0 segundos
    fireEvent.change(cooldownInput, { target: { value: '0' } });
    expect(cooldownInput.value).toBe('0');

    // Valor dentro da faixa
    fireEvent.change(cooldownInput, { target: { value: '15' } });
    expect(cooldownInput.value).toBe('15');
  });

  it('8. Alterna de volta entre Analisar e Recuperar mantendo reatividade', () => {
    render(<BearBotUltra />);
    const toggleBtn = screen.getByText(/PÓS-LOSS/i).parentElement?.querySelector('button');
    fireEvent.click(toggleBtn!);

    // Mudar para Analisar
    fireEvent.click(screen.getByText('🧠 Analisar'));
    expect(screen.getByText('Cooldown (seg)')).toBeDefined();

    // Voltar para Recuperar
    fireEvent.click(screen.getByText('🔥 Recuperar'));
    expect(screen.getByText('Máx. tentativas')).toBeDefined();
    expect(screen.getByText('Delay (ms)')).toBeDefined();
  });

  it('9. Manipulação de entradas vazias ou com vírgula nos inputs', () => {
    render(<BearBotUltra />);
    const toggleBtn = screen.getByText(/PÓS-LOSS/i).parentElement?.querySelector('button');
    fireEvent.click(toggleBtn!);

    const attemptsInput = screen.getByDisplayValue('3') as HTMLInputElement;
    fireEvent.change(attemptsInput, { target: { value: '' } });
    expect(attemptsInput.value).toBe('1');

    const delayInput = screen.getByDisplayValue('1500') as HTMLInputElement;
    fireEvent.change(delayInput, { target: { value: '' } });
    expect(delayInput.value).toBe('500');

    // Mudar para Analisar
    fireEvent.click(screen.getByText('🧠 Analisar'));
    const cooldownInput = screen.getByDisplayValue('5') as HTMLInputElement;
    fireEvent.change(cooldownInput, { target: { value: '' } });
    expect(cooldownInput.value).toBe('0');
  });
});
