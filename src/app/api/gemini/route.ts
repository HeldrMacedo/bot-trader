import { NextResponse } from 'next/server';

// ─── Provedores Gemini (API nativa do Google) ────────────────────────────────
// Free tier (por chave, por dia):
//   gemini-2.5-flash      → 10 RPM / 250 RPD  / 250K TPM
//   gemini-2.5-flash-lite → 15 RPM / 1.000 RPD / 250K TPM  ← melhor free tier
//   gemini-2.5-pro        → 5 RPM  / 100 RPD  / 250K TPM   ← apenas last resort
// gemini-2.0-flash foi APOSENTADO em 03/2026 — removido
const GEMINI_URLS: Record<string, string> = {
  'gemini-2.5-flash':      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  'gemini-2.5-flash-lite': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
  'gemini-2.5-pro':        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
};

// MODEL_URLS exposta para compatibilidade com o corpo da requisição
const MODEL_URLS: Record<string, string> = { ...GEMINI_URLS };

// Ordem de fallback Gemini (do mais barato/abundante para o mais escasso)
const GEMINI_FALLBACK = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];

// ─── Provedores Externos (OpenAI-compatible, 100% gratuitos) ─────────────────
// Ativados automaticamente quando todos os modelos Gemini retornam 429.
// Configure as chaves no .env.local para habilitar cada provedor.
//
//   Cerebras:  CEREBRAS_API_KEY  → https://cloud.cerebras.ai (gratuito: 1M tokens/dia)
//   Groq:      GROQ_API_KEY      → https://console.groq.com  (gratuito: 1.000 req/dia)
//
interface ExternalProvider {
  name: string;
  baseUrl: string;
  model: string;
  envKey: string;
}

const EXTERNAL_PROVIDERS: ExternalProvider[] = [
  {
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama-3.3-70b',   // 14.400 RPD / 1M TPD gratuitos
    envKey: 'CEREBRAS_API_KEY',
  },
  {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile', // 1.000 RPD gratuitos, inferência rápida
    envKey: 'GROQ_API_KEY',
  },
];

// ─── Utilitários ─────────────────────────────────────────────────────────────

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

// Converte formato Gemini `contents` → mensagens OpenAI `messages`
function geminiContentsToOpenAI(contents: any[]): { role: string; content: string }[] {
  return contents.map(c => {
    const role = c.role === 'model' ? 'assistant' : (c.role || 'user');
    const text = Array.isArray(c.parts)
      ? c.parts.map((p: any) => p.text ?? '').join('')
      : String(c.parts ?? '');
    return { role, content: text };
  });
}

// ─── Chamadas aos provedores ──────────────────────────────────────────────────

async function callGemini(url: string, apiKey: string, contents: any, generationConfig: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({ contents, generationConfig }),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function callExternalProvider(
  provider: ExternalProvider,
  apiKey: string,
  contents: any[],
  generationConfig: any
): Promise<{ response: Response; data: any }> {
  const messages = geminiContentsToOpenAI(contents);

  const body: any = {
    model: provider.model,
    messages,
  };

  // Mapear generationConfig Gemini → parâmetros OpenAI
  if (generationConfig?.maxOutputTokens) body.max_tokens = generationConfig.maxOutputTokens;
  if (generationConfig?.temperature !== undefined) body.temperature = generationConfig.temperature;
  if (generationConfig?.topP !== undefined) body.top_p = generationConfig.topP;

  // Solicitar JSON quando a configuração Gemini indica isso
  if (generationConfig?.responseMimeType === 'application/json') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  let data = await response.json().catch(() => null);

  // Normalizar resposta para o formato Gemini esperado pelo cliente
  if (response.ok && data?.choices?.[0]?.message?.content) {
    const text = data.choices[0].message.content;
    data = {
      candidates: [{
        content: { parts: [{ text }], role: 'model' },
        finishReason: data.choices[0].finish_reason === 'stop' ? 'STOP' : 'OTHER',
      }],
      usageMetadata: {
        promptTokenCount: data.usage?.prompt_tokens ?? 0,
        candidatesTokenCount: data.usage?.completion_tokens ?? 0,
        totalTokenCount: data.usage?.total_tokens ?? 0,
        _provider: provider.name,
        _model: provider.model,
      },
    };
  }

  return { response, data };
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!geminiKey) {
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

    // ── Fase 1: tentar modelo Gemini solicitado ──────────────────────────────
    let { response, data } = await callGemini(MODEL_URLS[modelId], geminiKey, contents, generationConfig);

    // Retry com delay se 429
    if (response.status === 429) {
      const retryDelay = parseRetryDelay(data);
      console.log(`[Gemini Proxy] 429 em ${modelId}, aguardando ${retryDelay}ms...`);
      await sleep(retryDelay);
      ({ response, data } = await callGemini(MODEL_URLS[modelId], geminiKey, contents, generationConfig));
    }

    // ── Fase 2: fallback entre modelos Gemini ────────────────────────────────
    if (response.status === 429) {
      for (const fallbackId of GEMINI_FALLBACK) {
        if (fallbackId === modelId) continue;

        console.log(`[Gemini Proxy] Fallback Gemini → ${fallbackId}...`);
        await sleep(1000);
        ({ response, data } = await callGemini(GEMINI_URLS[fallbackId], geminiKey, contents, generationConfig));

        if (response.ok || response.status !== 429) break;
      }
    }

    // ── Fase 3: fallback para provedores externos gratuitos ──────────────────
    if (response.status === 429) {
      for (const provider of EXTERNAL_PROVIDERS) {
        const externalKey = process.env[provider.envKey];
        if (!externalKey) continue;

        console.log(`[Gemini Proxy] Fallback externo → ${provider.name} (${provider.model})...`);
        await sleep(500);
        ({ response, data } = await callExternalProvider(provider, externalKey, contents, generationConfig));

        if (response.ok) {
          console.log(`[Gemini Proxy] Sucesso via ${provider.name}`);
          return NextResponse.json(data, { status: 200 });
        }
      }
    }

    // ── Fase 4: fallback de URL v1 se 404 ────────────────────────────────────
    if (!response.ok && response.status === 404) {
      const message = data?.error?.message || '';
      if (typeof message === 'string' && message.includes('v1beta')) {
        const v1Url = MODEL_URLS[modelId].replace('/v1beta/', '/v1/');
        ({ response, data } = await callGemini(v1Url, geminiKey, contents, generationConfig));
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
