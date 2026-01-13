import { NextResponse } from 'next/server';

const MODEL_URLS: Record<string, string> = {
  'gemini-2.5-flash': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  'gemini-2.5-pro': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
  'gemini-3-pro-preview': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
  'gemini-2.0-flash-thinking-exp-01-21': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent'
};

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

    const response = await fetch(MODEL_URLS[modelId], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents,
        generationConfig
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(data || { message: response.statusText }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Erro interno' }, { status: 500 });
  }
}

