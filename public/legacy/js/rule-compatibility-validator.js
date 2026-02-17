
// js/rule-compatibility-validator.js
// Responsável pela validação de compatibilidade entre estratégias e configurações
// Bloqueia o início do monitoramento quando há incompatibilidades
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class RuleCompatibilityValidator {
    constructor() {
        // Cache de validações para melhor performance
        this.validationCache = new Map();
        this.contractGroups = this.initializeContractGroups();
        this.contractMappings = this.initializeContractMappings();
    }

    // Inicializar grupos de contratos e suas palavras-chave
    initializeContractGroups() {
        return {
            'Over/Under': {
                contracts: ['DIGITOVER', 'DIGITUNDER'],
                keywords: ['over', 'under', 'acima', 'abaixo']
            },
            'Call/Put': {
                contracts: ['CALL', 'PUT'],
                keywords: ['call', 'put', 'compra', 'venda', 'subir', 'descer']
            },
            'Call/Put Europeu': {
                contracts: ['CALLE', 'PUTE'],
                keywords: ['call', 'put', 'compra', 'venda', 'subir', 'descer']
            },
            'Only Ups/Downs': {
                contracts: ['ONLYUPS', 'ONLYDOWNS'],
                keywords: ['only up', 'only down', 'onlyup', 'onlydown', 'apenas subir', 'apenas descer']
            },
            'Differ/Match': {
                contracts: ['DIGITDIFF', 'DIGITMATCH'],
                keywords: ['differ', 'different', 'match', 'diferente', 'igual']
            },
            'Even/Odd': {
                contracts: ['DIGITEVEN', 'DIGITODD'],
                keywords: ['even', 'odd', 'par', 'ímpar', 'impar']
            },
            'Touch/No Touch': {
                contracts: ['TOUCH', 'NOTOUCH', 'ONETOUCH'],
                keywords: ['touch', 'notouch', 'tocar', 'não tocar', 'nao tocar']
            },
            'Asian Up/Down': {
                contracts: ['ASIANU', 'ASIAND'],
                keywords: ['asian', 'asianu', 'asiand', 'média']
            },
            'Reset Call/Put': {
                contracts: ['RESETCALL', 'RESETPUT'],
                keywords: ['reset', 'resetcall', 'resetput']
            },
            'Tick High/Low': {
                contracts: ['TICKHIGH', 'TICKLOW'],
                keywords: ['tick', 'high', 'low', 'alto', 'baixo']
            },
            'Run High/Low': {
                contracts: ['RUNHIGH', 'RUNLOW'],
                keywords: ['run', 'runhigh', 'runlow', 'sequência']
            }
        };
    }

    // Inicializar mapeamentos com prioridade exata - APENAS palavras-chave EXATAS de contratos
    initializeContractMappings() {
        return {
            'Over/Under': {
                'DIGITOVER': {
                    exact: ['over'], // APENAS palavra exata do contrato
                    partial: [] // ✅ REMOVIDAS palavras descritivas válidas
                },
                'DIGITUNDER': {
                    exact: ['under'], // APENAS palavra exata do contrato
                    partial: [] // ✅ REMOVIDAS palavras descritivas válidas
                }
            },
            'Call/Put': {
                'CALL': {
                    exact: ['call'], // APENAS palavra exata do contrato
                    partial: ['rise'] // Manter apenas termos específicos de trading
                },
                'PUT': {
                    exact: ['put'], // APENAS palavra exata do contrato
                    partial: ['fall'] // Manter apenas termos específicos de trading
                }
            },
            'Call/Put Europeu': {
                'CALLE': {
                    exact: ['calle', 'higher'], // Palavras exatas específicas
                    partial: []
                },
                'PUTE': {
                    exact: ['pute', 'lower'], // Palavras exatas específicas
                    partial: []
                }
            },
            'Only Ups/Downs': {
                'ONLYUPS': {
                    exact: ['only up', 'onlyup', 'onlyups'], // Palavras exatas específicas
                    partial: []
                },
                'ONLYDOWNS': {
                    exact: ['only down', 'onlydown', 'onlydowns'], // Palavras exatas específicas
                    partial: []
                }
            },
            'Differ/Match': {
                'DIGITDIFF': {
                    exact: ['differ', 'diff'], // Palavras exatas específicas do contrato
                    partial: []
                },
                'DIGITMATCH': {
                    exact: ['match'], // APENAS palavra exata do contrato
                    partial: []
                }
            },
            'Even/Odd': {
                'DIGITEVEN': {
                    exact: ['even'], // APENAS palavra exata do contrato
                    partial: []
                },
                'DIGITODD': {
                    exact: ['odd'], // APENAS palavra exata do contrato
                    partial: []
                }
            },
            'Touch/No Touch': {
                'TOUCH': {
                    exact: ['touch'], // APENAS palavra exata do contrato
                    partial: []
                },
                'NOTOUCH': {
                    exact: ['notouch', 'no touch'], // Palavras exatas específicas
                    partial: []
                }
            },
            'Run High/Low': {
                'RUNHIGH': {
                    exact: ['runhigh', 'run high'], // Palavras exatas específicas
                    partial: []
                },
                'RUNLOW': {
                    exact: ['runlow', 'run low'], // Palavras exatas específicas
                    partial: []
                }
            }
        };
    }

    // Função principal de validação de compatibilidade
    validateStrategyContractCompatibility() {
        const contractSelect = document.getElementById('contract-select');
        const tradeTypeSelect = document.getElementById('trade-type-select');
        const strategyText = document.getElementById('strategy-text');
        const predictionInput = document.getElementById('prediction-input');

        // Verificar se todos os elementos necessários estão presentes
        if (!contractSelect?.value || !tradeTypeSelect?.value || !strategyText?.value?.trim()) {
            return { isValid: true }; // Se não há dados suficientes, permitir (outras validações irão capturar)
        }

        const selectedContract = contractSelect.value;
        const selectedTradeType = tradeTypeSelect.value;
        const strategyContent = strategyText.value.toLowerCase();
        const predictionValue = predictionInput?.value ? parseInt(predictionInput.value) : null;


        // Gerar chave de cache
        const cacheKey = `${selectedContract}-${selectedTradeType}-${strategyContent.length}-${predictionValue}`;

        // Verificar cache
        if (this.validationCache.has(cacheKey)) {
            return this.validationCache.get(cacheKey);
        }

        // Encontrar grupo do contrato selecionado
        const contractGroupInfo = this.findContractGroup(selectedContract);
        if (!contractGroupInfo) {
            const result = { isValid: true }; // Contrato não encontrado nos grupos, permitir
            this.validationCache.set(cacheKey, result);
            return result;
        }

        // Detectar contratos mencionados na estratégia
        const detectedContracts = this.detectContractsInStrategy(strategyContent, contractGroupInfo);

        // Executar validações
        const validationResult = this.executeValidations(
            selectedTradeType,
            contractGroupInfo,
            detectedContracts,
            predictionValue,
            strategyContent
        );

        // Armazenar no cache
        this.validationCache.set(cacheKey, validationResult);

        return validationResult;
    }

    // Encontrar grupo do contrato selecionado
    findContractGroup(selectedContract) {
        for (const [groupName, data] of Object.entries(this.contractGroups)) {
            if (data.contracts.includes(selectedContract)) {
                return {
                    name: groupName,
                    contracts: data.contracts,
                    keywords: data.keywords
                };
            }
        }
        return null;
    }

    // Detectar contratos mencionados na estratégia com prioridade
    detectContractsInStrategy(strategyContent, contractGroupInfo) {
        const detectedContracts = [];
        const strategyLines = strategyContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // ✅ CORREÇÃO CRÍTICA: Lista de palavras descritivas VÁLIDAS que NÃO são palavras-chave de contratos
        const validDescriptiveWords = [
            // Descritores de percentual e estatísticas
            'pares', 'impares', 'par', 'impar', 'percentual', 'digitos', 'dígitos',
            // Descritores de comparação que não são nomes exatos de contratos
            'acima', 'abaixo', 'superior', 'inferior', 'maior', 'menor',
            'igual', 'diferente', 'quando', 'entrar', 'ultimos', 'últimos',
            // Descritores de padrão e análise
            'padrao', 'padrão', 'repetir', 'consecutivos', 'sequencia', 'sequência',
            // Descritores de movimento e indicadores
            'subir', 'descer', 'subiu', 'desceu', 'movimento', 'pontos',
            'ticks', 'velas', 'candles', 'alta', 'baixa', 'suporte', 'resistencia', 'resistência',
            // Descritores de indicadores técnicos
            'rsi', 'sma', 'media', 'média', 'movel', 'móvel', 'periodo', 'período',
            // Números e operadores
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            'zero', 'um', 'dois', 'tres', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'
        ];

        // Função auxiliar para verificar se uma palavra é válida descritiva
        const isValidDescriptiveWord = (word) => {
            const lowerWord = word.toLowerCase();
            return validDescriptiveWords.includes(lowerWord) ||
                /^\d+$/.test(word) || // números
                /^[\>\<\=\!\+\-\*\/\%]+$/.test(word); // operadores
        };

        // 🔧 CORREÇÃO CRÍTICA: Verificar TODOS os grupos para detectar incompatibilidades
        // Não apenas o grupo atual, mas todos os grupos para encontrar conflitos

        // 1. Primeiro verificar o grupo atual (para compatibilidade)
        const currentGroupMapping = this.contractMappings[contractGroupInfo.name];
        if (currentGroupMapping) {
            for (const [contractType, keywords] of Object.entries(currentGroupMapping)) {
                // Verificar nome exato do contrato
                const contractLowerExact = contractType.toLowerCase();
                const exactContractRegex = new RegExp(`\\b${contractLowerExact}\\b`, 'i');
                if (exactContractRegex.test(strategyContent)) {
                    detectedContracts.push({
                        contract: contractType,
                        group: contractGroupInfo.name,
                        matchType: 'exact_contract',
                        line: strategyLines.find(line => exactContractRegex.test(line)) || 'unknown'
                    });
                    continue;
                }

                // ✅ CORREÇÃO: Verificar palavras-chave exatas SOMENTE se não forem descritores válidos
                for (const exactKeyword of keywords.exact) {
                    // Pular se for uma palavra descritiva válida
                    if (isValidDescriptiveWord(exactKeyword)) {
                        continue;
                    }

                    const exactRegex = new RegExp(`\\b${exactKeyword.toLowerCase()}\\b`, 'i');
                    if (exactRegex.test(strategyContent)) {
                        detectedContracts.push({
                            contract: contractType,
                            group: contractGroupInfo.name,
                            keyword: exactKeyword,
                            matchType: 'exact_keyword',
                            line: strategyLines.find(line => exactRegex.test(line)) || 'unknown'
                        });
                        break;
                    }
                }
            }
        }

        // 2. 🔧 NOVA LÓGICA: Verificar OUTROS grupos para detectar incompatibilidades REAIS
        for (const [groupName, groupData] of Object.entries(this.contractMappings)) {
            // Pular o grupo atual (já verificado acima)
            if (groupName === contractGroupInfo.name) {
                continue;
            }

            // Verificar contratos e palavras-chave de outros grupos
            for (const [contractType, keywords] of Object.entries(groupData)) {
                // Verificar nome exato do contrato de outro grupo
                const contractLowerExact = contractType.toLowerCase();
                const exactContractRegex = new RegExp(`\\b${contractLowerExact}\\b`, 'i');
                if (exactContractRegex.test(strategyContent)) {
                    detectedContracts.push({
                        contract: contractType,
                        group: groupName, // ⚠️ IMPORTANTE: Grupo DIFERENTE do atual
                        matchType: 'exact_contract',
                        line: strategyLines.find(line => exactContractRegex.test(line)) || 'unknown'
                    });
                    continue;
                }

                // ✅ CORREÇÃO: Verificar palavras-chave exatas de outros grupos SOMENTE se não forem descritores válidos
                for (const exactKeyword of keywords.exact) {
                    // Pular se for uma palavra descritiva válida
                    if (isValidDescriptiveWord(exactKeyword)) {
                        continue;
                    }

                    const exactRegex = new RegExp(`\\b${exactKeyword.toLowerCase()}\\b`, 'i');
                    if (exactRegex.test(strategyContent)) {
                        detectedContracts.push({
                            contract: contractType,
                            group: groupName, // ⚠️ IMPORTANTE: Grupo DIFERENTE do atual
                            keyword: exactKeyword,
                            matchType: 'exact_keyword',
                            line: strategyLines.find(line => exactRegex.test(line)) || 'unknown'
                        });
                        break;
                    }
                }

                // ✅ CORREÇÃO: Verificar palavras-chave parciais SOMENTE se forem incompatíveis REAIS
                // Não incluir palavras descritivas válidas como parciais
                for (const partialKeyword of keywords.partial) {
                    // Pular se for uma palavra descritiva válida
                    if (isValidDescriptiveWord(partialKeyword)) {
                        continue;
                    }

                    // ✅ CORREÇÃO ADICIONAL: Verificar contexto - palavra deve estar isolada ou em contexto de contrato
                    // Evitar falsos positivos com palavras que fazem parte de regras válidas
                    const contextRegex = new RegExp(`\\b(?:entrar|fazer|executar)\\s+${partialKeyword.toLowerCase()}\\b`, 'i');
                    if (contextRegex.test(strategyContent)) {
                        detectedContracts.push({
                            contract: contractType,
                            group: groupName, // ⚠️ IMPORTANTE: Grupo DIFERENTE do atual
                            keyword: partialKeyword,
                            matchType: 'partial_keyword',
                            line: strategyLines.find(line => contextRegex.test(line)) || 'unknown'
                        });
                        break;
                    }
                }
            }
        }

        return detectedContracts;
    }

    // Executar todas as validações
    executeValidations(selectedTradeType, contractGroupInfo, detectedContracts, predictionValue, strategyContent) {
        // ✅ NOVA VALIDAÇÃO PRIORITÁRIA: Verificar se há regras sem sentido de trading
        const nonsenseValidation = this.validateTradingLogic(strategyContent);
        if (!nonsenseValidation.isValid) {
            return nonsenseValidation;
        }

        // 🔧 VALIDAÇÃO PRIORITÁRIA: Verificar se há contratos/palavras-chave de OUTROS grupos (incompatibilidade)
        const contractsFromOtherGroups = detectedContracts.filter(dc => dc.group !== contractGroupInfo.name);

        if (contractsFromOtherGroups.length > 0) {
                
            // Retornar válido mas com aviso (opcional, por enquanto retornamos true puro para não travar UI)
            return { isValid: true };
        }

        // Validação 1: Modo "Ambos" - validações específicas
        if (selectedTradeType === 'BOTH') {
            // Para modo "Ambos", já verificamos incompatibilidades acima
            // Aqui podemos adicionar validações específicas do modo "Ambos" se necessário
        }
        // Validação 2: Tipo trade individual - verificar compatibilidade dentro do mesmo grupo
        else if (selectedTradeType !== 'BOTH') {
            // ✅ CORREÇÃO SOLICITADA: Se houver regras na caixa (estratégia personalizada), 
            // IGNORAR incompatibilidade de tipo trade para permitir execução dinâmica.
            // O sistema agora suporta execução de contratos diferentes via regras.

            // Verificar se há indício de regras (linhas começando com * ou texto estruturado)
            const hasCustomRules = strategyContent.includes('*') || strategyContent.length > 10;

            if (!hasCustomRules) {
                // Apenas validar rigidez se NÃO houver regras personalizadas
                const directConflicts = detectedContracts.filter(dc => {
                    return dc.group === contractGroupInfo.name && dc.contract !== selectedTradeType;
                });

                if (directConflicts.length > 0) {
                    return {
                        isValid: false,
                        type: 'single_contract_mismatch',
                        selectedContract: selectedTradeType,
                        detectedContracts: directConflicts,
                        tradeType: selectedTradeType,
                        fields: ['trade-type-select', 'strategy-text']
                    };
                }
            } else {
                // Log opcional para debug
                // console.log('[VALIDATOR] Regras personalizadas detectadas. Ignorando validação estrita de contrato.');
            }
        }

        // Validação 3: Validar compatibilidade com previsão (apenas para contratos Over/Under)
        if (contractGroupInfo.name === 'Over/Under' && predictionValue !== null) {
            const predictionValidation = this.validatePredictionLogic(detectedContracts, predictionValue);
            if (!predictionValidation.isValid) {
                return predictionValidation;
            }
        }

        return { isValid: true };
    }

    // Validar lógica da previsão
    validatePredictionLogic(detectedContracts, predictionValue) {
        const underMentioned = detectedContracts.some(dc =>
            dc.contract === 'DIGITUNDER' ||
            (dc.keyword && ['under', 'abaixo'].includes(dc.keyword))
        );

        if (underMentioned && predictionValue === 0) {
            return {
                isValid: false,
                type: 'prediction_logic_error',
                issue: 'Under com previsão 0 é logicamente impossível',
                predictionValue: predictionValue,
                fields: ['prediction-input', 'strategy-text']
            };
        }

        const overMentioned = detectedContracts.some(dc =>
            dc.contract === 'DIGITOVER' ||
            (dc.keyword && ['over', 'acima'].includes(dc.keyword))
        );

        if (overMentioned && predictionValue === 9) {
            return {
                isValid: false,
                type: 'prediction_logic_error',
                issue: 'Over com previsão 9 é logicamente impossível',
                predictionValue: predictionValue,
                fields: ['prediction-input', 'strategy-text']
            };
        }

        return { isValid: true };
    }

    // Validar configuração do modo "Ambos" antes de iniciar monitoramento
    validateBothModeBeforeStart() {
        const tradeTypeSelect = document.getElementById('trade-type-select');
        const contractSelect = document.getElementById('contract-select');
        const predictionInput = document.getElementById('prediction-input');

        // Se não é modo "Ambos", sempre válido
        if (!tradeTypeSelect || tradeTypeSelect.value !== 'BOTH') {
            return { isValid: true };
        }

        // Se é modo "Ambos", verificar se há configurações incompatíveis
        const selectedContract = contractSelect?.value;
        const predictionValue = predictionInput?.value;

        // Verificação específica: DIGITUNDER com previsão 0
        if (selectedContract === 'DIGITUNDER' && predictionValue === '0') {
            return {
                isValid: false,
                error: 'Contrato DIGITUNDER selecionado com previsão 0. O último dígito não pode ser menor que 0.',
                field: 'prediction-input',
                contract: 'DIGITUNDER'
            };
        }

        // Verificação específica: DIGITOVER com previsão 9
        if (selectedContract === 'DIGITOVER' && predictionValue === '9') {
            return {
                isValid: false,
                error: 'Contrato DIGITOVER selecionado com previsão 9. O último dígito não pode ser maior que 9.',
                field: 'prediction-input',
                contract: 'DIGITOVER'
            };
        }

        return { isValid: true };
    }

    // Mostrar popup de validação de compatibilidade
    showCompatibilityValidationPopup(validation) {
        // Parar monitoramento se estiver ativo
        if (typeof MonitoringView !== 'undefined' && MonitoringView.stopAll) {
            MonitoringView.stopAll();
        }

        // 🔧 DEBUG: Capturar dados reais dos campos no momento do popup
        const contractSelect = document.getElementById('contract-select');
        const tradeTypeSelect = document.getElementById('trade-type-select');
        const actualContract = contractSelect?.value || 'N/A';
        const actualTradeType = tradeTypeSelect?.value || 'N/A';
        const actualContractText = contractSelect?.selectedOptions[0]?.text || 'N/A';



        let title = '';
        let message = '';
        let fieldsToHighlight = validation.fields || [];

        switch (validation.type) {
            case 'contract_group_mismatch':
                title = '⚠️ Incompatibilidade de Contratos';
                const detectedGroups = [...new Set(validation.detectedContracts.map(dc => dc.group))];

                // 🔧 USAR dados reais dos campos em vez de validation
                message = `
                    <p><strong>Problema:</strong> O contrato configurado é <strong>${actualContractText}</strong> com Tipo Trade <strong>${actualTradeType}</strong>, 
                    mas sua estratégia menciona contratos de outros grupos: <strong>${detectedGroups.join(', ')}</strong>.</p>

                    <p><strong>Contratos detectados incompatíveis:</strong></p>
                    <ul>
                        ${validation.detectedContracts.map(dc =>
                    `<li><strong>${dc.contract}</strong> (${dc.group}) ${dc.keyword ? `- palavra-chave: "${dc.keyword}"` : ''}</li>`
                ).join('')}
                    </ul>

                    <p><strong>Configuração atual:</strong></p>
                    <ul>
                        <li><strong>Contrato selecionado:</strong> ${actualContract} (${actualContractText})</li>
                        <li><strong>Tipo Trade:</strong> ${actualTradeType}</li>
                    </ul>

                    <p><strong>Soluções:</strong></p>
                    <ul>
                        <li>Altere o contrato para um dos grupos mencionados na estratégia</li>
                        <li>Ou modifique a estratégia para usar apenas contratos compatíveis com <strong>${actualContractText}</strong></li>
                    </ul>
                `;
                break;

            case 'single_contract_mismatch':
                title = '⚠️ Incompatibilidade de Tipo Trade';
                message = `
                    <p><strong>Problema:</strong> O Tipo Trade selecionado é <strong>${validation.selectedContract}</strong>, 
                    mas sua estratégia menciona outros contratos.</p>

                    <p><strong>Contratos detectados incompatíveis:</strong></p>
                    <ul>
                        ${validation.detectedContracts.map(dc =>
                    `<li><strong>${dc.contract}</strong> ${dc.keyword ? `- palavra-chave: "${dc.keyword}"` : ''}</li>`
                ).join('')}
                    </ul>

                    <p><strong>Soluções:</strong></p>
                    <ul>
                        <li>Altere o Tipo Trade para "Ambos" se quer usar múltiplos contratos</li>
                        <li>Ou modifique a estratégia para mencionar apenas <strong>${validation.selectedContract}</strong></li>
                    </ul>
                `;
                break;

            case 'prediction_logic_error':
                title = '⚠️ Erro Lógico na Previsão';
                message = `
                    <p><strong>Problema:</strong> ${validation.issue}</p>

                    <p><strong>Detalhes:</strong> Com previsão <strong>${validation.predictionValue}</strong>, 
                    a regra mencionada na estratégia não pode ser atendida.</p>

                    <p><strong>Soluções:</strong></p>
                    <ul>
                        <li>Altere a previsão para um valor compatível com a estratégia</li>
                        <li>Ou modifique a estratégia para ser logicamente compatível com a previsão atual</li>
                    </ul>
                `;
                break;

            case 'nonsense_trading_logic':
                title = '⚠️ Estratégia Inválida';
                message = `
                    <p><strong>Problema:</strong> ${validation.message}</p>

                    <p><strong>Exemplos de conceitos válidos:</strong></p>
                    <ul>
                        <li><strong>Dígitos:</strong> "últimos 3 dígitos", "percentual dos dígitos pares", "padrão dos dígitos"</li>
                        <li><strong>Preços:</strong> "preço subiu", "último tick", "suporte", "resistência"</li>
                        <li><strong>Indicadores:</strong> "RSI > 70", "SMA 20 > SMA 50"</li>
                        <li><strong>Contratos:</strong> "over", "under", "call", "put", "differ", "match"</li>
                    </ul>

                    <p><strong>Soluções:</strong></p>
                    <ul>
                        <li>Use apenas termos relacionados a análise de trading</li>
                        <li>Evite conceitos não relacionados aos mercados financeiros</li>
                        <li>Consulte os exemplos de estratégias no manual de ajuda</li>
                    </ul>
                `;
                break;

            default:
                title = '⚠️ Incompatibilidade Detectada';
                message = '<p>Foi detectada uma incompatibilidade entre a configuração e a estratégia.</p>';
        }

        // Criar e exibir popup
        this.createAndShowPopup(title, message, fieldsToHighlight);
    }

    // Mostrar popup de incompatibilidade do modo "Ambos"
    showBothModeIncompatibilityPopup(validation) {
        // Remover popup existente se houver
        const existingPopup = document.querySelector('.both-mode-incompatibility-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        const popup = document.createElement('div');
        popup.className = 'both-mode-incompatibility-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
            backdrop-filter: blur(5px);
        `;

        popup.innerHTML = `
            <div style="
                background: #0c1318;
                padding: 30px;
                border-radius: 15px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                border: 3px solid #dc3545;
            ">
                <h3 style="color: #dc3545; margin-bottom: 20px; font-size: 1.5em;">
                    ⚠️ Configuração do Modo "Ambos" Incompatível
                </h3>
                <p style="margin-bottom: 20px; line-height: 1.6; color: #e8f0f7; font-size: 1.1em;">
                    <strong>Problema detectado:</strong><br>
                    ${validation.error}
                </p>
                <p style="margin-bottom: 25px; color: #666; font-size: 1em;">
                    Para o modo "Ambos" funcionar corretamente, você precisa:
                    <br><br>
                    • Configure uma previsão válida (0-9) para contratos de dígitos<br>
                    • Ou especifique contratos específicos nas regras de estratégia
                </p>
                <button onclick="RuleCompatibilityValidator.closeBothModeIncompatibilityPopup()" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1.1em;
                    transition: background 0.3s ease;
                    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
                " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">
                    Entendi - Vou Corrigir
                </button>
            </div>
        `;

        // Destacar o campo problemático
        if (validation.field) {
            const problemField = document.getElementById(validation.field);
            if (problemField) {
                problemField.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.6)';
                problemField.style.borderColor = '#dc3545';
            }
        }

        document.body.appendChild(popup);
    }

    // Criar e exibir popup genérico
    createAndShowPopup(title, message, fieldsToHighlight) {
        const popup = document.createElement('div');
        popup.className = 'compatibility-validation-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
            animation: fadeIn 0.3s ease-out;
        `;

        popup.innerHTML = `
            <div style="
                background: #0c1318;
                padding: 30px;
                border-radius: 15px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                text-align: left;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            ">
                <h3 style="color: #e74c3c; margin-bottom: 20px; font-size: 1.5em; text-align: center;">
                    ${title}
                </h3>
                <div style="margin-bottom: 25px; line-height: 1.6; color: #e8f0f7;">
                    ${message}
                </div>
                <div style="text-align: center;">
                    <button onclick="RuleCompatibilityValidator.closePopupAndClearHighlights(this)" style="
                        background: #3498db;
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 1em;
                        margin-right: 10px;
                        transition: background 0.3s ease;
                    " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
                        Entendi
                    </button>
                </div>
            </div>
        `;

        // Adicionar CSS da animação se não existir
        this.addAnimationCSS();

        document.body.appendChild(popup);

        // Destacar campos com problema
        setTimeout(() => {
            this.highlightValidationFields(fieldsToHighlight);
        }, 500);

        // Auto-remover após 30 segundos
        setTimeout(() => {
            if (popup && popup.parentElement) {
                popup.remove();
                this.clearFieldHighlights();
            }
        }, 30000);
    }

    // Destacar campos com problemas
    highlightValidationFields(fieldIds) {
        fieldIds.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.style.boxShadow = '0 0 0 3px rgba(255, 193, 7, 0.6)';
                field.style.border = '2px solid #ffc107';
                field.style.position = 'relative';

                // Adicionar ícone 👈
                const icon = document.createElement('span');
                icon.className = 'validation-pointer-icon';
                icon.innerHTML = '👈';
                icon.style.cssText = `
                    position: absolute;
                    right: -35px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 1.2em;
                    z-index: 1001;
                    animation: pointBounce 1s infinite;
                `;

                // Remover ícone anterior se existir
                const existingIcon = field.parentElement.querySelector('.validation-pointer-icon');
                if (existingIcon) {
                    existingIcon.remove();
                }

                // Adicionar novo ícone
                field.parentElement.style.position = 'relative';
                field.parentElement.appendChild(icon);
            }
        });

        // Adicionar CSS da animação dos ícones
        this.addPointerAnimationCSS();
    }

    // Limpar destaques dos campos
    clearFieldHighlights() {
        const fields = document.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            field.style.boxShadow = '';
            field.style.border = '';
        });

        const icons = document.querySelectorAll('.validation-pointer-icon');
        icons.forEach(icon => icon.remove());
    }

    // Adicionar CSS das animações
    addAnimationCSS() {
        if (!document.querySelector('#compatibility-validation-css')) {
            const style = document.createElement('style');
            style.id = 'compatibility-validation-css';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Adicionar CSS da animação dos ícones
    addPointerAnimationCSS() {
        if (!document.querySelector('#validation-pointer-css')) {
            const style = document.createElement('style');
            style.id = 'validation-pointer-css';
            style.textContent = `
                @keyframes pointBounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(-50%) translateX(0); }
                    40% { transform: translateY(-50%) translateX(-5px); }
                    60% { transform: translateY(-50%) translateX(-3px); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ✅ NOVO: Validar se a estratégia tem lógica de trading válida
    validateTradingLogic(strategyContent) {
        try {
            const content = strategyContent.toLowerCase();

            // Lista de palavras/conceitos relacionados a trading e análise técnica
            const validTradingConcepts = [
                // Conceitos de dígitos e números
                'digitos', 'dígitos', 'ultimo', 'últimos', 'percentual', 'porcentagem',
                'pares', 'impares', 'par', 'impar', 'repetir', 'consecutivos',
                'acima', 'abaixo', 'maior', 'menor', 'igual', 'diferente',
                'padrao', 'padrão', 'sequencia', 'sequência',

                // Conceitos de preço e movimento
                'preco', 'preço', 'tick', 'ticks', 'vela', 'velas', 'candle', 'candles',
                'subir', 'descer', 'subiu', 'desceu', 'alta', 'baixa', 'movimento',
                'pontos', 'ponto', 'pips', 'pip',

                // Indicadores técnicos
                'rsi', 'sma', 'ema', 'media', 'média', 'movel', 'móvel',
                'suporte', 'resistencia', 'resistência', 'nivel', 'nível',
                'barreira', 'limite', 'entrada', 'saida', 'saída',

                // Contratos e operações
                'over', 'under', 'call', 'put', 'differ', 'match', 'even', 'odd',
                'rise', 'fall', 'higher', 'lower', 'touch', 'notouch',
                'runhigh', 'runlow', 'onlyup', 'onlydown', 'asian',

                // Conceitos temporais de trading
                'periodo', 'período', 'tempo', 'duracao', 'duração', 'minuto', 'minutos',
                'segundo', 'segundos', 'hora', 'horas',

                // Números (qualquer número é válido em trading)
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',

                // Operadores matemáticos
                'maior', 'menor', 'igual', 'superior', 'inferior'
            ];

            // Palavras/conceitos que NÃO fazem sentido em trading
            const invalidTradingConcepts = [
                // Objetos do mundo real que não se relacionam com trading
                'carro', 'casa', 'arvore', 'árvore', 'animal', 'cachorro', 'gato',
                'mesa', 'cadeira', 'computador', 'telefone', 'televisao', 'televisão',
                'comida', 'bebida', 'roupa', 'sapato', 'livro', 'filme',
                'pessoa', 'homem', 'mulher', 'crianca', 'criança',

                // Cores (a menos que seja em contexto específico)
                'preto', 'branco', 'azul', 'vermelho', 'verde', 'amarelo',
                'rosa', 'roxo', 'laranja', 'cinza',

                // Conceitos não relacionados a mercados financeiros
                'futebol', 'basquete', 'escola', 'trabalho', 'festa',
                'clima', 'tempo' // ⚠️ 'tempo' pode ser ambíguo, mas em contexto inadequado é inválido
            ];

            // Verificar se há pelo menos UM conceito válido de trading
            const hasValidConcepts = validTradingConcepts.some(concept =>
                content.includes(concept.toLowerCase())
            );

            // Verificar se há conceitos claramente inválidos
            const hasInvalidConcepts = invalidTradingConcepts.some(concept =>
                content.includes(concept.toLowerCase())
            );

            // Verificar padrões básicos de regras válidas
            const hasRulePattern = /\b(entrar|quando|se|percentual|ultimo|digito|preco|rsi|sma)\b/i.test(content);

            // Se há conceitos inválidos OU não há conceitos válidos E não tem padrão de regra
            if (hasInvalidConcepts || (!hasValidConcepts && !hasRulePattern)) {
                return {
                    isValid: false,
                    type: 'nonsense_trading_logic',
                    fields: ['strategy-text'],
                    message: hasInvalidConcepts ?
                        'A estratégia contém conceitos que não se relacionam com análise de trading. Use apenas termos relacionados a preços, dígitos, indicadores técnicos ou contratos.' :
                        'A estratégia não contém termos reconhecíveis de análise de trading. Verifique se está usando conceitos válidos como dígitos, preços, indicadores ou contratos.'
                };
            }

            return { isValid: true };

        } catch (error) {
            console.error('❌ [TRADING LOGIC] Erro na validação:', error);
            // Em caso de erro, permitir (não bloquear por erro de validação)
            return { isValid: true };
        }
    }

    // Limpar cache de validação
    clearCache() {
        this.validationCache.clear();
    }

    // Métodos estáticos para compatibilidade com chamadas existentes
    static closePopupAndClearHighlights(button) {
        button.closest('.compatibility-validation-popup').remove();
        getInstance().clearFieldHighlights();
    }

    static closeBothModeIncompatibilityPopup() {
        const popup = document.querySelector('.both-mode-incompatibility-popup, .startup-compatibility-popup');
        if (popup) {
            popup.style.opacity = '0';
            popup.style.transform = 'scale(0.9)';
            setTimeout(() => {
                popup.remove();
            }, 300);
        }
        getInstance().clearFieldHighlights();
    }

    // ✅ NOVO: Modal informativo na inicialização sobre compatibilidade de arquivos
    static showStartupCompatibilityInfo() {
        // Remover popup existente se houver
        const existingPopup = document.querySelector('.startup-compatibility-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        const popup = document.createElement('div');
        popup.className = 'startup-compatibility-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20000;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            backdrop-filter: blur(8px);
            animation: fadeIn 0.4s ease-out;
        `;

        popup.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #0f171e 0%, #1a242d 100%);
                padding: 40px;
                border-radius: 20px;
                max-width: 550px;
                width: 90%;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
                position: relative;
                overflow: hidden;
            ">
                <!-- Efeito de brilho no topo -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #00c6ff 0%, #0072ff 100%);
                "></div>

                <div style="font-size: 50px; margin-bottom: 20px;">📢</div>

                <h3 style="color: #fff; margin-bottom: 20px; font-size: 1.6em; font-weight: 700; letter-spacing: -0.5px;">
                    Atenção aos Seus Arquivos Salvos
                </h3>

                <p style="margin-bottom: 30px; line-height: 1.7; color: #b0bec5; font-size: 1.15em;">
                    Caso seu arquivo salvo que antes funcionava e agora não está funcionando mais, pode ser devido às <strong>atualizações do sistema</strong>.
                </p>

                <div style="
                    background: rgba(0, 114, 255, 0.1);
                    border: 1px dashed rgba(0, 114, 255, 0.3);
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 35px;
                ">
                    <p style="margin: 0; color: #64b5f6; font-size: 1.05em;">
                        Neste caso, contate o desenvolvedor para a atualização do seu arquivo:
                    </p>
                    <a href="https://wa.me/5524988528918" target="_blank" style="
                        display: inline-block;
                        margin-top: 15px;
                        color: #fff;
                        text-decoration: none;
                        font-weight: 700;
                        font-size: 1.25em;
                        background: #25D366;
                        padding: 10px 20px;
                        border-radius: 50px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(37, 211, 102, 0.4)';" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(37, 211, 102, 0.3)';"
                    >
                        <i class="fab fa-whatsapp"></i> (24) 98852-8918
                    </a>
                </div>

                <button onclick="RuleCompatibilityValidator.closeBothModeIncompatibilityPopup()" style="
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 12px 40px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: 600;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.borderColor='rgba(255, 255, 255, 0.4)';" 
                   onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.borderColor='rgba(255, 255, 255, 0.2)';"
                >
                    Entendi, obrigado!
                </button>
            </div>
        `;

        document.body.appendChild(popup);
    }
}

// Instância singleton
let ruleValidatorInstance = null;

function getInstance() {
    if (!ruleValidatorInstance) {
        ruleValidatorInstance = new RuleCompatibilityValidator();
    }
    return ruleValidatorInstance;
}

// Funções globais para compatibilidade
window.RuleCompatibilityValidator = RuleCompatibilityValidator;
window.getRuleCompatibilityValidatorInstance = getInstance;

// Auto-inicializar ao carregar o arquivo
document.addEventListener('DOMContentLoaded', () => {
    getInstance();
});
