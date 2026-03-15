
// js/price-movement-rules.js
// Sistema de regras baseadas em movimentação percentual de preços
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class PriceMovementRulesProcessor {
    constructor() {
        this.sessionId = SessionManager.getUserSessionId();
        this.defaultPeriod = 14; // Padrão de 14 ticks para análise
        
        // Cache para otimizar cálculos
        this.movementCache = new Map();
        this.lastCacheUpdate = 0;
        this.cacheTimeout = 1000; // 1 segundo
    }

    // Processar regra de movimentação percentual
    processPriceMovementRule(rule) {
        try {
            // Validar parâmetros da regra
            if (!this.validatePriceMovementRule(rule)) {
                console.error('❌ Regra de movimentação percentual inválida:', rule);
                return null;
            }

            // Extrair período (usar padrão se não especificado)
            const period = rule.parameters?.period || this.defaultPeriod;
            
            // Obter histórico de preços para o período especificado
            const prices = this.getPricesForPeriod(period);
            
            if (!prices || prices.length < 2) {
                console.warn('⚠️ Histórico de preços insuficiente para cálculo de movimentação');
                return {
                    currentMovement: 0,
                    sufficient: false,
                    direction: null
                };
            }

            // Calcular movimentação percentual
            const result = this.calculatePercentageMovement(rule, prices);
            
            return {
                ...result,
                period: period,
                sufficient: prices.length >= Math.min(period, 2) // Pelo menos 2 preços para calcular movimento
            };

        } catch (error) {
            console.error('❌ Erro ao processar regra de movimentação percentual:', error);
            return null;
        }
    }

    // Validar regra de movimentação percentual
    validatePriceMovementRule(rule) {
        if (!rule || rule.type !== 'price_move') {
            return false;
        }

        const params = rule.parameters;
        if (!params) {
            return false;
        }

        // Validar direção
        const validDirections = ['up', 'down'];
        if (!params.direction || !validDirections.includes(params.direction)) {
            console.error('❌ Direção inválida:', params.direction);
            return false;
        }

        // Validar se tem percentual (nova funcionalidade)
        if (params.percentage !== undefined) {
            if (typeof params.percentage !== 'number' || params.percentage <= 0) {
                console.error('❌ Percentual inválido:', params.percentage);
                return false;
            }
        }

        // Validar operador se presente
        if (params.operator && !['>', '<', '=', '>=', '<='].includes(params.operator)) {
            console.error('❌ Operador inválido:', params.operator);
            return false;
        }

        return true;
    }

    // Obter preços para período específico
    getPricesForPeriod(period) {
        try {
            // ❌ REMOVIDO fallback de R_10 - usar ativo selecionado obrigatoriamente
            const currentSymbol = localStorage.getItem('selectedSymbol');
            if (!currentSymbol) {
                console.error('❌ [PRICE MOVEMENT] Nenhum ativo selecionado!');
                throw new Error('ERRO: Nenhum ativo selecionado. Recarregue a página.');
            }

            let history = null;

            // 🎯 TENTATIVA 1: Usar DerivServiceInstance (Sistema Moderno)
            if (window.DerivServiceInstance && typeof window.DerivServiceInstance.getHistoricalTicksSync === 'function') {
                try {
                    history = window.DerivServiceInstance.getHistoricalTicksSync(currentSymbol, period + 1);
                } catch (e) {
                    console.warn('⚠️ [PriceMove] Erro ao acessar DerivServiceInstance:', e);
                }
            }


            if (history && history.prices && Array.isArray(history.prices) && history.prices.length > 0) {
                const validPrices = history.prices.filter(price => typeof price === 'number' && price > 0);
                                            
                             
                return validPrices;
            }

            console.warn(`⚠️ [PRICE PERIOD] Nenhum histórico válido para ${currentSymbol}`);
            return [];
        } catch (error) {
            console.error('❌ Erro ao obter preços para período:', error);
            return [];
        }
    }

    // Calcular movimentação percentual
    calculatePercentageMovement(rule, prices) {
        const params = rule.parameters;
        
        if (prices.length < 2) {
            return { 
                currentMovement: 0, 
                direction: null, 
                percentageChange: 0,
                oldestPrice: 0,
                newestPrice: 0
            };
        }

        // Pegar preço mais antigo e mais recente do período
        const oldestPrice = prices[0];
        const newestPrice = prices[prices.length - 1];
        
        // Calcular mudança percentual
        const percentageChange = ((newestPrice - oldestPrice) / oldestPrice) * 100;
        const absoluteChange = Math.abs(percentageChange);
        const actualDirection = percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'same';

     
        return {
            currentMovement: absoluteChange,
            actualDirection: actualDirection,
            percentageChange: percentageChange,
            oldestPrice: oldestPrice,
            newestPrice: newestPrice
        };
    }

    // Verificar se condição de movimentação percentual é atendida
    checkPriceMovementCondition(rule) {
        try {
            const result = this.processPriceMovementRule(rule);
            
            if (!result || !result.sufficient) {
                return false; // Dados insuficientes
            }

            const params = rule.parameters;
            
            // Se é baseado em percentual
            if (params.percentage !== undefined) {
                const requiredDirection = params.direction;
                const requiredPercentage = params.percentage;
                const actualMovement = result.currentMovement;
                const actualDirection = result.actualDirection;

               
                // Verificar se a direção está correta
                if (actualDirection !== requiredDirection) {
                    return false;
                }

                // Verificar se o percentual atende à condição
                if (params.operator) {
                    switch (params.operator) {
                        case '>':
                            return actualMovement > requiredPercentage;
                        case '<':
                            return actualMovement < requiredPercentage;
                        case '>=':
                            return actualMovement >= requiredPercentage;
                        case '<=':
                            return actualMovement <= requiredPercentage;
                        case '=':
                            return Math.abs(actualMovement - requiredPercentage) < 0.01;
                    }
                } else {
                    // Sem operador = movimento deve ser pelo menos o percentual especificado
                    return actualMovement >= requiredPercentage;
                }
            }

            return false;

        } catch (error) {
            console.error('❌ Erro ao verificar condição de movimentação percentual:', error);
            return false;
        }
    }

    // Gerar formato visual para regra de movimentação percentual
    generateVisualFormat(rule, statusIcon) {
        try {
            const params = rule.parameters;
            const result = this.processPriceMovementRule(rule);
            
            if (!result) {
                return `🔴 Preço: X% ↘️`;
            }

            // Determinar o ícone correto baseado se a regra foi atendida
            let correctIcon = '🔴'; // Padrão: não atendida
            
            // Verificar se a regra foi atendida
            const isConditionMet = this.checkPriceMovementCondition(rule);
            if (isConditionMet) {
                correctIcon = '🟢'; // Regra atendida
            }

            // Gerar descrição da condição
            let directionText = params.direction === 'up' ? '↗️' : '↘️';
            let percentageText = '';
            
            if (result.sufficient) {
                // Mostrar o percentual atual do movimento com mais precisão
                const actualMovement = Math.abs(result.percentageChange || 0);
                
                // Se o movimento é muito pequeno, mostrar com mais casas decimais
                if (actualMovement < 0.1) {
                    percentageText = `${actualMovement.toFixed(3)}%`;
                } else if (actualMovement < 1.0) {
                    percentageText = `${actualMovement.toFixed(2)}%`;
                } else {
                    percentageText = `${actualMovement.toFixed(1)}%`;
                }
            } else {
                percentageText = `X%`;
            }
            
            return `${correctIcon} Preço: ${percentageText} ${directionText}`;

        } catch (error) {
            console.error('❌ Erro ao gerar formato visual:', error);
            return `🔴 Preço: X% ${params.direction === 'up' ? '↗️' : '↘️'}`;
        }
    }

    // Gerar formato de display para regra de movimentação percentual
    generateDisplayFormat(rule) {
        try {
            const params = rule.parameters;
            
            let directionText = params.direction === 'up' ? 'subir' : 'cair';
            let percentageText = params.percentage ? `${params.percentage}%` : '';
            let operatorText = params.operator ? ` ${this.normalizeOperator(params.operator)}` : '';
            let periodText = params.period ? ` no período de ${params.period}` : '';
            
            return `Preço ${directionText}${operatorText} ${percentageText}${periodText}`;

        } catch (error) {
            console.error('❌ Erro ao gerar formato de display:', error);
            return 'Regra de movimentação não formatada';
        }
    }

    // Normalizar operadores para exibição
    normalizeOperator(operator) {
        const operatorMap = {
            '>': 'mais que',
            '<': 'menos que', 
            '=': 'exatamente',
            '>=': 'pelo menos',
            '<=': 'no máximo'
        };
        return operatorMap[operator] || operator;
    }

    // Extrair parâmetros da regra de movimentação percentual
    static extractParameters(rule) {
        const params = {
            type: 'price_move'
        };

        // Copiar todos os parâmetros específicos da regra
        Object.keys(rule).forEach(key => {
            if (key !== 'id' && key !== 'type' && key !== 'description' && key !== 'display_format') {
                params[key] = rule[key];
            }
        });

        return params;
    }

    // Validar parâmetros extraídos
    static validateParameters(params) {
        if (params.type !== 'price_move') {
            console.error(`❌ ERRO: Tipo incorreto para regra de movimentação: ${params.type}`);
            params.direction = null;
            return;
        }

        // Validar direção
        const validDirections = ['up', 'down'];
        if (!params.direction || !validDirections.includes(params.direction)) {
            console.error(`❌ ERRO: Direção inválida: ${params.direction}`);
            params.direction = null;
            return;
        }

        // Validar percentual se presente
        if (params.percentage !== undefined) {
            if (typeof params.percentage !== 'number' || params.percentage <= 0) {
                console.error(`❌ ERRO: Percentual inválido: ${params.percentage}`);
                params.percentage = null;
                return;
            }
        }

        // Validar período
        if (params.period !== undefined && (typeof params.period !== 'number' || params.period < 1 || params.period > 100)) {
            console.warn(`⚠️ Período inválido: ${params.period}. Usando padrão: 10`);
            params.period = 10;
        }

     
    }
}

// Singleton para uso global
let priceMovementRulesInstance = null;

function getPriceMovementRulesInstance() {
    if (!priceMovementRulesInstance) {
        priceMovementRulesInstance = new PriceMovementRulesProcessor();
    }
    return priceMovementRulesInstance;
}
