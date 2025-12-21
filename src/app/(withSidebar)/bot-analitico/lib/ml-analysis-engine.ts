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
  private trainingQueue: Array<{symbol: string, features: number[], label: number}> = [];

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
          // Tentar carregar modelo salvo
          const model = await tf.loadLayersModel(`indexeddb://${modelName}_model`);
          
          // 🔥 CORREÇÃO: Recompilar o modelo após carregar
          if (modelName === 'probability_predictor') {
            model.compile({
              optimizer: tf.train.adam(0.001),
              loss: 'categoricalCrossentropy',
              metrics: ['accuracy']
            });
          } else if (modelName === 'pattern_detector') {
            model.compile({
              optimizer: tf.train.adam(0.001),
              loss: 'binaryCrossentropy',
              metrics: ['accuracy']
            });
          }
          
          this.models.set(modelName, model);
          this.mlStats.model_versions[modelName] = 1;
          console.log(`✅ Modelo ${modelName} carregado e recompilado`);
        } catch (e) {
          console.log(`🆕 Criando novo modelo: ${modelName}`);
          const newModel = this.createModel(modelName);
          this.models.set(modelName, newModel);
          this.mlStats.model_versions[modelName] = 1;
        }
      }
      
      this.isInitialized = true;
      console.log('✅ Sistema ML inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar modelos ML:', error);
      this.createFallbackModels();
    }
  }

  private createModel(modelName: string): tf.LayersModel {
    const model = tf.sequential();
    
    if (modelName === 'probability_predictor') {
      // 🔥 CORREÇÃO: Alterado de 35 para 30 features
      model.add(tf.layers.dense({
        units: 32,  // Reduzido para melhor performance
        activation: 'relu',
        inputShape: [30]  // AQUI: Alterado de 35 para 30
      }));
      model.add(tf.layers.dropout({ rate: 0.2 }));
      model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
      
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
    } else if (modelName === 'pattern_detector') {
      // 🔥 CORREÇÃO: Alterado de 35 para 30 features
      model.add(tf.layers.dense({
        units: 16,
        activation: 'relu',
        inputShape: [30]  // AQUI: Alterado de 35 para 30
      }));
      model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
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
    if (!history || history.digits.length < 5) {
      return new Array(30).fill(0); // Retorna 30 zeros
    }
    
    const recentDigits = history.digits.slice(0, Math.min(50, history.digits.length));
    const recentPrices = history.prices.slice(0, Math.min(50, history.prices.length));

    // 🔥 CORREÇÃO: Garantir que sempre retorne 30 features
    const features = [
      // 1-5: Features estatísticas básicas (5)
      this.calculateMean(recentDigits),
      this.calculateStdDev(recentDigits),
      this.calculateEntropy(recentDigits),
      this.calculateVariance(recentDigits),
      this.calculateSkewness(recentDigits),
      
      // 6-8: Features temporais (3)
      this.calculateAutocorrelation(recentDigits, 1),
      this.calculateAutocorrelation(recentDigits, 2),
      this.calculateAutocorrelation(recentDigits, 3),
      
      // 9: Tendência (1)
      this.calculateTrend(recentDigits),
      
      // 10-19: Distribuição de dígitos (10) - TOTAL: 19
      ...this.calculateDigitDistribution(recentDigits),
      
      // 20-22: Features de mercado (3) - TOTAL: 22
      this.calculateVolatility(recentPrices),
      this.calculateMomentum(recentPrices),
      this.calculateRSI(recentPrices, 14),
      
      // 23-25: Features de padrão (3) - TOTAL: 25
      this.detectStreaks(recentDigits),
      this.detectReversals(recentDigits),
      this.calculateConsecutiveCount(recentDigits),
      
      // 26-28: Features derivadas (3) - TOTAL: 28
      this.calculateAbsencePattern(recentDigits),
      this.calculateExhaustionScore(recentDigits, 5),
      this.calculateTransitionProbability(recentDigits),
      
      // 29-30: Features de tempo (2) - TOTAL: 30
      Date.now() % 86400000 / 86400000, // Hora normalizada
      new Date().getDay() / 7, // Dia da semana normalizado
    ];

    // 🔥 GARANTIR que temos exatamente 30 features
    if (features.length !== 30) {
      console.warn(`⚠️ Features count mismatch: ${features.length}. Padding to 30.`);
      while (features.length < 30) features.push(0);
      features.splice(30); // Corta se tiver mais de 30
    }

    return features;
  }

  private analyzeWithML(symbol: string, features: number[]): MLPredictions | undefined {
    if (!this.isInitialized || !this.config.mlConfig.useML) return undefined;

    // 🔥 VERIFICAÇÃO: Garantir que temos 30 features
    if (features.length !== 30) {
      console.warn(`❌ Features length mismatch: ${features.length}. Expected 30. Skipping ML prediction.`);
      return undefined;
    }

    const startTime = performance.now();
    
    try {
      const featuresTensor = tf.tensor2d([features]);
      
      // 🔥 VERIFICAÇÃO: Checar compatibilidade do modelo antes de usar
      const probModel = this.models.get('probability_predictor');
      if (!probModel || !probModel.optimizer) {
        console.warn('❌ Modelo não está compilado. Recriando...');
        this.models.set('probability_predictor', this.createModel('probability_predictor'));
        return undefined;
      }
      
      let probabilities: number[] = [];
      
      if (probModel) {
        try {
          const prediction = probModel.predict(featuresTensor) as tf.Tensor;
          const probsArray = Array.from(prediction.dataSync());
          probabilities = probsArray;
          tf.dispose(prediction);
        } catch (predictError) {
          console.error('❌ Erro na predição:', predictError);
          // Recriar modelo se falhar
          this.models.set('probability_predictor', this.createModel('probability_predictor'));
        }
      }

      // Similar para pattern_detector...
      const patternModel = this.models.get('pattern_detector');
      let patternScore: number[] = [];
      
      if (patternModel && patternModel.optimizer) {
        try {
          const patternPred = patternModel.predict(featuresTensor) as tf.Tensor;
          patternScore = Array.from(patternPred.dataSync());
          tf.dispose(patternPred);
        } catch (patternError) {
          console.error('❌ Erro na detecção de padrões:', patternError);
        }
      }

      tf.dispose(featuresTensor);

      const latency = performance.now() - startTime;
      this.mlStats.prediction_latency = latency;

      const confidence = this.calculateMLConfidence(probabilities, patternScore);
      const predictedDigit = probabilities.length > 0 ? 
        probabilities.indexOf(Math.max(...probabilities)) : undefined;

      return {
        next_digit_probabilities: probabilities.length > 0 ? probabilities : new Array(10).fill(0.1),
        pattern_score: patternScore.length > 0 ? patternScore : new Array(4).fill(0.5),
        volatility_prediction: this.predictVolatility(features),
        confidence: confidence,
        predicted_digit: predictedDigit
      };
    } catch (error) {
      console.error('❌ Erro geral na predição ML:', error);
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

  private async trainIncremental() {
    if (this.trainingQueue.length < 20) return; // Reduzido de 50 para 20

    try {
      const X = this.trainingQueue.map(item => item.features);
      const y = this.trainingQueue.map(item => {
        const arr = new Array(10).fill(0);
        arr[item.label] = 1;
        return arr;
      });

      const XTensor = tf.tensor2d(X);
      const yTensor = tf.tensor2d(y);

      let model = this.models.get('probability_predictor');
      
      // 🔥 CORREÇÃO: Garantir que o modelo existe e está compilado
      if (!model) {
        model = this.createModel('probability_predictor');
        this.models.set('probability_predictor', model);
      }
      
      if (!model.optimizer) {
        model.compile({
          optimizer: tf.train.adam(0.001),
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy']
        });
      }

      const history = await model.fit(XTensor, yTensor, {
        epochs: 5,  // Reduzido de 10 para 5
        batchSize: 16, // Reduzido de 32 para 16
        validationSplit: 0.1, // Reduzido de 0.2 para 0.1
        verbose: 0
      });

      // 🔥 CORREÇÃO: Usar 'accuracy' corretamente
      const loss = history.history.loss[0];
      const accuracy = history.history.acc ? history.history.acc[0] : 
                      (history.history.accuracy ? history.history.accuracy[0] : 0);
      
      this.mlStats.ml_accuracy = Number(accuracy) * 100;
      this.mlStats.training_samples += this.trainingQueue.length;
      this.mlStats.last_trained = new Date().toISOString();
      this.mlStats.model_versions['probability_predictor'] = 
        (this.mlStats.model_versions['probability_predictor'] || 0) + 1;

      // Salvar modelo atualizado
      try {
        await model.save(`indexeddb://probability_predictor_model`);
        console.log(`✅ Modelo treinado. Loss: ${loss}, Accuracy: ${(Number(accuracy) * 100).toFixed(2)}%`);
      } catch (saveError) {
        console.warn('⚠️ Não foi possível salvar o modelo:', saveError);
      }

      tf.dispose([XTensor, yTensor]);
    } catch (error) {
      console.error('❌ Erro no treinamento incremental:', error);
    } finally {
      this.trainingQueue = [];
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
    numbers.forEach(d => {
      if (d >= 0 && d <= 9) distribution[d]++;
    });
    const total = numbers.length || 1;
    return distribution.map(d => d / total);
  }

   // 🔥 ADICIONAR: Método para limpar modelos antigos
  public async clearOldModels() {
    try {
      // Limpar IndexedDB
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name && db.name.includes('tensorflowjs')) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
      
      // Resetar modelos na memória
      this.models.clear();
      await this.initializeModels();
      
      console.log('✅ Modelos antigos limpos com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao limpar modelos:', error);
      return false;
    }
  }

  // 🔥 ADICIONAR: Verificação de compatibilidade do modelo
  private async checkModelCompatibility(modelName: string): Promise<boolean> {
    try {
      const model = this.models.get(modelName);
      if (!model) return false;
      
      // Verificar shape esperado
      const expectedInputShape = model.inputs[0].shape;
      if (!expectedInputShape || expectedInputShape[1] !== 30) {
        console.log(`🔄 Modelo ${modelName} tem shape incompatível: ${expectedInputShape}. Recriando...`);
        return false;
      }
      
      // Verificar se está compilado
      if (!model.optimizer) {
        console.log(`🔄 Modelo ${modelName} não está compilado. Recriando...`);
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

    public async verifyAndFixModels() {
    console.log('🔍 Verificando modelos ML...');
    
    for (const [name, model] of this.models.entries()) {
      const isCompatible = await this.checkModelCompatibility(name);
      if (!isCompatible) {
        console.log(`🔄 Recriando modelo ${name}...`);
        this.models.set(name, this.createModel(name));
      }
    }
    
    console.log('✅ Verificação de modelos concluída');
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