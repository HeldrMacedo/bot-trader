/**
 * Legacy Script Loader Service
 * Handles the loading of legacy JavaScript files in the correct dependency order
 */

export interface ScriptLoadOptions {
  src: string;
  async?: boolean;
  defer?: boolean;
}

class LegacyScriptLoader {
  private loadedScripts: Set<string> = new Set();

  /**
   * Load a single script
   */
  async loadScript(src: string, async: boolean = false): Promise<void> {
    if (this.loadedScripts.has(src)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = async;
      
      script.onload = () => {
        this.loadedScripts.add(src);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load script: ${src}`));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Load multiple scripts in sequence
   */
  async loadScriptsInOrder(scripts: string[]): Promise<void> {
    for (const src of scripts) {
      await this.loadScript(src, false); // Keep scripts in order with synchronous loading
    }
  }

  /**
   * Load all legacy scripts in the correct dependency order
   */
  async loadAllLegacyScripts(): Promise<void> {
    const scriptGroups = [
      // Group 1: Configuration and utilities
      [
        '/js/config.js?v=20260108',
        '/js/directAutomacao.js?v=20260108',
      ],

      // Group 2: Core utilities
      [
        '/js/session.js',
        '/js/utils/common-helpers.js',
        '/js/utils/ui-helpers.js',
        '/js/online-users-monitor.js',
      ],

      // Group 3: Core systems
      [
        '/js/modalLogout.js',
        '/js/user-levels.js',
        '/js/account-manager.js',
        '/js/token-backend-client.js',
        '/js/deriv-api.js',
        '/js/deriv-market-data.js?v=20260108',
        '/js/utils/market-data-helpers.js',
      ],

      // Group 4: Trading systems
      [
        '/js/trade-messages.js',
        '/js/trade/TradeSessionConfig.js',
        '/js/trade/TradeContractSelector.js?v=20260108',
        '/js/trade/TradeModeRiskController.js?v=20260108',
        '/js/trade/TradeSettlementReporter.js',
        '/js/trade-manager.js?v=20260108',
      ],

      // Group 5: AI and Strategy systems
      [
        '/js/ModalSuggestoesIA.js',
        '/js/modalErros.js',
        '/js/planilhaTrade.js?v=20260108',
        '/js/strategy-preprocessor.js?v=20260108',
        '/js/gemini-strategy-validator.js?v=20260108',
        '/js/gemini-ai.js?v=20260108',
      ],

      // Group 6: Firebase and sharing
      [
        '/js/firebase-config.js',
        '/js/strategy-sharing.js',
        '/js/file-sharing.js',
      ],

      // Group 7: Views
      [
        '/js/views/configurations.js?v=20260108',
        '/js/strategy-library-modal.js',
        '/js/probability-accuracy.js',
        '/js/views/monitoring.js?v=20260108',
        '/js/views/display.js',
        '/js/views/history.js',
        '/js/block-definitions.js?v=20260108',
        '/js/javascript-generator.js?v=20260108',
        '/js/robot-strategy.js?v=20260108',
        '/js/views/robot-editor.js?v=20260108',
      ],

      // Group 8: AI Chat
      [
        '/js/ai-chat-context.js',
        '/js/ai-chat-manager.js',
      ],

      // Group 9: Additional features
      [
        '/js/components/gemini-translation-animation.js',
        '/js/views/strategy-validation-modal.js',
        '/js/generate-format.js?v=20260108',
        '/js/percentage-rules.js?v=20260108',
        '/js/price-movement-rules.js',
        '/js/digit-pattern-rules.js?v=20260108',
        '/js/rsi-indicator.js',
        '/js/sma-indicator.js',
        '/js/level-features.js',
        '/js/vip-payment-modal.js?v=20260108',
        '/js/vip-sync.js?v=20260108',
        '/js/chart-modal.js?v=20260108',
        '/js/vip-backend-sync.js',
        '/js/admin-vip-manager.js',
        '/js/admin-gemini-toggle.js',
        '/js/help-manual.js',
        '/js/Auxiliar-regras.js',
        '/js/tour-guide.js',
        '/js/IA.js',
        '/js/footer-manager.js',
      ],

      // Group 10: Terms and loading
      [
        '/js/terms-modal.js',
        '/js/loading-manager.js?v=20260108',
        '/js/ui.js?v=20260108',
        '/js/app-manager.js?v=20260108',
      ],

      // Group 11: Tracking and validation
      [
        '/js/commission-tracker.js',
        '/js/rule-compatibility-validator.js',
        '/js/rules-history-manager.js',
        '/js/credits-manager.js',
        '/js/modal-creditos.js?v=20260108',
        '/js/creditoVisor.js',
        '/js/regras-json.js',
        '/js/stop-monitor.js',
      ],

      // Group 12: Final components
      [
        '/js/cooldown-overlay.js?v=20260108',
        '/js/frontend-reconnection-manager.js',
        '/js/mobile-menu-manager.js',
      ],

      // Group 13: Internationalization
      [
        '/js/i18n/translations/pt-BR.js',
        '/js/i18n/i18n-manager.js',
      ],

      // Group 14: Main app
      [
        '/app.js?v=20260108',
      ]
    ];

    // Load each group sequentially to maintain dependencies
    for (const scriptGroup of scriptGroups) {
      await this.loadScriptsInOrder(scriptGroup);
    }
  }

  /**
   * Check if all required legacy systems are loaded
   */
  areLegacySystemsReady(): boolean {
    return !!(window.AppManager && window.LoadingManager && window.SessionManager);
  }
}

export const legacyScriptLoader = new LegacyScriptLoader();