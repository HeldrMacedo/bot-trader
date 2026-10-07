import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // Restrito aos arquivos do Bear Bot Differ tocados pelo trabalho de
      // entrada manual. Um piso global quebraria hoje por causa de arquivos
      // legados sem teste, e sem piso nenhum a meta vira uma foto que envelhece.
      // Nota: o glob não pode conter o segmento "(withSidebar)" literal —
      // parênteses são grupo em glob, e o padrão deixa de casar em silêncio.
      include: [
        'src/app/services/BearDifferEngine.ts',
        'src/app/hooks/useBearDiffer.ts',
        'src/app/**/bear-bot-differ/components/tabs/OperationTab.tsx',
        // Copy trader (BotTrader): ordens na conta real.
        'src/app/services/{wsListener,tradeExecutor,copyTradingService,signalProcessor,copyTradingManager,derivConfig}.ts',
        'src/app/api/{start,stop,status}/route.ts',
        'src/app/**/bottrader/*.tsx',
      ],
      thresholds: {
        // Por arquivo: a média deixaria o motor, já bem coberto, carregar os
        // outros dois sem que o mais fraco melhorasse.
        perFile: true,
        statements: 90,
        lines: 90,
        functions: 90,
        // Ramos ficam medidos e visíveis, sem travar: cobrir todo ramo de
        // apresentação custa testes que não provam comportamento.
        branches: 0,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
