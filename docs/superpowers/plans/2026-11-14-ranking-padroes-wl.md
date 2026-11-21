# Ranking de Padrões W/L por Volatilidade — Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: usar superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar tarefa a tarefa. Passos usam checkbox (`- [ ]`).

**Goal:** Adicionar ao Bear Bot Ultra 2 um módulo que converte os dígitos de cada volatilidade em W/L por contrato (Over/Under/Differ), mede padrões de 4–8 resultados, gera/aprova padrões sozinho, ranqueia por margem real (Wilson − ponto de empate do payout) e opera no topo do ranking (auto) ou no padrão escolhido (manual), em REAL ou PAPEL.

**Architecture:** Núcleo puro e testável em `src/app/services/patternRank/` (contratos, matemática, ranking, gerador, ledger, pausa, decisão, persistência), orquestrado por `PatternRankEngine` (sem React, sem WebSocket). O `BearBotEngine` existente ganha só pontos de integração (`prOn`, `firePatternEntry`, `onTradeFinished`, `onTick`, `resetGaleCycle`, payout no papel); a lógica clássica fica intacta quando `prOn=false`. Um hook novo `useBearPatternRank` liga Deriv (ticks_history, proposals de payout) ↔ `PatternRankEngine` ↔ `BearBotEngine`. O gerador roda em Web Worker (fallback `setTimeout`).

**Tech Stack:** Next.js 16 (webpack), React 19, TypeScript, Tailwind, vitest (env `node`; testes de UI com `// @vitest-environment jsdom`), Deriv WebSocket via `DerivService`.

**Spec:** `docs/doc_bear_bot_ultra_2/NOVA_TASK.md` (+ respostas do cliente abaixo).

## Decisões do cliente (2026-11-14)

1. **Gale:** a entrada de gale espera o padrão se formar de novo (não entra no tick seguinte ao loss).
2. **Ocorrências sobrepostas contam 1:** depois de uma ocorrência, a próxima só vale se o padrão se formar inteiro **depois** do tick de entrada.
3. **Papel exige conta conectada** (precisa do payout real da proposta).
4. **Sem saldo simulado próprio:** stop win/loss usam o PnL do engine, como hoje. O botão ZERAR PAPEL zera só o ledger/histórico de papel do módulo.
5. **Operações simultâneas ficam para a fase 2** (fora deste plano).

## Global Constraints

- Tamanho mínimo do padrão: 4 ou 5 (padrão 4). Tamanho máximo: até 8. Vale para janela, gerado, manual e importação.
- Mensagem exata do bloqueio manual: `Padrão muito curto. Mínimo de X resultados.`
- Janela: 120–500 dígitos, padrão 300. Buffer da janela por volatilidade = 508 (500 + 8).
- Histórico do gerador: até 5000 dígitos crus por volatilidade, configurável; gerar a cada 50 ticks (configurável).
- Até 6 contratos ativos. Over 9 e Under 0 são bloqueados com aviso. Combo não entra no módulo.
- Wilson com z = 1,96 (configurável). Ponto de empate = 1 ÷ (1 + payout). Margem real = Wilson − ponto de empate.
- Auto **só** entra com margem real > 0 (regra fixa, sem toggle).
- Não trocar volatilidade/contrato/padrão no meio de um gale; troca de AUTO/MANUAL e de PAPEL/REAL só vale no fim do ciclo.
- PAPEL → REAL pede confirmação: `Você vai operar com dinheiro real. Confirmar?`
- Mercados: R_100, R_75, R_50, R_25, R_10, RDBEAR, RDBULL (`MARKETS` de `bearbot2.types.ts`).
- Não reutilizar nem alterar `PatternState`/`patReps`/`updatePattern` (o "padrão A→B" existente).
- TDD em toda tarefa (memória do usuário `tdd-always`).

## Review Focus

1. **Payout ausente ou atrasado** (proposta não respondeu, conta caiu): margem = `null`; auto nunca entra; o card mostra `—` e "payout indisponível". Teste na Task 8 (`selectAutoEntry ignora margem null`) e na Task 4 (`scorePattern com payout null`).
2. **Volatilidade sem dígitos suficientes** (logo depois de ligar, ticks_history falhou): ranking vazio até `buffer ≥ windowSize + 1`; o card mostra `Coletando N/300`. Teste na Task 11.
3. **Mudança de configuração no meio do ciclo de gale** (janela, contratos, minLen, desligar o contrato do ciclo): o ciclo continua no mesmo sym+contrato+padrão até terminar, mesmo que o padrão saia do ranking. Teste na Task 8 (`ciclo ativo ignora ranking`) e na Task 11.
4. **Importação malformada** (JSON inválido, padrão curto, contrato inexistente, caracteres fora de W/L): ignora a linha, devolve `{imported, skipped}` e nunca lança erro. Teste na Task 9.
5. **localStorage corrompido ou cheio**: load cai nos defaults e save falho só loga, sem crash. Teste na Task 9.

---

## Estrutura de arquivos

**Criar (`src/app/services/patternRank/`):**
- `types.ts` — todos os tipos do módulo + `DEFAULT_PR_CONFIG`.
- `contracts.ts` — chave, validação, expansão (Differ todos), resultado W/L de um dígito.
- `patternMath.ts` — parse/format/validação de padrão, fita, varredura single-pass, Wilson, empate, score.
- `ranking.ts` — montagem do ranking por volatilidade, comparador, dedupe de origens, "padrão formando".
- `generator.ts` — aprovação de padrões e ciclo de vida (prova/ativo/queda/remoção).
- `ledger.ts` — resultado real × papel por padrão, suspensão automática, resumo diário por contrato.
- `pause.ts` — pausa por volatilidade.
- `decision.ts` — escolha da entrada (auto/manual), regras do ciclo de gale.
- `persistence.ts` — localStorage + export/import.
- `generationRunner.ts` + `generator.worker.ts` — gerador fora do loop de ticks.
- `payoutPoller.ts` — fila de proposals sem subscribe para payout de todos os sym × contratos.
- `PatternRankEngine.ts` — orquestrador.

**Criar (hook/UI):**
- `src/app/hooks/useBearPatternRank.ts`
- `src/app/(withSidebar)/bear-bot-ultra-2/components/patternRank/` → `PatternRankPanel.tsx`, `PatternRankHeader.tsx`, `ContractsPanel.tsx`, `ManualPatternsPanel.tsx`, `VolatilityRankCard.tsx`, `GeneratedPatternsTab.tsx`, `PatternResultsSummary.tsx`, `PatternRankSettings.tsx`, `prHints.ts`.

**Modificar:**
- `src/app/services/BearBot2Engine.ts` — papel no próximo tick com payout real; `prOn`; `firePatternEntry`; `onTradeFinished`; `onTick`; `resetGaleCycle`; `setPayout`; CSV.
- `src/app/services/bearbot2.types.ts` — `BotConfig.prOn`, `TradeLog.pr`, `PatternTradeMeta`.
- `src/app/hooks/useBearBot2.ts` — novo fluxo de papel, payout das proposals, expor `engine`, confirmação PAPEL→REAL.
- `src/app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2.tsx` — abas "Clássico | Ranking W/L"; toggle de papel com confirmação.
- `docs/doc_bear_bot_ultra_2/README.md` — seção do módulo.

**Testes (`src/__tests__/`):** `bearBot2PaperNextTick.test.ts`, `prContracts.test.ts`, `prPatternMath.test.ts`, `prRanking.test.ts`, `prGenerator.test.ts`, `prLedger.test.ts`, `prPause.test.ts`, `prDecision.test.ts`, `prPersistence.test.ts`, `prGenerationRunner.test.ts`, `prPayoutPoller.test.ts`, `prEngine.test.ts`, `bearBot2PatternRankIntegration.test.ts`, `bearBotUltra2PatternRankUI.test.tsx`.

---

## Fase A — Correção do papel existente (pré-requisito)

### Task 1: Papel liquida no PRÓXIMO tick com payout real

**Bug atual (corrigir direto, memória `fix-bugs-without-asking`):**
- `simulateTrade` (`BearBot2Engine.ts:1569`) avalia o **último dígito já visto**, ou seja, o próprio dígito do gatilho.
- Todo WIN paga `stake × 0.94` (linhas 1590, 1598), qualquer que seja o contrato. O real paga ~0,20 no Over 1 e ~0,09 no Differ.
- Efeito: o resultado do papel sai inflado e enviesado.

**Files:**
- Modify: `src/app/services/BearBot2Engine.ts` (`simulateTrade`, `processTick`, novo `startPaperTrade`, `setPayout`, `onTradeFinished`)
- Modify: `src/app/hooks/useBearBot2.ts:163-179` (ramo paper) e `:387-396` (handler de proposal)
- Test: `src/__tests__/bearBot2PaperNextTick.test.ts`; ajustar chamadas em `bearBot2Engine.test.ts`, `bearBot2Combo.test.ts`, `bearBot2ComboLegs.test.ts`, `bearBot2EntryScore.test.ts`, `bearBot2CoverageGaps.test.ts` só se quebrarem.

**Interfaces:**
- Produces:
  - `setPayout(sym: string, ct: string, barrier: number, ratio: number): void`
  - `getPayout(sym: string, ct: string, barrier: number): number | null`
  - `startPaperTrade(kind: string): boolean`: registra uma pendência `{sym: activeSym, kind, digit, stake}` e liquida no próximo `processTick(sym)`, antes da decisão do tick. Devolve `false` se o sym ainda não tiver dígito nenhum.
  - `simulateTrade(kind: string, exitDigit?: number)`: sem `exitDigit` mantém o comportamento antigo (compatibilidade dos testes).
  - `onTradeFinished(cb: (t: TradeLog) => void): () => void`: disparado no fim de `finishTrade`, em real e papel.
  - Payout usado no papel: `getPayout(activeSym, ct, barrier)`. Se for `null`, usa 0.94 e loga uma vez por sessão `⚠ Paper sem payout real · usando 0.94`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it('paper liquida com o dígito do tick SEGUINTE, não o do gatilho', () => {
  const e = new BearBotEngine();
  e.updateConfig({ paperMode: true, mode: 'over', digit: 1, activeSym: 'R_100' });
  e.processTick('R_100', 100.05, 5);          // gatilho: 5 seria WIN
  expect(e.prepareTrade('over')).not.toBeNull();
  expect(e.startPaperTrade('over')).toBe(true);
  e.processTick('R_100', 100.00, 0);          // próximo tick: 0 → LOSS
  expect(e.getState().trades[0].resultado).toBe('LOSS');
  expect(e.getState().tradeLock).toBe(false);
});

it('paper usa o payout real da proposta', () => {
  const e = new BearBotEngine();
  e.updateConfig({ paperMode: true, mode: 'over', digit: 1, activeSym: 'R_100', stake: 1 });
  e.setPayout('R_100', 'DIGITOVER', 1, 0.2);
  e.processTick('R_100', 100.05, 5);
  e.prepareTrade('over'); e.startPaperTrade('over');
  e.processTick('R_100', 100.07, 7);
  expect(e.getState().trades[0].lucro).toBe('0.20');
});

it('onTradeFinished dispara com o TradeLog liquidado', () => { /* cb chamado 1x com resultado WIN */ });
```

- [ ] **Step 2: Rodar e confirmar a falha.** `npx vitest run src/__tests__/bearBot2PaperNextTick.test.ts`. Esperado: FAIL (`startPaperTrade is not a function`).
- [ ] **Step 3: Implementar no engine.** Combo papel: as duas pernas liquidam no mesmo próximo tick, cada uma com `getPayout` da sua perna.
- [ ] **Step 4: Hook.**
  - No ramo paper, trocar `simulateTrade` + `setTimeout` por `engine.startPaperTrade(kind)`; se devolver `false`, chamar `abortPendingTrade('Paper: ticks insuficientes para simular')`.
  - Som e `pendingKindRef = null` passam para um listener `engine.onTradeFinished` (só quando `t.paper`). `armSafetyTimeout('paper')` continua.
  - No handler `msg_type === 'proposal'`, chamar `engine.setPayout(echo_req.underlying_symbol, echo_req.contract_type, Number(echo_req.barrier), (proposal.payout - proposal.ask_price) / proposal.ask_price)`.
- [ ] **Step 5: Rodar a suíte inteira.** `npm test`. Esperado: tudo PASS. Ajustar testes antigos que dependiam do papel síncrono, mudando só a forma de liquidar e nunca a asserção de regra.
- [ ] **Step 6: Commit.** `git commit -m "fix(bearbot2): paper liquida no próximo tick com payout real da proposta"`

---

## Fase B — Núcleo puro

### Task 2: Tipos e contratos

**Files:** Create `services/patternRank/types.ts`, `services/patternRank/contracts.ts`. Test `src/__tests__/prContracts.test.ts`.

**Interfaces (Produces), em `types.ts`:**
```ts
export type PRKind = 'over' | 'under' | 'differ';
export type PatternOrigin = 'janela' | 'gerado' | 'manual';
export type GeneratedStatus = 'trial' | 'active' | 'falling' | 'suspended';
export interface ContractSpec { id: string; kind: PRKind; digit: number; enabled: boolean }
export interface PatternStats { occurrences: number; wins: number; losses: number; rawAccuracy: number;
  maxLossStreak: number; minLossStreak: number; avgLossStreak: number; galeBusts: number }
export interface ScoredStats extends PatternStats { wilson: number; naturalRate: number;
  advantagePts: number; breakEven: number | null; margin: number | null }
export interface RankedPattern { sym: string; contractKey: string; pattern: string; size: number;
  origins: PatternOrigin[]; status?: GeneratedStatus; pinned?: boolean; suspended: boolean;
  window: ScoredStats; history?: ScoredStats; rankStats: ScoredStats; rank: number }
export interface GeneratedPattern { sym: string; contractKey: string; pattern: string; createdAt: number;
  status: GeneratedStatus; pinned: boolean; failCount: number;
  trial: { entries: number; wins: number; profit: number };
  lastHistory: ScoredStats; lastWindow: ScoredStats }
export interface ManualPattern { id: string; pattern: string; contractKey: string | 'all' }
export interface PRConfig { /* campos e defaults abaixo */ }
export const DEFAULT_PR_CONFIG: PRConfig;
```
`pattern` é sempre uma string compacta de `W`/`L` (ex.: `"LWWL"`). A UI mostra com espaços.

**`PRConfig` (nome: default, faixa):**
- **Contratos:**
  - `contracts`: `[{id:'c1',kind:'over',digit:1,enabled:true},{id:'c2',kind:'under',digit:7,enabled:true},{id:'c3',kind:'differ',digit:5,enabled:false}]`
  - `differAll`: false
- **Padrão e janela:**
  - `minLen`: 4 (4|5) · `maxLen`: 8 (minLen..8)
  - `windowSize`: 300 (120..500) · `z`: 1.96 (1..3)
  - `maxGales`: 2 (0..10). O engine atual não tem número máximo de gales; este campo passa a defini-lo para o módulo.
- **Ranking:**
  - `rankMinOccWindow`: 5 · `rankMinOccHistory`: 20 · `topN`: 5 (5|10)
- **Gerador:**
  - `generatorOn`: false · `historyMax`: 5000 (500..5000) · `generateEvery`: 50 (10..1000)
  - Filtros de aprovação: `genMinOcc`: 20 · `genMinAdvantagePts`: 5 · `genMaxLossStreak`: 4 · `genMaxBusts`: 0 · `consistencyMinOcc`: 3
  - Ciclo de vida: `trialEntries`: 10 · `removeAfterFails`: 3
- **Suspensão por resultado:**
  - `suspendMinEntries`: 10 · `suspendDropPts`: 15
- **Pausa por volatilidade:**
  - `pauseOn`: false · `pauseTrigger`: `'bust'` (`'bust'|'losses'`) · `pauseLosses`: 3 · `pauseMinutes`: 10 (1..60)
- **Operação automática:**
  - `exec`: `'manual'` (`'auto'|'manual'`)
  - `autoTop`: 1 (1|3) · `autoMinAdvantagePts`: 0 · `autoMaxBusts`: 0 · `autoMaxLossStreak`: 8
  - `autoOnlyGenerated`: false · `autoOnlyContract`: `null` (string | null)
- **Operação manual:**
  - `manualSelection`: `null` (`{contractKey, pattern} | null`)
  - `manualSym`: `'all'` · `manualSymLocked`: false
  - `manualPatterns`: `[]`

**Interfaces (Produces), em `contracts.ts`:**
- `MAX_ACTIVE_CONTRACTS = 6`
- `contractKey(c: {kind, digit}): string`: `"over:1"`.
- `contractLabel(key: string): string`: `"Over 1"`.
- `validateContract(c: {kind, digit}): string | null`: devolve a mensagem de erro, ou `null` se o contrato for válido.
- `validateContractList(list: ContractSpec[]): string | null`
- `activeContractKeys(cfg: PRConfig): string[]`: só os habilitados, mais `differ:0..9` se `differAll`, sem duplicatas.
- `outcomeOf(digit: number, key: string): boolean`: delega para `isWinCheck` de `bearbot2.types.ts`.
- `toDerivContract(key): { ct: 'DIGITOVER'|'DIGITUNDER'|'DIGITDIFF'; barrier: number; kind: PRKind }`

- [ ] **Step 1: Testes.**

```ts
expect(validateContract({ kind: 'over', digit: 9 })).toBe('Over 9 não existe na Deriv.');
expect(validateContract({ kind: 'under', digit: 0 })).toBe('Under 0 não existe na Deriv.');
expect(validateContract({ kind: 'differ', digit: 10 })).toBe('Dígito deve ser de 0 a 9.');
expect(validateContract({ kind: 'over', digit: 1 })).toBeNull();
// 7 habilitados → 'Máximo de 6 contratos ativos.'; dois "over:1" habilitados → 'Contrato duplicado: Over 1.'
expect(activeContractKeys({ ...DEFAULT_PR_CONFIG, differAll: true }))
  .toEqual(['over:1', 'under:7', 'differ:0','differ:1','differ:2','differ:3','differ:4','differ:5','differ:6','differ:7','differ:8','differ:9']);
// Differ todos NÃO conta no limite de 6
expect(outcomeOf(3, 'over:1')).toBe(true); expect(outcomeOf(3, 'under:7')).toBe(true);
expect(outcomeOf(3, 'differ:3')).toBe(false); expect(outcomeOf(3, 'differ:5')).toBe(true);
expect(toDerivContract('under:7')).toEqual({ ct: 'DIGITUNDER', barrier: 7, kind: 'under' });
```
- [ ] **Step 2:** `npx vitest run src/__tests__/prContracts.test.ts` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank): tipos e validação de contratos"`

### Task 3: Matemática dos padrões

**Files:** Create `services/patternRank/patternMath.ts`. Test `src/__tests__/prPatternMath.test.ts`.

**Interfaces (Produces):**
- `normalizePattern(text: string): string`: tira espaços e passa para maiúsculas (`"l w w l"` → `"LWWL"`).
- `validatePattern(p: string, minLen: number, maxLen: number): string | null`. Mensagens, nesta ordem:
  - `Use apenas W e L.`
  - `Padrão muito curto. Mínimo de ${minLen} resultados.`
  - `Padrão muito longo. Máximo de ${maxLen} resultados.`
- `formatPattern(p: string): string`: `"LWWL"` → `"L W W L"`.
- `allPatterns(len: number): string[]`: as 2^len combinações.
- `toTape(digits: number[], key: string): boolean[]`
- `streakStats(outcomes: boolean[], maxGales: number): { max, min, avg, busts }`. `outcomes` é a sequência de resultados das entradas de um padrão; um streak é uma corrida de `false`. Cada streak de tamanho k gera `floor(k / (maxGales + 1))` estouros. Sem losses, tudo vale 0.
- `scanPatterns(tape: boolean[], minLen: number, maxLen: number, maxGales: number): Map<string, PatternStats>`.
- `wilsonLowerBound(succ: number, total: number, z: number): number`. Mesma fórmula de `BearBot2Engine.ts:48`, com z como parâmetro e `total=0` → 0.
- `breakEven(payout: number | null): number | null`: `1 / (1 + payout)`; payout `null` ou ≤ 0 → `null`.
- `naturalRate(tape: boolean[]): number`
- `rawMaxLossRun(tape: boolean[]): number`
- `scorePattern(s: PatternStats, naturalRate: number, payout: number | null, z: number): ScoredStats`. Regras: `advantagePts = (rawAccuracy - naturalRate) × 100`; `margin = wilson - breakEven`, ou `null` se `breakEven` for `null`.

**Algoritmo de `scanPatterns`** (os testes não o determinam, então fica fixado aqui):
- Uma passada por comprimento L, mantendo um código binário rolante (W=1).
- Para cada código, guardar: `nextAllowedStart[code]`, a lista de resultados, wins e occ.
- Na posição `i` (fim da janela de L, com `i+1 < n`):
  - Se `i-L+1 ≥ nextAllowedStart[code]`, é uma ocorrência: o resultado é `tape[i+1]` e `nextAllowedStart[code] = i+2`.
  - Isso implementa as decisões 1 e 2 do cliente.
- Depois da passada, calcular `streakStats` por código. Complexidade O(n × (maxLen−minLen+1)).
- Só devolver padrões com `occurrences ≥ 1`.

- [ ] **Step 1: Testes.**

```ts
const T = (s: string) => [...s].map(c => c === 'W');
// sobreposição conta 1 (decisão 2)
expect(scanPatterns(T('WWWWWW'), 4, 4, 2).get('WWWW')).toMatchObject({ occurrences: 1, wins: 1 });
// espera o padrão formar de novo depois da entrada (decisão 1)
expect(scanPatterns(T('WWWWLWWWWW'), 4, 4, 2).get('WWWW')).toMatchObject({ occurrences: 2, wins: 1, losses: 1 });
expect(streakStats([false,false,false,true,false], 2)).toEqual({ max: 3, min: 1, avg: 2, busts: 1 });
expect(streakStats([false,false,false,false,false,false], 2).busts).toBe(2);
expect(wilsonLowerBound(5, 5, 1.96)).toBeCloseTo(0.5655, 3);   // spec: ~57%
expect(wilsonLowerBound(90, 100, 1.96)).toBeCloseTo(0.8256, 3); // spec: ~83%
expect(breakEven(0.2)).toBeCloseTo(0.8333, 4);
expect(breakEven(null)).toBeNull();
expect(naturalRate(toTape([0,1,2,3,4,5,6,7,8,9], 'over:1'))).toBeCloseTo(0.8);
expect(validatePattern('LWL', 4, 8)).toBe('Padrão muito curto. Mínimo de 4 resultados.');
expect(validatePattern('LWWL', 4, 8)).toBeNull();
expect(validatePattern('LWWLWWLWW', 4, 8)).toBe('Padrão muito longo. Máximo de 8 resultados.');
expect(validatePattern('LWXL', 4, 8)).toBe('Use apenas W e L.');
expect(allPatterns(4)).toHaveLength(16); expect(allPatterns(5)).toHaveLength(32);
expect(scorePattern({ ...stats88of100 }, 0.8, 0.2, 1.96).advantagePts).toBeCloseTo(8);
expect(scorePattern({ ...stats88of100 }, 0.8, null, 1.96).margin).toBeNull();
```
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** Implementar. **Step 4:** Rodar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank): matemática de padrões W/L (scan, Wilson, empate)"`

### Task 4: Ranking por volatilidade

**Files:** Create `services/patternRank/ranking.ts`. Test `src/__tests__/prRanking.test.ts`.

**Interfaces:**
- Consumes: `scanPatterns`, `scorePattern`, `naturalRate`, `toTape`, `activeContractKeys`.
- Produces:
  - `compareRanked(a: RankedPattern, b: RankedPattern): number`. Ordem, sempre usando `rankStats`:
    1. maior `margin` (`null` vai por último);
    2. maior `advantagePts`;
    3. menos `galeBusts`;
    4. menor `maxLossStreak`;
    5. maior `size`;
    6. mais `occurrences`.
  - `buildSymRanking(input: { sym: string; windowDigits: number[]; historyDigits: number[]; cfg: PRConfig; payouts: Record<string, number | null>; generated: GeneratedPattern[]; suspendedKeys: Set<string> }): { rows: RankedPattern[]; contractHeaders: Record<string, { naturalRate: number; payout: number | null; breakEven: number | null; rawMaxLossRun: number }> }`
  - `formingPatterns(windowTape: boolean[], rows: RankedPattern[], top: number): Array<{ contractKey: string; pattern: string; needs: 'W' | 'L' }>`: os últimos L−1 resultados batem com o prefixo do padrão.
  - `rowKey(sym, contractKey, pattern): string`: `"R_100|over:1|LWWL"`.

**Regras do `buildSymRanking`:**
- **Janela:** `windowDigits` = últimos `cfg.windowSize` dígitos. Padrões da janela = todos de tamanho `minLen..5` (4+5 = 48, ou só 32 se `minLen=5`) com `occurrences ≥ rankMinOccWindow`.
- **Gerados:** entram os de status `trial|active|falling` do sym e de contrato ativo. Para eles, `rankStats = history` (calculado em `historyDigits`) e `window` vai ao lado. Ficam fora se `history.occurrences < rankMinOccHistory`.
- **Manuais:** usam as estatísticas da janela, sem mínimo de ocorrências, e aparecem sempre. Contrato `'all'` expande para todos os contratos ativos.
- **Dedupe:** o mesmo (contrato, padrão) vira 1 linha. `origins` junta as etiquetas. A fonte de `rankStats` segue a prioridade gerado > janela/manual.
- **Suspensos:** `suspended = suspendedKeys.has(rowKey)`; a linha continua no ranking, mas marcada.
- **Saída:** `rank` = posição depois da ordenação, começando em 1. `rows` volta inteiro; o recorte do top N é feito na UI.

- [ ] **Step 1: Testes.**
  - Comparador: um teste por desempate (margens iguais → vantagem maior primeiro; ... ; tudo igual exceto tamanho → 5 antes de 4; depois ocorrências).
  - `margin null` fica abaixo de margem negativa.
  - `minLen=5` → nenhuma linha de tamanho 4 com origem janela.
  - Manual `'all'` com 2 contratos ativos → 2 linhas.
  - Gerado + janela iguais → 1 linha com `origins` `['gerado','janela']`.
  - `formingPatterns`: fita terminando em `LWW` e padrão `LWWL` no topo → `{ needs: 'L' }`.
  - `contractHeaders['over:1'].breakEven` = `0.8333` com payout `0.2`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank): ranking por volatilidade e contrato"`

### Task 5: Gerador (aprovação + ciclo de vida)

**Files:** Create `services/patternRank/generator.ts`. Test `src/__tests__/prGenerator.test.ts`.

**Interfaces (Produces):**
- `findApproved(input: { sym; contractKey; historyDigits: number[]; windowDigits: number[]; cfg: PRConfig; payout: number | null }): Array<{ pattern: string; history: ScoredStats; window: ScoredStats }>`
- `passesFilters(h: ScoredStats, w: ScoredStats, cfg: PRConfig): boolean`
- `reconcileGenerated(prev: GeneratedPattern[], approvedBySymContract: Map<string, ApprovedList>, evalBySymContract: Map<string, (pattern: string) => { history: ScoredStats; window: ScoredStats }>, cfg: PRConfig, now: number): { next: GeneratedPattern[]; removed: GeneratedPattern[]; events: string[] }`
- `recordTrialOutcome(g: GeneratedPattern, win: boolean, profit: number, cfg: PRConfig, currentHistoryMargin: number | null): GeneratedPattern | null`: devolve `null` quando o padrão é reprovado e removido.

**Filtros de aprovação** (`passesFilters`, todos obrigatórios; tamanhos de 4/minLen até `maxLen`, ou seja, até 496 padrões):
- `h.occurrences ≥ genMinOcc`
- `h.margin !== null && h.margin > 0`
- `h.advantagePts ≥ genMinAdvantagePts`
- `h.maxLossStreak ≤ genMaxLossStreak`
- `h.galeBusts ≤ genMaxBusts`
- **Consistência:** `w.occurrences ≥ consistencyMinOcc && w.breakEven !== null && w.rawAccuracy ≥ w.breakEven`. O Wilson não entra aqui porque, com n pequeno na janela, reprovaria tudo.

**Ciclo de vida** (`reconcileGenerated`):
- **Novo aprovado** (não existe em `prev`): entra como `status 'trial'`, `failCount 0`, `createdAt now`. Gera o evento `🧪 Novo padrão em prova: R_100 Over 1 L W W L`.
- **Existente, reavaliado:**
  - Falhou: vira `falling` e faz `failCount++`. Se `failCount ≥ removeAfterFails` e não estiver `pinned`, é removido.
  - Passou: `falling` volta a `active` e o `failCount` zera. `trial` continua `trial`; `suspended` não muda, porque suspensão só sai manualmente (Task 6).
- **Contrato desligado:** os padrões do contrato ficam intactos em `next`, porque não entram no mapa de avaliação.

**Prova** (`recordTrialOutcome`):
- Cada entrada da prova incrementa `trial.entries`, `trial.wins` e `trial.profit`.
- Ao chegar em `trialEntries`, o padrão passa a `active` se `currentHistoryMargin > 0` e `trial.wins / trial.entries ≥ breakEven`. Caso contrário é removido (`null`), a menos que esteja `pinned`; nesse caso volta para `falling`.

- [ ] **Step 1: Testes.**

```ts
// histórico sintético: bloco [0,0,0,0,9] × 100 → Over 1: L L L L W repetido
const hist = Array.from({ length: 100 }, () => [0,0,0,0,9]).flat();
const out = findApproved({ sym: 'R_100', contractKey: 'over:1', historyDigits: hist, windowDigits: hist.slice(-300), cfg: DEFAULT_PR_CONFIG, payout: 0.2 });
expect(out.map(o => o.pattern)).toContain('LLLL');
expect(out.map(o => o.pattern)).not.toContain('LLLW');
expect(out.every(o => o.pattern.length >= 4)).toBe(true);
expect(findApproved({ ...sameInput, payout: null })).toEqual([]);
```
  - Também testar: transições trial→active, trial→removido, active→falling→removido na 3ª falha, pinned nunca removido, contrato desligado preservado, falling→active quando volta a passar.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank): gerador com aprovação, prova e limpeza automática"`

### Task 6: Ledger real × papel, suspensão e resumo diário

**Files:** Create `services/patternRank/ledger.ts`. Test `src/__tests__/prLedger.test.ts`.

**Interfaces (Produces):**
- `interface LedgerEntry { key: string; sym: string; contractKey: string; paper: boolean; win: boolean; profit: number; ts: number }`
- `interface Ledger { entries: LedgerEntry[]; reactivatedAt: Record<string, number> }` (guarda no máximo 5000 entradas, descartando as mais antigas)
- `addEntry(l: Ledger, e: LedgerEntry): Ledger`
- `bucket(l: Ledger, key: string, paper: boolean): { entries; wins; losses; profit }`
- `shouldSuspend(l: Ledger, key: string, expectedAccuracy: number, cfg: PRConfig): { suspend: boolean; paper: boolean | null; realized: number | null }`. Avalia real e papel **separados**, cada um contando só as entradas com `ts > reactivatedAt[key]`. Suspende se algum dos dois tiver `entries ≥ suspendMinEntries` e `(expected − realized) × 100 ≥ suspendDropPts`.
- `reactivate(l: Ledger, key: string, now: number): Ledger`
- `dailySummaryByKind(l: Ledger, now: number): Record<'over'|'under'|'differ', { real: Bucket; paper: Bucket }>`: só o dia local de `now`.
- `resetPaper(l: Ledger): Ledger`: remove só as entradas com `paper=true`.

- [ ] **Step 1: Testes.**
  - Real e papel nunca se misturam em `bucket`.
  - Esperado 0.85 e 10 entradas com 6 wins (0.60, queda de 25 pts) → `suspend: true`.
  - 9 entradas → `suspend: false`.
  - `reactivate` zera a base da avaliação.
  - `resetPaper` preserva o real.
  - O resumo diário ignora as entradas de ontem.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank): ledger real/papel, suspensão e resumo diário"`

### Task 7: Pausa por volatilidade

**Files:** Create `services/patternRank/pause.ts`. Test `src/__tests__/prPause.test.ts`.

**Interfaces (Produces):**
- `interface PauseState { untilBySym: Record<string, number>; lossStreakBySym: Record<string, number> }`
- `registerResult(s: PauseState, sym: string, win: boolean, busted: boolean, cfg: PRConfig, now: number): { state: PauseState; paused: boolean }`:
  - Win zera o streak do sym.
  - Com `pauseOn`, pausa por `pauseMinutes × 60000` ms quando `(pauseTrigger==='bust' && busted)` ou `(pauseTrigger==='losses' && streak ≥ pauseLosses)`.
  - Ao pausar, o streak zera.
- `isPaused(s, sym, now): boolean`
- `remainingMs(s, sym, now): number`
- `release(s, sym): PauseState`
- `formatCountdown(ms: number): string`: `452000` → `"07:32"`.

- [ ] **Step 1: Testes.**
  - bust → pausado por 10 min.
  - Depois de 10 min → não pausado.
  - `losses` com X=3: 2 losses não pausam, o 3º pausa.
  - `pauseOn=false` nunca pausa.
  - `release` libera.
  - `formatCountdown(452000) === '07:32'`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank): pausa por volatilidade após loss"`

### Task 8: Decisão de entrada (auto/manual) e ciclo de gale

**Files:** Create `services/patternRank/decision.ts`. Test `src/__tests__/prDecision.test.ts`.

**Interfaces:**
- Consumes: `RankedPattern`, `isPaused`, `toTape`, `rowKey`.
- Produces:
  - `interface GaleCycle { sym: string; contractKey: string; pattern: string; losses: number }`
  - `interface EntryDecision { sym: string; contractKey: string; pattern: string; row: RankedPattern; shadow: boolean }` (`shadow = true` → entrada de prova, só virtual)
  - `isTriggered(windowTape: boolean[], pattern: string, tickIdx: number, lastEntryIdx: number | undefined): boolean`. Os últimos L resultados precisam ser iguais ao padrão, **e** `tickIdx − L + 1 > (lastEntryIdx ?? −1)`, ou seja, o padrão inteiro se formou depois da última entrada daquela chave (decisão 1).
  - `eligibleForAuto(row: RankedPattern, cfg: PRConfig): boolean`. Exige tudo:
    - `rankStats.margin !== null && > 0`
    - `!suspended`
    - se tiver origem `gerado` sem janela/manual, `status === 'active'`
    - `advantagePts ≥ autoMinAdvantagePts`
    - `galeBusts ≤ autoMaxBusts`
    - `maxLossStreak ≤ autoMaxLossStreak`
    - `autoOnlyGenerated` → precisa ter `origins` incluindo `gerado`
    - `autoOnlyContract` → `contractKey` igual
    - `rank ≤ autoTop` dentro do sym
  - `selectEntry(input: { tickSym: string; tickIdx: Record<string, number>; tapes: Record<string, Record<string, boolean[]>>; rankings: Record<string, RankedPattern[]>; lastEntryIdx: Record<string, number>; cfg: PRConfig; pause: PauseState; cycle: GaleCycle | null; now: number }): { real: EntryDecision | null; shadows: EntryDecision[] }`

**Regras do `selectEntry`:**
- **Ciclo ativo:** só a chave do ciclo pode disparar, ignorando ranking, filtros e pausa. Isso cobre a Review Focus #3.
- **Auto sem ciclo:**
  - Candidatos = linhas elegíveis de syms não pausados cujo `isTriggered` é verdadeiro. Só o `tickSym` pode formar padrão novo, mas a função recebe todos.
  - Escolhe a de maior `rankStats.margin`.
  - Linhas `gerado` com `status 'trial'` disparadas viram `shadows` (`shadow: true`), nunca `real`.
- **Manual:**
  - Só a `cfg.manualSelection` dispara, em `manualSym` ou em qualquer sym se for `'all'`.
  - Pausa não bloqueia; a UI só avisa.
  - Margem negativa é permitida.

- [ ] **Step 1: Testes.**
  - Auto escolhe a maior margem entre 2 disparos.
  - Margem ≤ 0 e margem `null` nunca entram (Review Focus #1).
  - Sym pausado é ignorado no auto e permitido no manual.
  - Ciclo ativo dispara só a chave do ciclo, mesmo que a linha tenha sumido do ranking.
  - Sobreposição: `isTriggered` falso quando o padrão usa o tick da última entrada.
  - Status `trial` → aparece em `shadows`, `real` fica `null`.
  - Manual `'all'` dispara em qualquer sym; `manualSym='R_50'` não dispara em R_100.
  - `autoTop=1` ignora o 2º colocado.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank): decisão de entrada auto/manual e ciclo de gale"`

### Task 9: Persistência e exportar/importar

**Files:** Create `services/patternRank/persistence.ts`. Test `src/__tests__/prPersistence.test.ts`.

**Interfaces (Produces):**
- Chaves do localStorage:
  - `bb2_pr_config`
  - `bb2_pr_history_${sym}`: dígitos como string compacta, ex. `"0193..."`
  - `bb2_pr_generated`
  - `bb2_pr_ledger`
- `createPRStore(storage: Pick<Storage,'getItem'|'setItem'|'removeItem'>)` devolve:
  - `loadConfig(): PRConfig`: merge com `DEFAULT_PR_CONFIG`; JSON inválido → defaults.
  - `saveConfig(c)`
  - `loadHistory(sym): number[]`
  - `saveHistory(sym, d: number[])`
  - `loadGenerated(): GeneratedPattern[]`
  - `saveGenerated(g)`
  - `loadLedger(): Ledger`
  - `saveLedger(l)`
  - `clearHistory(sym?: string)`
- Todo `save` faz try/catch: em erro (quota cheia), `console.warn` e segue.
- `exportGenerated(g: GeneratedPattern[]): string`: `JSON.stringify({ version: 1, exportedAt, generated })`.
- `importGenerated(json: string, cfg: PRConfig): { patterns: GeneratedPattern[]; imported: number; skipped: number }`:
  - Valida cada item: `validatePattern(pattern, cfg.minLen, cfg.maxLen) === null`, `validateContract` da chave e `sym ∈ MARKETS`.
  - Itens importados entram como `trial`, com `failCount 0`.
  - JSON inválido → `{ patterns: [], imported: 0, skipped: 0 }`, sem lançar erro.

- [ ] **Step 1: Testes.**
  - Ida e volta de config, histórico (`[0,1,9]` ↔ `"019"`), gerados e ledger.
  - `getItem` devolvendo `'{lixo'` → defaults (Review Focus #5).
  - `setItem` lançando `QuotaExceededError` → não lança.
  - Import com 1 válido, 1 de tamanho 3, 1 com `over:9` e 1 com `"LXWL"` → `{ imported: 1, skipped: 3 }` (Review Focus #4).
  - Import `'nao é json'` → `imported 0`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank): persistência local e export/import de padrões"`

### Task 10: Gerador fora do loop (Worker)

**Files:** Create `services/patternRank/generationRunner.ts`, `services/patternRank/generator.worker.ts`. Test `src/__tests__/prGenerationRunner.test.ts`.

**Interfaces (Produces):**
- `interface GenerationInput { cfg: PRConfig; payouts: Record<string, Record<string, number | null>>; history: Record<string, number[]>; window: Record<string, number[]>; contractKeys: string[] }`
- `interface GenerationOutput { approved: Record<string, Array<{ pattern; history; window }>> }`, com chave `"${sym}|${contractKey}"`.
- `computeGeneration(input: GenerationInput): GenerationOutput`: chama `findApproved` para cada sym × contrato; função pura.
- `createGenerationRunner(): { run(input: GenerationInput): Promise<GenerationOutput>; dispose(): void }`:
  - Com `typeof Worker !== 'undefined'`, usa `new Worker(new URL('./generator.worker.ts', import.meta.url))`.
  - Sem Worker, resolve via `setTimeout(() => computeGeneration(input), 0)`.
  - Uma execução por vez: se chegar um `run` enquanto outro roda, devolve a mesma promise.
- O worker só faz `onmessage = e => postMessage(computeGeneration(e.data))`.

- [ ] **Step 1: Testes** (env node, sem Worker).
  - `run` resolve com `approved['R_100|over:1']` contendo `LLLL` (histórico sintético da Task 5).
  - Dois `run` simultâneos devolvem a mesma promise.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Rodar `npm run build` para confirmar que o webpack empacota o worker. Esperado: build OK.
- [ ] **Step 6:** `git commit -m "feat(pattern-rank): gerador em Web Worker com fallback"`

### Task 11: `PatternRankEngine` (orquestrador)

**Files:** Create `services/patternRank/PatternRankEngine.ts`. Test `src/__tests__/prEngine.test.ts`.

**Interfaces:**
- Consumes: Tasks 2–10.
- Produces:
```ts
export interface PRState {
  rankings: Record<string, RankedPattern[]>;
  headers: Record<string, Record<string, { naturalRate; payout; breakEven; rawMaxLossRun }>>;
  tapes: Record<string, Record<string, string>>;      // últimos 40 resultados por sym/contrato, p/ fita
  forming: Record<string, Array<{ contractKey; pattern; needs }>>;
  collecting: Record<string, { have: number; need: number } | null>;
  historySize: Record<string, number>;
  generated: GeneratedPattern[];
  pausedUntil: Record<string, number>;
  cycle: GaleCycle | null;
  pendingExec: 'auto' | 'manual' | null;
  pendingPaperMode: boolean | null;
  ledger: Ledger;
  lastGenerationAt: number | null;
}
export function buildMeta(d: EntryDecision, cfg: PRConfig): PatternTradeMeta; // pura
export class PatternRankEngine {
  constructor(deps: { store: ReturnType<typeof createPRStore>; runner: { run(i: GenerationInput): Promise<GenerationOutput> }; now?: () => number });
  getConfig(): PRConfig; getState(): PRState;
  updateConfig(p: Partial<PRConfig>): { ok: true } | { ok: false; error: string };
  subscribe(cb: (s: PRState) => void): () => void;
  onLog(cb: (msg: string, type: string) => void): () => void;
  seedHistory(sym: string, digits: number[]): void;
  onTick(sym: string, digit: number): EntryDecision | null;   // devolve a entrada REAL a disparar
  commitEntry(d: EntryDecision): PatternTradeMeta;           // o hook chama depois de o engine aceitar
  onTradeResult(t: TradeLog): { resetGale: boolean; applyPaperMode: boolean | null };
  setPayout(sym: string, contractKey: string, ratio: number | null): void;
  generateNow(): Promise<void>;
  clearLearning(scope: { sym?: string; contractKey?: string }): void;
  exportGenerated(): string; importGenerated(json: string): { imported: number; skipped: number };
  setPinned(sym: string, contractKey: string, pattern: string, pinned: boolean): void;
  skipTrial(sym: string, contractKey: string, pattern: string): void;
  reactivate(key: string): void; releasePause(sym: string): void; resetPaper(): void;
  addManualPattern(text: string, contractKey: string | 'all'): { ok: true } | { ok: false; error: string };
  removeManualPattern(id: string): void;
  selectManual(sel: { contractKey: string; pattern: string } | null): { warning: string | null };
  requestExec(mode: 'auto' | 'manual'): void;               // adia se houver ciclo
  requestPaperMode(paper: boolean): { applyNow: boolean };  // adia se houver ciclo
}
```

**Regras:**
- **Buffers por sym:** a janela guarda até 508 dígitos; o histórico guarda até `historyMax` e só cresce com `generatorOn`. `tickIdx[sym]` é um contador monotônico.
- **`onTick`, nesta ordem:**
  1. Faz push nos buffers.
  2. Liquida as entradas virtuais de prova pendentes do sym com `outcomeOf(digit)`, chamando `recordTrialOutcome`; o profit usa `stake` 1 × payout.
  3. Recalcula `buildSymRanking` só desse sym. Se `buffer < windowSize + 1`, o ranking fica `[]` e `collecting` vira `{have, need}`.
  4. Calcula `forming`.
  5. Chama `selectEntry`. As shadows são registradas como pendentes; a entrada `real` é devolvida.
  6. Se `generatorOn` e `tickCount % generateEvery === 0`, dispara `runner.run`, sem `await` dentro do tick.
  7. Salva o histórico a cada 50 ticks.
- **Ao receber o resultado da geração:** aplica `reconcileGenerated`, salva, emite os eventos no log e recalcula os rankings.
- **`commitEntry`:** grava `lastEntryIdx[key] = tickIdx[sym] + 1`, abre ou continua o ciclo e devolve `buildMeta(d, cfg)`.
- **`buildMeta`:** contractKey, pattern, size, origin principal (`origins[0]`), status, rank, wilson, margin, payout e windowSize.
- **`onTradeResult(t)`** (ignora trades sem `t.pr`):
  1. `addEntry` no ledger.
  2. Ciclo: win encerra; loss faz `losses++`; `losses > maxGales` é estouro, encerra o ciclo e devolve `resetGale: true`.
  3. `registerResult` da pausa. Se pausou com ciclo ativo, encerra o ciclo e devolve `resetGale: true`.
  4. `shouldSuspend`. Se suspender, adiciona a chave em `suspendedKeys` e loga `⛔ Padrão suspenso: ...`.
  5. No fim do ciclo, aplica `pendingExec` e devolve `applyPaperMode = pendingPaperMode`.
- **`updateConfig`:**
  - Valida `validateContractList`, as faixas numéricas e `minLen ≤ maxLen`. Inválido → `{ok:false, error}` e nada muda.
  - Mudança de `windowSize`, `minLen`, `contracts`, `differAll` ou `z` recalcula todos os rankings na hora.
  - Nunca toca no `cycle`.
- **`selectManual` com margem ≤ 0 ou null** devolve o aviso `Margem real negativa: este padrão tende a perder no longo prazo.`

- [ ] **Step 1: Testes** (store em memória, runner fake síncrono, `now` controlado).
  - Antes de 301 dígitos, `collecting.R_100 = {have: N, need: 301}` e o ranking fica vazio (Review Focus #2).
  - Com 301+ dígitos, o ranking fica preenchido e é recalculado ao trocar `windowSize`.
  - `onTick` devolve uma decisão quando o top 1 (margem > 0, com payout setado) forma.
  - `commitEntry` + `onTradeResult` com 3 losses e `maxGales=2` → `resetGale: true`, `cycle null`, sym pausado se `pauseOn`.
  - Ciclo ativo + `updateConfig({ windowSize: 120, contracts: [...sem o contrato do ciclo] })` → o próximo disparo ainda é a chave do ciclo (Review Focus #3).
  - `requestPaperMode(false)` durante o ciclo devolve `applyNow: false`; o `onTradeResult` que fecha o ciclo devolve `applyPaperMode: false`.
  - `addManualPattern('L W', 'over:1')` → `{ ok: false, error: 'Padrão muito curto. Mínimo de 4 resultados.' }`.
  - `setPayout(null)` → nenhuma decisão auto.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank): orquestrador PatternRankEngine"`

---

## Fase C — Integração com o engine e a Deriv

### Task 12: Pontos de integração no `BearBotEngine`

**Files:** Modify `services/BearBot2Engine.ts`, `services/bearbot2.types.ts`. Test `src/__tests__/bearBot2PatternRankIntegration.test.ts`.

**Interfaces (Produces):**
- `BotConfig.prOn: boolean`, com `DEFAULT_CONFIG.prOn = false` e o mesmo default no construtor do engine (linha ~182).
- `interface PatternTradeMeta { contractKey: string; pattern: string; size: number; origin: PatternOrigin; status?: GeneratedStatus; rank: number; wilson: number; margin: number | null; payout: number | null; windowSize: number }`
- `TradeLog.pr?: PatternTradeMeta`
- `onTick(cb: (sym: string, digit: number) => void): () => void`: disparado no fim de `processTick`, **depois** da liquidação do papel e da decisão clássica.
- `firePatternEntry(e: { sym: string; kind: PRKind; digit: number; meta: PatternTradeMeta }): boolean`:
  - Devolve `false` se `!prOn || !autoOn || tradeLock || !canTradeByRate()` ou se o stop foi atingido.
  - Caso contrário, define `activeSym`, `mode` e `digit`, guarda `pendingPrMeta` e emite `autoTradeListeners(kind)`.
- `resetGaleCycle(): void`: zera `galeLevel`, `lossAcum` e `parcelsLeft`, faz `curStake = stake` e loga `🔁 Ciclo de gale estourado · stake reiniciada`.
- `finishTrade` anexa `pr: pendingPrMeta` ao `TradeLog` e depois limpa `pendingPrMeta`.
- **Com `prOn = true`:**
  - `onNewTick` retorna logo no início, sem decisão clássica nem recovery.
  - `startBot` aceita `exec !== 'auto'`.
  - `prepareTrade` ignora `differDynamicDigit` e `differAutoDigit`.
- `exportTradesCSV` ganha as colunas `pr_contrato,pr_padrao,pr_tamanho,pr_origem,pr_status,pr_rank,pr_wilson,pr_margem,pr_payout,pr_janela`, vazias quando não houver `pr`.

- [ ] **Step 1: Testes.**
  - `prOn=false`: todos os testes antigos do engine continuam passando (rodar a suíte).
  - `prOn=true`: o `onNewTick` clássico não emite `autoTrade` em cenário que antes emitia (copiar de `bearBot2Engine.test.ts:47`).
  - `firePatternEntry` com `autoOn` → `autoTrade('under')` e `config.activeSym === 'R_50'`, `digit 7`.
  - `firePatternEntry` com `tradeLock` → `false`.
  - O trade liquidado carrega `pr.pattern === 'LWWL'`.
  - `resetGaleCycle` volta `curStake` para `stake`.
  - O CSV tem as 10 colunas novas.
- [ ] **Step 2–4:** FAIL → implementar → PASS. Depois `npm test` completo → PASS.
- [ ] **Step 5:** `git commit -m "feat(bearbot2): pontos de integração do Ranking W/L (prOn, firePatternEntry, onTick)"`

### Task 13: Payout de todos os mercados + hook `useBearPatternRank`

**Files:** Create `services/patternRank/payoutPoller.ts`, `hooks/useBearPatternRank.ts`. Modify `hooks/useBearBot2.ts` (expor `engine`). Test `src/__tests__/prPayoutPoller.test.ts`.

**Interfaces:**
- Produces, `payoutPoller.ts`:
  - `createPayoutPoller(deps: { send(req: object): Promise<any>; onPayout(sym: string, contractKey: string, ratio: number | null): void; intervalMs?: number /*300*/; refreshMs?: number /*120000*/ }): { setTargets(syms: string[], contractKeys: string[]): void; start(): void; stop(): void }`
  - Fila round-robin, uma requisição a cada `intervalMs`.
  - Cada alvo é atualizado a cada `refreshMs`.
  - Requisição: `{ proposal: 1, amount: 1, basis: 'stake', contract_type, currency: 'USD', duration: 1, duration_unit: 't', underlying_symbol, barrier: String(barrier) }`, **sem** `subscribe`.
  - `ratio = (payout − ask_price) / ask_price`. Erro → `onPayout(..., null)`.
- Produces, `useBearPatternRank(bot: ReturnType<typeof useBearBot>)` → `{ prConfig, prState, actions: {...os métodos públicos do PatternRankEngine}, requestPaperModeWithConfirm(paper: boolean): void }`.
- Consumes: `bot.engine` (novo campo de `useBearBot`), `bot.isConnected`, `bot.accountInfo`, `extractLastDigit`.

**Comportamento do hook:**
1. **Instância:** cria o `PatternRankEngine` uma vez (`useRef`), com `createPRStore(window.localStorage)` e `createGenerationRunner()`.
2. **Histórico inicial:** ao conectar, para cada `MARKETS`, envia `send({ ticks_history: sym, count: generatorOn ? historyMax : windowSize + 8, end: 'latest', style: 'ticks' })`. Converte `history.prices` com `extractLastDigit` e chama `seedHistory`. Se falhar, usa `store.loadHistory(sym)` e loga um aviso.
3. **Fluxo de ticks:**
   - `bot.engine.onTick((sym, digit) => { const d = pr.onTick(sym, digit); ... })`.
   - Se houver decisão: `toDerivContract(d.contractKey)` → `bot.engine.firePatternEntry({ sym, kind, digit: barrier, meta: buildMeta(d, pr.getConfig()) })`.
   - `pr.commitEntry(d)` só é chamado depois de `firePatternEntry === true`.
4. **Resultado:** `bot.engine.onTradeFinished(t => { const r = pr.onTradeResult(t); if (r.resetGale) bot.engine.resetGaleCycle(); if (r.applyPaperMode !== null) bot.updateConfig({ paperMode: r.applyPaperMode }); })`.
5. **Payout:** o poller começa só com `accountInfo` (decisão 3). Os alvos são `MARKETS × activeContractKeys(cfg)`, atualizados quando a config muda. `onPayout` → `pr.setPayout` e `bot.engine.setPayout(sym, ct, barrier, ratio)`.
6. **`requestPaperModeWithConfirm(false)`:** se o usuário estiver saindo do papel, pede `window.confirm('Você vai operar com dinheiro real. Confirmar?')`. Se confirmar, chama `pr.requestPaperMode(false)` e aplica na hora se `applyNow`.
7. **Desmontagem:** `poller.stop()`, `runner.dispose()` e remove os listeners.

- [ ] **Step 1: Testes do poller** (fake timers + `send` mock).
  - Round-robin em 2 syms × 2 contratos = 4 requisições em `4 × intervalMs`, cada uma sem `subscribe`.
  - Resposta `{proposal:{payout:1.2, ask_price:1}}` → `onPayout(..., 0.2)`.
  - Erro → `null`.
  - `stop` interrompe.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Ligar no `useBearBot2`:
  - Expor `engine: engineRef.current`.
  - O toggle de papel existente (`bearBotUltra2.tsx:306`) passa a pedir a mesma confirmação ao sair do papel.
  - Atualizar `bearBotUltra2.test.tsx` se ele alternar o papel, mockando `window.confirm` com `true`.
- [ ] **Step 6:** `npm test` → PASS. `git commit -m "feat(pattern-rank): payout multi-mercado, ticks_history e hook de integração"`

---

## Fase D — Interface

Estilo: seguir a paleta do `bearBotUltra2.tsx`.
- Fundos `#0d0a18`, `#131925`, `#0e131d`; bordas `#222c3f`; texto `#eef2f8` e secundário `#8593aa`.
- Cores dos contratos: **Over** azul (`sky-400`), **Under** laranja (`orange-400`), **Differ** roxo (`violet-400`).
- Margem positiva `green-400`, negativa `red-400`.
- Status: `trial` azul, `active` verde, `falling` amarelo, `suspended` vermelho; `pinned` mostra o ícone `LockClosedIcon`.

Textos de ajuda ficam em `prHints.ts`, um por métrica (taxa natural, vantagem, Wilson, empate, margem real, estouros), exibidos com `HelpTip`.

### Task 14: Painel de contratos + padrões manuais

**Files:** Create `components/patternRank/ContractsPanel.tsx`, `ManualPatternsPanel.tsx`, `prHints.ts`. Test `src/__tests__/bearBotUltra2PatternRankUI.test.tsx` (`// @vitest-environment jsdom`).

**Props:**
- `ContractsPanel({ cfg: PRConfig; onChange(p: Partial<PRConfig>): { ok: boolean; error?: string } })`
- `ManualPatternsPanel({ cfg; contractKeys: string[]; onAdd(text, key): {ok; error?}; onRemove(id) })`

- [ ] **Step 1: Testes.**
  - Cada linha tem checkbox, select Over/Under/Differ e input de dígito 0–9.
  - `+ Adicionar contrato` adiciona uma linha.
  - Selecionar Over 9 mostra `Over 9 não existe na Deriv.` e não chama a mudança.
  - O 7º contrato ativo mostra `Máximo de 6 contratos ativos.`
  - Existe o toggle `Differ: testar todos os dígitos`.
  - No manual, digitar `L W` + Adicionar mostra `Padrão muito curto. Mínimo de 4 resultados.`
  - O select de contrato tem a opção `Todos`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank/ui): painel de contratos e padrões manuais"`

### Task 15: Cabeçalho do módulo + card por volatilidade

**Files:** Create `components/patternRank/PatternRankHeader.tsx`, `VolatilityRankCard.tsx`. Test: mesmo arquivo de teste de UI.

**`PatternRankHeader({ cfg, paperMode, autoOn, rankings, onExec, onPaperToggle, onWindowChange, onToggleBot })`:**
- Selo `MODO REAL` (vermelho) ou `MODO PAPEL` (cinza/azul).
- Toggle `AUTOMÁTICO | MANUAL`, toggle `REAL | PAPEL` e o botão Ligar/Desligar.
- `Janela: 300 dígitos`, com input de atalho.
- Faixa "Melhores padrões agora": o top 1 de cada sym, mostrando contrato e padrão.
- Badge "troca pendente no fim do ciclo" quando `pendingExec` ou `pendingPaperMode` estiver definido.

**`VolatilityRankCard({ sym, rows, headers, tapes, forming, collecting, pausedUntil, topN, contractFilter, onFilter, onSelect, onReleasePause, onPin, onSkipTrial, onReactivate, ledgerBucket })`:**
- **Topo:** para cada contrato ativo, `Taxa natural`, `Payout` e `Empate`; mostra `—` se o payout for null.
- **Fitas:** uma linha por contrato, com os últimos 40 resultados.
- **Tabela top N**, com as colunas: Posição | Contrato | Padrão | Tamanho | Origem | Status | Ocorr. | Assert. bruta | Assert. segura | Vantagem | Margem real | Loss máx. | Estouros de gale | Resultado.
- **Estouros:** texto `Gale 2 → estourou 1x em 300 dígitos`.
- **Resultado:** real e papel separados: `R: 3W/1L +$0.42 · P: 5W/2L +$0.31`.
- **Destaques:** o top 1 tem borda e fundo de destaque. `PADRÃO FORMANDO` aparece com o resultado que falta.
- **Pausa e coleta:** com pausa, mostra `Pausada, volta em 07:32` e o botão `Liberar`. Com `collecting`, mostra `Coletando N/301`.
- **Gerados:** mostram lado a lado `hist` e `janela` na assertividade.
- **Clique na linha:** chama `onSelect` (modo manual).

- [ ] **Step 1: Testes.**
  - O selo mostra `MODO PAPEL` com `paperMode`.
  - Card com margem `+0.02` em `text-green-400` e `−0.05` em `text-red-400`.
  - `topN=5` renderiza 5 linhas com 8 dados disponíveis.
  - Pausado renderiza `Pausada, volta em`.
  - `collecting` renderiza `Coletando 120/301`.
  - Payout null renderiza `—` na coluna Empate.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `git commit -m "feat(pattern-rank/ui): cabeçalho e cards de ranking por volatilidade"`

### Task 16: Aba Padrões Gerados, resumo, configurações e montagem

**Files:** Create `components/patternRank/GeneratedPatternsTab.tsx`, `PatternResultsSummary.tsx`, `PatternRankSettings.tsx`, `PatternRankPanel.tsx`. Modify `bear-bot-ultra-2/bearBotUltra2.tsx`. Test: mesmo arquivo de teste de UI.

**`GeneratedPatternsTab`:**
- Toggle `GERAR PADRÕES AUTOMATICAMENTE` e os botões `GERAR AGORA`, `LIMPAR HISTÓRICO` (escopo sym/contrato/tudo, com confirmação), `EXPORTAR` (download `.json`) e `IMPORTAR` (input file, toast `X importados, Y ignorados`).
- Contador de dígitos acumulados por sym.
- Filtros por volatilidade e contrato.
- Colunas: padrão, tamanho, contrato, criado em, status, ocorrências, bruta, segura, vantagem, margem, loss máx, resultado R/P, cadeado, pular prova e reativar.

**`PatternResultsSummary`:**
- Resumo do dia por Over/Under/Differ, com real e papel separados (`dailySummaryByKind`).
- Botão `ZERAR PAPEL`, que pede confirmação.

**`PatternRankSettings`:** todos os campos de `PRConfig` que não ficam nos outros painéis (gerador, aprovação, prova, suspensão, pausa, filtros do auto, z, topN, maxGales), com `HelpTip`.

**`PatternRankPanel`:** compõe tudo, consome `useBearPatternRank` e tem as sub-abas `Ranking | Padrões Gerados | Resultados | Configurações`. O painel de contratos fica sempre visível na lateral.

**`bearBotUltra2.tsx`:**
- Abas no topo: `Clássico | Ranking W/L`.
- A aba Ranking renderiza o `PatternRankPanel`.
- Dentro do painel, o switch `Usar Ranking W/L como estratégia` controla `prOn`. Ao ligar `prOn`, o robô clássico para (`stopBot`) e loga.

- [ ] **Step 1: Testes.**
  - A aba `Ranking W/L` aparece e renderiza o painel.
  - `ZERAR PAPEL` com confirm `false` não chama `resetPaper`.
  - O resumo mostra real e papel em colunas separadas.
  - O toggle do gerador chama `updateConfig({ generatorOn: true })`.
  - O import com resultado `{imported:1, skipped:3}` mostra o toast.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `npm test`, `npm run lint` e `npm run build` → todos OK.
- [ ] **Step 6:** Verificação manual: `npm run dev`, conta demo conectada, papel ligado. Conferir:
  - os 7 cards preenchidos depois do ticks_history;
  - payout e empate por contrato;
  - um disparo manual de padrão liquidando no tick seguinte;
  - o log com `[PAPEL]` e os campos pr.
- [ ] **Step 7:** `git commit -m "feat(pattern-rank/ui): padrões gerados, resultados, configurações e aba no Bear Bot 2"`

### Task 17: Documentação

**Files:** Modify `docs/doc_bear_bot_ultra_2/README.md`.

- [ ] **Step 1:** Escrever a seção "Ranking de Padrões W/L", cobrindo:
  - a arquitetura (diagrama dos arquivos);
  - a definição exata de ocorrência (decisões 1 e 2);
  - as fórmulas;
  - os filtros do gerador;
  - as chaves do localStorage;
  - a correção do papel (Task 1).
- [ ] **Step 2:** `graphify update .`
- [ ] **Step 3:** `git commit -m "docs(bearbot2): documenta o módulo Ranking de Padrões W/L"`

---

## Fora deste plano (Fase 2)

- Operações simultâneas: exige estado de trade por contrato (`tradeLock`, `galeLevel` e `curStake` por chave). Decisão 5 do cliente.

## Mapa spec → tarefas

- §1 independência por volatilidade: T4, T11 · §2 contratos: T2, T14 · §3 W/L: T2, T3 · §4 tamanho mínimo: T3, T9, T14
- §5 janela e fontes: T4, T11, T14 · §6 gerador: T5, T9, T10, T11, T16 · §7 cálculo: T3 · §8 métricas: T3, T4
- §9 gale: T3, T8, T11 · §10 resultado e suspensão: T6, T11, T16 · §11 pausa: T7, T11, T15 · §12 ordem: T4
- §13 tela: T14–T16 · §14 auto/manual: T8, T11, T12, T15 · §15 real/papel: T1, T11, T13, T15 · §16 técnicos: T1, T9, T10, T12, T13
