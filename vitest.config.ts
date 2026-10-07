import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// O Next aceita JSX em arquivos .js (ex.: home/components/TicksGraph.js), mas o
// oxc do Vite escolhe a linguagem pela extensão e falha no parse. Este plugin
// trata esses arquivos como JSX antes do transform padrão.
const jsxInJs = {
  name: 'jsx-in-js',
  enforce: 'pre' as const,
  async transform(code: string, id: string) {
    if (!/\/src\/app\/.*\.js$/.test(id)) return null;
    return transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } });
  },
};

export default defineConfig({
  plugins: [jsxInJs, react()],
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
        // Conexão com a corretora e tela home (compra manual): caminho de ordens.
        'src/app/services/DerivService.tsx',
        'src/app/**/home/components/*.{tsx,js}',
        // Copy trader (BotTrader): ordens na conta real.
        'src/app/services/{wsListener,tradeExecutor,copyTradingService,signalProcessor,copyTradingManager,derivConfig}.ts',
        'src/app/api/{start,stop,status}/route.ts',
        'src/app/**/bottrader/*.tsx',
        // Bear Bot Ultra v1: compra, trava de operação e liquidação na tela.
        'src/app/**/bear-bot-ultra/*.tsx',
        // Bear Bot Ultra 2: tela, painéis, hook de execução e motor.
        'src/app/**/bear-bot-ultra-2/**/*.tsx',
        'src/app/hooks/useBearBot2.ts',
        'src/app/services/{BearBot2Engine,bearbot2.types}.ts',
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
