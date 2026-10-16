import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

// Cobertura da regra de decisão, com testes de integração do motor e da UI.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: [
      'src/__tests__/bearBot2ScoreSelection.test.ts',
      'src/__tests__/bearBot2AiMinScore.test.ts',
      'src/__tests__/bearBotUltra2AiMinScoreUI.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/app/services/bearbot2.score.ts'],
      thresholds: { perFile: true, statements: 90, lines: 90, functions: 90, branches: 90 },
    },
  },
});
