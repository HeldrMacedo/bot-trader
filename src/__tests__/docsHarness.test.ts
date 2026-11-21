// @vitest-environment node
// Validação mecânica da base de conhecimento (harness engineering):
// CLAUDE.md é índice curto; docs/ é o sistema de registro; links não quebram;
// docs não citam módulos extintos nem carregam segredos.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.join(ROOT, p));

const REQUIRED_DOCS = [
  'docs/index.md',
  'docs/ARCHITECTURE.md',
  'docs/QUALITY_SCORE.md',
  'docs/RELIABILITY.md',
  'docs/SECURITY.md',
  'docs/GOLDEN_PRINCIPLES.md',
  'docs/exec-plans/tech-debt-tracker.md',
  'docs/exec-plans/active/README.md',
  'docs/exec-plans/completed/README.md',
];

/** Docs "vivos": mantidos à mão. Referência Deriv e planos concluídos ficam fora. */
function liveDocs(): string[] {
  const out = ['CLAUDE.md', 'README.md'];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        if (['documentacao_deriv', 'superpowers', 'completed', 'mockup'].includes(e.name)) continue;
        walk(rel);
      } else if (e.name.endsWith('.md')) out.push(rel);
    }
  };
  walk('docs');
  return out;
}

function relativeLinks(file: string): string[] {
  const text = read(file);
  const links: string[] = [];
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    links.push(target);
  }
  return links;
}

describe('harness de documentação', () => {
  it('CLAUDE.md é um índice curto (<= 120 linhas)', () => {
    expect(read('CLAUDE.md').split('\n').length).toBeLessThanOrEqual(120);
  });

  it.each(REQUIRED_DOCS)('existe %s', (doc) => {
    expect(exists(doc), `${doc} ausente`).toBe(true);
  });

  it('CLAUDE.md aponta para docs/index.md e ARCHITECTURE.md', () => {
    const t = read('CLAUDE.md');
    expect(t).toContain('docs/index.md');
    expect(t).toContain('docs/ARCHITECTURE.md');
  });

  it('links relativos de CLAUDE.md e docs vivos resolvem', () => {
    const broken: string[] = [];
    for (const file of liveDocs()) {
      const dir = path.dirname(file);
      for (const link of relativeLinks(file)) {
        const resolved = link.startsWith('/') ? link.slice(1) : path.join(dir, link);
        if (!exists(decodeURIComponent(resolved))) broken.push(`${file} -> ${link}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('todo doc vivo em docs/ é alcançável a partir de docs/index.md', () => {
    const index = read('docs/index.md');
    const orphans = liveDocs()
      .filter((f) => f.startsWith('docs/') && f !== 'docs/index.md')
      .filter((f) => !index.includes(f.replace(/^docs\//, '')));
    expect(orphans).toEqual([]);
  });

  it('docs vivos não descrevem módulos extintos como ativos', () => {
    const dead = /(trade-mind-pro|bot-analitico|advanced-bot|LegacyBridge|AdvancedRulesEngine)/;
    const offenders = liveDocs().filter((f) => {
      if (f === 'docs/exec-plans/tech-debt-tracker.md') return false; // registra a remoção
      if (f === 'docs/ARCHITECTURE.md' || f === 'CLAUDE.md') return false; // seção "Removido"
      return dead.test(read(f));
    });
    expect(offenders).toEqual([]);
  });

  it('docs não contêm tokens ou segredos', () => {
    const secret = /(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|oauth:ory_at_|"activeToken"\s*:\s*"[^"]{8,})/;
    const offenders = liveDocs().filter((f) => secret.test(read(f)));
    expect(offenders).toEqual([]);
    expect(exists('localstorage.md')).toBe(false);
    expect(exists('docs/localStorage.md')).toBe(false);
  });

  it('arquivos soltos obsoletos da raiz foram removidos', () => {
    for (const f of ['ZeeK_RELATORIO.md', 'ciclo_monitoramento_trader.md', 'TASKS.md']) {
      expect(exists(f), `${f} deveria ter sido removido/movido`).toBe(false);
    }
  });
});
