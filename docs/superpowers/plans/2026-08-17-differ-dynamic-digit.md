# Differ Dynamic Digit (Score Composto) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Dígitos Dinâmicos" feature for DIFFER mode in Bear Bot Ultra 2 using a 4-dimensional Composite Score ($S(d)$) to dynamically calculate the safest barrier digit at every tick, with independent operation and full test coverage.

**Architecture:** 
- Add `differDynamicDigit` to `BotConfig` and `DEFAULT_CONFIG`.
- Implement `computeDynamicDifferDigit(sym)` in `BearBot2Engine.ts` to score all digits 0-9 using multi-window frequency, Markov inverse probability, trigram sequence continuation, and anomaly resistance.
- Update `onNewTick`, `prepareTrade`, and candidate selection in `BearBot2Engine.ts` to utilize the dynamic digit in single-market and multi-market modes.
- Add the UI toggle component and visual badge in `bearBotUltra2.tsx` when `mode === 'differ'`.
- Provide complete automated unit and integration tests with Vitest.

**Tech Stack:** TypeScript, React, Vitest, Next.js, TailwindCSS.

## Global Constraints
- Target files: `src/app/services/bearbot2.types.ts`, `src/app/services/BearBot2Engine.ts`, `src/app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2.tsx`.
- Test files: `src/__tests__/bearBot2DynamicDigit.test.ts`, `src/__tests__/bearBotUltra2AutoDigitUI.test.tsx`.
- Zero broken existing tests; maintain backward compatibility with `differAutoDigit` (VL) and `patTrigger` (Pattern A→B).

---

### Task 1: Type Definitions and Default Config

**Files:**
- Modify: `src/app/services/bearbot2.types.ts`

**Interfaces:**
- Produces: `differDynamicDigit: boolean` on `BotConfig` and `DEFAULT_CONFIG`.

- [ ] **Step 1: Write failing type test or check missing property**
- [ ] **Step 2: Add `differDynamicDigit: boolean` to `BotConfig` and `DEFAULT_CONFIG` in `src/app/services/bearbot2.types.ts`**
- [ ] **Step 3: Update `getDefaultConfig()` in `BearBot2Engine.ts` to include `differDynamicDigit: false`**
- [ ] **Step 4: Verify TypeScript compilation**

---

### Task 2: Implement Composite Score Algorithm `computeDynamicDifferDigit`

**Files:**
- Modify: `src/app/services/BearBot2Engine.ts`
- Test: `src/__tests__/bearBot2DynamicDigit.test.ts`

**Interfaces:**
- Produces: `computeDynamicDifferDigit(sym: string): { digit: number; score: number; scores: Record<number, number> }`

- [ ] **Step 1: Write unit tests for `computeDynamicDifferDigit`**
  - Test calculation when one digit is completely absent (coldest digit gets top score).
  - Test Markov inverse penalty when a digit frequently follows the current tick.
  - Test fallback and deterministic tie-breaking.
- [ ] **Step 2: Run test to verify failure**
  Run: `npx vitest run src/__tests__/bearBot2DynamicDigit.test.ts`
- [ ] **Step 3: Implement `computeDynamicDifferDigit` in `BearBot2Engine.ts`**
- [ ] **Step 4: Run test to verify pass**
  Run: `npx vitest run src/__tests__/bearBot2DynamicDigit.test.ts`

---

### Task 3: Integrate Dynamic Digit into Engine Tick and Trade Flow

**Files:**
- Modify: `src/app/services/BearBot2Engine.ts`
- Test: `src/__tests__/bearBot2DynamicDigit.test.ts`

**Interfaces:**
- Consumes: `computeDynamicDifferDigit(sym)`
- Produces: Dynamic barrier assignment in `onNewTick`, `tryFireMultiCandidate`, `trySwitchMultiCandidate`, and `prepareTrade`.

- [ ] **Step 1: Write integration tests for single-market and multi-market dynamic digit execution**
  - Single-market auto mode firing trade with dynamic digit.
  - Single-market manual mode focusing/setting dynamic digit.
  - Multi-market auto mode ranking candidates with their respective dynamic digits and executing with selected market's dynamic digit.
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement execution flow in `BearBot2Engine.ts`**
- [ ] **Step 4: Run test to verify pass**
  Run: `npx vitest run src/__tests__/bearBot2DynamicDigit.test.ts`

---

### Task 4: UI Toggle and Target Digit State in `bearBotUltra2.tsx`

**Files:**
- Modify: `src/app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2.tsx`
- Test: `src/__tests__/bearBotUltra2AutoDigitUI.test.tsx`

**Interfaces:**
- Produces: "Dígitos Dinâmicos" card/toggle above digit selector in DIFFER mode, disabling manual digit grid when active.

- [ ] **Step 1: Write UI tests for `differDynamicDigit` toggle rendering and interaction**
- [ ] **Step 2: Run UI test to verify failure**
- [ ] **Step 3: Implement UI toggle in `bearBotUltra2.tsx`**
- [ ] **Step 4: Run UI test to verify pass**
  Run: `npx vitest run src/__tests__/bearBotUltra2AutoDigitUI.test.tsx`

---

### Task 5: Run Full Test Suite & Validation

**Files:**
- Test: All test suites in `src/__tests__/`

- [ ] **Step 1: Run full test suite**
  Run: `npm test`
- [ ] **Step 2: Confirm all tests pass without regressions**
