// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page from '../app/(withSidebar)/bear-bot-ultra-2/page';
import React from 'react';

// Mock useModuleAccess
const mockUseModuleAccess = vi.fn();
vi.mock('@/app/hooks/useModuleAccess', () => ({
  useModuleAccess: (moduleName: string) => mockUseModuleAccess(moduleName),
}));

// Mock bearBotUltra2 component
vi.mock('../app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2', () => ({
  default: () => <div data-testid="bear-bot-ultra-2-content">BearBotUltra2 Content</div>,
}));

describe('BearBotUltra 2 - Page Module Access Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe estado de carregamento enquanto verifica permissões', () => {
    mockUseModuleAccess.mockReturnValue({ hasAccess: false, loading: true });

    render(<Page />);

    expect(screen.getByText('Verificando permissões...')).toBeInTheDocument();
    expect(screen.queryByTestId('bear-bot-ultra-2-content')).not.toBeInTheDocument();
    expect(screen.queryByText('Acesso Negado')).not.toBeInTheDocument();
  });

  it('exibe componente de Acesso Negado quando o usuário não possui permissão para o módulo', () => {
    mockUseModuleAccess.mockReturnValue({ hasAccess: false, loading: false });

    render(<Page />);

    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    expect(screen.getByText('Você não tem permissão para acessar este módulo.')).toBeInTheDocument();
    expect(screen.queryByTestId('bear-bot-ultra-2-content')).not.toBeInTheDocument();
  });

  it('exibe o conteúdo do BearBotUltra 2 quando o usuário tem acesso permitido', () => {
    mockUseModuleAccess.mockReturnValue({ hasAccess: true, loading: false });

    render(<Page />);

    expect(screen.getByTestId('bear-bot-ultra-2-content')).toBeInTheDocument();
    expect(screen.queryByText('Verificando permissões...')).not.toBeInTheDocument();
    expect(screen.queryByText('Acesso Negado')).not.toBeInTheDocument();
  });
});
