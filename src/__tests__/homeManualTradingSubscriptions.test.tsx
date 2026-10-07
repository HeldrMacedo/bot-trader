// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import { createFakeDeriv, installStorage, seedHomeAccount } from './homeTestDeriv';

const h = vi.hoisted(() => ({ deriv: null as any }));

vi.mock('@/app/services/DerivService', () => ({
  DerivService: { getInstance: () => h.deriv },
}));
vi.mock('@/app/services/userService', () => ({ getUser: vi.fn(async () => ({ name: 'Ana' })) }));
vi.mock('@/app/services/operationService', () => ({ saveOperation: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import ManualTrading from '../app/(withSidebar)/home/components/ManualTrading';

function deferred<T = any>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('ManualTrading — assinaturas de ticks', () => {
  beforeEach(() => {
    installStorage();
    seedHomeAccount();
    h.deriv = createFakeDeriv();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as any);
    vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('cancela (forget) o stream cuja resposta chega depois do unmount', async () => {
    const pending = deferred();
    h.deriv.send.mockImplementation((payload: any) =>
      payload.ticks_history ? pending.promise : Promise.resolve({})
    );

    const { unmount } = render(<ManualTrading />);
    await act(async () => {});
    unmount();

    await act(async () => {
      pending.resolve({ history: { prices: [1.23], times: [1] }, subscription: { id: 'late-1' } });
    });

    expect(h.deriv.send).toHaveBeenCalledWith({ forget: 'late-1' });
  });
});
