class PromptManager {
    constructor() {
        // 🆕 SISTEMA DE TEMPLATES (JSONs PRONTOS)
        // Aqui guardamos os Regex e os JSONs correspondentes

        // Prefixo global opcional para contrato e previsão
        // Captura: $1 = ação (opcional), $2 = previsão (opcional)
        this.contractPrefix = `^\\s*[\\*\\-]?\\s*(?:entrar\\s+)?(?:(over|under|acima|abaixo|superior|inferior|digitover|digitunder|odd|even|par|impar|match|differ|kalles|putes|calle|pute|call|put|rise|fall)(?:\\s+(\\d+(?:\\.\\d+)?))?\\s+)?(?:quando\\s+|se\\s+|caso\\s+|onde\\s+)?(?:[oa]s?|do|da|dos|das|no|na|nos|nas)?(?:\\s+)?`;

        this.templates = [
            {
                id: 'single_digit_position',
                // Regex: "* entrar quando digito #2 = 5" ou "* entrar quando o digito #3 > 7"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:o\\s+)?d[ií]gito?\\s+)?#(\\d+)\\s*([^0-9\\n*]*?)\\s*(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;

                    // Capturar posição do dígito (#2, #3, etc)
                    const digitPosition = parseInt(match[3]);
                    const opText = match[4];
                    const value = parseInt(match[5]);

                    const operator = this._normalizeOperator(opText);
                    const displayOp = operator === '>=' ? '≥' : operator === '<=' ? '≤' : operator;

                    return {
                        "type": "last_digits",
                        "description": `entrar quando digito #${digitPosition} ${operator} ${value}`,
                        "displayFormat": `Dígito #${digitPosition}: X ${displayOp} ${value}`,
                        "startIndex": digitPosition,
                        "endIndex": digitPosition,
                        "parameters": {
                            "type": "last_digits",
                            "startIndex": digitPosition,
                            "endIndex": digitPosition,
                            "operator": operator,
                            "value": value,
                            "contractType": action,
                            "contractPrediction": prediction
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "value": value,
                        "operator": operator,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters_ui": [
                            {
                                "key": "param_position",
                                "label": "Posição do Dígito (#)",
                                "value": digitPosition,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.startIndex",
                                "tooltip": `Posição do dígito no histórico (ex: ${digitPosition} para o ${digitPosition === 1 ? 'último' : digitPosition === 2 ? 'penúltimo' : digitPosition + 'º último'} dígito).`
                            },
                            {
                                "key": "param_value",
                                "label": "Dígito Referência",
                                "value": value,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.value",
                                "tooltip": "O valor que o dígito deve atingir ou superar."
                            }
                        ]
                    };
                }
            },
            {
                id: 'single_digit_parity',
                // Regex: "* entrar quando digito #1 for par" ou "* entrar quando digito #2 é impar"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:o\\s+)?d[ií]gito?\\s+)?#(\\d+)\\s*(?:for|é|e|eh|seja)?\\s*(par(?:es)?|[ií]mpar(?:es)?|even|odd)\\s*(?:\\((?:par|impar|even|odd)\\))?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;

                    // Capturar posição do dígito (#1, #2, etc)
                    const digitPosition = parseInt(match[3]);
                    const parityText = match[4].toLowerCase();

                    // Normalizar par/ímpar para even/odd
                    const parity = (parityText === 'par' || parityText === 'even') ? 'even' : 'odd';
                    const parityDisplay = parity === 'even' ? 'Par' : 'Ímpar';

                    return {
                        "type": "digit_parity",
                        "description": `entrar quando digito #${digitPosition} for ${parityDisplay.toLowerCase()}`,
                        "displayFormat": `Dígito #${digitPosition}: ${parityDisplay}`,
                        "startIndex": digitPosition,
                        "endIndex": digitPosition,
                        "parameters": {
                            "type": "digit_parity",
                            "startIndex": digitPosition,
                            "endIndex": digitPosition,
                            "parity": parity,
                            "contractType": action,
                            "contractPrediction": prediction
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "parity": parity,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters_ui": [
                            {
                                "key": "param_position",
                                "label": "Posição do Dígito (#)",
                                "value": digitPosition,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.startIndex",
                                "tooltip": `Posição do dígito no histórico (ex: ${digitPosition} para o ${digitPosition === 1 ? 'último' : digitPosition === 2 ? 'penúltimo' : digitPosition + 'º último'} dígito).`
                            },
                            {
                                "key": "param_parity",
                                "label": "Paridade",
                                "value": parity,
                                "type": "select",
                                "options": [
                                    { "value": "even", "label": "Par (Even)" },
                                    { "value": "odd", "label": "Ímpar (Odd)" }
                                ],
                                "path": "groups[0].rules[0].parameters.parity",
                                "tooltip": "Se o dígito deve ser par ou ímpar."
                            }
                        ]
                    };
                }
            },
            {
                id: 'last_digits_range',
                // Regex: "* entrar quando os digitos #6#2 > 2" ou "do sexto ao penultimo"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:os\\s+)?d[ií]gitos?\\s+)?(?:#(\\d+)#(\\d+)|(?:do|da)\\s+((?:\\d+|primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|sétimo|oitavo|nono|decimo|décimo))\\s+(?:ao|a|até)\\s+((?:\\d+|primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|sétimo|oitavo|nono|decimo|décimo|penultimo|último|ultimo)))\\s*([^0-9\\n*]*?)\\s*(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;

                    // Capturar índices (#6#2 ou texto)
                    let startIdxNum = match[3] ? parseInt(match[3]) : null;
                    let endIdxNum = match[4] ? parseInt(match[4]) : null;
                    const startText = match[5];
                    const endText = match[6];
                    const opText = match[7];
                    const value = parseInt(match[8]);

                    const ordinalMap = {
                        'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4, 'quinto': 5,
                        'sexto': 6, 'setimo': 7, 'sétimo': 7, 'oitavo': 8, 'nono': 9, 'decimo': 10, 'décimo': 10,
                        'penultimo': 2, 'ultimo': 1, 'último': 1
                    };

                    if (startIdxNum === null && startText) {
                        startIdxNum = !isNaN(parseInt(startText)) ? parseInt(startText) : ordinalMap[startText.toLowerCase()];
                    }
                    if (endIdxNum === null && endText) {
                        endIdxNum = !isNaN(parseInt(endText)) ? parseInt(endText) : ordinalMap[endText.toLowerCase()];
                    }

                    // Fallbacks seguros
                    if (!startIdxNum) startIdxNum = 1;
                    if (!endIdxNum) endIdxNum = 1;

                    const operator = this._normalizeOperator(opText);
                    const displayOp = operator === '>=' ? '≥' : operator === '<=' ? '≤' : operator;

                    return {
                        "type": "last_digits",
                        "description": `entrar quando os digitos #${startIdxNum} ao #${endIdxNum} ${operator} ${value}`,
                        "displayFormat": `Dígitos #${startIdxNum} ao #${endIdxNum}: X ${displayOp} ${value}`,
                        "startIndex": startIdxNum,
                        "endIndex": endIdxNum,
                        "parameters": {
                            "type": "last_digits",
                            "startIndex": startIdxNum,
                            "endIndex": endIdxNum,
                            "operator": operator,
                            "value": value,
                            "contractType": action,
                            "contractPrediction": prediction
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "value": value,
                        "operator": operator,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters_ui": [
                            {
                                "key": "param_start",
                                "label": "Dígito Inicial (#)",
                                "value": startIdxNum,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.startIndex",
                                "tooltip": "Posição inicial do dígito no histórico (ex: 7 para o sétimo último)."
                            },
                            {
                                "key": "param_end",
                                "label": "Dígito Final (#)",
                                "value": endIdxNum,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.endIndex",
                                "tooltip": "Posição final do dígito no histórico (ex: 2 para o segundo último)."
                            },
                            {
                                "key": "param_value",
                                "label": "Dígito Referência",
                                "value": value,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.value",
                                "tooltip": "O valor que os dígitos no intervalo devem atingir ou superar."
                            }
                        ]
                    };
                }
            },
            {
                id: 'isolated_digits',
                // Regex: "* Entrar odd quando o digito acima de 7 >= 5 isolado(s)"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:(over|under|acima|abaixo|superior|inferior|digitover|digitunder|odd|even|par|impar|match|differ|kalles|putes|calle|pute|call|put)(?:\s+(\d+))?)?\s*(?:quando\s+|se\s+)?(?:os?|as?)?\s*d[ií]gito(?:s)?\s*(acima\s+de|maior\s+que|superior\s+a|>|igual\s+a|=|menor\s+que|abaixo\s+de|<|>=|<=)\s*(\d+)\s*(?:>=|>|=)\s*(\d+)\s*isolados?$/i,
                builder: (match) => {
                    const contractType = match[1] ? match[1].toLowerCase() : null;
                    const contractPrediction = match[2] ? parseInt(match[2]) : null;
                    const opText = match[3].toLowerCase();
                    const digitValue = parseInt(match[4]);
                    const countTarget = parseInt(match[5]);

                    let operator = '=';
                    if (opText.includes('igual') || opText === '=') operator = '=';
                    else if (opText.includes('maior') || opText.includes('superior') || opText.includes('acima') || opText.includes('>')) {
                        operator = (opText.includes('igual') || opText.includes('=')) ? '>=' : '>';
                        if (opText.trim() === 'acima de') operator = '>';
                    }
                    else if (opText.includes('menor') || opText.includes('inferior') || opText.includes('abaixo') || opText.includes('<')) {
                        operator = (opText.includes('igual') || opText.includes('=')) ? '<=' : '<';
                    }

                    return {
                        "type": "isolated_digits",
                        "description": `Entrar quando ${countTarget} digitos isolados ${operator} ${digitValue}`,
                        "displayFormat": `🔴 X`,
                        "parameters": {
                            "type": "isolated_digits",
                            "value": digitValue,
                            "operator": operator,
                            "count": countTarget,
                            "contractType": contractType,
                            "contractPrediction": contractPrediction
                        },
                        "status": "waiting",
                        "currentValue": 0,
                        "count": countTarget,
                        "value": digitValue,
                        "operator": operator,
                        "contractType": contractType,
                        "contractPrediction": contractPrediction,
                        "parameters_ui": [
                            {
                                "key": "param_iso_val",
                                "label": "Dígito Referência",
                                "value": digitValue,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.value",
                                "tooltip": "O dígito que o robô vai monitorar para ver se ele está 'isolado'."
                            },
                            {
                                "key": "param_iso_target",
                                "label": "Alvo Isolados",
                                "value": countTarget,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count",
                                "tooltip": "Quantas vezes o dígito deve aparecer de forma isolada antes de entrar."
                            }
                        ]
                    };
                }
            },
            {
                id: 'isolated_digits_simple',
                // Regex: "Entrar over 2 quando 4 digitos isolados > 6"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:(over|under|acima|abaixo|superior|inferior|digitover|digitunder|odd|even|par|impar|match|differ|kalles|putes|calle|pute|call|put)(?:\s+(\d+))?)?\s*(?:quando\s+|se\s+)?(\d+)\s*d[ií]gitos?\s*isolados?\s*([^0-9\n]+)\s*(\d+)\s*$/i,
                builder: (match) => {
                    const contractType = match[1] ? match[1].toLowerCase() : null;
                    const contractPrediction = match[2] ? parseInt(match[2]) : null;
                    const countTarget = parseInt(match[3]);
                    const opText = match[4];
                    const digitValue = parseInt(match[5]);

                    const operator = this._normalizeOperator(opText);

                    return {
                        "type": "isolated_digits",
                        "description": `Entrar quando ${countTarget} digitos isolados ${operator} ${digitValue}`,
                        "displayFormat": `🔴 X`,
                        "parameters": {
                            "type": "isolated_digits",
                            "value": digitValue,
                            "operator": operator,
                            "count": countTarget,
                            "contractType": contractType,
                            "contractPrediction": contractPrediction
                        },
                        "status": "waiting",
                        "currentValue": 0,
                        "count": countTarget,
                        "value": digitValue,
                        "operator": operator,
                        "contractType": contractType,
                        "contractPrediction": contractPrediction,
                        "parameters_ui": [
                            {
                                "key": "param_iso_val",
                                "label": "Dígito Referência",
                                "value": digitValue,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.value",
                                "tooltip": "O dígito que o robô vai monitorar para ver se ele está 'isolado'."
                            },
                            {
                                "key": "param_iso_target",
                                "label": "Alvo Isolados",
                                "value": countTarget,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count",
                                "tooltip": "Quantas vezes o dígito deve aparecer de forma isolada antes de entrar."
                            }
                        ]
                    };
                }
            },
            {
                id: 'last_digit_identity_dynamic',
                // Regex: "* entrar [over 2] quando [o ultimo / os 2 ultimos] digitos >= 8"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:últimos|ultimos)\\s+(\\d+)|(\\d+)\\s+(?:últimos|ultimos)|(?:[uú]ltimos?\\s+)?(\\d+)|(?:[uú]ltimo\\s+)?)?d[ií]gitos?\\s*(?!.*isolados)([^0-9\\n*]*?)\\s*(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const count = parseInt(match[3] || match[4] || match[5] || "1");
                    const opText = match[6];
                    const value = parseInt(match[7]);

                    const operator = this._normalizeOperator(opText);
                    const displayOp = operator === '>=' ? '≥' : operator === '<=' ? '≤' : operator;

                    return {
                        "type": "last_digits",
                        "description": `entrar quando o ultimo digito ${operator} ${value}`,
                        "displayFormat": `Últimos 1 dígitos: X ${displayOp} ${value}`,
                        "parameters": {
                            "type": "last_digits",
                            "count": count,
                            "operator": operator,
                            "value": value,
                            "contractType": action,
                            "contractPrediction": prediction
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "count": count,
                        "value": value,
                        "operator": operator,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Últimos Dígitos",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count",
                                "tooltip": "A quantidade de últimos dígitos que o sistema deve analisar."
                            },
                            {
                                "key": "param_value",
                                "label": "Dígito Referência",
                                "value": value,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.value",
                                "tooltip": "O dígito usado como base para a comparação (maior, menor ou igual)."
                            }
                        ]
                    };
                }
            },
            {
                id: 'percentage_digit_inverse',
                // Regex: "* entrar difer do digito com percentual >= 24%"
                pattern: new RegExp(`${this.contractPrefix}(?:[oa]\\s+)?d[ií]gitos?\\s+(?:com\\s+)?(?:percentual|porcentagem)\\s*(>=|>|<=|<|=)\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : 'differ';
                    const operator = this._normalizeOperator(match[3]);
                    const targetPercentage = parseInt(match[4]);

                    return {
                        "type": "dynamic_prediction",
                        "description": `entrar ${action} do digito com percentual ${operator} ${targetPercentage}%`,
                        "displayFormat": `Entrar ${action.toUpperCase()} dynamic_highest_percentage_digit se percentual dos  ${operator} ${targetPercentage}%`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_percentage",
                            "predictionAction": action,
                            "targetValue": "dynamic_highest_percentage_digit",
                            "explicitPrediction": true,
                            "combinedRule": {
                                "percentageRule": {
                                    "type": "percentage",
                                    "operator": operator,
                                    "targetPercentage": targetPercentage,
                                    "parameter_key": "param_percentage_threshold_g1r1",
                                    "period": 25
                                }
                            },
                            "count": 1
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "targetValue": "dynamic_highest_percentage_digit",
                        "predictionAction": action,
                        "predictionType": "conditional_percentage",
                        "combinedRule": {
                            "percentageRule": {
                                "type": "percentage",
                                "operator": operator,
                                "targetPercentage": targetPercentage,
                                "parameter_key": "param_percentage_threshold_g1r1",
                                "period": 25
                            }
                        },
                        "parameters_ui": [
                            {
                                "key": "param_g1_r1_count",
                                "label": "Qtd. Últimos Dígitos (G1R1)",
                                "value": 1,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            },
                            {
                                "key": "param_g1_r1_nested_targetPercentage",
                                "label": "Percentual Alvo (G1R1)",
                                "value": targetPercentage,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.targetPercentage",
                                "tooltip": "Percentual limite para disparar a entrada."
                            },
                            {
                                "key": "param_g1_r1_nested_period",
                                "label": "Período Percentual (G1R1)",
                                "value": 25,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.period"
                            }
                        ]
                    };
                }
            },
            {
                id: 'probability_token_match',
                friendlyName: 'Entrada por Chance (Maior/Menor)',
                example: 'entrar differ do digito menor chance',
                // Regex: "* entrar differ do digito menor chance"
                pattern: new RegExp(`${this.contractPrefix}(?:[oa]s?\\s+)?d[ií]gitos?\\s+(menor|maior)\\s+chance\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : 'differ';
                    const probType = match[3].toLowerCase(); // menor ou maior
                    const probVar = probType.includes('menor') ? '$LOWER_PROB' : '$HIGHER_PROB';

                    return {
                        "type": "dynamic_prediction",
                        "description": `entrar ${action} do digito ${probType} chance`,
                        "displayFormat": `Entrar ${action.toUpperCase()} digit = ${probType} chance`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "last_digit_probability_match",
                            "predictionAction": action,
                            "condition": {
                                "probabilityVariable": probVar
                            }
                        },
                        "parameters_ui": [
                            {
                                "key": "param_prob_choice",
                                "label": "Escolha da Chance",
                                "value": probVar,
                                "type": "select",
                                "options": [
                                    { "value": "$LOWER_PROB", "label": "Menor Chance" },
                                    { "value": "$HIGHER_PROB", "label": "Maior Chance" }
                                ],
                                "path": "groups[0].rules[0].parameters.condition.probabilityVariable",
                                "tooltip": "Escolha se o robà´ deve entrar no dígito que menos saiu ou no que mais saiu."
                            }
                        ]
                    };
                }
            },
            {
                id: 'last_digit_prob_exact',
                // Regex: "* entrar [over 2] quando [o ultimo / os 2 ultimos] digitos = [menor/maior] chance"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:últimos|ultimos)\\s+(\\d+)|(\\d+)\\s+(?:últimos|ultimos)|(?:[uú]ltimos?\\s+)?(\\d+)|(?:[uú]ltimo\\s+)?)?d[ií]gitos?\\s*(?:=|==|igual|for|seja)?\\s*(menor\\s+chance|maior\\s+chance)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const count = parseInt(match[3] || match[4] || match[5] || "1");
                    const probType = match[6].toLowerCase();
                    const probVar = probType.includes('menor') ? '$LOWER_PROB' : '$HIGHER_PROB';

                    return {
                        "type": "dynamic_prediction",
                        "description": `entrar do digito = ${probType}`,
                        "displayFormat": `Entrar quando último dígito = ${probType}`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionAction": action,
                            "targetValue": prediction || probVar,
                            "explicitPrediction": !!(action || prediction),
                            "predictionType": "last_digit_probability_match",
                            "count": count,
                            "condition": {
                                "type": "last_digit_probability_match",
                                "probabilityVariable": probVar
                            }
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "targetValue": prediction || probVar,
                        "predictionAction": action,
                        "predictionType": "last_digit_probability_match",
                        "condition": {
                            "type": "last_digit_probability_match",
                            "probabilityVariable": probVar
                        },
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Últimos Dígitos",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count",
                                "tooltip": "Quantidade de dígitos a analisar."
                            }
                        ]
                    };
                }
            },
            {
                id: 'percentage_range_simple',
                // Regex: "* entrar quando o percentual dos digitos #5#2 > 50%"
                pattern: new RegExp(`${this.contractPrefix}(?:[oa]\\s+)?(?:percentual|porcentagem)\\s+(?:do|de\\s+)?(?:dos\\s+)?d[ií]gitos?\\s+#(\\d+)#(\\d+)\\s*(>=|>|<=|<|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const startIdx = parseInt(match[3]);
                    const endIdx = parseInt(match[4]);
                    const operator = this._normalizeOperator(match[5]);
                    const targetPercentage = parseInt(match[6]);

                    const period = Math.max(startIdx, endIdx);

                    return {
                        "type": "percentage",
                        "description": `percentual dos digitos #${startIdx} ao #${endIdx} ${operator} ${targetPercentage}%`,
                        "displayFormat": `Pct. #${startIdx}..#${endIdx} ${operator} ${targetPercentage}%`,
                        "conditionType": "single_digit",
                        "value": "$LAST_DIGIT",
                        "operator": operator,
                        "targetPercentage": targetPercentage,
                        "startIndex": startIdx,
                        "endIndex": endIdx,
                        "period": period,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": "percentage",
                            "conditionType": "single_digit",
                            "value": "$LAST_DIGIT",
                            "operator": operator,
                            "targetPercentage": targetPercentage,
                            "startIndex": startIdx,
                            "endIndex": endIdx,
                            "period": period,
                            "contractType": action,
                            "contractPrediction": prediction
                        },
                        "parameters_ui": [
                            {
                                "key": "param_start",
                                "label": "Início (#)",
                                "value": startIdx,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.startIndex"
                            },
                            {
                                "key": "param_end",
                                "label": "Fim (#)",
                                "value": endIdx,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.endIndex"
                            },
                            {
                                "key": "param_target",
                                "label": "Percentual %",
                                "value": targetPercentage,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.targetPercentage"
                            }
                        ]
                    };
                }
            },
            {
                id: 'percentage_range',
                // Regex: "* entrar quando o percentual dos digitos #7#2 for par > 50%"
                pattern: new RegExp(`${this.contractPrefix}(?:[oa]\\s+)?(?:percentual|porcentagem)\\s+(?:do|de\\s+)?(?:dos\\s+)?d[ií]gitos?\\s+#(\\d+)#(\\d+)\\s*(?:for\\s+|seja\\s+|est[aá]|é|match|nos|valor\\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual|s[ãa]o|sejam|inferiores|superiores|par|impar|pares|impares|even|odd)(?:\\s+(?:a|de|que))?\\s*(\\d+)?\\s*(?:for\s+|seja\s+|est[aá]|é|match|nos|valor\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)(?:\s+(?:a|de|que))?\s*(\d+)\s*%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const startIdx = parseInt(match[3]);
                    const endIdx = parseInt(match[4]);
                    const conditionRaw = match[5].toLowerCase();
                    const conditionValue = match[6] ? parseInt(match[6]) : null;
                    const opText = match[7];
                    const targetPercentage = parseInt(match[8]);

                    let conditionType = 'equal';
                    if (conditionRaw.includes('par') || conditionRaw === 'even') conditionType = 'even';
                    else if (conditionRaw.includes('impar') || conditionRaw === 'odd') conditionType = 'odd';
                    else if (conditionRaw.includes('inferior') || conditionRaw.includes('abaixo') || conditionRaw.includes('menor') || conditionRaw === '<' || conditionRaw === '<=') {
                        conditionType = (conditionRaw.includes('igual') || conditionRaw === '<=') ? 'below_or_equal' : 'below';
                    } else if (conditionRaw.includes('superior') || conditionRaw.includes('acima') || conditionRaw.includes('maior') || conditionRaw === '>' || conditionRaw === '>=') {
                        conditionType = (conditionRaw.includes('igual') || conditionRaw === '>=') ? 'above_or_equal' : 'above';
                    }

                    const operator = this._normalizeOperator(opText);
                    const period = Math.max(startIdx, endIdx);

                    return {
                        "type": "percentage",
                        "description": `percentual dos digitos #${startIdx} ao #${endIdx} ${conditionRaw} ${conditionValue !== null ? conditionValue : ''} ${operator} ${targetPercentage}%`,
                        "displayFormat": `Pct. #${startIdx}..#${endIdx} ${conditionRaw} ${operator} ${targetPercentage}%`,
                        "conditionType": conditionType,
                        "value": conditionValue,
                        "operator": operator,
                        "targetPercentage": targetPercentage,
                        "startIndex": startIdx,
                        "endIndex": endIdx,
                        "period": period,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": "percentage",
                            "conditionType": conditionType,
                            "value": conditionValue,
                            "operator": operator,
                            "targetPercentage": targetPercentage,
                            "startIndex": startIdx,
                            "endIndex": endIdx,
                            "period": period,
                            "contractType": action,
                            "contractPrediction": prediction
                        },
                        "parameters_ui": [
                            {
                                "key": "param_start",
                                "label": "Início (#)",
                                "value": startIdx,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.startIndex"
                            },
                            {
                                "key": "param_end",
                                "label": "Fim (#)",
                                "value": endIdx,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.endIndex"
                            },
                            {
                                "key": "param_target",
                                "label": "Percentual %",
                                "value": targetPercentage,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.targetPercentage"
                            }
                        ]
                    };
                }
            },
            {
                id: 'percentage_advanced',
                // Regex: "* entrar quando o percentual dos digitos <=2 > 50%"
                // Suporta: "percentual", "porcentagem", "abaixo de", "inferior a", "maior que", etc.
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:quando\s+|se\s+|caso\s+|onde\s+)?(?:[oa]\s+)?(?:percentual|porcentagem)\s+(?:do|de\s+)?(?:dos\s+)?d[ií]gitos?\s*(?:for\s+|seja\s+|est[aá]|é|match|nos|valor\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual|s[ãa]o|sejam|inferiores|superiores)(?:\s+(?:a|de|que))?\s*(\d+)\s*(?:for\s+|seja\s+|est[aá]|é|match|nos|valor\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)(?:\s+(?:a|de|que))?\s*(\d+)\s*%?\s*(?:\(?Per[ií]odo:\s*(\d+)\)?)?\s*$/i,
                builder: (match) => {
                    const digitOpRaw = match[1].toLowerCase();
                    const digitValue = parseInt(match[2]);
                    const pctOpRaw = match[3] ? match[3].toLowerCase() : '>';
                    const targetPercentage = parseInt(match[4]);
                    const period = match[5] ? parseInt(match[5]) : 25;

                    // Mapeamento robusto de condição
                    let conditionType = 'equal';
                    const cLow = digitOpRaw.toLowerCase();
                    if (cLow.includes('inferior') || cLow.includes('abaixo') || cLow.includes('menor') || cLow === '<' || cLow === '<=') {
                        conditionType = (cLow.includes('igual') || cLow === '<=') ? 'below_or_equal' : 'below';
                    } else if (cLow.includes('superior') || cLow.includes('acima') || cLow.includes('maior') || cLow === '>' || cLow === '>=') {
                        conditionType = (cLow.includes('igual') || cLow === '>=') ? 'above_or_equal' : 'above';
                    }

                    // Mapear operador de percentual
                    let operator = '>';
                    if (pctOpRaw.includes('<=')) operator = '<=';
                    else if (pctOpRaw.includes('>=')) operator = '>=';
                    else if (pctOpRaw.includes('<')) operator = '<';
                    else if (pctOpRaw.includes('>')) operator = '>';
                    else if (pctOpRaw.includes('=')) operator = '=';
                    else if (pctOpRaw.includes('inferior') || pctOpRaw.includes('abaixo') || pctOpRaw.includes('menor')) operator = '<';
                    else if (pctOpRaw.includes('superior') || pctOpRaw.includes('acima') || pctOpRaw.includes('maior')) operator = '>';

                    const description = `entrar quando o percentual dos digitos ${digitOpRaw} ${digitValue} ${operator} ${targetPercentage}% (Período: ${period})`;

                    return {
                        "type": "percentage",
                        "description": description,
                        "displayFormat": `Percentual do dígitos ${digitOpRaw} ${digitValue} ${operator} ${targetPercentage}%`,
                        "conditionType": conditionType,
                        "value": digitValue,
                        "operator": operator,
                        "targetPercentage": targetPercentage,
                        "period": period,
                        "parameters": {
                            "type": "percentage",
                            "conditionType": conditionType,
                            "value": digitValue,
                            "operator": operator,
                            "targetPercentage": targetPercentage,
                            "period": period,
                            "parameter_key": "param_percent_val"
                        },
                        "parameters_ui": [
                            {
                                "key": "param_g1_r1_value",
                                "label": "Dígito Referência (G1R1)",
                                "value": digitValue,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.value",
                                "tooltip": "Dígito a ser comparado."
                            },
                            {
                                "key": "param_g1_r1_targetPercentage",
                                "label": "Percentual Alvo (G1R1)",
                                "value": targetPercentage,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.targetPercentage",
                                "tooltip": "Percentual alvo para a condição."
                            },
                            {
                                "key": "param_g1_r1_period",
                                "label": "Período Percentual (G1R1)",
                                "value": period,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.period",
                                "tooltip": "Período de ticks para cálculo do percentual."
                            }
                        ]
                    };
                }
            },
            {
                id: 'double_action_allowed_digits_simple',
                // Regex: "entrar over 2 e under 7 quando os ultimos 2 digitos=(0,1,2,7,8,9)"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:quando\s+|se\s+|caso\s+|onde\s+)?(over|under|differ|match)\s+(\d+)\s+e\s+(over|under|differ|match)\s+(\d+)\s+(?:quando|se|caso|onde|\-)\s+(?:os\s+)?[uú]ltimos\s+(\d+)\s+d[ií]gitos\s*(?:=|==|s[ãa]o|sejam|nos|em|for|seja|est[aá]|é)\s*\(?([0-9,\s]+)\)?\s*$/i,
                builder: (match) => {
                    const action1 = match[1].toLowerCase();
                    const value1 = parseInt(match[2]);
                    const action2 = match[3].toLowerCase();
                    const value2 = parseInt(match[4]);
                    const count = parseInt(match[5]);
                    const allowedDigits = match[6].split(',').map(d => parseInt(d.trim()));

                    const createRule = (action, value, id) => {
                        return {
                            "type": "dynamic_prediction",
                            "description": `Entrar ${action} ${value} quando os ultimos ${count} digitos=(${allowedDigits.join(',')})`,
                            "displayFormat": `Previsão dinâmica: Entrar ${action.toUpperCase()} ${value} quando os ultimos ${count} digitos=(${allowedDigits.join(',')})`,
                            "parameters": {
                                "type": "dynamic_prediction",
                                "predictionType": "conditional_value",
                                "predictionAction": action,
                                "targetValue": value,
                                "explicitPrediction": true,
                                "parameter_key": `param_contract_val_g1r${id}`,
                                "count": count,
                                "parameter_key_count": "param_last_digits_count_g1r1", // Mantendo consistência com exemplo
                                "allowedDigits": allowedDigits,
                                "parameter_key_allowed_digits": "param_allowed_digits_g1r1"
                            },
                            "status": "waiting",
                            "currentValue": null,
                            "count": count,
                            "targetValue": value,
                            "predictionAction": action,
                            "predictionType": "conditional_value",
                            "allowedDigits": allowedDigits,

                            // Base para parâmetros dinâmicos (serão ajustados no matchStrategy)
                            "parameters_ui": [
                                {
                                    "key": "param_count",
                                    "label": `Qtd. Últimos Dígitos (G1R${id})`,
                                    "value": count,
                                    "type": "number",
                                    "path": "groups[0].rules[0].parameters.count"
                                },
                                {
                                    "key": "param_targetValue",
                                    "label": `Valor Alvo (G1R${id})`,
                                    "value": value,
                                    "type": "number",
                                    "path": "groups[0].rules[0].parameters.targetValue"
                                },
                                {
                                    "key": "param_allowedDigits",
                                    "label": `Dígitos Permitidos (G1R${id})`,
                                    "value": allowedDigits.join(','),
                                    "type": "text",
                                    "path": "groups[0].rules[0].allowedDigits",
                                    "isArray": true
                                }
                            ]
                        };
                    };

                    return [
                        createRule(action1, value1, 1),
                        createRule(action2, value2, 2)
                    ];
                }
            },
            {
                id: 'action_allowed_digits_simple',
                // Regex: "entrar over 2 quando os ultimos 3 digitos=(2,5,8)" ou "ultimos 2 digitos <= 2"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:quando\s+|se\s+|caso\s+|onde\s+)?(over|under|differ|match)\s+(\d+)\s+(?:quando|se|caso|onde|\-)\s+(?:os\s+)?[uú]ltimos\s+(\d+)?\s*d[ií]gitos\s*(?:for\s+|seja\s+|est[aá]|é|match|nos|valor\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual|s[ãa]o|sejam)(?:\s+a|\s+de|\s+que)?\s*\(?([0-9,\s]+)\)?\s*$/i,
                builder: (match) => {
                    const action = match[1].toLowerCase();
                    const value = parseInt(match[2]);
                    const opRaw = match[4].toLowerCase();
                    const digitsStr = match[5];

                    // Normalizar operador
                    let operator = opRaw;
                    if (opRaw === 'for' || opRaw === 'seja' || opRaw === 'está' || opRaw === 'está' || opRaw === 'é' || opRaw === 'nos' || opRaw === 'em' || opRaw === 'igual') operator = '=';
                    if (opRaw === '==') operator = '=';
                    if (opRaw === 'inferior' || opRaw === 'abaixo' || opRaw === 'menor') operator = '<';
                    if (opRaw === 'superior' || opRaw === 'acima' || opRaw === 'maior') operator = '>';

                    let allowedDigits = [];

                    // Lógica de Intervalo (<=, >=, <, >, inferior, superior, etc.)
                    if (['<=', '>=', '<', '>', 'inferior', 'superior', 'abaixo', 'acima', 'menor', 'maior'].includes(opRaw) || ['<=', '>=', '<', '>'].includes(operator)) {
                        // Assumimos que, para comparação, o usuário fornece APENAS UM número
                        const refValue = parseInt(digitsStr.trim());

                        if (!isNaN(refValue)) {
                            if (operator === '<=') {
                                for (let i = 0; i <= refValue; i++) allowedDigits.push(i);
                            } else if (operator === '>=') {
                                for (let i = refValue; i <= 9; i++) allowedDigits.push(i);
                            } else if (operator === '<') {
                                for (let i = 0; i < refValue; i++) allowedDigits.push(i);
                            } else if (operator === '>') {
                                for (let i = refValue + 1; i <= 9; i++) allowedDigits.push(i);
                            }

                            // Validar limites (0-9)
                            allowedDigits = allowedDigits.filter(d => d >= 0 && d <= 9);
                        }
                    } else {
                        // Lógica de Lista (Igualdade)
                        allowedDigits = digitsStr.split(',')
                            .map(d => parseInt(d.trim()))
                            .filter(d => !isNaN(d));
                    }

                    // Se group 3 (count) for undefined, usa:
                    // - Para lista: tamanho da lista (Ex: "ultimos digitos=(1,2)" -> count=2)
                    // - Para intervalo: Usa 1 como fallback? 
                    //   NÃO, o usuário geralmente diz "ultimos 2 digitos <= 2". 
                    //   Se ele disser "ultimos digitos <= 2", provavelmente quer verificar APENAS O ÚLTIMO?
                    //   Ou todos? Por padrão, se omitido, assume 1 para comparação, ou tamanho da lista para lista.
                    let count = match[3] ? parseInt(match[3]) : null;

                    if (count === null) {
                        // Se for lista explícita, usa tamanho da lista
                        if (!['<=', '>=', '<', '>'].includes(operator)) {
                            count = allowedDigits.length;
                        } else {
                            // Se for comparação e omitiu count, assume 1 (último dígito)
                            // Ex: "quando ultimos digitos <= 2" -> "quando ultimo digito <= 2"
                            count = 1;
                        }
                    }

                    const description = `Entrar ${action} ${value} quando os ultimos ${count} digitos ${operator} (${allowedDigits.join(',')})`;
                    const displayFormat = `Previsão dinâmica: Entrar ${action.toUpperCase()} ${value} quando os ultimos ${count} digitos ${operator} ${digitsStr}`;

                    return {
                        "type": "dynamic_prediction",
                        "description": description,
                        "displayFormat": displayFormat,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_value",
                            "predictionAction": action,
                            "targetValue": value,
                            "explicitPrediction": true,
                            "count": count,
                            "allowedDigits": allowedDigits, // Array direto
                            "parameter_key": `param_contract_val_g1r1`,
                            "parameter_key_allowed_digits": "param_allowed_digits_g1r1"
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "count": count,
                        "targetValue": value,
                        "predictionAction": action,
                        "predictionType": "conditional_value",
                        "allowedDigits": allowedDigits,

                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Últimos Dígitos",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            },
                            {
                                "key": "param_targetValue",
                                "label": "Valor Alvo (Ação)",
                                "value": value,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.targetValue"
                            },
                            {
                                "key": "param_allowedDigits",
                                "label": "Dígitos Permitidos",
                                "value": allowedDigits.join(','),
                                "type": "text",
                                "path": "groups[0].rules[0].allowedDigits",
                                "isArray": true
                            }
                        ]
                    };
                }
            },
            {
                id: 'action_repetition_simple',
                // Regex: "entrar differ do digito que se repetir 2 vezes"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:quando\s+|se\s+|caso\s+|onde\s+)?(?:entrar\s+)?(over|under|differ|match)\s+(?:do\s+|no\s+)?d[ií]gito\s+(?:que\s+)?(?:se\s+)?(?:repetir|repete|repetem)\s+(\d+)\s+vezes\s*$/i,
                builder: (match) => {
                    const action = match[1].toLowerCase();
                    const repetitionsInput = parseInt(match[2]);

                    // 🎯 LÓGICA DE CONTAGEM: Conforme feedback do usuário, count = número de vezes do texto
                    const count = repetitionsInput;

                    const description = `entrar ${action} do digito que se repetir ${repetitionsInput} vezes`;
                    const displayFormat = `Entrar ${action.toUpperCase()} do dígito que se repetir ${count} vezes`;

                    return {
                        "type": "dynamic_prediction",
                        "description": description,
                        "displayFormat": displayFormat,
                        "predictionType": "conditional_pattern",
                        "predictionAction": action,
                        "targetValue": "dynamic_repeated_digit",
                        "count": count,
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_pattern",
                            "predictionAction": action,
                            "targetValue": "dynamic_repeated_digit",
                            "parameter_key": "param_contract_val",
                            "explicitPrediction": true,
                            "combinedRule": {
                                "patternRule": {
                                    "type": "digit_repetition",
                                    "count": count,
                                    "parameter_key": "param_repetition_count_g1r1"
                                }
                            },
                            "count": count
                        },
                        "combinedRule": {
                            "patternRule": {
                                "type": "digit_repetition",
                                "count": count,
                                "parameter_key": "param_repetition_count_g1r1"
                            }
                        },

                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_g1_r1_count",
                                "label": "Qtd. Últimos Dígitos (G1R1)",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            }
                        ]
                    };
                }
            },
            {
                id: 'action_pattern_simple',
                // Regex: 
                // "* Entrar over 2 quando padrão oxx"
                // "* entrar differ quando o padrão XXOX"
                // "* entrar odd quando padrão XOX"
                // "* padrão OXO"
                pattern: new RegExp(`${this.contractPrefix}(?:o\\s+)?padr[ãa]o\\s+([XxOo]+)\\s*$`, 'i'),
                builder: (match) => {
                    let action = match[1] ? match[1].toLowerCase() : null;
                    const targetValue = match[2] ? parseFloat(match[2]) : null;
                    const pattern = match[3].toLowerCase();

                    // Normalização básica de ação
                    const actionMap = {
                        'par': 'even',
                        'impar': 'odd',
                        'ímpar': 'odd',
                        'acima': 'over',
                        'abaixo': 'under',
                        'superior': 'over',
                        'inferior': 'under'
                    };
                    if (actionMap[action]) action = actionMap[action];

                    const actionDisplay = action ? action.toUpperCase() : 'L/W';
                    const targetDisplay = targetValue !== null ? ` ${targetValue}` : '';

                    const description = `Entrar${action ? ' ' + action : ''}${targetValue !== null ? ' ' + targetValue : ''} quando padrão ${pattern.toUpperCase()}`;
                    const displayFormat = `Padrão ${pattern.toUpperCase()}${action ? ' (' + actionDisplay + targetDisplay + ')' : ''}`;

                    return {
                        "type": "dynamic_prediction",
                        "description": description,
                        "displayFormat": displayFormat,
                        "predictionType": "conditional_pattern",
                        "predictionAction": action,
                        "targetValue": targetValue,
                        "count": pattern.length,
                        "pattern": pattern,
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_pattern",
                            "predictionAction": action,
                            "targetValue": targetValue,
                            "parameter_key": "param_contract_val",
                            "explicitPrediction": !!action,
                            "combinedRule": {
                                "patternRule": {
                                    "type": "digit_pattern",
                                    "pattern": pattern.toUpperCase(),
                                    "parameter_key": "param_pattern_g1r1",
                                    "pattern_type": "loser_winner"
                                }
                            },
                            "count": pattern.length
                        },
                        "combinedRule": {
                            "patternRule": {
                                "type": "digit_pattern",
                                "pattern": pattern.toUpperCase(),
                                "pattern_type": "loser_winner",
                                "parameter_key": "param_pattern_g1r1",
                                // 🎯 CONTEXTO INJETADO: Para garantir que win/loss siga a ação da regra e não a base
                                "contextAction": action,
                                "contextTarget": targetValue
                            }
                        },

                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Últimos Dígitos (G1R1)",
                                "value": pattern.length,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            },
                            {
                                "key": "param_pattern",
                                "label": "Padrão (G1R1)",
                                "value": pattern.toUpperCase(),
                                "type": "text",
                                "validation": "pattern",
                                "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern"
                            }
                        ]
                    };
                }
            },
            {
                id: 'digit_repetition_times_explicit',
                // Regex: "entrar quando o ultimo digito se repetir 3 vezes"
                // Robusto: aceita "o/os", "ultimo/ultimos", "digito/digitos", "repetir/repetirem", "X vezes"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:quando\s+|se\s+|caso\s+|onde\s+)?(?:os?|a|as)?\s*(?:[uú]ltimos?\s+d[ií]gitos?|[uú]ltimos?|d[ií]gitos?)\s*(?:que\s+)?(?:se\s+repetirem|se\s+repetir|repetirem|repetem|repetindo)\s+(\d+)\s+vezes\s*$/i,
                builder: (match) => {
                    const count = parseInt(match[1]);

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar quando o ultimo digitos se repetir ${count} vezes`,
                        "displayFormat": `Previsão dinâmica: Dígito que se repetir ${count} vezes`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_pattern",
                            "explicitPrediction": false,
                            "combinedRule": {
                                "patternRule": {
                                    "type": "digit_repetition",
                                    "count": count,
                                    "parameter_key": "param_repetition_count"
                                }
                            },
                            "count": count
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "predictionType": "conditional_pattern",
                        "combinedRule": {
                            "patternRule": {
                                "type": "digit_repetition",
                                "count": count,
                                "parameter_key": "param_repetition_count"
                            }
                        },
                        "count": count,

                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Repetições",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            }
                        ]
                    };
                }
            },
            {
                id: 'digit_repetition_range',
                // Regex: "* entrar quando os digitos #9#3 se repetir"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:os\\s+)?d[ií]gitos?\\s+)?(?:#(\\d+)#(\\d+)|(?:do|da)\\s+((?:\\d+|primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|sétimo|oitavo|nono|decimo|décimo))\\s+(?:ao|a|até)\\s+((?:\\d+|primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|sétimo|oitavo|nono|decimo|décimo|penultimo|último|ultimo)))\\s*(?:que\\s+)?(?:se\\s+repetirem|se\\s+repetir|repetirem|repetem|repetindo)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;

                    let startIdxNum = match[3] ? parseInt(match[3]) : null;
                    let endIdxNum = match[4] ? parseInt(match[4]) : null;
                    const startText = match[5];
                    const endText = match[6];

                    const ordinalMap = {
                        'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4, 'quinto': 5,
                        'sexto': 6, 'setimo': 7, 'sétimo': 7, 'oitavo': 8, 'nono': 9, 'decimo': 10, 'décimo': 10,
                        'penultimo': 2, 'ultimo': 1, 'último': 1
                    };

                    if (startIdxNum === null && startText) startIdxNum = !isNaN(parseInt(startText)) ? parseInt(startText) : ordinalMap[startText.toLowerCase()];
                    if (endIdxNum === null && endText) endIdxNum = !isNaN(parseInt(endText)) ? parseInt(endText) : ordinalMap[endText.toLowerCase()];

                    if (!startIdxNum) startIdxNum = 1;
                    if (!endIdxNum) endIdxNum = 1;

                    const description = `Entrar quando dígitos #${startIdxNum} ao #${endIdxNum} se repetirem`;

                    return {
                        "type": "dynamic_prediction",
                        "description": description,
                        "displayFormat": `Dígitos #${startIdxNum} ao #${endIdxNum} repetindo`,
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_pattern",
                            "predictionAction": action,
                            "targetValue": prediction,
                            "combinedRule": {
                                "patternRule": {
                                    "type": "digit_repetition",
                                    "count": 1,
                                    "startIndex": startIdxNum,
                                    "endIndex": endIdxNum
                                }
                            }
                        },
                        "parameters_ui": [
                            {
                                "key": "param_start",
                                "label": "Dígito Inicial (#)",
                                "value": startIdxNum,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.patternRule.startIndex"
                            },
                            {
                                "key": "param_end",
                                "label": "Dígito Final (#)",
                                "value": endIdxNum,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.patternRule.endIndex"
                            }
                        ]
                    };
                }
            },
            {
                id: 'digit_repetition_simple',
                // Regex: "[entrar over 2] [3 últimos/últimos 3] digitos se repetir [2 vezes]"
                // Match: [1] action, [2] prediction, [3] count (ultimos N), [4] count (N ultimos), [5] words "digitos", [6] count specific (N vezes)
                pattern: new RegExp(`${this.contractPrefix}(?:a\\s+|o\\s+|as\\s+|os\\s+)?(?:(?:últimos|ultimos)\\s+(\\d+)|(\\d+)\\s+(?:últimos|ultimos)|(d[ií]gitos?)|(\\d+))?\\s*(?:que\\s+)?(?:se\\s+repetirem|se\\s+repetir|repetirem|repetem|repetindo)(?:\\s+(\\d+)\\s*(?:vezes|vez))?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;

                    // Prioridade para o contador específico "N vezes" no final (ex: "repetir 2 vezes")
                    // Se não houver, tenta pegar dos grupos de "últimos N"
                    const count = parseInt(match[7] || match[3] || match[4] || match[6] || "2");

                    const description = `Entrar quando ultimos ${count} digitos se repetir`;
                    const displayFormat = `Últimos ${count} dígitos repetindo`;
                    const predictionType = (action === 'differ' || action === 'diff') ? "repeated_digit_inverse" : "repeated_digit_match";

                    return {
                        "type": "dynamic_prediction",
                        "description": description,
                        "displayFormat": displayFormat,
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": predictionType,
                            "predictionAction": action,
                            "targetValue": prediction,
                            "count": count,
                            "combinedRule": {
                                "patternRule": {
                                    "type": "digit_repetition",
                                    "count": count
                                }
                            }
                        },

                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Últimos Dígitos",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            }
                        ]
                    };
                }
            },
            {
                id: 'digit_parity_range',
                // Regex: "* entrar quando os digitos #9#3 for par"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:os\\s+)?d[ií]gitos?\\s+)?(?:#(\\d+)#(\\d+)|(?:do|da)\\s+((?:\\d+|primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|sétimo|oitavo|nono|decimo|décimo))\\s+(?:ao|a|até)\\s+((?:\\d+|primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|sétimo|oitavo|nono|decimo|décimo|penultimo|último|ultimo)))\\s*(?:é\\s+|são\\s+|for\\s+|sejam\\s+|seja\\s+|est[aá]\\s+|match\\s+)?(par(?:es)?|[ií]mpar(?:es)?)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;

                    let startIdxNum = match[3] ? parseInt(match[3]) : null;
                    let endIdxNum = match[4] ? parseInt(match[4]) : null;
                    const startText = match[5];
                    const endText = match[6];
                    const parityRaw = match[7].toLowerCase();
                    const parity = (parityRaw === 'pares' || parityRaw === 'par') ? 'even' : 'odd';

                    const ordinalMap = {
                        'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4, 'quinto': 5,
                        'sexto': 6, 'setimo': 7, 'sétimo': 7, 'oitavo': 8, 'nono': 9, 'decimo': 10, 'décimo': 10,
                        'penultimo': 2, 'ultimo': 1, 'último': 1
                    };

                    if (startIdxNum === null && startText) startIdxNum = !isNaN(parseInt(startText)) ? parseInt(startText) : ordinalMap[startText.toLowerCase()];
                    if (endIdxNum === null && endText) endIdxNum = !isNaN(parseInt(endText)) ? parseInt(endText) : ordinalMap[endText.toLowerCase()];

                    if (!startIdxNum) startIdxNum = 1;
                    if (!endIdxNum) endIdxNum = 1;

                    const parityLabel = parity === 'even' ? 'pares' : 'ímpares';

                    return {
                        "type": "digit_parity",
                        "description": `Entrar quando dígitos #${startIdxNum} ao #${endIdxNum} são ${parityLabel}`,
                        "displayFormat": `Dígitos #${startIdxNum} ao #${endIdxNum} ${parityLabel}`,
                        "count": 1, // Will be overridden by range logic in engine
                        "parity": parity,
                        "startIndex": startIdxNum,
                        "endIndex": endIdxNum,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": "digit_parity",
                            "count": 1,
                            "startIndex": startIdxNum,
                            "endIndex": endIdxNum,
                            "parity": parity,
                            "contractType": action,
                            "contractPrediction": prediction
                        },
                        "parameters_ui": [
                            {
                                "key": "param_start",
                                "label": "Dígito Inicial (#)",
                                "value": startIdxNum,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.startIndex"
                            },
                            {
                                "key": "param_end",
                                "label": "Dígito Final (#)",
                                "value": endIdxNum,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.endIndex"
                            }
                        ]
                    };
                }
            },
            {
                id: 'digit_parity_simple',
                // Regex: "[entrar over 2] [2 últimos/últimos 2] digitos impares"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:últimos|ultimos)\\s+(\\d+)|(\\d+)\\s+(?:últimos|ultimos)|(\\d+))?\\s*d[ií]gitos?\\s*(?:é\\s+|são\\s+|for|sejam\\s+|seja|est[aá]|match)\\s*(par(?:es)?|[ií]mpar(?:es)?)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const count = parseInt(match[3] || match[4] || match[5] || "1");
                    const parityRaw = match[6].toLowerCase();
                    const parity = (parityRaw === 'pares' || parityRaw === 'par') ? 'even' : 'odd';
                    const parityLabel = parity === 'even' ? 'pares' : 'ímpares';
                    const countLabel = count > 1 ? `${count} dígitos` : 'último dígito';

                    return {
                        "type": "digit_parity",
                        "description": `Entrar quando ${countLabel} ${parityLabel}`,
                        "displayFormat": `Últimos ${count} dígitos ${parityLabel}`,
                        "count": count,
                        "parity": parity,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": "digit_parity",
                            "count": count,
                            "parity": parity,
                            "contractType": action,
                            "contractPrediction": prediction
                        },
                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Últimos Dígitos",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            }
                        ]
                    };
                }
            },
            {
                id: 'sequence_simple',
                // Regex: "[entrar over 2] [3 últimos/últimos 3] preços subindo consecutivos"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:[uú]ltimos?|consecutivos?)\\s+(\\d+)|(\\d+)\\s+(?:[uú]ltimos?|consecutivos?)|(\\d+))\\s+(?:pre[çc]o|pre[çc]os|tick|ticks|tique|tiques)(?:\\s+(?:consecutivos|seguidos?))?\\s+(subindo|descendo|subirem|descerem)(?:\\s+(?:consecutivos|seguidos?))?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const count = parseInt(match[3] || match[4] || match[5]);
                    const directionRaw = match[6].toLowerCase();
                    const direction = directionRaw === 'subindo' || directionRaw === 'subirem' ? 'up' : 'down';
                    const directionLabel = direction === 'up' ? 'subindo' : 'descendo';
                    const arrow = direction === 'up' ? '↗️' : '↘️';

                    const description = `Entrar quando ${count} preços consecutivos ${directionLabel}`;
                    const displayFormat = `${count} ticks consecutivos ${arrow} ${directionLabel}`;

                    return {
                        "type": "sequence",
                        "description": description,
                        "displayFormat": displayFormat,
                        "count": count,
                        "direction": direction,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": "sequence",
                            "direction": direction,
                            "count": count,
                            "contractType": action,
                            "contractPrediction": prediction,
                            "parameter_key": "param_sequence_count_g1r1"
                        },

                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_g1_r1_count",
                                "label": "Qtd. Consecutivos",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count",
                                "tooltip": "Quantos ticks seguidos devem subir ou descer para entrar."
                            }
                        ]
                    };
                }
            },
            {
                id: 'accuracy_simple',
                // Regex: "[entrar over 2] precisão > 70"
                pattern: new RegExp(`${this.contractPrefix}precis[ãa]o\\s*(>|>=|<|<=|=)\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const operator = this._normalizeOperator(match[3]);
                    const value = parseInt(match[4]);

                    const description = `Entrar quando precisão ${operator} ${value}`;
                    const displayFormat = `Precisão da probabilidade IA ${operator} ${value}%`;

                    return {
                        "type": "probability_accuracy",
                        "description": description,
                        "displayFormat": displayFormat,
                        "operator": operator,
                        "value": value,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": "probability_accuracy",
                            "operator": operator,
                            "value": value,
                            "contractType": action,
                            "contractPrediction": prediction,
                            "parameter_key": "param_accuracy_threshold"
                        },

                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_value",
                                "label": "Mínimo Precisão %",
                                "value": value,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.value",
                                "tooltip": "Nível de assertividade mínima da IA para permitir a operação."
                            }
                        ]
                    };
                }
            },
            {
                id: 'percentage_last_digit',
                // Regex: "entrar quando o percentual/porcentagem do ultimo digito >= 27%"
                pattern: new RegExp(`${this.contractPrefix}(?:[oa]\\s+)?(?:percentual|porcentagem)\\s+(?:do\\s+)?(?:[uú]ltimo\\s+)?d[ií]gito\\s*(>=|>|<=|<|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const operator = this._normalizeOperator(match[3]);
                    const targetPercentage = parseInt(match[4]);

                    return {
                        "type": "percentage",
                        "description": `entrar quando o percentual do ultimo digito ${operator}${targetPercentage}%`,
                        "displayFormat": `Percentual do último dígito ${operator === '>=' ? '≥' : operator === '<=' ? '≤' : operator} ${targetPercentage}%`,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "conditionType": "single_digit",
                        "value": "$LAST_DIGIT",
                        "operator": operator,
                        "targetPercentage": targetPercentage,
                        "period": 25,
                        "parameters": {
                            "type": "percentage",
                            "conditionType": "single_digit",
                            "value": "$LAST_DIGIT",
                            "operator": operator,
                            "targetPercentage": targetPercentage,
                            "contractType": action,
                            "contractPrediction": prediction,
                            "parameter_key": "param_percentage_threshold_g1r1",
                            "period": 25,
                            "parameter_key_period": "param_percentage_period_g1r1"
                        },
                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_value",
                                "label": "Dígito Referência",
                                "value": "$LAST_DIGIT",
                                "type": "text",
                                "path": "groups[0].rules[0].parameters.value"
                            },
                            {
                                "key": "param_targetPercentage",
                                "label": "Percentual Alvo",
                                "value": targetPercentage,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.targetPercentage"
                            },
                            {
                                "key": "param_period",
                                "label": "Período Percentual",
                                "value": 25,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.period"
                            }
                        ]
                    };
                }
            },
            {
                id: 'level_comparison',
                // Regex: "[entrar put] preço > resistencia"
                pattern: new RegExp(`${this.contractPrefix}(?:pre[çc]o|pre[çc]os|tick|tique|tiques)\\s*(>|>=|<|<=|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\\s*(resistencia|suporte)(?:\\s*\\((\\d+)\\))?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const operator = this._normalizeOperator(match[3]);
                    const levelTypeRaw = match[4].toLowerCase();
                    const period = match[5] ? parseInt(match[5]) : 100;

                    const type = levelTypeRaw === 'suporte' ? 'support' : 'resistance';
                    const levelLabel = levelTypeRaw === 'suporte' ? 'Suporte' : 'Resistência';

                    const description = `Entrar quando preço ${operator} ${levelTypeRaw}`;
                    const displayFormat = `Último tick ${operator} ${levelLabel}(${period})`;

                    return {
                        "type": type,
                        "description": description,
                        "displayFormat": displayFormat,
                        "period": period,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": type,
                            "operator": operator,
                            "period": period,
                            "contractType": action,
                            "contractPrediction": prediction,
                            "parameter_key": `param_${type}_period`
                        },

                        // Parametros para UI
                        "parameters_ui": [
                            {
                                "key": `param_period`,
                                "label": `Período ${levelLabel}`,
                                "value": period,
                                "type": "number",
                                "path": `groups[0].rules[0].parameters.period`
                            }
                        ]
                    };
                }
            },
            {
                id: 'sma_comparison',
                // Regex: "sma 20 > sma 60", "sma > 1.2345", "sma > sma"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:quando\s+|se\s+|caso\s+|onde\s+)?sma\s*(?:\(?(\d+)\)?)?\s*(>|>=|<|<=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\s*(?:sma\s*(?:\(?(\d+)\)?)?|(\d+(?:\.\d+)?))\s*$/i,
                builder: (match) => {
                    const period1 = match[1] ? parseInt(match[1]) : 20; // Default 20
                    const operator = match[2];
                    const period2 = match[3] ? parseInt(match[3]) : (match[4] ? null : 60); // Default 60 se for sma
                    const value = match[4] ? parseFloat(match[4]) : null;

                    const description = period2 !== null
                        ? `Entrar quando sma ${period1} ${operator} sma ${period2}`
                        : `Entrar quando sma ${period1} ${operator} ${value}`;

                    const displayFormat = period2 !== null
                        ? `SMA(${period1}) ${operator} SMA(${period2})`
                        : `SMA(${period1}) ${operator} ${value}`;

                    return {
                        "type": "sma",
                        "description": description,
                        "displayFormat": displayFormat,
                        "period1": period1,
                        "period2": period2,
                        "operator": operator,
                        "value": value || 0,
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "sma",
                            "period1": period1,
                            "parameter_key_period1": `param_sma_period1`,
                            "operator": operator,
                            "period2": period2,
                            "parameter_key_period2": period2 !== null ? `param_sma_period2` : null,
                            "value": value
                        },
                        // Espelhamento para estabilidade de log/formatação
                        "combinedRule": {
                            "smaRule": {
                                "type": "sma",
                                "period1": period1,
                                "period2": period2,
                                "operator": operator,
                                "value": value
                            }
                        },

                        // Parametros para UI
                        "parameters_ui": [
                            {
                                "key": "param_period1",
                                "label": `Período SMA 1`,
                                "value": period1,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.period1"
                            },
                            (period2 !== null) ? {
                                "key": "param_period2",
                                "label": `Período SMA 2`,
                                "value": period2,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.period2"
                            } : {
                                "key": "param_value",
                                "label": "Valor Compare",
                                "value": value || 0,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.value"
                            }
                        ].filter(p => !!p)
                    };
                }
            },
            {
                id: 'parity_action_range_conditional',
                // Regex: "entrar odd quando os digitos #6#2 <= 5"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:quando\s+|se\s+|caso\s+|onde\s+)?(odd|even|par(?:es)?|[ií]mpar(?:es)?)\s+(?:quando|se|caso|onde)\s+(?:os\s+)?d[ií]gitos\s+#(\d+)#(\d+)\s*(<=|>=|<=?|>=?|<|>|==|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\s*(\d+)\s*$/i,
                builder: (match) => {
                    const action = match[1].toLowerCase();
                    const startIdx = parseInt(match[2]);
                    const endIdx = parseInt(match[3]);
                    let operator = match[4].replace(/\s/g, '');
                    if (operator === '=') operator = '==';
                    const thresholdValue = parseInt(match[5]);

                    const displayOperator = operator === '<=' ? '≤' : operator === '>=' ? '≥' : operator;

                    return {
                        "type": "dynamic_prediction",
                        "description": `entrar ${action} quando os digitos #${startIdx} ao #${endIdx} ${operator} ${thresholdValue}`,
                        "displayFormat": `Entrar ${action.toUpperCase()} quando #${startIdx}..#${endIdx} ${displayOperator} ${thresholdValue}`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_value",
                            "predictionAction": action,
                            "targetValue": 8, // Fallback
                            "explicitPrediction": true,
                            "startIndex": startIdx,
                            "endIndex": endIdx,
                            "count": 1,
                            "condition": {
                                "type": operator,
                                "value": thresholdValue
                            }
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "startIndex": startIdx,
                        "endIndex": endIdx,
                        "predictionAction": action,
                        "predictionType": "conditional_value",
                        "condition": {
                            "type": operator,
                            "value": thresholdValue
                        },
                        "parameters_ui": [
                            {
                                "key": "param_start",
                                "label": "Início (#)",
                                "value": startIdx,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.startIndex"
                            },
                            {
                                "key": "param_end",
                                "label": "Fim (#)",
                                "value": endIdx,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.endIndex"
                            }
                        ]
                    };
                }
            },
            {
                id: 'parity_action_last_digits_conditional',
                // Regex: "entrar odd quando os ultimos 2 digitos <= 5"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:quando\s+|se\s+|caso\s+|onde\s+)?(odd|even|par(?:es)?|[ií]mpar(?:es)?)\s+(?:quando|se|caso|onde)\s+(?:os\s+)?[uú]ltimos\s+(\d+)\s+d[ií]gitos\s*(<=|>=|<=?|>=?|<|>|==|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\s*(\d+)\s*$/i,
                builder: (match) => {
                    const action = match[1].toLowerCase();
                    const count = parseInt(match[2]);
                    let operator = match[3].replace(/\s/g, ''); // Fix "< =" to "<="
                    if (operator === '=') operator = '==';
                    const thresholdValue = parseInt(match[4]);

                    // Display friendly operator
                    const displayOperator = operator === '<=' ? '≤' : operator === '>=' ? '≥' : operator;

                    return {
                        "type": "dynamic_prediction",
                        "description": `entrar ${action} quando os ultimos ${count} digitos ${operator} ${thresholdValue}`,
                        "displayFormat": `Entrar ${action.toUpperCase()} quando últimos ${count} dígitos ${displayOperator} ${thresholdValue}`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_value",
                            "predictionAction": action,
                            "targetValue": 8, // Mantendo fallback do exemplo do usuário
                            "explicitPrediction": true,
                            "parameter_key": `param_action_g1r1`,
                            "count": count,
                            "parameter_key_count": `param_last_digits_count_g1r1`,
                            "condition": {
                                "type": operator,
                                "value": thresholdValue,
                                "parameter_key": `param_threshold_g1r1`
                            }
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "count": count,
                        "targetValue": 8, // Mantendo fallback do exemplo do usuário
                        "predictionAction": action,
                        "predictionType": "conditional_value",
                        "condition": {
                            "type": operator,
                            "value": thresholdValue,
                            "parameter_key": `param_threshold_g1r1`
                        },
                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Últimos Dígitos",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            },
                            {
                                "key": "param_targetValue",
                                "label": "Valor Alvo",
                                "value": 8,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.targetValue"
                            },
                            {
                                "key": "param_conditionValue",
                                "label": "Condição Valor",
                                "value": thresholdValue,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.condition.value"
                            }
                        ]
                    };
                }
            },
            {
                id: 'action_range_simple',
                // Regex: "Entrar Over 3 quando digitos #6#2 <= 2"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:quando\s+|se\s+|caso\s+|onde\s+)?(differ|match|over|under)\s+(\d+(?:\.\d+)?)\s+(?:quando|se|caso|onde|\-)\s+(?:os\s+)?d[ií]gitos\s+#(\d+)#(\d+)\s*(<=|>=|<=?|>=?|<|>|==|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\s*(\d+)\s*$/i,
                builder: (match) => {
                    const action = match[1].toLowerCase();
                    const targetValue = parseInt(match[2]);
                    const startIdx = parseInt(match[3]);
                    const endIdx = parseInt(match[4]);
                    const operator = this._normalizeOperator(match[5]);
                    const value = parseInt(match[6]);

                    const displayOperator = operator === '<=' ? '≤' : operator === '>=' ? '≥' : operator;

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${action} ${targetValue} quando os dígitos #${startIdx} ao #${endIdx} ${operator} ${value}`,
                        "displayFormat": `Entrar ${action.toUpperCase()} ${targetValue} quando #${startIdx}..#${endIdx} ${displayOperator} ${value}`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_value",
                            "predictionAction": action,
                            "targetValue": targetValue,
                            "startIndex": startIdx,
                            "endIndex": endIdx,
                            "count": 1,
                            "explicitPrediction": true,
                            "condition": {
                                "type": operator,
                                "value": value
                            }
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "startIndex": startIdx,
                        "endIndex": endIdx,
                        "targetValue": targetValue,
                        "predictionAction": action,
                        "predictionType": "conditional_value",
                        "condition": {
                            "type": operator,
                            "value": value
                        },
                        "parameters_ui": [
                            {
                                "key": "param_start",
                                "label": "Início (#)",
                                "value": startIdx,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.startIndex"
                            },
                            {
                                "key": "param_end",
                                "label": "Fim (#)",
                                "value": endIdx,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.endIndex"
                            }
                        ]
                    };
                }
            },
            {
                id: 'action_last_digits_simple',
                // Regex: "Entrar Over 3 quando ultimos 2 digitos <= 2"
                pattern: /^\s*[\*\-]?\s*(?:entrar\s+)?(?:quando\s+|se\s+|caso\s+|onde\s+)?(differ|match|over|under)\s+(\d+(?:\.\d+)?)\s+(?:quando|se|caso|onde|\-)\s+(?:os\s+)?[uú]ltimos\s+(\d+)\s+d[ií]gitos\s*(<=|>=|<=?|>=?|<|>|==|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\s*(\d+)\s*$/i,
                builder: (match) => {
                    const action = match[1].toLowerCase();
                    const targetValue = parseInt(match[2]);
                    const count = parseInt(match[3]);
                    const operator = this._normalizeOperator(match[4]);
                    const value = parseInt(match[5]);

                    // Display friendly operator
                    const displayOperator = operator === '<=' ? '≤' : operator === '>=' ? '≥' : operator;

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${action} ${targetValue} quando os últimos ${count} dígitos ${operator} ${value}`,
                        "displayFormat": `Entrar ${action.toUpperCase()} ${targetValue} quando últimos ${count} dígitos ${displayOperator} ${value}`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_value",
                            "predictionAction": action,
                            "targetValue": targetValue,
                            "parameter_key": "param_last_digits_count_g1r1",
                            "explicitPrediction": true,
                            "condition": {
                                "type": operator,
                                "value": value,
                                "parameter_key": "param_threshold_g1r1"
                            },
                            "count": count
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "count": count,
                        "targetValue": targetValue,
                        "predictionAction": action,
                        "predictionType": "conditional_value",
                        "condition": {
                            "type": operator,
                            "value": value,
                            "parameter_key": "param_threshold_g1r1"
                        },
                        "parameters_ui": [
                            {
                                "key": "param_g1_r1_count",
                                "label": "Qtd. Últimos Dígitos (G1R1)",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            },
                            {
                                "key": "param_g1_r1_targetValue",
                                "label": "Valor Alvo (G1R1)",
                                "value": targetValue,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.targetValue"
                            },
                            {
                                "key": "param_g1_r1_conditionValue",
                                "label": "Condição Valor (G1R1)",
                                "value": value,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.condition.value"
                            }
                        ]
                    };
                }
            },
            {
                id: 'last_digits_simple',
                // Regex: "[entrar over 2] ultimos X digitos <= Y"
                pattern: new RegExp(`${this.contractPrefix}(?:os\\s+)?[uú]ltimos\\s+(\\d+)\\s+d[ií]gitos\\s*(<=|<|>=|>|==|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\\s*(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const count = parseInt(match[3]);
                    const operator = this._normalizeOperator(match[4]);
                    const value = parseInt(match[5]);

                    return {
                        "type": "last_digits",
                        "description": `Entrar quando ultimos ${count} digitos ${operator} ${value}`,
                        "displayFormat": `Últimos ${count} dígitos: ${'X,'.repeat(count).slice(0, -1)} ${operator} ${value}`,
                        "count": count,
                        "operator": operator,
                        "value": value,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": "last_digits",
                            "count": count,
                            "parameter_key_count": "param_last_digits_count",
                            "operator": operator,
                            "value": value,
                            "contractType": action,
                            "contractPrediction": prediction,
                            "parameter_key_value": "param_threshold"
                        },

                        // Parâmetros editáveis na UI
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Dígitos",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            },
                            {
                                "key": "param_value",
                                "label": "Valor Limite",
                                "value": value,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.value"
                            }
                        ]
                    };
                }
            },
            {
                id: 'allowed_digits_simple',
                // Regex: "[entrar over 2] [X últimos/últimos X] digitos = (A,B,C...)"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:últimos|ultimos)\\s+(\\d+)|(\\d+)\\s+(?:últimos|ultimos)|(\\d+))?\\s*d[ií]gitos?\\s*(?:for\\s+|seja\\s+|est[aá]|é|match|nos|valor\\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual|s[ãa]o|sejam)(?:\\s+a|\\s+de|\\s+que)?\\s*\\(?([0-9,\\s]+)\\)?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const countRaw = match[3] || match[4] || match[5];
                    const count = countRaw ? parseInt(countRaw) : null;
                    const operator = match[6].toLowerCase();
                    const digitsStr = match[7];

                    let allowedDigits = [];

                    // Lógica de Intervalo (<=, >=, <, >)
                    if (['<=', '>=', '<', '>'].includes(operator)) {
                        const refValue = parseInt(digitsStr.trim());

                        if (!isNaN(refValue)) {
                            if (operator === '<=') {
                                for (let i = 0; i <= refValue; i++) allowedDigits.push(i);
                            } else if (operator === '>=') {
                                for (let i = refValue; i <= 9; i++) allowedDigits.push(i);
                            } else if (operator === '<') {
                                for (let i = 0; i < refValue; i++) allowedDigits.push(i);
                            } else if (operator === '>') {
                                for (let i = refValue + 1; i <= 9; i++) allowedDigits.push(i);
                            }

                            allowedDigits = allowedDigits.filter(d => d >= 0 && d <= 9);
                        }
                    } else {
                        // Lógica de Lista
                        allowedDigits = digitsStr.split(',')
                            .map(d => parseInt(d.trim()))
                            .filter(d => !isNaN(d));
                    }

                    // Se count for undefined:
                    // - Lista: tamanho da lista
                    // - Comparação: 1 (se omitido)
                    // (count já foi extraído via robustez no início do builder)

                    if (count === null) {
                        if (!['<=', '>=', '<', '>'].includes(operator)) {
                            count = allowedDigits.length;
                        } else {
                            count = 1;
                        }
                    }

                    return {
                        "type": "allowed_digits",
                        "description": `Entrar quando os ultimos ${count} digitos ${operator} (${allowedDigits.join(',')})`,
                        "displayFormat": `Últimos ${count} dígitos ${operator} ${digitsStr} (${allowedDigits.length} permitidos)`,
                        "count": count,
                        "allowedDigits": allowedDigits,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": "allowed_digits",
                            "count": count,
                            "allowedDigits": allowedDigits,
                            "contractType": action,
                            "contractPrediction": prediction
                        },

                        // Parametros para UI
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Dígitos",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            }
                        ]
                    };
                }
            },
            {
                id: 'rsi_advanced',
                // Regex: "[entrar over 2] rsi(100) > 70"
                pattern: new RegExp(`${this.contractPrefix}rsi\\s*(?:\\(?(\\d+)\\)?)?\\s*(>|>=|<|<=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\\s*(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    let actionRaw = match[1] ? match[1].toLowerCase() : null;
                    let action = actionRaw;
                    const prediction = match[2] ? parseFloat(match[2]) : null;

                    // Normalização de ações para o motor (fall/rise -> put/call)
                    if (action === 'rise' || action === 'call') action = 'call';
                    if (action === 'fall' || action === 'put') action = 'put';

                    const period = match[3] ? parseInt(match[3]) : 14;
                    const operator = this._normalizeOperator(match[4]);
                    const value = parseInt(match[5]);
                    const explicitPrediction = !!(action || prediction);

                    const description = `entrar ${actionRaw || ''} quando rsi(${period}) ${operator} ${value}`.replace(/\s+/g, ' ').trim();

                    return {
                        "type": "dynamic_prediction",
                        "description": description,
                        "displayFormat": `Entrar ${action ? action.toUpperCase() : ''} se RSI(${period}) ${operator} ${value}`.replace(/\s+/g, ' ').trim(),
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_rsi",
                            "predictionAction": action,
                            "targetValue": prediction || action,
                            "explicitPrediction": explicitPrediction,
                            "combinedRule": {
                                "rsiRule": {
                                    "type": "rsi",
                                    "period": period,
                                    "operator": operator,
                                    "value": value
                                }
                            },
                            "count": 1
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "targetValue": prediction || action,
                        "predictionAction": action,
                        "predictionType": "conditional_rsi"
                    };
                }
            },
            {
                id: 'sma_advanced',
                // Regex: "[entrar over 2] sma(10) > sma(20)"
                pattern: new RegExp(`${this.contractPrefix}sma\\s*(?:\\(?(\\d+)\\)?)?\\s*(>|>=|<|<=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\\s*(?:sma\\s*(?:\\(?(\\d+)\\)?)?|(\\d+(?:\\.\\d+)?))\\s*$`, 'i'),
                builder: (match) => {
                    let actionRaw = match[1] ? match[1].toLowerCase() : null;
                    let action = actionRaw;
                    const prediction = match[2] ? parseFloat(match[2]) : null;

                    if (action === 'rise' || action === 'call') action = 'call';
                    if (action === 'fall' || action === 'put') action = 'put';

                    const period1 = match[3] ? parseInt(match[3]) : 14;
                    const operator = this._normalizeOperator(match[4]);

                    const isSmaComparison = match[5] !== undefined;
                    const period2 = isSmaComparison ? (match[5] ? parseInt(match[5]) : 20) : null;
                    const value = !isSmaComparison ? parseFloat(match[6]) : null;

                    const explicitPrediction = !!(action || prediction);
                    const targetText = isSmaComparison ? `SMA(${period2})` : value;
                    const description = `entrar ${actionRaw || ''} quando sma(${period1}) ${operator} ${targetText}`.replace(/\s+/g, ' ').trim();

                    return {
                        "type": "dynamic_prediction",
                        "description": description,
                        "displayFormat": `Entrar ${action ? action.toUpperCase() : ''} se SMA(${period1}) ${operator} ${targetText}`.replace(/\s+/g, ' ').trim(),
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_sma",
                            "predictionAction": action,
                            "targetValue": prediction || action,
                            "explicitPrediction": explicitPrediction,
                            "combinedRule": {
                                "smaRule": {
                                    "type": "sma",
                                    "period1": period1,
                                    "operator": operator,
                                    ...(isSmaComparison ? { period2 } : { value })
                                }
                            },
                            "count": 1
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "targetValue": prediction || action,
                        "predictionAction": action,
                        "predictionType": "conditional_sma"
                    };
                }
            },
            {
                id: 'percentage_digit_simple',
                // Regex: "[entrar over 2] percentual do dígito 1 > 32%"
                pattern: new RegExp(`${this.contractPrefix}(?:a\\s+|o\\s+|as\\s+|os\\s+)?(?:percentual|porcentagem)\\s+(?:do|dos|da|das)\\s+d[ií]gitos?\\s+(\\d+)\\s*([ií]nferior|superior|abaixo|acima|menor|maior|igual|for|seja|est[aá]|é|nos|valor\\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)(?:\\s+(?:a|de|que))?\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const digitValue = parseInt(match[3]);
                    const operator = this._normalizeOperator(match[5]);
                    const targetPercentage = parseInt(match[6]);

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar quando o percentual do dígito ${digitValue} ${operator} ${targetPercentage}%`,
                        "displayFormat": `Entrar ${action ? action.toUpperCase() : ''} ${prediction !== null ? prediction : ''} se percentual do digito ${digitValue} ${operator} ${targetPercentage}%`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_percentage",
                            "predictionAction": action,
                            "targetValue": prediction,
                            "explicitPrediction": !!(action || prediction),
                            "combinedRule": {
                                "percentageRule": {
                                    "type": "percentage",
                                    "allowedDigits": [digitValue],
                                    "operator": operator,
                                    "targetPercentage": targetPercentage,
                                    "period": 25
                                }
                            },
                            "count": 1
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "targetValue": prediction,
                        "predictionAction": action,
                        "predictionType": "conditional_percentage",
                        "combinedRule": {
                            "percentageRule": {
                                "type": "percentage",
                                "allowedDigits": [digitValue],
                                "operator": operator,
                                "targetPercentage": targetPercentage,
                                "period": 25
                            }
                        },
                        "count": 1,

                        // Parâmetros editáveis na UI
                        "parameters_ui": [
                            {
                                "key": "param_threshold",
                                "label": "Dígito Referência",
                                "value": digitValue,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.allowedDigits[0]"
                            },
                            {
                                "key": "param_percentage",
                                "label": "Percentual Alvo",
                                "value": targetPercentage,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.targetPercentage"
                            }
                        ]
                    };
                }
            },
            {
                id: 'percentage_group',
                // Regex: "[entrar over 2] percentual dos digitos (3,6,8) > 40%"
                pattern: new RegExp(`${this.contractPrefix}(?:a\\s+|o\\s+|as\\s+|os\\s+)?(?:percentual|porcentagem)\\s+(?:do|de\\s+)?(?:dos\\s+)?d[ií]gitos\\s*\\(([\\d\\s,]+)\\)\\s*(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual|s[ãa]o|sejam|inferiores|superiores)(?:\\s+(?:a|de|que))?\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const digitsRaw = match[3];
                    const operatorRaw = match[4];
                    const targetPercentage = parseInt(match[5]);
                    const allowedDigits = digitsRaw.split(/[^\d]+/).filter(x => x !== "").map(Number);

                    const description = `entrar quando o percentual dos digitos (${allowedDigits.join(',')}) ${operatorRaw} ${targetPercentage}%`;

                    return {
                        "type": "dynamic_prediction",
                        "description": description,
                        "displayFormat": `Percentual dos dígitos (${allowedDigits.join(',')}) ${operatorRaw} ${targetPercentage}%`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_percentage",
                            "predictionAction": action,
                            "targetValue": prediction || action,
                            "explicitPrediction": !!(action || prediction),
                            "combinedRule": {
                                "percentageRule": {
                                    "type": "percentage",
                                    "allowedDigits": allowedDigits,
                                    "operator": operatorRaw,
                                    "targetPercentage": targetPercentage,
                                    "period": 25
                                }
                            },
                            "count": 1
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "predictionType": "conditional_percentage",
                        "combinedRule": {
                            "percentageRule": {
                                "type": "percentage",
                                "allowedDigits": allowedDigits,
                                "operator": operatorRaw,
                                "targetPercentage": targetPercentage,
                                "period": 25
                            }
                        }
                    };
                }
            },
            {
                id: 'percentage_simple',
                // Regex: "[entrar over 2] percentual dos digitos superiores a 5 > 40%"
                pattern: new RegExp(`${this.contractPrefix}(?:a\\s+|o\\s+|as\\s+|os\\s+)?(?:percentual|porcentagem)\\s+(?:do|de\\s+)?(?:dos\\s+)?d[ií]gitos?\\s*(?:for\\s+|seja\\s+|est[aá]|é|match|nos|valor\\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual|s[ãa]o|sejam|inferiores|superiores)(?:\\s+(?:a|de|que))?\\s*(\\d+)\\s*(?:for\\s+|seja\\s+|est[aá]|é|match|nos|valor\\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)(?:\\s+(?:a|de|que))?\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const conditionRaw = match[3].toLowerCase();
                    const digitValue = parseInt(match[4]);
                    const operator = match[5];
                    const targetPercentage = parseInt(match[6]);

                    // Mapeamento robusto de condição
                    let conditionType = 'equal';
                    const cLow = conditionRaw.toLowerCase();
                    if (cLow.includes('inferior') || cLow.includes('abaixo') || cLow.includes('menor') || cLow === '<' || cLow === '<=') {
                        conditionType = (cLow.includes('igual') || cLow === '<=') ? 'below_or_equal' : 'below';
                    } else if (cLow.includes('superior') || cLow.includes('acima') || cLow.includes('maior') || cLow === '>' || cLow === '>=') {
                        conditionType = (cLow.includes('igual') || cLow === '>=') ? 'above_or_equal' : 'above';
                    }

                    return {
                        "type": "percentage",
                        "description": `Entrar quando percentual dos digitos ${conditionRaw} ${digitValue} ${operator} ${targetPercentage}%`,
                        "displayFormat": `Percentual dos dígitos ${conditionRaw} ${digitValue} ${operator} ${targetPercentage}%`,
                        "conditionType": conditionType,
                        "value": digitValue,
                        "operator": operator,
                        "targetPercentage": targetPercentage,
                        "period": 25,
                        "status": "waiting",
                        "currentValue": null,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": "percentage",
                            "conditionType": conditionType,
                            "value": digitValue,
                            "operator": operator,
                            "targetPercentage": targetPercentage,
                            "period": 25,
                            "contractType": action,
                            "contractPrediction": prediction
                        }
                    };
                }
            },
            {
                id: 'action_percentage_simple',
                // Regex: "entrar over 2 quando percentual dos digitos inferiores a 3 > 60%"
                pattern: new RegExp(`${this.contractPrefix}(?:a\\s+|o\\s+|as\\s+|os\\s+)?(?:percentual|porcentagem)\\s+(?:do|de|dos|das)?\\s*(?:d[ií]gitos?|valor)?\\s*(?:for\\s+|seja\\s+|est[aá]|é|match|nos|valor\\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual|s[ãa]o|sejam|inferiores|superiores)?(?:\\s+(?:a|de|que))?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:for\\s+|seja\\s+|est[aá]|é|match|nos|valor\\s+)?(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)(?:\\s+(?:a|de|que))?\\s*(\\d+(?:\\.\\d+)?)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const conditionRaw = match[3] ? match[3].toLowerCase() : 'equal';
                    const digitValue = parseInt(match[4]);
                    const operator = match[5];
                    const targetPercentage = parseInt(match[6]);

                    // Mapeamento robusto de condição
                    let conditionType = 'equal';
                    const cLow = conditionRaw.toLowerCase();
                    if (cLow.includes('inferior') || cLow.includes('abaixo') || cLow.includes('menor') || cLow === '<' || cLow === '<=') {
                        conditionType = (cLow.includes('igual') || cLow === '<=') ? 'below_or_equal' : 'below';
                    } else if (cLow.includes('superior') || cLow.includes('acima') || cLow.includes('maior') || cLow === '>' || cLow === '>=') {
                        conditionType = (cLow.includes('igual') || cLow === '>=') ? 'above_or_equal' : 'above';
                    }

                    const description = `Entrar ${action || ''} ${prediction || ''} quando percentual dos digitos ${conditionRaw} ${digitValue} ${operator} ${targetPercentage}%`;
                    const displayFormat = `Entrar ${action ? action.toUpperCase() : ''} ${prediction || ''} se ${conditionRaw} ${digitValue} ${operator} ${targetPercentage}%`;

                    return {
                        "type": "dynamic_prediction",
                        "description": description,
                        "displayFormat": displayFormat,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_percentage",
                            "predictionAction": action,
                            "targetValue": prediction,
                            "parameter_key": "param_contract_val_g1r1",
                            "explicitPrediction": !!(action || prediction),
                            "combinedRule": {
                                "percentageRule": {
                                    "type": "percentage",
                                    "conditionType": conditionType,
                                    "value": digitValue,
                                    "parameter_key": "param_digit_val_g1r1",
                                    "operator": operator,
                                    "targetPercentage": targetPercentage,
                                    "parameter_key_target_percentage": "param_percentage_g1r1",
                                    "period": 25,
                                    "parameter_key_period": "param_period_g1r1"
                                }
                            },
                            "count": 1
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "targetValue": prediction,
                        "predictionAction": action,
                        "predictionType": "conditional_percentage",
                        "combinedRule": {
                            "percentageRule": {
                                "type": "percentage",
                                "conditionType": conditionType,
                                "value": digitValue,
                                "parameter_key": "param_digit_val_g1r1",
                                "operator": operator,
                                "targetPercentage": targetPercentage,
                                "parameter_key_target_percentage": "param_percentage_g1r1",
                                "period": 25,
                                "parameter_key_period": "param_period_g1r1"
                            }
                        },
                        "count": 1,
                        "parameter_key": "param_digit_val_g1r1",
                        "operator": operator,
                        "targetPercentage": targetPercentage,
                        "parameter_key_target_percentage": "param_percentage_g1r1",
                        "period": 25,
                        "parameter_key_period": "param_period_g1r1",

                        // Parâmetros UI
                        "parameters_ui": [
                            {
                                "key": "param_targetValue",
                                "label": "Valor Alvo (Ação)",
                                "value": prediction,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.targetValue"
                            },
                            {
                                "key": "param_percentage",
                                "label": "Percentual Alvo",
                                "value": targetPercentage,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.targetPercentage"
                            },
                            {
                                "key": "param_digit_ref",
                                "label": "Dígito Referência",
                                "value": digitValue,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.value"
                            }
                        ]
                    };
                }
            },
            {
                id: 'percentage_any_digit',
                // Regex: "[entrar differ] percentual do digito > 28%" (sem especificar qual digito)
                pattern: new RegExp(`${this.contractPrefix}(?:a\\s+|o\\s+|as\\s+|os\\s+)?(?:percentual|porcentagem)\\s+(?:do|de\\s+|dos\\s+)?d[ií]gitos?(?!\\s+\\d|\\s*\\()\\s*(?:seja|for|est[aá]|é|com|valor\\s+)?\\s*(<=|>=|<|>|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual|s[ãa]o|sejam|inferiores|superiores)(?:\\s+(?:a|de|que))?\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const operator = this._normalizeOperator(match[3]);
                    const targetPercentage = parseInt(match[4]);

                    const description = `Entrar quando percentual de qualquer dígito ${operator} ${targetPercentage}%`;
                    const predictionType = (action === 'differ' || action === 'diff') ? "percentage_digit_inverse" : "percentage_digit_match";

                    return {
                        "type": "dynamic_prediction",
                        "description": description,
                        "displayFormat": `Qualquer dígito com percentual ${operator} ${targetPercentage}%`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": predictionType,
                            "predictionAction": action,
                            "targetValue": prediction,
                            "combinedRule": {
                                "percentageRule": {
                                    "type": "percentage",
                                    "operator": operator,
                                    "targetPercentage": targetPercentage,
                                    "conditionType": "individual_digits",
                                    "period": 25
                                }
                            },
                            "count": 1
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "parameters_ui": [
                            {
                                "key": "param_percentage",
                                "label": "Percentual Alvo",
                                "value": targetPercentage,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.targetPercentage"
                            }
                        ]
                    };
                }
            },
            {
                id: 'action_parity_percentage',
                // Regex: "[entrar over 2] percentual dos digitos pares > 30%"
                pattern: new RegExp(`${this.contractPrefix}(?:a\\s+|o\\s+|as\\s+|os\\s+)?(?:percentual|porcentagem)\\s+(?:d[oe]s?\\s+d[ií]gitos?\\s+|d[oe]\\s+|d[oe]s?\\s+)?(par(?:es)?|[ií]mpar(?:es)?)\\s*(>|>=|<|<=)\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const parityRaw = match[3].toLowerCase();
                    const operator = match[4];
                    const targetPercentage = parseInt(match[5]);
                    const conditionType = (parityRaw === 'pares' || parityRaw === 'par') ? 'even' : 'odd';
                    const parityLabel = conditionType === 'even' ? 'pares' : 'ímpares';

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${action || ''} ${prediction || ''} quando o percentual dos digitos ${parityLabel} ${operator} ${targetPercentage}%`,
                        "displayFormat": `Entrar ${action ? action.toUpperCase() : ''} ${prediction || ''} se percentual dos ${parityLabel} ${operator} ${targetPercentage}%`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_percentage",
                            "predictionAction": action,
                            "targetValue": prediction,
                            "explicitPrediction": !!(action || prediction),
                            "combinedRule": {
                                "percentageRule": {
                                    "type": "percentage",
                                    "conditionType": conditionType,
                                    "operator": operator,
                                    "targetPercentage": targetPercentage,
                                    "period": 25
                                }
                            }
                        }
                    };
                }
            },
            {
                id: 'action_parity_count',
                // Regex: "[entrar over 2] [5 últimos/últimos 5] digitos for par"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:últimos|ultimos)\\s+(\\d+)|(\\d+)\\s+(?:últimos|ultimos)|(\\d+))\\s+d[ií]gitos?\\s+(?:forem\\s+|for\\s+)?(par(?:es)?|[ií]mpar(?:es)?|even|odd)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const count = parseInt(match[3] || match[4] || match[5]);
                    const parityRaw = match[6].toLowerCase();
                    const jsonParity = (parityRaw === 'pares' || parityRaw === 'par') ? 'even' : 'odd';
                    const displayParity = jsonParity === 'even' ? 'pares' : 'ímpares';

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${action || ''} ${prediction || ''} quando os ultimos ${count} digitos for ${jsonParity}`,
                        "displayFormat": `Entrar ${action ? action.toUpperCase() : ''} ${prediction || ''} quando últimos ${count} dígitos ${displayParity}`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_value",
                            "predictionAction": action,
                            "targetValue": prediction,
                            "explicitPrediction": !!(action || prediction),
                            "count": count,
                            "condition": {
                                "type": "digit_parity",
                                "parity": jsonParity
                            }
                        }
                    };
                }
            },
            {
                id: 'parity_percentage',
                // Regex: "[entrar over 2] percentual dos digitos pares > 70%"
                pattern: new RegExp(`${this.contractPrefix}(?:a\\s+|o\\s+|as\\s+|os\\s+)?(?:percentual|porcentagem)\\s+(?:d[oe]s?\\s+d[ií]gitos?\\s+|d[oe]s?\\s+)?(par(?:es)?|[ií]mpar(?:es)?)\\s*(>|>=|<|<=)\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const parityRaw = match[3].toLowerCase();
                    const operator = match[4];
                    const targetPercentage = parseInt(match[5]);
                    const conditionType = (parityRaw === 'pares' || parityRaw === 'par') ? 'even' : 'odd';
                    const parityLabel = conditionType === 'even' ? 'pares' : 'ímpares';

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${action || ''} ${prediction || ''} quando percentual dos digitos ${parityLabel} ${operator} ${targetPercentage}%`,
                        "displayFormat": `Entrar ${action ? action.toUpperCase() : ''} ${prediction || ''} se percentual dos ${parityLabel} ${operator} ${targetPercentage}%`,
                        "predictionType": "conditional_percentage",
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "explicitPrediction": !!(action || prediction),
                            "predictionType": "conditional_percentage",
                            "predictionAction": action,
                            "targetValue": prediction,
                            "combinedRule": {
                                "percentageRule": {
                                    "type": "percentage",
                                    "conditionType": conditionType,
                                    "operator": operator,
                                    "targetPercentage": targetPercentage,
                                    "parameter_key": "param_target_percentage",
                                    "period": 25,
                                    "period_parameter_key": "param_period"
                                }
                            },
                            "count": 2
                        },
                        // Espelhamento para estabilidade de log/formatação
                        "predictionType": "conditional_percentage",
                        "combinedRule": {
                            "percentageRule": {
                                "type": "percentage",
                                "conditionType": conditionType,
                                "operator": operator,
                                "targetPercentage": targetPercentage,
                                "period": 25
                            }
                        },
                        "count": 2,

                        // Parâmetros para UI
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Últimos Dígitos",
                                "value": 2,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            },
                            {
                                "key": "param_parity",
                                "label": "Paridade (even/odd)",
                                "value": conditionType,
                                "type": "text",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.conditionType"
                            },
                            {
                                "key": "param_target_percentage",
                                "label": "Percentual Alvo",
                                "value": targetPercentage,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.targetPercentage"
                            },
                            {
                                "key": "param_period",
                                "label": "Período Percentual",
                                "value": 25,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.period"
                            }
                        ]
                    };
                }
            },

            {
                id: 'differ_percentage_simple',
                // Regex: "[entrar over 2] differ do digito com percentual > X%"
                pattern: new RegExp(`${this.contractPrefix}(over|under|differ|match)\\s+do\\s+d[ií]gito\\s+com\\s+(?:percentual|porcentagem)\\s*(>|>=|<|<=)\\s*(\\d+)%?\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const dynamicAction = match[3].toLowerCase(); // differ/match/over/under
                    const operator = match[4];
                    const percentageValue = parseInt(match[5]);

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${dynamicAction} do digito com percentual ${operator} ${percentageValue}%`,
                        "displayFormat": `Entrar ${dynamicAction.toUpperCase()} do dígito se percentual ${operator} ${percentageValue}%`,
                        "targetValue": "dynamic_highest_percentage_digit",
                        "predictionAction": action || dynamicAction,
                        "predictionType": "conditional_percentage",
                        "count": 2,
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_percentage",
                            "predictionAction": action || dynamicAction,
                            "targetValue": prediction || "dynamic_highest_percentage_digit", // Assumindo lógica de maior percentual
                            "explicitPrediction": true,
                            "combinedRule": {
                                "percentageRule": {
                                    "type": "percentage",
                                    "operator": operator,
                                    "targetPercentage": percentageValue,
                                    "parameter_key": "param_percentage_g1r1",
                                    "period": 25 // Padrão
                                }
                            },
                            "count": 2 // Padrão do JSON enviado
                        },
                        // Espelhamento para estabilidade de log/formatação
                        "combinedRule": {
                            "percentageRule": {
                                "type": "percentage",
                                "operator": operator,
                                "targetPercentage": percentageValue,
                                "period": 25
                            }
                        },

                        // Parâmetros editáveis na UI
                        "parameters_ui": [
                            {
                                "key": "param_percentage_value",
                                "label": "Percentual Alvo",
                                "value": percentageValue,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.targetPercentage"
                            },
                            {
                                "key": "param_percentage_period",
                                "label": "Período",
                                "value": 25,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.combinedRule.percentageRule.period"
                            }
                        ]
                    };
                }
            },
            {
                id: 'property_mirroring_simple',
                // Regex: "[entrar over 2] [2 últimos/últimos 2] digitos = menor chance"
                pattern: new RegExp(`${this.contractPrefix}(?:(?:últimos|ultimos)\\s+(\\d+)|(\\d+)\\s+(?:últimos|ultimos)|(\\d+))?\\s*d[ií]gitos?\\s*(?:=|==|s[ãa]o|sejam|igual|for|seja|match|est[aá]|é)?\\s*(?:de\\s+|com\\s+|da\\s+)?(menor|maior)\\s+chance\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const count = parseInt(match[3] || match[4] || match[5] || "1");
                    const probType = match[6].toLowerCase(); // menor ou maior
                    const targetVariable = probType === 'maior' ? '$HIGHER_PROB' : '$LOWER_PROB';

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${action || ''} ${prediction || ''} quando ultimos ${count} digitos = ${probType} chance`,
                        "displayFormat": `Últimos ${count} dígitos = ${probType} chance`,
                        "targetValue": prediction || targetVariable,
                        "predictionAction": action || "differ", // Default common action for mirroring
                        "predictionType": "last_digit_probability_match",
                        "count": count,
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionAction": action || "differ",
                            "targetValue": prediction || targetVariable,
                            "explicitPrediction": !!(action || prediction),
                            "predictionType": "last_digit_probability_match",
                            "count": count,
                            "condition": {
                                "type": "last_digit_probability_match",
                                "probabilityVariable": targetVariable
                            }
                        },
                        "condition": {
                            "type": "last_digit_probability_match",
                            "probabilityVariable": targetVariable
                        },
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Dígitos",
                                "value": count,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            }
                        ]
                    };
                }
            },
            {
                id: 'mirroring_last_digit',
                // Regex: "[entrar differ] do ultimo digito"
                pattern: new RegExp(`${this.contractPrefix}do\\s+[uú]ltimo\\s+d[ií]gito\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;

                    return {
                        "type": "dynamic_prediction",
                        "description": `entrar ${action || 'differ'} do ultimo digito`,
                        "displayFormat": `Entrar ${(action || 'differ').toUpperCase()} do último dígito`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionAction": action || "differ",
                            "targetValue": prediction || "$LAST_DIGIT",
                            "predictionType": "last_digit",
                            "explicitPrediction": !!(action || prediction),
                            "count": 2
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "targetValue": prediction || "$LAST_DIGIT",
                        "predictionAction": action || "differ",
                        "predictionType": "last_digit",
                        "count": 2,
                        "parameters_ui": [
                            {
                                "key": "param_g1_r1_count",
                                "label": "Qtd. Últimos Dígitos (G1R1)",
                                "value": 2,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            }
                        ]
                    };
                }
            },
            {
                id: 'action_prob_match',
                // Regex: "[entrar over 2] [over|under] do digito de menor chance"
                pattern: new RegExp(`${this.contractPrefix}(over|under|differ|match)\\s+do\\s+d[ií]gito\\s+(?:de\\s+|com\\s+|da\\s+)?(menor|maior)\\s+chance\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const dynamicAction = match[3].toLowerCase();
                    const probType = match[4].toLowerCase();
                    const targetVariable = probType === 'maior' ? '$HIGHER_PROB' : '$LOWER_PROB';

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${dynamicAction} do digito ${probType} chance`,
                        "displayFormat": `Entrar ${dynamicAction.toUpperCase()} quando último dígito = ${probType} chance`,
                        "targetValue": prediction || targetVariable,
                        "predictionAction": action || dynamicAction,
                        "predictionType": "last_digit_probability_match",
                        "count": 1,
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionAction": action || dynamicAction,
                            "targetValue": prediction || targetVariable,
                            "explicitPrediction": true,
                            "predictionType": "last_digit_probability_match",
                            "count": 1,
                            "condition": {
                                "type": "last_digit_probability_match",
                                "probabilityVariable": targetVariable
                            }
                        },
                        // Espelhamento para estabilidade de log/formatação
                        "condition": {
                            "type": "last_digit_probability_match",
                            "probabilityVariable": targetVariable
                        },

                        // Parâmetros editáveis na UI
                        "parameters_ui": [
                            {
                                "key": "param_count",
                                "label": "Qtd. Dígitos",
                                "value": 1,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            }
                        ]
                    };
                }
            },
            {
                id: 'over_condition_last_digits_le',
                // Regex: "[entrar under 1] over 5 quando os ultimos 2 digitos <= 2"
                pattern: new RegExp(`${this.contractPrefix}over\\s+(\\d+)\\s+quando\\s+(?:os\\s+)?[uú]ltimos\\s*(?:(\\d+)\\s+)?d[ií]gitos\\s*(<=|<|>=|>|==|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\\s*(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const overValue = parseInt(match[3]);
                    const count = match[4] ? parseInt(match[4]) : 1;
                    let operator = match[5];
                    if (operator === '=') operator = '==';
                    const conditionValue = parseInt(match[6]);

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${action || ''} over ${overValue} quando os ultimos ${count} digitos ${operator} ${conditionValue}`,
                        "displayFormat": `Previsão dinâmica: Entrar over ${overValue} quando os ultimos ${count} digitos ${operator} ${conditionValue}`,
                        "predictionAction": action || "over",
                        "targetValue": prediction || overValue,
                        "predictionType": "conditional_value",
                        "count": count,
                        "status": "waiting",
                        "currentValue": null,
                        "condition": {
                            "type": operator,
                            "value": conditionValue
                        },
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_value",
                            "predictionAction": action || "over",
                            "targetValue": prediction || overValue,
                            "explicitPrediction": true,
                            "condition": {
                                "type": operator,
                                "value": conditionValue
                            },
                            "count": count
                        }
                    };
                }
            },
            {
                id: 'under_condition_last_digits_le',
                // Regex: "[entrar over 2] under 5 quando os ultimos 2 digitos >= 7"
                pattern: new RegExp(`${this.contractPrefix}under\\s+(\\d+)\\s+quando\\s+(?:os\\s+)?[uú]ltimos\\s*(?:(\\d+)\\s+)?d[ií]gitos\\s*(<=|<|>=|>|==|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\\s*(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const underValue = parseInt(match[3]);
                    const count = match[4] ? parseInt(match[4]) : 1;
                    let operator = match[5];
                    if (operator === '=') operator = '==';
                    const conditionValue = parseInt(match[6]);

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${action || ''} under ${underValue} quando os ultimos ${count} digitos ${operator} ${conditionValue}`,
                        "displayFormat": `Previsão dinâmica: Entrar under ${underValue} quando os ultimos ${count} digitos ${operator} ${conditionValue}`,
                        "predictionAction": action || "under",
                        "targetValue": prediction || underValue,
                        "predictionType": "conditional_value",
                        "count": count,
                        "status": "waiting",
                        "currentValue": null,
                        "condition": {
                            "type": operator,
                            "value": conditionValue
                        },
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionType": "conditional_value",
                            "predictionAction": action || "under",
                            "targetValue": prediction || underValue,
                            "explicitPrediction": true,
                            "condition": {
                                "type": operator,
                                "value": conditionValue
                            },
                            "count": count
                        }
                    };
                }
            },
            {
                id: 'over_simple',
                // Regex: "[entrar over 2] over 5"
                pattern: new RegExp(`${this.contractPrefix}over\\s+(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const value = parseInt(match[3]);
                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar Over ${value}`,
                        "displayFormat": `Entrar Over ${value}`,
                        "targetValue": prediction || value,
                        "predictionAction": action || "over",
                        "predictionType": "conditional_value",
                        "explicitPrediction": true,
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "targetValue": prediction || value,
                            "predictionAction": action || "over",
                            "explicitPrediction": true,
                            "predictionType": "conditional_value"
                        }
                    };
                }
            },
            {
                id: 'under_simple',
                // Regex: "[entrar over 2] under 5"
                pattern: new RegExp(`${this.contractPrefix}under\\s+(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const value = parseInt(match[3]);
                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar Under ${value}`,
                        "displayFormat": `Entrar Under ${value}`,
                        "targetValue": prediction || value,
                        "predictionAction": action || "under",
                        "predictionType": "conditional_value",
                        "explicitPrediction": true,
                        "status": "waiting",
                        "currentValue": null,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "targetValue": prediction || value,
                            "predictionAction": action || "under",
                            "explicitPrediction": true,
                            "predictionType": "conditional_value"
                        }
                    };
                }
            },
            {
                id: 'digit_probability_match',
                // Regex: "[entrar over 2] digito menor chance = 5"
                pattern: new RegExp(`${this.contractPrefix}d[ií]gito\\s+(menor|maior)\\s+chance\\s*=\\s*(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const prediction = match[2] ? parseFloat(match[2]) : null;
                    const probType = match[3].toLowerCase();
                    const value = parseInt(match[4]);
                    const probVar = probType === 'menor' ? '$LOWER_PROB' : '$HIGHER_PROB';
                    const probLabel = probType === 'menor' ? 'menor' : 'maior';

                    return {
                        "type": "dynamic_prediction",
                        "description": `Entrar ${action || ''} quando digito ${probType} chance = ${value}`,
                        "displayFormat": `Entrar ${action ? action.toUpperCase() : 'MATCH'} quando dígito ${probLabel} chance = ${value}`,
                        "contractType": action,
                        "contractPrediction": prediction,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionAction": action || "match",
                            "targetValue": prediction || probVar,
                            "explicitPrediction": !!(action || prediction),
                            "contractType": action,
                            "contractPrediction": prediction,
                            "count": 1,
                            "condition": {
                                "type": "last_digit_probability_match",
                                "probabilityVariable": probVar,
                                "value": value
                            }
                        }
                    };
                }
            },
            {
                id: 'prob_comparison_simple',
                // Regex: "entrar quando menor chance > 5"
                pattern: new RegExp(`${this.contractPrefix}(?:quando\\s+)?(menor|maior)\\s+chance\\s*(>|<|>=|<=|==|=|[ií]nferior|superior|abaixo|acima|menor|maior|igual)\\s*(\\d+)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const predictionValue = match[2] ? parseFloat(match[2]) : null;
                    const probType = match[3].toLowerCase();
                    const operatorRaw = match[4];
                    const limitValue = parseInt(match[5]);

                    const probVar = probType.includes('menor') ? '$LOWER_PROB' : '$HIGHER_PROB';
                    const operator = this._normalizeOperator(operatorRaw);
                    const probLabel = probType.includes('menor') ? 'menor' : 'maior';

                    // Manter exatamente a estrutura solicitada pelo usuário no JSON
                    return {
                        "type": "dynamic_prediction",
                        "description": `entrar quando ${probLabel} chance ${operator} ${limitValue}`,
                        "displayFormat": `Entrar ${action ? action.toUpperCase() : 'MATCH'} quando último dígito = ${probLabel} chance`,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "target": probVar,
                            "operator": operator,
                            "value": limitValue,
                            "parameter_key": "param_threshold", // Será sufixado automaticamente
                            "predictionType": "last_digit_probability_match",
                            "predictionAction": action,
                            "targetValue": predictionValue || probVar,
                            "count": 1,
                            "explicitPrediction": true,
                            "condition": {
                                "type": "last_digit_probability_match",
                                "probabilityVariable": probVar
                            }
                        },
                        "status": "waiting",
                        "currentValue": null,
                        "count": 1,
                        "value": limitValue,
                        "operator": operator,
                        "targetValue": predictionValue || probVar,
                        "predictionAction": action,
                        "predictionType": "last_digit_probability_match",
                        "condition": {
                            "type": "last_digit_probability_match",
                            "probabilityVariable": probVar
                        },
                        "parameters_ui": [
                            {
                                "key": "param_g1_r1_count",
                                "label": "Qtd. Últimos Dígitos",
                                "value": 1,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.count"
                            },
                            {
                                "key": "param_g1_r1_value",
                                "label": "Dígito Referência",
                                "value": limitValue,
                                "type": "number",
                                "path": "groups[0].rules[0].parameters.value"
                            }
                        ]
                    };
                }
            },
            {
                id: 'last_digit_prob_match',
                // Regex: "entrar differ do digito = menor chance"
                pattern: new RegExp(`${this.contractPrefix}(?:[uú]ltimo\\s+)?d[ií]gito\\s*(?:=|==|igual|for|seja)?\\s*(menor\\s+chance|maior\\s+chance)\\s*$`, 'i'),
                builder: (match) => {
                    const action = match[1] ? match[1].toLowerCase() : null;
                    const predictionValue = match[2] ? parseFloat(match[2]) : null;
                    const probType = match[3].toLowerCase();
                    const probVar = probType.includes('menor') ? '$LOWER_PROB' : '$HIGHER_PROB';

                    return {
                        "type": "dynamic_prediction",
                        "description": `entrar do digito = ${probType}`,
                        "displayFormat": `Entrar quando último dígito = ${probType}`,
                        "contractType": action,
                        "contractPrediction": predictionValue,
                        "parameters": {
                            "type": "dynamic_prediction",
                            "predictionAction": action,
                            "targetValue": predictionValue || probVar,
                            "explicitPrediction": !!(action || predictionValue),
                            "predictionType": "last_digit_probability_match",
                            "count": 1,
                            "condition": {
                                "type": "last_digit_probability_match",
                                "probabilityVariable": probVar
                            }
                        }
                    };
                }
            }
        ];

        this.modules = {};
    }

    /**
     * Normaliza operadores para símbolos matemáticos aceitos no sistema
     */
    _normalizeOperator(op) {
        if (!op) return '>';
        const opLower = op.trim().toLowerCase();
        if (opLower === '>=' || opLower.includes('maior ou igual') || opLower.includes('superior ou igual')) return '>=';
        if (opLower === '<=' || opLower.includes('menor ou igual') || opLower.includes('inferior ou igual')) return '<=';
        if (opLower === '>' || opLower.includes('maior') || opLower.includes('superior') || opLower.includes('acima')) return '>';
        if (opLower === '<' || opLower.includes('menor') || opLower.includes('inferior') || opLower.includes('abaixo')) return '<';
        if (opLower === '!=' || opLower.includes('diferente')) return '!=';
        if (opLower === '=' || opLower === '==' || opLower.includes('igual')) return '=';
        return op;
    }

    /**
     * Tenta encontrar um template local para a estratégia
     * @param {string} strategyText - Texto completo da estratégia
     * @returns {object|null} - Retorna o JSON completo se der match, ou null
     */
    matchStrategy(strategyText) {

        // 1. Pré-processar para dividir em grupos
        // Estratégia melhorada: Tenta identificar lista com * ou - ou linhas soltas
        // 🎯 FIX: Suporte a quebras de linha Windows e Unix
        // 🎯 FIX EXTRA: Suporte a linhas coladas (ex: * regra 1 * regra 2)
        let lines = strategyText.split(/\r?\n/);

        // Se após o split por linha ainda tivermos poucas quebras, mas muitos "*" no texto, tentar quebrar por bullet
        const bulletCount = (strategyText.match(/[\*\-]\s/g) || []).length;
        if (lines.length === 1 && bulletCount > 1) {

            // Quebrar quando encontrar " * " ou " - " ou inicio de linha
            // O lookahead (?=...) mantem o delimitador
            lines = strategyText.split(/(?=(?:^|\s)[\*\-]\s+)/).map(l => l.trim()).filter(l => l.length > 0);
        } else {
            lines = lines.map(l => l.trim()).filter(l => l.length > 0);
        }

        // Se houver marcadores explícitos (* ou -), filtrar por eles para evitar lixo
        const hasBullets = lines.some(l => l.match(/^[\*\-]\s+/));

        if (hasBullets) {
            lines = lines.filter(l => l.match(/^[\*\-]\s+/));

        }

        if (lines.length === 0) {
            console.warn("⚠️ [PROMPT MANAGER] No lines found after processing");
            return null;
        }

        // Se só tem uma linha e não tem bullet, será processada pelo loop abaixo normalmente
        // (Bloco de otimização removido pois retornava estrutura inválida sem 'groups')

        const groups = [];
        let allParameters = [];

        // 2. Processar cada grupo
        for (let i = 0; i < lines.length; i++) {
            const lineClean = lines[i].replace(/^[\*\-]\s*/, ''); // Remove o asterisco ou traço

            // 🆕 SUPORTE A MÚLTIPLAS REGRAS NA MESMA LINHA (separadas por vírgula)
            // 🎯 FIX: Ignorar vírgulas dentro de parênteses (ex: ultimos 3 digitos =(1,2,3))
            const ruleParts = lineClean.split(/,(?![^()]*\))/g).map(part => part.trim()).filter(p => p.length > 0);

            const groupRules = [];

            for (const part of ruleParts) {

                // Tentar dar match no CONTEÚDO da parte
                const matchResult = this._matchSingleRule(part);

                if (!matchResult) {

                    return null; // Se falhar em UMA parte, aborta tudo e vai pro Gemini
                }

                // Normalizar para array (suporte a templates que geram múltiplas regras)
                const ruleJsons = Array.isArray(matchResult) ? matchResult : [matchResult];

                for (const ruleJson of ruleJsons) {
                    // Se deu match, processar parâmetros
                    // 1. Parâmetros de UI (nova estrutura)
                    if (ruleJson.parameters_ui) {
                        ruleJson.parameters_ui.forEach(p => {
                            // Ajustar path para refletir o índice correto da regra no grupo
                            p.path = p.path.replace(/rules\[0\]/, `rules[${groupRules.length}]`);
                            p.path = p.path.replace(/groups\[0\]/, `groups[${i}]`);

                            // Gerar chave única para não substituir parâmetros de outras regras
                            p.key = `${p.key}_g${i + 1}_r${groupRules.length + 1}`;

                            // 🎯 FIX: Adicionar sufixo (G...R...) ao label para que o MonitoringView consiga agrupar corretamente
                            if (p.label) {
                                p.label = `${p.label} (G${i + 1}R${groupRules.length + 1})`;
                            }

                            allParameters.push(p);
                        });
                        // delete ruleJson.parameters_ui; // ♻️ MANTER para o FormatGenerator usar
                    }

                    // 2. Compatibilidade com estrutura antiga (se houver)
                    if (ruleJson.parameters && Array.isArray(ruleJson.parameters)) {
                        ruleJson.parameters.forEach(p => {
                            p.path = p.path.replace(/rules\[0\]/, `rules[${groupRules.length}]`);
                            p.path = p.path.replace(/groups\[0\]/, `groups[${i}]`);
                            p.key = `${p.key}_g${i + 1}_r${groupRules.length + 1}`;
                            allParameters.push(p);
                        });
                        delete ruleJson.parameters;
                    }

                    groupRules.push(ruleJson);
                }
            }

            groups.push({
                id: i + 1,
                rules: groupRules
            });
        }

        // 3. Sucesso total! Montar o JSON final
        return {
            groups: groups,
            action: "entry", // Padrão
            logic: groups.length > 1 ? "OR entre grupos" : "Grupo único",
            parameters: allParameters,
            source: "local_template" // Flag para debug
        };
    }

    /**
     * Verifica uma única regra contra os templates
     */
    _matchSingleRule(ruleText) {

        for (const template of this.templates) {
            // console.log(`  - Testing template: ${template.id}`);
            const match = ruleText.match(template.pattern);
            if (match) {

                return template.builder(match);
            }
        }

        return null;
    }

    /**
     * Método para registrar novos templates dinamicamente
     */
    registerTemplate(id, pattern, builder) {
        this.templates.push({ id, pattern, builder });
    }
}

// Singleton
let promptManagerInstance = null;
function getPromptManagerInstance() {
    if (!promptManagerInstance) {
        promptManagerInstance = new PromptManager();
    }
    return promptManagerInstance;
}

// Export para testes em ambiente Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PromptManager };
}
