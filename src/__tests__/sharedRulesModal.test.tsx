// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SharedRulesModal from '../app/(withSidebar)/trade-mind-pro/components/SharedRulesModal';

// ─── Helpers de token ─────────────────────────────────────────────────────────

function makeFakeToken(userId: number): string {
  const header = 'eyJhbGciOiJIUzI1NiJ9';
  const payload = btoa(JSON.stringify({ userId, exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `${header}.${payload}.fake-signature`;
}

// ─── Dados base ───────────────────────────────────────────────────────────────

const RULE_ADVANCED = {
  id: 1,
  title: 'Dígito dominante',
  ruleText: 'Se o dígito mais frequente apareceu 4+ vezes, aposte DIGITMATCH',
  isAdvanced: true,
  usageCount: 5,
  createdAt: '2024-01-15T10:00:00Z',
  user: { name: 'João' },
};

const RULE_STANDARD = {
  id: 2,
  title: 'Sequência longa',
  ruleText: 'Se o mesmo dígito se repetiu 4 vezes consecutivas, aposte DIGITDIFF',
  isAdvanced: false,
  usageCount: 2,
  createdAt: '2024-01-16T10:00:00Z',
  user: { name: 'Maria' },
};

const MOCK_RULES = [RULE_ADVANCED, RULE_STANDARD];

// ─── Helpers de fetch ─────────────────────────────────────────────────────────

function stubFetch(data: any, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  }));
}

function stubFetchSequence(...calls: Array<{ data: any; ok?: boolean }>) {
  const fn = vi.fn();
  calls.forEach(({ data, ok = true }) =>
    fn.mockResolvedValueOnce({ ok, json: () => Promise.resolve(data) }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

// Seletores reais do componente (placeholder text do HTML renderizado)
const PLACEHOLDER_TITLE = /Dígito dominante com alternância confirmada/i;
const PLACEHOLDER_SEARCH = /Pesquisar estratégias/i;
const PLACEHOLDER_RULE_ADVANCED = /aposte DIGITDIFF nesse dígito/i;

// ─── Props padrão ─────────────────────────────────────────────────────────────

const baseProps = {
  onClose: vi.fn(),
  onUseRule: vi.fn(),
  currentMode: 'advanced' as const,
  currentInput: '',
};

/** Abre a aba Compartilhar aguardando o GET completar */
async function openShareTab(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => screen.getByText(/Explorar/i));
  await user.click(screen.getByText('+ Compartilhar'));
}

/** Preenche o formulário de compartilhamento */
async function fillShareForm(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  ruleText: string,
) {
  await user.type(screen.getByPlaceholderText(PLACEHOLDER_TITLE), title);
  const textarea = document.querySelector('textarea')!;
  fireEvent.change(textarea, { target: { value: ruleText } });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  stubFetch(MOCK_RULES);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// =============================================================================
// 1. CARREGAMENTO INICIAL
// =============================================================================

describe('Carregamento inicial', () => {
  it('chama GET /api/shared-rules ao montar', async () => {
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/shared-rules'));
  });

  it('exibe o título do modal', () => {
    render(<SharedRulesModal {...baseProps} />);
    expect(screen.getByText(/Estratégias da Comunidade/i)).toBeInTheDocument();
  });

  it('exibe as regras retornadas pelo GET', async () => {
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText('Dígito dominante')).toBeInTheDocument();
      expect(screen.getByText('Sequência longa')).toBeInTheDocument();
    });
  });

  it('exibe badge 🧠 Avançado para regras avançadas', async () => {
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => expect(screen.getByText('🧠 Avançado')).toBeInTheDocument());
  });

  it('exibe badge Estratégia para regras não avançadas', async () => {
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => expect(screen.getByText('Estratégia')).toBeInTheDocument());
  });

  it('exibe contagem de usos quando usageCount > 0', async () => {
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => expect(screen.getByText('5 usos')).toBeInTheDocument());
  });

  it('exibe o nome do autor de cada regra', async () => {
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText(/João/)).toBeInTheDocument();
      expect(screen.getByText(/Maria/)).toBeInTheDocument();
    });
  });

  it('exibe a contagem de regras no botão da aba Explorar', async () => {
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => expect(screen.getByText(/Explorar \(2\)/i)).toBeInTheDocument());
  });

  it('não exibe contagem antes do GET completar', () => {
    render(<SharedRulesModal {...baseProps} />);
    // Enquanto carrega, o "(n)" ainda não aparece
    expect(screen.queryByText(/Explorar \(\d+\)/i)).not.toBeInTheDocument();
  });

  it('exibe estado vazio quando não há regras', async () => {
    stubFetch([]);
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() =>
      expect(screen.getByText(/Nenhuma estratégia compartilhada ainda/i)).toBeInTheDocument(),
    );
  });

  it('exibe campo de busca na aba Explorar', () => {
    render(<SharedRulesModal {...baseProps} />);
    expect(screen.getByPlaceholderText(PLACEHOLDER_SEARCH)).toBeInTheDocument();
  });

  it('não exibe campo de busca na aba Compartilhar', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    expect(screen.queryByPlaceholderText(PLACEHOLDER_SEARCH)).not.toBeInTheDocument();
  });
});

// =============================================================================
// 2. FILTRO DE BUSCA
// =============================================================================

describe('Filtro de busca', () => {
  it('filtra regras por título ao digitar na busca', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getByText('Dígito dominante'));

    await user.type(screen.getByPlaceholderText(PLACEHOLDER_SEARCH), 'dominante');
    expect(screen.getByText('Dígito dominante')).toBeInTheDocument();
    expect(screen.queryByText('Sequência longa')).not.toBeInTheDocument();
  });

  it('filtra regras pelo conteúdo do ruleText', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getByText('Sequência longa'));

    await user.type(screen.getByPlaceholderText(PLACEHOLDER_SEARCH), 'consecutivas');
    expect(screen.queryByText('Dígito dominante')).not.toBeInTheDocument();
    expect(screen.getByText('Sequência longa')).toBeInTheDocument();
  });

  it('a busca é case-insensitive', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getByText('Dígito dominante'));

    await user.type(screen.getByPlaceholderText(PLACEHOLDER_SEARCH), 'DOMINANTE');
    expect(screen.getByText('Dígito dominante')).toBeInTheDocument();
  });

  it('exibe "Nenhuma estratégia encontrada" quando busca não corresponde', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getByText('Dígito dominante'));

    await user.type(screen.getByPlaceholderText(PLACEHOLDER_SEARCH), 'xyz_nao_existe');
    expect(screen.getByText(/Nenhuma estratégia encontrada/i)).toBeInTheDocument();
  });

  it('ao limpar a busca exibe todas as regras novamente', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getByText('Dígito dominante'));

    const input = screen.getByPlaceholderText(PLACEHOLDER_SEARCH);
    await user.type(input, 'dominante');
    expect(screen.queryByText('Sequência longa')).not.toBeInTheDocument();

    await user.clear(input);
    expect(screen.getByText('Sequência longa')).toBeInTheDocument();
  });
});

// =============================================================================
// 3. BOTÃO USAR
// =============================================================================

describe('Botão Usar', () => {
  it('chama PATCH /api/shared-rules com o id da regra', async () => {
    const fetchFn = stubFetchSequence(
      { data: MOCK_RULES },
      { data: { ok: true } },
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getAllByText('Usar'));

    await user.click(screen.getAllByText('Usar')[0]);

    expect(fetchFn).toHaveBeenCalledWith('/api/shared-rules', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ id: RULE_ADVANCED.id }),
    }));
  });

  it('chama onUseRule com ruleText e isAdvanced=true para regra avançada', async () => {
    stubFetchSequence({ data: MOCK_RULES }, { data: { ok: true } });
    const onUseRule = vi.fn();
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} onUseRule={onUseRule} />);
    await waitFor(() => screen.getAllByText('Usar'));

    await user.click(screen.getAllByText('Usar')[0]);
    expect(onUseRule).toHaveBeenCalledWith(RULE_ADVANCED.ruleText, true);
  });

  it('chama onUseRule com isAdvanced=false para regra padrão', async () => {
    stubFetchSequence(
      { data: MOCK_RULES },
      { data: { ok: true } },  // PATCH da 1ª regra (não será clicada)
      { data: { ok: true } },  // PATCH da 2ª regra
    );
    const onUseRule = vi.fn();
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} onUseRule={onUseRule} />);
    await waitFor(() => screen.getAllByText('Usar'));

    await user.click(screen.getAllByText('Usar')[1]); // segunda regra = padrão
    expect(onUseRule).toHaveBeenCalledWith(RULE_STANDARD.ruleText, false);
  });

  it('chama onUseRule mesmo quando o PATCH falha (silent fail)', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RULES) })
      .mockRejectedValueOnce(new Error('network error')),
    );
    const onUseRule = vi.fn();
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} onUseRule={onUseRule} />);
    await waitFor(() => screen.getAllByText('Usar'));

    await user.click(screen.getAllByText('Usar')[0]);
    expect(onUseRule).toHaveBeenCalled();
  });
});

// =============================================================================
// 4. BOTÃO EXCLUIR (✕)
// =============================================================================

describe('Botão Excluir (✕)', () => {
  it('não exibe botão ✕ quando não há token no localStorage', async () => {
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getByText('Dígito dominante'));
    expect(screen.queryByTitle('Excluir minha estratégia')).not.toBeInTheDocument();
  });

  it('exibe botão ✕ para cada regra quando há token no localStorage', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getAllByTitle('Excluir minha estratégia'));
    expect(screen.getAllByTitle('Excluir minha estratégia')).toHaveLength(2);
  });

  it('chama DELETE /api/shared-rules com id e Bearer token', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    const fetchFn = stubFetchSequence(
      { data: MOCK_RULES },
      { data: { ok: true } },
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getAllByTitle('Excluir minha estratégia'));

    await user.click(screen.getAllByTitle('Excluir minha estratégia')[0]);

    expect(fetchFn).toHaveBeenCalledWith('/api/shared-rules', expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({
        Authorization: expect.stringContaining('Bearer '),
      }),
      body: JSON.stringify({ id: RULE_ADVANCED.id }),
    }));
  });

  it('remove a regra da lista após DELETE bem-sucedido', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    stubFetchSequence({ data: MOCK_RULES }, { data: { ok: true } });
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getAllByTitle('Excluir minha estratégia'));

    await user.click(screen.getAllByTitle('Excluir minha estratégia')[0]);
    await waitFor(() =>
      expect(screen.queryByText('Dígito dominante')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Sequência longa')).toBeInTheDocument();
  });

  it('não remove a regra quando DELETE retorna ok=false', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    stubFetchSequence(
      { data: MOCK_RULES },
      { data: { message: 'Sem permissão' }, ok: false },
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await waitFor(() => screen.getAllByTitle('Excluir minha estratégia'));

    await user.click(screen.getAllByTitle('Excluir minha estratégia')[0]);
    await waitFor(() =>
      expect(screen.getByText('Dígito dominante')).toBeInTheDocument(),
    );
  });
});

// =============================================================================
// 5. NAVEGAÇÃO ENTRE ABAS
// =============================================================================

describe('Navegação entre abas', () => {
  it('inicia na aba Explorar com campo de busca visível', () => {
    render(<SharedRulesModal {...baseProps} />);
    expect(screen.getByPlaceholderText(PLACEHOLDER_SEARCH)).toBeInTheDocument();
  });

  it('exibe formulário ao clicar em + Compartilhar', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    expect(screen.getByPlaceholderText(PLACEHOLDER_TITLE)).toBeInTheDocument();
  });

  it('retorna para aba Explorar ao clicar em Explorar', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    await user.click(screen.getByText(/Explorar/i));
    expect(screen.getByPlaceholderText(PLACEHOLDER_SEARCH)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(PLACEHOLDER_TITLE)).not.toBeInTheDocument();
  });
});

// =============================================================================
// 6. FORMULÁRIO DE COMPARTILHAMENTO
// =============================================================================

describe('Formulário de compartilhamento', () => {
  // ── Props iniciais ────────────────────────────────────────────────────────

  it('pré-preenche ruleText com currentInput quando fornecido', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} currentInput="Regra pré-preenchida" />);
    await openShareTab(user);
    expect(screen.getByDisplayValue('Regra pré-preenchida')).toBeInTheDocument();
  });

  it('pré-seleciona modo Avançado quando currentMode é "advanced"', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} currentMode="advanced" />);
    await openShareTab(user);
    expect(screen.getByText('🧠 Avançada')).toHaveClass('bg-purple-600');
  });

  // ── Validação ─────────────────────────────────────────────────────────────

  it('botão de compartilhar está desabilitado quando campos estão vazios', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    expect(screen.getByText(/Compartilhar com a comunidade/i)).toBeDisabled();
  });

  it('botão fica desabilitado quando apenas o título está preenchido', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    await user.type(screen.getByPlaceholderText(PLACEHOLDER_TITLE), 'Meu título');
    expect(screen.getByText(/Compartilhar com a comunidade/i)).toBeDisabled();
  });

  it('botão fica habilitado quando título e ruleText estão preenchidos', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    await user.type(screen.getByPlaceholderText(PLACEHOLDER_TITLE), 'Meu título');
    fireEvent.change(document.querySelector('textarea')!, { target: { value: 'Minha regra' } });
    expect(screen.getByText(/Compartilhar com a comunidade/i)).not.toBeDisabled();
  });

  it('exibe mensagem de erro quando não há token no localStorage', async () => {
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    await fillShareForm(user, 'Meu título', 'Minha regra');
    await user.click(screen.getByText(/Compartilhar com a comunidade/i));
    expect(await screen.findByText(/Faça login/i)).toBeInTheDocument();
  });

  // ── Submissão ─────────────────────────────────────────────────────────────

  it('envia POST com Authorization Bearer token', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    const fetchFn = stubFetchSequence(
      { data: MOCK_RULES },
      { data: RULE_ADVANCED },
      { data: MOCK_RULES },
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    await fillShareForm(user, 'Nova estratégia', 'Descrição da regra');
    await user.click(screen.getByText(/Compartilhar com a comunidade/i));

    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith('/api/shared-rules', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer '),
        }),
      })),
    );
  });

  it('envia isAdvanced=true no body quando modo Avançado está selecionado', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    const fetchFn = stubFetchSequence(
      { data: MOCK_RULES },
      { data: RULE_ADVANCED },
      { data: MOCK_RULES },
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} currentMode="advanced" />);
    await openShareTab(user);
    await fillShareForm(user, 'Título', 'Regra');
    await user.click(screen.getByText(/Compartilhar com a comunidade/i));

    await waitFor(() => {
      const postCall = fetchFn.mock.calls.find(
        ([url, opts]: [string, any]) => url === '/api/shared-rules' && opts?.method === 'POST',
      );
      expect(postCall).toBeDefined();
      expect(JSON.parse(postCall![1].body).isAdvanced).toBe(true);
    });
  });

  it('envia o title e ruleText corretos no body do POST', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    const fetchFn = stubFetchSequence(
      { data: MOCK_RULES },
      { data: RULE_ADVANCED },
      { data: MOCK_RULES },
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    await fillShareForm(user, 'Minha estratégia', 'Texto da regra aqui');
    await user.click(screen.getByText(/Compartilhar com a comunidade/i));

    await waitFor(() => {
      const postCall = fetchFn.mock.calls.find(
        ([url, opts]: [string, any]) => url === '/api/shared-rules' && opts?.method === 'POST',
      );
      const body = JSON.parse(postCall![1].body);
      expect(body.title).toBe('Minha estratégia');
      expect(body.ruleText).toBe('Texto da regra aqui');
    });
  });

  it('exibe mensagem de sucesso após POST bem-sucedido', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    stubFetchSequence(
      { data: MOCK_RULES },
      { data: RULE_ADVANCED },
      { data: MOCK_RULES },
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    await fillShareForm(user, 'Título', 'Regra');
    await user.click(screen.getByText(/Compartilhar com a comunidade/i));
    expect(await screen.findByText(/compartilhada com sucesso/i)).toBeInTheDocument();
  });

  it('limpa os campos após compartilhamento bem-sucedido', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    stubFetchSequence(
      { data: MOCK_RULES },
      { data: RULE_ADVANCED },
      { data: MOCK_RULES },
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);

    const titleInput = screen.getByPlaceholderText(PLACEHOLDER_TITLE) as HTMLInputElement;
    await user.type(titleInput, 'Título');
    fireEvent.change(document.querySelector('textarea')!, { target: { value: 'Regra' } });
    await user.click(screen.getByText(/Compartilhar com a comunidade/i));
    await screen.findByText(/compartilhada com sucesso/i);

    expect(titleInput.value).toBe('');
    expect((document.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
  });

  it('exibe mensagem de erro quando POST retorna erro da API', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    stubFetchSequence(
      { data: MOCK_RULES },
      { data: { message: 'Título muito longo' }, ok: false },
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    await fillShareForm(user, 'Título', 'Regra');
    await user.click(screen.getByText(/Compartilhar com a comunidade/i));
    expect(await screen.findByText('Título muito longo')).toBeInTheDocument();
  });

  it('recarrega a lista de regras após compartilhamento bem-sucedido', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    const rulesComNova = [
      ...MOCK_RULES,
      { ...RULE_ADVANCED, id: 99, title: 'Nova regra da comunidade', user: { name: 'Pedro' } },
    ];
    stubFetchSequence(
      { data: MOCK_RULES },
      { data: RULE_ADVANCED },
      { data: rulesComNova },
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    await fillShareForm(user, 'Título', 'Regra');
    await user.click(screen.getByText(/Compartilhar com a comunidade/i));

    await user.click(screen.getByText(/Explorar/i));
    await waitFor(() =>
      expect(screen.getByText('Nova regra da comunidade')).toBeInTheDocument(),
    );
  });

  it('exibe mensagem de erro de conexão quando fetch lança exceção', async () => {
    localStorage.setItem('access_token', makeFakeToken(42));
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RULES) })
      .mockRejectedValueOnce(new Error('network error')),
    );
    const user = userEvent.setup();
    render(<SharedRulesModal {...baseProps} />);
    await openShareTab(user);
    await fillShareForm(user, 'Título', 'Regra');
    await user.click(screen.getByText(/Compartilhar com a comunidade/i));
    expect(await screen.findByText(/Erro de conexão/i)).toBeInTheDocument();
  });
});

// =============================================================================
// 7. FECHAR O MODAL
// =============================================================================

describe('Fechar o modal', () => {
  it('chama onClose ao clicar no botão X', () => {
    const onClose = vi.fn();
    render(<SharedRulesModal {...baseProps} onClose={onClose} />);

    // O botão X é o único botão com SVG e sem texto no cabeçalho
    const allButtons = screen.getAllByRole('button');
    const closeBtn = allButtons.find(btn => !btn.textContent?.trim());
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no overlay (fundo escuro)', () => {
    const onClose = vi.fn();
    render(<SharedRulesModal {...baseProps} onClose={onClose} />);

    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao clicar dentro do painel do modal', async () => {
    const onClose = vi.fn();
    render(<SharedRulesModal {...baseProps} onClose={onClose} />);
    await waitFor(() => screen.getByText('Dígito dominante'));

    fireEvent.click(screen.getByText('Dígito dominante'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
