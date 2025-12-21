import * as tf from '@tensorflow/tfjs';
import { MLAnalysisConfig, SymbolAnalysis, TradingSignal, MLPredictions, MLConfig } from '../types';

export class MLAnalysisEngine {
  private history: Record<string, {
    digits: number[];
    prices: number[];
    timestamps: number[];
    features: number[][];
    labels: number[];
  }> = {};

  private models: Map<string, tf.LayersModel> = new Map();
  private config: MLAnalysisConfig;
  private isInitialized = false;
  private mlStats = {
    ml_accuracy: 0,
    ml_precision: 0,
    ml_recall: 0,
    model_versions: {} as Record<string, number>,
    training_samples: 0,
    prediction_latency: 0,
    last_trained: new Date().toISOString()
  };

  constructor(config: MLAnalysisConfig) {
    this.config = config;
    this.initializeModels();
  }

  private async initializeModels() {
    try {
      const savedModels = ['probability_predictor', 'pattern_detector'];
      
      for (const modelName of savedModels) {
        try {
          const model = await tf.loadLayersModel(`indexeddb://${modelName}_model`);
          this.models.set(modelName, model);
          this.mlStats.model_versions[modelName] = 1;
        } catch (e) {
          this.models.set(modelName, this.createModel(modelName));
          this.mlStats.model_versions[modelName] = 1;
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      this.createFallbackModels();
    }
  }

  private createModel(modelName: string): tf.LayersModel {
    const model = tf.sequential();
    
    if (modelName === 'probability_predictor') {
      model.add(tf.layers.dense({
        units: 64,
        activation: 'relu',
        inputShape: [35]
      }));
      model.add(tf.layers.dropout({ rate: 0.2 }));
      model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
      
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
    } else if (modelName === 'pattern_detector') {
      model.add(tf.layers.dense({
        units: 32,
        activation: 'relu',
        inputShape: [35]
      }));
      model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 4, activation: 'sigmoid' }));
      
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
    }
    
    return model;
  }

  private createFallbackModels() {
    this.models.set('probability_predictor', this.createModel('probability_predictor'));
    this.models.set('pattern_detector', this.createModel('pattern_detector'));
    this.isInitialized = true;
  }

  public addTick(symbol: string, digit: number, price: number, time: number): SymbolAnalysis {
    if (!this.history[symbol]) {
      this.history[symbol] = {
        digits: [],
        prices: [],
        timestamps: [],
        features: [],
        labels: []
      };
    }

    const history = this.history[symbol];
    history.digits.unshift(digit);
    history.prices.unshift(price);
    history.timestamps.unshift(time);

    // Limitar histórico
    const maxHistory = 1000;
    if (history.digits.length > maxHistory) {
      history.digits = history.digits.slice(0, maxHistory);
      history.prices = history.prices.slice(0, maxHistory);
      history.timestamps = history.timestamps.slice(0, maxHistory);
    }

    // Gerar features para ML
    const features = this.extractFeatures(symbol);
    history.features.unshift(features);
    
    if (history.digits.length > 1) {
      history.labels.unshift(history.digits[1]);
    }

    // Treinamento incremental
    if (this.config.mlConfig.onlineLearning && history.digits.length > 100) {
      this.addToTrainingQueue(symbol, features, digit);
    }

    // Análise com ML
    const mlAnalysis = this.analyzeWithML(symbol, features);
    
    // Análise heurística tradicional
    const heuristicAnalysis = this.analyzeSymbol(symbol);

    // Combinar análises
    return {
      ...heuristicAnalysis,
      ml_predictions: mlAnalysis,
      features: features,
      combined_confidence: this.combineConfidences(
        heuristicAnalysis.market_quality.quality_score,
        mlAnalysis?.confidence || 0
      )
    };
  }

  private extractFeatures(symbol: string): number[] {
    const history = this.history[symbol];
    const recentDigits = history.digits.slice(0, 50);
    const recentPrices = history.prices.slice(0, 50);

    if (recentDigits.length < 10) return new Array(35).fill(0);

    return [
      // Features estatísticas básicas
      this.calculateMean(recentDigits),
      this.calculateStdDev(recentDigits),
      this.calculateEntropy(recentDigits),
      this.calculateVariance(recentDigits),
      this.calculateSkewness(recentDigits),
      
      // Features temporais
      this.calculateAutocorrelation(recentDigits, 1),
      this.calculateAutocorrelation(recentDigits, 2),
      this.calculateAutocorrelation(recentDigits, 3),
      this.calculateTrend(recentDigits),
      
      // Features de distribuição (probabilidades de cada dígito 0-9)
      ...this.calculateDigitDistribution(recentDigits),
      
      // Features de mercado
      this.calculateVolatility(recentPrices),
      this.calculateMomentum(recentPrices),
      this.calculateRSI(recentPrices, 14),
      
      // Features de padrão
      this.detectStreaks(recentDigits),
      this.detectReversals(recentDigits),
      this.calculateConsecutiveCount(recentDigits),
      
      // Features derivadas
      this.calculateAbsencePattern(recentDigits),
      this.calculateExhaustionScore(recentDigits, 5),
      this.calculateTransitionProbability(recentDigits),
      
      // Features de tempo
      Date.now() % 86400000 / 86400000,
      new Date().getDay() / 7,
    ];
  }

  private analyzeWithML(symbol: string, features: number[]): MLPredictions | undefined {
    if (!this.isInitialized || !this.config.mlConfig.useML) return undefined;

    const startTime = performance.now();
    
    try {
      const featuresTensor = tf.tensor2d([features]);
      
      // Predição de probabilidades
      const probModel = this.models.get('probability_predictor');
      let probabilities: number[] = [];
      
      if (probModel) {
        const prediction = probModel.predict(featuresTensor) as tf.Tensor;
        const probsArray = Array.from(prediction.dataSync());
        probabilities = probsArray;
        tf.dispose(prediction);
      }

      // Detecção de padrões
      const patternModel = this.models.get('pattern_detector');
      let patternScore: number[] = [];
      
      if (patternModel) {
        const patternPred = patternModel.predict(featuresTensor) as tf.Tensor;
        patternScore = Array.from(patternPred.dataSync());
        tf.dispose(patternPred);
      }

      tf.dispose(featuresTensor);

      const latency = performance.now() - startTime;
      this.mlStats.prediction_latency = latency;

      const confidence = this.calculateMLConfidence(probabilities, patternScore);
      const predictedDigit = probabilities.length > 0 ? 
        probabilities.indexOf(Math.max(...probabilities)) : undefined;

      return {
        next_digit_probabilities: probabilities,
        pattern_score: patternScore,
        volatility_prediction: this.predictVolatility(features),
        confidence: confidence,
        predicted_digit: predictedDigit
      };
    } catch (error) {
      console.error('Erro na predição ML:', error);
      return undefined;
    }
  }

  private analyzeSymbol(symbol: string): SymbolAnalysis {
    const history = this.history[symbol];
    const recentHistory = history.digits.slice(0, 20);
    const lastDigit = history.digits[0] || null;

    // Distribuição
    const distribution: Record<number, number> = {};
    const statsHistory = history.digits.slice(0, 100);
    statsHistory.forEach(d => distribution[d] = (distribution[d] || 0) + 1);

    // Exaustão - CORREÇÃO AQUI: usando this.config.exhaustionThreshold
    const exhaustion: number[] = [];
    const recentCounts: Record<number, number> = {};
    recentHistory.forEach(d => recentCounts[d] = (recentCounts[d] || 0) + 1);
    
    for (let i = 0; i <= 9; i++) {
      if ((recentCounts[i] || 0) >= this.config.exhaustionThreshold) {
        exhaustion.push(i);
      }
    }

    // Ausência - CORREÇÃO AQUI: usando this.config.absenceThreshold
    const absence: number[] = [];
    for (let i = 0; i <= 9; i++) {
      const lastIndex = history.digits.indexOf(i);
      if (lastIndex === -1 || lastIndex >= this.config.absenceThreshold) {
        absence.push(i);
      }
    }

    // Tendências
    const trends = {
      direction: history.digits.length >= 5 && history.digits[0] > history.digits[4] ? 'up' : 'down',
      strength: 50,
      ml_enhanced: false
    };

    // Probabilidades
    const probabilities: Record<number, number> = {};
    for (let i = 0; i <= 9; i++) {
      probabilities[i] = ((distribution[i] || 0) / Math.max(1, statsHistory.length)) * 100;
    }

    // Market Quality
    const marketQuality = {
      quality_score: this.calculateMarketQuality(history.digits),
      reasons: [],
      should_trade: true,
      trend_direction: trends.direction,
      volatility_symbol: symbol
    };

    return {
      timestamp: new Date().toISOString(),
      distribution,
      exhaustion,
      absence,
      trends,
      sequences: [],
      probabilities,
      market_quality: marketQuality,
      current_digit: lastDigit
    };
  }

  private addToTrainingQueue(symbol: string, features: number[], actualDigit: number) {
    this.trainingQueue.push({
      symbol,
      features,
      label: actualDigit
    });

    if (this.trainingQueue.length >= 100 && this.config.mlConfig.trainingEnabled) {
      this.trainIncremental();
      this.trainingQueue = [];
    }
  }

  private trainingQueue: Array<{symbol: string, features: number[], label: number}> = [];

  private async trainIncremental() {
    if (this.trainingQueue.length < 50) return;

    try {
      const X = this.trainingQueue.map(item => item.features);
      const y = this.trainingQueue.map(item => {
        const arr = new Array(10).fill(0);
        arr[item.label] = 1;
        return arr;
      });

      const XTensor = tf.tensor2d(X);
      const yTensor = tf.tensor2d(y);

      const model = this.models.get('probability_predictor');
      if (model) {
        const history = await model.fit(XTensor, yTensor, {
          epochs: 10,
          batchSize: 32,
          validationSplit: 0.2,
          verbose: 0
        });

        // CORREÇÃO AQUI: usando 'accuracy' (não 'acc')
        const loss = history.history.loss[0];
        const accuracy = history.history.accuracy ? history.history.accuracy[0] : 0;
        
        this.mlStats.ml_accuracy = Number(accuracy) * 100;
        this.mlStats.training_samples += this.trainingQueue.length;
        this.mlStats.last_trained = new Date().toISOString();
        this.mlStats.model_versions['probability_predictor']++;

        await model.save(`indexeddb://probability_predictor_model`);
      }

      tf.dispose([XTensor, yTensor]);
    } catch (error) {
      console.error('Erro no treinamento incremental:', error);
    }
  }

  public generateSignals(analyses: Record<string, SymbolAnalysis>): TradingSignal[] {
    const signals: TradingSignal[] = [];
    const mlConfig = this.config.mlConfig;

    // CORREÇÃO AQUI: usando this.config.specificOperations e this.config.minConfidence
    const { specificOperations, minConfidence } = this.config;

    for (const [symbol, analysis] of Object.entries(analyses)) {
      const combinedConfidence = analysis.combined_confidence || analysis.market_quality.quality_score;

      // Aplicar limite de confiança ML se disponível
      const effectiveMinConfidence = mlConfig.useML ? 
        Math.max(minConfidence, mlConfig.confidenceThreshold) : 
        minConfidence;

      if (combinedConfidence < effectiveMinConfidence) continue;

      // Adicionar ML boost às confianças existentes
      const mlBoost = analysis.ml_predictions ? 
        (analysis.ml_predictions.confidence - 50) / 50 * 20 : 0;

      // OVER Specific
      if (specificOperations.over.enabled) {
        specificOperations.over.digits.forEach(targetDigit => {
          const lowerDigits = Array.from({length: targetDigit + 1}, (_, i) => i);
          const exhaustedLowers = lowerDigits.filter(d => analysis.exhaustion.includes(d));
          
          if (exhaustedLowers.length >= 2) {
            const confidence = Math.min(95, 80 + mlBoost + (analysis.ml_predictions?.confidence || 0) / 10);
            
            if (confidence >= effectiveMinConfidence) {
              signals.push({
                strategy: mlConfig.useML ? 'ML_OVER_SPECIFIC' : 'OVER_SPECIFIC',
                type: 'DIGITOVER',
                confidence: confidence,
                ml_confidence: analysis.ml_predictions?.confidence,
                combined_confidence: combinedConfidence,
                reasons: [
                  `Dígitos ${exhaustedLowers.join(', ')} exaustos`,
                  mlConfig.useML ? `ML conf: ${analysis.ml_predictions?.confidence.toFixed(1)}%` : ''
                ].filter(r => r),
                assertiveness: confidence >= 85 ? 'HIGH' : 'MEDIUM',
                expected_profit: 0.95,
                symbol,
                timestamp: new Date().toISOString(),
                barrier: targetDigit
              });
            }
          }
        });
      }

      // UNDER Specific
      if (specificOperations.under.enabled) {
        specificOperations.under.digits.forEach(targetDigit => {
          const upperDigits = Array.from({length: 10 - targetDigit}, (_, i) => i + targetDigit);
          const exhaustedUppers = upperDigits.filter(d => analysis.exhaustion.includes(d));

          if (exhaustedUppers.length >= 2) {
            const confidence = Math.min(95, 80 + mlBoost + (analysis.ml_predictions?.confidence || 0) / 10);
            
            if (confidence >= effectiveMinConfidence) {
              signals.push({
                strategy: mlConfig.useML ? 'ML_UNDER_SPECIFIC' : 'UNDER_SPECIFIC',
                type: 'DIGITUNDER',
                confidence: confidence,
                ml_confidence: analysis.ml_predictions?.confidence,
                combined_confidence: combinedConfidence,
                reasons: [
                  `Dígitos ${exhaustedUppers.join(', ')} exaustos`,
                  mlConfig.useML ? `ML conf: ${analysis.ml_predictions?.confidence.toFixed(1)}%` : '',
                  analysis.ml_predictions?.predicted_digit !== undefined ? 
                    `Previsto: ${analysis.ml_predictions.predicted_digit}` : ''
                ].filter(r => r),
                assertiveness: confidence >= 85 ? 'HIGH' : 'MEDIUM',
                expected_profit: 0.95,
                symbol,
                timestamp: new Date().toISOString(),
                barrier: targetDigit
              });
            }
          }
        });
      }

      // MATCHES Specific
      if (specificOperations.matches.enabled) {
        const targetDigit = specificOperations.matches.digit;
        if (analysis.absence.includes(targetDigit)) {
          const mlDigitProb = analysis.ml_predictions?.next_digit_probabilities[targetDigit] || 0;
          const mlBoostMatches = mlDigitProb * 30;
          
          const confidence = Math.min(95, 75 + mlBoostMatches);
          
          if (confidence >= effectiveMinConfidence) {
            signals.push({
              strategy: mlConfig.useML ? 'ML_MATCH_SPECIFIC' : 'MATCH_SPECIFIC',
              type: 'DIGITMATCH',
              confidence: confidence,
              ml_confidence: analysis.ml_predictions?.confidence,
              combined_confidence: combinedConfidence,
              reasons: [
                `Dígito ${targetDigit} ausente há muito tempo`,
                mlConfig.useML ? `Prob ML: ${(mlDigitProb * 100).toFixed(1)}%` : ''
              ].filter(r => r),
              assertiveness: 'MEDIUM',
              expected_profit: 8.0,
              symbol,
              timestamp: new Date().toISOString(),
              barrier: targetDigit
            });
          }
        }
      }

      // DIFFERS Custom
      if (specificOperations.differs.enabled) {
        specificOperations.differs.digits.forEach(targetDigit => {
          if (analysis.exhaustion.includes(targetDigit)) {
            const mlDigitProb = analysis.ml_predictions?.next_digit_probabilities[targetDigit] || 1;
            const mlBoostDiffers = (1 - mlDigitProb) * 40;
            
            const confidence = Math.min(99, 90 + mlBoostDiffers);
            
            if (confidence >= effectiveMinConfidence) {
              signals.push({
                strategy: mlConfig.useML ? 'ML_DIFFER_SPECIFIC' : 'DIFFER_SPECIFIC',
                type: 'DIGITDIFF',
                confidence: confidence,
                ml_confidence: analysis.ml_predictions?.confidence,
                combined_confidence: combinedConfidence,
                reasons: [
                  `Dígito ${targetDigit} exausto`,
                  mlConfig.useML ? `Prob ML baixa: ${(mlDigitProb * 100).toFixed(1)}%` : ''
                ].filter(r => r),
                assertiveness: confidence >= 95 ? 'VERY HIGH' : 'HIGH',
                expected_profit: 0.09,
                symbol,
                timestamp: new Date().toISOString(),
                barrier: targetDigit
              });
            }
          }
        });
      }
    }

    // Ordenar por confiança combinada
    return signals.sort((a, b) => {
      const confA = a.combined_confidence || a.confidence;
      const confB = b.combined_confidence || b.confidence;
      return confB - confA;
    });
  }

  // Métodos auxiliares para cálculos (mantidos do código original)
  private calculateMean(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private calculateStdDev(numbers: number[]): number {
    const mean = this.calculateMean(numbers);
    const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(this.calculateMean(squareDiffs));
  }

  private calculateEntropy(numbers: number[]): number {
    const counts = new Array(10).fill(0);
    numbers.forEach(d => counts[d]++);
    const probs = counts.map(c => c / numbers.length);
    
    let entropy = 0;
    probs.forEach(p => {
      if (p > 0) entropy -= p * Math.log2(p);
    });
    
    return entropy;
  }

  private calculateVariance(numbers: number[]): number {
    const mean = this.calculateMean(numbers);
    return numbers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numbers.length;
  }

  private calculateSkewness(numbers: number[]): number {
    const mean = this.calculateMean(numbers);
    const stdDev = this.calculateStdDev(numbers);
    if (stdDev === 0) return 0;
    
    const cubedDiffs = numbers.map(x => Math.pow((x - mean) / stdDev, 3));
    return this.calculateMean(cubedDiffs);
  }

  private calculateAutocorrelation(numbers: number[], lag: number): number {
    if (numbers.length <= lag) return 0;
    
    const mean = this.calculateMean(numbers);
    let numerator = 0;
    let denominator = 0;
    
    for (let i = lag; i < numbers.length; i++) {
      numerator += (numbers[i] - mean) * (numbers[i - lag] - mean);
      denominator += Math.pow(numbers[i] - mean, 2);
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateTrend(numbers: number[]): number {
    if (numbers.length < 2) return 0;
    return numbers[0] - numbers[numbers.length - 1];
  }

  private calculateDigitDistribution(numbers: number[]): number[] {
    const distribution = new Array(10).fill(0);
    numbers.forEach(d => distribution[d]++);
    return distribution.map(d => d / numbers.length);
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    return this.calculateStdDev(returns) * Math.sqrt(252);
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 10) return 0;
    return (prices[0] - prices[9]) / prices[9];
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i-1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
  }

  private detectStreaks(numbers: number[]): number {
    if (numbers.length < 3) return 0;
    
    let streaks = 0;
    for (let i = 2; i < numbers.length; i++) {
      if (numbers[i] === numbers[i-1] && numbers[i] === numbers[i-2]) {
        streaks++;
      }
    }
    
    return streaks / numbers.length;
  }

  private detectReversals(numbers: number[]): number {
    if (numbers.length < 3) return 0;
    
    let reversals = 0;
    for (let i = 2; i < numbers.length; i++) {
      if ((numbers[i] > numbers[i-1] && numbers[i-1] < numbers[i-2]) ||
          (numbers[i] < numbers[i-1] && numbers[i-1] > numbers[i-2])) {
        reversals++;
      }
    }
    
    return reversals / numbers.length;
  }

  private calculateConsecutiveCount(numbers: number[]): number {
    if (numbers.length < 2) return 0;
    
    let consecutive = 0;
    for (let i = 1; i < numbers.length; i++) {
      if (Math.abs(numbers[i] - numbers[i-1]) === 1) {
        consecutive++;
      }
    }
    
    return consecutive / numbers.length;
  }

  private calculateAbsencePattern(numbers: number[]): number {
    const lastDigit = numbers[0];
    const lastIndex = numbers.slice(1).indexOf(lastDigit);
    return lastIndex === -1 ? numbers.length : lastIndex;
  }

  private calculateExhaustionScore(numbers: number[], threshold: number): number {
    const counts = new Array(10).fill(0);
    numbers.slice(0, 20).forEach(d => counts[d]++);
    
    const exhausted = counts.filter(c => c >= threshold).length;
    return exhausted / 10;
  }

  private calculateTransitionProbability(numbers: number[]): number {
    const transitions = new Array(100).fill(0);
    for (let i = 1; i < numbers.length; i++) {
      const from = numbers[i-1];
      const to = numbers[i];
      transitions[from * 10 + to]++;
    }
    
    const totalTransitions = numbers.length - 1;
    return totalTransitions === 0 ? 0 : 
      Math.max(...transitions) / totalTransitions;
  }

  private calculateMarketQuality(numbers: number[]): number {
    if (numbers.length < 20) return 50;
    
    const entropy = this.calculateEntropy(numbers);
    const volatility = this.calculateVolatility(numbers.map((_, i) => i));
    const streakiness = this.detectStreaks(numbers);
    
    let score = 50;
    score += (0.5 - entropy) * 20;
    score -= Math.min(volatility * 10, 20);
    score -= streakiness * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private predictVolatility(features: number[]): number[] {
    return [
      features[10] * 100,
      features[10] * 120,
      features[10] * 80
    ];
  }

  private calculateMLConfidence(probabilities: number[], patternScore: number[]): number {
    if (probabilities.length === 0) return 0;
    
    const maxProb = Math.max(...probabilities);
    const entropy = this.calculateEntropy(probabilities.map((p, i) => i));
    const patternStrength = patternScore.reduce((a, b) => a + b, 0) / patternScore.length;
    
    return Math.min(100, 
      (maxProb * 60) + 
      (patternStrength * 30) + 
      ((1 - entropy) * 10)
    );
  }

  private combineConfidences(heuristicConfidence: number, mlConfidence: number): number {
    if (!this.config.mlConfig.useML) return heuristicConfidence;
    
    return (mlConfidence * 0.6) + (heuristicConfidence * 0.4);
  }

  public getMLStats() {
    return this.mlStats;
  }

  public async saveAllModels() {
    for (const [name, model] of this.models.entries()) {
      await model.save(`indexeddb://${name}_model`);
    }
  }

  public updateConfig(config: MLAnalysisConfig) {
    this.config = config;
  }
}