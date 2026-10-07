// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

const h = vi.hoisted(() => ({ access: { hasAccess: false, loading: true } }));

vi.mock('@/app/hooks/useModuleAccess', () => ({ useModuleAccess: () => h.access }));
vi.mock('../app/(withSidebar)/components/hasAccessComponent', () => ({ default: () => <div>sem acesso</div> }));
vi.mock('../app/(withSidebar)/bear-bot-ultra/bearBotUltra', () => ({ default: () => <div>robô</div> }));

import Page from '../app/(withSidebar)/bear-bot-ultra/page';

describe('Bear Bot Ultra — página', () => {
  afterEach(cleanup);

  it('mostra a verificação enquanto carrega', () => {
    h.access = { hasAccess: false, loading: true };
    render(<Page />);
    expect(screen.getByText('Verificando permissões...')).toBeDefined();
  });

  it('abre o robô para quem tem acesso', () => {
    h.access = { hasAccess: true, loading: false };
    render(<Page />);
    expect(screen.getByText('robô')).toBeDefined();
  });

  it('bloqueia quem não tem acesso', () => {
    h.access = { hasAccess: false, loading: false };
    render(<Page />);
    expect(screen.getByText('sem acesso')).toBeDefined();
  });
});
