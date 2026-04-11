# Skill: Automated Testing Expert

Você é especialista em testes automatizados para o projeto TradePlatform (Next.js 16 + React 19 + TypeScript).

## Stack de Testes

- **Framework:** Vitest 4.1.2
- **Ambiente:** jsdom (para testes de componentes React)
- **Localização dos testes:** `__tests__/` ao lado dos arquivos testados, ou `src/__tests__/`
- **Exemplo existente:** `src/app/services/__tests__/copyTradingService.test.ts`
- **Comando:** `npx vitest run` (sem watch) ou `npx vitest` (watch mode)

## Configuração do Vitest

O projeto usa Vitest com a config padrão. Crie `vitest.config.ts` se necessário:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

## Setup File

```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom';

// Mock do DerivService (WebSocket não disponível em jsdom)
vi.mock('@/app/services/DerivService', () => ({
  DerivService: {
    getInstance: vi.fn(() => ({
      connect: vi.fn(),
      authenticate: vi.fn().mockResolvedValue({ balance: 1000, loginid: 'VRTC123' }),
      subscribe: vi.fn().mockResolvedValue({ subscription: { id: 'sub-1' } }),
      send: vi.fn().mockResolvedValue({}),
      extractLastDigit: vi.fn().mockReturnValue(5),
      getHistoricalTicksSync: vi.fn().mockReturnValue({ prices: [], times: [] }),
      disconnect: vi.fn(),
    })),
  },
}));

// Mock do localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

## Padrões de Teste por Tipo

### 1. Serviços/Singletons (ex: MonitoringService)

```typescript
// src/app/(withSidebar)/trade-mind-pro/service/__tests__/Monitoring.test.ts
import { MonitoringService } from '../Monitoring';

describe('MonitoringService', () => {
  let service: MonitoringService;

  beforeEach(() => {
    // Reset singleton entre testes
    (MonitoringService as any)._instance = null;
    service = MonitoringService.getInstance();
  });

  afterEach(() => {
    service.stop();
  });

  describe('calculateProbabilities', () => {
    it('retorna probabilidade uniforme com histórico vazio', () => {
      const stats = service.calculateProbabilities();
      expect(stats.probabilities).toHaveLength(10);
      // Com histórico vazio, não deve lançar erro
    });

    it('aplica pesos corretamente para 100 ticks', () => {
      // Preenche histórico com dígito 5 repetidamente
      (service as any).tickHistory = Array(100).fill(5);
      const stats = service.calculateProbabilities();
      expect(stats.mostProbable).toBe(5);
      expect(stats.probabilities[5]).toBeGreaterThan(0.9);
    });

    it('aplica penalidade de saturação quando freq > 15%', () => {
      (service as any).tickHistory = Array(10).fill(3);
      const stats = service.calculateProbabilities();
      // Dígito 3 com freq 100% deve ter penalidade
      expect(stats.probabilities[3]).toBeLessThan(1.0);
    });
  });
});
```

### 2. Algoritmo Gale/Soros

```typescript
// src/app/(withSidebar)/bot-strategy/services/__tests__/TradeModeRiskController.test.ts
describe('calculateNextStake', () => {
  it('multiplica stake corretamente no nível 1', () => {
    const result = calculateNextStake({
      losses: 1,
      galeMultiplier: 2.0,
      baseStake: 1.0,
      galeSplit: 1,
    });
    expect(result).toBeCloseTo(2.0);
  });

  it('respeita galeSplit = 2 (avança nível a cada 2 perdas)', () => {
    const level1 = calculateNextStake({ losses: 1, galeMultiplier: 2, baseStake: 1, galeSplit: 2 });
    const level2 = calculateNextStake({ losses: 2, galeMultiplier: 2, baseStake: 1, galeSplit: 2 });
    expect(level1).toBeCloseTo(1.0); // ainda no nível 0
    expect(level2).toBeCloseTo(2.0); // nível 1
  });
});
```

### 3. Componentes React

```typescript
// src/app/(withSidebar)/trade-mind-pro/components/__tests__/TradeConfig.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TradeConfig } from '../TradeConfig';

describe('TradeConfig', () => {
  const defaultConfig = {
    contractType: 'DIGITDIFF' as const,
    duration: 1,
    durationUnit: 't' as const,
    prediction: 5,
    barrier: '',
  };

  it('renderiza tipo de contrato corretamente', () => {
    render(<TradeConfig config={defaultConfig} onChange={vi.fn()} />);
    expect(screen.getByText(/DIGITDIFF/i)).toBeInTheDocument();
  });

  it('chama onChange ao alterar prediction', () => {
    const onChange = vi.fn();
    render(<TradeConfig config={defaultConfig} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/prediction/i), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ prediction: 7 }));
  });
});
```

### 4. Integração DerivService (mock WebSocket)

```typescript
describe('DerivService.extractLastDigit', () => {
  const cases: [string, number, number][] = [
    ['R_100',  5170.16,  6],  // 2 casas → dígito 6
    ['R_25',   4321.234, 4],  // 3 casas → dígito 4
    ['RDBULL', 1234.5678, 8], // 4 casas → dígito 8
  ];

  test.each(cases)('símbolo %s, preço %f → dígito %i', (symbol, price, expected) => {
    const digit = DerivService.getInstance().extractLastDigit(price, symbol);
    expect(digit).toBe(expected);
  });
});
```

## O Que Testar (Prioridade)

1. **Alta:** `calculateProbabilities()` — algoritmo com pesos e penalidades
2. **Alta:** Algoritmo Gale/Soros — cálculo de stake
3. **Alta:** `extractLastDigit()` — precisão por símbolo
4. **Média:** `translateStrategy()` — fluxo de cache vs Gemini (mock AI)
5. **Média:** Componentes de config — renderização e onChange
6. **Baixa:** LegacyBridge — difícil de testar (DOM injection)

## Executar Testes

```bash
npx vitest run                    # todos os testes, uma vez
npx vitest run --reporter=verbose # com detalhes
npx vitest src/path/to/file.test.ts # arquivo específico
npx vitest --coverage             # com coverage (instale @vitest/coverage-v8)
```

## Tarefa

$ARGUMENTS

Crie testes focados no comportamento observável, não na implementação interna. Use mocks apenas para dependências externas (WebSocket, Gemini API, localStorage). Priorize casos de borda do domínio de trading.
