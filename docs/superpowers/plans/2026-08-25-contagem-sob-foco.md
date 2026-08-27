# Contagem sob Foco — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Contagem sob Foco" toggle to the Loss Virtual system that resets the VL counter whenever a market gains focus in multi-market mode, ensuring only post-focus losses count toward the gate threshold.

**Architecture:** A new boolean config field `vlFocusOnly` acts as a cross-cutting modifier on both `consec` and `accum` VL modes. The engine intercepts every `activeSym` change (auto, manual-switch, and user click) and, when the flag is active, calls `vlResetM(newSym)` to zero the counter. The UI shows the toggle only when both `vlOn` and `multiOn` are true.

**Tech Stack:** TypeScript, React, Next.js (existing stack)

## Global Constraints

- Follow existing code patterns (inline styles via Tailwind classes, engine-first logic, React state sync via `subscribe`).
- No new dependencies.
- All config fields must have defaults in `DEFAULT_CONFIG`.

---

### Task 1: Add `vlFocusOnly` to Types and Defaults

**Files:**
- Modify: `src/app/services/bearbot2.types.ts:157-185` (BotConfig interface)
- Modify: `src/app/services/bearbot2.types.ts:226-261` (DEFAULT_CONFIG)

**Interfaces:**
- Produces: `vlFocusOnly: boolean` field on `BotConfig`, default `false`

- [ ] **Step 1: Add `vlFocusOnly` to BotConfig interface**

In `src/app/services/bearbot2.types.ts`, add the new field after `vlWindow` (line 160):

```typescript
// Inside BotConfig interface, after vlWindow: number;
vlFocusOnly: boolean;
```

- [ ] **Step 2: Add default value to DEFAULT_CONFIG**

In `src/app/services/bearbot2.types.ts`, add the default after `vlWindow: 14,` (line 236):

```typescript
// Inside DEFAULT_CONFIG, after vlWindow: 14,
vlFocusOnly: false,
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors related to `vlFocusOnly` (TypeScript will flag any places that construct a full `BotConfig` without it, which we fix with the default).

- [ ] **Step 4: Commit**

```bash
git add src/app/services/bearbot2.types.ts
git commit -m "feat(types): add vlFocusOnly config field for Contagem sob Foco"
```

---

### Task 2: Implement Focus Reset Logic in Engine

**Files:**
- Modify: `src/app/services/BearBot2Engine.ts:190-229` (updateConfig method)
- Modify: `src/app/services/BearBot2Engine.ts:1007-1025` (tryFireMultiCandidate)
- Modify: `src/app/services/BearBot2Engine.ts:1027-1052` (trySwitchMultiCandidate)

**Interfaces:**
- Consumes: `vlFocusOnly: boolean` from `BotConfig`, `vlResetM(sym: string)` (existing method)
- Produces: VL counter reset on every `activeSym` change when `vlFocusOnly` is active

There are 3 places where `activeSym` changes. Each needs the focus reset interceptor:

- [ ] **Step 1: Add focus reset in `updateConfig` (user click on MarketGrid)**

In `src/app/services/BearBot2Engine.ts`, in the `updateConfig` method, add focus reset logic after line 193 (`this.config = { ...this.config, ...clampRateLimits(updates) };`). Insert the check between the existing config merge and the `oldMulti` check:

```typescript
  updateConfig(updates: Partial<BotConfig>) {
    const oldMulti = this.config.multiOn;
    const oldPaperMode = this.config.paperMode;
    const oldActiveSym = this.config.activeSym;                    // ← NEW
    this.config = { ...this.config, ...clampRateLimits(updates) };
    // Contagem sob Foco: reset VL when user manually switches activeSym
    if (this.config.vlFocusOnly && this.config.vlOn && this.config.multiOn
        && updates.activeSym !== undefined && updates.activeSym !== oldActiveSym) {
      this.vlResetM(this.config.activeSym);
      this.addLog(`🎯 Contagem sob Foco · Reset VL para ${this.config.activeSym}`, 'info');
    }
    if (oldMulti && !this.config.multiOn) this.vlReset();
    // ... rest of method unchanged
```

- [ ] **Step 2: Add focus reset in `tryFireMultiCandidate` (auto execution)**

In `src/app/services/BearBot2Engine.ts`, in `tryFireMultiCandidate` (~line 1015), add the focus reset **after** `this.config.activeSym = pick.sym;` and **before** the existing `this.vlResetM(pick.sym);`. Note: the existing `vlResetM` already resets on auto fire, so when `vlFocusOnly` is true, we just add a log for traceability. The reset is already there:

```typescript
    this.config.activeSym = pick.sym;
    if (this.config.mode === 'differ' && (this.config.patTrigger || this.config.differAutoDigit || this.config.differDynamicDigit)) {
      this.config.digit = pick.b!;
      const ps = this.patState[pick.sym];
      if (ps && this.config.patTrigger) ps.waiting = true;
    }
    this.vlResetM(pick.sym); // already resets — Contagem sob Foco benefits from this
    if (this.config.vlFocusOnly) {                                  // ← NEW
      this.addLog(`🎯 Contagem sob Foco · Reset VL para ${pick.sym}`, 'info');
    }
    this.addLog(`🌐 MULTI · ${pick.sym} escolhido`, 'info');
```

- [ ] **Step 3: Add focus reset in `trySwitchMultiCandidate` (manual execution, auto-focus switch)**

In `src/app/services/BearBot2Engine.ts`, in `trySwitchMultiCandidate` (~line 1036), add the focus reset **after** `this.config.activeSym = pick.sym;`:

```typescript
    if (pick.sym !== this.config.activeSym) {
      if (Date.now() - this.lastManualSwitch > 3000) {
        this.multiCand = {};
        this.config.activeSym = pick.sym;
        this.lastManualSwitch = Date.now();
        if (this.config.mode === 'differ' && (this.config.patTrigger || this.config.differAutoDigit || this.config.differDynamicDigit)) {
          this.config.digit = pick.b!;
        }
        // Contagem sob Foco: reset VL for newly focused market
        if (this.config.vlFocusOnly && this.config.vlOn) {          // ← NEW
          this.vlResetM(pick.sym);                                  // ← NEW
          this.addLog(`🎯 Contagem sob Foco · Reset VL para ${pick.sym}`, 'info');
        }
        this.addLog(`🌐 MULTI (Manual) · Foco em ${pick.sym}`, 'info');
        this.notify();
      }
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/BearBot2Engine.ts
git commit -m "feat(engine): reset VL on focus change when vlFocusOnly is active"
```

---

### Task 3: Add UI Toggle

**Files:**
- Modify: `src/app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2.tsx:564-586` (Loss Virtual card body)

**Interfaces:**
- Consumes: `config.vlFocusOnly`, `config.multiOn`, `config.vlOn` from BotConfig
- Produces: Toggle UI for `vlFocusOnly`, visible only when `vlOn && multiOn`

- [ ] **Step 1: Add the "Contagem sob Foco" toggle row**

In `src/app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2.tsx`, inside the `{config.vlOn && (...)}` block, add the toggle **after** the grid with "Qtd. Perdas" and "Janela" inputs (after the closing `</div>` of the `grid grid-cols-2` div, around line 584). The toggle should only render when `config.multiOn` is also true:

```tsx
                {config.multiOn && (
                  <div className="flex items-center justify-between pt-2 border-t border-[#222c3f]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">🎯 Contagem sob Foco</span>
                    </div>
                    <button
                      data-testid="toggle-vl-focus-only"
                      onClick={() => updateConfig({ vlFocusOnly: !config.vlFocusOnly })}
                      className={`w-10 h-5 rounded-full transition-all relative ${config.vlFocusOnly ? "bg-indigo-600" : "bg-[#18202f] border border-[#2e3a52]"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${config.vlFocusOnly ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>
                )}
```

This goes right before the closing `</div>` of `flex flex-col gap-3` (line 585) and the closing `</div>` of the vlOn conditional.

- [ ] **Step 2: Verify the app builds**

Run: `npx next build` or `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2.tsx"
git commit -m "feat(ui): add Contagem sob Foco toggle in Loss Virtual card"
```

---

### Task 4: Manual Verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify toggle visibility conditions**

1. Open BearBot Ultra 2 page.
2. Turn OFF multi-market → the "Contagem sob Foco" toggle should NOT be visible in the Loss Virtual card.
3. Turn ON multi-market + turn ON Loss Virtual → the "🎯 Contagem sob Foco" toggle should appear below the "Qtd. Perdas" / "Janela" inputs, separated by a border line.
4. Toggle it ON/OFF — verify the switch animates correctly (indigo when on, dark when off).

- [ ] **Step 3: Verify focus reset behavior**

1. Enable multi-market + Loss Virtual + Contagem sob Foco.
2. Let the bot run and observe the logs.
3. When the bot switches focus to a new market, verify the log shows: `🎯 Contagem sob Foco · Reset VL para {sym}`.
4. Verify the VL counter in the MarketGrid resets to `0/N` for the newly focused market.

- [ ] **Step 4: Verify both VL modes work with focus reset**

1. Set VL mode to Consecutivo → verify reset works on focus change.
2. Set VL mode to Acumulado → verify reset works on focus change (counter and seen both reset).

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: adjustments from manual verification of Contagem sob Foco"
```
