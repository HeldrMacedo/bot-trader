import { describe, it, expect } from 'vitest';
import { describeTokenResponse } from '../app/services/derivTokenDiagnostics';

describe('describeTokenResponse', () => {
  const tokenData = {
    access_token: 'ory_at_SECRET_ACCESS',
    refresh_token: 'ory_rt_SECRET_REFRESH',
    id_token: 'eyJ.SECRET.ID',
    expires_in: 3599,
    scope: 'trade account_manage application_read',
    token_type: 'bearer',
  };

  it('resume campos, validade e escopo sem expor valores de token', () => {
    const summary = describeTokenResponse(tokenData);

    expect(summary).toEqual({
      fields: ['access_token', 'expires_in', 'id_token', 'refresh_token', 'scope', 'token_type'],
      hasRefreshToken: true,
      expiresIn: 3599,
      scope: 'trade account_manage application_read',
      tokenType: 'bearer',
    });
    expect(JSON.stringify(summary)).not.toMatch(/SECRET/);
  });

  it('indica ausência de refresh token', () => {
    const { refresh_token, ...withoutRefresh } = tokenData;

    expect(describeTokenResponse(withoutRefresh).hasRefreshToken).toBe(false);
  });

  it('tolera resposta vazia', () => {
    expect(describeTokenResponse(null)).toEqual({
      fields: [],
      hasRefreshToken: false,
      expiresIn: null,
      scope: null,
      tokenType: null,
    });
  });
});
