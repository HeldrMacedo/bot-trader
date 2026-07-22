/**
 * Camada central de conexão/autenticação com a Deriv.
 *
 * ────────────────────────────────────────────────────────────────────────
 * IMPORTANTE: a Deriv tem DUAS APIs e elas NÃO são compatíveis:
 *
 *  1) API LEGADA / CLÁSSICA  (ws.derivws.com/websockets/v3)
 *     - Auth: mensagem { authorize: <token> } no WebSocket.
 *     - Compra direta: { buy: 1, parameters: { symbol, ... } }  (campo "symbol").
 *     - Possui stream de transações: { transaction: 1, subscribe: 1 }.
 *     - É a base do COPY TRADER (o wsListener depende do transaction stream).
 *     - Status: em descontinuação, mas ainda operante.
 *
 *  2) API NOVA / OPTIONS  (api.derivws.com/trading/v1/options)
 *     - Auth: token (PAT ou OAuth) como header Authorization: Bearer →
 *       REST POST /accounts/{accountId}/otp → devolve uma websocket_url já
 *       autorizada (/ws/demo ou /ws/real). NÃO usa { authorize }.
 *     - Usa "underlying_symbol" e compra em 2 passos (proposal → buy <id>).
 *     - Não há (na doc) stream de transações equivalente ao do copy trader.
 *
 * Tokens suportados aqui:
 *  - PAT (`pat_...`) ou API token legado  -> API LEGADA via { authorize }.
 *    É o fluxo do "Personal Access Token": o usuário gera o token na Deriv,
 *    cola manualmente, e escolhe demo/real gerando o PAT na conta desejada
 *    (PAT da conta virtual no campo demo; PAT da conta real no campo real).
 *  - `oauth:<access_token>:<account_id>`  -> API NOVA via OTP (usado pelo
 *    fluxo OAuth do restante do app). Mantido por compatibilidade.
 * ────────────────────────────────────────────────────────────────────────
 */

// app_id público de fallback (WebSocket legado / PAT clássico).
// Market data (ticks) no DerivService usa o gateway público, sem app_id:
// wss://api.derivws.com/trading/v1/options/ws/public
// Defina NEXT_PUBLIC_APPID com o app_id numérico registrado para o seu domínio.
const DEFAULT_APP_ID = '1089';

/** app_id numérico usado na URL do WebSocket legado. */
export function getDerivAppId(): string {
  return process.env.NEXT_PUBLIC_APPID || DEFAULT_APP_ID;
}

/**
 * Valor do header `Deriv-App-ID` nas chamadas REST (OTP da API nova).
 * Prefere o app_id numérico; cai para o client_id OAuth se aquele não existir.
 */
function getDerivRestAppId(): string {
  return (
    process.env.NEXT_PUBLIC_APPID ||
    process.env.NEXT_PUBLIC_DERIV_CLIENT_ID ||
    DEFAULT_APP_ID
  );
}

/** URL do WebSocket legado (PAT / token clássico via { authorize }). */
export function buildDerivWsUrl(): string {
  return `wss://ws.derivws.com/websockets/v3?app_id=${getDerivAppId()}&l=en&brand=deriv`;
}

/** Detecta o formato visual de um Personal Access Token da Deriv. */
export function isPatToken(token: string): boolean {
  return typeof token === 'string' && token.startsWith('pat_');
}

export type ParsedToken =
  // OAuth multi-conta -> API nova (OTP)
  | { kind: 'oauth'; accessToken: string; accountId: string; raw: string }
  // PAT manual -> API legada (authorize)
  | { kind: 'pat'; token: string; raw: string }
  // API token legado -> API legada (authorize)
  | { kind: 'classic'; token: string; raw: string };

/** Classifica o token recebido (oauth: composto / pat_ / token legado). */
export function parseDerivToken(token: string): ParsedToken {
  if (token && token.startsWith('oauth:')) {
    const [, accessToken, accountId] = token.split(':');
    return { kind: 'oauth', accessToken, accountId, raw: token };
  }
  if (isPatToken(token)) {
    return { kind: 'pat', token, raw: token };
  }
  return { kind: 'classic', token, raw: token };
}

/**
 * (API NOVA) Troca um Bearer token + account_id por uma websocket_url
 * pré-autorizada (OTP). A URL é de uso único: chame a cada (re)conexão.
 * Mantido para o fluxo `oauth:`; não é usado pelo copy trader via PAT.
 */
export async function fetchOtpWebsocketUrl(
  accessToken: string,
  accountId: string,
): Promise<string> {
  const response = await fetch(
    `https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_CLIENT_ID,
      },
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Falha ao gerar OTP da Deriv (${response.status}): ${details}`);
  }

  const data = await response.json();
  const url = data?.data?.url || data?.data?.websocket_url;
  if (!url) {
    throw new Error('Resposta de OTP da Deriv sem websocket_url');
  }
  return url;
}

export interface DerivConnection {
  /** URL final do WebSocket a abrir. */
  url: string;
  /** true quando ainda é preciso enviar { authorize: token } no open. */
  needsAuthorize: boolean;
  /** token a usar no authorize (apenas quando needsAuthorize). */
  token: string;
}

/**
 * (NOVO) Busca a lista de contas atreladas ao PAT para descobrir o accountId.
 */
export async function fetchAccountIdFromPat(patToken: string, accountType: 'demo' | 'real'): Promise<string> {
  const response = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${patToken}`,
      'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_CLIENT_ID,
    },
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Falha ao buscar contas do PAT (${response.status}): ${details}`);
  }

  const data = await response.json();
  const accounts = data?.data;

  if (!accounts || accounts.length === 0) {
    throw new Error('Nenhuma conta de Options encontrada para este token PAT.');
  }

  const accountId = accounts.find(acc => acc.account_type === accountType)

  // Aqui estamos pegando a primeira conta da lista.
  // Se o usuário tiver mais de uma, você pode adicionar uma lógica para
  // filtrar por accounts.find(acc => acc.account_type === 'demo') etc.
  return accountId?.account_id;
}

/**
 * Resolve URL + necessidade de authorize a partir do token.
 *  - PAT (`pat_`) ou token legado -> API LEGADA: { authorize: token }.
 *  - `oauth:<at>:<acct>`          -> API NOVA: OTP (socket pré-autorizado).
 *
 * Lança erro se o OTP falhar (não faz fallback silencioso para conexão
 * não autenticada).
 */
export async function resolveDerivConnection(token: string, accountType: 'demo' | 'real'): Promise<DerivConnection> {
  const parsed = parseDerivToken(token);

  if (parsed.kind === 'oauth') {
    const url = await fetchOtpWebsocketUrl(parsed.accessToken, parsed.accountId);
    return { url, needsAuthorize: false, token: parsed.raw };
  }

  if (parsed.kind === 'pat') {
    // 1. Descobrir o accountId atrelado a este PAT
    const accountId = await fetchAccountIdFromPat(parsed.token, accountType);

    // 2. Gerar a URL do WebSocket autorizada (OTP)
    const url = await fetchOtpWebsocketUrl(parsed.token, accountId);

    // 3. Retorna a conexão NOVA. needsAuthorize é false pois a URL já tem o?otp=
    return { url, needsAuthorize: false, token: parsed.token };
  }

  // Fallback (API token legado clássico que não começa com pat_) 
  // Usa o caminho antigo: WebSocket legado + mensagem { authorize }.
  return { url: buildDerivWsUrl(), needsAuthorize: true, token: parsed.token };
}
