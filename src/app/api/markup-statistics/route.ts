import { NextResponse } from 'next/server';

/**
 * Proxy server-side para o endpoint REST de estatísticas de markup da nova API Deriv.
 *
 * GET https://api.derivws.com/applications/v1/markup-statistics?date_from=&date_to=
 * Auth: OAuth2 Bearer token (scope `application_read`) + header `Deriv-App-ID`.
 *
 * Feito no servidor para evitar problemas de CORS e seguir o mesmo padrão das
 * demais rotas Deriv (`deriv-auth`, `deriv-otp`).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { date_from, date_to } = body;

    // O access token pode chegar no header Authorization (Bearer) ou no body.
    const authHeader = request.headers.get('authorization') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';
    const accessToken = bearer || body.accessToken;

    console.log("api NEXT_PUBLIC_DERIV_CLIENT_ID ", process.env.NEXT_PUBLIC_DERIV_CLIENT_ID);
    console.log("api accessToken ", accessToken);

    // const appId =
    //   request.headers.get('deriv-app-id') ||
    //   process.env.NEXT_PUBLIC_DERIV_CLIENT_ID ||
    //   process.env.NEXT_PUBLIC_APPID;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'AccessToken é obrigatório' },
        { status: 400 }
      );
    }

    if (!date_from || !date_to) {
      return NextResponse.json(
        { error: 'date_from e date_to são obrigatórios (formato YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const url = `https://api.derivws.com/applications/v1/markup-statistics?date_from=${encodeURIComponent(
      date_from
    )}&date_to=${encodeURIComponent(date_to)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Deriv-App-ID': process.env.NEXT_PUBLIC_DERIV_CLIENT_ID || '',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.errors?.[0]?.message || 'Falha ao obter estatísticas de markup';
      return NextResponse.json(
        { error: message, details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
