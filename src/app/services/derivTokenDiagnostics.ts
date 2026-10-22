/**
 * Diagnóstico temporário da resposta de `https://auth.deriv.com/oauth2/token`.
 *
 * Serve para confirmar se a Deriv devolve `refresh_token` e quanto dura o
 * access token, sem nunca registrar o valor de nenhum token. Remover junto com
 * o log em `/api/deriv-auth` quando o diagnóstico terminar.
 */
export interface TokenResponseSummary {
  fields: string[];
  hasRefreshToken: boolean;
  expiresIn: number | null;
  scope: string | null;
  tokenType: string | null;
}

export function describeTokenResponse(tokenData: Record<string, any> | null | undefined): TokenResponseSummary {
  const data = tokenData ?? {};

  return {
    fields: Object.keys(data).sort(),
    hasRefreshToken: typeof data.refresh_token === 'string' && data.refresh_token.length > 0,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : null,
    scope: typeof data.scope === 'string' ? data.scope : null,
    tokenType: typeof data.token_type === 'string' ? data.token_type : null,
  };
}
