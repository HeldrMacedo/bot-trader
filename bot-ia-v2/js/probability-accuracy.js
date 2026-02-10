
// 🎯 Gerenciador de Precisão de Probabilidade
// Responsável por rastrear assertividade e controlar inversão de lógica

class ProbabilityAccuracyManager {
    constructor() {
        if (ProbabilityAccuracyManager.instance) {
            return ProbabilityAccuracyManager.instance;
        }

        this.history = []; // Histórico de acertos/erros (true/false)
        this.historySize = 10; // 🎯 Janela de 10 ticks (Solicitado pelo usuário)
        this.predictionForNextTick = null; // Conjunto de dígitos previstos ("Maior Chance") para o próximo tick
        this.accuracy = 100; // Porcentagem inicial
        this.lastAccuracy = 100; // Rastrear precisão anterior para detectar quedas
        this.isInverted = false; // Estado de inversão

        // 🎯 Configuração de quantos dígitos usar para precisão (Top N)
        this.topN = parseInt(localStorage.getItem('prob_accuracy_topN')) || 5;

        // Configurações de Limiar (Toggle-on-Defeat)
        this.toggleThreshold = 50; // Abaixo de 50% -> Zona de busca ativa

        ProbabilityAccuracyManager.instance = this;
    }

    /**
     * Define quantos dígitos serão usados como referência para a precisão
     * @param {number} n - Quantidade de dígitos (1-10)
     */
    setTopN(n) {
        const val = parseInt(n);
        if (isNaN(val) || val < 1 || val > 10) return;

        this.topN = val;
        localStorage.setItem('prob_accuracy_topN', val);
      
        // Resetar histórico ao mudar critério para evitar confusão visual imediata com dados antigos
        // ou deixar o usuário decidir? Geralmente melhor limpar para mostrar a nova precisão real.
        this.history = [];
        this.accuracy = 100;
    }

    static getInstance() {
        if (!ProbabilityAccuracyManager.instance) {
            ProbabilityAccuracyManager.instance = new ProbabilityAccuracyManager();
        }
        return ProbabilityAccuracyManager.instance;
    }

    /**
     * Registra o resultado do último tick e atualiza a precisão
     * @param {number|string} winDigit - O dígito vencedor (0-9)
     */
    updateOutcome(winDigit) {
        if (!this.predictionForNextTick) return;

        const winner = parseInt(winDigit, 10);
        if (isNaN(winner)) return;

        // 1. Verificar se foi um "Hit" (está no Top 5 previsto)
        const isHit = this.predictionForNextTick.has(winner);

        // 2. Atualizar Histórico (Janela deslizante)
        this.history.push(isHit);
        if (this.history.length > this.historySize) {
            this.history.shift();
        }

        // 3. Calcular Precisão
        const hits = this.history.filter(h => h).length;
        this.accuracy = (hits / this.history.length) * 100;

      
    }

    /**
     * Define a previsão para o PRÓXIMO tick baseada nas estatísticas atuais
     * @param {Array} sortedStats - Lista de dígitos ordenados por probabilidade (Maior -> Menor)
     */
    recordPrediction(sortedStats) {
        let technicalTopN = [];

        try {
            // Tentar extrair dígitos de diferentes formatos possíveis
            technicalTopN = sortedStats.slice(0, this.topN).map(item => {
                if (typeof item === 'object' && item.digit !== undefined) return parseInt(item.digit);
                return parseInt(item);
            });

            // FILTRAR NaN para evitar erros
            technicalTopN = technicalTopN.filter(d => !isNaN(d));

        } catch (e) {
            console.error('❌ [ACC ERROR] Erro ao processar stats:', e);
            return;
        }

        // Armazenar como SET para busca rápida (O(1)) e compatibilidade com .has()
        this.predictionForNextTick = new Set(technicalTopN);
        // console.log(`🔮 [ACC PREDICT] Próximo Top ${this.topN}:`, Array.from(this.predictionForNextTick));
    }

    calculateAccuracy() {
        if (this.history.length === 0) {
            this.accuracy = 100;
            return;
        }

        const hits = this.history.filter(h => h).length;
        this.accuracy = (hits / this.history.length) * 100;

        // 🔄 Lógica de Inversão (Histerese)
        if (!this.isInverted && this.accuracy < this.inversionThreshold) {
            this.isInverted = true;
         
        } else if (this.isInverted && this.accuracy > this.revertThreshold) {
            this.isInverted = false;
          
        }
    }

    shouldInvert() {
        return this.isInverted;
    }

    getAccuracy() {
        return this.accuracy;
    }

    // 🛠️ Debug/Teste
    forceInversion(state) {
        this.isInverted = state;
       
    }
}

// Exportar instância global
window.ProbabilityAccuracyManager = ProbabilityAccuracyManager;
