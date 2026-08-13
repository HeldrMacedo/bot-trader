import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const INTEL_PANEL_SRC = readFileSync(
  resolve(__dirname, '../app/(withSidebar)/bear-bot-ultra-2/components/IntelPanel.tsx'),
  'utf8',
);

describe('IntelPanel meter styles', () => {
  it('uses complete Tailwind class tokens so JIT can emit bar gradients', () => {
    expect(INTEL_PANEL_SRC).not.toMatch(/from-\$\{/);
    expect(INTEL_PANEL_SRC).toContain('from-cyan-500');
    expect(INTEL_PANEL_SRC).toContain('from-purple-500');
    expect(INTEL_PANEL_SRC).toContain('from-green-500');
    expect(INTEL_PANEL_SRC).toContain('from-yellow-500');
    expect(INTEL_PANEL_SRC).toContain('to-blue-400');
    expect(INTEL_PANEL_SRC).toContain('to-pink-400');
    expect(INTEL_PANEL_SRC).toContain('to-emerald-400');
    expect(INTEL_PANEL_SRC).toContain('to-amber-400');
  });
});
