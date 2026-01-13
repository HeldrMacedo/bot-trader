# Fixes Needed: bot-ia to bot-strategy Migration

## Summary
The bot-strategy system has been partially migrated from the original bot-ia system but has critical gaps preventing the main functionality from working.

## Critical Issues Identified

### 1. AI Strategy Execution Gap
- The system generates strategies using AI but doesn't properly execute them
- In `page.tsx` line 340-349, there's a warning that says "Iniciando sem estratégia de IA definida. Apenas gestão de risco será aplicada (execução manual não implementada nesta versão)."
- The BotExecutionEngine expects a `generatedStrategy` with specific structure but doesn't have fallback for manual trading

### 2. Missing Strategy Structure Processing
- The `generatedStrategy` from AI service needs to be properly integrated with BotExecutionEngine
- The BotExecutionEngine expects conditions in a specific format but the AI might not be generating them correctly

### 3. Incomplete Rule Processing
- The original system had sophisticated rule processing that may not be fully implemented
- Complex rules with dynamic predictions might not work properly

## Specific Fixes Required

### Fix 1: Update BotExecutionEngine to handle manual trading
The BotExecutionEngine needs to support basic trading without complex AI strategies when no strategy is provided.

### Fix 2: Ensure proper strategy format compatibility
The generated strategy from GeminiAIService needs to be compatible with BotExecutionEngine format.

### Fix 3: Add fallback for manual strategy execution
When no AI strategy is provided, the system should still allow basic trading based on manual configuration.

## Implementation Plan

1. Update BotExecutionEngine to handle basic trading when no strategy conditions are present
2. Ensure the AI generates compatible strategy format
3. Add proper fallback mechanisms in the page.tsx file
4. Verify Blockly integration works properly
5. Test both AI-generated and manual strategies work correctly