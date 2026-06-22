import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { accessToken, accountId } = await request.json();
    const appId = process.env.NEXT_PUBLIC_DERIV_CLIENT_ID;

    if (!accessToken || !accountId) {
      return NextResponse.json({ error: 'AccessToken and AccountId are required' }, { status: 400 });
    }

    const response = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Deriv-App-ID': appId || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({ error: 'Failed to generate OTP', details: errorData }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({ websocket_url: data.data.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
