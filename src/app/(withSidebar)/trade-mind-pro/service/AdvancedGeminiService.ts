'use client';

import { loadClientApiKeys } from '../components/ApiKeyModal';

export interface AdvancedGeminiResult {
  success: boolean;
  rulesJson: any | null;
  error?: string;
  fromCache?: boolean;
}

interface AdvancedCacheItem {
  normalizedText: string;
  rulesJson: any;
  timestamp: number;
}

const ADVANCED_CACHE_KEY = 'advanced_rules_cache';
const ADVANCED_CACHE_MAX = 30;

export class AdvancedGeminiService {
  async translateAdvancedStrategy(
    strategyText: string,
    onProgress: (msg: string) => void = () => {}
  ): Promise<AdvancedGeminiResult> {
    try {
      // Verificar cache antes de chamar IA
      const cached = this.findInCache(strategyText);
      if (cached) {
        onProgress('Estratégia encontrada no cache!');
        return { success: true, rulesJson: cached, fromCache: true };
      }

      onProgress('Construindo prompt avançado...');
      const prompt = this.buildPrompt(strategyText);

      onProgress('Consultando IA (modo avançado)...');
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: 'gemini-2.5-flash',
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, topK: 40, topP: 0.95, maxOutputTokens: 4096 },
          clientKeys: loadClientApiKeys(),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        return { success: false, rulesJson: null, error: err?.message || `Erro HTTP ${response.status}` };
      }

      const data = await response.json().catch(() => null);
      const rawText = this.extractText(data);
      if (!rawText) {
        return { success: false, rulesJson: null, error: 'Sem resposta da IA.' };
      }

      const parsed = this.parseJson(rawText);
      if (!parsed) {
        return { success: false, rulesJson: null, error: 'A IA não retornou JSON válido. Tente reformular a estratégia.' };
      }
      if (!parsed.conditions || !parsed.event) {
        return { success: false, rulesJson: null, error: 'JSON gerado não tem o formato json-rules-engine esperado (falta "conditions" ou "event").' };
      }

      // Salvar no cache
      this.saveToCache(strategyText, parsed);

      onProgress('Regras avançadas geradas com sucesso!');
      return { success: true, rulesJson: parsed, fromCache: false };
    } catch (e: any) {
      return { success: false, rulesJson: null, error: e.message };
    }
  }

  private extractText(data: any): string | null {
    if (!data) return null;
    if (typeof data.text === 'string') return data.text;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.response === 'string') return data.response;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text === 'string') return text;
    return null;
  }

  private parseJson(rawText: string): any | null {
    const clean = rawText.replace(/```json/gi, '```').trim();
    const fenced = clean.match(/```[\s\S]*?```/);
    const target = fenced ? fenced[0].replace(/```/g, '').trim() : clean;
    const match = target.match(/\{[\s\S]*\}/);
    const jsonStr = (match ? match[0] : target).trim();
    try { return JSON.parse(jsonStr); } catch { return null; }
  }

  private normalizeText(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findInCache(strategyText: string): any | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(ADVANCED_CACHE_KEY);
      if (!data) return null;
      const cache: AdvancedCacheItem[] = JSON.parse(data);
      if (!Array.isArray(cache)) return null;
      const normalized = this.normalizeText(strategyText);
      const found = cache.find(item => item.normalizedText === normalized);
      return found?.rulesJson ?? null;
    } catch {
      return null;
    }
  }

  private saveToCache(strategyText: string, rulesJson: any): void {
    if (typeof window === 'undefined') return;
    try {
      let cache: AdvancedCacheItem[] = [];
      try { cache = JSON.parse(localStorage.getItem(ADVANCED_CACHE_KEY) || '[]'); } catch { /* ignore */ }
      if (!Array.isArray(cache)) cache = [];

      const normalized = this.normalizeText(strategyText);
      const existingIdx = cache.findIndex(item => item.normalizedText === normalized);
      if (existingIdx !== -1) {
        cache[existingIdx].rulesJson = rulesJson;
        cache[existingIdx].timestamp = Date.now();
      } else {
        cache.unshift({ normalizedText: normalized, rulesJson, timestamp: Date.now() });
        if (cache.length > ADVANCED_CACHE_MAX) cache = cache.slice(0, ADVANCED_CACHE_MAX);
      }
      localStorage.setItem(ADVANCED_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Silenciar erros de localStorage
    }
  }

  private buildPrompt(strategyText: string): string {
    return `Você é um especialista em trading de dígitos na plataforma Deriv. Converta a estratégia abaixo para o formato JSON do json-rules-engine.

FACTS DISPONÍVEIS (dados calculados em tempo real a partir dos ticks):

Facts simples (sem parâmetros):
- "lastDigit" → number (0-9): Último dígito do tick atual
- "secondLastDigit" → number (0-9): Penúltimo dígito
- "twoLastDifferent" → boolean: true se os 2 últimos dígitos são DIFERENTES entre si
- "consecutiveSame" → number: Quantidade de dígitos iguais consecutivos no final da sequência
- "tickCount" → number: Total de ticks coletados até agora

Facts com parâmetros (use o campo "params" na condição):
- "digitCount" → number: Contagem de um dígito específico nos últimos N ticks
  Exemplo: { "fact": "digitCount", "params": { "n": 10, "digit": 3 }, "operator": "greaterThanInclusive", "value": 3 }

- "mostFrequentDigit" → number (0-9): Dígito mais frequente nos últimos N ticks (desempate: mais recente vence)
  Exemplo: { "fact": "mostFrequentDigit", "params": { "n": 10 }, "operator": "greaterThanInclusive", "value": 0 }

- "mostFrequentCount" → number: Quantidade de aparições do dígito mais frequente nos últimos N ticks
  Exemplo: { "fact": "mostFrequentCount", "params": { "n": 10 }, "operator": "greaterThanInclusive", "value": 3 }

- "digitNotInLastN" → boolean: true se o dígito NÃO apareceu nos últimos N ticks
  Exemplo: { "fact": "digitNotInLastN", "params": { "n": 5, "digit": 3 }, "operator": "equal", "value": true }

OPERADORES DISPONÍVEIS:
"equal", "notEqual", "lessThan", "lessThanInclusive", "greaterThan", "greaterThanInclusive", "in", "notIn"

LÓGICA DE CONDIÇÕES:
- "all": AND (todas as condições devem ser verdadeiras)
- "any": OR (pelo menos uma deve ser verdadeira)
- Pode aninhar "all" dentro de "any" e vice-versa

TIPOS DE CONTRATO (campo "contractType" dentro de event.params):
- "DIGITOVER" + prediction (0-9): próximo dígito MAIOR que prediction
- "DIGITUNDER" + prediction (0-9): próximo dígito MENOR que prediction
- "DIGITMATCH" + prediction (0-9): próximo dígito IGUAL a prediction
- "DIGITDIFF" + prediction (0-9): próximo dígito DIFERENTE de prediction
- "DIGITEVEN": próximo dígito PAR (prediction: null)
- "DIGITODD": próximo dígito ÍMPAR (prediction: null)
- "CALL": preço SOBE (prediction: null)
- "PUT": preço CAI (prediction: null)

PREDIÇÃO DINÂMICA:
Se a prediction deve ser calculada a partir dos ticks (ex: "o dígito mais frequente"), use:
  "predictionFact": "mostFrequentDigit",
  "predictionFactParams": { "n": 10 }
no lugar de "prediction" dentro de event.params.

FORMATO DE SAÍDA (retorne APENAS o JSON, sem markdown, sem explicações):
{
  "name": "Descrição breve da estratégia",
  "conditions": {
    "all": [
      { "fact": "twoLastDifferent", "operator": "equal", "value": true },
      { "fact": "mostFrequentCount", "params": { "n": 10 }, "operator": "greaterThanInclusive", "value": 3 }
    ]
  },
  "event": {
    "type": "trade",
    "params": {
      "contractType": "DIGITOVER",
      "predictionFact": "mostFrequentDigit",
      "predictionFactParams": { "n": 10 }
    }
  }
}

ESTRATÉGIA A CONVERTER:
${strategyText}`;
  }
}
