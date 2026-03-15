import { NextResponse } from 'next/server';

const MODEL_URLS: Record<string, string> = {
  'gemini-2.5-flash': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  'gemini-2.5-pro': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
  'gemini-2.0-flash': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
};

// Ordem de fallback: se o modelo solicitado falhar com 429, tentar os outros
const FALLBACK_ORDER = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseRetryDelay(data: any): number {
  try {
    const details = data?.error?.details;
    if (Array.isArray(details)) {
      for (const d of details) {
        if (d.retryDelay) {
          const match = d.retryDelay.match(/(\d+)/);
          if (match) return Math.min(parseInt(match[1], 10) * 1000, 5000);
        }
      }
    }
  } catch {}
  return 2000;
}

async function callModel(url: string, apiKey: string, contents: any, generationConfig: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({ contents, generationConfig })
  });

  const data = await response.json().catch(() => null);
  return { response, data };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'GEMINI_API_KEY não configurada' }, { status: 500 });
    }

    const body = await req.json();
    const modelId = body?.modelId as string | undefined;
    const contents = body?.contents;
    const generationConfig = body?.generationConfig;

    if (!modelId || !MODEL_URLS[modelId]) {
      return NextResponse.json({ message: 'modelId inválido' }, { status: 400 });
    }

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return NextResponse.json({ message: 'contents inválido' }, { status: 400 });
    }

    // Tentar o modelo solicitado primeiro
    let { response, data } = await callModel(MODEL_URLS[modelId], apiKey, contents, generationConfig);

    // Se 429 (rate limit), fazer retry com delay e fallback para outros modelos
    if (response.status === 429) {
      const retryDelay = parseRetryDelay(data);
      console.log(`[Gemini Proxy] 429 em ${modelId}, aguardando ${retryDelay}ms...`);
      await sleep(retryDelay);

      // Retry no mesmo modelo
      ({ response, data } = await callModel(MODEL_URLS[modelId], apiKey, contents, generationConfig));

      // Se ainda 429, tentar fallback em outros modelos
      if (response.status === 429) {
        for (const fallbackId of FALLBACK_ORDER) {
          if (fallbackId === modelId || !MODEL_URLS[fallbackId]) continue;

          console.log(`[Gemini Proxy] Fallback para ${fallbackId}...`);
          await sleep(1000);
          ({ response, data } = await callModel(MODEL_URLS[fallbackId], apiKey, contents, generationConfig));

          if (response.ok || response.status !== 429) break;
        }
      }
    }

    // Se 404, tentar v1 em vez de v1beta
    if (!response.ok && response.status === 404) {
      const message = data?.error?.message || '';
      if (typeof message === 'string' && message.includes('v1beta')) {
        const v1Url = MODEL_URLS[modelId].replace('/v1beta/', '/v1/');
        ({ response, data } = await callModel(v1Url, apiKey, contents, generationConfig));
        if (response.ok) {
          return NextResponse.json(data, { status: 200 });
        }
      }
    }

    if (!response.ok) {
      return NextResponse.json(data || { message: response.statusText }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Erro interno' }, { status: 500 });
  }
}
