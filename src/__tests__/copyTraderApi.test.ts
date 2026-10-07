import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

const h = vi.hoisted(() => ({
  instances: [] as any[],
  startImpl: null as null | (() => Promise<void>),
  admins: new Set<string>(),
}));

// verifyAdminToken consulta o role no banco; aqui o admin é decidido pelo userId do JWT.
vi.mock('@/app/(withSidebar)/operations/actions', async () => {
  const { default: jwtLib } = await import('jsonwebtoken');
  return {
    verifyAdminToken: vi.fn(async (token: string) => {
      try {
        return h.admins.has((jwtLib.verify(token, process.env.JWT_SECRET!) as any).userId);
      } catch {
        return false;
      }
    }),
  };
});

vi.mock('../app/services/copyTradingService', () => ({
  CopyTradingService: class {
    demoToken: string;
    realToken: string;
    userId: string;
    configure: any;
    running = false;
    stop = vi.fn(() => { this.running = false; });
    start = vi.fn(() => {
      this.running = true;
      return h.startImpl ? h.startImpl() : Promise.resolve();
    });
    getStats = vi.fn(() => ({
      isRunning: this.running,
      timePause: 0,
      authError: null,
      trading: { consecutiveLosses: 2, martingaleLevel: 1, maxMartingale: 0, onMaxMartingale: 'reset', currentStake: 0.7 },
      realAccount: { transactions: [{ profit: 1 }], totalWin: 1, totalLoss: 0, totalValueWin: 1, totalValueLoss: 0, totalProfit: 1 },
      realTransactions: [{ profit: 1 }],
      console: [],
      balance: 100,
      errors: { errors: [], lastError: null, errorCount: 0 },
    }));
    constructor(demoToken: string, realToken: string, userId: string, configure: any) {
      this.demoToken = demoToken;
      this.realToken = realToken;
      this.userId = userId;
      this.configure = configure;
      h.instances.push(this);
    }
  },
}));

import { CopyTradingManager } from '../app/services/copyTradingManager';
import { POST as startRoute } from '../app/api/start/route';
import { POST as stopRoute } from '../app/api/stop/route';
import { GET as statusRoute } from '../app/api/status/route';

const SECRET = 'segredo-de-teste';

function tokenFor(userId: string) {
  return jwt.sign({ userId }, SECRET);
}

function req(body: any, token?: string, method = 'POST') {
  return new Request('http://localhost/api', {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: method === 'GET' ? undefined : JSON.stringify(body),
  }) as any;
}

const manager = () => CopyTradingManager.getInstance();

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  h.instances = [];
  h.startImpl = null;
  h.admins = new Set(['root']);
  manager().destroy();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('CopyTradingManager', () => {
  it('é singleton', () => {
    expect(CopyTradingManager.getInstance()).toBe(manager());
  });

  it('inicia sessão por usuário e substitui a anterior do mesmo usuário', async () => {
    const r1 = await manager().startCopyTrading(tokenFor('u1'), 'd', 'r', { quantityLoss: 1 });
    expect(r1).toEqual({ success: true, userId: 'u1', message: 'Copy trading iniciado com sucesso' });
    const r2 = await manager().startCopyTrading(tokenFor('u1'), 'd2', 'r2', {});
    expect(r2.success).toBe(true);
    expect(h.instances[0].stop).toHaveBeenCalled();
    expect(manager().getActiveUserCount()).toBe(1);
  });

  it('rejeita JWT inválido no start', async () => {
    expect(await manager().startCopyTrading('lixo', 'd', 'r', {})).toEqual({ success: false, userId: '', message: 'Token JWT inválido' });
  });

  it('getStatus mapeia estatísticas e indica sessão inexistente', async () => {
    expect(manager().getStatus(tokenFor('nobody'))).toEqual({ isRunning: false, message: 'Copy trading não iniciado' });
    await manager().startCopyTrading(tokenFor('u1'), 'd', 'r', {});
    const status: any = manager().getStatus(tokenFor('u1'));
    expect(status.copyTrading.isRunning).toBe(true);
    expect(status.realAccount.totalProfit).toBe(1);
    expect(status.consecutiveLosses).toBe(2);
    expect(status.balance).toBe(100);
  });

  it('getStatus usa defaults quando o service devolve campos vazios', async () => {
    await manager().startCopyTrading(tokenFor('u1'), 'd', 'r', {});
    h.instances[0].getStats.mockReturnValueOnce({ isRunning: true, trading: {}, realAccount: undefined });
    const status: any = manager().getStatus(tokenFor('u1'));
    expect(status.realAccount.transactions).toEqual([]);
    expect(status.console).toEqual([]);
    expect(status.errors).toEqual({ errors: [], lastError: null, errorCount: 0 });
  });

  it('stopCopyTrading para apenas a sessão do usuário', async () => {
    await manager().startCopyTrading(tokenFor('u1'), 'd', 'r', {});
    expect(manager().stopCopyTrading(tokenFor('u1'))).toEqual({ success: true, message: 'Copy trading parado com sucesso' });
    expect(manager().stopCopyTrading(tokenFor('u1'))).toEqual({ success: false, message: 'Nenhuma sessão ativa encontrada' });
  });

  it('stopAllSessions e destroy toleram erro em uma sessão', async () => {
    await manager().startCopyTrading(tokenFor('u1'), 'd', 'r', {});
    await manager().startCopyTrading(tokenFor('u2'), 'd', 'r', {});
    h.instances[0].stop.mockImplementationOnce(() => { throw new Error('x'); });
    expect(manager().stopAllSessions()).toEqual({ stoppedCount: 1, message: 'Paradas 1 sessões' });

    await manager().startCopyTrading(tokenFor('u3'), 'd', 'r', {});
    h.instances[2].stop.mockImplementationOnce(() => { throw new Error('y'); });
    manager().destroy();
    expect(manager().getActiveUserCount()).toBe(0);
  });

  it('BUG-11: start não reporta sucesso quando a conexão com a Deriv falha', async () => {
    h.startImpl = () => Promise.reject(new Error('Falha ao gerar OTP da Deriv (401)'));
    const result = await manager().startCopyTrading(tokenFor('u1'), 'd', 'r', {});
    expect(result).toEqual({ success: false, userId: 'u1', message: 'Falha ao gerar OTP da Deriv (401)' });
  });

  it('BUG-11: start que falha não deixa sessão no manager e para o service', async () => {
    h.startImpl = () => Promise.reject(new Error('Falha ao gerar OTP da Deriv (401)'));
    await manager().startCopyTrading(tokenFor('u1'), 'd', 'r', {});
    expect(manager().getActiveUserCount()).toBe(0);
    expect(h.instances[0].stop).toHaveBeenCalled();
  });

  it('BUG-11: falha de um start antigo não remove a sessão nova do mesmo usuário', async () => {
    let failFirst!: (e: Error) => void;
    h.startImpl = () => new Promise<void>((_, reject) => { failFirst = reject; });
    const first = manager().startCopyTrading(tokenFor('u1'), 'd', 'r', {});
    h.startImpl = null;
    await manager().startCopyTrading(tokenFor('u1'), 'd', 'r', {});

    failFirst(new Error('Conexão cancelada'));
    expect((await first).success).toBe(false);
    expect(manager().getActiveUserCount()).toBe(1);
    expect(h.instances[1].stop).not.toHaveBeenCalled();
  });
});

describe('API /api/start', () => {
  it('exige Bearer', async () => {
    const res = await startRoute(req({ demoToken: 'd', realToken: 'r' }));
    expect(res.status).toBe(401);
  });

  it('aplica defaults de configuração e inicia', async () => {
    const res = await startRoute(req({ demoToken: 'd', realToken: 'r' }, tokenFor('u1')));
    expect(await res.json()).toMatchObject({ success: true, userId: 'u1' });
    expect(h.instances[0].configure).toEqual({
      quantityLoss: 0, stopLoss: 0, stopWin: 0, initialValue: 0.35, stakeMultiple: 1, pauseTime: 0,
      pauseTimeLoss: false, pauseTimeWin: false, maxMartingale: 0, onMaxMartingale: 'reset', testMode: false,
    });
  });

  it('responde 500 com corpo inválido', async () => {
    const bad = new Request('http://localhost/api', { method: 'POST', body: '{', headers: { authorization: 'Bearer x' } });
    const res = await startRoute(bad as any);
    expect(res.status).toBe(500);
  });

  it('BUG-12: JWT inválido não devolve HTTP 200 (a UI trata response.ok como sucesso)', async () => {
    const res = await startRoute(req({ demoToken: 'd', realToken: 'r' }, 'jwt-invalido'));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ success: false, error: 'Token JWT inválido' });
  });

  it('BUG-12: falha de conexão com a Deriv devolve 502 com a mensagem', async () => {
    h.startImpl = () => Promise.reject(new Error('Falha ao gerar OTP da Deriv (503)'));
    const res = await startRoute(req({ demoToken: 'd', realToken: 'r' }, tokenFor('u1')));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ success: false, error: 'Falha ao gerar OTP da Deriv (503)' });
  });
});

describe('API /api/status', () => {
  it('exige Bearer', async () => {
    expect((await statusRoute(req(null, undefined, 'GET'))).status).toBe(401);
  });

  it('devolve status da sessão', async () => {
    await manager().startCopyTrading(tokenFor('u1'), 'd', 'r', {});
    const res = await statusRoute(req(null, tokenFor('u1'), 'GET'));
    expect((await res.json()).copyTrading.isRunning).toBe(true);
  });

  it('devolve 400 com JWT inválido', async () => {
    expect((await statusRoute(req(null, 'x', 'GET'))).status).toBe(400);
  });
});

describe('API /api/stop', () => {
  it('exige Bearer quando não é stopAll', async () => {
    expect((await stopRoute(req({}))).status).toBe(401);
  });

  it('para a sessão do usuário e devolve 404 se não houver sessão', async () => {
    await manager().startCopyTrading(tokenFor('u1'), 'd', 'r', {});
    expect((await stopRoute(req({}, tokenFor('u1')))).status).toBe(200);
    expect((await stopRoute(req({}, tokenFor('u1')))).status).toBe(404);
  });

  it('devolve 500 com JWT inválido', async () => {
    expect((await stopRoute(req({}, 'x'))).status).toBe(500);
  });

  it('BUG-10: stopAll de um usuário comum é negado e não derruba a sessão de outro usuário', async () => {
    await manager().startCopyTrading(tokenFor('alice'), 'd', 'r', {});
    await manager().startCopyTrading(tokenFor('bob'), 'd', 'r', {});

    const res = await stopRoute(req({ stopAll: true }, tokenFor('alice')));

    expect(res.status).toBe(403);
    const bob: any = manager().getStatus(tokenFor('bob'));
    expect(bob.copyTrading?.isRunning).toBe(true);
    expect(manager().getActiveUserCount()).toBe(2);
  });

  it('BUG-10: stopAll sem JWT é negado', async () => {
    await manager().startCopyTrading(tokenFor('bob'), 'd', 'r', {});
    expect((await stopRoute(req({ stopAll: true }))).status).toBe(401);
    expect(manager().getActiveUserCount()).toBe(1);
  });

  it('stopAll de admin para todas as sessões', async () => {
    await manager().startCopyTrading(tokenFor('alice'), 'd', 'r', {});
    await manager().startCopyTrading(tokenFor('bob'), 'd', 'r', {});

    const res = await stopRoute(req({ stopAll: true }, tokenFor('root')));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stoppedSessions: 2 });
    expect(manager().getActiveUserCount()).toBe(0);
  });
});
