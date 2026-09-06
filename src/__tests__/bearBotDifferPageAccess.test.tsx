// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page from '../app/(withSidebar)/bear-bot-differ/page';
import React from 'react';

// Mock useModuleAccess
const mockUseModuleAccess = vi.fn();
vi.mock('@/app/hooks/useModuleAccess', () => ({
  useModuleAccess: (moduleName: string) => mockUseModuleAccess(moduleName),
}));

// Mock BearBotDiffer component
vi.mock('../app/(withSidebar)/bear-bot-differ/BearBotDiffer', () => ({
  default: () => <div data-testid="bear-bot-differ-content">BearBotDiffer Content</div>,
}));

describe('BearBotDiffer - Page Module Access Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe estado de carregamento enquanto verifica permissões', () => {
    mockUseModuleAccess.mockReturnValue({ hasAccess: false, loading: true });

    render(<Page />);

    expect(screen.getByText('Verificando permissões...')).toBeInTheDocument();
    expect(screen.queryByTestId('bear-bot-differ-content')).not.toBeInTheDocument();
    expect(screen.queryByText('Acesso Negado')).not.toBeInTheDocument();
  });

  it('exibe componente de Acesso Negado quando o usuário não possui permissão para o módulo', () => {
    mockUseModuleAccess.mockReturnValue({ hasAccess: false, loading: false });

    render(<Page />);

    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    expect(screen.getByText('Você não tem permissão para acessar este módulo.')).toBeInTheDocument();
    expect(screen.queryByTestId('bear-bot-differ-content')).not.toBeInTheDocument();
  });

  it('exibe o conteúdo do BearBotDiffer quando o usuário tem acesso permitido', () => {
    mockUseModuleAccess.mockReturnValue({ hasAccess: true, loading: false });

    render(<Page />);

    expect(screen.getByTestId('bear-bot-differ-content')).toBeInTheDocument();
    expect(screen.queryByText('Verificando permissões...')).not.toBeInTheDocument();
    expect(screen.queryByText('Acesso Negado')).not.toBeInTheDocument();
  });
});
