import * as tf from '@tensorflow/tfjs';
import { MLAnalysisConfig, SymbolAnalysis, TradingSignal, MLPredictions, MLConfig } from '../types';
import { ModelBackupManager } from './backup-models';

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
  private trainingQueue: Array<{ symbol: string, features: number[], label: number }> = [];
  private trainingPromise: Promise<void> | null = null;

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

  private compileModel(modelName: string, model: tf.LayersModel) {
    if (modelName === 'probability_predictor') {
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
      return;
    }

    if (modelName === 'pattern_detector') {
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
    }
  }

  private async initializeModels() {
    try {
      const savedModels = ['probability_predictor', 'pattern_detector'];

      for (const modelName of savedModels) {
        const storedModel = await ModelBackupManager.loadStoredModel(modelName);
        if (storedModel) {
          this.compileModel(modelName, storedModel);
          this.models.set(modelName, storedModel);
          this.mlStats.model_versions[modelName] = 1;
          console.log(`✅ Modelo ${modelName} carregado do IndexedDB`);
        } else {
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

    // CORREÇÃO: Usar config.ticksToAnalyze ao invés de valor fixo
    const windowSize = Math.min(this.config.ticksToAnalyze || 50, history.digits.length);
    const recentDigits = history.digits.slice(0, windowSize);
    const recentPrices = history.prices.slice(0, windowSize);
    // 🔥 CORREÇÃO: Garantir que sempre retorne 30 features
    const features = [
      // 1-5: Features estatísticas básicas (5)
      //média dos dígitos. Com seus dados, fica “no miolo” (entre 0 e 9), refletindo a distribuição geral.
      this.calculateMean(recentDigits),
      //desvio-padrão dos dígitos (o quanto eles variam em torno da média).
      this.calculateStdDev(recentDigits),
      //entropia (Shannon) da distribuição 0–9. Mais alta = dígitos mais “uniformes”; mais baixa = alguns dígitos dominando.
      this.calculateEntropy(recentDigits),
      //variância (stdDev²).
      this.calculateVariance(recentDigits),
      //assimetria. >0 puxa para dígitos altos, <0 para dígitos baixos.
      this.calculateSkewness(recentDigits),

      // 6-8: Features temporais (3)
      //mede dependência entre dígitos separados por 1/2/3 passos. Se houver padrão repetitivo, tende a subir; se for bem aleatório, tende a ficar perto de 0.
      this.calculateAutocorrelation(recentDigits, 1),
      this.calculateAutocorrelation(recentDigits, 2),
      this.calculateAutocorrelation(recentDigits, 3),

      // 9: Tendência (1)
      //numbers[0] - numbers[last] . No seu recentDigits , começa em 9 e termina em 9 , então a tendência fica ~0 (neste recorte específico).
      this.calculateTrend(recentDigits),

      // 10-19: Distribuição de dígitos (10) - TOTAL: 19
      //retorna 10 valores, cada um = frequência relativa do dígito 0..9 no recorte. Pelos seus dados, dá para ver muitos 2/3/5/9 , então essas posições ficam maiores.
      ...this.calculateDigitDistribution(recentDigits),

      // 20-22: Features de mercado (3) - TOTAL: 22
      //calcula “retornos” (p[i]-p[i-1])/p[i-1] , mede o desvio-padrão desses retornos e multiplica por sqrt(252) (annualização típica de finanças). Nos seus preços (em torno de 780 com variações pequenas), a volatilidade tende a ser baixa.
      this.calculateVolatility(recentPrices),
      //(prices[0] - prices[9]) / prices[9] = variação relativa do preço mais recente vs o de 10 ticks atrás.
      this.calculateMomentum(recentPrices),
      //RSI simplificado: soma ganhos/perdas nos primeiros 14 “deltas”. Observação: como o array está “mais recente primeiro”, o delta prices[i] - prices[i-1] fica no sentido do passado para o presente invertido , então o sinal de ganhos/perdas pode ficar invertido em relação ao RSI tradicional (ainda assim vira uma feature consistente se sempre calculada assim).
      this.calculateRSI(recentPrices, 14),

      // 23-25: Features de padrão (3) - TOTAL: 25
      //conta quantas vezes aparecem “triplas” iguais (AAA) e divide pelo tamanho. No seu recentDigits há uma sequência 9,9,9,9 , que gera pelo menos 2 triplas sobrepostas, então essa feature fica >0.
      this.detectStreaks(recentDigits),
      //conta reversões locais (padrão “sobe e depois desce” ou “desce e depois sobe”) e normaliza.
      this.detectReversals(recentDigits),
      //fração de passos onde a diferença absoluta entre dígitos consecutivos é exatamente 1 (ex.: 4→5, 8→7).
      this.calculateConsecutiveCount(recentDigits),

      // 26-28: Features derivadas (3) - TOTAL: 28
      //pega o dígito mais recente ( numbers[0] ) e retorna há quantos ticks ele tinha aparecido antes. No seu caso numbers[0]=9 e logo no começo aparece outro 9 , então tende a retornar algo como 1–2.
      this.calculateAbsencePattern(recentDigits),
      //olha só os 20 mais recentes, conta ocorrências de cada dígito e calcula quantos dígitos têm contagem ≥ 5. Retorna exhausted/10 (0 a 1). Se só o dígito 2 estiver ≥5, dá 0.1; se dois dígitos estiverem, 0.2, etc.
      this.calculateExhaustionScore(recentDigits, 5),
      //calcula a matriz de transição “from→to” (100 pares possíveis), pega a transição mais frequente e divide pelo total de transições. Quanto maior, mais “viciado” em um salto específico (ex.: 2→3 repetindo muito).
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
    // CORREÇÃO: Usar config.exhaustionWindow ao invés de valor fixo 20
    const exhaustionWindowSize = this.config.exhaustionWindow || 20;
    const recentHistory = history.digits.slice(0, exhaustionWindowSize);
    const lastDigit = history.digits[0];

    // Distribuição - usar config.ticksToAnalyze
    const distribution: Record<number, number> = {};
    const statsHistory = history.digits.slice(0, this.config.ticksToAnalyze || 100);
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
      this.scheduleTraining();
    }
  }

  private scheduleTraining() {
    if (this.trainingPromise) return;
    this.trainingPromise = this.drainTrainingQueue().finally(() => {
      this.trainingPromise = null;
    });
  }

  private async drainTrainingQueue() {
    while (this.trainingQueue.length >= 20 && this.config.mlConfig.trainingEnabled) {
      const batch = this.trainingQueue.splice(0, 120);
      await this.trainIncremental(batch);
      await tf.nextFrame();
    }
  }

  private async trainIncremental(batch: Array<{ symbol: string, features: number[], label: number }>) {
    if (batch.length < 20) return;

    let XTensor: tf.Tensor2D | null = null;
    let yTensor: tf.Tensor2D | null = null;

    try {
      const X = batch.map(item => item.features);
      const y = batch.map(item => {
        const arr = new Array(10).fill(0);
        arr[item.label] = 1;
        return arr;
      });

      XTensor = tf.tensor2d(X);
      yTensor = tf.tensor2d(y);

      let model = this.models.get('probability_predictor');

      // 🔥 CORREÇÃO: Garantir que o modelo existe e está compilado
      if (!model) {
        model = this.createModel('probability_predictor');
        this.models.set('probability_predictor', model);
      }

      if (!model.optimizer) {
        this.compileModel('probability_predictor', model);
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
      this.mlStats.training_samples += batch.length;
      this.mlStats.last_trained = new Date().toISOString();
      this.mlStats.model_versions['probability_predictor'] =
        (this.mlStats.model_versions['probability_predictor'] || 0) + 1;

      // Salvar modelo atualizado
      try {
        await ModelBackupManager.saveModel('probability_predictor', model);
        console.log(`✅ Modelo treinado. Loss: ${loss}, Accuracy: ${(Number(accuracy) * 100).toFixed(2)}%`);
      } catch (saveError) {
        console.warn('⚠️ Não foi possível salvar o modelo:', saveError);
      }

    } catch (error) {
      const msg = (error as any)?.message || String(error);
      if (msg.includes('another fit() call is ongoing')) {
        this.trainingQueue.unshift(...batch);
        await new Promise((r) => setTimeout(r, 50));
        this.scheduleTraining();
        return;
      }
      console.error('❌ Erro no treinamento incremental:', error);
    } finally {
      if (XTensor) XTensor.dispose();
      if (yTensor) yTensor.dispose();
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
      //console.log(`Combined Confidence: ${combinedConfidence}, Effective Min Confidence: ${effectiveMinConfidence}`);
      if (combinedConfidence < effectiveMinConfidence) continue;
      //hjconsole.log("PASSOU");

      // Adicionar ML boost às confianças existentes
      const mlBoost = analysis.ml_predictions ?
        (analysis.ml_predictions.confidence - 50) / 50 * 20 : 0;

      // OVER Specific
      if (specificOperations.over.enabled) {
        specificOperations.over.digits.forEach(targetDigit => {
          const lowerDigits = Array.from({ length: targetDigit + 1 }, (_, i) => i);
          const exhaustedLowers = lowerDigits.filter(d => analysis.exhaustion.includes(d));

          if (exhaustedLowers.length >= 2) {
            const confidence = Math.min(95, 80 + mlBoost + (analysis.ml_predictions?.confidence || 0) / 10);
            console.log(`Confidence: ${confidence}, Effective Min Confidence: ${effectiveMinConfidence}`);
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
          const upperDigits = Array.from({ length: 10 - targetDigit }, (_, i) => i + targetDigit);
          const exhaustedUppers = upperDigits.filter(d => analysis.exhaustion.includes(d));

          if (exhaustedUppers.length >= 2) {
            const confidence = Math.min(95, 80 + mlBoost + (analysis.ml_predictions?.confidence || 0) / 10);
            console.log(`Confidence: ${confidence}, Effective Min Confidence: ${effectiveMinConfidence}`);
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
            console.log(`Confidence: ${confidence}, Effective Min Confidence: ${effectiveMinConfidence}`);
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
    // 🔥 CORREÇÃO: Validação para evitar NaN
    if (!numbers || numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;
    return isNaN(mean) ? 0 : mean;
  }

  private calculateStdDev(numbers: number[]): number {
    // 🔥 CORREÇÃO: Validação para evitar NaN
    if (!numbers || numbers.length === 0) return 0;

    const mean = this.calculateMean(numbers);
    const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
    const stdDev = Math.sqrt(this.calculateMean(squareDiffs));
    return isNaN(stdDev) ? 0 : stdDev;
  }

  private calculateEntropy(numbers: number[]): number {
    // 🔥 CORREÇÃO: Validação de array vazio para evitar NaN
    if (!numbers || numbers.length === 0) return 0;

    const counts = new Array(10).fill(0);
    numbers.forEach(d => counts[d]++);
    const probs = counts.map(c => c / numbers.length);

    let entropy = 0;
    probs.forEach(p => {
      if (p > 0) entropy -= p * Math.log2(p);
    });

    // 🔥 CORREÇÃO: Garantir que retorne número válido
    return isNaN(entropy) ? 0 : entropy;
  }

  private calculateVariance(numbers: number[]): number {
    // 🔥 CORREÇÃO: Validação para evitar NaN
    if (!numbers || numbers.length === 0) return 0;

    const mean = this.calculateMean(numbers);
    if (isNaN(mean)) return 0;

    const variance = numbers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numbers.length;
    return isNaN(variance) ? 0 : variance;
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
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
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
      const change = prices[i] - prices[i - 1];
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
      if (numbers[i] === numbers[i - 1] && numbers[i] === numbers[i - 2]) {
        streaks++;
      }
    }

    return streaks / numbers.length;
  }

  private detectReversals(numbers: number[]): number {
    if (numbers.length < 3) return 0;

    let reversals = 0;
    for (let i = 2; i < numbers.length; i++) {
      if ((numbers[i] > numbers[i - 1] && numbers[i - 1] < numbers[i - 2]) ||
        (numbers[i] < numbers[i - 1] && numbers[i - 1] > numbers[i - 2])) {
        reversals++;
      }
    }

    return reversals / numbers.length;
  }

  private calculateConsecutiveCount(numbers: number[]): number {
    if (numbers.length < 2) return 0;

    let consecutive = 0;
    for (let i = 1; i < numbers.length; i++) {
      if (Math.abs(numbers[i] - numbers[i - 1]) === 1) {
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
      const from = numbers[i - 1];
      const to = numbers[i];
      transitions[from * 10 + to]++;
    }

    const totalTransitions = numbers.length - 1;
    return totalTransitions === 0 ? 0 :
      Math.max(...transitions) / totalTransitions;
  }

  private calculateMarketQuality(numbers: number[]): number {
    // 🔥 CORREÇÃO: Validação mais robusta
    if (!numbers || numbers.length < 20) return 50;

    const entropy = this.calculateEntropy(numbers);
    const digitVariance = this.calculateVariance(numbers);
    const streakiness = this.detectStreaks(numbers);

    // 🔥 CORREÇÃO: Verificar NaN em cada componente
    const safeEntropy = isNaN(entropy) ? 3.32 : entropy;
    const safeVariance = isNaN(digitVariance) ? 8.25 : digitVariance;
    const safeStreakiness = isNaN(streakiness) ? 0 : streakiness;

    // NOVA LÓGICA DE SCORE:
    // Base de 60 (mercado neutro)
    let score = 60;

    // Entropia: ~3.32 bits = distribuição uniforme (normal para mercado aleatório)
    // Entropia baixa (<2.5) = dígitos concentrados = padrões detectáveis = BOM para operar
    // Entropia alta (>3.2) = muito aleatório = NEUTRO
    const entropyScore = Math.max(0, (3.32 - safeEntropy) / 3.32) * 20; // 0 a 20 pontos
    score += entropyScore;

    // Variância: ~8.25 é típico para dígitos 0-9 uniformes
    // Variância baixa = dígitos agrupados = padrões = BOM
    // Variância alta = mais disperso = NEUTRO
    const varianceScore = Math.max(0, (8.25 - safeVariance) / 8.25) * 10; // 0 a 10 pontos
    score += varianceScore;

    // Streaks: sequências de dígitos iguais (AAA)
    // Muitos streaks = mercado pode estar "travado" = RUIM
    score -= safeStreakiness * 20; // Penalidade de 0 a ~5 pontos

    // 🔥 CORREÇÃO: Garantir resultado válido entre 30-95
    const finalScore = Math.max(30, Math.min(95, score));
    return isNaN(finalScore) ? 60 : finalScore;
  }

  private predictVolatility(features: number[]): number[] {
    return [
      features[10] * 100,
      features[10] * 120,
      features[10] * 80
    ];
  }

  // Adicionar este método novo
  private calculateProbabilityEntropy(probabilities: number[]): number {
    const sum = probabilities.reduce((a, b) => a + b, 0);
    if (sum === 0 || probabilities.length === 0) return 0;

    const normalizedProbs = probabilities.map(p => p / sum);

    let entropy = 0;
    for (const p of normalizedProbs) {
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    // Normalizar para 0-1 (entropia máxima = log2(N))
    return entropy / Math.log2(probabilities.length);
  }

  // Corrigir calculateMLConfidence
  private calculateMLConfidence(probabilities: number[], patternScore: number[]): number {
    if (probabilities.length === 0) return 0;

    const maxProb = Math.max(...probabilities);
    const entropy = this.calculateProbabilityEntropy(probabilities); // ✅ NOVO MÉTODO
    const patternStrength = patternScore.reduce((a, b) => a + b, 0) / patternScore.length;

    return Math.min(100,
      (maxProb * 60) +
      (patternStrength * 30) +
      ((1 - entropy) * 10)
    );
  }

  private combineConfidences(heuristicConfidence: number, mlConfidence: number): number {
    //console.log('heuristicConfidence', heuristicConfidence);
    //console.log('mlConfidence', mlConfidence);
    if (!this.config.mlConfig.useML) return heuristicConfidence;

    // CORREÇÃO: Usar pesos configuráveis do config
    const mlWeight = (this.config.mlConfig.mlWeight || 60) / 100;
    const heuristicWeight = (this.config.mlConfig.heuristicWeight || 40) / 100;

    const combined = (mlConfidence * mlWeight) + (heuristicConfidence * heuristicWeight);

    // Safety check: se heurística discordar muito, penaliza
    const disagreement = Math.abs(mlConfidence - heuristicConfidence);
    
    if (disagreement > 40) {
      console.warn(`⚠️ Grande desacordo: ML ${mlConfidence.toFixed(1)}% vs Heurística ${heuristicConfidence.toFixed(1)}%`);
      return combined * 0.8; // Reduz confiança em 20%
    }

    return combined;
  }

  public getMLStats() {
    return this.mlStats;
  }

  public async saveAllModels() {
    if (this.trainingPromise) {
      await this.trainingPromise;
    }
    await ModelBackupManager.saveModels(this.models.entries());
  }

  public async loadModelsFromStorage() {
    if (this.trainingPromise) {
      await this.trainingPromise;
    }

    const modelNames = ['probability_predictor', 'pattern_detector'];
    const loaded: Record<string, boolean> = {};

    for (const modelName of modelNames) {
      try {
        const model = await ModelBackupManager.loadStoredModel(modelName);
        if (!model) {
          loaded[modelName] = false;
          continue;
        }
        this.compileModel(modelName, model);
        this.models.set(modelName, model);
        loaded[modelName] = true;
      } catch {
        loaded[modelName] = false;
      }
    }

    this.isInitialized = true;
    return loaded;
  }

  public updateConfig(config: MLAnalysisConfig) {
    this.config = config;
  }
}
