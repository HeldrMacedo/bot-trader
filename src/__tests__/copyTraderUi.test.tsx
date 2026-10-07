// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import React from 'react';
import { installStorage } from './copyTraderTestHarness';

const h = vi.hoisted(() => ({ access: { hasAccess: true, loading: false } }));

vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock('@/app/hooks/useModuleAccess', () => ({ useModuleAccess: () => h.access }));

import BotTraderX from '../app/(withSidebar)/bottrader/bottraderx';
import BotTrade from '../app/(withSidebar)/bottrader/page';
import { toast } from 'react-toastify';

type Reply = { ok?: boolean; body: any } | (() => any);
let replies: Record<string, Reply[]>;
let calls: Array<{ url: string; body: any }>;
// Estado do servidor: o status padrão reflete o último start/stop bem-sucedido
let serverRunning: boolean;

function queue(url: string, ...items: Reply[]) {
  replies[url] = [...(replies[url] ?? []), ...items];
}

function running(extra: Record<string, any> = {}) {
  return {
    copyTrading: { isRunning: true, trading: { martingaleLevel: 1, currentStake: 0.7 } },
    consecutiveLosses: 2,
    console: [{ amount: 1, isDemo: true }, { amount: -1, isDemo: false }],
    realAccount: { totalLoss: 1, totalWin: 1, totalValueWin: 1, totalValueLoss: -1, totalProfit: 0, transactions: [{}, {}] },
    realTransactions: [
      { contract_id: 900, profit: 0.3, entry_spot_display_value: '1.0', exit_tick_display_value: '1.1', status: 'won', display_name: 'Vol 100' },
      { contract_id: 901, profit: -0.35, entry_spot: '2.0', exit_spot: '2.1', status: 'lost', underlying_symbol: 'R_100', shortcode: 'DIGITDIFF' },
    ],
    timePause: 3,
    balance: 99,
    errors: { errors: [{ message: 'Trade Executado' }] },
    ...extra,
  };
}

async function tick(ms = 2000) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

const startButton = () => screen.getAllByRole('button').find((b) => b.textContent?.includes('Start'))!;
const demoInput = () => screen.getByPlaceholderText('Demo Token') as HTMLInputElement;

async function startBot() {
  queue('/api/start', { body: { success: true, userId: 'u1' } });
  await act(async () => { fireEvent.click(startButton()); });
  await tick(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  replies = {};
  calls = [];
  serverRunning = false;
  installStorage();
  localStorage.setItem('access_token', 'jwt-ui');
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
    calls.push({ url, body: init?.body ? JSON.parse(init.body) : undefined });
    const fallback = serverRunning ? { body: running() } : { body: { isRunning: false, message: 'Copy trading não iniciado' } };
    const next = replies[url]?.shift() ?? fallback;
    const r = (typeof next === 'function' ? await next() : next) as { ok?: boolean; body: any };
    if ((r.ok ?? true) && url === '/api/start' && r.body?.success) serverRunning = true;
    if ((r.ok ?? true) && url === '/api/stop') serverRunning = false;
    return { ok: r.ok ?? true, json: async () => r.body };
  }));
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.warning).mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('BotTraderX — fluxo', () => {
  it('envia config editada no start, trava campos e exibe o status do servidor', async () => {
    const { container } = render(<BotTraderX />);
    const field = (id: string) => container.querySelector(`#${id}`) as HTMLInputElement;

    fireEvent.change(demoInput(), { target: { value: 'pat_demo' } });
    fireEvent.change(screen.getByPlaceholderText('Real Token'), { target: { value: 'pat_real' } });
    fireEvent.change(field('quantity-loss'), { target: { value: '2a' } });
    fireEvent.change(field('stop-loss'), { target: { value: '1.2.3' } });
    fireEvent.change(field('stop-win'), { target: { value: '5' } });
    fireEvent.change(field('entrada-inicial'), { target: { value: '0.5' } });
    fireEvent.change(field('stake-multiple'), { target: { value: '1.5' } });
    fireEvent.change(field('max-martingale'), { target: { value: '3' } });
    fireEvent.click(container.querySelector('input[value="stop"]')!);
    fireEvent.click(container.querySelector('input[value="reset"]')!);
    fireEvent.click(container.querySelector('input[value="stop"]')!);
    fireEvent.change(field('pause-time'), { target: { value: '10s' } });
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((c) => fireEvent.click(c));

    queue('/api/status', { body: running() });
    await startBot();

    const startCall = calls.find((c) => c.url === '/api/start')!;
    expect(startCall.body).toEqual({
      demoToken: 'pat_demo',
      realToken: 'pat_real',
      configure: {
        quantityLoss: 2, stopLoss: 1.23, stopWin: 5, initialValue: 0.5, stakeMultiple: 1.5, pauseTime: 10,
        pauseTimeLoss: true, pauseTimeWin: true, maxMartingale: 3, onMaxMartingale: 'stop', testMode: true,
      },
    });
    expect(toast.success).toHaveBeenCalledWith('Copy trading iniciado com sucesso!');
    expect(demoInput().disabled).toBe(true);
    expect(screen.getByText('Vol 100')).toBeTruthy();
    expect(screen.getByText('DIGITDIFF')).toBeTruthy();
    expect(screen.getByText('Trade Executado')).toBeTruthy();
  });

  it('mostra "Aguardando operações" rodando sem console e "Nenhuma negociação" parado', async () => {
    render(<BotTraderX />);
    expect(screen.getByText('Nenhuma negociação realizada ainda.')).toBeTruthy();
    queue('/api/status', { body: running({ console: [] }) });
    await startBot();
    expect(screen.getByText('Aguardando operações...')).toBeTruthy();
  });

  it('start com erro HTTP e com exceção de rede', async () => {
    render(<BotTraderX />);
    queue('/api/start', { ok: false, body: { error: 'Token JWT necessário' } });
    await act(async () => { fireEvent.click(startButton()); });
    expect(toast.error).toHaveBeenCalledWith('Erro ao iniciar: Token JWT necessário');

    queue('/api/start', () => { throw new Error('offline'); });
    await act(async () => { fireEvent.click(startButton()); });
    expect(toast.error).toHaveBeenCalledWith('Erro ao iniciar copy trading');
  });

  it('parar: sucesso, erro HTTP e exceção', async () => {
    render(<BotTraderX />);
    await startBot();
    queue('/api/stop', { ok: false, body: { error: 'Nenhuma sessão ativa encontrada' } });
    await act(async () => { fireEvent.click(screen.getByText('Parar')); });
    expect(toast.error).toHaveBeenCalledWith('Erro: Nenhuma sessão ativa encontrada');

    queue('/api/stop', () => { throw new Error('offline'); });
    await act(async () => { fireEvent.click(screen.getByText('Parar')); });
    expect(toast.error).toHaveBeenCalledWith('Erro ao parar copy trading');

    queue('/api/stop', { body: { message: 'ok' } });
    await act(async () => { fireEvent.click(screen.getByText('Parar')); });
    expect(toast.success).toHaveBeenCalledWith('Copy trading parado com sucesso!');
    expect(demoInput().disabled).toBe(false);
  });

  it('authError no status avisa e destrava a UI; falha de rede no polling é engolida', async () => {
    render(<BotTraderX />);
    await startBot();
    queue('/api/status', { body: { authError: { source: 'real', message: 'off' } } });
    await tick();
    expect(toast.error).toHaveBeenCalledWith('Conta Real desabilitada: off', { toastId: 'auth-error' });
    expect(demoInput().disabled).toBe(false);

    queue('/api/status', { body: { authError: { source: 'demo', message: 'off' } } });
    await tick();
    expect(toast.error).toHaveBeenCalledWith('Conta Demo desabilitada: off', { toastId: 'auth-error' });

    queue('/api/status', () => { throw new Error('offline'); });
    await tick();
  });

  it('status sem martingale/stake usa 0', async () => {
    render(<BotTraderX />);
    queue('/api/status', { body: running({ copyTrading: { isRunning: true } }) });
    await startBot();
    expect(screen.queryByText('Vol 100')).toBeTruthy();
  });
});

describe('BotTraderX — estado local vs. respostas assíncronas', () => {
  it('BUG-15: UI percebe que o bot parou no servidor (stopWin/stopLoss/maxMartingale)', async () => {
    render(<BotTraderX />);
    queue('/api/status', { body: running() });
    await startBot();
    expect(demoInput().disabled).toBe(true);

    // Servidor parou o bot sozinho (ex.: stopWin). O setInterval usa o fetchStatus
    // do primeiro render, onde isStart=false: a UI nunca sai do estado "rodando".
    queue('/api/status', { body: { ...running(), copyTrading: { isRunning: false } } });
    await tick();

    expect(demoInput().disabled).toBe(false);
    expect(screen.queryByText('Parar')).toBeNull();
  });

  it('BUG-15: parada pelo servidor avisa o motivo (último erro)', async () => {
    render(<BotTraderX />);
    await startBot();
    queue('/api/status', { body: {
      ...running(),
      copyTrading: { isRunning: false },
      errors: { errors: [], lastError: { message: 'Deriv não respondeu à compra em 30s. Bot parado para evitar ordem duplicada; confira a conta real.' } },
    } });
    await tick();

    expect(toast.warning).toHaveBeenCalledWith(
      'Bot parado pelo servidor: Deriv não respondeu à compra em 30s. Bot parado para evitar ordem duplicada; confira a conta real.',
      { toastId: 'server-stopped' },
    );
    await tick();
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  it('BUG-15: sessão inexistente no servidor (ex.: reinício) destrava a UI', async () => {
    render(<BotTraderX />);
    await startBot();
    serverRunning = false;
    await tick();

    expect(demoInput().disabled).toBe(false);
    expect(screen.queryByText('Parar')).toBeNull();
  });

  it('BUG-15: status pedido antes do start e respondido depois não desfaz o start', async () => {
    render(<BotTraderX />);
    let answerOldPoll!: () => void;
    queue('/api/status', () => new Promise((resolve) => {
      answerOldPoll = () => resolve({ body: { isRunning: false, message: 'Copy trading não iniciado' } });
    }));
    await tick(); // polling pendente
    await startBot();
    expect(demoInput().disabled).toBe(true);

    await act(async () => { answerOldPoll(); });
    await tick(0);
    expect(demoInput().disabled).toBe(true);
    expect(screen.getByText('Parar')).toBeTruthy();
  });

  it('BUG-15: resposta de status mais antiga não sobrescreve uma mais nova', async () => {
    render(<BotTraderX />);
    await startBot();
    let answerSlow!: () => void;
    queue('/api/status', () => new Promise((resolve) => {
      answerSlow = () => resolve({ body: running({ balance: 1 }) });
    }));
    await tick(); // poll lento pendente
    queue('/api/status', { body: running({ balance: 777, errors: { errors: [{ message: 'mais novo' }] } }) });
    await tick(); // poll rápido aplica
    expect(screen.getByText('mais novo')).toBeTruthy();

    await act(async () => { answerSlow(); });
    await tick(0);
    expect(screen.getByText('mais novo')).toBeTruthy();
  });

  it('BUG-12 (UI): erro do start mostra a mensagem do servidor', async () => {
    render(<BotTraderX />);
    queue('/api/start', { ok: false, body: { success: false, error: 'Falha ao gerar OTP da Deriv (503)' } });
    await act(async () => { fireEvent.click(startButton()); });
    expect(toast.error).toHaveBeenCalledWith('Erro ao iniciar: Falha ao gerar OTP da Deriv (503)');
  });

  it('BUG-10 (UI): botão Parar envia só a sessão do usuário, sem stopAll', async () => {
    render(<BotTraderX />);
    await startBot();
    queue('/api/stop', { body: { message: 'ok' } });
    await act(async () => { fireEvent.click(screen.getByText('Parar')); });

    expect(calls.find((c) => c.url === '/api/stop')!.body?.stopAll).not.toBe(true);
  });

  it('BUG-12 (UI): resposta { success: false } não é exibida como sucesso', async () => {
    render(<BotTraderX />);
    queue('/api/start', { body: { success: false, userId: '', message: 'Token JWT inválido' } });
    await act(async () => { fireEvent.click(startButton()); });

    expect(toast.success).not.toHaveBeenCalled();
    expect(demoInput().disabled).toBe(false);
  });
});

describe('página /bottrader', () => {
  it('carregando, com acesso e sem acesso', () => {
    h.access = { hasAccess: false, loading: true };
    const { rerender } = render(<BotTrade />);
    expect(screen.getByText('Verificando permissões...')).toBeTruthy();

    h.access = { hasAccess: false, loading: false };
    rerender(<BotTrade />);
    expect(screen.getByText('Acesso Negado')).toBeTruthy();

    h.access = { hasAccess: true, loading: false };
    rerender(<BotTrade />);
    expect(screen.getByPlaceholderText('Demo Token')).toBeTruthy();
  });
});
