/**
 * Analyzer Manager
 * Manages the global instance of the Deriv Analyzer
 */

import { DerivAnalyzer } from './deriv-analyzer';

class AnalyzerManager {
  private static instance: AnalyzerManager;
  private analyzer: DerivAnalyzer | null = null;
  private defaultToken: string = process.env.DERIV_API_TOKEN || 'ehOXyajRlX3TdOu';

  private constructor() {}

  public static getInstance(): AnalyzerManager {
    if (!AnalyzerManager.instance) {
      AnalyzerManager.instance = new AnalyzerManager();
    }
    return AnalyzerManager.instance;
  }

  public getAnalyzer(): DerivAnalyzer | null {
    return this.analyzer;
  }

  public async initializeAnalyzer(apiToken: string): Promise<void> {
    if (this.analyzer) {
      await this.analyzer.stop();
    }
    
    this.analyzer = new DerivAnalyzer(apiToken);
    await this.analyzer.start();
  }

  public async stopAnalyzer(): Promise<void> {
    if (this.analyzer) {
      await this.analyzer.stop();
      this.analyzer = null;
    }
  }

  public getDefaultToken(): string {
    return this.defaultToken;
  }
}

export default AnalyzerManager.getInstance();