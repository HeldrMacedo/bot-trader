import { NextRequest, NextResponse } from 'next/server';
import { describeTokenResponse } from '@/app/services/derivTokenDiagnostics';

export async function POST(request: Request) {
  try {
    const { code, codeVerifier, redirectUri } = await request.json();
    const appId = process.env.NEXT_PUBLIC_APPID;

    if (!code || !codeVerifier) {
      return NextResponse.json({ error: 'Code and codeVerifier are required' }, { status: 400 });
    }

    // 1. Exchange code for access token
    const clientId = process.env.NEXT_PUBLIC_DERIV_CLIENT_ID || appId || '';
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code,
      code_verifier: codeVerifier,
    });
    
    if (redirectUri) {
      params.append('redirect_uri', redirectUri);
    }

    const tokenResponse = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      return NextResponse.json({ error: 'Failed to exchange token', details: errorData }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // TEMPORÁRIO: confirma se a Deriv devolve refresh_token e a validade do
    // access token. Só nomes de campos e metadados — nunca valores de token.
    console.log('[deriv-auth] token response:', describeTokenResponse(tokenData));

    // 2. Fetch accounts list
    const accountsResponse = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Deriv-App-ID': appId || '',
      },
    });

    if (!accountsResponse.ok) {
      const errorData = await accountsResponse.text();
      return NextResponse.json({ error: 'Failed to fetch accounts', details: errorData }, { status: accountsResponse.status });
    }

    const accountsData = await accountsResponse.json();

    return NextResponse.json({
      accessToken,
      accounts: accountsData.data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
