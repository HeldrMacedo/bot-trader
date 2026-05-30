'use client';

import { Engine, RuleProperties, RuleResult } from 'json-rules-engine';
import { RulesVisualData, RulesVisualRule } from './Monitoring';

export interface AdvancedEngineConfig {
  symbol: string;
  onTradeSignal: (contractType: string, prediction: number | null) => void;
  onStatusChange?: (msg: string) => void;
  onRulesVisualUpdate?: (data: RulesVisualData) => void;
}

export class AdvancedRulesEngine {
  private engine: Engine | null = null;
  private tickHistory: number[] = [];
  private isRunning = false;
  private isAwaitingTrade = false;
  private cooldownTicks = 0;
  private tickHandler: ((data: any) => void) | null = null;
  private config: AdvancedEngineConfig;
  private rulesJson: RuleProperties[] = [];

  constructor(config: AdvancedEngineConfig) {
    this.config = config;
  }

  loadRules(rulesJson: RuleProperties | RuleProperties[]): void {
    this.rulesJson = Array.isArray(rulesJson) ? rulesJson : [rulesJson];
    this.rebuildEngine();
    this.emitPreview();
  }

  start(): void {
    if (this.isRunning) return;
    if (!this.engine) {
      this.config.onStatusChange?.('Nenhuma regra carregada');
      return;
    }
    this.isRunning = true;
    this.isAwaitingTrade = false;
    this.cooldownTicks = 0;

    this.tickHandler = async (data: any) => {
      if (!this.isRunning || !this.engine) return;

      const tick = data?.tick || data;
      const price = tick?.quote ?? tick?.price;
      if (price == null) return;

      const digit = this.extractDigit(Number(price));
      this.tickHistory.push(digit);
      if (this.tickHistory.length > 200) this.tickHistory.shift();

      if (this.cooldownTicks > 0) {
        this.cooldownTicks--;
        return;
      }
      if (this.isAwaitingTrade || this.tickHistory.length < 5) return;

      try {
        const { events, results, failureResults } = await this.engine.run({});

        // Emitir dados visuais a cada tick
        this.emitVisualData(results, failureResults);

        if (events.length > 0) {
          const event = events[0];
          const params = (event as any).params || {};
          let { contractType = 'DIGITOVER', prediction = null } = params;

          if (params.predictionFact) {
            prediction = this.resolvePredictionFact(params.predictionFact, params.predictionFactParams || {});
          }

          this.isAwaitingTrade = true;
          this.cooldownTicks = 3;
          this.config.onTradeSignal(String(contractType), prediction !== null ? Number(prediction) : null);
        }
      } catch (e) {
        console.error('[AdvancedRulesEngine] Erro ao avaliar regras:', e);
      }
    };

    const observer = this.getObserver();
    observer?.on?.('deriv.tick', this.tickHandler);
    this.config.onStatusChange?.('Motor avançado iniciado');
  }

  stop(): void {
    this.isRunning = false;
    this.isAwaitingTrade = false;
    this.cooldownTicks = 0;
    const observer = this.getObserver();
    if (observer?.off && this.tickHandler) {
      observer.off('deriv.tick', this.tickHandler);
    }
    this.tickHandler = null;
    this.config.onStatusChange?.('Motor avançado parado');
  }

  notifyTradeResult(): void {
    this.isAwaitingTrade = false;
  }

  getRulesLoaded(): boolean {
    return this.rulesJson.length > 0;
  }

  private rebuildEngine(): void {
    this.engine = new Engine([], { allowUndefinedFacts: true });
    this.registerFacts(this.engine);
    for (const rule of this.rulesJson) {
      this.engine.addRule(rule);
    }
  }

  private registerFacts(engine: Engine): void {
    engine.addFact('lastDigit', () => {
      const h = this.tickHistory;
      return h.length > 0 ? h[h.length - 1] : -1;
    });

    engine.addFact('secondLastDigit', () => {
      const h = this.tickHistory;
      return h.length > 1 ? h[h.length - 2] : -1;
    });

    engine.addFact('twoLastDifferent', () => {
      const h = this.tickHistory;
      if (h.length < 2) return false;
      return h[h.length - 1] !== h[h.length - 2];
    });

    engine.addFact('consecutiveSame', () => {
      const h = this.tickHistory;
      if (h.length === 0) return 0;
      const last = h[h.length - 1];
      let count = 0;
      for (let i = h.length - 1; i >= 0; i--) {
        if (h[i] === last) count++;
        else break;
      }
      return count;
    });

    engine.addFact('tickCount', () => this.tickHistory.length);

    engine.addFact('digitCount', (params) => {
      const n = params?.n ?? 10;
      const digit = params?.digit ?? 0;
      return this.tickHistory.slice(-n).filter(d => d === digit).length;
    });

    engine.addFact('mostFrequentDigit', (params) => {
      return this.computeMostFrequent(params?.n ?? 10).digit;
    });

    engine.addFact('mostFrequentCount', (params) => {
      return this.computeMostFrequent(params?.n ?? 10).count;
    });

    engine.addFact('digitNotInLastN', (params) => {
      const n = params?.n ?? 5;
      const digit = params?.digit ?? 0;
      return !this.tickHistory.slice(-n).includes(digit);
    });
  }

  private computeMostFrequent(n: number): { digit: number; count: number } {
    const slice = this.tickHistory.slice(-n);
    if (slice.length === 0) return { digit: -1, count: 0 };
    const counts = new Array(10).fill(0);
    const lastPos = new Array(10).fill(-1);
    slice.forEach((d, i) => { counts[d]++; lastPos[d] = i; });
    let best = 0;
    for (let i = 1; i < 10; i++) {
      if (counts[i] > counts[best] || (counts[i] === counts[best] && lastPos[i] > lastPos[best])) {
        best = i;
      }
    }
    return { digit: best, count: counts[best] };
  }

  private resolvePredictionFact(factName: string, params: Record<string, any>): number | null {
    if (factName === 'mostFrequentDigit') return this.computeMostFrequent(params.n ?? 10).digit;
    if (factName === 'lastDigit') return this.tickHistory[this.tickHistory.length - 1] ?? null;
    if (factName === 'secondLastDigit') return this.tickHistory[this.tickHistory.length - 2] ?? null;
    return null;
  }

  // ── Visualização ──

  private static readonly OPERATOR_SYMBOLS: Record<string, string> = {
    equal: '=', notEqual: '≠',
    lessThan: '<', lessThanInclusive: '≤',
    greaterThan: '>', greaterThanInclusive: '≥',
    in: '∈', notIn: '∉',
  };

  private static readonly FACT_LABELS: Record<string, string> = {
    lastDigit: 'Último dígito',
    secondLastDigit: 'Penúltimo dígito',
    twoLastDifferent: '2 últimos diferentes',
    consecutiveSame: 'Consecutivos iguais',
    tickCount: 'Total de ticks',
    digitCount: 'Contagem dígito',
    mostFrequentDigit: 'Dígito mais frequente',
    mostFrequentCount: 'Freq. do mais comum',
    digitNotInLastN: 'Dígito ausente',
  };

  private formatFactLabel(fact: string, params?: Record<string, any>): string {
    const base = AdvancedRulesEngine.FACT_LABELS[fact] || fact;
    if (!params || Object.keys(params).length === 0) return base;
    const parts = Object.entries(params).map(([k, v]) => `${k}:${v}`);
    return `${base}(${parts.join(', ')})`;
  }

  private formatOperator(op: string): string {
    return AdvancedRulesEngine.OPERATOR_SYMBOLS[op] || op;
  }

  private formatValue(val: unknown): string {
    if (val === true) return 'true';
    if (val === false) return 'false';
    if (val === null || val === undefined) return '-';
    if (Array.isArray(val)) return `[${val.join(', ')}]`;
    return String(val);
  }

  /** Percorre a árvore de condições e retorna lista flat de RulesVisualRule */
  private flattenConditions(conditions: any, prefix = ''): RulesVisualRule[] {
    const rules: RulesVisualRule[] = [];

    if ('all' in conditions && Array.isArray(conditions.all)) {
      if (prefix) rules.push({ id: `label-all-${Date.now()}`, displayText: `${prefix}(TODAS):`, status: 'label' });
      for (const cond of conditions.all) {
        rules.push(...this.flattenConditions(cond, ''));
      }
    } else if ('any' in conditions && Array.isArray(conditions.any)) {
      if (prefix) rules.push({ id: `label-any-${Date.now()}`, displayText: `${prefix}(QUALQUER):`, status: 'label' });
      for (const cond of conditions.any) {
        rules.push(...this.flattenConditions(cond, ''));
      }
    } else if ('fact' in conditions) {
      // Condição folha
      const passed = conditions.result === true;
      const icon = passed ? '🟢' : '🔴';
      const factLabel = this.formatFactLabel(conditions.fact, conditions.params);
      const op = this.formatOperator(conditions.operator);
      const expected = this.formatValue(conditions.value);
      const actual = conditions.factResult !== undefined ? this.formatValue(conditions.factResult) : '?';
      rules.push({
        id: `${conditions.fact}-${conditions.operator}-${Date.now()}`,
        displayText: `${icon} ${factLabel} ${op} ${expected} (atual: ${actual})`,
        status: passed ? 'satisfied' : 'failed',
      });
    }

    return rules;
  }

  /** Percorre a árvore de condições SEM resultado (para preview) */
  private flattenConditionsPreview(conditions: any): RulesVisualRule[] {
    const rules: RulesVisualRule[] = [];

    if ('all' in conditions && Array.isArray(conditions.all)) {
      for (const cond of conditions.all) {
        rules.push(...this.flattenConditionsPreview(cond));
      }
    } else if ('any' in conditions && Array.isArray(conditions.any)) {
      for (const cond of conditions.any) {
        rules.push(...this.flattenConditionsPreview(cond));
      }
    } else if ('fact' in conditions) {
      const factLabel = this.formatFactLabel(conditions.fact, conditions.params);
      const op = this.formatOperator(conditions.operator);
      const expected = this.formatValue(conditions.value);
      rules.push({
        id: `${conditions.fact}-${conditions.operator}-preview`,
        displayText: `⚪ ${factLabel} ${op} ${expected}`,
        status: 'waiting',
      });
    }

    return rules;
  }

  private emitVisualData(results: RuleResult[], failureResults: RuleResult[]): void {
    if (!this.config.onRulesVisualUpdate) return;

    // IDs of rules that actually fired (conditions all satisfied)
    const firedIds = results.map((r, i) => (r as any).name ?? `rule-${i}`);

    // Keep groups in the same order as rulesJson to avoid flickering
    const ruleNames = this.rulesJson.map((r, i) => (r as any).name ?? `rule-${i}`);
    const allResults = [...results, ...failureResults].sort(
      (a, b) => ruleNames.indexOf((a as any).name) - ruleNames.indexOf((b as any).name),
    );

    const visualData: RulesVisualData = {
      groups: allResults.map((ruleResult, idx) => ({
        id: (ruleResult as any).name ?? `rule-${idx}`,
        rules: this.flattenConditions(ruleResult.conditions),
      })),
      isPreview: false,
      timestamp: Date.now(),
      // null = no filter (nothing fired or single rule); array = highlight which groups fired
      activeGroupIds: firedIds.length > 0 && allResults.length > 1 ? firedIds : null,
    };

    this.config.onRulesVisualUpdate(visualData);
  }

  private emitPreview(): void {
    if (!this.config.onRulesVisualUpdate) return;

    const visualData: RulesVisualData = {
      groups: this.rulesJson.map((rule, idx) => ({
        id: (rule as any).name || `rule-${idx}`,
        rules: this.flattenConditionsPreview((rule as any).conditions || {}),
      })),
      isPreview: true,
      timestamp: Date.now(),
      activeGroupIds: null,
    };

    this.config.onRulesVisualUpdate(visualData);
  }

  private extractDigit(price: number): number {
    const sym = this.config.symbol;
    let decimals = 4;
    if (sym.startsWith('R_100') || sym.startsWith('JD') || sym.startsWith('1HZ')) decimals = 2;
    else if (sym.startsWith('R_25') || sym.startsWith('R_10')) decimals = 3;
    const fixed = price.toFixed(decimals);
    return parseInt(fixed[fixed.length - 1], 10);
  }

  private getObserver(): any {
    try {
      const { DerivService } = require('@/app/services/DerivService');
      const obs = DerivService.getInstance()?.observerInstance;
      if (obs?.on) return obs;
    } catch { /* ignored */ }
    return (typeof window !== 'undefined') ? (window as any).observerInstance : null;
  }
}
