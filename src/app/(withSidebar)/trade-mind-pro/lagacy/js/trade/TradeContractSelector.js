// js/trade/TradeContractSelector.js
// Seletor de contratos para trading
// VERSION: 2.0.1 - FIX: customPrediction validation

class TradeContractSelector {
    constructor() {
        // Mapeamento de grupos de contratos
        this.contractGroups = {
            'Over/Under': ['DIGITOVER', 'DIGITUNDER'],
            'Call/Put': ['CALL', 'PUT'],
            'Higher/Lower': ['CALLE', 'PUTE', 'CALLPUT'],
            'Differ/Match': ['DIGITDIFF', 'DIGITMATCH'],
            'Even/Odd': ['DIGITEVEN', 'DIGITODD'],
            'Touch/No Touch': ['TOUCH', 'NOTOUCH'],
            'Asian Up/Down': ['ASIANU', 'ASIAND'],
            'Reset Call/Put': ['RESETCALL', 'RESETPUT'],
            'Tick High/Low': ['TICKHIGH', 'TICKLOW'],
            'Run High/Low': ['RUNHIGH', 'RUNLOW']
        };

        // Mapeamento de keywords para detecção de contratos
        this.contractMappings = {
            'Over/Under': {
                'DIGITOVER': {
                    exact: ['over'],
                    partial: ['acima']
                },
                'DIGITUNDER': {
                    exact: ['under'],
                    partial: ['abaixo']
                }
            },
            'Call/Put': {
                'CALL': {
                    exact: ['call'],
                    partial: ['subir', 'alta', 'rise', 'up']
                },
                'PUT': {
                    exact: ['put'],
                    partial: ['descer', 'baixa', 'fall', 'down']
                }
            },
            'Higher/Lower': {
                'CALLE': {
                    exact: ['calle', 'higher'],
                    partial: ['call europeu']
                },
                'PUTE': {
                    exact: ['pute', 'lower'],
                    partial: ['put europeu']
                }
            },
            'Differ/Match': {
                'DIGITDIFF': {
                    exact: ['differ'],
                    partial: ['diferente', 'diff']
                },
                'DIGITMATCH': {
                    exact: ['match'],
                    partial: ['igual']
                }
            },
            'Even/Odd': {
                'DIGITEVEN': {
                    exact: ['even'],
                    partial: ['par']
                },
                'DIGITODD': {
                    exact: ['odd'],
                    partial: ['ímpar', 'impar']
                }
            }
        };


    }

    // ✅ Detectar se modo "Ambos" está ativo
    isBothModeActive() {
        const tradeTypeSelect = document.getElementById('trade-type-select');
        const selectedValue = tradeTypeSelect?.value;
        const isActive = selectedValue === 'BOTH';

        logConfig.debug('trade_selector', `🔍 Modo Ambos ativo: ${isActive} (valor: ${selectedValue})`);
        return isActive;
    }

    // 🎯 Obter o contrato correto para execução
    getSelectedContractType() {
        const tradeTypeSelect = document.getElementById('trade-type-select');
        const selectedValue = tradeTypeSelect?.value;

        logConfig.info('trade_selector', `🎯 Tipo Trade selecionado: ${selectedValue}`);

        if (selectedValue === 'BOTH') {
            return null; // Será processado pela lógica do modo Ambos
        }

        if (selectedValue && selectedValue !== 'BOTH') {
            logConfig.info('trade_selector', `🎯 Retornando contrato específico: ${selectedValue}`);
            return selectedValue;
        }

        // Fallback: usar contractType da configuração (não recomendado)
        const contractSelect = document.getElementById('contract-select');
        const contractType = contractSelect?.value;
        logConfig.warn('trade_selector', `⚠️ Fallback para contract-select: ${contractType}`);
        return contractType;
    }

    // ✅ Obter contratos do grupo selecionado para modo "Ambos"
    getBothContracts() {
        const contractSelect = document.getElementById('contract-select');
        if (!contractSelect?.value) {
            return null;
        }

        // Obter grupo do data-group se disponível
        const selectedOption = contractSelect.options[contractSelect.selectedIndex];
        const groupName = selectedOption?.getAttribute('data-group');

        if (groupName && this.contractGroups[groupName]) {
            const contracts = this.contractGroups[groupName];

            // 🔧 CORREÇÃO CRÍTICA: Para Higher/Lower, retornar apenas CALLE e PUTE (excluir CALLPUT)
            if (groupName === 'Higher/Lower') {
                const realContracts = contracts.filter(c => c !== 'CALLPUT');
                logConfig.info('trade_selector', `✅ [BOTH] Higher/Lower detectado - retornando contratos reais: ${realContracts.join(', ')}`);
                return {
                    groupName: groupName,
                    contracts: realContracts
                };
            }

            // Para outros grupos, filtrar contra availableContracts se disponível
            const configView = window.ConfigurationsView;
            if (configView && configView.availableContracts) {
                const filteredContracts = contracts.filter(c => {
                    return configView.availableContracts.some(ac => ac.contract_type === c);
                });

                logConfig.info('trade_selector', `✅ [BOTH] ${groupName} - contratos filtrados: ${filteredContracts.join(', ')}`);

                return {
                    groupName: groupName,
                    contracts: filteredContracts
                };
            } else {
                // Se ConfigurationsView não está disponível, retornar todos os contratos do grupo
                logConfig.warn('trade_selector', `⚠️ [BOTH] ConfigurationsView não disponível, retornando todos os contratos do grupo ${groupName}`);

                return {
                    groupName: groupName,
                    contracts: contracts
                };
            }
        }

        // Fallback: buscar pelo contrato selecionado
        const selectedContract = contractSelect.value;
        for (const [groupName, contracts] of Object.entries(this.contractGroups)) {
            if (contracts.includes(selectedContract)) {

                // 🔧 CORREÇÃO CRÍTICA: Para Higher/Lower, retornar apenas CALLE e PUTE
                if (groupName === 'Higher/Lower') {
                    const realContracts = contracts.filter(c => c !== 'CALLPUT');
                    logConfig.info('trade_selector', `✅ [BOTH FALLBACK] Higher/Lower detectado - retornando contratos reais: ${realContracts.join(', ')}`);
                    return {
                        groupName: groupName,
                        contracts: realContracts
                    };
                }

                const configView = window.ConfigurationsView;
                if (configView && configView.availableContracts) {
                    const filteredContracts = contracts.filter(c => {
                        return configView.availableContracts.some(ac => ac.contract_type === c);
                    });

                    logConfig.info('trade_selector', `✅ [BOTH FALLBACK] ${groupName} - contratos filtrados: ${filteredContracts.join(', ')}`);

                    return {
                        groupName: groupName,
                        contracts: filteredContracts
                    };
                } else {
                    // Se ConfigurationsView não está disponível, retornar todos os contratos do grupo
                    logConfig.warn('trade_selector', `⚠️ [BOTH FALLBACK] ConfigurationsView não disponível, retornando todos os contratos do grupo ${groupName}`);

                    return {
                        groupName: groupName,
                        contracts: contracts
                    };
                }
            }
        }

        return null;
    }

    // ✅ Determinar quais contratos executar no modo "Ambos"
    determineContractsForBothMode(bothContracts, satisfiedGroupId = null, config, translatedRules = null, capturedPredictions = null) {

        const tradeTypeSelect = document.getElementById('trade-type-select');
        const selectedTradeType = tradeTypeSelect?.value;


        logConfig.info('trade_selector', `🎯 [BOTH MODE] Determinando contratos:`);
        logConfig.info('trade_selector', `  - selectedTradeType: ${selectedTradeType}`);
        logConfig.info('trade_selector', `  - groupName: ${bothContracts.groupName}`);
        logConfig.info('trade_selector', `  - contracts: ${bothContracts.contracts.join(', ')}`);
        logConfig.info('trade_selector', `  - satisfiedGroupId: ${satisfiedGroupId}`);
        logConfig.info('trade_selector', `  - translatedRules: ${translatedRules ? 'Disponível' : 'Não disponível'}`);

        // Se um contrato específico foi selecionado (não "BOTH")
        // Se um contrato específico foi selecionado (não "BOTH")
        if (selectedTradeType && selectedTradeType !== 'BOTH') {
            logConfig.info('trade_selector', `🎯 Contrato específico selecionado: ${selectedTradeType}`);

            if (bothContracts.contracts.includes(selectedTradeType)) {
                const validation = this.validateSingleContract(selectedTradeType, config);
                if (validation.isValid) {
                    logConfig.info('trade_selector', `✅ Executando contrato específico: ${selectedTradeType}`);
                    return [selectedTradeType];
                } else {
                    console.error(`❌ [SELECTOR - MODO AMBOS] Contrato ${selectedTradeType} inválido: ${validation.error}`);
                    return [];
                }
            } else {
                console.error(`❌ [SELECTOR - MODO AMBOS] Contrato ${selectedTradeType} não disponível no grupo`);
                console.error(`❌ [SELECTOR - MODO AMBOS] Contratos disponíveis:`, bothContracts.contracts);
                return [];
            }
        }

        // 🎯 NOVO: PRIORIDADE ZERO - Usar previsões capturadas pelas regras (Mixed Strategies)
        // Se as regras já determinaram o tipo de contrato específico (ex: via predictionAction "odd")
        if (capturedPredictions && Array.isArray(capturedPredictions) && capturedPredictions.length > 0) {
            logConfig.info('trade_selector', `🎯 [DYNAMIC OVERRIDE] Recebido capturedPredictions: ${JSON.stringify(capturedPredictions)}`);
            const specificContracts = capturedPredictions
                .filter(p => p.contractType !== null)
                .map(p => p.contractType);

            if (specificContracts.length > 0) {
                // 🚀 FIX: Remover o filtro contra bothContracts.contracts para permitir "Mixed Strategies"
                // (Ex: O usuário selecionou "Differ" mas a regra diz para entrar em "Odd")
                logConfig.info('trade_selector', `🎯 [DYNAMIC OVERRIDE] Usando contratos das regras: ${specificContracts.join(', ')}`);
                return specificContracts;
            }
        }


        // Verificar estratégia
        const strategyText = document.getElementById('strategy-text');

        if (!strategyText?.value?.trim()) {

            const configuredContracts = this.filterContractsWithValidConfiguration(bothContracts.contracts, config);

            if (configuredContracts.length > 0) {
                return configuredContracts;
            } else {
                console.warn(`⚠️ [SELECTOR - MODO AMBOS] Nenhum contrato com configuração válida`);
                return bothContracts.contracts;
            }
        }

        const strategyContent = strategyText.value.toLowerCase();

        // Se um grupo específico foi satisfeito, tentar detectar contrato específico
        if (satisfiedGroupId !== null) {

            // Dividir a estratégia em linhas (cada linha com * é uma regra separada)
            const strategyLines = strategyContent.split('*')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            // 🎯 PASSO 1: Mapear grupo satisfeito → linha específica
            let targetLine = null;

            // Estratégia simples: Se número de grupos = número de linhas, mapear diretamente
            if (translatedRules && translatedRules.groups && translatedRules.groups.length === strategyLines.length) {
                const lineIndex = satisfiedGroupId - 1; // Grupo 1 = índice 0
                if (lineIndex >= 0 && lineIndex < strategyLines.length) {
                    targetLine = strategyLines[lineIndex];
                    logConfig.info('trade_selector', `✅ [GROUP MAPPING] Grupo ${satisfiedGroupId} mapeado para linha: "${targetLine}"`);
                }
            }

            if (!targetLine) {
                logConfig.warn('trade_selector', `⚠️ Não foi possível mapear grupo ${satisfiedGroupId} para linha específica`);
                // Fallback: analisar todas as linhas
                targetLine = strategyLines.join(' ');
            }

            // 🎯 PASSO 2: Detectar TODOS os contratos mencionados NESSA linha específica
            const contractsWithPredictions = [];

            // 🎯 REGEX AVANÇADA: Detectar contratos com previsões (ex: "over 2", "under 7")
            const contractWithPredictionRegex = /(over|under|match|differ)\s+(\d+)/gi;
            contractWithPredictionRegex.lastIndex = 0;

            const matches = [];
            let match;
            while ((match = contractWithPredictionRegex.exec(targetLine)) !== null) {
                matches.push(match);
                if (matches.length > 10) break; // Evitar loop infinito
            }

            // Processar cada match encontrado
            matches.forEach((match, idx) => {
                const contractWord = match[1].toLowerCase();
                const prediction = parseInt(match[2]);


                let contractType = null;
                if (contractWord === 'over' && bothContracts.contracts.includes('DIGITOVER')) {
                    contractType = 'DIGITOVER';
                } else if (contractWord === 'under' && bothContracts.contracts.includes('DIGITUNDER')) {
                    contractType = 'DIGITUNDER';
                } else if (contractWord === 'match' && bothContracts.contracts.includes('DIGITMATCH')) {
                    contractType = 'DIGITMATCH';
                } else if (contractWord === 'differ' && bothContracts.contracts.includes('DIGITDIFF')) {
                    contractType = 'DIGITDIFF';
                }

                if (contractType) {
                    contractsWithPredictions.push({
                        type: contractType,
                        prediction: prediction
                    });

                }
            });

            // 🎯 PASSO 3: Decidir qual(is) contrato(s) executar baseado na linha específica
            if (contractsWithPredictions.length >= 2) {


                const validContracts = [];
                for (const contractInfo of contractsWithPredictions) {


                    // ✅ USAR PREVISÃO ESPECÍFICA DO CONTRATO
                    const validation = this.validateSingleContract(contractInfo.type, config, contractInfo.prediction);
                    if (validation.isValid) {
                        validContracts.push(contractInfo.type);

                    } else {
                        console.warn(`⚠️ [VALIDATION] ${contractInfo.type} (previsão: ${contractInfo.prediction}) inválido: ${validation.error}`);
                    }
                }

                if (validContracts.length > 0) {

                    return validContracts;
                }
            } else if (contractsWithPredictions.length === 1) {
                // ÚNICO contrato na linha → executar apenas esse
                const contractInfo = contractsWithPredictions[0];
                logConfig.info('trade_selector', `✅ [SINGLE CONTRACT] Grupo ${satisfiedGroupId} especifica: ${contractInfo.type} (previsão: ${contractInfo.prediction})`);

                // ✅ USAR PREVISÃO ESPECÍFICA DO CONTRATO
                const validation = this.validateSingleContract(contractInfo.type, config, contractInfo.prediction);
                if (validation.isValid) {
                    return [contractInfo.type];
                } else {
                    console.warn(`⚠️ [VALIDATION] ${contractInfo.type} (previsão: ${contractInfo.prediction}) inválido: ${validation.error}`);
                }
            }

            // 🎯 PASSO 4: PRIORIDADE MÁXIMA - Detectar contratos específicos por linha do grupo
            logConfig.info('trade_selector', `🔍 [DETECÇÃO ESPECÍFICA] Analisando linha do grupo ${satisfiedGroupId}...`);

            // 📝 Obter a linha específica do grupo satisfeito - CORREÇÃO: usar targetLine já processada
            const lineContent = targetLine.toLowerCase();

            logConfig.info('trade_selector', `📋 [GRUPO ${satisfiedGroupId}] Analisando linha: "${lineContent}"`);

            // 🎯 DETECÇÃO ESPECÍFICA POR GRUPO - COM PRIORIDADE ABSOLUTA
            if (bothContracts.groupName === 'Even/Odd') {
                // 🔧 CRÍTICO: Detectar par/ímpar com precisão absoluta
                const hasParWord = /\bpar\b/i.test(lineContent) && !(/\bimpar\b|\bímpar\b/i.test(lineContent));
                const hasImparWord = (/\bimpar\b|\bímpar\b/i.test(lineContent)) && !(/\bpar\b/i.test(lineContent));

                if (hasParWord) {
                    const validation = this.validateSingleContract('DIGITEVEN', config);
                    if (validation.isValid) {
                        logConfig.info('trade_selector', `✅ [ESPECÍFICO PAR] Grupo ${satisfiedGroupId} → DIGITEVEN (detectado "par" exclusivo)`);
                        return ['DIGITEVEN'];
                    }
                } else if (hasImparWord) {
                    const validation = this.validateSingleContract('DIGITODD', config);
                    if (validation.isValid) {
                        logConfig.info('trade_selector', `✅ [ESPECÍFICO ÍMPAR] Grupo ${satisfiedGroupId} → DIGITODD (detectado "ímpar" exclusivo)`);
                        return ['DIGITODD'];
                    }
                }

                // 🔧 NOVO: Se linha contém BOTH par e ímpar, verificar contexto mais específico
                if (/\bpar\b/i.test(lineContent) && (/\bimpar\b|\bímpar\b/i.test(lineContent))) {
                    logConfig.warn('trade_selector', `⚠️ [AMBÍGUO] Linha contém AMBAS as palavras par/ímpar - analisando contexto...`);

                    // Procurar por "entrar par" ou "entrar ímpar" mais específico
                    if (/entrar\s+par\b/i.test(lineContent)) {
                        const validation = this.validateSingleContract('DIGITEVEN', config);
                        if (validation.isValid) {
                            logConfig.info('trade_selector', `✅ [CONTEXTO PAR] Grupo ${satisfiedGroupId} → DIGITEVEN (contexto "entrar par")`);
                            return ['DIGITEVEN'];
                        }
                    } else if (/entrar\s+(impar|ímpar)\b/i.test(lineContent)) {
                        const validation = this.validateSingleContract('DIGITODD', config);
                        if (validation.isValid) {
                            logConfig.info('trade_selector', `✅ [CONTEXTO ÍMPAR] Grupo ${satisfiedGroupId} → DIGITODD (contexto "entrar ímpar")`);
                            return ['DIGITODD'];
                        }
                    }
                }

            } else if (bothContracts.groupName === 'Over/Under') {
                // Para Over/Under, detectar baseado na palavra-chave da linha específica
                const hasOverWord = /\bover\b/i.test(lineContent) && !(/\bunder\b/i.test(lineContent));
                const hasUnderWord = /\bunder\b/i.test(lineContent) && !(/\bover\b/i.test(lineContent));

                if (hasOverWord) {
                    const validation = this.validateSingleContract('DIGITOVER', config);
                    if (validation.isValid) {
                        logConfig.info('trade_selector', `✅ [ESPECÍFICO OVER] Grupo ${satisfiedGroupId} → DIGITOVER`);
                        return ['DIGITOVER'];
                    }
                } else if (hasUnderWord) {
                    const validation = this.validateSingleContract('DIGITUNDER', config);
                    if (validation.isValid) {
                        logConfig.info('trade_selector', `✅ [ESPECÍFICO UNDER] Grupo ${satisfiedGroupId} → DIGITUNDER`);
                        return ['DIGITUNDER'];
                    }
                }

            } else if (bothContracts.groupName === 'Differ/Match') {
                const hasMatchWord = /\bmatch\b/i.test(lineContent) && !(/\bdiffer\b/i.test(lineContent));
                const hasDifferWord = /\bdiffer\b/i.test(lineContent) && !(/\bmatch\b/i.test(lineContent));

                if (hasMatchWord) {
                    const validation = this.validateSingleContract('DIGITMATCH', config);
                    if (validation.isValid) {
                        logConfig.info('trade_selector', `✅ [ESPECÍFICO MATCH] Grupo ${satisfiedGroupId} → DIGITMATCH`);
                        return ['DIGITMATCH'];
                    }
                } else if (hasDifferWord) {
                    const validation = this.validateSingleContract('DIGITDIFF', config);
                    if (validation.isValid) {
                        logConfig.info('trade_selector', `✅ [ESPECÍFICO DIFFER] Grupo ${satisfiedGroupId} → DIGITDIFF`);
                        return ['DIGITDIFF'];
                    }
                }
            }

            // 🎯 FALLBACK: Buscar por keywords simples (sem previsão numérica)
            logConfig.info('trade_selector', `⚠️ Detecção específica não funcionou - tentando keywords gerais...`);

            const contractKeywords = {
                'DIGITOVER': ['over', 'acima'],
                'DIGITUNDER': ['under', 'abaixo'],
                'DIGITMATCH': ['match', 'igual', 'iguais'],
                'DIGITDIFF': ['differ', 'diferente', 'diferentes', 'diff'],
                'DIGITODD': ['odd', 'ímpar', 'impar'],
                'DIGITEVEN': ['even', 'par'],
                'CALL': ['call', 'rise', 'sobe', 'subir'],
                'PUT': ['put', 'fall', 'desce', 'descer', 'cai', 'cair']
            };

            const detectedContracts = [];
            for (const [contractType, keywords] of Object.entries(contractKeywords)) {
                for (const keyword of keywords) {
                    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                    if (regex.test(targetLine)) {
                        // 🚀 FIX: Remover filtro contra bothContracts.contracts para permitir overrides dinâmicos
                        if (!detectedContracts.includes(contractType)) {
                            detectedContracts.push(contractType);
                            logConfig.info('trade_selector', `✅ [KEYWORD] ${contractType} via "${keyword}"`);
                        }
                    }
                }
            }

            if (detectedContracts.length >= 2) {
                // Múltiplos contratos por keywords → validar e executar
                logConfig.info('trade_selector', `🎯 [KEYWORDS] ${detectedContracts.length} contratos detectados`);

                const validContracts = [];
                for (const contract of detectedContracts) {
                    const validation = this.validateSingleContract(contract, config);
                    if (validation.isValid) {
                        validContracts.push(contract);
                        logConfig.info('trade_selector', `✅ Contrato ${contract} validado com sucesso`);
                    } else {
                        console.warn(`⚠️ [KEYWORDS] Contrato ${contract} inválido: ${validation.error}`);
                    }
                }

                if (validContracts.length > 0) {
                    logConfig.info('trade_selector', `🎯 EXECUTANDO ${validContracts.length} CONTRATOS VIA KEYWORDS: ${validContracts.join(', ')}`);
                    return validContracts;
                }
            } else if (detectedContracts.length === 1) {
                // Único contrato por keyword → validar e executar
                const contract = detectedContracts[0];
                logConfig.info('trade_selector', `✅ [SINGLE KEYWORD] ${contract} detectado`);

                const validation = this.validateSingleContract(contract, config);
                if (validation.isValid) {
                    return [contract];
                } else {
                    console.warn(`⚠️ [KEYWORDS] Contrato ${contract} inválido: ${validation.error}`);
                }
            }

            // 🎯 CORRIGIDO: Se chegou até aqui sem detectar contrato específico via keywords,
            // significa que a regra não especifica qual lado executar
            // SOLUÇÃO: Executar AMBOS os contratos do grupo (comportamento BOTH padrão)

            logConfig.info('trade_selector', `🔄 [BOTH MODE] Grupo ${satisfiedGroupId} (${bothContracts.groupName}) satisfeito mas sem keyword específica`);
            logConfig.info('trade_selector', `🔄 [BOTH MODE] Executando AMBOS os contratos do grupo como fallback`);
            const configuredContracts = this.filterContractsWithValidConfiguration(bothContracts.contracts, config);

            if (configuredContracts.length > 0) {
                logConfig.info('trade_selector', `✅ EXECUTANDO ${configuredContracts.length} CONTRATOS: ${configuredContracts.join(', ')}`);
                return configuredContracts;
            } else {
                logConfig.warn('trade_selector', `⚠️ Nenhum contrato válido encontrado`);
                return [];
            }
        }

        const hasSpecificSides = this.analyzeGroupsForSpecificSides(strategyContent, bothContracts);

        if (hasSpecificSides.hasDifferentSides) {
            logConfig.warn('trade_selector', `⚠️ Grupos especificam lados diferentes mas nenhum foi satisfeito`);
            console.warn('⚠️ [SELECTOR - MODO AMBOS] Lados diferentes detectados, retornando vazio');
            return [];
        }

        // Executar ambos os contratos (modo normal sem grupo satisfeito)

        logConfig.info('trade_selector', `🔄 Modo padrão - NÃO especificou contrato, executando AMBOS`);
        const configuredContractsDefault = this.filterContractsWithValidConfiguration(bothContracts.contracts, config);

        if (configuredContractsDefault.length > 0) {
            logConfig.info('trade_selector', `✅ EXECUTANDO ${configuredContractsDefault.length} TRADES SIMULTÂNEOS: ${configuredContractsDefault.join(', ')}`);

            return configuredContractsDefault;
        } else {

            return bothContracts.contracts;
        }
    }

    // 🔍 Detectar contrato do grupo satisfeito
    detectContractFromSatisfiedGroup(strategyContent, bothContracts, satisfiedGroupId) {
        try {

            logConfig.info('trade_selector', `🔍 [DETECTAR CONTRATO] ====================================`);
            logConfig.info('trade_selector', `🔍 [DETECTAR CONTRATO] Grupo satisfeito: ${satisfiedGroupId}`);
            logConfig.info('trade_selector', `🔍 [DETECTAR CONTRATO] Texto recebido: "${strategyContent}"`);
            logConfig.info('trade_selector', `🔍 [DETECTAR CONTRATO] Grupo de contratos: ${bothContracts.groupName}`);
            logConfig.info('trade_selector', `🔍 [DETECTAR CONTRATO] Contratos disponíveis: ${bothContracts.contracts.join(', ')}`);

            // Encontrar TODAS as linhas da estratégia para análise completa
            const lines = strategyContent.split('\n').map(line => line.trim()).filter(line => line);
            let relevantLines = [];

            // ✅ CORREÇÃO: NÃO procurar pela palavra "entrar" - usar todas as linhas
            relevantLines = lines;

            logConfig.info('trade_selector', `📝 [DETECTAR CONTRATO] Usando todas as ${relevantLines.length} linha(s) para análise`);

            const groupMapping = this.contractMappings[bothContracts.groupName];

            if (!groupMapping) {
                logConfig.warn('trade_selector', `⚠️ Sem mapeamento para grupo: ${bothContracts.groupName}`);
                return null;
            }

            const enhancedMapping = {
                ...groupMapping,
                // Differ/Match - apenas nomes de contrato
                'DIGITDIFF': {
                    exact: ['differ', 'diff', 'diferente'],
                    partial: ['differ', 'diff']
                },
                'DIGITMATCH': {
                    exact: ['match', 'combina'],
                    partial: ['match']
                },
                // Over/Under - APENAS "over"/"under", NÃO usar operadores de comparação como "maior"/"menor"
                'DIGITOVER': {
                    exact: ['\\bover\\b', '\\bacima\\b'],
                    partial: ['over', 'acima']
                },
                'DIGITUNDER': {
                    exact: ['\\bunder\\b', '\\babaixo\\b'],
                    partial: ['under', 'abaixo']
                },
                // Even/Odd
                'DIGITEVEN': {
                    exact: ['\\beven\\b', '\\bpar\\b'],
                    partial: ['even', 'par']
                },
                'DIGITODD': {
                    exact: ['\\bodd\\b', '\\bimpar\\b', '\\bímpar\\b'],
                    partial: ['odd', 'impar', 'ímpar']
                },
                // Call/Put
                'CALL': {
                    exact: ['\\bcall\\b', '\\bhigher\\b', '\\bsubir\\b'],
                    partial: ['call', 'higher', 'subir']
                },
                'PUT': {
                    exact: ['\\bput\\b', '\\blower\\b', '\\bdescer\\b'],
                    partial: ['put', 'lower', 'descer']
                }
            };

            logConfig.info('trade_selector', `🔍 Procurando contratos em: ${Object.keys(enhancedMapping).join(', ')}`);

            for (const line of relevantLines) {

                for (const [contractType, keywords] of Object.entries(enhancedMapping)) {
                    if (!bothContracts.contracts.includes(contractType)) {
                        continue;
                    }

                    // Verificar palavras EXATAS primeiro
                    if (keywords.exact) {
                        for (const exactKeyword of keywords.exact) {
                            const exactRegex = new RegExp(`\\b${exactKeyword}\\b`, 'i');
                            const matched = exactRegex.test(line);

                            if (matched) {

                                logConfig.info('trade_selector', `✅ Detectado ${contractType} (exact: "${exactKeyword}" em "${line}")`);
                                return contractType;
                            }
                        }
                    }
                }
            }


            logConfig.debug('trade_selector', `🔍 Tentando correspondências parciais...`);

            for (const line of relevantLines) {

                for (const [contractType, keywords] of Object.entries(enhancedMapping)) {
                    if (!bothContracts.contracts.includes(contractType)) continue;

                    if (keywords.partial) {
                        for (const partialKeyword of keywords.partial) {
                            const matched = line.includes(partialKeyword.toLowerCase());

                            if (matched) {

                                logConfig.info('trade_selector', `✅ Detectado ${contractType} (partial: "${partialKeyword}" em "${line}")`);
                                return contractType;
                            }
                        }
                    }
                }
            }

            logConfig.warn('trade_selector', `⚠️ Nenhum contrato detectado para grupo ${satisfiedGroupId}`);
            return null;
        } catch (error) {
            console.error('❌ Erro ao detectar contrato:', error);
            return null;
        }
    }

    // 🔍 Detectar contrato da linha do grupo (fallback)
    detectContractFromGroupLine(strategyContent, bothContracts, satisfiedGroupId) {
        return this.detectContractFromSatisfiedGroup(strategyContent, bothContracts, satisfiedGroupId);
    }

    // 🔍 Analisar a regra da estratégia em busca de comparações específicas
    analyzeRuleComparison(strategyContent) {
        const comparisonRegex = /(?:>|<|=|>=|<=|diferente de|igual a)\s*(\d+(\.\d+)?)/i;
        const lines = strategyContent.split('\n').map(line => line.trim()).filter(line => line);

        for (const line of lines) {
            const match = line.match(comparisonRegex);
            if (match) {
                const operator = match[0].split(/\s+/)[0]; // Extrai o operador (>, <, =, etc.)
                const value = parseFloat(match[1]);

                logConfig.info('trade_selector', `🔍 Comparação encontrada: ${operator} ${value}`);
                return { hasSpecificComparison: true, type: operator, value: value };
            }
        }

        return { hasSpecificComparison: false };
    }

    // 🎯 Mapear comparação para contrato apropriado
    mapComparisonToContract(comparison, bothContracts) {
        const { type, value } = comparison;
        const { contracts, groupName } = bothContracts;

        if (groupName === 'Over/Under') {
            if (type === '>' || type === '>=' || type === 'maior' || type === 'superior') {
                if (contracts.includes('DIGITOVER')) return 'DIGITOVER';
            } else if (type === '<' || type === '<=' || type === 'menor' || type === 'inferior') {
                if (contracts.includes('DIGITUNDER')) return 'DIGITUNDER';
            }
        } else if (groupName === 'Call/Put') {
            // Lógica para Call/Put baseada em comparação numérica pode ser mais complexa
            // e geralmente depende de outros fatores. Por enquanto, não mapeia diretamente.
        } else if (groupName === 'Differ/Match') {
            if (type === '=' || type === 'igual a' || type === 'match') {
                if (contracts.includes('DIGITMATCH')) return 'DIGITMATCH';
            } else if (type === '!=' || type === 'diferente de' || type === 'differ') {
                if (contracts.includes('DIGITDIFF')) return 'DIGITDIFF';
            }
        } else if (groupName === 'Even/Odd') {
            // Lógica para Even/Odd baseada em comparação numérica não é direta.
        }

        logConfig.warn('trade_selector', `⚠️ Não foi possível mapear comparação "${type}" para contrato no grupo ${groupName}`);
        return null;
    }

    // ✅ Filtrar contratos com configuração válida
    filterContractsWithValidConfiguration(contracts, config) {
        const validContracts = [];

        for (const contractType of contracts) {
            const validation = this.validateSingleContract(contractType, config);
            if (validation.isValid) {
                validContracts.push(contractType);
            } else {
                console.warn(`⚠️ ${contractType} inválido: ${validation.error}`);
            }
        }

        return validContracts;
    }

    // 🔍 Validar um contrato individual
    validateSingleContract(contractType, config, customPrediction = null) {
        // 🔍 DEBUG: Log dos parâmetros recebidos

        // Contratos de dígitos requerem previsão
        const digitContracts = ['DIGITOVER', 'DIGITUNDER', 'DIGITDIFF', 'DIGITMATCH'];

        if (digitContracts.includes(contractType)) {
            // Usar previsão customizada se fornecida, senão usar do config
            // ✅ CORRIGIDO: Verificar null E undefined
            const predictionValue = (customPrediction !== null && customPrediction !== undefined)
                ? customPrediction
                : config.prediction?.value;

            if (predictionValue === null || predictionValue === undefined) {
                return {
                    isValid: false,
                    error: 'Previsão não definida para contrato de dígito'
                };
            }

            // ✅ VALIDAÇÃO ESPECÍFICA POR TIPO DE CONTRATO
            if (contractType === 'DIGITUNDER') {
                if (predictionValue === 0) {
                    return {
                        isValid: false,
                        error: 'Impossível: UNDER 0 não é válido. O último dígito não pode ser menor que 0.'
                    };
                }
                if (predictionValue < 0 || predictionValue > 9) {
                    return {
                        isValid: false,
                        error: `UNDER ${predictionValue} inválido. Previsão deve estar entre 1-9.`
                    };
                }
            } else if (contractType === 'DIGITOVER') {
                if (predictionValue === 9) {
                    return {
                        isValid: false,
                        error: 'Impossível: OVER 9 não é válido. O último dígito não pode ser maior que 9.'
                    };
                }
                if (predictionValue < 0 || predictionValue > 9) {
                    return {
                        isValid: false,
                        error: `OVER ${predictionValue} inválido. Previsão deve estar entre 0-8.`
                    };
                }
            } else if (contractType === 'DIGITMATCH' || contractType === 'DIGITDIFF') {
                if (predictionValue < 0 || predictionValue > 9) {
                    return {
                        isValid: false,
                        error: `Previsão ${predictionValue} inválida. Deve estar entre 0-9.`
                    };
                }
            }

            logConfig.debug('trade_selector', `✅ ${contractType} válido - previsão ${predictionValue} OK`);
        }

        // Contratos com barreira (Higher/Lower, Touch, etc.)
        const barrierContracts = ['CALLE', 'PUTE', 'CALL', 'PUT', 'TOUCH', 'NOTOUCH'];

        if (barrierContracts.includes(contractType)) {
            // ✅ CORREÇÃO: Para CALLE/PUTE, verificar config.barrier OU config.prediction.value
            const needsBarrier = contractType === 'CALLE' || contractType === 'PUTE';

            if (needsBarrier) {
                const barrierValue = config.barrier || config.prediction?.value;

                if (!barrierValue) {
                    return {
                        isValid: false,
                        error: `Barreira não definida para ${contractType}. Configure uma barreira com sinal (ex: +0.5 ou -0.3)`
                    };
                }

                console.log(`✅ [VALIDATION] ${contractType} válido - barreira: ${barrierValue}`);
            }
        }

        return { isValid: true };
    }

    // ✅ Calcular resultado de contabilização para trades duplos
    calculateBothTradeCountingResult(successCount, totalContracts) {
        logConfig.info('trade_selector', `🔢 [BOTH COUNTING] Calculando: ${successCount}/${totalContracts} sucessos`);

        if (successCount === 0) {
            // Todos os contratos perderam = 1 PERDA para streaks
            logConfig.info('trade_selector', `💔 [BOTH COUNTING] Todos perderam = LOSS (afeta streak de perdas)`);
            return 'LOSS';
        } else if (successCount === totalContracts) {
            // Todos os contratos ganharam = 1 VITÓRIA para streaks
            logConfig.info('trade_selector', `🎉 [BOTH COUNTING] Todos ganharam = WIN (afeta streak de vitórias)`);
            return 'WIN';
        } else {
            // Resultado misto = NEUTRO (não afeta streaks de ganhos nem perdas)
            logConfig.info('trade_selector', `⚖️ [BOTH COUNTING] Resultado misto = NEUTRO (preserva streaks atuais)`);
            return 'MIXED';
        }
    }

    // 🎯 NOVO: Verificar se regra especifica múltiplos contratos implicitamente
    checkForImplicitMultipleContracts(strategyText, detectedContract, bothContracts) {
        try {
            const strategyLines = strategyText.split('*')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            // Procurar por padrões que indicam múltiplos contratos
            for (const line of strategyLines) {
                // Padrão: "over X e under Y"
                const overUnderPattern = /(over|under)\s+(\d+)\s+e\s+(over|under)\s+(\d+)/gi;
                const overUnderMatch = line.match(overUnderPattern);

                if (overUnderMatch) {
                    logConfig.info('trade_selector', `🎯 [IMPLICIT] Detectado padrão over/under múltiplo: ${overUnderMatch[0]}`);

                    // Extrair ambos os contratos
                    const contracts = [];
                    if (bothContracts.contracts.includes('DIGITOVER')) {
                        contracts.push('DIGITOVER');
                    }
                    if (bothContracts.contracts.includes('DIGITUNDER')) {
                        contracts.push('DIGITUNDER');
                    }

                    if (contracts.length === 2) {
                        return contracts;
                    }
                }

                // Padrão: "match X e differ Y"
                const matchDifferPattern = /(match|differ)\s+(\d+)\s+e\s+(match|differ)\s+(\d+)/gi;
                const matchDifferMatch = line.match(matchDifferPattern);

                if (matchDifferMatch) {
                    logConfig.info('trade_selector', `🎯 [IMPLICIT] Detectado padrão match/differ múltiplo: ${matchDifferMatch[0]}`);

                    const contracts = [];
                    if (bothContracts.contracts.includes('DIGITMATCH')) {
                        contracts.push('DIGITMATCH');
                    }
                    if (bothContracts.contracts.includes('DIGITDIFF')) {
                        contracts.push('DIGITDIFF');
                    }

                    if (contracts.length === 2) {
                        return contracts;
                    }
                }

                // Padrão genérico: "ContractA e ContractB"
                const contractKeywords = {
                    'over': 'DIGITOVER',
                    'under': 'DIGITUNDER',
                    'match': 'DIGITMATCH',
                    'differ': 'DIGITDIFF',
                    'even': 'DIGITEVEN',
                    'odd': 'DIGITODD',
                    'call': 'CALL',
                    'put': 'PUT'
                };

                // Buscar por múltiplas palavras-chave na mesma linha
                const foundKeywords = [];
                for (const [keyword, contractType] of Object.entries(contractKeywords)) {
                    if (line.toLowerCase().includes(keyword) && bothContracts.contracts.includes(contractType)) {
                        foundKeywords.push(contractType);
                    }
                }

                // Se encontrou 2 ou mais contratos diferentes na mesma linha
                if (foundKeywords.length >= 2) {
                    // Remover duplicatas
                    const uniqueContracts = [...new Set(foundKeywords)];
                    if (uniqueContracts.length >= 2) {
                        logConfig.info('trade_selector', `🎯 [IMPLICIT] Detectados múltiplos contratos na linha: ${uniqueContracts.join(', ')}`);
                        return uniqueContracts;
                    }
                }
            }

            // Não encontrou múltiplos implícitos
            return [detectedContract];

        } catch (error) {
            logConfig.error('trade_selector', `❌ [IMPLICIT DETECTION] Erro: ${error.message}`);
            return [detectedContract];
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.TradeContractSelector = TradeContractSelector;
}