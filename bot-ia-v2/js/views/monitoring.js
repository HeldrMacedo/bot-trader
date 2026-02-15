// js/views/monitoring.js
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

// 📦 Strategy Examples Data - Definido aqui para garantir carregamento
window.StrategyExamplesData = {
    examples: {
        "digits_under_4": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "percentage",
                    "description": "entrar quando os digitos inferiores a 4> 50%",
                    "displayFormat": "Percentual do dígitos abaixo de 3 > 50%",
                    "parameters": {
                        "type": "percentage",
                        "conditionType": "below",
                        "value": 3,
                        "parameter_key_value": "param_digit_threshold",
                        "operator": ">",
                        "targetPercentage": 50,
                        "parameter_key_target": "param_percentage_target",
                        "period": 25,
                        "parameter_key_period": "param_period"
                    },
                    "status": "waiting",
                    "currentValue": null,
                    "value": 3,
                    "targetPercentage": 50,
                    "period": 25
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_value", "label": "Dígito Referência (G1R1)", "value": 3, "type": "number", "path": "groups[0].rules[0].parameters.value" },
                { "key": "param_g1_r1_targetPercentage", "label": "Percentual Alvo (G1R1)", "value": 50, "type": "number", "path": "groups[0].rules[0].parameters.targetPercentage" },
                { "key": "param_g1_r1_period", "label": "Período Percentual (G1R1)", "value": 25, "type": "number", "path": "groups[0].rules[0].parameters.period" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* entrar quando os digitos inferiores a 4> 50%"
        },
        "last_digits_gt_8": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "last_digits",
                    "description": "Entrar quando os ultimos 3 digitos > 8",
                    "displayFormat": "Últimos 3 dígitos: X,X,X > 8",
                    "parameters": {
                        "type": "last_digits",
                        "count": 3,
                        "operator": ">",
                        "value": 8,
                        "parameter_key": "param_threshold"
                    },
                    "status": "waiting",
                    "currentValue": null
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 3, "type": "number", "path": "groups[0].rules[0].parameters.count" },
                { "key": "param_g1_r1_value", "label": "Dígito Referência (G1R1)", "value": 8, "type": "number", "path": "groups[0].rules[0].parameters.value" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* Entrar quando os ultimos 3 digitos > 8"
        },
        "digits_even_sequence": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "digit_parity",
                    "description": "Entrar quando os ultimos 5 digitos forem todos pares",
                    "displayFormat": "Últimos 5 dígitos pares",
                    "parameters": {
                        "type": "digit_parity",
                        "count": 5,
                        "parity": "even",
                        "parameter_key": "param_parity_count"
                    },
                    "status": "waiting",
                    "currentValue": null
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 5, "type": "number", "path": "groups[0].rules[0].parameters.count" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* Entrar quando os ultimos 5 digitos forem todos pares"
        },
        "specific_digit_9": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "last_digits",
                    "description": "Entrar quando ultimo digito = 9",
                    "displayFormat": "Últimos 1 dígitos: X = 9",
                    "parameters": {
                        "type": "last_digits",
                        "count": 1,
                        "operator": "=",
                        "value": 9,
                        "parameter_key": "param_digit_val"
                    },
                    "status": "waiting",
                    "currentValue": null
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" },
                { "key": "param_g1_r1_value", "label": "Dígito Referência (G1R1)", "value": 9, "type": "number", "path": "groups[0].rules[0].parameters.value" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* Entrar quando ultimo digito = 9"
        },
        "pattern_xxoo": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "dynamic_prediction",
                    "description": "Entrar quando o padrão dos digitos for XXOO",
                    "displayFormat": "Previsão dinâmica: Padrão digit_pattern",
                    "parameters": {
                        "type": "dynamic_prediction",
                        "predictionType": "conditional_pattern",
                        "explicitPrediction": false,
                        "combinedRule": {
                            "patternRule": {
                                "type": "digit_pattern",
                                "pattern": "XXOO",
                                "pattern_type": "loser_winner",
                                "parameter_key": "param_pattern_g1r1"
                            }
                        },
                        "count": 1
                    },
                    "status": "waiting",
                    "currentValue": null
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" },
                { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "XXOO", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* Entrar quando o padrão dos digitos for XXOO"
        },
        "rsi_gt_70": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "rsi",
                    "description": "Entrar quando RSI > 70",
                    "displayFormat": "RSI(14) > 70",
                    "parameters": {
                        "type": "rsi",
                        "operator": ">",
                        "value": 70,
                        "period": 14,
                        "parameter_key": "param_rsi_val"
                    },
                    "status": "waiting",
                    "currentValue": null
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_value", "label": "Dígito Referência (G1R1)", "value": 70, "type": "number", "path": "groups[0].rules[0].parameters.value" },
                { "key": "param_g1_r1_period", "label": "Período Percentual (G1R1)", "value": 14, "type": "number", "path": "groups[0].rules[0].parameters.period" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* Entrar quando RSI > 70"
        },
        "sma_10_gt_20": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "sma",
                    "description": "Entrar quando SMA 10 > SMA 20",
                    "displayFormat": "SMA(10) > SMA(20)",
                    "parameters": {
                        "type": "sma",
                        "period1": 10,
                        "operator": ">",
                        "period2": 20,
                        "period1_parameter_key": "param_sma_p1",
                        "period2_parameter_key": "param_sma_p2"
                    },
                    "status": "waiting",
                    "currentValue": null
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_period1", "label": "Período SMA 1 (G1R1)", "value": 10, "type": "number", "path": "groups[0].rules[0].parameters.period1" },
                { "key": "param_g1_r1_period2", "label": "Período SMA 2 (G1R1)", "value": 20, "type": "number", "path": "groups[0].rules[0].parameters.period2" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* Entrar quando SMA 10 > SMA 20"
        },
        "percentage_below_3_gt_40": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "percentage",
                    "description": "Entrar quando percentual de digitos abaixo de 3 > 40%",
                    "displayFormat": "Percentual do dígitos abaixo de 4 > 30%",
                    "parameters": {
                        "type": "percentage",
                        "conditionType": "below",
                        "value": 4,
                        "operator": ">",
                        "targetPercentage": 30,
                        "period": 25,
                        "parameter_key_value": "param_digit_ref",
                        "parameter_key_target": "param_percent_target"
                    },
                    "status": "waiting",
                    "currentValue": null,
                    "value": 4,
                    "targetPercentage": 30,
                    "period": 25
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_value", "label": "Dígito Referência (G1R1)", "value": 4, "type": "number", "path": "groups[0].rules[0].parameters.value" },
                { "key": "param_g1_r1_targetPercentage", "label": "Percentual Alvo (G1R1)", "value": 30, "type": "number", "path": "groups[0].rules[0].parameters.targetPercentage" },
                { "key": "param_g1_r1_period", "label": "Período Percentual (G1R1)", "value": 25, "type": "number", "path": "groups[0].rules[0].parameters.period" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* Entrar quando percentual de digitos abaixo de 3 > 40%"
        },
        "pattern_xxox": {
            "groups": [{ "id": 1, "rules": [{ "id": 1, "type": "dynamic_prediction", "description": "Entrar quando o padrão dos digitos for XXOX", "displayFormat": "Previsão dinâmica: Padrão digit_pattern", "parameters": { "type": "dynamic_prediction", "predictionType": "conditional_pattern", "explicitPrediction": false, "combinedRule": { "patternRule": { "type": "digit_pattern", "pattern": "XXOX", "pattern_type": "loser_winner", "parameter_key": "param_pattern_g1r1" } }, "count": 1 }, "status": "waiting", "currentValue": null }], "status": "inactive" }],
            "parameters": [{ "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" }, { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "XXOX", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }],
            "totalRules": 1, "logic": "OR entre grupos, AND dentro do grupo", "originalText": "* Entrar quando o padrão dos digitos for XXOX"
        },
        "pattern_xoxo": {
            "groups": [{ "id": 1, "rules": [{ "id": 1, "type": "dynamic_prediction", "description": "Entrar quando o padrão dos digitos for XOXO", "displayFormat": "Previsão dinâmica: Padrão digit_pattern", "parameters": { "type": "dynamic_prediction", "predictionType": "conditional_pattern", "explicitPrediction": false, "combinedRule": { "patternRule": { "type": "digit_pattern", "pattern": "XOXO", "pattern_type": "loser_winner" } }, "count": 1 }, "status": "waiting", "currentValue": null }], "status": "inactive" }],
            "parameters": [{ "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" }, { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "XOXO", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }],
            "totalRules": 1, "logic": "OR entre grupos, AND dentro do grupo", "originalText": "* Entrar quando o padrão dos digitos for XOXO"
        },
        "pattern_xxxo": {
            "groups": [{ "id": 1, "rules": [{ "id": 1, "type": "dynamic_prediction", "description": "Entrar quando o padrão dos digitos for XXXO", "displayFormat": "Previsão dinâmica: Padrão digit_pattern", "parameters": { "type": "dynamic_prediction", "predictionType": "conditional_pattern", "explicitPrediction": false, "combinedRule": { "patternRule": { "type": "digit_pattern", "pattern": "XXXO", "pattern_type": "loser_winner" } }, "count": 1 }, "status": "waiting", "currentValue": null }], "status": "inactive" }],
            "parameters": [{ "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" }, { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "XXXO", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }],
            "totalRules": 1, "logic": "OR entre grupos, AND dentro do grupo", "originalText": "* Entrar quando o padrão dos digitos for XXXO"
        },
        "pattern_oxxx": {
            "groups": [{ "id": 1, "rules": [{ "id": 1, "type": "dynamic_prediction", "description": "Entrar quando o padrão dos digitos for OXXX", "displayFormat": "Previsão dinâmica: Padrão digit_pattern", "parameters": { "type": "dynamic_prediction", "predictionType": "conditional_pattern", "explicitPrediction": false, "combinedRule": { "patternRule": { "type": "digit_pattern", "pattern": "OXXX", "pattern_type": "loser_winner" } }, "count": 1 }, "status": "waiting", "currentValue": null }], "status": "inactive" }],
            "parameters": [{ "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" }, { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "OXXX", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }],
            "totalRules": 1, "logic": "OR entre grupos, AND dentro do grupo", "originalText": "* Entrar quando o padrão dos digitos for OXXX"
        },
        "pattern_xoxox": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "dynamic_prediction",
                    "description": "Entrar quando o padrão dos digitos for XOXOX",
                    "displayFormat": "Previsão dinâmica: Padrão digit_pattern",
                    "parameters": {
                        "type": "dynamic_prediction",
                        "predictionType": "conditional_pattern",
                        "explicitPrediction": false,
                        "combinedRule": {
                            "patternRule": {
                                "type": "digit_pattern",
                                "pattern": "XOXOX",
                                "pattern_type": "loser_winner",
                                "parameter_key": "param_pattern_g1r1"
                            }
                        },
                        "count": 1
                    },
                    "status": "waiting",
                    "currentValue": null,
                    "count": 1
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" },
                { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "XOXOX", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* Entrar quando o padrão dos digitos for XOXOX"
        },
        "pattern_oxoxo": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "dynamic_prediction",
                    "description": "Entrar quando o padrão dos digitos for OXOXO",
                    "displayFormat": "Previsão dinâmica: Padrão digit_pattern",
                    "parameters": {
                        "type": "dynamic_prediction",
                        "predictionType": "conditional_pattern",
                        "explicitPrediction": false,
                        "combinedRule": {
                            "patternRule": {
                                "type": "digit_pattern",
                                "pattern": "OXOXO",
                                "pattern_type": "loser_winner",
                                "parameter_key": "param_pattern_g1r1"
                            }
                        },
                        "count": 1
                    },
                    "status": "waiting",
                    "currentValue": null,
                    "count": 1
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" },
                { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "OXOXO", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* Entrar quando o padrão dos digitos for OXOXO"
        },
        "pattern_ooxx": {
            "groups": [{ "id": 1, "rules": [{ "id": 1, "type": "dynamic_prediction", "description": "Entrar quando o padrão dos digitos for OOXX", "displayFormat": "Previsão dinâmica: Padrão digit_pattern", "parameters": { "type": "dynamic_prediction", "predictionType": "conditional_pattern", "explicitPrediction": false, "combinedRule": { "patternRule": { "type": "digit_pattern", "pattern": "OOXX", "pattern_type": "loser_winner" } }, "count": 1 }, "status": "waiting", "currentValue": null }], "status": "inactive" }],
            "parameters": [{ "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" }, { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "OOXX", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }],
            "totalRules": 1, "logic": "OR entre grupos, AND dentro do grupo", "originalText": "* Entrar quando o padrão dos digitos for OOXX"
        },
        "pattern_xxxxoo": {
            "groups": [{ "id": 1, "rules": [{ "id": 1, "type": "dynamic_prediction", "description": "Entrar quando o padrão dos digitos for XXXXOO", "displayFormat": "Previsão dinâmica: Padrão digit_pattern", "parameters": { "type": "dynamic_prediction", "predictionType": "conditional_pattern", "explicitPrediction": false, "combinedRule": { "patternRule": { "type": "digit_pattern", "pattern": "XXXXOO", "pattern_type": "loser_winner" } }, "count": 1 }, "status": "waiting", "currentValue": null }], "status": "inactive" }],
            "parameters": [{ "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" }, { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "XXXXOO", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }],
            "totalRules": 1, "logic": "OR entre grupos, AND dentro do grupo", "originalText": "* Entrar quando o padrão dos digitos for XXXXOO"
        },
        "pattern_ooxxxx": {
            "groups": [{ "id": 1, "rules": [{ "id": 1, "type": "dynamic_prediction", "description": "Entrar quando o padrão dos digitos for OOXXXX", "displayFormat": "Previsão dinâmica: Padrão digit_pattern", "parameters": { "type": "dynamic_prediction", "predictionType": "conditional_pattern", "explicitPrediction": false, "combinedRule": { "patternRule": { "type": "digit_pattern", "pattern": "OOXXXX", "pattern_type": "loser_winner" } }, "count": 1 }, "status": "waiting", "currentValue": null }], "status": "inactive" }],
            "parameters": [{ "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" }, { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "OOXXXX", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }],
            "totalRules": 1, "logic": "OR entre grupos, AND dentro do grupo", "originalText": "* Entrar quando o padrão dos digitos for OOXXXX"
        },
        "pattern_ooooxxo": {
            "groups": [{ "id": 1, "rules": [{ "id": 1, "type": "dynamic_prediction", "description": "Entrar quando o padrão dos digitos for OOOOXXO", "displayFormat": "Previsão dinâmica: Padrão digit_pattern", "parameters": { "type": "dynamic_prediction", "predictionType": "conditional_pattern", "explicitPrediction": false, "combinedRule": { "patternRule": { "type": "digit_pattern", "pattern": "OOOOXXO", "pattern_type": "loser_winner" } }, "count": 1 }, "status": "waiting", "currentValue": null }], "status": "inactive" }],
            "parameters": [{ "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 1, "type": "number", "path": "groups[0].rules[0].parameters.count" }, { "key": "param_pattern_g1_r1", "label": "Padrão (G1R1)", "value": "OOOOXXO", "type": "text", "validation": "pattern", "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" }],
            "totalRules": 1, "logic": "OR entre grupos, AND dentro do grupo", "originalText": "* Entrar quando o padrão dos digitos for OOOOXXO"
        },
        "sequence_3_ticks_up": {
            "groups": [{
                "id": 1,
                "rules": [{
                    "id": 1,
                    "type": "sequence",
                    "description": "Entrar quando 3 ticks consecutivos subindo",
                    "displayFormat": "3 ticks consecutivos ↗️ subindo",
                    "parameters": {
                        "type": "sequence",
                        "direction": "up",
                        "count": 3,
                        "parameter_key": "param_seq_count"
                    },
                    "status": "waiting",
                    "currentValue": null,
                    "count": 3
                }],
                "status": "inactive"
            }],
            "parameters": [
                { "key": "param_g1_r1_count", "label": "Qtd. Últimos Dígitos (G1R1)", "value": 3, "type": "number", "path": "groups[0].rules[0].parameters.count" }
            ],
            "totalRules": 1,
            "logic": "OR entre grupos, AND dentro do grupo",
            "originalText": "* Entrar quando 3 ticks consecutivos subindo"
        }
    },
    getExample: function (key) {
        return this.examples[key] || null;
    },
    getExampleByRuleText: function (ruleText) {
        const textMap = {
            '* entrar quando os digitos inferiores a 4> 50%': 'digits_under_4',
            '* entrar quando os dígitos inferiores a 4 > 50%': 'digits_under_4',
            '* entrar quando os ultimos 3 digitos > 8': 'last_digits_gt_8',
            '* entrar quando os ultimos 5 digitos forem todos pares': 'digits_even_sequence',
            '* entrar quando ultimo digito = 9': 'specific_digit_9',
            '* entrar quando o padrão dos digitos for xxoo': 'pattern_xxoo',
            '* entrar quando o padrão dos digitos for xxox': 'pattern_xxox',
            '* entrar quando o padrão dos digitos for xoxo': 'pattern_xoxo',
            '* entrar quando o padrão dos digitos for xxxo': 'pattern_xxxo',
            '* entrar quando o padrão dos digitos for oxxx': 'pattern_oxxx',
            '* entrar quando o padrão dos digitos for xoxox': 'pattern_xoxox',
            '* entrar quando o padrão dos digitos for oxoxo': 'pattern_oxoxo',
            '* entrar quando o padrão dos digitos for ooxx': 'pattern_ooxx',
            '* entrar quando o padrão dos digitos for xxxxoo': 'pattern_xxxxoo',
            '* entrar quando o padrão dos digitos for ooxxxx': 'pattern_ooxxxx',
            '* entrar quando o padrão dos digitos for ooooxxo': 'pattern_ooooxxo',
            '* entrar quando rsi > 70': 'rsi_gt_70',
            '* entrar quando sma 10 > sma 20': 'sma_10_gt_20',
            '* entrar quando percentual de digitos abaixo de 3 > 40%': 'percentage_below_3_gt_40',
            '* entrar quando 3 ticks consecutivos subindo': 'sequence_3_ticks_up'
        };

        const norm = ruleText.toLowerCase().replace(/\s+/g, ' ').trim();

        const key = textMap[norm];
        if (key && this.examples[key]) {

            return this.examples[key];
        }

        return null;
    }
};

// 🔧 FUNÇÃO AUXILIAR: Extrair últimos N dígitos de um preço
function getLast4Digits(price) {
    if (!price) return '????';
    const priceStr = price.toString().replace('.', '');
    return priceStr.slice(-4);
}

class MonitoringView {
    static isExecutingTrade = false;
    static pendingAsteriskCheck = false;
    static isFetchingInitialData = false;

    // 🚀 CACHE DE PERFORMANCE: Evitar buscas repetitivas em cada tick
    static assetDecimalsCache = {
        symbol: null,
        decimals: -1
    };

    // 🚀 FUNÇÃO DE OTIMIZAÇÃO: Atualizar cache de decimais (Chamada 1x por troca de ativo)
    static updateAssetDecimalsCache(symbol) {
        if (!symbol) return;

        try {
            let decimals = -1;
            const token = SessionManager?.getLocalToken?.();
            const marketData = (token && window.getMarketDataInstance) ? window.getMarketDataInstance(token) : null;

            if (marketData) {
                // 1. Tentar obter do activeSymbols (mais preciso)
                if (marketData.activeSymbols && Array.isArray(marketData.activeSymbols)) {
                    const activeSymbol = marketData.activeSymbols.find(s => s.symbol === symbol);
                    if (activeSymbol && activeSymbol.pip) {
                        decimals = Math.round(Math.log10(1 / activeSymbol.pip));
                    }
                }

                // 2. Fallback para cache do MarketData
                if (decimals === -1 && typeof marketData.getAssetDecimalPlaces === 'function') {
                    const detected = marketData.getAssetDecimalPlaces(symbol);
                    if (detected !== undefined && detected !== null) {
                        decimals = detected;
                    }
                }
            }

            // 3. Fallback final via helpers
            if (decimals === -1) {
                decimals = this.getDecimalsForSymbol(symbol);
            }

            // Atualizar cache global
            this.assetDecimalsCache = {
                symbol: symbol,
                decimals: decimals
            };

            return decimals;
        } catch (error) {
            console.error('Erro ao atualizar cache de decimais:', error);
            return -1;
        }
    }

    // 🔧 NOVO: FSM para controle unificado do monitoramento
    static state = 'IDLE';

    static _checkAbort() {

        // Se estiver em MONITORING ou INITIALIZING, o processo deve continuar.
        if (this.state === 'IDLE') {
            logConfig.info('monitoring', '🛑 [STOP SYNC] Abortando processo de inicialização pois o monitoramento foi parado.');
            return true;
        }
        return false;
    }

    static _pendingCooldownStart = false;
    static pendingStop = false; // Flag para marcar parada pendente durante cooldown
    static mainTickUnsubscribe = null; // Único stream de ticks unificado

    // ✅ GETTER/SETTER: Redirecionar para variável privada (usado por trade-messages.js)
    static get pendingCooldownStart() {
        return MonitoringView._pendingCooldownStart;
    }
    static set pendingCooldownStart(value) {
        MonitoringView._pendingCooldownStart = value;
    }

    // ✅ GETTER: Sincronizar com CooldownOverlay (usado por ui.js e trade-manager.js)
    static get cooldownActive() {
        try {
            return getCooldownOverlayInstance().cooldownActive;
        } catch (error) {
            return false;
        }
    }

    // 🔧 NOVO: Declarações estáticas dos intervalos para stopAll()
    static ruleUpdateInterval = null;
    static modeIndicatorInterval = null;
    static tradingRulesInterval = null;
    static healthCheckInterval = null;
    static lastHealthStatus = null;

    // ⚡ OTIMIZAÇÃO: Salvar preço/tempo do último tick para execução imediata
    static lastTickPrice = null;
    static lastTickTime = null;

    // 🔧 REFERÊNCIA: Cooldown agora é gerenciado pelo módulo CooldownOverlay

    static lastAwaitingExpirationTime = null;

    // 🔒 CONTROLE DE CONCORRÊNCIA GEMINI
    static isTranslating = false;
    static lastTranslationTime = 0;
    static translationCooldown = 5000; // 5 segundos entre traduções

    // 🎯 CRÍTICO: Armazenar regras traduzidas para acesso no Config Mode
    static currentTranslatedRules = null;
    static configModeRules = null;

    // 🎲 PROBABILIDADE (REVERSÃO)
    static probabilityHistory = [];
    static probabilityPeriod = 50;
    static probabilityUpdateListener = null;
    static marketDataUpdateHandler = null; // 🛡️ Guarda para evitar ouvintes duplicados
    static globalTickCounter = 0; // 🚀 Contador global para invalidar cache de probabilidade

    // Renderizar o HTML
    static render(containerId) {

        // 🛡️ PROTEÇÃO CRÍTICA: Só renderizar UMA VEZ
        if (this._hasRendered) {

            // Verificar se o bloco de probabilidade existe
            if (!document.querySelector('.probability-monitor-block')) {

                this.setupProbabilityMonitor();
            }
            return;
        }


        this._hasRendered = true;

        const container = CommonHelpers.getElement(containerId);
        if (!container) {
            console.error('❌ [MONITORING] Container não encontrado:', containerId);
            return;
        }

        // 🔧 LIMPEZA: Remover popups órfãos que possam ter ficado na tela
        const orphanPopups = document.querySelectorAll('.both-mode-incompatibility-popup, .stop-monitoring-popup');
        orphanPopups.forEach(popup => {
            try {
                popup.remove();

            } catch (error) {
                CommonHelpers.showWarning('⚠️ [CLEANUP] Erro ao remover popup órfão:', error);
            }
        });

        container.innerHTML = `
            <div class="block-header">
                <div class="header-center-actions">
            <button id="rule-assistant-btn" class="rule-assistant-btn" title="Assistente de Criação de Regras">
                🤓
            </button>
            <button id="tour-guide-btn" class="tour-guide-btn" title="Tour Guiado - Conheça o Sistema">
                ♻
            </button>
            <div id="help-icon" class="help-icon" title="Manual de Instruções">
                ?
            </div>
            <button id="automacao-floating-btn" title="Clique para ver as automações disponíveis">
                🤖
            </button>
            <button id="robot-editor-btn" class="robot-editor-btn" title="Editor de Robôs Visuais">
                🧩
            </button>
            <button id="rules-history-btn" class="rules-history-btn" title="Ver histórico de regras usadas">
                📋
            </button>
            <button id="examples-btn" class="examples-btn" title="Ver modelos de exemplos">
                📚
            </button>
            <button id="suggestions-btn" class="suggestions-btn" title="Ver sugestões da IA">
                💡
            </button>
            <button class="planilha-btn" onclick="PlanilhaTrade.showModal()" title="Ver planilha de trades">
                📝
            </button>
            <button id="floating-ia-button" title="Gerar sugestões com IA">
                🧠
            </button>
            <button id="chart-modal-btn" class="chart-modal-btn" title="Gráfico em Tempo Real">
                📉
            </button>
            <button class="vip-upgrade-button" title="Upgrade para VIP">
                💰
            </button>
            <button id="strategy-library-btn" class="strategy-library-btn" title="Biblioteca de Estratégias Compartilhadas">
                📁
            </button>
            <button id="clear-messages-btn" class="clear-messages-btn" title="Limpar histórico de mensagens" style="margin-left: auto;">
                🗑️
            </button>
        </div>
            </div >
            <div class="block-content">
                <div class="strategy-input-wrapper">
                    <div class="strategy-header-controls">
                        <div class="strategy-mode-toggle">
                            <button id="mode-text-btn" class="mode-btn active" title="Editar regras em texto">📝 Texto</button>
                            <button id="mode-config-btn" class="mode-btn" title="Ajustar parâmetros">⚙️ Config</button>
                            <button id="toggle-editor-btn" class="mode-btn" title="Ocultar/Mostrar Editor" style="margin-left: 5px;">👁‍🗨</button>
                        </div>
                    </div>

                    <div id="text-mode-container" class="mode-container active">
                        <div style="position: relative;">
                            <textarea
                                id="strategy-text"
                                class="form-control strategy-textarea"
                                style="min-height: 100px; overflow-y: hidden; resize: none;"
                            ></textarea>
                            <button 
                                id="voice-input-btn" 
                                class="voice-input-btn" 
                                title="Clique para falar sua estratégia"
                                style="position: absolute; top: 8px; right: 8px; background: transparent; border: none; cursor: pointer; z-index: 10; transition: all 0.3s ease;"
                            >
                                🎤
                            </button>
                        </div>
                    </div>

                    <div id="config-mode-container" class="mode-container" style="display: none;">
                        <div id="parameters-list" class="parameters-list">
                            <div class="no-parameters-msg">
                                <span class="icon">ℹ️</span>
                                <p>Digite suas regras no modo Texto e inicie o monitoramento para gerar os parâmetros editáveis.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Container de Mensagens de Trade (sem bloco wrapper) -->
                <div id="trade-messages-container" class="trade-messages-container notranslate" translate="no">
                    <div class="messages-list" id="messages-list">
                        <div class="no-messages">Nenhum trade executado ainda</div>
                    </div>
                </div>

                <div id="rules-container" class="notranslate" translate="no" style="display: none;">
                    <!-- Container onde as regras formatadas serão exibidas -->
                </div>

                <!-- Botões de controle movidos para baixo do DisplayView -->
                <div class="monitoring-buttons">
                    <button id="start-monitoring-btn" class="market-btn start-btn" title="Iniciar Monitoramento">
                    </button>

                    <!-- Checkbox de execução imediata colada ao lado esquerdo do visor L&P -->
                    <div class="immediate-execution-container">
                        <label class="immediate-execution-checkbox">
                            <input type="checkbox" id="immediate-execution-mode" title="Modo Execução Imediata - Executa 1 trade a cada clique sem aguardar regras">
                                <span class="checkmark"></span>
                        </label>
                    </div>

                    <!-- Visor de P&L -->
                    <div class="profit-loss-display-inline">
                        <span id="profit-loss-value" class="profit-loss-value neutral">$0.00</span>
                    </div>

                    <!-- Botão Reset P&L -->
                    <button id="reset-profit-loss-btn" class="reset-profit-loss-btn" title="Resetar P&L">
                        ↻
                    </button>

                    <button id="stop-monitoring-btn" class="market-btn stop-btn" disabled title="Parar Monitoramento">
                    </button>
                </div>

            </div>
        `;


        // Aplicar estilos imediatamente após renderização
        this.applyHeaderButtonStyles();
        this.addConfigModeStyles(); // ✅ NOVO: Estilos do modo configuração

        // Adicionar event listeners para os botões

        this.attachEventListeners();

        // Inicializar módulo de sugestões da IA
        if (typeof ModalSuggestoesIA !== 'undefined') {
            ModalSuggestoesIA.init();
        }

        // Adicionar listener para botão de histórico
        this.attachRulesHistoryButtonListener();

        // Adicionar listener para botão do assistente de regras
        this.attachRuleAssistantButtonListener();

        // Adicionar listener para botão do tour guiado
        this.attachTourGuideButtonListener();

        // Adicionar listener para botão de modelos
        this.attachExamplesButtonListener();

        // Carregar estratégia salva (se houver)
        this.loadSavedStrategy();

        setTimeout(() => {
            this.attachSuggestionsButtonListener();
        }, 100);

        // Adicionar listener para botão da planilha (chamar a inicialização do modal)
        this.attachPlanilhaButtonListener();

        // Adicionar listeners para campos de configuração
        this.attachConfigurationListeners();

        // Disparar evento de view renderizada
        document.dispatchEvent(new CustomEvent('viewRendered', {
            detail: { viewName: 'monitoring' }
        }));

        // Adicionar listener para botão de limpar mensagens
        this.attachClearMessagesListener();

        // Adicionar listeners para botões reposicionados no header
        this.attachHeaderButtonListeners();

        // Disparar evento para inicializar sistema de mensagens
        setTimeout(() => {
            document.dispatchEvent(new Event('monitoringViewRendered'));
        }, 100);

        this.attachParameterValidationListener();

        // 🔧 FIX: Placeholder simplificado conforme solicitado pelo usuário
        const strategyText = document.getElementById('strategy-text');
        if (strategyText) {
            strategyText.placeholder = "Digite aqui sua estrategia de monitoramento";
        }

        // ✅ NOVO: Auto-resize da textarea de estratégia
        MonitoringView.initStrategyTextareaAutoResize();

        // ✅ NOVO: Registrar listener de reconexão globalmente (sempre ativo)
        this.setupGlobalReconnectionListener();

        // ✅ NOVO: Registrar listener de troca de conta (sempre ativo)
        this.setupAccountSwitchListener();

        // 🎯 NOVO: Mover controles de monitoramento para o rodapé VIP
        if (window.footerManager) {
            window.footerManager.moveMonitoringControlsToFooter();
        }

        // 📢 NOVO: Exibir modal informativo de compatibilidade na inicialização
        if (typeof RuleCompatibilityValidator !== 'undefined' && typeof RuleCompatibilityValidator.showStartupCompatibilityInfo === 'function') {
            // Verificar se já foi exibido nesta sessão para não ser repetitivo
            const alreadyShown = localStorage.getItem('startup_compatibility_notified');

            if (!alreadyShown) {
                // Pequeno delay para garantir que a interface terminou de renderizar visualmente
                setTimeout(() => {
                    RuleCompatibilityValidator.showStartupCompatibilityInfo();
                    localStorage.setItem('startup_compatibility_notified', 'true');
                }, 800);
            }
        }
    }

    // Adicionar estilos para o modo de configuração
    static addConfigModeStyles() {
        if (CommonHelpers.getElement('config-mode-styles', true)) return;

        const style = document.createElement('style');
        style.id = 'config-mode-styles';
        style.textContent = `
        .strategy-input-wrapper {
            position: relative;
            margin-bottom: 15px;
        }

        .strategy-header-controls {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 5px;
        }

        .strategy-mode-toggle {
            display: flex;
            background: var(--bg-secondary);
            border-radius: 20px;
            padding: 2px;
            border: 1px solid #dee2e6;
        }

            .mode-btn {
            border: none;
            background: transparent;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 0.85em;
            font-weight: 600;
            color: white !important; /* ✅ CORREÇÃO: Texto branco */
            border-color: #28a745;
            box-shadow: 0 2px 6px rgba(40, 167, 69, 0.15);
            transform: translateY(-1px);
        }

        /* Responsive adjustments */
        @media (max-width: 1366px) {
            .mode-btn {
                padding: 3px 8px;
                font-size: 0.8em;
            }
        }

        @media (max-width: 768px) {
             .mode-btn {
                padding: 2px 6px;
                font-size: 0.75em;
            }
        }

        /* ✅ NOVO: Limitar altura da caixa de mensagens */
        .trade-messages-container {
            max-height: 400px; /* Aumentado para mostrar mais histórico */
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }

        .trade-messages-container::-webkit-scrollbar {
            width: 6px;
        }

        .trade-messages-container::-webkit-scrollbar-track {
            background: transparent;
        }

        .trade-messages-container::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .parameter-item {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }

        .parameter-item:last-child {
            margin-bottom: 0;
        }

        .parameter-label {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.9em;
            flex: 1;
            margin: 0;
        }

        .parameter-input {
            width: 90px;
            padding: 8px 12px;
            border: 2px solid #ced4da;
            border-radius: 6px;
            font-size: 0.95em;
            font-weight: 600;
            text-align: center;
            transition: all 0.2s ease;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            border-color: var(--border-color);
            margin: 0;
            flex-shrink: 0;
        }

        .parameter-input:focus {
            border-color: #28a745;
            outline: none;
            box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.15);
            transform: scale(1.02);
        }

        .parameter-input:hover {
            border-color: #6c757d;
        }

        /* 🎯 NOVO: Estilos para inputs de padrão */
        .pattern-input {
            font-family: 'Courier New', monospace;
            letter-spacing: 2px;
            text-transform: uppercase;
            width: 140px; /* Mais largo para padrões */
        }

            .pattern - input:invalid {
            border - color: #dc3545;
            background - color: rgba(220, 53, 69, 0.1);
        }

            .pattern - input:valid {
            border - color: #28a745;
        }

            /* 🎯 NOVO: Estilos para labels editáveis */
            .editable - label {
            cursor: pointer;
            position: relative;
            padding: 2px 6px;
            border - radius: 4px;
            transition: all 0.2s ease;
            user - select: none;
        }

            .editable - label:hover {
            background: rgba(0, 123, 255, 0.08);
            color: #007bff;
        }

            .editable - label: hover::after {
            content: "✏️";
            margin - left: 6px;
            font - size: 0.75em;
            opacity: 0.7;
        }

            .parameter - label - input {
            border: 2px solid #007bff;
            padding: 4px 8px;
            border - radius: 4px;
            font - size: inherit;
            font - family: inherit;
            font - weight: 600;
            color: #495057;
            width: 100 %;
            max - width: 300px;
            background: #fff;
            box - shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
        }

            .parameter - label - input:focus {
            outline: none;
        }

            .no - parameters - msg {
            display: flex;
            flex - direction: column;
            align - items: center;
            justify - content: center;
            height: 100 %;
            color: #6c757d;
            text - align: center;
            padding: 30px 20px;
        }

            .no - parameters - msg.icon {
            font - size: 2.5em;
            margin - bottom: 12px;
            opacity: 0.5;
        }

        @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
        }

        /* 🎯 NOVO: Estilos para Dropdown de Configuração de Grupo */
        .group-config-container {
            position: relative;
            display: inline-block;
        }

        .group-config-trigger {
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
            font-size: 0.9em;
            color: #bdc3c7;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .group-config-trigger:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .group-config-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: #2c3e50;
            border: 1px solid #4a6785;
            border-radius: 8px;
            padding: 10px;
            width: 280px;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            margin-top: 5px;
        }

        .group-config-dropdown.show {
            display: block;
            animation: fadeIn 0.2s ease;
        }

        .group-config-title {
            font-size: 0.8em;
            text-transform: uppercase;
            color: #95a5a6;
            margin-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 4px;
        }

        .group-config-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        .group-config-checkbox {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85em;
            color: #ecf0f1;
            cursor: pointer;
            user-select: none;
        }

        .group-config-checkbox input {
            cursor: pointer;
        }
        `;
        document.head.appendChild(style);
    }

    // Verificar se há JSON histórico no texto da estratégia
    static checkForHistoricalJson(strategyText) {
        try {
            // Procurar por comentário HTML com JSON
            const jsonMatch = strategyText.match(/<!--\s*({[\s\S]*?})\s*-->/);
            if (jsonMatch && jsonMatch[1]) {
                const jsonStr = jsonMatch[1];
                const parsed = JSON.parse(jsonStr);

                // Obter o geminiJson
                let geminiJson;
                if (parsed.geminiJson) {
                    geminiJson = parsed.geminiJson;
                } else if (parsed.groups) {
                    geminiJson = parsed;
                } else {
                    return null;
                }

                const formatGenerator = getFormatGeneratorInstance();
                if (formatGenerator && formatGenerator.formatGeminiResponse) {
                    const reprocessed = formatGenerator.formatGeminiResponse(geminiJson);
                    return reprocessed;
                }

                // Fallback: retornar original se formatGeminiResponse não disponível
                return geminiJson;
            }

            return null;
        } catch (error) {
            console.error('❌ Erro ao extrair JSON histórico:', error);
            return null;
        }
    }

    // Alternar entre modos
    static toggleConfigMode(mode) {
        const textBtn = document.getElementById('mode-text-btn');
        const configBtn = document.getElementById('mode-config-btn');
        const textContainer = document.getElementById('text-mode-container');
        const configContainer = document.getElementById('config-mode-container');

        if (!textBtn || !configBtn || !textContainer || !configContainer) return;

        if (mode === 'config') {

            textBtn.classList.remove('active');
            configBtn.classList.add('active');
            textContainer.classList.remove('active');
            configContainer.classList.add('active');
            configContainer.style.display = 'block';
            textContainer.style.display = 'none';


            // 🎯 Se já temos regras com parâmetros, usar diretamente
            if (this.currentTranslatedRules && this.currentTranslatedRules.parameters) {

                this.renderParametersUI(this.currentTranslatedRules.parameters);

                return;
            }

            // MAS APENAS se monitoramento está IDLE (não ativo, não em cooldown)
            const isMonitoringIdle = this.state === 'IDLE' || !this.state;

            if (isMonitoringIdle) {
                const strategyText = document.getElementById('strategy-text')?.value || '';

                if (strategyText.trim()) {

                    const historicalJson = this.checkForHistoricalJson(strategyText);

                    if (historicalJson && historicalJson.parameters) {

                        // Usar variável separada apenas para Config Mode
                        this.configModeRules = historicalJson;
                        this.configModeRules.originalText = strategyText;
                        this.renderParametersUI(historicalJson.parameters);

                        return;
                    }
                }
            }

            // Se chegou aqui, não tem parâmetros para mostrar
            this.renderParametersUI([]);
            textContainer.classList.add('active');
            textContainer.style.display = 'block';
            configContainer.style.display = 'none';
        } else {
            // MODO TEXTO (Voltar para o editor)
            textBtn.classList.add('active');
            configBtn.classList.remove('active');

            textContainer.classList.add('active');
            configContainer.classList.remove('active');

            textContainer.style.display = 'block';
            configContainer.style.display = 'none';
        }
    }

    static setupProbabilityMonitor() {
        // 🛡️ GARANTIA DE OUVINTE ÚNICO: Remover ouvinte anterior se existir
        if (this.marketDataUpdateHandler) {
            window.removeEventListener('marketDataUpdate', this.marketDataUpdateHandler);
        }

        // Definir o novo handler e guardá-lo na classe
        this.marketDataUpdateHandler = (event) => {
            const { symbol, price } = event.detail;

            // 🚀 OTIMIZAÇÃO: Filtro imediato (Normalizado)
            const symbolSelect = document.getElementById('symbol-select');
            const currentSymbol = symbolSelect?.value || window.selectedSymbol;

            // Comparação robusta
            if (symbol !== currentSymbol) return;

            setTimeout(() => {
                const startTime = performance.now();
                const lastPrice = price;

                if (lastPrice !== undefined) {
                    // ⏱️ DIAGNÓSTICO: Passo 1 - Extração
                    const t0 = performance.now();
                    const lastDigit = this.extractLastDigit(lastPrice, symbol);
                    const t1 = performance.now();

                    if (lastDigit === null) return;

                    // ⏱️ DIAGNÓSTICO: Passo 2 - Histórico
                    this.addTickToHistory(symbol, lastPrice, lastDigit);
                    const t2 = performance.now();

                    let currentStats = null;

                    // ⏱️ DIAGNÓSTICO: Passo 3 - Cálculos (IA/Manager)
                    if (typeof ProbabilityAccuracyManager !== 'undefined') {
                        const accManager = ProbabilityAccuracyManager.getInstance();
                        accManager.updateOutcome(lastDigit);
                        currentStats = this.calculateProbabilities();
                        if (currentStats && currentStats.sorted) {
                            accManager.recordPrediction(currentStats.sorted);
                        }
                    }
                    const t3 = performance.now();
                    console.log("setupProbalitity");
                    // ⏱️ DIAGNÓSTICO: Passo 4 - Desenho de Tela
                    this.updateProbabilityUI(currentStats);
                    const t4 = performance.now();

                    const totalTime = t4 - startTime;


                }
            }, 0);
        };

        // Adicionar o ouvinte único
        window.addEventListener('marketDataUpdate', this.marketDataUpdateHandler);


        // 2. Listener para mudança de ativo (NOVO: Carregar histórico imediatamente)
        const assetSelect = document.getElementById('symbol-select');

        if (assetSelect) {

            assetSelect.addEventListener('change', (e) => {
                const symbol = e.target.value;

                if (symbol) {
                    // 🚀 OTIMIZAÇÃO: Atualizar cache de decimais na troca de ativo
                    this.updateAssetDecimalsCache(symbol);
                    this.fetchAndCalculateInitialProbabilities(symbol);
                }
            });

            // Carregar inicial
            const tryInitialFetch = () => {
                if (assetSelect.value) {
                    this.fetchAndCalculateInitialProbabilities(assetSelect.value);
                    return true;
                }
                return false;
            };

            if (!tryInitialFetch() && window.selectedSymbol) {
                this.fetchAndCalculateInitialProbabilities(window.selectedSymbol);
            }

            let retryCount = 0;
            const maxRetries = 20;
            const checkInterval = setInterval(() => {
                retryCount++;
                const currentSelect = document.getElementById('symbol-select');

                if (currentSelect && currentSelect.value) {
                    if (!this.probabilityHistory || this.probabilityHistory.length < 50) {
                        this.fetchAndCalculateInitialProbabilities(currentSelect.value);
                    }
                    clearInterval(checkInterval);
                } else if (retryCount >= maxRetries) {
                    clearInterval(checkInterval);
                }
            }, 1000);
        }
    }

    // NOVO: Buscar histórico e calcular imediatamente
    static async fetchAndCalculateInitialProbabilities(symbol) {
        if (this.isFetchingInitialData) return;
        this.isFetchingInitialData = true;

        try {
            const token = SessionManager.getLocalToken();
            if (!token) {
                console.warn('⚠️ [MONITORING] Sem token');
                this.isFetchingInitialData = false;
                return;
            }

            const marketData = getMarketDataInstance(token);
            if (!marketData) {
                console.warn('⚠️ [MONITORING] Sem instância de MarketData');
                this.isFetchingInitialData = false;
                return;
            }

            // Mostrar estado de carregamento
            this.renderLoadingState();

            // Tentar obter do cache local primeiro (instantâneo)
            let history = marketData.getLastNTicks(symbol, 200);

            // 🔧 FIX: Normalizar histórico (pode vir como objeto {prices: [...]})
            if (history && !Array.isArray(history) && history.prices) {
                history = history.prices;
            }

            // Normalizar de array de objetos para array de valores se necessário
            if (Array.isArray(history) && history.length > 0 && typeof history[0] === 'object' && history[0].quote !== undefined) {
                history = history.map(t => t.quote);
            }

            const historyLength = Array.isArray(history) ? history.length : 0;

            // 🔧 FIX: SEMPRE buscar da API se cache não tiver dados suficientes (< 50)
            if (historyLength < 50) {
                // Se não tem cache suficiente, buscar da API

                const apiHistory = await marketData.getTicksHistoryFromAPI(symbol, 200);
                if (apiHistory && apiHistory.prices) {
                    history = apiHistory.prices;

                }
            }

            // 🔧 FIX: Converter preços para dígitos imediatamente
            if (Array.isArray(history) && history.length > 0) {

                // Extrair dígitos dos preços usando o método correto
                const digits = history.map(price => this.extractLastDigit(price, symbol))
                    .filter(d => d !== null && d !== undefined && !isNaN(d) && d >= 0 && d <= 9);

                // Armazenar DÍGITOS (não preços) para consistência com o listener real-time
                this.probabilityHistory = digits;
                console.log("FETCH AND 1");
                // Atualizar UI imediatamente com os dados do histórico
                MonitoringView.updateProbabilityUI();

                // 🎯 FIX: Semear o Resolver com STATS CALCULADOS (sorted digits)
                const initialStats = this.calculateProbabilities();
                if (initialStats && initialStats.sorted && typeof getProbabilityResolver === 'function') {
                    getProbabilityResolver().updateProbabilityData(initialStats.sorted, initialStats);
                }

                if (typeof ProbabilityAccuracyManager !== 'undefined') {
                    let originalHistory = null;
                    try {
                        const accManager = ProbabilityAccuracyManager.getInstance();
                        const history = this.probabilityHistory;
                        const lookback = 12; // Janela suficiente para encher o histórico (10)

                        // Só rodar se tiver histórico suficiente
                        if (history && history.length > 50 + lookback) {
                            // Backup do histórico completo
                            originalHistory = [...this.probabilityHistory];

                            // Resetar histórico do manager para garantir cálculo limpo
                            accManager.history = [];

                            for (let i = history.length - lookback; i < history.length - 1; i++) {
                                // 1. Simular estado no tempo 'i'
                                this.probabilityHistory = originalHistory.slice(0, i + 1);

                                // 2. Calcular probabilidades (como se fosse live)
                                const stats = this.calculateProbabilities();

                                // 3. Registrar previsão
                                if (stats && stats.sorted) {
                                    accManager.recordPrediction(stats.sorted);

                                    // 4. Verificar resultado (o próximo tick real 'i+1')
                                    const nextTick = originalHistory[i + 1];
                                    accManager.updateOutcome(nextTick);
                                }
                            }

                            // Restaurar histórico real completo
                            this.probabilityHistory = originalHistory;
                        }
                    } catch (e) {
                        console.error('⚠️ [INIT] Erro no backtest de precisão:', e);
                        // Garantir restauração em caso de erro
                        if (originalHistory) this.probabilityHistory = originalHistory;
                    }
                }
                console.log("FETCH AND 2");
                // Atualizar UI novamente agora com precisão calculada
                MonitoringView.updateProbabilityUI();

                // Habilitar botão
                const analyzeBtn = document.getElementById('monitoring-analyze-btn');
                if (analyzeBtn) analyzeBtn.disabled = false;

                // 🎯 FIX: Forçar atualização visual completa para limpar NAN
                setTimeout(() => {
                    MonitoringView.updateRuleVisualsImmediate(true);
                }, 50);
            }
        } catch (error) {
            console.error('❌ [MONITORING] Erro ao carregar probabilidades:', error);
        } finally {
            this.isFetchingInitialData = false;
        }
    }

    static addTickToHistory(symbol, price, preCalculatedDigit = null) {
        if (!this.probabilityHistory) this.probabilityHistory = [];

        // 🔧 Usar dígito pré-calculado se disponível para evitar extractLastDigit redundante
        const digit = (preCalculatedDigit !== null) ? preCalculatedDigit : this.extractLastDigit(price, symbol);

        if (digit !== null && digit !== undefined && !isNaN(digit) && digit >= 0 && digit <= 9) {
            this.probabilityHistory.push(digit);
            this.globalTickCounter++;
            // Manter tamanho fixo (ex: 200)
            if (this.probabilityHistory.length > 200) {
                this.probabilityHistory.shift();
            }
        }
    }

    static renderLoadingState() {
        const highDigitEl = document.getElementById('prob-high-digit');
        const lowDigitEl = document.getElementById('prob-low-digit');

        if (highDigitEl) highDigitEl.innerHTML = '<span class="loading-dots">...</span>';
        if (lowDigitEl) lowDigitEl.innerHTML = '<span class="loading-dots">...</span>';
    }

    // 🆕 Helper: Contar repetições consecutivas do último dígito
    static countConsecutiveRepetitions(history) {
        if (!history || history.length === 0) return 0;

        const lastDigit = history[history.length - 1];
        let count = 1;

        // Voltar no histórico contando repetições
        for (let i = history.length - 2; i >= 0; i--) {
            if (history[i] === lastDigit) {
                count++;
            } else {
                break; // Parar ao encontrar dígito diferente
            }
        }

        return count;
    }

    // Lógica com análise multi-período (5 Períodos) e força
    static calculateProbabilities(excludeLastTick = false) {
        // 🚀 OTIMIZAÇÃO: Cache de resultados para evitar cálculos redundantes no mesmo tick
        const historyKey = `${this.globalTickCounter}_${excludeLastTick}`;
        const cachePool = excludeLastTick ? 'cacheDelayed' : 'cacheNormal';

        if (this[cachePool] && this[cachePool].historyKey === historyKey) {
            return this[cachePool].data;
        }

        const startCalc = performance.now();

        // e nós TIVERMOS um snapshot salvo antes do tick chegar, use-o!
        if (excludeLastTick && this.stablePreviousStats) {
            return this.stablePreviousStats;
        }

        if (!this.probabilityHistory || this.probabilityHistory.length < 10) return null;

        let fullHistory = this.probabilityHistory;

        // Se exclude=true (Regra): Usa histórico -1 (para simular passado)
        let dataForStructure = excludeLastTick && fullHistory.length > 0
            ? fullHistory.slice(0, -1)
            : fullHistory;

        // Se dataForStructure já exclui (Regra), dataForStats usa o mesmo (já tá no passado).
        let dataForStats = dataForStructure;

        const assetSelect = document.getElementById('symbol-select');
        const symbol = assetSelect ? assetSelect.value : null;

        // 🎯 DEFINIÇÃO DE PESOS POR PERÍODO (Usa dataForStats - SEM último dígito)
        const periods = [
            { name: '1-10', data: dataForStats.slice(-10), weight: 5.0 },
            { name: '10-25', data: dataForStats.slice(-25, -10), weight: 2.5 },
            { name: '25-50', data: dataForStats.slice(-50, -25), weight: 1.0 },
            { name: '50-100', data: dataForStats.slice(-100, -50), weight: 0.5 },
            { name: '1-100', data: dataForStats.slice(-100), weight: 0.5 }
        ];

        // Analisar cada período
        const analyses = periods.map(p => {
            const analysis = this.analyzePeriod(p.data, symbol, p.name);
            if (!analysis) return null;
            return {
                ...analysis,
                weight: p.weight // Anexar peso à análise
            };
        });


        // Let's pass the prepared data and set flag to false since we handled slicing.
        const gaps = this.calculateDigitGaps(dataForStructure, false);

        // Calcular Score Final para cada dígito (0-9)
        const finalScores = [];
        // 🚀 OTIMIZAÇÃO: Acessar índice 4 (período 1-100) diretamente em vez de .find()
        const longTermAnalysis = analyses[4];

        // Pre-calcular repetições fora do loop para otimização O(N) em vez de O(D*N)
        const longTermHistory = dataForStructure.slice(-100);
        const lastDigit = dataForStructure[dataForStructure.length - 1];

        const appearancesMap = new Array(10).fill(0);
        const repetitionsMap = new Array(10).fill(0);

        for (let i = 0; i < longTermHistory.length - 1; i++) {
            const d = longTermHistory[i];
            appearancesMap[d]++;
            if (longTermHistory[i + 1] === d) {
                repetitionsMap[d]++;
            }
        }
        // Incluir o último dígito nas aparições (para taxa correta)
        if (longTermHistory.length > 0) {
            appearancesMap[longTermHistory[longTermHistory.length - 1]]++;
        }

        for (let digit = 0; digit <= 9; digit++) {
            let weightedSum = 0;
            let totalWeight = 0;
            let consensusCountHigh = 0;
            let consensusCountLow = 0;

            // 1. Médias de Frequência Ponderada
            analyses.forEach(analysis => {
                if (analysis && analysis.probabilities) {
                    const prob = parseFloat(analysis.probabilities[digit]) || 0;
                    weightedSum += prob * analysis.weight;
                    totalWeight += analysis.weight;

                    // Verificar consenso
                    if (analysis.mostProbable === digit) consensusCountHigh++;
                    if (analysis.leastProbable === digit) consensusCountLow++;
                }
            });

            // Score Base de Frequência (0-100)
            const baseFrequencyScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

            // Se o dígito saiu MUITO no longo prazo (100 ticks), a chance de exaustão é alta.
            let saturationPenalty = 0;
            if (longTermAnalysis && longTermAnalysis.probabilities) {
                const longTermFreq = parseFloat(longTermAnalysis.probabilities[digit]) || 0;
                if (longTermFreq > 15) {
                    // Penalidade cresce se a frequência de longo prazo for > 15%
                    saturationPenalty = (longTermFreq - 15) * 2.0;
                }
            }

            // Analisamos se o dígito "costuma" repetir ou se está em exaustão
            let dynamicRepetitionBias = 0;
            const appearances = appearancesMap[digit];
            const repetitions = repetitionsMap[digit];
            const repRate = appearances > 0 ? (repetitions / appearances) * 100 : 0;

            // Se o dígito que estamos avaliando é o que ACABOU de sair:
            if (digit === lastDigit) {
                if (repRate < 5) {

                    // Se ele saiu muito mas nunca repete, a chance de começar a repetir aumenta.
                    dynamicRepetitionBias = 2; // ENTROPIA REDUZIDA (Antes: 8)
                } else if (repRate > 15) {

                    dynamicRepetitionBias = -2; // ENTROPIA REDUZIDA (Antes: -10)
                } else {
                    // Padrão normal: pequena penalidade por ser o último (reversão simples)
                    dynamicRepetitionBias = -1; // ENTROPIA REDUZIDA (Antes: -5)
                }
            } else {
                // Para os outros dígitos, bônus leve se não repetiram recentemente (atratividade)
                if (repRate < 5) dynamicRepetitionBias = 0.5; // (Antes: 2)
            }

            // A pressão de saída aumenta quadraticamente conforme o gap cresce
            let gapBonus = 0;
            if (gaps[digit] >= 10) {
                // Fórmula: (Gap / 10)^2. Ex: Gap 20 -> 4 pts, Gap 30 -> 9 pts, Gap 40 -> 16 pts.
                gapBonus = Math.pow(gaps[digit] / 10, 2);
            }

            // Equilibra Momento + Gravidade + Viés de Repetição - Saturação
            let finalScore = (baseFrequencyScore + gapBonus + dynamicRepetitionBias) - saturationPenalty;

            finalScores.push({
                digit: digit,
                score: finalScore,
                rawProb: baseFrequencyScore,
                consensusHigh: consensusCountHigh,
                consensusLow: consensusCountLow
            });
        }

        // Encontrar o vencedor (Maior Score = Maior Chance de sair)
        const sortedByScore = [...finalScores].sort((a, b) => b.score - a.score);
        const bestDigit = sortedByScore[0];

        const lowestDigit = sortedByScore[sortedByScore.length - 1];

        // Se o consenso apoia o Smart Winner, força aumenta.
        const highestStrength = Math.max(1, bestDigit.consensusHigh);
        const lowestStrength = Math.max(1, lowestDigit.consensusLow);

        const result = {
            probabilities: finalScores.map(s => s.rawProb.toFixed(2)),
            mostProbable: bestDigit.digit, // Agora baseado no Score Final (Smart)
            leastProbable: lowestDigit.digit,
            mostProbableValue: parseFloat(bestDigit.rawProb.toFixed(2)),
            leastProbableValue: parseFloat(lowestDigit.rawProb.toFixed(2)),
            highestStrength: highestStrength,
            lowestStrength: lowestStrength,
            periods: analyses,
            sorted: sortedByScore.map(s => s.digit)
        };

        // Salvar no cache
        this[cachePool] = {
            historyKey: historyKey,
            data: result
        };

        const calcTime = performance.now() - startCalc;

        return result;
    }

    // 🎯 FIX: Adicionar excludeLastTick para garantir que o último dígito não afete os gaps
    static calculateDigitGaps(history, excludeLastTick = false) {
        const gaps = Array(10).fill(0);
        const lastIndices = Array(10).fill(-1);


        // Isso garante que o dígito que acabou de sair não tenha seu gap resetado
        const effectiveHistory = excludeLastTick && history.length > 0
            ? history.slice(0, -1)
            : history;

        const total = effectiveHistory.length;

        // Encontrar a última ocorrência de cada dígito
        for (let i = 0; i < total; i++) {
            const digit = effectiveHistory[i];
            lastIndices[digit] = i;
        }

        // Calcular gap (distância até o fim)
        for (let d = 0; d <= 9; d++) {
            if (lastIndices[d] === -1) {
                gaps[d] = total; // Nunca saiu nos últimos 100
            } else {
                gaps[d] = (total - 1) - lastIndices[d];
            }
        }
        return gaps;
    }


    // 🆕 NOVO: Analisar um período específico
    static analyzePeriod(digits, symbol, periodName) {
        if (!digits || digits.length === 0) return null;


        // Não precisa chamar extractLastDigit novamente
        const digitFrequency = Array(10).fill(0);
        let validCount = 0;
        digits.forEach(digit => {
            // Converter para número se for string e validar
            const d = typeof digit === 'number' ? digit : parseInt(digit, 10);
            if (!isNaN(d) && Number.isInteger(d) && d >= 0 && d <= 9) {
                digitFrequency[d]++;
                validCount++;
            }
        });

        const totalTicks = digits.length;

        // LÓGICA DE TENDÊNCIA (Frequência)
        const frequencyScores = digitFrequency.map(count => count);
        const totalScore = frequencyScores.reduce((a, b) => a + b, 0);

        if (totalScore === 0) return null;

        // Calcular probabilidades
        const digitProbabilities = frequencyScores.map(score => ((score / totalScore) * 100).toFixed(2));

        // Encontrar maior e menor probabilidade
        let maxProb = -1, maxProbIndex = -1;
        let minProb = 101, minProbIndex = -1;

        digitProbabilities.forEach((prob, index) => {
            const p = parseFloat(prob);
            if (p > maxProb) {
                maxProb = p;
                maxProbIndex = index;
            }
            if (p < minProb) {
                minProb = p;
                minProbIndex = index;
            }
        });

        return {
            probabilities: digitProbabilities,
            mostProbable: maxProbIndex,
            leastProbable: minProbIndex,
            mostProbableValue: maxProb,
            leastProbableValue: minProb,
            periodName: periodName
        };
    }

    // 🆕 NOVO: Calcular consenso entre períodos e determinar força
    static calculateConsensus(digits) {
        if (!digits || digits.length !== 3) return { digit: -1, strength: 'baixa' };

        // Contar occorrências de cada dígito
        const counts = {};
        digits.forEach(digit => {
            counts[digit] = (counts[digit] || 0) + 1;
        });

        // Encontrar o dígito mais frequente
        let mostFrequentDigit = -1;
        let maxCount = 0;

        Object.entries(counts).forEach(([digit, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostFrequentDigit = parseInt(digit);
            }
        });

        // Determinar força baseada no consenso
        let strength = 'baixa';
        if (maxCount === 3) strength = 'alta';      // 3 períodos = força máxima
        else if (maxCount === 2) strength = 'media'; // 2 períodos = força média
        else strength = 'baixa';                     // 1 período = força mínima

        // Se força baixa, usar dígito do período completo (1-50)
        if (strength === 'baixa') {
            mostFrequentDigit = digits[0]; // Primeiro item = período 1-50
        }

        return {
            digit: mostFrequentDigit,
            strength: strength,
            consensusCount: maxCount
        };
    }

    static getDecimalsForSymbol(symbol) {
        if (!symbol) return 2;
        const s = symbol.toUpperCase();

        // Índices de Volatilidade (1s) geralmente têm 2 casas
        if (s.includes('1HZ')) return 2;

        // R_75 e R_50 geralmente têm 4 casas
        if (s === 'R_75' || s === 'R_50') return 4;

        // R_100 tem 2 casas
        if (s === 'R_100') return 2;

        // Outros índices padrão (R_10, R_25) têm 3 casas
        if (s.startsWith('R_')) return 3;

        // Pares com JPY têm 3 casas
        if (s.includes('JPY')) return 3;

        // Forex padrão tem 5 casas
        return 5;
    }

    static extractLastDigit(price, symbol) {
        try {
            // 🚀 OTIMIZAÇÃO: Usar cache de decimais em vez de buscar na lista gigante a cada tick
            if (!symbol) symbol = document.getElementById('symbol-select')?.value || window.selectedSymbol;

            if (!this.assetDecimalsCache || this.assetDecimalsCache.symbol !== symbol || this.assetDecimalsCache.decimals === -1) {
                this.updateAssetDecimalsCache(symbol);
            }

            const decimals = this.assetDecimalsCache.decimals !== -1 ? this.assetDecimalsCache.decimals : 2;

            // Ex: 123.40 (2 casas) -> 123.40 * 100 = 12340 -> % 10 = 0
            const multiplier = Math.pow(10, decimals);

            // Arredondar para evitar imprecisões de ponto flutuante (ex: 12339.99999)
            const processedPrice = Math.round(price * multiplier);

            return processedPrice % 10;

        } catch (e) {
            console.error('Erro ao extrair dígito (MonitoringView):', e);
            return null; // 🔧 FIX: Retornar null em vez de 0 para evitar contaminar dados
        }
    }

    static updateProbabilityUI(preCalculatedData = null) {
        // 🎯 Usar dados já calculados ou calcular agora
        const data = preCalculatedData || this.calculateProbabilities();

        // 🆕 CONTROLE DO OVERLAY DE CARREGAMENTO
        const loadingOverlay = document.getElementById('prob-calculating-overlay');

        if (!data) {
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            return;
        }

        if (loadingOverlay) loadingOverlay.style.display = 'none';

        // Atualizar Maior Chance
        const highDigitEl = document.getElementById('prob-high-digit');
        const highPctEl = document.getElementById('prob-high-pct');
        const highCard = document.querySelector('.prob-card.highest');

        if (highDigitEl) highDigitEl.textContent = data.mostProbable;
        if (highPctEl) {
            highPctEl.innerHTML = `
                <span>${data.mostProbableValue}%</span>
                <div class="strength-bar-container">
                    <div class="strength-bar-fill strength-${data.highestStrength}" style="width: ${data.highestStrength * 20}%"></div>
                </div>
            `;
        }

        if (highCard) {
            this.updateStrengthBar(highCard, data.highestStrength);
        }

        // 🆕 ATUALIZAR LISTA DO MEIO (Unified Card)
        const middleListEl = document.getElementById('prob-middle-list');
        if (middleListEl && data.sorted) {
            const highDigit = parseInt(data.mostProbable, 10);
            const lowDigit = parseInt(data.leastProbable, 10);

            // filtrar vencedor e perdedor
            const middleDigits = data.sorted.filter(digit => digit !== highDigit && digit !== lowDigit);

            // Gerar HTML
            middleListEl.innerHTML = middleDigits.map((digit, index) => {
                const hue = 100 - (index * (100 / 7));
                const color = `hsl(${hue}, 70%, 50%)`;
                return `<div class="middle-digit-badge" style="border-color: ${color}; color: ${color}; box-shadow: 0 0 5px ${color}40;">${digit}</div>`;
            }).join('');
        }

        // Atualizar Menor Chance
        const lowDigitEl = document.getElementById('prob-low-digit');
        const lowPctEl = document.getElementById('prob-low-pct');
        const lowCard = document.querySelector('.prob-card.lowest');

        if (lowDigitEl) lowDigitEl.textContent = data.leastProbable;
        if (lowPctEl) {
            lowPctEl.innerHTML = `
                <span>${data.leastProbableValue}%</span>
                <div class="strength-bar-container">
                    <div class="strength-bar-fill strength-${data.lowestStrength}" style="width: ${data.lowestStrength * 20}%"></div>
                </div>
            `;
        }

        if (lowCard) {
            this.updateStrengthBar(lowCard, data.lowestStrength);
        }

        // Atualizar Precisão
        if (typeof this.updateAccuracyBadge === 'function') {
            let accuracyValue = 100;
            if (typeof ProbabilityAccuracyManager !== 'undefined') {
                const accManager = ProbabilityAccuracyManager.getInstance();
                accuracyValue = accManager.accuracy;
            }
            this.updateAccuracyBadge(accuracyValue);
        }
    }


    static updateStrengthIndicator(card, strength) {
        // Limpeza: Remover barra anterior se existir (caso tenha sobrado)
        const existingBar = card.querySelector('.strength-bar');
        if (existingBar) existingBar.remove();

        // Validar força (1-5)
        const level = Math.max(1, Math.min(5, strength || 1));

        // Atualizar classes de nível no card (usado para colorir o texto)
        card.classList.remove('strength-alta', 'strength-media', 'strength-baixa');
        for (let i = 1; i <= 5; i++) card.classList.remove(`strength-${i}`, `level-${i}`);

        card.classList.add(`strength-${level}`);

        // Atualizar tooltip
        card.title = this.getStrengthTooltip(level);
    }

    // 🆕 ATUALIZADO: Atualizar classes de força (sem barra física)
    static updateStrengthBar(card, strength) {
        // Limpeza: Remover barra anterior se existir (caso tenha sobrado)
        const existingBar = card.querySelector('.strength-bar');
        if (existingBar) existingBar.remove();

        // Validar força (1-5)
        const level = Math.max(1, Math.min(5, strength || 1));

        // Atualizar classes de nível no card (usado para colorir o texto)
        card.classList.remove('strength-alta', 'strength-media', 'strength-baixa');
        for (let i = 1; i <= 5; i++) card.classList.remove(`strength-${i}`, `level-${i}`);

        card.classList.add(`strength-${level}`);

        // Atualizar tooltip
        card.title = this.getStrengthTooltip(level);
    }

    // 🆕 NOVO: Obter texto da força (Numérico)
    static getStrengthText(strength) {
        return `FORÇA ${strength}/5`;
    }

    // 🆕 NOVO: Obter tooltip da força
    static getStrengthTooltip(strength) {
        return `Nível ${strength}: O dígito coincidiu em ${strength} dos 5 períodos analisados (1-10, 10-25, 25-50, 50-100, 1-100).`;
    }
    // Renderizar UI de parâmetros
    static renderParametersUI(parameters) {
        try {
            const container = document.getElementById('parameters-list');
            if (!container) {
                return;
            }

            // 🎯 NOVO: Botão para ver JSON (Debug)
            let jsonButtonHtml = `
            <div style="text-align: right; margin-bottom: 10px;">
                <button id="btn-show-json" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8em;
                ">🔍 Ver JSON</button>
            </div>
            `;

            if (!parameters || parameters.length === 0) {
                container.innerHTML = jsonButtonHtml + `
            <div class="no-parameters-msg">
                <span class="icon">ℹ️</span>
                <p>Nenhum parâmetro editável encontrado nesta estratégia.</p>
            </div>
            `;
                this.attachJsonButtonListener();
                return;
            }


            // 🎯 Agrupar parâmetros por grupo de regras (extrair G1, G2, etc. do label)
            const groupedParams = {};
            parameters.forEach(param => {
                // Extrair número do grupo do label (ex: "Qtd. Últimos Dígitos (G1R1)" -> "G1")
                const groupMatch = param.label.match(/\(G(\d+)R\d+\)/);
                const groupNum = groupMatch ? groupMatch[1] : '1';
                const groupKey = `Grupo ${groupNum} `;

                if (!groupedParams[groupKey]) {
                    groupedParams[groupKey] = [];
                }
                groupedParams[groupKey].push(param);
            });


            // Gerar HTML agrupado
            let html = jsonButtonHtml;
            Object.keys(groupedParams).sort().forEach(groupKey => {
                const groupParams = groupedParams[groupKey];

                // 🎯 CORREÇÃO: Extrair número do grupo para uso no dropdown
                const groupMatch = groupKey.match(/Grupo (\d+)/);
                const groupNum = groupMatch ? groupMatch[1] : '1';

                // 🎯 NOVO: Buscar texto da regra para este grupo
                let ruleTextHtml = '';

                // Tentar encontrar o grupo correspondente nas regras atuais
                const rules = this.configModeRules || this.currentTranslatedRules;
                if (rules && rules.groups) {
                    // Extrair ID do grupo do nome "Grupo X "
                    const groupIdMatch = groupKey.match(/Grupo (\d+)/);
                    if (groupIdMatch) {
                        const groupId = parseInt(groupIdMatch[1]);
                        const group = rules.groups.find(g => g.id == groupId);

                        if (group && group.rules && group.rules.length > 0) {
                            // Pegar textos das regras do grupo
                            const ruleTexts = group.rules.map(r => {
                                // Preferir descrição, senão tipo
                                let text = r.description || r.type;
                                // Tentar limpar um pouco se for muito técnico
                                return text;
                            });

                            const combinedText = ruleTexts.join(' + ');
                            ruleTextHtml = `<small style="display: block; font-weight: normal; font-size: 0.8em; opacity: 0.7; margin-top: 2px;">${combinedText}</small>`;
                        }
                    }
                }

                html += `
            <div class="parameter-group">
                <div class="parameter-group-header" style="display: flex; flex-direction: row; align-items: center; justify-content: flex-start; gap: 15px;">
                    <div style="display: flex; align-items: center;">
                        ${this.renderGroupActivationDropdown(groupNum)}
                        <span style="white-space: nowrap;">${groupKey}</span>
                    </div>
                    <div style="flex: 1; display: flex; align-items: center;">
                        ${ruleTextHtml}
                    </div>
                </div>
        `;

                groupParams.forEach(param => {
                    // 🎯 NOVO: Aplicar nome customizado se existir
                    const displayLabel = this.getCustomParameterName(param.key, param.label || param.key);

                    // 🎯 NOVO: Configuração específica para inputs de padrão
                    const isPattern = param.type === 'text' && param.validation === 'pattern';
                    const isDynamic = (typeof param.value === 'string' && param.value.toString().startsWith('$')) || param.type === 'dynamic';
                    const isNonNumeric = typeof param.value === 'string' && isNaN(Number(param.value));
                    const inputType = (isPattern || isDynamic || isNonNumeric) ? 'text' : (param.type || 'number');
                    const inputClass = isPattern ? 'parameter-input pattern-input' : 'parameter-input';
                    const maxLength = isPattern ? 'maxlength="20"' : '';
                    const placeholder = isPattern ? 'placeholder="Ex: XXOX"' : '';
                    const patternAttr = isPattern ? 'pattern="[XOxo]+"' : '';
                    const validationAttr = param.validation ? `data-validation="${param.validation}"` : '';

                    html += `
                    <div class="parameter-item">
                        <label class="parameter-label editable-label" 
                               for="param-${param.key}"
                               data-param-key="${param.key}"
                               title="${param.tooltip || 'Clique para renomear'}">${displayLabel}</label>
                        <input 
                            type="${inputType}" 
                            id="param-${param.key}" 
                            class="${inputClass}" 
                            value="${param.value}" 
                            data-key="${param.key}"
                            title="${param.tooltip || ''}"
                            ${validationAttr}
                            ${maxLength}
                            ${placeholder}
                            ${patternAttr}
                            ${(param.type === 'text' || param.type === 'string') ? '' : 'step="any"'}
                        >
                    </div>
        `;
                });

                html += `</div>`;
            });

            container.innerHTML = html;

            // Adicionar listeners para salvar valores
            const inputs = container.querySelectorAll('.parameter-input');

            inputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    // 🎯 NOVO: Validar antes de salvar
                    if (this.validateParameterInput(e.target)) {
                        this.updateParameterValue(e.target.dataset.key, e.target.value);
                    }
                });

                // 🎯 NOVO: Validação em tempo real para padrões
                if (input.dataset.validation === 'pattern') {
                    input.addEventListener('input', (e) => {
                        this.validatePatternInput(e.target);
                    });
                }
            });

            // 🎯 NOVO: Adicionar listeners para edição de labels
            this.attachParameterLabelListeners();

            // 🎯 NOVO: Adicionar listener para botão JSON
            this.attachJsonButtonListener();

            // 🎯 NOVO: Adicionar listeners para dropdown de grupos
            this.setupGroupDropdownListeners();
        } catch (error) {
            console.error('❌ Erro ao renderizar UI de parâmetros:', error);
            const container = CommonHelpers.getElement('strategy-parameters-container');
            if (container) {
                container.innerHTML = `
                <div class="error-message">
                    <span class="icon">⚠️</span>
                    <p>Erro ao carregar parâmetros. Verifique o console para mais detalhes.</p>
                </div>
                `;
            }
        }
    }

    // 🎯 NOVO: Listener para botão JSON
    static attachJsonButtonListener() {
        const btn = document.getElementById('btn-show-json');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const rules = this.configModeRules || this.currentTranslatedRules;
                this.showJsonModal(rules);
            });
        }
    }

    // 🎯 NOVO: Mostrar modal com JSON
    static showJsonModal(json) {
        // Remover modal anterior se existir
        const existingModal = document.getElementById('json-debug-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'json-debug-modal';
        modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 99999;
    display: flex;
    justify-content: center;
    align-items: center;
    `;

        modal.innerHTML = `
        <div style="
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 80%;
    max-width: 800px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    ">
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h3 style="margin: 0;">🔍 JSON da Regra</h3>
                <button onclick="document.getElementById('json-debug-modal').remove()" style="border: none; background: none; font-size: 1.5em; cursor: pointer;">&times;</button>
            </div>
            <pre style="
                background: #f5f5f5;
                color: #000000;
                padding: 15px;
                border-radius: 4px;
                overflow: auto;
                flex: 1;
                font-family: monospace;
                font-size: 0.9em;
                margin: 0;
            ">${JSON.stringify(json, null, 2)}</pre>
            <div style="text-align: right; margin-top: 15px;">
                <button onclick="navigator.clipboard.writeText(this.parentElement.previousElementSibling.textContent); alert('Copiado!')" style="
                    padding: 8px 16px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">Copiar JSON</button>
            </div>
        </div>
        `;

        document.body.appendChild(modal);
    }

    // 🎯 NOVO: Anexar listeners para edição de labels de parâmetros
    static attachParameterLabelListeners() {
        const labels = document.querySelectorAll('.editable-label');

        labels.forEach(label => {
            label.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const paramKey = label.dataset.paramKey;
                const currentText = label.textContent;

                // Criar input para edição
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'parameter-label-input';
                input.value = currentText;
                input.maxLength = 50;

                // Função para salvar
                const saveEdit = () => {
                    const newName = input.value.trim();
                    if (newName && newName !== currentText) {
                        if (this.saveCustomParameterName(paramKey, newName)) {
                            label.textContent = newName;
                            CommonHelpers.showSuccess(`✅ Nome atualizado: "${newName}"`);
                        }
                    }
                    // Restaurar label
                    input.replaceWith(label);
                };

                // Função para cancelar
                const cancelEdit = () => {
                    input.replaceWith(label);
                };

                // Event listeners do input
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEdit();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                    }
                });

                input.addEventListener('blur', () => {
                    saveEdit();
                });

                // Substituir label por input
                label.replaceWith(input);
                input.focus();
                input.select();
            });
        });
    }

    // Ler parâmetros da UI
    static readParametersFromUI() {
        const inputs = document.querySelectorAll('.parameter-input');
        const paramMap = {};
        inputs.forEach(input => {
            const key = input.dataset.key;
            const rawValue = input.value;
            const isDynamic = typeof rawValue === 'string' && rawValue.startsWith('$');
            // 🎯 FIX: Detecção de array (string com vírgula)
            const isArrayStr = typeof rawValue === 'string' && rawValue.includes(',');

            let value;

            if (isDynamic || isArrayStr) {
                // Se for variável dinâmica ou array (lista com vírgula), manter como string
                value = rawValue;
            } else {
                // Tentar converter para número
                const parsed = parseFloat(rawValue);
                value = isNaN(parsed) ? rawValue : parsed;
            }

            // Apenas adicionar se tiver chave
            if (key) {
                paramMap[key] = value;
            }
        });
        return paramMap;
    }

    // Aplicar mapa de parâmetros às regras
    static applyParameters(rules, paramMap) {
        if (!rules || !rules.groups || Object.keys(paramMap).length === 0) return;

        // Atualizar array de parâmetros nas regras também
        if (rules.parameters) {
            rules.parameters.forEach(p => {
                if (paramMap.hasOwnProperty(p.key)) {
                    p.value = paramMap[p.key];

                    // Suporte para PATH (Gemini fornece caminho exato)
                    if (p.path) {
                        try {

                            const parts = p.path.split(/[.\[\]]+/).filter(Boolean);
                            let current = rules;
                            let ruleFound = null;


                            if (parts.length >= 4 && parts[0] === 'groups' && parts[2] === 'rules') {
                                const gIdx = parseInt(parts[1]);
                                const rIdx = parseInt(parts[3]);
                                if (rules.groups && rules.groups[gIdx] && rules.groups[gIdx].rules && rules.groups[gIdx].rules[rIdx]) {
                                    ruleFound = rules.groups[gIdx].rules[rIdx];
                                }
                            }

                            // 🎯 NOVA LÓGICA: Navegar com tolerância a falhas
                            for (let i = 0; i < parts.length - 1; i++) {
                                const part = parts[i];

                                // Verificar se current é válido
                                if (!current || typeof current !== 'object') {

                                    break;
                                }

                                if (current[part] === undefined || current[part] === null) {

                                    if (current.parameters && current.parameters[part] !== undefined) {

                                        current = current.parameters[part];
                                        continue;
                                    }

                                    current = null;
                                    break;
                                }

                                current = current[part];
                            }

                            const lastPart = parts[parts.length - 1];

                            // 1. Tentar atualizar o alvo exato se a navegação foi bem sucedida
                            if (current && typeof current === 'object') {
                                // 🎯 NOVO: Manter texto como string
                                if (p.type === 'text' || p.type === 'string') {
                                    current[lastPart] = p.value.toString();
                                }

                                else if (p.isArray) {
                                    let arrayValue = [];
                                    const val = p.value;

                                    if (Array.isArray(val)) {
                                        arrayValue = val;
                                    } else if (typeof val === 'string') {
                                        arrayValue = val.split(',').map(v => {
                                            const trimmed = v.trim();
                                            const num = parseInt(trimmed);
                                            return isNaN(num) ? trimmed : num;
                                        });
                                    } else {
                                        arrayValue = [val];
                                    }

                                    current[lastPart] = arrayValue;
                                }
                                else {
                                    current[lastPart] = p.value;
                                }
                            }

                            if (ruleFound) {
                                // Lista de propriedades que devem ser sincronizadas na raiz
                                const syncProps = ['count', 'value', 'period', 'targetPercentage', 'operator', 'conditionType'];


                                if (syncProps.includes(lastPart) || ruleFound[lastPart] !== undefined) {
                                    ruleFound[lastPart] = p.value;

                                }


                            }
                        } catch (e) {
                            console.warn('Erro ao atualizar por path:', p.path, e);
                        }
                    }
                }
            });
        }

        const updateObject = (obj) => {
            if (!obj || typeof obj !== 'object') return;

            // 1. Suporte para parameter_key (legado/direto)
            if (obj.parameter_key && paramMap.hasOwnProperty(obj.parameter_key)) {
                const newValue = paramMap[obj.parameter_key];
                if (obj.hasOwnProperty('value')) obj.value = newValue;
                else if (obj.hasOwnProperty('targetValue')) obj.targetValue = newValue;
                else if (obj.hasOwnProperty('count')) obj.count = newValue;
                else if (obj.hasOwnProperty('targetPercentage')) obj.targetPercentage = newValue;
                else if (obj.hasOwnProperty('period')) obj.period = newValue;
                else if (obj.hasOwnProperty('threshold')) obj.threshold = newValue;
                else if (obj.hasOwnProperty('barrier')) obj.barrier = newValue;
                else if (obj.hasOwnProperty('amount')) obj.amount = newValue;
            }

            // 2. Suporte para parameters_map (novo formato Gemini)
            if (obj.parameters_map) {
                Object.entries(obj.parameters_map).forEach(([prop, paramKey]) => {
                    if (paramMap.hasOwnProperty(paramKey)) {
                        const newValue = paramMap[paramKey];
                        // Atualizar a propriedade mapeada
                        obj[prop] = newValue;
                    }
                });
            }

            Object.keys(obj).forEach(key => {
                updateObject(obj[key]);
            });
        };

        rules.groups.forEach(group => {
            // Atualizar valores internos das regras
            updateObject(group);

            // 🔄 Atualizar displayFormat das regras com os novos valores
            if (group.rules) {
                group.rules.forEach(rule => {
                    // Regenerar formato de exibição usando o FormatGenerator
                    const formatGenerator = getFormatGeneratorInstance();
                    if (formatGenerator) {
                        rule.displayFormat = formatGenerator.generateDisplayFormat(rule);
                    }
                });
            }
        });
    }

    // Atualizar valor do parâmetro na memória
    static updateParameterValue(key, value) {

        const rulesSource = this.configModeRules || this.currentTranslatedRules;

        if (!rulesSource || !rulesSource.parameters) return;

        const param = rulesSource.parameters.find(p => p.key === key);
        if (param) {
            // 🎯 NOVO: Suporte para tipos de texto (padrões) ou variáveis
            const isDynamic = typeof value === 'string' && value.startsWith('$');

            if (param.type === 'text' || param.type === 'string' || isDynamic) {
                // Se for dynamic, não uppercase. Se for pattern, uppercase.
                param.value = isDynamic ? value.toString() : value.toString().toUpperCase();
            } else {
                param.value = parseFloat(value);
            }

            // Se estamos em Config Mode, atualizar configModeRules
            if (this.configModeRules) {

                const paramMap = {};
                this.configModeRules.parameters.forEach(p => paramMap[p.key] = p.value);

                // Aplicar aos objetos de regra internos
                this.applyParameters(this.configModeRules, paramMap);

                // Renderizar como preview (isPreview=true)
                this.displayStrategyRules(this.configModeRules, true);
            } else {
                // Se estamos em Monitoring, aplicar alterações normalmente

                this.applyParametersToRules(true);
            }
        }
    }

    // 🎯 NOVO: Validar input de parâmetro baseado no tipo
    static validateParameterInput(input) {
        const validation = input.dataset.validation;

        if (validation === 'pattern') {
            return this.validatePatternInput(input);
        }

        // Validação padrão para números
        if (input.type === 'number') {
            const value = parseFloat(input.value);
            return !isNaN(value);
        }

        return true;
    }

    // 🎯 NOVO: Validar input de padrão (apenas X e O permitidos)
    static validatePatternInput(input) {
        const value = input.value.trim().toUpperCase();

        // Verificar se está vazio
        if (!value) {
            input.setCustomValidity('Padrão não pode estar vazio');
            input.reportValidity();
            return false;
        }

        // Verificar se contém apenas X e O
        if (!/^[XO]+$/.test(value)) {
            input.setCustomValidity('Padrão deve conter apenas X e O');
            input.reportValidity();
            return false;
        }

        // Verificar comprimento (2-20 caracteres)
        if (value.length < 2 || value.length > 20) {
            input.setCustomValidity('Padrão deve ter entre 2 e 20 caracteres');
            input.reportValidity();
            return false;
        }

        // Válido
        input.setCustomValidity('');

        // Auto-converter para maiúsculas
        if (input.value !== value) {
            input.value = value;
        }

        return true;
    }

    // 🎯 NOVO: Carregar TODAS as configurações de ativação de grupos (Mapa completo)
    static loadSavedGroupConfigs() {
        // 🎯 FIX: Fallback seguro se getSessionData não existir
        const getSessionData = (SessionManager.getSessionData && SessionManager.getSessionData.bind(SessionManager)) ||
            ((key) => { try { const sessionId = SessionManager.getUserSessionId(); return JSON.parse(localStorage.getItem(`session_data_${sessionId}_${key}`)); } catch (e) { return null; } });

        const savedConfig = getSessionData('group_activation_config') || {};
        const processedConfig = {};
        for (const groupId in savedConfig) {
            const config = savedConfig[groupId];
            if (config.initial === undefined) config.initial = true; // Default to true if not set
            processedConfig[groupId] = config;
        }
        return processedConfig;
    }

    // 🎯 NOVO: Carregar configurações de todos os grupos
    static loadSavedGroupConfigs() {
        try {
            // 🎯 FIX: Fallback seguro
            const getSessionData = (SessionManager.getSessionData && SessionManager.getSessionData.bind(SessionManager)) ||
                ((key) => { try { const sessionId = SessionManager.getUserSessionId(); return JSON.parse(localStorage.getItem(`session_data_${sessionId}_${key}`)); } catch (e) { return null; } });

            const savedConfig = getSessionData('group_activation_config') || {};
            const processedConfig = {};
            for (const groupId in savedConfig) {
                const config = savedConfig[groupId];
                if (config.initial === undefined) config.initial = true;
                processedConfig[groupId] = config;
            }
            return processedConfig;
        } catch (error) {
            console.error('❌ Erro ao carregar configs de grupos:', error);
            return {};
        }
    }

    // 🎯 NOVO: Gerenciamento de nomes customizados de parâmetros
    static getCustomParameterName(key, defaultLabel) {
        try {
            // 🎯 FIX: Fallback seguro
            const getSessionData = (SessionManager.getSessionData && SessionManager.getSessionData.bind(SessionManager)) ||
                ((key) => { try { const sessionId = SessionManager.getUserSessionId(); return JSON.parse(localStorage.getItem(`session_data_${sessionId}_${key}`)); } catch (e) { return null; } });

            const customNames = getSessionData('parameter_custom_names') || {};
            return customNames[key] || defaultLabel;
        } catch (error) {
            console.error('❌ Erro ao buscar nome customizado:', error);
            return defaultLabel;
        }
    }

    static saveCustomParameterName(key, customName) {
        try {
            // Validar input
            if (!customName || typeof customName !== 'string') {

                return false;
            }

            // Limitar tamanho
            const sanitizedName = customName.trim().substring(0, 50);
            if (sanitizedName.length === 0) {

                return false;
            }

            // Sanitizar HTML para prevenir XSS
            const div = document.createElement('div');
            div.textContent = sanitizedName;
            const safeName = div.innerHTML;

            // Salvar no localStorage
            const customNames = (SessionManager.getSessionData && SessionManager.getSessionData('parameter_custom_names')) ||
                (function () { try { const sessionId = SessionManager.getUserSessionId(); return JSON.parse(localStorage.getItem(`session_data_${sessionId}_parameter_custom_names`)); } catch (e) { return {}; } })() || {};

            customNames[key] = safeName;

            if (SessionManager.setSessionData) {
                SessionManager.setSessionData('parameter_custom_names', customNames);
            } else {
                const sessionId = SessionManager.getUserSessionId();
                localStorage.setItem(`session_data_${sessionId}_parameter_custom_names`, JSON.stringify(customNames));
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar nome customizado:', error);
            return false;
        }
    }

    static deleteCustomParameterName(key) {
        try {
            const customNames = (SessionManager.getSessionData && SessionManager.getSessionData('parameter_custom_names')) ||
                (function () { try { const sessionId = SessionManager.getUserSessionId(); return JSON.parse(localStorage.getItem(`session_data_${sessionId}_parameter_custom_names`)); } catch (e) { return {}; } })() || {};

            delete customNames[key];

            if (SessionManager.setSessionData) {
                SessionManager.setSessionData('parameter_custom_names', customNames);
            } else {
                const sessionId = SessionManager.getUserSessionId();
                localStorage.setItem(`session_data_${sessionId}_parameter_custom_names`, JSON.stringify(customNames));
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao remover nome customizado:', error);
            return false;
        }
    }


    // 🔧 NOVO: Atualizar valor de parâmetro quando usuário edita
    static updateParameterValue(paramKey, newValue) {


        // Se monitoramento está IDLE, usar configModeRules (rascunho)
        const isMonitoringActive = this.state === 'MONITORING' || this.state === 'COOLDOWN';
        let rules;

        if (isMonitoringActive) {
            rules = this.currentTranslatedRules;
            // Garantir que configModeRules não interfira se criado acidentalmente
            this.configModeRules = null;
        } else {
            rules = this.configModeRules || this.currentTranslatedRules;
        }

        if (!rules || !rules.parameters) {

            return;
        }

        // Encontrar o parâmetro
        const param = rules.parameters.find(p => p.key === paramKey);
        if (!param) {

            return;
        }

        // 🔧 CRÍTICO: Se for array (ex: allowedDigits), converter string para array com segurança
        if (param.isArray) {
            let arrayValue = [];

            // 🛡️ PROTEÇÃO: Verificar tipo do input antes de processar
            if (Array.isArray(newValue)) {
                // Se já é array, usar diretamente
                arrayValue = newValue;
            } else if (typeof newValue === 'number') {
                // Se é número, converter para array de um elemento
                arrayValue = [newValue];
            } else if (typeof newValue === 'string') {
                // Se é string, tentar fazer o split
                arrayValue = newValue.split(',').map(v => {
                    const trimmed = v.trim();
                    const num = parseInt(trimmed);
                    return isNaN(num) ? trimmed : num;
                });
            } else {
                console.warn('⚠️ [UPDATE PARAM] Tipo de valor desconhecido para array:', typeof newValue, newValue);
                // Tentar converter para string e logar
                arrayValue = [newValue];
            }

            // Se arrayValue for [1, 2], transformar em "1, 2"
            param.value = Array.isArray(newValue) ? newValue.join(', ') : newValue.toString();

            // Aplicar array diretamente à regra usando o path
            if (param.path) {

                this.setValueByPath(rules, param.path, arrayValue);

                // 🔧 CRÍTICO: Para allowedDigits, TAMBÉM salvar em parameters.allowedDigits
                if (param.path.includes('allowedDigits')) {
                    const paramsPath = param.path.replace('rules[', 'rules[').replace('].allowedDigits', '].parameters.allowedDigits');
                    this.setValueByPath(rules, paramsPath, arrayValue);

                }
            }
        } else {
            // Para valores normais (números, strings)
            const parsedValue = param.type === 'number' ? parseFloat(newValue) : newValue;
            param.value = parsedValue;

            // Aplicar à regra usando o path
            if (param.path) {
                this.setValueByPath(rules, param.path, parsedValue);
            }
        }

        // MAS se for monitoring, applyParametersToRules será chamado abaixo
        if (!isMonitoringActive && rules === this.configModeRules) {
            // Modo de edição (offline): atualizar apenas a visualização
            this.displayStrategyRules(rules);
        } else if (isMonitoringActive) {
            // Modo Online: Forçar aplicação para garantir atualização visual imediata
            this.applyParametersToRules(true);
        }

        // ISSO SÓ DEVE ACONTECER SE ESTIVERMOS OFFLINE
        if (!isMonitoringActive && !this.configModeRules && this.currentTranslatedRules) {

            this.configModeRules = JSON.parse(JSON.stringify(this.currentTranslatedRules));
        }
    }

    // 🔧 NOVO: Definir valor usando path (ex: "groups[0].rules[0].allowedDigits")
    static setValueByPath(obj, path, value) {
        const keys = path.split(/[\[\].]/).filter(k => k !== '');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (current[key] === undefined) {
                current[key] = isNaN(keys[i + 1]) ? {} : [];
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
    }

    static applyParametersToRules(forceUpdate = false) {
        if (!this.currentTranslatedRules || !this.currentTranslatedRules.parameters) return;

        const parameters = this.currentTranslatedRules.parameters;

        // Mapa de parâmetros para acesso rápido
        const paramMap = {};
        parameters.forEach(p => paramMap[p.key] = p.value);

        // Aplicar parâmetros usando a lógica centralizada
        this.applyParameters(this.currentTranslatedRules, paramMap);

        // forceUpdate = false quando apenas alternando para Config Mode
        const isMonitoringActive = this.state === 'MONITORING' || this.state === 'COOLDOWN';

        // 🔧 CRÍTICO: Se estamos editando parâmetros EM TEMPO REAL, forçar atualização visual
        if (isMonitoringActive || forceUpdate) {
            // 🔄 CRÍTICO: Atualizar visualização das regras (texto/cards)
            this.displayStrategyRules(this.currentTranslatedRules);

            // 🔄 CRÍTICO: Forçar atualização dos visuais (bolhas)
            this.updateRuleVisualsImmediate();
        }
    }

    // Anexar listeners para botões reposicionados no header
    static attachHeaderButtonListeners() {
        // Listener para ícone de ajuda
        const helpIcon = document.querySelector('.header-center-actions #help-icon');
        if (helpIcon && !helpIcon.hasAttribute('data-listener-attached')) {
            helpIcon.setAttribute('data-listener-attached', 'true');
            helpIcon.addEventListener('click', () => {
                if (window.HelpManual && typeof window.HelpManual.showModal === 'function') {
                    window.HelpManual.showModal();
                }
            });
        }


        // 🎯 NOVO: Listener para resultado de trade (Controle de Grupos)
        window.addEventListener('tradeExecuted', (event) => {
            const { result, mode, simulated } = event.detail;

            // Atualizar estado
            MonitoringView.lastTradeOutcome = { result, mode, simulated };

            // Atualizar visual imediatamente
            MonitoringView.applyActiveGroupsVisibility();

            logConfig.info('monitoring', `🎲 [GROUP CONTROL] Trade Outcome: ${result} (${mode}). Updating groups...`);
        });

        // Listener para botão de automações
        const automacaoBtn = document.querySelector('.header-center-actions #automacao-floating-btn');
        if (automacaoBtn && !automacaoBtn.hasAttribute('data-listener-attached')) {
            automacaoBtn.setAttribute('data-listener-attached', 'true');
            automacaoBtn.addEventListener('click', () => {

                // Tentar usar instância existente
                if (window.directAutomacao && typeof window.directAutomacao.showModal === 'function') {

                    window.directAutomacao.showModal();
                }
                // Fallback: criar instância se não existir
                else if (typeof DirectAutomacao !== 'undefined') {

                    window.directAutomacao = new DirectAutomacao();
                    window.directAutomacaoInstance = window.directAutomacao;
                    // Aguardar um momento para garantir que a instância foi criada
                    setTimeout(() => {
                        window.directAutomacao.showModal();
                    }, 100);
                }
                // Último recurso: log de erro
                else {
                    console.error('❌ [AUTOMACAO] DirectAutomacao não disponível - script não carregado');
                    alert('Erro: Sistema de automações não disponível. Recarregue a página.');
                }
            });

        }

        // Listener para botão Editor de Robôs
        const robotEditorBtn = document.querySelector('.header-center-actions #robot-editor-btn');
        if (robotEditorBtn && !robotEditorBtn.hasAttribute('data-listener-attached')) {
            robotEditorBtn.setAttribute('data-listener-attached', 'true');
            robotEditorBtn.addEventListener('click', () => {
                if (window.RobotEditor && typeof window.RobotEditor.open === 'function') {
                    window.RobotEditor.open();
                } else {
                    console.error('❌ Robot Editor não inicializado');
                    if (typeof RobotEditorView !== 'undefined') {
                        window.RobotEditor = new RobotEditorView();
                        window.RobotEditor.open();
                    }
                }
            });
        }

        // Listener para botão IA
        const iaBtn = document.querySelector('.header-center-actions #floating-ia-button');
        if (iaBtn && !iaBtn.hasAttribute('data-listener-attached')) {
            iaBtn.setAttribute('data-listener-attached', 'true');
            iaBtn.addEventListener('click', async () => {
                if (window.FooterManager && typeof window.FooterManager.handleIAButtonClick === 'function') {
                    await window.FooterManager.handleIAButtonClick();
                }
            });
        }

        // Listener para botão de gráfico
        const chartBtn = document.querySelector('.header-center-actions #chart-modal-btn');
        if (chartBtn && !chartBtn.hasAttribute('data-listener-attached')) {
            chartBtn.setAttribute('data-listener-attached', 'true');
            chartBtn.addEventListener('click', () => {
                if (typeof getChartModalInstance === 'function') {
                    const chartModal = getChartModalInstance();
                    chartModal.show();
                }
            });
        }

        // Listener para botão VIP
        const vipBtn = document.querySelector('.header-center-actions .vip-upgrade-button');
        if (vipBtn && !vipBtn.hasAttribute('data-listener-attached')) {
            vipBtn.setAttribute('data-listener-attached', 'true');
            vipBtn.addEventListener('click', () => {
                if (window.VipPaymentModal && typeof window.VipPaymentModal.show === 'function') {
                    window.VipPaymentModal.show();
                }
            });
        }

        // Listener para botão Biblioteca de Estratégias
        const strategyBtn = document.querySelector('.header-center-actions #strategy-library-btn');
        if (strategyBtn && !strategyBtn.hasAttribute('data-listener-attached')) {
            strategyBtn.setAttribute('data-listener-attached', 'true');
            strategyBtn.addEventListener('click', () => {
                if (window.strategyLibraryModal) {
                    window.strategyLibraryModal.show();
                } else {
                    console.error('❌ Strategy Library Modal não inicializado');
                }
            });
        }
    }

    static setupGlobalReconnectionListener() {
        // Remover listener anterior se existir
        if (MonitoringView.globalServerOnlineListener) {
            window.removeEventListener('derivWebSocketReconnected', MonitoringView.globalServerOnlineListener);
        }

        // Criar listener global
        MonitoringView.globalServerOnlineListener = async (event) => {
            // Limpar referência órfã
            if (MonitoringView.mainTickUnsubscribe) {
                MonitoringView.mainTickUnsubscribe = null;
            }

            // Só recuperar se tinha REGRAS ativas
            if (!MonitoringView.currentTranslatedRules) {
                return;
            }

            // Recuperar monitoramento se estava ativo
            if (MonitoringView.state === 'MONITORING' ||
                MonitoringView.state === 'COOLDOWN_PROTECTED' ||
                MonitoringView.state === 'COOLDOWN') {

                MonitoringView.recoverFromDisconnection();
            }
        };

        // Registrar listener global - Escutar evento correto disparado pelo DerivMarketData
        window.addEventListener('derivWebSocketReconnected', MonitoringView.globalServerOnlineListener);

    }

    // ✅ CRÍTICO: Limpar callbacks e subscrições antigas durante troca de conta
    static setupAccountSwitchListener() {
        // Remover listener anterior se existir
        if (MonitoringView.globalAccountSwitchListener) {
            window.removeEventListener('accountSwitched', MonitoringView.globalAccountSwitchListener);
        }

        // Criar listener global para troca de conta
        MonitoringView.globalAccountSwitchListener = async (event) => {

            // Limpar callbacks da conta anterior
            if (MonitoringView.mainTickUnsubscribe) {
                try {
                    MonitoringView.mainTickUnsubscribe();
                } catch (e) {
                    // Esperado - callback pode não existir mais
                }
                MonitoringView.mainTickUnsubscribe = null;
            }

            // Limpar tickCallbacks
            if (MonitoringView.tickCallbacks && MonitoringView.tickCallbacks.size > 0) {
                MonitoringView.tickCallbacks.clear();
            }

            // Limpar listeners de dados de mercado
            if (MonitoringView.marketDataUpdateListener) {
                document.removeEventListener('marketDataUpdate', MonitoringView.marketDataUpdateListener);
                MonitoringView.marketDataUpdateListener = null;
            }

            // Resetar botões para estado IDLE (Iniciar habilitado, Parar desabilitado)
            MonitoringView.updateMonitoringStatus(false);

        };

        // Registrar listener global
        window.addEventListener('accountSwitched', MonitoringView.globalAccountSwitchListener);
    }


    static attachParameterValidationListener() {
        // Remover listener anterior se existir
        const existingListener = window.parameterValidationListener;
        if (existingListener) {
            window.removeEventListener('parameterValidationError', existingListener);
        }

        // Criar novo listener
        const parameterValidationListener = async (event) => {
            const validationData = event.detail;

            // Mostrar modal de validação para o usuário
            const userChoice = await StrategyValidationModal.showForParameterValidation(
                validationData.rule,
                validationData.message,
                validationData.suggestedFix
            );

            if (userChoice.action === 'correct') {
                // Usuário quer corrigir manualmente

                // Parar o monitoramento se estiver ativo
                if (MonitoringView.state !== 'IDLE') {
                    MonitoringView.stopMonitoring();
                }

                // Destacar campo de estratégia para correção
                const strategyTextArea = CommonHelpers.getElement('strategy-text');
                if (strategyTextArea) {
                    strategyTextArea.focus();
                    strategyTextArea.style.border = '2px solid #dc2626';
                    setTimeout(() => {
                        strategyTextArea.style.border = '';
                    }, 5000);
                }

                return;
            } else if (userChoice.action === 'continue') {

                return;
            } else {

                // Parar o monitoramento
                if (MonitoringView.state !== 'IDLE') {
                    MonitoringView.stopMonitoring();
                }

                return;
            }
        };

        // Adicionar o listener
        window.addEventListener('parameterValidationError', parameterValidationListener);

        // Armazenar referência para remoção posterior
        window.parameterValidationListener = parameterValidationListener;
    }

    static attachEventListeners() {

        // 🛡️ PROTEÇÃO CRÍTICA: Só anexar listeners UMA VEZ
        if (this._listenersAttached) {

            return;
        }

        this._listenersAttached = true;

        // ✅ NOVO: Anexar listeners para estados desabilitados
        this.attachDisabledStateListeners();

        // 👁️ NOVO: Detectar quando a aba volta a ser ativa para destravar renderização
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {

                MonitoringView.pendingUpdate = false;
                MonitoringView.pendingVisualUpdate = false;

                // Forçar atualização imediata
                requestAnimationFrame(() => {
                    try {
                        if (MonitoringView.state === 'MONITORING' || MonitoringView.state === 'COOLDOWN') {
                            MonitoringView.updateRuleVisuals();
                            MonitoringView.updateTradingCounters();
                        }
                    } catch (e) {
                        console.error('Erro na atualização forçada por visibilidade:', e);
                    }
                });
            }
        });

        // Listeners para alternância de modo
        const textBtn = document.getElementById('mode-text-btn');
        const configBtn = document.getElementById('mode-config-btn');

        if (textBtn) {
            textBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
                this.toggleConfigMode('text');
            });
        }

        if (configBtn) {
            configBtn.addEventListener('click', (event) => {

                event.stopPropagation();
                event.preventDefault();
                this.toggleConfigMode('config');
            });
        }

        // Toggle editor visibility
        const toggleEditorBtn = document.getElementById('toggle-editor-btn');
        if (toggleEditorBtn) {
            toggleEditorBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();

                const textContainer = document.getElementById('text-mode-container');
                const configContainer = document.getElementById('config-mode-container');

                const isHidden = textContainer.style.display === 'none' && configContainer.style.display === 'none';

                if (isHidden) {
                    // Re-mostrar baseado no modo ativo
                    if (textBtn.classList.contains('active')) {
                        textContainer.style.display = 'block';
                    } else {
                        configContainer.style.display = 'block';
                    }
                    toggleEditorBtn.classList.add('active');
                } else {
                    // Ocultar ambos
                    textContainer.style.display = 'none';
                    configContainer.style.display = 'none';
                    toggleEditorBtn.classList.remove('active');
                }
            });
        }

        const startBtn = CommonHelpers.getElement('start-monitoring-btn');
        const stopBtn = CommonHelpers.getElement('stop-monitoring-btn');
        const strategyText = CommonHelpers.getElement('strategy-text');
        const immediateCheckbox = CommonHelpers.getElement('immediate-execution-mode');

        if (startBtn) {
            // 🛡️ PROTEÇÃO: Remover listener antigo se existir
            if (this._startMonitoringListener) {
                startBtn.removeEventListener('click', this._startMonitoringListener);
            }

            // Marcar timestamp de quando o listener foi anexado
            this._listenerAttachedAt = Date.now();

            // Criar novo listener
            this._startMonitoringListener = async (event) => {
                const timeSinceAttach = Date.now() - this._listenerAttachedAt;

                // 🎯 CRÍTICO: Forçar blur na textarea para salvar regras antes de iniciar
                const strategyTextarea = CommonHelpers.getElement('strategy-text');
                if (strategyTextarea && document.activeElement === strategyTextarea) {
                    strategyTextarea.blur();

                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // 🎯 CRÍTICO: Sincronizar estado com botão (botão é a fonte da verdade)
                if (!startBtn.disabled) {
                    // Botão habilitado = estado DEVE ser IDLE
                    if (this.state === 'MONITORING' || this.state === 'COOLDOWN') {

                        this.state = 'IDLE';

                        // Limpar possíveis resíduos de monitoramento anterior
                        this._clearAllIntervals();
                        this._resetMonitoringState();
                    }
                } else {

                    return;
                }

                // Verificação de segurança adicional
                if (this.state === 'MONITORING' || this.state === 'COOLDOWN') {

                    console.error('🚨 [STATE SYNC] Botão disabled:', startBtn.disabled);
                    return;
                }

                // Isso previne cliques automáticos/programáticos
                if (timeSinceAttach < 500) {

                    return;
                }

                // 🛡️ PROTEÇÃO: Só aceitar cliques confiáveis (do usuário)
                if (!event.isTrusted) {

                    return;
                }

                // Isso garante que o usuário saiba que o clique foi registrado
                const originalBtnText = startBtn.innerHTML;
                startBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Validando...';
                startBtn.disabled = true;

                try {
                    // Validar configurações antes de iniciar monitoramento
                    const validationResult = this.validateRequiredConfigurations();
                    if (!validationResult.isValid) {
                        this.showConfigurationAlert(validationResult.missingFields);
                        // Restaurar botão se validação falhar
                        startBtn.innerHTML = originalBtnText;
                        startBtn.disabled = false;
                        return;
                    }

                    // Atualizar texto para indicar próxima etapa
                    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';

                    await this.startMonitoring();


                } catch (error) {
                    console.error('❌ Erro crítico ao iniciar monitoramento:', error);
                    CommonHelpers.showError('Erro ao iniciar: ' + error.message);

                    // Restaurar botão em caso de crash
                    startBtn.innerHTML = originalBtnText;
                    startBtn.disabled = false;
                }
            };

            // Adicionar listener
            startBtn.addEventListener('click', this._startMonitoringListener);

        }

        // Listener para mudança no checkbox de execução imediata
        if (immediateCheckbox && !immediateCheckbox.hasAttribute('data-listener-attached')) {
            immediateCheckbox.setAttribute('data-listener-attached', 'true');

            immediateCheckbox.addEventListener('change', (e) => {
                this.updateImmediateModeUI(e.target.checked);
            });
        }

        if (stopBtn && !stopBtn.hasAttribute('data-listener-attached')) {
            stopBtn.setAttribute('data-listener-attached', 'true');

            stopBtn.addEventListener('click', () => {


                if (stopBtn.disabled) {
                    CommonHelpers.showWarning('[STOP BUTTON] Botão está desabilitado mas foi clicado?');
                    return;
                }


                MonitoringView.stopMonitoring();

                // Verificar se parada foi efetiva
                setTimeout(() => {

                }, 200);
            });
        }

        if (strategyText) {
            // Salvar estratégia automaticamente quando o usuário digitar
            strategyText.addEventListener('input', () => {
                this.saveStrategy();

                // 🧹 CRÍTICO: Limpar caches ao editar texto para forçar nova tradução/validação
                if (window.regrasJsonManager) {
                    window.regrasJsonManager.clearCachedGeminiJson();
                }
                this.configModeRules = null; // Invalidar regras do modo config
            });

            // Gerenciar asteriscos automáticos e organização
            this.setupAutoAsterisk(strategyText);
            this.setupRuleOrganizer(strategyText);
        }
    }

    // ✅ NOVO: Habilitar/Desabilitar inputs durante monitoramento
    static setInputsDisabled(disabled) {

        const strategyText = document.getElementById('strategy-text');
        if (strategyText) {
            strategyText.disabled = false;
            strategyText.style.opacity = '1';
            strategyText.style.pointerEvents = 'auto';
            strategyText.style.cursor = 'text';
        }

        const parameterInputs = document.querySelectorAll('.parameter-input');
        parameterInputs.forEach(input => {
            input.disabled = false;
            input.style.opacity = '1';
            input.style.cursor = 'text';
        });

        const textBtn = document.getElementById('mode-text-btn');
        const configBtn = document.getElementById('mode-config-btn');

        if (textBtn) {
            textBtn.style.pointerEvents = 'auto';
            textBtn.style.opacity = '1';
            textBtn.style.cursor = 'pointer';
            textBtn.classList.remove('monitoring-disabled');
        }
        if (configBtn) {
            configBtn.style.pointerEvents = 'auto';
            configBtn.style.opacity = '1';
            configBtn.style.cursor = 'pointer';
            configBtn.classList.remove('monitoring-disabled');
        }
    }

    // 🛡️ NOVO: Anexar listeners para elementos desabilitados
    static attachDisabledStateListeners() {

        if (this._disabledListenersAttached) return;
        this._disabledListenersAttached = true;

        const showDisabledWarning = (e) => {
            // Só mostrar aviso se estiver monitorando
            if (this.state === 'MONITORING' || this.state === 'COOLDOWN' || this.state === 'EXECUTING') {
                e.preventDefault();
                e.stopPropagation();
                CommonHelpers.showToast('⚠️ Pare o monitoramento para editar as regras ou configurações', 'warning');
            }
        };

        // 1. Botões de Modo
        const textBtn = document.getElementById('mode-text-btn');
        const configBtn = document.getElementById('mode-config-btn');

        [textBtn, configBtn].forEach(btn => {
            if (btn) {
                // Interceptar click
                btn.addEventListener('click', (e) => {
                    if (btn.classList.contains('monitoring-disabled')) {
                        showDisabledWarning(e);
                    }
                }, true); // Use capture phase to ensure we catch it first

                // Interceptar hover
                btn.addEventListener('mouseenter', () => {
                    if (btn.classList.contains('monitoring-disabled')) {
                        // Opcional: mostrar tooltip ou mudar status
                    }
                });
            }
        });

        // 2. Wrapper da Área de Texto
        const textWrapper = document.querySelector('.strategy-input-wrapper');
        if (textWrapper) {
            textWrapper.addEventListener('click', (e) => {
                const strategyText = document.getElementById('strategy-text');
                if (strategyText && strategyText.disabled) {
                    showDisabledWarning(e);
                }
            }, true);

            textWrapper.addEventListener('mouseenter', () => {
                const strategyText = document.getElementById('strategy-text');
                if (strategyText && strategyText.disabled) {
                    // Opcional: feedback visual
                }
            });
        }
    }

    // Iniciar monitoramento com análise da estratégia
    static async startMonitoring() {
        // Feedback visual imediato
        const startBtn = CommonHelpers.getElement('start-monitoring-btn');
        let originalBtnText = '';
        if (startBtn) {
            originalBtnText = startBtn.innerHTML;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
            startBtn.disabled = true;
        }

        // 💾 CAPTURAR PARÂMETROS ANTES DE LIMPAR A TELA OU MEMÓRIA
        const preservedUIParams = this.readParametersFromUI();

        try {
            // 🧹 CRÍTICO: Limpar completamente o display de regras ANTES de iniciar
            this._clearRulesDisplay();

            // 🧹 CRÍTICO: Limpar regras de modo configuração para evitar contaminação
            this.configModeRules = null;

            // ✅ NOVO: Desabilitar inputs
            this.setInputsDisabled(true);

            // Limpar estado anterior completamente
            getCooldownOverlayInstance().clearPreviousOverlay();
            this._clearAllIntervals();
            this._resetMonitoringState();

            // ✅ NOVO: Marcar inicio da inicialização
            this.state = 'INITIALIZING';
            this.updateMonitoringStatus(true);

            this.isExecutingTrade = false;
            this.awaitingExpiration = false;
            this.pendingAsteriskCheck = false;
            this.lastAwaitingExpirationTime = null;
            this.pendingUpdate = false;
            this.lastUpdateTime = 0;

            // ✅ Resetar sistema de pausa
            if (window.PauseManager) {
                window.PauseManager.forceStop();
            }
            if (window.tradeManager) {
                window.tradeManager.pauseTradeCounter = 0;
                window.tradeManager.isPaused = false;
            }

            // ✅ Resetar cooldown via CooldownOverlay (centralized)
            const cooldownOverlay = getCooldownOverlayInstance();
            cooldownOverlay.cooldownActive = false;
            cooldownOverlay.cooldownTicksRemaining = 0;
            cooldownOverlay.cooldownTicksTotal = 3;

            // ✅ CORREÇÃO: Apenas CARREGAR mensagens salvas, NÃO limpar
            try {
                const messagesManager = getTradeMessagesInstance();
                if (messagesManager) {
                    messagesManager.loadSavedMessages(); // Apenas carregar mensagens existentes
                }
            } catch (error) {
            }

            // Validações
            const validation = this._validatePreconditions();
            if (!validation.isValid) {
                this.setInputsDisabled(false); // Reabilitar se falhar validação
                if (startBtn) {
                    startBtn.innerHTML = originalBtnText;
                    startBtn.disabled = false;
                }
                return;
            }
            const { strategyText } = validation;

            // Setup
            const context = await this._prepareExecutionContext();

            // 🛡️ [STOP SYNC] Verificar se foi interrompido durante o setup
            if (this._checkAbort()) return;

            if (!context.isValid) {
                this.state = 'IDLE'; // Resetar estado se falhar
                this.setInputsDisabled(false); // Reabilitar se falhar setup
                if (startBtn) {
                    startBtn.innerHTML = originalBtnText;
                    startBtn.disabled = false;
                }
                return;
            }
            const { gemini } = context;

            // Isso permite que regras em cache sejam carregadas instantaneamente
            if (startBtn) startBtn.innerHTML = '<i class="fas fa-search"></i> Verificando regras...';

            // 🔧 CORREÇÃO: Declarar strategyValue FORA do try para estar acessível no catch
            let strategyValue;

            // 🔧 NOVO: Flag para evitar cobrança dupla de créditos
            this.geminiCreditsAlreadyCharged = false;

            try {
                strategyValue = strategyText.value;

                // 🎯 Verificar se "Entrada Imediata" está marcado
                const immediateCheckbox = CommonHelpers.getElement('immediate-execution-mode');
                const isImmediateMode = immediateCheckbox && immediateCheckbox.checked;

                // 🎯 Se estratégia vazia OU "Entrada Imediata" marcado = criar regras vazias
                let translatedRules;
                if (!strategyValue.trim() || isImmediateMode) {
                    // Estratégia vazia OU modo imediato = usar config do painel (entrada imediata)
                    translatedRules = {
                        groups: [],
                        contract_type: null,
                        prediction: null
                    };
                    if (isImmediateMode) {

                    } else {
                    }
                } else {

                    const regrasJsonManager = getRegrasJsonManagerInstance();

                    // Verificação 1: Código embutido no texto (comentário HTML invisível)
                    const hasRuleCode = regrasJsonManager.extractRuleCodeFromText(strategyValue);

                    // Verificação 2: JSON cached (setado quando carrega do histórico)
                    const hasCachedJson = regrasJsonManager.hasCachedJson();

                    // Verificação 3: JSON pré-carregado de template
                    const hasConfigModeJson = this.configModeRules && this.configModeRules.originalText === strategyValue;

                    // Verificação 4: Buscar no histórico de regras por texto correspondente
                    let hasHistoricalJson = false;
                    try {
                        const rulesHistory = window.rulesHistoryManager?.getHistory() || [];
                        const normalizedStrategy = strategyValue.trim().toLowerCase();

                        hasHistoricalJson = rulesHistory.some(item => {
                            if (!item.hasJson || !item.geminiJson) return false;

                            // Comparar com originalText do JSON
                            const originalText = item.geminiJson.originalText || item.rule;
                            const normalizedOriginal = originalText.trim().toLowerCase();

                            return normalizedOriginal === normalizedStrategy;
                        });


                    } catch (error) {
                        console.warn('⚠️ [FILTRO] Erro ao buscar no histórico:', error);
                    }

                    const hasExistingJson = hasRuleCode || hasCachedJson || hasConfigModeJson || hasHistoricalJson;


                    let filteredStrategyValue = strategyValue;

                    // 🔧 FILTRO: Aplicar pré-processamento APENAS se NÃO houver JSON existente
                    if (!hasExistingJson) {
                        const preprocessResult = this._preprocessStrategyForGemini(strategyValue);
                        filteredStrategyValue = preprocessResult.processedStrategy;

                        // Mostrar correções no console se houver
                        if (preprocessResult.corrections.length > 0) {

                            preprocessResult.corrections.forEach((correction, index) => {

                            });
                        }
                    }

                    this._skipPreprocessor = true;

                    // Resolver tradução (cached/código/histórico/Gemini) com texto filtrado
                    translatedRules = await this._resolveTranslatedRules(filteredStrategyValue);

                    // 🛡️ [STOP SYNC] Verificar se foi interrompido durante a tradução
                    if (this._checkAbort()) {
                        this._skipPreprocessor = false;
                        return;
                    }

                    // Limpar flag
                    this._skipPreprocessor = false;

                    if (!translatedRules) {
                        this.state = 'IDLE'; // Resetar estado se falhar
                        this.setInputsDisabled(false); // Reabilitar se falhar tradução
                        return;
                    }
                }

                // Isso permite que regras cached carreguem sem aguardar conexão
                const connectionPromise = (async () => {
                    try {
                        const tradeManager = getTradeManagerInstance();
                        if (tradeManager) {
                            if (startBtn) startBtn.innerHTML = '<i class="fas fa-network-wired"></i> Conectando...';

                            // 🔍 Verificar se já está conectado
                            if (!tradeManager.tradingAPIConnected) {
                                try {
                                    const connected = await tradeManager.initializeTradingConnection();
                                    if (!connected) {
                                        throw new Error("Não foi possível conectar ao servidor de trading.");
                                    }
                                } catch (connError) {
                                    console.warn('⚠️ [TRADING CONNECTION] Falha na conexão, mas continuando monitoramento:', connError);
                                    CommonHelpers.showWarning('⚠️ Conexão com servidor de trading falhou. Monitoramento continuará, mas trades podem falhar.');
                                }
                            }

                            // ⚡ OTIMIZAÇÃO CRÍTICA: Iniciar cache de proposals
                            await tradeManager.startProposalCaching();
                        }
                    } catch (error) {
                        console.warn('Erro ao inicializar conexão de trading:', error);
                    }
                })();


                if (startBtn) startBtn.innerHTML = '<i class="fas fa-cog fa-spin"></i> Preparando monitoramento...';

                // Validar a tradução recebida (pular se estratégia vazia)
                if (strategyValue.trim()) {
                    // 🎯 CRÍTICO: Salvar texto original para validação no modo Config
                    if (translatedRules) {
                        translatedRules.originalText = strategyValue;
                    }

                    const ruleValidation = this.validateTranslatedRules(translatedRules, strategyValue);
                    if (!ruleValidation.isValid) {
                        this.highlightStrategyForCorrection(ruleValidation.issues);
                        this.showError(`Erro na tradução da estratégia: ${ruleValidation.issues.map(i => i.message).join(' ')} `);
                        this.setInputsDisabled(false); // Reabilitar se falhar validação de regras
                        return;
                    }
                    translatedRules = ruleValidation.correctedStrategy || translatedRules;

                    if (Object.keys(preservedUIParams).length > 0) {
                        this.applyParameters(translatedRules, preservedUIParams);
                    }

                    // 🔄 Atualizar UI de parâmetros com os valores atuais
                    if (translatedRules.parameters) {
                        this.renderParametersUI(translatedRules.parameters);
                    }
                }

                try {
                    const tradeManager = getTradeManagerInstance();
                    if (tradeManager) {

                        tradeManager.realWinsStreak = 0;
                        tradeManager.realLossesStreak = 0;
                        tradeManager.simulatedWinsStreak = 0;
                        tradeManager.simulatedLossesStreak = 0;
                        tradeManager.accumulatedLosses = 0;
                        tradeManager.lastCalculatedStake = null;
                        tradeManager.currentProposalPayout = null;
                        tradeManager.pendingGaleApplication = false;

                        // 🔄 CRÍTICO: Resetar sistema de Gale seletivo em modo BOTH
                        tradeManager.pendingGaleByContract = {};
                        tradeManager.accumulatedLossesByContract = {};

                        // 🔄 CRÍTICO: Sincronizar sessionProfitLoss com o que está na UI (TradeMessagesManager)
                        const messagesManager = getTradeMessagesInstance();
                        if (messagesManager) {
                            tradeManager.sessionProfitLoss = messagesManager.realProfitLoss || 0;
                            logConfig.info('monitoring', `💰 Sincronizando P&L Inicial: ${tradeManager.sessionProfitLoss.toFixed(2)}`);
                        } else {
                            tradeManager.sessionProfitLoss = 0;
                        }

                        tradeManager.popupShown = false;


                        // 🔄 CRÍTICO: Resetar riskController se existir
                        if (tradeManager.riskController) {
                            tradeManager.riskController.realWinsStreak = 0;
                            tradeManager.riskController.realLossesStreak = 0;
                            tradeManager.riskController.simulatedWinsStreak = 0;
                            tradeManager.riskController.simulatedLossesStreak = 0;
                            tradeManager.riskController.accumulatedLosses = 0;
                            tradeManager.riskController.lastCalculatedStake = null;
                            tradeManager.riskController.currentProposalPayout = null;
                            tradeManager.riskController.lastRealGaleValue = 0;

                        }



                        tradeManager.translatedRules = translatedRules;
                    } else {
                    }
                } catch (error) {
                }


                // para modo REAL antes dos dados históricos estarem prontos (2+ segundos)
                this.currentTranslatedRules = translatedRules;

                // 🔧 CRÍTICO: Verificar se é a MESMA regra ou regra DIFERENTE
                const isSameRule = this.configModeRules &&
                    this.configModeRules.originalText === translatedRules.originalText;

                if (!isSameRule) {
                    // Regra DIFERENTE: resetar configModeRules

                    this.configModeRules = null;
                    this.configModeRules = JSON.parse(JSON.stringify(translatedRules));
                }


                if (this.configModeRules && this.configModeRules.parameters) {
                    this.configModeRules.parameters.forEach(configParam => {
                        // Encontrar o parâmetro correspondente em currentTranslatedRules
                        const currentParam = this.currentTranslatedRules.parameters?.find(p => p.key === configParam.key);

                        if (currentParam) {
                            // Copiar o valor
                            currentParam.value = configParam.value;

                            // Se for array, converter e aplicar com segurança
                            if (configParam.isArray && configParam.path) {
                                let arrayValue = [];
                                const val = configParam.value;

                                if (Array.isArray(val)) {
                                    arrayValue = val;
                                } else if (typeof val === 'string') {
                                    arrayValue = val.split(',').map(v => {
                                        const trimmed = v.trim();
                                        const num = parseInt(trimmed);
                                        return isNaN(num) ? trimmed : num;
                                    });
                                } else {
                                    arrayValue = [val];
                                }
                                this.setValueByPath(this.currentTranslatedRules, configParam.path, arrayValue);

                                // 🔧 TAMBÉM copiar para parameters.allowedDigits se existir
                                if (configParam.path.includes('allowedDigits')) {
                                    const paramsPath = configParam.path.replace('.allowedDigits', '.parameters.allowedDigits');
                                    this.setValueByPath(this.currentTranslatedRules, paramsPath, arrayValue);
                                }
                            }
                            // Se for número ou string normal
                            else if (configParam.path) {
                                const parsedValue = configParam.type === 'number' ? parseFloat(configParam.value) : configParam.value;
                                this.setValueByPath(this.currentTranslatedRules, configParam.path, parsedValue);
                            }
                        }
                    });

                    // ✅ CRÍTICO: Atualizar inputs visuais com valores editados
                    setTimeout(() => {
                        this.currentTranslatedRules.parameters.forEach(param => {
                            const input = document.querySelector(`input[data-key="${param.key}"]`);
                            if (input && param.value && input.value !== param.value.toString()) {
                                input.value = param.value;

                            }
                        });
                    }, 0); // Delay 0ms = executa imediatamente na próxima iteração do event loop
                }

                // 🛡️ [STOP SYNC] Última verificação antes de entrar no estado MONITORING
                if (this._checkAbort()) return;

                MonitoringView.state = 'MONITORING';


                try {
                    this.displayStrategyRules(translatedRules, false); // Modo normal, não preview

                    // Isso evita o delay "..." nas regras de Resistência/Suporte
                    if (translatedRules.groups) {
                        const marketData = getMarketDataInstance(SessionManager.getLocalToken());
                        const symbolsToFetch = new Set();

                        // Coletar símbolos únicos
                        translatedRules.groups.forEach(group => {
                            group.rules.forEach(rule => {
                                // Tentar identificar símbolo no contexto ou usar o selecionado
                                const symbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
                                if (symbol) symbolsToFetch.add(symbol);
                            });
                        });

                        // ✅ WAIT: Aguardar todas as promessas de carregamento
                        const loadingPromises = Array.from(symbolsToFetch).map(symbol =>
                            marketData.ensurePriceBuffer(symbol)
                        );

                        if (loadingPromises.length > 0) {
                            this.updateAIStatus('Carregando dados históricos...');
                            await Promise.all(loadingPromises);

                            if (this._checkAbort()) return;

                            this.updateAIStatus('Analisando regras');
                        }
                    }

                } catch (error) {
                    console.error('❌ Erro ao exibir regras ou pré-carregar dados:', error);
                    console.error('Stack:', error.stack);
                    // Tentar novamente após um delay
                    setTimeout(() => {
                        try {

                            this.displayStrategyRules(translatedRules, false);

                        } catch (retryError) {
                            console.error('❌ Erro na segunda tentativa:', retryError.stack);
                        }
                    }, 500);
                }

                const isStrategyEmpty = !strategyValue.trim();
                const shouldExecuteImmediate = isStrategyEmpty || isImmediateMode;

                if (shouldExecuteImmediate) {
                    // Modo imediato: executar SEM esperar dados históricos
                    if (this._checkAbort()) return;
                    this.startRealTimeAnalysis(translatedRules);
                    // 🎯 CRÍTICO: Verificar regras IMEDIATAMENTE sem esperar próximo tick
                    setTimeout(() => {
                        if (this._checkAbort()) return;
                        if (this.currentTranslatedRules) {

                            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
                            const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
                            // Tentar obter preço do MarketData se lastTickPrice ainda for null
                            const initialPrice = MonitoringView.lastTickPrice || marketData?.getLastPrice(currentSymbol);

                            this.checkRulesForTrading(this.currentTranslatedRules, initialPrice);
                        }
                    }, 100); // Pequeno delay para garantir que startRealTimeAnalysis finalizou
                } else {
                    // Modo normal: aguardar dados históricos antes de iniciar análise
                    setTimeout(() => {
                        if (this._checkAbort()) return;
                        this.waitForHistoricalData().then(() => {
                            if (this._checkAbort()) return;
                            this.startRealTimeAnalysis(translatedRules);
                        });
                    }, 2000);
                }

                // 💾 SALVAR no histórico de regras APENAS se não tinha JSON antes
                const hadJsonBefore = regrasJsonManager.hasCachedJson() ||
                    regrasJsonManager.extractRuleCodeFromText(strategyValue) !== null ||
                    this.checkForHistoricalJson(strategyValue) !== null;

                if (!hadJsonBefore) {

                    window.rulesHistoryManager.saveRule(strategyValue, translatedRules);
                }

                const tradeManager = getTradeManagerInstance();
                if (tradeManager && typeof tradeManager.registerMonitoringCallback === 'function') {
                    tradeManager.registerMonitoringCallback(() => {

                    });
                }

                // 🚀 NOVO: Notificar FooterManager que monitoramento iniciou
                if (typeof FooterManager !== 'undefined' && FooterManager.onMonitoringStarted) {
                    FooterManager.onMonitoringStarted();
                }

                // 🎯 NOVO: Auto-switch para modo Config (visual) ao iniciar
                this.toggleConfigMode('config');

                this.updateAIStatus('Ativo - Analisando regras');

            } catch (error) {
                // ✅ NOVO: Reabilitar inputs em caso de erro
                this.setInputsDisabled(false);

                // Se é erro de validação do Gemini, usar modal centralizado
                if (error.geminiValidationData) {
                    // 🔧 VERIFICAR se modalErrosInstance existe
                    if (window.modalErrosInstance && typeof window.modalErrosInstance.handleGeminiValidationError === 'function') {
                        const result = await window.modalErrosInstance.handleGeminiValidationError(
                            error.geminiValidationData,
                            strategyValue
                        );

                        // Se usuário aceitou correção, reiniciar monitoramento
                        if (result.action === 'retry_with_correction') {
                            setTimeout(() => {
                                if (this._checkAbort()) return;
                                this.startMonitoring();
                            }, 500);
                        }
                        return;
                    }
                }

                this.showTranslationError(error, strategyValue);
                return;
            }
        } catch (error) {
            // ✅ NOVO: Reabilitar inputs em caso de erro
            this.setInputsDisabled(false);

            CommonHelpers.showError('❌ Erro ao iniciar monitoramento:', error);

            // 🔧 CORREÇÃO: Restaurar botões em caso de erro/cancelamento
            this.updateMonitoringStatus(false);
            this.updateAIStatus('Erro');

            // Se não é um erro crítico do sistema, não mostrar alert
            if (!error.message.includes('cancelado') && !error.message.includes('cancelou')) {
                alert(`Erro ao iniciar monitoramento: ${error.message} `);
            }
        }
    }

    // Parar monitoramento (APENAS monitoramento, preservando sistemas independentes)
    static stopMonitoring() {
        logConfig.info('monitoring', '🛑 [STOP SYNC] Parada manual de monitoramento solicitada.');

        MonitoringView.state = 'IDLE';
        this.pendingStop = false;

        // ✅ NOVO: Reabilitar inputs
        this.setInputsDisabled(false);

        // 🔧 CRÍTICO: Parar cooldown se estiver ativo (para evitar reinício automático)
        const cooldownOverlay = getCooldownOverlayInstance();
        if (cooldownOverlay && (cooldownOverlay.cooldownActive || cooldownOverlay.cooldownProtected)) {

            cooldownOverlay.endCooldown();
        }

        // ⚠️ NOVO: Parar sistema de pausa
        if (window.PauseManager) {
            window.PauseManager.forceStop();
        }
        if (window.tradeManager) {
            window.tradeManager.isPaused = false;
        }

        // ✅ NOVO: Parar health check
        if (MonitoringView.healthCheckInterval) {
            clearInterval(MonitoringView.healthCheckInterval);
            MonitoringView.healthCheckInterval = null;
        }

        // Parar interval de atualização visual das regras
        if (MonitoringView.ruleUpdateInterval) {
            clearInterval(MonitoringView.ruleUpdateInterval);
            MonitoringView.ruleUpdateInterval = null;

        }

        // Parar interval de indicadores de modo
        if (MonitoringView.modeIndicatorInterval) {
            clearInterval(MonitoringView.modeIndicatorInterval);
            MonitoringView.modeIndicatorInterval = null;

        }

        // 🎯 CRÍTICO: Parar TradeManager
        const tradeManager = getTradeManagerInstance();
        if (tradeManager) {
            tradeManager.stopMonitoring();

            // NÃO limpar valores congelados se há trade em execução
            if (!tradeManager.awaitingExpiration) {
                // ✅ Só resetar contadores se NÃO há trade em execução
                tradeManager.realWinsStreak = 0;
                tradeManager.realLossesStreak = 0;
                tradeManager.simulatedWinsStreak = 0;
                tradeManager.simulatedLossesStreak = 0;
                tradeManager.accumulatedLosses = 0;
                tradeManager.lastCalculatedStake = null;
                tradeManager.popupShown = false;
            }
        }


        MonitoringView._clearRulesDisplay();
        MonitoringView.currentTranslatedRules = null;


        MonitoringView.updateMonitoringStatus(false);

        const startBtn = CommonHelpers.getElement('start-monitoring-btn');
        const stopBtn = CommonHelpers.getElement('stop-monitoring-btn');

        if (startBtn) {
            startBtn.disabled = false;

        }
        if (stopBtn) {
            stopBtn.disabled = true;

        }

        // ✅ NOTIFICAR FOOTERMANAGER
        if (typeof FooterManager !== 'undefined' && FooterManager.onMonitoringStopped) {

            FooterManager.onMonitoringStopped();

        }

        // 🎯 DISPARAR EVENTO monitoringStopped para outros módulos (ex: risk-filter)
        window.dispatchEvent(new Event('monitoringStopped'));

        // 🔄 ATUALIZAR STATUS DA IA
        MonitoringView.updateAIStatus('Parado');

    }

    static displayStrategyRules(translatedRules, isPreview = false) {
        // 🛡️ [STOP SYNC] Abortar se paralisado e não for preview
        if (!isPreview && this.state === 'IDLE') return;

        try {
            if (!translatedRules || !translatedRules.groups) {
                console.warn('⚠️ displayStrategyRules: translatedRules inválido', translatedRules);
                return;
            }

            const cooldownState = getCooldownOverlayInstance().getCooldownState();
            if (!isPreview && (cooldownState.active && MonitoringView.state === 'COOLDOWN')) {
                return;
            }

            // Isso cobre Gemin, Cache, Histórico e Templates
            if (!isPreview && translatedRules && translatedRules.groups) {

                const currentGroupsJson = MonitoringView.currentTranslatedRules ?
                    JSON.stringify(MonitoringView.currentTranslatedRules.groups) : '';
                const newGroupsJson = JSON.stringify(translatedRules.groups);

                // Se mudou QUALQUER coisa nas regras, resetar
                if (currentGroupsJson !== newGroupsJson) {

                    const resetConfig = {};
                    translatedRules.groups.forEach((g, idx) => {
                        resetConfig[idx + 1] = {
                            initial: true, winReal: true, lossReal: true, winSimulated: true, lossSimulated: true
                        };
                    });

                    MonitoringView.groupActivationConfig = resetConfig;

                    try {
                        const sessionId = SessionManager.getUserSessionId();
                        if (typeof SessionManager.saveSessionData === 'function') {
                            SessionManager.saveSessionData('group_activation_config', resetConfig);
                        } else {
                            localStorage.setItem(`session_data_${sessionId}_group_activation_config`, JSON.stringify(resetConfig));
                        }
                        document.dispatchEvent(new CustomEvent('groupConfigUpdated'));
                    } catch (e) { console.warn('Erro reset config', e); }
                }
            }

            // Inicializar variáveis necessárias
            let rulesHtml = '';
            const rulesContainer = CommonHelpers.getElement('rules-container');
            if (!rulesContainer) {
                CommonHelpers.showError('❌ Container de regras não encontrado');
                return;
            }

            // ✅ NOVO: Mostrar loading enquanto regras não estão prontas
            if (!isPreview) {
                rulesContainer.innerHTML = `
            < div class="rules-loading-container" >
                    <div class="rules-loading-spinner"></div>
                    <div class="rules-loading-text">Preparando visualização das regras...</div>
                </div >
            `;

                // ✅ FIXED: Render immediately instead of waiting arbitrary 1500ms
                this.renderReadyRules(translatedRules, rulesContainer);
                return;
            }

            // Para preview, renderizar imediatamente
            this.renderReadyRules(translatedRules, rulesContainer, isPreview);
        } catch (error) {
            console.error('❌ Erro ao exibir regras da estratégia:', error);
            const rulesContainer = CommonHelpers.getElement('rules-container');
            if (rulesContainer) {
                rulesContainer.innerHTML = `
                <div class="error-message">
                    <span class="icon">⚠️</span>
                    <p>Erro ao carregar a visualização das regras. Verifique o console para mais detalhes.</p>
                </div>
                `;
            }
        }
    }

    // ✅ NOVO: Renderizar regras apenas quando estão completamente prontas
    static renderReadyRules(translatedRules, rulesContainer, isPreview = false) {
        // 🛡️ [STOP SYNC] Abortar se paralisado e não for preview
        if (!isPreview && this.state === 'IDLE') return;

        const groups = translatedRules.groups || [];
        let rulesHtml = '';

        // Verificar se há dados suficientes para regras que dependem de histórico
        if (!isPreview) {
            const hasHistoricalRules = this.hasHistoricalDataRules(groups);
            if (hasHistoricalRules && !this.hasMinimumHistoricalData()) {
                // Mostrar loading específico para dados históricos
                rulesContainer.innerHTML = `
            < div class="rules-loading-container" >
                        <div class="rules-loading-spinner"></div>
                        <div class="rules-loading-text">Coletando dados históricos...</div>
                        <div class="rules-loading-subtext">Aguardando ticks suficientes para RSI, SMA e percentuais</div>
                    </div >
            `;

                // Tentar novamente em 3 segundos
                setTimeout(() => {
                    // 🛡️ [STOP SYNC] Verificar se ainda deve renderizar
                    if (this.state === 'IDLE') return;
                    this.renderReadyRules(translatedRules, rulesContainer, isPreview);
                }, 3000);
                return;
            }
        }

        const shouldShowGroupHeaders = true; // Sempre true

        groups.forEach(group => {
            const rules = group.rules || [];

            rulesHtml += `<div class="rule-group notranslate" translate="no" data-group-id="${group.id}">
                <div class="group-header">
                    <span class="group-label">Grupo ${group.id} (AND)</span>
                    ${this.renderGroupActivationDropdown ? this.renderGroupActivationDropdown(group.id) : ''}
                </div>
                <div class="group-rules">`;

            rules.forEach((rule, index) => {
                // ✅ CORREÇÃO: Para não-preview, sempre começar com ⚪ (aguardando dados)
                const statusIcon = isPreview ? '⚪' : '⚪';
                const visualFormat = this.generateVisualFormat(rule, statusIcon);

                rulesHtml += `<div class="rule-item grouped-rule notranslate" translate="no" data-rule-id="${rule.id}" data-rule-type="${rule.type}" data-group-id="${group.id}">
                    <span class="rule-visual-format">${visualFormat}</span>
                </div>`;

                // Adicionar conectivo AND entre regras do mesmo grupo (exceto na última)
                if (index < rules.length - 1) {
                    rulesHtml += `<div class="and-connector">E</div>`;
                }
            });

            rulesHtml += `</div></div>`;

            // Adicionar conectivo OR entre grupos (exceto no último grupo)
            if (shouldShowGroupHeaders && groups.indexOf(group) < groups.length - 1) {
                rulesHtml += `<div class="or-connector">OU</div>`;
            }

        });

        const existingOverlay = rulesContainer.querySelector('.cooldown-overlay-modal');

        rulesContainer.innerHTML = rulesHtml;

        // 🎯 FIX: Configurar listeners do dropdown logo após renderizar
        if (typeof this.setupGroupDropdownListeners === 'function') {
            this.setupGroupDropdownListeners();
        }

        if (existingOverlay) {
            rulesContainer.appendChild(existingOverlay);
        }
        rulesContainer.style.display = 'none';

        // 🔄 Sincronizar com o bloco "Visualização de Regras"
        this.syncWithRulesDisplayBlock(translatedRules, isPreview);

        // Se não é preview, iniciar atualização em tempo real
        if (!isPreview) {
            this.startRealTimeRuleUpdates();
        }
    }

    // ✅ NOVO: Verificar se há regras que dependem de dados históricos
    static hasHistoricalDataRules(groups) {
        for (const group of groups) {
            for (const rule of group.rules || []) {
                if (rule.type === 'rsi' || rule.type === 'sma' || rule.type === 'percentage') {
                    return true;
                }
            }
        }
        return false;
    }

    // ✅ FIX: Implementar método waitForHistoricalData em falta
    static async waitForHistoricalData() {
        return new Promise((resolve) => {
            const maxWaitTime = 30000; // 30 segundos timeout
            const startTime = Date.now();

            this.updateAIStatus('Aguardando dados históricos...');

            const checkData = () => {

                // IMPORTANTE: Se o estado for MONITORING ou INITIALIZING, deve prosseguir.
                if (this.state === 'IDLE') {
                    logConfig.info('monitoring', '🛑 [STOP SYNC] Interrompendo espera por dados históricos pois o monitoramento foi parado.');
                    resolve(false);
                    return;
                }

                // Verificar se já temos dados mínimos
                if (this.hasMinimumHistoricalData()) {
                    resolve(true);
                    return;
                }

                // Verificar timeout
                if (Date.now() - startTime > maxWaitTime) {
                    console.warn('⚠️ Timeout aguardando dados históricos - iniciando mesmo assim');
                    resolve(false); // Resolver mesmo sem dados para não travar
                    return;
                }

                // Tentar novamente em breve
                setTimeout(checkData, 1000);
            };

            // Iniciar verificação
            checkData();
        });
    }

    // ✅ NOVO: Verificar se há dados históricos mínimos
    static hasMinimumHistoricalData() {
        try {
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) return false;

            const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
            if (!currentSymbol) return false;

            const history = marketData.getHistoricalTicks(currentSymbol, 100);
            if (!history || !history.prices || history.prices.length < 20) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    // 🔄 CORRIGIDO: Sincronizar regras MANTENDO estrutura de grupos
    static syncWithRulesDisplayBlock(translatedRules, isPreview = false) {
        // 🛡️ [STOP SYNC] Abortar se paralisado e não for preview
        if (!isPreview && this.state === 'IDLE') return;

        // Estrutura correta: manter grupos e suas regras organizadas
        const rulesData = {
            groups: [], // ✅ GRUPOS em vez de regras individuais
            isPreview: isPreview
        };

        if (translatedRules && translatedRules.groups) {
            translatedRules.groups.forEach((group, groupIndex) => {

                if (group.rules && group.rules.length > 0) {
                    const formattedGroup = {
                        id: group.id,
                        rules: []
                    };

                    group.rules.forEach((rule, ruleIndex) => {
                        const statusIcon = isPreview ? '⚪' : '🔴';

                        const visualFormat = this.generateVisualFormat(rule, statusIcon);

                        formattedGroup.rules.push({
                            id: rule.id,
                            displayText: visualFormat,
                            status: isPreview ? 'waiting' : 'failed'
                        });
                    });

                    rulesData.groups.push(formattedGroup);
                }
            });
        }



        // Disparar evento para o UIManager atualizar o bloco de visualização
        window.dispatchEvent(new CustomEvent('rulesUpdated', {
            detail: rulesData
        }));

        // ✅ FIXED: Fallback mechanism - verify update happened after 500ms
        setTimeout(() => {
            // 🛡️ [STOP SYNC] Abortar se paralisado e não for preview
            if (!isPreview && this.state === 'IDLE') return;

            const rulesDisplay = document.getElementById('rules-visual-display');
            if (rulesDisplay && rulesDisplay.querySelector('.waiting-text')) {

                // Force direct DOM update as fallback
                if (typeof UIManager !== 'undefined' && typeof UIManager.updateRulesDisplay === 'function') {

                    UIManager.updateRulesDisplay(rulesData);
                    // 🎨 NOVO: Aplicar visibilidade dos grupos após update
                    MonitoringView.applyActiveGroupsVisibility();
                } else {
                    console.error('❌ [SYNC] UIManager.updateRulesDisplay not available for fallback');
                    console.error('Available:', typeof UIManager, typeof UIManager?.updateRulesDisplay);
                }
            }
        }, 500);
    }

    // Gerar formato visual simplificado para cada regra
    static generateVisualFormat(rule, statusIcon) {
        try {

            const formatGenerator = getFormatGeneratorInstance();

            // Verificar se a regra precisa de dados históricos
            if (rule.type === 'rsi' || rule.type === 'sma' || rule.type === 'percentage') {
                if (!this.hasMinimumHistoricalData()) {
                    // Retornar formato de "aguardando dados" para regras que precisam de histórico
                    return `⏳ ${rule.description || rule.type} (coletando dados...)`;
                }
            }

            if (rule.type === 'last_digits' || rule.type === 'digit_repetition' || rule.type === 'digit_pattern') {
                const marketData = getMarketDataInstance(SessionManager.getLocalToken());
                if (marketData) {
                    const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
                    if (currentSymbol) {
                        // Forçar atualização do símbolo ativo no formatGenerator
                        formatGenerator.currentSymbol = currentSymbol;
                        formatGenerator.marketData = marketData;
                    }
                }
            }

            return formatGenerator.generateVisualFormat(rule, statusIcon);
        } catch (error) {
            console.error(`❌[MONITORING] Erro em generateVisualFormat para regra ${rule.type}: `, error);
            return `❌ ${rule.description || rule.type} (erro na exibição)`;
        }
    }

    // Iniciar análise em tempo real
    static startRealTimeAnalysis(translatedRules) {
        // 🛡️ [STOP SYNC] Não iniciar se o monitoramento foi parado no intervalo da promise
        if (this.state === 'IDLE') return;

        // Os parâmetros estão em translatedRules.parameters[] e precisam ser aplicados às regras
        if (translatedRules.parameters && translatedRules.parameters.length > 0) {
            translatedRules.parameters.forEach(param => {
                const path = param.path; // ex: "groups[0].rules[0].parameters.value"
                const value = param.value; // ex: "$LOWER_PROB"

                try {
                    // Converter "groups[0].rules[0].parameters.value" em navegação do objeto
                    const pathParts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
                    let target = translatedRules;

                    // Navegar até o penúltimo elemento
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        target = target[pathParts[i]];
                    }

                    // Aplicar o valor
                    const finalKey = pathParts[pathParts.length - 1];
                    target[finalKey] = value;

                    // Isso garante compatibilidade com código que lê de rule.value
                    if (path.includes('.parameters.value')) {
                        // Navegar até a regra (2 níveis acima de parameters.value)
                        const rulePath = pathParts.slice(0, -2); // Remove "parameters" e "value"
                        let ruleTarget = translatedRules;
                        for (let i = 0; i < rulePath.length; i++) {
                            ruleTarget = ruleTarget[rulePath[i]];
                        }
                        if (ruleTarget) ruleTarget.value = value; // Copiar também para raiz
                    }

                    if (path.includes('.parameters.targetValue')) {
                        const rulePath = pathParts.slice(0, -2);
                        let ruleTarget = translatedRules;
                        for (let i = 0; i < rulePath.length; i++) {
                            ruleTarget = ruleTarget[rulePath[i]];
                        }
                        if (ruleTarget) {
                            // Atualizar targetValue na raiz e em parameters
                            ruleTarget.targetValue = value;
                            if (ruleTarget.parameters) {
                                ruleTarget.parameters.targetValue = value;
                            }

                            // onde targetValue E predictionAction são strings iguais
                            const isParityRule = typeof value === 'string' &&
                                ['odd', 'even', 'par', 'impar', 'ímpar'].includes(String(value).toLowerCase());
                            if (isParityRule) {
                                ruleTarget.predictionAction = value;
                                if (ruleTarget.parameters) {
                                    ruleTarget.parameters.predictionAction = value;
                                }
                            }
                        }
                    }


                } catch (e) {
                    console.error(`❌ Erro ao aplicar parâmetro ${param.key}:`, e);
                }
            });
        }

        // 🎯 FIX: Marcar que parâmetros foram aplicados
        MonitoringView._parametersApplied = true;

        // Isso garante que displayStrategyRules possa resolver $LOWER_PROB no formato visual
        const currentSymbol = document.getElementById('symbol-select')?.value || window.selectedSymbol;
        if (currentSymbol && typeof getProbabilityResolver === 'function') {
            // Calcular probabilidades iniciais se já tiver histórico
            if (MonitoringView.probabilityHistory && MonitoringView.probabilityHistory.length >= 10) {
                // 🎯 FIX CRÍTICO: Usar MESMA fonte que updateRuleVisuals (com delay)
                const initialStats = this.getLatestProbabilityData(true);
                if (initialStats && initialStats.sorted) {
                    getProbabilityResolver().updateProbabilityData(initialStats.sorted);
                }
            }
        }

        // This prevents old group configs from being applied to new rules
        if (this.currentTranslatedRules) {
            const oldGroupCount = this.currentTranslatedRules.groups?.length || 0;
            const newGroupCount = translatedRules.groups?.length || 0;

            // Check if group structure changed
            let structureChanged = oldGroupCount !== newGroupCount;

            // Also check if rule types changed (more thorough detection)
            if (!structureChanged && this.currentTranslatedRules.groups && translatedRules.groups) {
                for (let i = 0; i < newGroupCount; i++) {
                    const oldGroup = this.currentTranslatedRules.groups[i];
                    const newGroup = translatedRules.groups[i];

                    if (oldGroup?.rules?.length !== newGroup?.rules?.length) {
                        structureChanged = true;
                        break;
                    }

                    // Check if rule types changed
                    const oldTypes = oldGroup?.rules?.map(r => r.type).join(',') || '';
                    const newTypes = newGroup?.rules?.map(r => r.type).join(',') || '';
                    if (oldTypes !== newTypes) {
                        structureChanged = true;
                        break;
                    }
                }
            }

            // Clear stale configurations if structure changed
            if (structureChanged) {
                MonitoringView.groupActivationConfig = {};

                // Clear from storage
                if (typeof SessionManager.saveSessionData === 'function') {
                    SessionManager.saveSessionData('group_activation_config', {});
                } else if (typeof SessionManager.setSessionData === 'function') {
                    SessionManager.setSessionData('group_activation_config', {});
                } else {
                    const sessionId = SessionManager.getUserSessionId();
                    localStorage.setItem(`session_data_${sessionId}_group_activation_config`, JSON.stringify({}));
                }
            }
        }

        // Salvar regras traduzidas para análise
        this.currentTranslatedRules = translatedRules;

        this.synchronizeMarketDataWithRules(translatedRules);

        // Inicializar TradeManager
        const tradeManager = getTradeManagerInstance();
        // 🎯 FIX: Sincronizar com localStorage (UI pode não estar presente)
        tradeManager.syncWithUIConfiguration();

        // Configurar callbacks do TradeManager
        tradeManager.onModeChange = (newMode, nextMode) => {


            // Manter compatibilidade com sistema legado
            this.updateTradeMode(newMode, nextMode || 'Modo alterado');
        };

        tradeManager.onTradeStart = (mode, config) => {
            this.updateAIStatus(`Executando trade ${mode}...`);
        };

        tradeManager.onTradeEnd = (mode, isWin, details) => {
            this.updateTradeResult(mode, isWin, details);
        };

        // Ativar sistema de trading
        tradeManager.start();

        const currentMode = tradeManager.getCurrentMode();

        // Disparar evento global para sincronizar UI
        window.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode: currentMode, reason: 'Inicialização forçada' }
        }));

        this.updateTradeMode(currentMode, 'Modo inicial configurado');

        // Iniciar verificação de regras para trading
        this.startRuleBasedTrading(translatedRules);

        // Iniciar atualização visual em tempo real
        this.startRealTimeRuleUpdates();

        // Iniciar atualização periódica dos indicadores de modo
        this.startModeIndicatorUpdates();

        this.updateTradingCounters();

        // Pequeno delay para garantir que DOM foi completamente renderizado
        setTimeout(() => {
            this.applyActiveGroupsVisibility();
        }, 100);
    }

    // Variáveis para controle de tempo real
    static lastUpdateTime = 0;
    static pendingUpdate = false;
    static lastVisualUpdateTime = 0; // Controle de throttle visual
    static pendingVisualUpdate = false;

    // Iniciar atualização em tempo real das regras visuais
    static startRealTimeRuleUpdates() {
        // Parar intervalos anteriores se existirem
        MonitoringView.stopRealTimeRuleUpdates();

        // ✅ REFATORADO: Listener simplificado para arquitetura unificada
        MonitoringView.marketDataUpdateListener = (event) => {
            if (!event || !event.detail) return;

            const data = event.detail;

            // Validar evento válido (deve ter symbol e lastPrice)
            if (!data.symbol || data.lastPrice === undefined) return;

            // ✅ FIX: Atualizar cache local de preço IMEDIATAMENTE
            MonitoringView.lastTickPrice = data.lastPrice;
            MonitoringView.lastTickTime = data.timestamp || Date.now();

            // ⚡ ATUALIZAÇÃO IMEDIATA a cada tick
            try {
                MonitoringView.updateRuleVisualsImmediate();
            } catch (error) {
                console.warn('⚠️ Erro na atualização imediata de tick:', error);
            }
        };

        // Registrar listeners
        window.addEventListener('marketDataUpdate', MonitoringView.marketDataUpdateListener);

        // ✅ FALLBACK: Manter interval como backup (intervalo maior)
        MonitoringView.ruleUpdateInterval = setInterval(() => {
            MonitoringView.debouncedUpdateRuleVisuals();
        }, 5000); // 5 segundos apenas como fallback
    }

    // Atualização com debounce para evitar execuções simultâneas
    static debouncedUpdateRuleVisuals() {

        const now = Date.now();

        // ✅ OTIMIZADO: Reduzir debounce para responsividade similar ao FooterManager
        if (this.pendingUpdate || (now - this.lastUpdateTime) < 50) {
            return;
        }

        this.pendingUpdate = true;

        // Usar requestAnimationFrame para otimizar performance
        requestAnimationFrame(() => {
            try {
                this.updateRuleVisuals();
                this.lastUpdateTime = Date.now();
            } catch (error) {
                // Logar erro mas não travar a aplicação
                console.error('❌ Erro crítico no loop visual:', error);
            } finally {
                // ✅ GARANTIA: Sempre liberar a flag, mesmo com erro
                this.pendingUpdate = false;
            }
        });
    }

    // Atualizar uma regra específica no bloco de visualização
    static updateRulesDisplayBlock(rule, visualFormat, isSatisfied) {
        const rulesData = {
            rules: [{
                id: rule.id,
                displayText: visualFormat,
                status: isSatisfied ? 'satisfied' : 'failed'
            }],
            isUpdate: true
        };

        // Disparar evento para atualização individual
        window.dispatchEvent(new CustomEvent('rulesUpdated', {
            detail: rulesData
        }));
    }

    // Parar atualização em tempo real
    static stopRealTimeRuleUpdates() {
        if (MonitoringView.ruleUpdateInterval) {
            clearInterval(MonitoringView.ruleUpdateInterval);
            MonitoringView.ruleUpdateInterval = null;
        }

        // ✅ NOVO: Limpar listeners
        if (MonitoringView.marketDataUpdateListener) {
            window.removeEventListener('marketDataUpdate', MonitoringView.marketDataUpdateListener);
            MonitoringView.marketDataUpdateListener = null;
        }

    }

    // ✅ NOVO: Verificação de saúde do monitoramento
    static performHealthCheck() {
        if (MonitoringView.state !== 'MONITORING') {
            return; // Só verificar quando estiver monitorando ativamente
        }

        try {
            // 1. Verificar se ainda temos regras válidas
            if (!MonitoringView.currentTranslatedRules) {

                MonitoringView.updateAIStatus('Erro - Regras perdidas');
                return;
            }

            // 2. Verificar se TradeManager está funcionando
            const tradeManager = getTradeManagerInstance();
            if (!tradeManager || !tradeManager.isTradeActive()) {
                tradeManager?.start();
            }

            // 3. Verificar se market data está conectado
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData || !marketData.isReady()) {

                MonitoringView.updateAIStatus('Aguardando reconexão...');
                return;
            }


            // 5. Se chegou até aqui, sistema está saudável
            if (MonitoringView.lastHealthStatus !== 'healthy') {

                MonitoringView.updateAIStatus('Ativo - Sistema saudável');
                MonitoringView.lastHealthStatus = 'healthy';
            }

        } catch (error) {
        }
    }

    // ✅ NOVO: Método para recuperar monitoramento após desconexão
    static async recoverFromDisconnection() {
        try {

            // 1. Verificar se monitoramento estava ativo
            if (MonitoringView.state !== 'MONITORING' && MonitoringView.state !== 'COOLDOWN') {

                return;
            }


            // Limpar flags de execução travadas
            MonitoringView.isExecutingTrade = false;
            MonitoringView.pendingCooldownStart = false;
            MonitoringView.pendingStop = false;

            // Se estava em cooldown, voltar para monitoring
            if (MonitoringView.state === 'COOLDOWN' || MonitoringView.state === 'COOLDOWN_PROTECTED') {
                MonitoringView.state = 'MONITORING';
            }


            // 3. ✅ RESET: TradeManager - apenas destravar
            const tradeManager = getTradeManagerInstance();
            if (tradeManager) {
                tradeManager.awaitingExpiration = false;

                // Se estava inativo, reativar
                if (!tradeManager.isTradeActive()) {
                    tradeManager.start();

                }
            }

            // 4. ✅ RESET: Cooldown - limpar completamente
            const cooldownOverlay = getCooldownOverlayInstance();
            if (cooldownOverlay) {
                cooldownOverlay.cooldownActive = false;
                cooldownOverlay.cooldownProtected = false;
                cooldownOverlay.protectionStarted = null;
                cooldownOverlay.cooldownTicksRemaining = 0;
                cooldownOverlay.cooldownTicksTotal = 0;

            }

            // 5. 🔍 DIAGNÓSTICO: Verificar estado do Market Data
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());

            if (MonitoringView.mainTickUnsubscribe) {

            } else {

                // 🔧 CORREÇÃO: Recriar subscription de ticks
                try {
                    await MonitoringView.startUnifiedTickSubscription();

                } catch (error) {
                }
            }

            // 7. 🔍 DIAGNÓSTICO: Verificar símbolo configurado
            const config = tradeManager?.getConfiguration();

            MonitoringView.updateAIStatus('Reconectado - Sistema ativo');


        } catch (error) {
            MonitoringView.updateAIStatus('Erro na recuperação - Reinicie o monitoramento');
        }
    }

    // 🎯 NOVO: Método específico para resincronização após reconexão Deriv WebSocket
    static forceResyncAfterReconnection() {
        try {

            if (MonitoringView.state !== 'MONITORING' || !MonitoringView.currentTranslatedRules) {
                return;
            }


            if (MonitoringView.modeIndicatorInterval) {
                clearInterval(MonitoringView.modeIndicatorInterval);
                MonitoringView.modeIndicatorInterval = null;
            }

            // 2. Limpar callbacks antigos do MarketData

            const token = SessionManager.getLocalToken();
            const marketData = getMarketDataInstance(token);

            if (marketData && marketData.tickCallbacks) {
                const currentSymbol = marketData.currentSymbol || marketData.activeSymbol;

                if (currentSymbol && marketData.tickCallbacks.has(currentSymbol)) {
                    marketData.tickCallbacks.get(currentSymbol).clear();
                }
            }

            // 3. Aguardar um breve momento para garantir limpeza
            setTimeout(() => {

                // 4. Reiniciar completamente o sistema de monitoramento
                MonitoringView.startRuleBasedTrading(MonitoringView.currentTranslatedRules);

                // 5. Forçar uma verificação imediata das regras
                setTimeout(() => {

                    MonitoringView.checkRulesAndExecuteTrade(true); // forceCheck = true
                }, 1000);


                MonitoringView.updateAIStatus('Resincronizado - Monitoramento ativo');
            }, 500);

        } catch (error) {
            MonitoringView.updateAIStatus('Erro na resincronização - Reinicie o monitoramento');
        }
    }

    // Iniciar atualização periódica dos indicadores de modo
    static startModeIndicatorUpdates() {
        // Parar interval anterior se existir
        MonitoringView.stopModeIndicatorUpdates();

        // Atualizar indicadores a cada 2 segundos
        MonitoringView.modeIndicatorInterval = setInterval(() => {
            MonitoringView.updateTradingCounters();
            MonitoringView.updateNextTradeMode();
        }, 2000);

        // Atualização inicial
        MonitoringView.updateTradingCounters();
        MonitoringView.updateNextTradeMode();

    }

    // Parar atualização dos indicadores de modo
    static stopModeIndicatorUpdates() {
        if (MonitoringView.modeIndicatorInterval) {
            clearInterval(MonitoringView.modeIndicatorInterval);
            MonitoringView.modeIndicatorInterval = null;
        }
    }

    // 🔧 FUNÇÃO AUXILIAR: Limpar display de regras
    static _clearRulesDisplay() {
        try {
            // Limpar container de regras principal
            const rulesContainer = CommonHelpers.getElement('rules-container');
            if (rulesContainer) {
                rulesContainer.style.display = 'none';
                rulesContainer.innerHTML = '';

            }

            // Limpar bloco de visualização de regras no UI Manager
            const rulesDisplayBlock = CommonHelpers.getElement('rules-visual-display');
            if (rulesDisplayBlock) {
                rulesDisplayBlock.innerHTML = `
            < div class="rules-placeholder" >
                <div class="waiting-chart-container">
                    <div class="waiting-bars">
                        <div class="waiting-bar"></div>
                        <div class="waiting-bar"></div>
                        <div class="waiting-bar"></div>
                        <div class="waiting-bar"></div>
                        <div class="waiting-bar"></div>
                        <div class="waiting-bar"></div>
                        <div class="waiting-bar"></div>
                    </div>
                    <div class="waiting-text">Aguardando Regras...</div>
                </div>
                    </div >
            `;

            }

            // Disparar evento para garantir que UIManager também limpe
            window.dispatchEvent(new CustomEvent('rulesCleared', {
                detail: { reason: 'Novo monitoramento iniciado' }
            }));

            // Limpar dados cacheados de regras
            this.currentTranslatedRules = null;


        } catch (error) {
        }
    }

    // 🎯 NOVO: Executar trade imediato sem regras
    static async executeImmediateTrade() {
        try {

            // Validar configurações básicas (ativo, contrato, etc)
            const validationResult = this.validateRequiredConfigurations();
            if (!validationResult.isValid) {
                this.showConfigurationAlert(validationResult.missingFields);
                return;
            }

            // Obter TradeManager
            const tradeManager = getTradeManagerInstance();
            if (!tradeManager) {
                CommonHelpers.showError('❌ TradeManager não disponível');
                return;
            }

            // Atualizar configurações do TradeManager
            tradeManager.updateConfigurationFromUI();

            // Inicializar conexão da API se necessário
            if (!tradeManager.tradingAPIConnected) {
                const connected = await tradeManager.initializeTradingConnection();
                if (!connected) {
                    CommonHelpers.showError('❌ Falha ao conectar com API de trading');
                    return;
                }
            }

            // Inicializar cache de proposals se necessário
            if (!tradeManager.proposalCache) {
                await tradeManager.startProposalCaching();
            }

            // Atualizar status
            this.updateAIStatus('Executando trade imediato...');

            // Executar trade diretamente sem regras
            const success = await this.performImmediateTrade(tradeManager);

            if (success) {
                this.updateAIStatus('Trade imediato executado com sucesso');

            } else {
                this.updateAIStatus('Erro na execução do trade imediato');
            }

        } catch (error) {
            this.updateAIStatus('Erro no modo execução imediata');
            CommonHelpers.showError('❌ Erro ao executar trade imediato: ' + error.message);
        }
    }

    // 🎯 NOVO: Executar trade específico no modo imediato
    static async performImmediateTrade(tradeManager) {
        try {
            // Verificar se é modo BOTH
            const isBothMode = tradeManager.isBothModeActive();

            if (isBothMode) {
                // Executar ambos contratos do grupo
                const bothContracts = tradeManager.getBothContracts();
                if (!bothContracts || !bothContracts.contracts || bothContracts.contracts.length === 0) {
                    CommonHelpers.showError('❌ Contratos do modo BOTH não encontrados');
                    return false;
                }


                // Executar todos os contratos do grupo
                for (const contractType of bothContracts.contracts) {
                    await this.executeSingleImmediateTrade(tradeManager, contractType);
                    // Pequeno delay entre contratos
                    await CommonHelpers.sleep(500);
                }

                return true;
            } else {
                // Executar contrato específico
                const contractType = tradeManager.getSelectedContractType();
                if (!contractType) {
                    CommonHelpers.showError('❌ Tipo de contrato não selecionado');
                    return false;
                }

                return await this.executeSingleImmediateTrade(tradeManager, contractType);
            }
        } catch (error) {
            return false;
        }
    }

    // 🎯 NOVO: Executar um único trade imediato
    static async executeSingleImmediateTrade(tradeManager, contractType) {
        try {
            // Determinar modo de execução (REAL, VIRTUAL, SIMULACAO)
            const mode = tradeManager.getCurrentMode();

            if (mode === 'SIMULACAO') {
                // Executar trade simulado
                return await tradeManager.executeSimulatedTrade(contractType);
            } else {
                // Executar trade real
                return await tradeManager.executeRealTrade(contractType);
            }
        } catch (error) {
            return false;
        }
    }

    // 🎯 NOVO: Atualizar UI quando modo imediato é ativado/desativado
    static updateImmediateModeUI(isActive) {
        const startBtn = CommonHelpers.getElement('start-monitoring-btn');

        if (isActive) {
            // Modo execução imediata ativo
            if (startBtn) {
                startBtn.classList.add('immediate-mode');
                startBtn.title = 'Executar 1 trade imediatamente sem aguardar regras';
                // Remover estilos inline para usar CSS
                startBtn.style.background = '';
                startBtn.style.backgroundSize = '';
                startBtn.style.backgroundBlendMode = '';
            }

            // Atualizar status
            this.updateAIStatus('Modo Execução Imediata Ativo');


        } else {
            // Modo monitoramento normal
            if (startBtn) {
                startBtn.classList.remove('immediate-mode');
                startBtn.title = 'Iniciar Monitoramento';
                // Limpar estilos inline
                startBtn.style.background = '';
                startBtn.style.backgroundSize = '';
                startBtn.style.backgroundBlendMode = '';
            }

            // Atualizar status
            this.updateAIStatus('Modo Normal');


        }
    }

    // ⚡ REFATORADO: Atualização IMEDIATA com THROTTLE para evitar congelamento
    static updateRuleVisualsImmediate() {
        // Validações básicas
        if (!this.currentTranslatedRules || !this.currentTranslatedRules.groups) {
            return;
        }

        // Isso previne que atualizações muito rápidas de ticks travem a thread principal de UI
        const now = Date.now();
        const throttleTime = 250;
        if (now - this.lastVisualUpdateTime < throttleTime) {
            // Se já temos uma atualização agendada, apenas ignorar esta
            if (this.pendingVisualUpdate) return;

            this.pendingVisualUpdate = true;
            // Agendar para o final do período de throttle
            setTimeout(() => {
                this.pendingVisualUpdate = false;
                this.updateRuleVisualsImmediate();
            }, throttleTime);
            return;
        }

        this.lastVisualUpdateTime = now;

        // Usar requestAnimationFrame para otimizar rendering
        requestAnimationFrame(() => {
            try {
                this.updateRuleVisuals();
            } catch (error) {
                console.error("❌ CRÍTICO: Erro fatal no loop visual RAF:", error);
            }
        });
    }

    // Atualizar visuais das regras com dados em tempo real
    static updateRuleVisuals() {
        if (!this.currentTranslatedRules || !this.currentTranslatedRules.groups) {
            CommonHelpers.showWarning('⚠️ Não há regras traduzidas para atualizar');
            return;
        }

        // 🎯 FIX: Bloquear se histórico não carregou (previne NaN no startup)
        if (!MonitoringView.probabilityHistory || MonitoringView.probabilityHistory.length < 10) {
            return;
        }

        // Isso previne NaN quando updateRuleVisuals roda antes de startRealTimeAnalysis
        if (!MonitoringView._parametersApplied) {
            return;
        }

        const loopStartTime = performance.now();
        const now = Date.now();
        const shouldLogDetails = (now - this.lastLogUpdate) > 10000; // Log detalhado apenas a cada 10 segundos

        if (shouldLogDetails) {
            this.lastLogUpdate = now;
        }

        // 🔧 NOVO: Verificar se cooldown está ativo (com segurança)
        let isCooldownActive = false;
        try {
            if (typeof getCooldownOverlayInstance !== 'undefined') {
                const instance = getCooldownOverlayInstance();
                if (instance && instance.getCooldownState) {
                    const cooldownState = instance.getCooldownState();
                    isCooldownActive = cooldownState && cooldownState.active;
                }
            }
        } catch (e) {
            // Ignorar erro de cooldown apenas para visualização
            console.warn('⚠️ Erro ao verificar cooldown visual:', e);
        }

        // 🔄 CORRIGIDO: Manter estrutura de grupos nas atualizações em tempo real
        const updatedGroups = [];

        this.currentTranslatedRules.groups.forEach((group, groupIndex) => {

            const updatedGroupRules = [];

            group.rules.forEach((rule, ruleIndex) => {
                try {


                    // 🆕 NOVO: Manter progresso entre verificações para regras incrementais
                    if (rule.type === 'sequence' || rule.type === 'isolated_digits') {
                        // Não resetar o currentValue, deixar que as regras gerenciem seu estado incremental
                    }

                    const ruleStartTime = performance.now();
                    const isRuleSatisfied = this.checkRuleCondition(rule);
                    const ruleDuration = performance.now() - ruleStartTime;

                    // 🛠️ DIAGNÓSTICO: Logar se a regra demorar mais que 15ms (Limite tolerável)
                    if (ruleDuration > 15) {
                        console.warn(`[PERF] Rule Check: ${rule.type} (${rule.id}) took ${ruleDuration.toFixed(2)}ms`);
                    }


                    // 🎯 NOVA LÓGICA: Status baseado em regra atendida + cooldown
                    let statusIcon;
                    let ruleStatus;

                    if (isRuleSatisfied) {
                        if (isCooldownActive) {
                            // Regra atendida MAS cooldown ativo = AMARELO
                            statusIcon = '🟢';
                            ruleStatus = 'satisfied-cooldown';
                        } else {
                            // Regra atendida E cooldown inativo = VERDE
                            statusIcon = '🟢';
                            ruleStatus = 'satisfied';
                        }
                    } else {
                        // Regra não atendida = VERMELHO
                        statusIcon = '🔴';
                        ruleStatus = 'failed';
                    }


                    const ruleForDisplay = { ...rule };

                    // 🎯 FIX: Preservar $LOWER_PROB de parameters se existir
                    if (rule.parameters) {
                        // Criar cópia profunda de parameters para não mutar o original
                        ruleForDisplay.parameters = { ...rule.parameters };

                        // Se parameters.value existe (mesmo que seja $LOWER_PROB), usar ele
                        if (rule.parameters.value !== null && rule.parameters.value !== undefined) {
                            ruleForDisplay.value = rule.parameters.value;

                        }

                        else if (rule.value !== null && rule.value !== undefined) {
                            ruleForDisplay.value = rule.value;
                            ruleForDisplay.parameters.value = rule.value;

                        }
                    }
                    // 🎯 FIX: Se não tem parameters mas tem value na raiz, criar parameters
                    else if (rule.value !== null && rule.value !== undefined) {
                        ruleForDisplay.parameters = { value: rule.value };

                    }

                    // Atualizar formato visual com dados reais
                    const formatStart = performance.now();
                    let newVisualFormat = this.generateVisualFormat(ruleForDisplay, statusIcon);
                    const formatDuration = performance.now() - formatStart;

                    if (formatDuration > 2) {
                        console.warn(`[PERF_WARN] Slow format generation for ${rule.type}: ${formatDuration.toFixed(2)}ms`);
                    }

                    // substituir o número de volta por $LOWER_PROB para forçar res olução dinâmica
                    if (ruleForDisplay.value === '$LOWER_PROB' && newVisualFormat && !newVisualFormat.includes('$LOWER_PROB')) {

                        newVisualFormat = newVisualFormat.replace(/:\s*(\d+)\s*$/, ': $LOWER_PROB');

                    }

                    // 🎯 FIX: Resolver $LOWER_PROB dinamicamente no texto visual
                    if (newVisualFormat && newVisualFormat.includes('$LOWER_PROB') && typeof getProbabilityResolver === 'function') {
                        const resolver = getProbabilityResolver();

                        // Usar os mesmos dados que checkRuleCondition usa (com delay)
                        const probData = this.getLatestProbabilityData(true);
                        if (probData && probData.sorted) {
                            resolver.updateProbabilityData(probData.sorted);
                        }

                        const lowerProb = resolver.resolve('$LOWER_PROB');
                        if (lowerProb !== null) {
                            newVisualFormat = newVisualFormat.replace(/\$LOWER_PROB/g, lowerProb);
                        }
                    }
                    if (newVisualFormat && newVisualFormat.includes('$HIGHER_PROB') && typeof getProbabilityResolver === 'function') {
                        const resolver = getProbabilityResolver();
                        const higherProb = resolver.resolve('$HIGHER_PROB');
                        if (higherProb !== null) {
                            newVisualFormat = newVisualFormat.replace(/\$HIGHER_PROB/g, higherProb);
                        }
                    }

                    // Adicionar regra ao grupo
                    updatedGroupRules.push({
                        id: rule.id,
                        displayText: newVisualFormat,
                        status: ruleStatus
                    });

                } catch (ruleError) {
                    console.warn(`⚠️ Erro visual na regra ${rule.name || rule.id}:`, ruleError);
                    // Adicionar feedback visual de erro sem quebrar o loop
                    updatedGroupRules.push({
                        id: rule.id,
                        displayText: `⚠️ Erro: ${rule.name || 'Regra'}`,
                        status: 'failed'
                    });
                }
            });

            // Adicionar grupo com suas regras
            updatedGroups.push({
                id: group.id,
                rules: updatedGroupRules
            });
        });

        if (updatedGroups.length > 0) {

            const currentVisualState = JSON.stringify({
                groups: updatedGroups,
                cooldown: isCooldownActive
            });

            if (MonitoringView.lastVisualState === currentVisualState) {
                return; // Sem mudanças visuais, ignorar disparo de evento
            }

            MonitoringView.lastVisualState = currentVisualState;

            window.dispatchEvent(new CustomEvent('rulesUpdated', {
                detail: {
                    groups: updatedGroups, // ✅ GRUPOS em vez de regras individuais
                    isUpdate: true, // Marcar como atualização em tempo real
                    cooldownActive: isCooldownActive // ✅ NOVO: Informar estado do cooldown
                }
            }));

            const loopDuration = performance.now() - loopStartTime;
          
        }
    }

    // Verificar se uma regra específica está sendo atendida
    static checkRuleCondition(rule, forcedPrice = null) {
        try {

            const formatGenerator = getFormatGeneratorInstance();

            // 🎲 PROBABILIDADE: Processar variáveis especiais ($HIGHER_PROB, $LOWER_PROB)
            if (typeof getProbabilityResolver === 'function') {
                const resolver = getProbabilityResolver();

                const probData = this.getLatestProbabilityData(true);
                if (probData && probData.sorted) {
                    resolver.updateProbabilityData(probData.sorted);
                }

                // 🎯 FIX: Verificar também em parameters.targetValue e parameters.condition.value
                const hasSpecialVar = resolver.isSpecialVariable(rule.targetValue) ||
                    resolver.isSpecialVariable(rule.target) ||
                    resolver.isSpecialVariable(rule.value) ||
                    resolver.isSpecialVariable(rule.parameters?.targetValue) ||
                    resolver.isSpecialVariable(rule.parameters?.condition?.value) ||
                    resolver.isSpecialVariable(rule.parameters?.condition?.probabilityVariable);

                if (hasSpecialVar) {
                    // 🎯 FIX: Regras incrementais (isolated_digits, sequence) NÃO podem ser clonadas, 
                    // pois perdem o estado (_isolatedSequence, currentValue, etc) entre os ticks.
                    // O processamento será feito internamente no FormatGenerator ou via mutação segura.
                    if (rule.type === 'isolated_digits' || rule.type === 'sequence') {
                        // Não clonar. O FormatGenerator.checkIsolatedDigitsCondition já resolve internamente.
                    } else {
                        //processRule modifica o objeto, o que cacheia o valor resolvido
                        const ruleCopy = JSON.parse(JSON.stringify(rule));
                        rule = resolver.processRule(ruleCopy);
                    }

                    // Se é uma regra de check de probabilidade, validar diretamente
                    if (rule.type === 'probability_check' && rule._probabilityVariable) {
                        return resolver.validateProbabilityCheck(rule);
                    }
                }
            }

            if (rule.type === 'last_digits' || rule.type === 'digit_repetition' || rule.type === 'digit_pattern' || rule.type === 'dynamic_prediction' || rule.type === 'isolated_digits') {
                const marketData = getMarketDataInstance(SessionManager.getLocalToken());
                if (marketData) {
                    const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
                    if (currentSymbol) {
                        // Forçar atualização do símbolo ativo no formatGenerator
                        formatGenerator.currentSymbol = currentSymbol;
                        formatGenerator.marketData = marketData;

                        const history = marketData.getHistoricalTicks(currentSymbol, 50);
                        if (!history || !history.prices || history.prices.length < 10) {
                            logConfig.debug('monitoring', `⚠️[RULE CHECK] Dados insuficientes para ${currentSymbol}: ${history?.prices?.length || 0} preços`);
                            return false; // Não atender condição se não há dados suficientes
                        }
                    }
                }
            }

            // 🎯 CRÍTICO: Passar preço forçado para validação instantânea
            const formatStartTime = performance.now();
            const result = formatGenerator.checkRuleCondition(rule, forcedPrice);
            const formatDuration = performance.now() - formatStartTime;

            return result;

        } catch (error) {
            console.error('❌ [RULE CHECK] Erro:', error);
            return false; // Em caso de erro, regra não é satisfeita
        }
    }

    // 🎲 NOVO: Obter dados de probabilidade mais recentes
    static getLatestProbabilityData(excludeLastTick = false) {
        try {
            // Calcular probabilidade se necessário
            const probData = this.calculateProbabilities(excludeLastTick);
            return probData;
        } catch (error) {
            console.warn('⚠️ [PROB] Erro ao obter dados:', error);
            return null;
        }
    }

    // 🏥 DIAGNÓSTICO CONSOLIDADO: Um único log com saúde de TODOS os componentes
    static logSystemHealthDiagnostic() {
        const marketData = getMarketDataInstance(SessionManager.getLocalToken());
        const cooldownOverlay = getCooldownOverlayInstance();
        const tradeManager = getTradeManagerInstance();

        const now = Date.now();

        // === WEBSOCKET ===
        const wsState = marketData?.ws?.readyState;
        const wsMap = { 0: 'CONN', 1: 'OPEN', 2: 'CLOS', 3: 'DEAD' };
        const ws = wsMap[wsState] || 'NONE';

        // === PING/PONG (crítico para detectar causa de desconexão) ===
        const pingAge = marketData?.lastPingTime ? Math.round((now - marketData.lastPingTime) / 1000) : '?';
        const pongAge = marketData?.lastPongReceived ? Math.round((now - marketData.lastPongReceived) / 1000) : '?';

        // === TICKS ===
        const tickAge = marketData?.lastTickReceived ? Math.round((now - marketData.lastTickReceived) / 1000) : '?';

        // === AUTH ===
        const auth = marketData?.isAuthorized ? '✓' : '✗';

        // === RECONNECTION ===
        const reconn = marketData?.reconnectAttempts > 0 ? `${marketData.reconnectAttempts} ` : '✗';

        // === MONITORING ===
        const monState = MonitoringView.state || 'NONE';

        // === COOLDOWN ===
        const cdActive = cooldownOverlay?.cooldownActive ? '✓' : '✗';
        const cdTicks = cooldownOverlay?.cooldownActive ?
            `${cooldownOverlay.cooldownTicksRemaining} /${cooldownOverlay.cooldownTicksTotal}` : '0/0';

        // === SUBSCRIPTIONS & CALLBACKS ===
        const subs = marketData?.activeSubscriptions?.size || 0;
        const cbs = marketData?.tickCallbacks?.size || 0;

        // === INTERVALS ATIVOS ===
        const intT = MonitoringView.tradingRulesInterval ? '✓' : '✗';
        const intH = MonitoringView.healthCheckInterval ? '✓' : '✗';
        const intR = MonitoringView.ruleUpdateInterval ? '✓' : '✗';

        // === TRADE MANAGER ===
        const tmActive = tradeManager?.isTradeActive() ? '✓' : '✗';
        const tmAwaiting = tradeManager?.isAwaitingExpiration() ? '✓' : '✗';


    }

    // Iniciar trading baseado em regras
    static async startRuleBasedTrading(translatedRules) {
        // 🔧 CRÍTICO: Verificar se getCooldownOverlayInstance está disponível
        if (typeof getCooldownOverlayInstance === 'undefined') {
            // Aguardar até que a função esteja disponível
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos

            while (typeof getCooldownOverlayInstance === 'undefined' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (typeof getCooldownOverlayInstance === 'undefined') {
                return;
            }
        }

        // 3. Aguardar tick para garantir limpeza
        await new Promise(resolve => setTimeout(resolve, 200));

        // Isso previne rules com NaN ou undefined no start
        const currentSymbol = document.getElementById('symbol-select')?.value || window.selectedSymbol;
        if (currentSymbol) {
            await MonitoringView.fetchAndCalculateInitialProbabilities(currentSymbol);
        }

        await MonitoringView.startUnifiedTickSubscription();


        // ✅ NOVO: Verificação de saúde do monitoramento a cada 10 segundos
        MonitoringView.healthCheckInterval = setInterval(() => {
            MonitoringView.performHealthCheck();
        }, 10000);
    }

    // 🎯 NOVO: Forçar verificação imediata após resultado de contrato (ignora throttle)
    static async forceImmediateRuleCheck(exitPrice, outcome = null) {
        console.info(`⚡ [DELAY 0] forceImmediateRuleCheck chamado com preço: ${exitPrice}`);
        // 🔒 BLOQUEIO DE SEGURANÇA: Evitar disparos múltiplos no mesmo tick de saída
        const now = Date.now();
        if (MonitoringView.lastForceCheckProcessedTime && (now - MonitoringView.lastForceCheckProcessedTime < 800)) {

            return;
        }

        // 🎯 SINCRONIZAÇÃO DE ESTADO: Se recebemos o resultado do trade, atualizar AGORA
        // Isso garante que getActiveGroupIds() já veja o novo estado (Ex: Ativar após LOSS)
        if (outcome && outcome.result) {
            console.info(`🎲 [DELAY 0 SYNC] Sincronizando resultado para ativação de grupos: ${outcome.result}`);
            MonitoringView.lastTradeOutcome = outcome;
            MonitoringView.applyActiveGroupsVisibility();
        }

        MonitoringView.lastForceCheckProcessedTime = now;

        const tradeManager = getTradeManagerInstance();

        // 🛡️ PROTEÇÃO: IGNORAR se já existe trade em execução real
        if (MonitoringView.isExecutingTrade || (tradeManager && tradeManager.isAwaitingExpiration())) {

            return;
        }

        MonitoringView.forceCheckInProgress = true;

        // 🔥 CRÍTICO: Resetar flags e estado ANTES de verificar regras
        MonitoringView.state = 'MONITORING';
        MonitoringView.isExecutingTrade = false;

        if (tradeManager) {
            tradeManager.awaitingExpiration = false;
            // Garantir que não há preço "sujo" de execuções anteriores
            tradeManager.forcedEntryPrice = exitPrice;
        }

        try {
            const translatedRules = MonitoringView.currentTranslatedRules;
          
            await MonitoringView.checkRulesForTrading(translatedRules, exitPrice);
        } finally {
            MonitoringView.forceCheckInProgress = false;
            // Limpar o preço forçado imediatamente após a tentativa
            if (tradeManager) tradeManager.forcedEntryPrice = null;
          
        }
    }

    // 🔍 NOVO: Determinar quais grupos devem estar ativos baseado no resultado do trade
    static getActiveGroupIds() {
        // 🎯 CRÍTICO: Carregar configuração PRIMEIRO, antes de qualquer verificação
        if (!MonitoringView.groupActivationConfig) {
            MonitoringView.groupActivationConfig = MonitoringView.loadSavedGroupConfigs();
        }

        // Se não houve trade ainda, verificar configuração inicial
        if (!MonitoringView.lastTradeOutcome) {
            const activeIds = [];
            // 🎯 CRÍTICO: Se não há configuração ALGUMA, retornar null (todos ativos)
            if (!MonitoringView.groupActivationConfig || Object.keys(MonitoringView.groupActivationConfig).length === 0) {
                // console.log('[DEBUG] No config found, all groups active');
                return null; // Todos os grupos estão ativos por padrão
            }

            // Se há configuração, processar cada grupo
            Object.keys(MonitoringView.groupActivationConfig).forEach(groupId => {
                const config = MonitoringView.groupActivationConfig[groupId];
                const initialValue = config.initial;
                const shouldActivate = config && config.initial !== false;


                if (shouldActivate) {
                    activeIds.push(parseInt(groupId));
                }
            });

            return activeIds;
        }

        const { result, mode, simulated } = MonitoringView.lastTradeOutcome;

        // todos devem permanecer ativos.
        if (!MonitoringView.groupActivationConfig || Object.keys(MonitoringView.groupActivationConfig).length === 0) {
            return null;
        }

        // Mapear resultado para as chaves de configuração
        let conditionKey = '';
        if (result === 'WIN') {
            conditionKey = simulated ? 'winSimulated' : 'winReal';
        } else if (result === 'LOSS') {
            conditionKey = simulated ? 'lossSimulated' : 'lossReal';
        } else {
            return null; // Resultado misto ou desconhecido -> manter todos
        }


        const activeIds = [];
        // Iterar configurações
        Object.keys(MonitoringView.groupActivationConfig).forEach(groupIdStr => {
            const groupId = parseInt(groupIdStr);
            const config = MonitoringView.groupActivationConfig[groupIdStr];

            // Only block if explicitly set to false
            const isGroupActiveForCondition = config && config[conditionKey] !== false;

            if (isGroupActiveForCondition) {
                activeIds.push(groupId);
            }

        });

        logConfig.info('monitoring', `🎲 [GROUP CONTROL] Active Groups for ${conditionKey}: [${activeIds.join(', ')}]`);

        return activeIds;
    }

    // 🎨 NOVO: Aplicar visibilidade visual aos grupos
    static applyActiveGroupsVisibility() {
        const activeIds = MonitoringView.getActiveGroupIds();
        const rulesDisplay = document.getElementById('rules-visual-display');
        if (!rulesDisplay) return;

        // Se activeIds é null, todos ativos.
        const groups = rulesDisplay.querySelectorAll('.rule-group');
        const orConnectors = rulesDisplay.querySelectorAll('.or-connector');

        let visualActiveCount = 0;

        groups.forEach(group => {
            const groupId = parseInt(group.dataset.groupId);

            const hasConfig = MonitoringView.groupActivationConfig && MonitoringView.groupActivationConfig[groupId];

            const isActive = activeIds === null || !hasConfig || activeIds.includes(groupId);

            if (isActive) {
                visualActiveCount++;
                group.classList.remove('group-inactive-filtered');
                group.style.opacity = '1';
                group.style.filter = 'none';
                group.style.pointerEvents = 'auto';

                // Remover overlay de bloqueio se existir
                const lockOverlay = group.querySelector('.group-lock-overlay');
                if (lockOverlay) lockOverlay.remove();

                // 🎨 RESTAURAR VISIBILIDADE DOS FILHOS
                Array.from(group.children).forEach(child => {
                    if (!child.classList.contains('group-lock-overlay')) {
                        child.style.opacity = '1';
                        child.style.filter = 'none';
                    }
                });

            } else {
                group.classList.add('group-inactive-filtered');

                // 🎨 MUDANÇA: Container permanece visível para que o ícone fique por cima
                group.style.opacity = '1';
                group.style.filter = 'none';
                group.style.pointerEvents = 'none';

                // Aplicar efeito de inativo APENAS nos filhos de conteúdo (não no overlay)
                Array.from(group.children).forEach(child => {
                    if (!child.classList.contains('group-lock-overlay')) {
                        child.style.opacity = '0.1'; // Bem escuro
                        child.style.filter = 'grayscale(100%) blur(1px)';
                    }
                });

                // Adicionar overlay de cadeado no centro (Flexbox para centralização perfeita)
                if (!group.querySelector('.group-lock-overlay')) {
                    const overlay = document.createElement('div');
                    overlay.className = 'group-lock-overlay';
                    overlay.style.cssText = `
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000 !important;
                        pointer-events: none;
                    `;

                    const lockIcon = document.createElement('div');
                    lockIcon.textContent = '🔒';
                    lockIcon.className = 'lock-icon-element';
                    lockIcon.style.cssText = `
                        font-size: 50px; /* Levemente menor para não explodir */
                        filter: none !important;
                        opacity: 1 !important;
                        text-shadow: 0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4);
                        /* Animation REMOVED */
                    `;

                    overlay.appendChild(lockIcon);

                    group.style.position = 'relative';
                    group.appendChild(overlay);
                }
            }
        });

    }

    static async checkRulesForTrading(translatedRules, forcedPrice = null) {
        try {
            if (!translatedRules || !translatedRules.groups) return;
            if (MonitoringView.state !== 'MONITORING') return;

            if (!forcedPrice) {
                const now = Date.now();
                if (!MonitoringView.lastRuleCheckTime) MonitoringView.lastRuleCheckTime = 0;
                if (now - MonitoringView.lastRuleCheckTime < 1000) return;
                MonitoringView.lastRuleCheckTime = now;
            }

            const tradeManager = getTradeManagerInstance();

            if (tradeManager.isAwaitingExpiration()) {
                // Verificar se está travado há muito tempo (mais de 30 segundos)
                const now = Date.now();
                if (!MonitoringView.lastAwaitingExpirationTime) {
                    MonitoringView.lastAwaitingExpirationTime = now;
                } else if (now - MonitoringView.lastAwaitingExpirationTime > 30000) {
                    tradeManager.awaitingExpiration = false;
                    MonitoringView.lastAwaitingExpirationTime = null;
                }
            } else {
                MonitoringView.lastAwaitingExpirationTime = null;
            }

            if (!tradeManager.isTradeActive()) {

                return; // Sistema parado
            }

            const cooldownPeriod = tradeManager?.config?.cooldownPeriod ?? 3;
            const shouldBlockOnExpiration = cooldownPeriod > 0; // Só bloqueia se cooldown > 0

            if (tradeManager.isAwaitingExpiration() && shouldBlockOnExpiration) {

                return; // Aguardando expiração (apenas se cooldown > 0)
            }

            const cooldownState = getCooldownOverlayInstance().getCooldownState();
            const cooldownOverlay = getCooldownOverlayInstance();

            if (cooldownState.active || cooldownState.protected ||
                MonitoringView.state === 'COOLDOWN' ||
                MonitoringView.state === 'COOLDOWN_PROTECTED') {
                return; // ✅ BLOQUEIO TOTAL durante qualquer estado de cooldown
            }

            if (MonitoringView.pendingCooldownStart) {
                return; // Bloquear trades se cooldown pendente
            }


            let anyGroupSatisfied = false;
            let totalRulesCount = 0;
            let satisfiedRulesInGroup = 0;
            let satisfiedGroupsInfo = [];

            // Verificar cada grupo de regras
            const activeGroupIds = MonitoringView.getActiveGroupIds();

            for (const group of translatedRules.groups) {
                const groupIdInt = parseInt(group.id);
                const hasConfig = MonitoringView.groupActivationConfig && MonitoringView.groupActivationConfig[groupIdInt];

                // Se NÃO está na lista de ativos, está bloqueado.
                const isBlocked = activeGroupIds !== null && !activeGroupIds.includes(groupIdInt);
             
                if (isBlocked) {
                        group.rules.forEach(rule => {
                        const ruleId = rule.id || `rule-${group.index}-${rule.index}`;
                        const ruleElement = document.getElementById(ruleId);
                        if (ruleElement) {
                            ruleElement.classList.remove('rule-satisfied', 'rule-true');
                            // Resetar background se houver
                            const contentDiv = ruleElement.querySelector('.rule-content');
                            if (contentDiv) contentDiv.style.backgroundColor = '';
                        }
                    });

                    continue;
                }

                let allRulesInGroupSatisfied = true;
                let groupSatisfiedCount = 0;
                let totalRulesInGroup = group.rules.length;

                totalRulesCount += totalRulesInGroup;

                // Verificar todas as regras do grupo (AND logic)
                for (const rule of group.rules) {

                    const isRuleSatisfied = this.checkRuleCondition(rule, forcedPrice);

                    if (isRuleSatisfied) {
                        groupSatisfiedCount++;
                        satisfiedRulesInGroup++;
                    } else {
                        allRulesInGroupSatisfied = false;
                    }
                }

                // Se TODAS as regras deste grupo estão atendidas, o grupo está completo
                if (allRulesInGroupSatisfied && totalRulesInGroup > 0) {
                    anyGroupSatisfied = true;
                  
                    satisfiedGroupsInfo.push({
                        groupId: group.id,
                        groupIndex: group.index,
                        rulesCount: totalRulesInGroup
                    });
                }
            }

            // - Estratégia está vazia (caixa vazia = entrada imediata automática)
            const immediateCheckbox = document.getElementById('immediate-execution-mode');
            const isCheckboxActive = immediateCheckbox?.checked || false;
            const isStrategyEmpty = translatedRules.groups.length === 0;
            const shouldForceImmediate = isCheckboxActive || isStrategyEmpty;

            if (shouldForceImmediate) {
                anyGroupSatisfied = true;

                if (translatedRules.groups.length > 0 && satisfiedGroupsInfo.length === 0) {
                    const firstGroup = translatedRules.groups[0];
                    satisfiedGroupsInfo.push({
                        groupId: firstGroup.id,
                        groupIndex: firstGroup.index,
                        rulesCount: firstGroup.rules.length
                    });
                }

                const reason = isStrategyEmpty ? 'Estratégia vazia' : 'Checkbox ativado';
            }

            // 🎯 CRÍTICO: REGRAS ATENDIDAS
            if (anyGroupSatisfied) {
              
                logConfig.info('monitoring', `🎯 [RULES SATISFIED] Grupo satisfeito detectado! satisfiedGroupsInfo:`, satisfiedGroupsInfo);

                // 🛡️ PROTEÇÃO EXTRA: Evitar execução duplicada mesmo com regras satisfeitas
                if (MonitoringView.isExecutingTrade) {
                    logConfig.info('monitoring', `⚠️ [ALREADY EXECUTING] Trade já em execução, ignorando`);
                    return; // Já executando trade, não processar novamente
                }

                // 🔧 CORRIGIDO: Pegar o ID do primeiro grupo satisfeito
                const satisfiedGroupId = satisfiedGroupsInfo.length > 0 ? satisfiedGroupsInfo[0].groupId : null;


                logConfig.info('monitoring', `🎯 [GROUP ID] satisfiedGroupId = ${satisfiedGroupId}`);

                // 🎯 NOVO: Extrair contractType e contractPrediction de QUALQUER regra do grupo
                // Este é o momento exato em que a regra foi satisfeita
                let capturedPredictions = null;

                // Verificar se há regras no grupo satisfeito com contrato explícito
                if (satisfiedGroupId && translatedRules && translatedRules.groups) {
                    const satisfiedGroup = translatedRules.groups.find(g => g.id === satisfiedGroupId);

                    if (satisfiedGroup && satisfiedGroup.rules) {
                        const contractPredictions = [];

                        satisfiedGroup.rules.forEach(rule => {
                            const params = rule.parameters || {};

                            // Tentar obter tipo de contrato de várias fontes
                            const contractType = rule.contractType || params.contractType || rule.predictionAction || params.predictionAction;

                            // Tentar obter previsão de várias fontes
                            const contractPrediction = (rule.contractPrediction !== undefined ? rule.contractPrediction :
                                (params.contractPrediction !== undefined ? params.contractPrediction :
                                    (rule.targetValue !== undefined ? rule.targetValue : params.targetValue)));

                            if (contractType && contractPrediction !== undefined) {
                                // 🎯 NORMALIZAÇÃO: Converter para formato interno
                                const typeMap = {
                                    'over': 'DIGITOVER',
                                    'under': 'DIGITUNDER',
                                    'match': 'DIGITMATCH',
                                    'diff': 'DIGITDIFF',
                                    'differ': 'DIGITDIFF',
                                    'even': 'DIGITEVEN',
                                    'odd': 'DIGITODD',
                                    'call': 'CALL',
                                    'put': 'PUT',
                                    'rise': 'CALL',
                                    'fall': 'PUT'
                                };
                                const normalizedType = typeMap[contractType.toLowerCase()] || contractType.toUpperCase();

                                contractPredictions.push({
                                    contractType: normalizedType,
                                    predictionValue: contractPrediction,
                                    _triggerDigit: rule._triggerDigit,
                                    rule: rule
                                });

                                logConfig.info('monitoring', `🎯 [CONTRACT OVERRIDE] Extraído de ${rule.type}: ${normalizedType} ${contractPrediction}`);
                            }
                        });

                        // Se encontramos contratos explícitos, usar eles
                        if (contractPredictions.length > 0) {
                            capturedPredictions = contractPredictions;
                            logConfig.info('monitoring', `✅ [CONTRACT OVERRIDE] Usando ${contractPredictions.length} contrato(s) explícitos do grupo`);
                        }
                    }
                }


                // Isso evita que getDynamicPredictionFromRules use dados de mercado desatualizados
                let overrideDigit = null;
                if (forcedPrice !== null && forcedPrice !== undefined) {
                    const priceStr = forcedPrice.toString();
                    const lastChar = priceStr.charAt(priceStr.length - 1);
                    if (!isNaN(parseInt(lastChar, 10))) {
                        overrideDigit = parseInt(lastChar, 10);
                        logConfig.info('monitoring', `🎯 [IMMEDIATE] Usando overrideDigit: ${overrideDigit} para cálculo da previsão`);
                    }
                }

                if (satisfiedGroupId && typeof getDynamicPredictionFromRules === 'function' && capturedPredictions === null) {
                    capturedPredictions = getDynamicPredictionFromRules(satisfiedGroupId, overrideDigit);

                    if (capturedPredictions !== null) {
                        // 🎯 NOVO: Verificar se é array ou valor único
                        if (Array.isArray(capturedPredictions)) {
                            logConfig.info('monitoring', `🎯 [MULTIPLE PREDICTIONS CAPTURED] ${capturedPredictions.length} previsões para grupo ${satisfiedGroupId}`);
                            capturedPredictions.forEach(pred => {
                                logConfig.info('monitoring', `   → ${pred.contractType}: ${pred.predictionValue}`);
                            });
                        } else {
                            logConfig.info('monitoring', `🎯 [SINGLE PREDICTION CAPTURED] Valor: ${capturedPredictions} para grupo ${satisfiedGroupId}`);
                        }
                    }
                } else if (capturedPredictions !== null) {
                    logConfig.info('monitoring', `ℹ️ [SKIP DYNAMIC] Usando contratos já extraídos das regras (Explicit Contracts), pulando getDynamicPredictionFromRules`);
                }

                // 🔍 LOG RASTREAMENTO: Verificar tipo de trade configurado
                const tradeTypeSelect = CommonHelpers.getElement('trade-type-select');
                const selectedTradeType = tradeTypeSelect?.value;

                // ESTADO DO COOLDOWN
                const cooldownState = getCooldownOverlayInstance().getCooldownState();


                // VERIFICAÇÃO DE BLOQUEIOS
                const bloqueios = [];

                // (a menos que seja o próprio forceCheck chamando com forcedPrice)
                if (MonitoringView.forceCheckInProgress && !forcedPrice) {
                    bloqueios.push('Force check em progresso (aguardando re-entrada forçada completar)');
                }

                if (MonitoringView.state !== 'MONITORING') bloqueios.push(`Estado não é MONITORING: ${MonitoringView.state}`);
                if (MonitoringView.isExecutingTrade) bloqueios.push('Já executando trade');
                if (!tradeManager.isTradeActive()) bloqueios.push('TradeManager inativo');

                // 🎯 CRÍTICO: Só bloquear awaitingExpiration se Cooldown > 0
                const cooldownPeriod = tradeManager?.config?.cooldownPeriod ?? 3;
                if (tradeManager.isAwaitingExpiration() && cooldownPeriod > 0) {
                    bloqueios.push('Aguardando expiração (Cooldown > 0)');
                }

                if (cooldownState.active) bloqueios.push('Cooldown ativo');
                if (cooldownState.protected) bloqueios.push('Cooldown protegido');
                if (MonitoringView.pendingCooldownStart) bloqueios.push('Cooldown pendente');



                if (bloqueios.length > 0) {
                    if (forcedPrice) {
                        console.log(`🚫 [DELAY 0 BLOCKED] Bloqueios:`, bloqueios);
                        bloqueios.forEach(motivo => console.log(`   • ${motivo}`));
                    } else {
                        logConfig.debug('monitoring', `⚠️ [TRADE BLOCKED] Regras atendidas mas trade bloqueado: ${bloqueios.join(', ')}`);
                    }
                    return;
                }

                logConfig.info('monitoring', `✅ [TRADE READY] Todas as verificações passaram, executando trade para grupo ${satisfiedGroupId}`);
                const entryPrice = forcedPrice ?? MonitoringView.lastTickPrice;
                const last4 = getLast4Digits(entryPrice);

                // ✅ EXECUTAR TRADE (passar entryPrice para garantir propagação)
                const tradeExecuted = await MonitoringView.executeTradeBasedOnRules(satisfiedGroupId, capturedPredictions, entryPrice);


                if (tradeManager && typeof tradeManager.clearProcessedContracts === 'function') {
                    setTimeout(() => {
                        tradeManager.clearProcessedContracts();
                    }, 2000);
                }

                return; // Sair da função - não verificar mais regras
            }
        } catch (fatalError) {
            console.error('FATAL ERROR in checkRulesForTrading:', fatalError);
            if (MonitoringView.renderErrorPanel) {
                MonitoringView.renderErrorPanel(fatalError);
            }
        }
    }

    // 🎯 NOVO: Painel de Erro Global (Crash)
    static renderErrorPanel(error) {
        let panel = document.getElementById('monitoring-error-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'monitoring-error-panel';
            panel.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 0, 0, 0.95);
                color: white;
                font-family: monospace;
                padding: 15px;
                border: 2px solid yellow;
                z-index: 100000;
                max-width: 80%;
                box-shadow: 0 0 20px black;
                border-radius: 8px;
            `;
            document.body.appendChild(panel);

            // Auto remover após 10s
            setTimeout(() => panel.remove(), 10000);
        }
        panel.innerHTML = `<h3>⚠️ CRASH DETECTADO</h3><p>${error.message}</p><small>${error.stack}</small>`;
    }

    // 🔄 NOVO: Destacar visualmente quando todas as regras são atendidas
    static highlightAllRulesSatisfied() {
        const rulesContainer = CommonHelpers.getElement('rules-visual-display');
        if (!rulesContainer) return;

        // Adicionar classe especial ao container para indicar sucesso total
        rulesContainer.classList.add('all-rules-satisfied');

        // Destacar todas as regras individuais
        const ruleItems = rulesContainer.querySelectorAll('.rule-visual-item');
        ruleItems.forEach(item => {
            item.classList.add('rule-executing');
        });

        // Adicionar animação temporária de pulso de sucesso
        setTimeout(() => {
            rulesContainer.classList.remove('all-rules-satisfied');
            ruleItems.forEach(item => {
                item.classList.remove('rule-executing');
            });
        }, 2000); // Remove após 2 segundos
    }

    // Executar trade quando todas as regras forem atendidas
    static async executeTradeBasedOnRules(satisfiedGroupId = null, capturedPrediction = null, forcedEntryPrice = null) {

        logConfig.info('trade_manager', `🚀 [RULES] executeTradeBasedOnRules atendido! Grupo: ${satisfiedGroupId}`);
        logConfig.info('trade_manager', `🔍 [PREDICTION] Dados recebidos: ${JSON.stringify(capturedPrediction)}`);

        // 🎯 CRÍTICO: Usar forcedEntryPrice se fornecido (re-execução), senão lastTickPrice
        const entryPrice = forcedEntryPrice ?? MonitoringView.lastTickPrice;
        const priceSource = forcedEntryPrice ? '(forçado)' : '(tick)';
        const isForceCheck = !!forcedEntryPrice;

        try {
            const tradeManager = getTradeManagerInstance();
            const cooldownPeriod = tradeManager?.config?.cooldownPeriod ?? 3;
            const isContinuousMode = cooldownPeriod === 0;


            // Apenas forceImmediateRuleCheck pode passar!
            if (!isForceCheck && tradeManager && tradeManager.awaitingExpiration) {
                return false;
            }

            // O forceImmediateRuleCheck reseta isExecutingTrade antes de chamar
            if (MonitoringView.isExecutingTrade) {
                logConfig.info('monitoring', `⚠️ [EXECUTION BLOCKED] Já existe um trade sendo processado na visualização.`);
                return false;
            }

            MonitoringView.isExecutingTrade = true;

            // 🔍 DEBUG: Verificar configuração do "Tipo Trade"
            const tradeTypeSelect = CommonHelpers.getElement('trade-type-select');
            const selectedTradeType = tradeTypeSelect?.value;

            // 🔍 DEBUG: Verificar se é modo "Ambos"
            const isBothMode = selectedTradeType === 'BOTH';

            // 🎯 CRÍTICO: Validar preço de entrada
            if (!entryPrice) {
                logConfig.error('monitoring', `❌ [EXECUTION FAILED] Preço de entrada inválido.`);
                MonitoringView.isExecutingTrade = false;
                return false;
            }

            if (capturedPrediction !== null && tradeManager) {

                // 🎯 NOVO: Suportar tanto array quanto valor único
                if (Array.isArray(capturedPrediction)) {
                    // Array de previsões com contractType específico
                    tradeManager.capturedPredictionsForTrade = capturedPrediction;

                } else {

                    tradeManager.capturedPredictionsForTrade = [{
                        contractType: null,
                        predictionValue: capturedPrediction
                    }];

                }
            }

            // 🎯 CRÍTICO: Salvar forcedEntryPrice no tradeManager para uso em executeRealTrade
            if (forcedEntryPrice && tradeManager) {
                tradeManager.forcedEntryPrice = forcedEntryPrice;
            }

            const tradeResult = await tradeManager.executeTrade(entryPrice, satisfiedGroupId, isForceCheck);

            // 🎯 Limpar forcedEntryPrice após uso
            if (tradeManager) {
                tradeManager.forcedEntryPrice = null;
            }

            // ✅ CORREÇÃO: Validar sucesso do trade
            const tradeSuccess = (tradeResult === true || (tradeResult && tradeResult.success));

            if (tradeSuccess) {
                logConfig.info('monitoring', `✅ [TRADE SUCCESS] Trade executado com sucesso para grupo ${satisfiedGroupId}`);

                // 🎯 VERIFICAR: Só usar delay se período > 0
                const cooldownPeriod = tradeManager?.config?.cooldownPeriod || 0;

                if (cooldownPeriod > 0) {
                    // 🕐 Aguardar 1 segundo antes de inicializar cooldown
                    setTimeout(() => {
                        const cooldownOverlay = getCooldownOverlayInstance();
                        cooldownOverlay.activateCooldown();
                        MonitoringView.state = 'COOLDOWN';
                    }, 1000);
                } else {

                    logConfig.info('monitoring', `⚡ [DELAY=0 DEBUG] Trade comprado. Mantendo flag para monitoramento.`);
                    MonitoringView.state = 'MONITORING';
                }

                return true;

            } else {
                logConfig.warn('monitoring', `❌ [TRADE FAILED] Execução de trade falhou.`);
                MonitoringView.isExecutingTrade = false;
                return false;
            }

        } catch (error) {
            logConfig.error('monitoring', `🚨 [FATAL ERROR] Erro em executeTradeBasedOnRules:`, error);
            MonitoringView.isExecutingTrade = false;

            // 🛡️ CRÍTICO: Resetar flag do TradeManager também
            try {
                const tm = getTradeManagerInstance();
                if (tm) {
                    tm.awaitingExpiration = false;
                    tm.isExecutingTrade = false;
                }
            } catch (e) {
                // Silencioso se der erro ao pegar instância
            }

            return false;
        } finally {
            // Isso previne deadlocks quando há erros assíncronos ou timeouts
            setTimeout(() => {
                // Verificar se ainda está travado após 5 segundos
                if (MonitoringView.isExecutingTrade) {
                    const tm = getTradeManagerInstance();
                    const isStillAwaiting = tm && tm.isAwaitingExpiration();

                    if (!isStillAwaiting) {
                        logConfig.warn('monitoring', `🛡️ [FAILSAFE] isExecutingTrade estava travado. Resetando.`);
                        MonitoringView.isExecutingTrade = false;
                    }
                }
            }, 5000);
        }
    }

    // Atualizar modo de trading na interface
    static updateTradeMode(newMode, reason) {

        // Atualizar status na interface
        MonitoringView.updateAIStatus(`Modo: ${newMode} - ${reason}`);

        // Atualizar modo atual
        const modeElement = CommonHelpers.getElement('trade-mode-display');
        if (modeElement) {
            modeElement.textContent = newMode;
            modeElement.className = `trade-mode-${newMode.toLowerCase()}`;
        }

        // 🔧 NOVO: Forçar atualização dos indicadores visuais
        if (typeof UIManager !== 'undefined' && typeof UIManager.updateModeSelector === 'function') {
            UIManager.updateModeSelector(newMode);

        }

        // Atualizar indicação do próximo trade
        MonitoringView.updateNextTradeMode();

        // Atualizar contadores visuais
        MonitoringView.updateTradingCounters();

        // Mostrar notificação se necessário
        if (reason.includes('Perdas') || reason.includes('Vitórias')) {
            MonitoringView.showTradeNotification(`Modo alterado para ${newMode}`, reason);
        }
    }

    // Atualizar indicação do próximo modo de trade
    static updateNextTradeMode() {
        const tradeManager = getTradeManagerInstance();
        const counters = tradeManager.getCounters();
        const config = tradeManager.getConfiguration();
        const currentMode = tradeManager.getCurrentMode(); // Obter o modo atual do tradeManager

        let nextMode = currentMode;
        let modeReason = '';

        if (currentMode === 'SIMULACAO') {
            // Em simulação, próximo será real se atingir limite de perdas simuladas
            if (config.simulatedLossesLimit > 0) {
                const remainingLosses = config.simulatedLossesLimit - counters.simulatedLossesStreak;
                if (remainingLosses <= 0) {
                    // Já atingiu o limite, próximo será real
                    nextMode = tradeManager.determineAccountMode();
                    modeReason = '(perdas simuladas esgotadas)';
                } else {
                    // Ainda em simulação
                    nextMode = 'SIMULACAO';
                    modeReason = `(${remainingLosses} perda${remainingLosses !== 1 ? 's' : ''} simulada${remainingLosses !== 1 ? 's' : ''} restante${remainingLosses !== 1 ? 's' : ''})`;
                }
            } else {
                nextMode = tradeManager.determineAccountMode();
                modeReason = '(sem perdas simuladas configuradas)';
            }
        } else {
            // Em modo real/virtual, verificar se próximo será simulação
            if (config.simulatedLossesLimit > 0) {
                // Verificar se está próximo dos limites reais
                if (config.realWinsLimit > 0) {
                    const remainingWins = config.realWinsLimit - counters.realWinsStreak;
                    if (remainingWins <= 0) {
                        nextMode = 'SIMULACAO';
                        modeReason = '(limite de vitórias atingido)';
                    }
                }

                if (config.realLossesLimit > 0 && nextMode !== 'SIMULACAO') {
                    const remainingLosses = config.realLossesLimit - counters.realLossesStreak;
                    if (remainingLosses <= 0) {
                        nextMode = 'SIMULACAO';
                        modeReason = '(limite de perdas atingido)';
                    }
                }

                if (nextMode === currentMode && !modeReason) {
                    modeReason = '(continua no modo atual)';
                }
            } else {
                // Sem perdas simuladas configuradas, irá parar ao atingir limites
                if (config.realWinsLimit > 0) {
                    const remainingWins = config.realWinsLimit - counters.realWinsStreak;
                    if (remainingWins <= 0) {
                        modeReason = '(limite de vitórias atingido - parar)';
                    } else {
                        modeReason = `(${remainingWins} vitória${remainingWins !== 1 ? 's' : ''} restante${remainingWins !== 1 ? 's' : ''})`;
                    }
                }

                if (config.realLossesLimit > 0 && !modeReason) {
                    const remainingLosses = config.realLossesLimit - counters.realLossesStreak;
                    if (remainingLosses <= 0) {
                        modeReason = '(limite de perdas atingido - parar)';
                    } else {
                        modeReason = `(${remainingLosses} perda${remainingLosses !== 1 ? 's' : ''} restante${remainingLosses !== 1 ? 's' : ''})`;
                    }
                }

                if (!modeReason) {
                    modeReason = '(continua no modo atual)';
                }
            }
        }

        // Atualizar elemento na interface
        const nextTradeElement = CommonHelpers.getElement('next-trade-mode');
        if (nextTradeElement) {
            nextTradeElement.textContent = nextMode;
        }

    }

    // Atualizar contadores visuais
    static updateTradingCounters() {
        const tradeManager = getTradeManagerInstance();
        const counters = tradeManager.getCounters();

        // Atualizar contador real (vitórias | perdas)
        const realCounterElement = CommonHelpers.getElement('real-counter-display');
        if (realCounterElement) {
            realCounterElement.textContent = `V: ${counters.realWinsStreak} | P: ${counters.realLossesStreak}`;
        }

        // Atualizar vitórias simuladas
        const simulatedWinsElement = CommonHelpers.getElement('simulated-wins-display');
        if (simulatedWinsElement) {
            simulatedWinsElement.textContent = (counters.simulatedWinsStreak || 0).toString();
        }

        // Atualizar perdas simuladas  
        const simulatedLossesElement = CommonHelpers.getElement('simulated-losses-display');
        if (simulatedLossesElement) {
            simulatedLossesElement.textContent = counters.simulatedLossesStreak.toString();
        }
    }

    // Atualizar resultado do trade
    static updateTradeResult(mode, isWin, details) {
        const result = isWin ? 'WIN' : 'LOSS';

        // Atualizar contadores visuais IMEDIATAMENTE
        this.updateTradingCounters();

        if (typeof UIManager !== 'undefined' && typeof UIManager.updateTradingCounters === 'function') {
            UIManager.updateTradingCounters();
        }

        // Atualizar próximo modo
        this.updateNextTradeMode();

        // Incrementar trades executados
        const tradesExecutedElement = CommonHelpers.getElement('trades-executed');
        if (tradesExecutedElement) {
            const currentTrades = parseInt(tradesExecutedElement.textContent) || 0;
            tradesExecutedElement.textContent = (currentTrades + 1).toString();
        }

        // Atualizar status
        const profit = details.profit ? ` (${details.profit > 0 ? '+' : ''}${details.profit})` : '';
        this.updateAIStatus(`${mode}: ${result}${profit}`);

        // Mostrar notificação
        this.showTradeNotification(`Trade ${mode}: ${result}`, `Resultado: ${result}${profit}`);
    }

    // Mostrar notificação de trading
    static showTradeNotification(title, message) {

    }

    // Variável para controle de tempo real
    static currentTranslatedRules = null;
    static ruleUpdateInterval = null;
    static modeIndicatorInterval = null;
    static marketDataUpdateListener = null;

    // 🎯 NOVO: Armazenar último resultado de trade para controle de grupos
    static lastTradeOutcome = null;
    static groupActivationConfig = null; // Cache em memória


    static synchronizeMarketDataWithRules(translatedRules) {
        try {
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            const formatGenerator = getFormatGeneratorInstance();
            const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');

            if (!marketData || !currentSymbol) {
                CommonHelpers.showWarning('⚠️ [SYNC] Market data ou símbolo não disponível para sincronização');
                return;
            }

            // Verificar se há regras de dígitos que precisam de dados
            let hasDigitRules = false;
            if (translatedRules && translatedRules.groups) {
                translatedRules.groups.forEach(group => {
                    group.rules.forEach(rule => {
                        if (rule.type === 'last_digits' || rule.type === 'digit_repetition' || rule.type === 'digit_pattern') {
                            hasDigitRules = true;
                        }
                    });
                });
            }

            if (hasDigitRules) {

                // Forçar atualização dos dados no formatGenerator
                formatGenerator.currentSymbol = currentSymbol;
                formatGenerator.marketData = marketData;

                // Verificar se há dados históricos suficientes
                const history = marketData.getHistoricalTicks(currentSymbol, 50);
                if (history && history.prices && history.prices.length >= 10) {

                }
            }

        } catch (error) {
            CommonHelpers.showError('❌ [SYNC] Erro ao sincronizar dados de mercado:', error);
        }
    }

    // Atualizar status da IA
    static updateAIStatus(status) {
        const aiStatusElement = CommonHelpers.getElement('ai-status');
        if (aiStatusElement) {
            aiStatusElement.textContent = status;
        }
    }

    // 🎯 NOVO: Atualizar Barra de Precisão (Encaminha para V2)
    static updateAccuracyBadge(accuracy) {
        if (typeof this.updateAccuracyBadgeV2 === 'function') {
            this.updateAccuracyBadgeV2(accuracy);
        }
    }

    // Adicionar listener para botão de histórico
    static attachRulesHistoryButtonListener() {
        const historyBtn = CommonHelpers.getElement('rules-history-btn');
        if (historyBtn && !historyBtn.hasAttribute('data-listener-attached')) {
            historyBtn.setAttribute('data-listener-attached', 'true');

            historyBtn.addEventListener('click', () => {
                if (window.rulesHistoryManager) {
                    window.rulesHistoryManager.showHistoryModal();
                } else {
                    CommonHelpers.showError('❌ RulesHistoryManager não disponível');
                }
            });
        }
    }

    // Adicionar listener para botão do assistente de regras
    static attachRuleAssistantButtonListener() {
        const assistantBtn = CommonHelpers.getElement('rule-assistant-btn');
        if (assistantBtn && !assistantBtn.hasAttribute('data-listener-attached')) {
            assistantBtn.setAttribute('data-listener-attached', 'true');

            assistantBtn.addEventListener('click', () => {
                if (window.auxiliarRegrasInstance) {
                    window.auxiliarRegrasInstance.show();
                } else {
                    CommonHelpers.showError('❌ Auxiliar de Regras não disponível');
                }
            });
        }
    }

    // Adicionar listener para botão do tour guiado
    static attachTourGuideButtonListener() {
        const tourBtn = CommonHelpers.getElement('tour-guide-btn');
        if (tourBtn && !tourBtn.hasAttribute('data-listener-attached')) {
            tourBtn.setAttribute('data-listener-attached', 'true');

            tourBtn.addEventListener('click', () => {
                if (window.tourGuide) {
                    window.tourGuide.start();
                } else {
                    CommonHelpers.showError('❌ Tour Guiado não disponível');
                }
            });
        }
    }

    // Adicionar listener para botão de modelos
    static attachExamplesButtonListener() {
        const examplesBtn = CommonHelpers.getElement('examples-btn');
        if (examplesBtn && !examplesBtn.hasAttribute('data-listener-attached')) {
            examplesBtn.setAttribute('data-listener-attached', 'true');

            // Garantir que os estilos sejam aplicados imediatamente
            this.addExamplesStyles();

            examplesBtn.addEventListener('click', () => {
                this.showExamplesModal();
            });
        }
    }

    // Adicionar listener para botão da planilha
    static attachPlanilhaButtonListener() {
        const planilhaBtn = CommonHelpers.getElement('planilha-btn') ||
            document.querySelector('.planilha-btn');

        if (planilhaBtn && !planilhaBtn.hasAttribute('data-listener-attached')) {
            planilhaBtn.setAttribute('data-listener-attached', 'true');

            // Mas vamos garantir que funcione também via listener
            planilhaBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof PlanilhaTrade !== 'undefined' && PlanilhaTrade.showModal) {
                    PlanilhaTrade.showModal();
                } else {
                    CommonHelpers.showWarning('⚠️ PlanilhaTrade não está disponível');
                }
            });
        }
    }

    // Adicionar listener para botão de sugestões
    static attachSuggestionsButtonListener() {
        const suggestionsBtn = document.getElementById('suggestions-btn');

        if (!suggestionsBtn) {
            // Se o botão não existe, tentar novamente em 500ms (uma única vez)
            setTimeout(() => {
                this.attachSuggestionsButtonListener();
            }, 500);
            return;
        }

        // Verificar se já tem listener anexado
        if (suggestionsBtn.hasAttribute('data-suggestions-listener')) {
            return;
        }

        // Marcar que o listener foi anexado
        suggestionsBtn.setAttribute('data-suggestions-listener', 'true');

        // Criar e anexar listener
        const clickListener = async (event) => {
            try {
                event.preventDefault();
                event.stopPropagation();

                // Usar o módulo ModalSuggestoesIA
                if (typeof ModalSuggestoesIA !== 'undefined') {
                    ModalSuggestoesIA.showPreviousSuggestions();
                } else {
                    CommonHelpers.showWarning('Módulo de sugestões não carregado.');
                }
            } catch (error) {
                CommonHelpers.showError('Erro ao processar clique no botão de sugestões:', error);
            }
        };

        suggestionsBtn.addEventListener('click', clickListener);
    }

    // Adicionar listener para o botão da planilha
    attachPlanilhaButtonListener() {
        const planilhaBtn = document.querySelector('.planilha-btn');
        if (planilhaBtn && !planilhaBtn.hasAttribute('data-planilha-listener')) {
            planilhaBtn.setAttribute('data-planilha-listener', 'true');
            planilhaBtn.addEventListener('click', () => {
                if (typeof PlanilhaTrade !== 'undefined') {
                    PlanilhaTrade.showModal();
                } else {
                    CommonHelpers.showWarning('Módulo da Planilha de Trades não carregado.');
                }
            });
        }
    }

    // Delegado para o módulo ModalSuggestoesIA
    static saveSuggestions(suggestions, userConfig) {
        if (typeof ModalSuggestoesIA !== 'undefined') {
            ModalSuggestoesIA.saveSuggestions(suggestions, userConfig);
        } else {
        }
    }

    // Delegado para o módulo ModalSuggestoesIA
    static getLastSuggestions() {
        if (typeof ModalSuggestoesIA !== 'undefined') {
            return ModalSuggestoesIA.getLastSuggestions();
        } else {
            return null;
        }
    }

    // Delegado para o módulo ModalSuggestoesIA
    static showPreviousSuggestions() {
        if (typeof ModalSuggestoesIA !== 'undefined') {
            ModalSuggestoesIA.showPreviousSuggestions();
        } else {
            CommonHelpers.showWarning('Módulo de sugestões não está carregado.');
        }
    }

    // Mostrar modal com exemplos de estratégias
    static showExamplesModal() {
        const modal = document.createElement('div');
        modal.className = 'examples-modal';
        modal.innerHTML = `
            <div class="examples-modal-content">
                <div class="examples-modal-header">
                    <h2>📚 Modelos de Estratégias</h2>
                    <button class="examples-close-btn" onclick="this.closest('.examples-modal').remove()">×</button>
                </div>

                <div class="examples-modal-body">
                    <div class="examples-categories">

                        <div class="example-category">
                            <h3>🔢 Regras de Dígitos</h3>
                            <div class="example-items">
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Últimos 3 dígitos maiores que 8</strong>
                                    <code>* Entrar quando os ultimos 3 digitos > 8</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Sequência de dígitos pares</strong>
                                    <code>* Entrar quando os ultimos 5 digitos forem todos pares</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Dígito específico</strong>
                                    <code>* Entrar quando ultimo digito = 9</code>
                                </div>
                            </div>
                        </div>

                        <div class="example-category">
                            <h3>🎯 Padrões de Dígitos (XO)</h3>
                            <div class="example-items">
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão XXOX (3 iguais-diferente-igual)</strong>
                                    <code>* Entrar quando o padrão dos digitos for XXOX</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão XOXO (alternado)</strong>
                                    <code>* Entrar quando o padrão dos digitos for XOXO</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão XXXO (3 iguais + diferente)</strong>
                                    <code>* Entrar quando o padrão dos digitos for XXXO</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão OXXX (diferente + 3 iguais)</strong>
                                    <code>* Entrar quando o padrão dos digitos for OXXX</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão XOXOX (5 dígitos alternados)</strong>
                                    <code>* Entrar quando o padrão dos digitos for XOXOX</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão OXOXO (5 dígitos alternados)</strong>
                                    <code>* Entrar quando o padrão dos digitos for OXOXO</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão XXOO (2 iguais + 2 diferentes)</strong>
                                    <code>* Entrar quando o padrão dos digitos for XXOO</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão OOXX (2 diferentes + 2 iguais)</strong>
                                    <code>* Entrar quando o padrão dos digitos for OOXX</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão XXXXOO (4 iguais + 2 diferentes)</strong>
                                    <code>* Entrar quando o padrão dos digitos for XXXXOO</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão OOXXXX (2 diferentes + 4 iguais)</strong>
                                    <code>* Entrar quando o padrão dos digitos for OOXXXX</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão OOOOXXO (sequência complexa)</strong>
                                    <code>* Entrar quando o padrão dos digitos for OOOOXXO</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Padrão XOXOX (alternado)</strong>
                                    <code>* Entrar quando o padrão dos digitos for XOXOX</code>
                                </div>
                            </div>
                        </div>

                        <div class="example-category">
                            <h3>📊 Regras com RSI</h3>
                            <div class="example-items">
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>RSI Sobrecomprado</strong>
                                    <code>* Entrar quando RSI > 70</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>RSI Sobrevendido</strong>
                                    <code>* Entrar quando RSI < 30</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>RSI entre níveis</strong>
                                    <code>* Entrar quando RSI > 50 e RSI < 60</code>
                                </div>
                            </div>
                        </div>

                        <div class="example-category">
                            <h3>📈 Regras com SMA</h3>
                            <div class="example-items">
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Preço acima da média</strong>
                                    <code>* Entrar quando preço > SMA 20</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Cruzamento de médias</strong>
                                    <code>* Entrar quando SMA 10 > SMA 20</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>SMA com suporte</strong>
                                    <code>* Entrar quando SMA 14 > suporte</code>
                                </div>
                            </div>
                        </div>

                        <div class="example-category">
                            <h3>🎯 Regras de Suporte e Resistência</h3>
                            <div class="example-items">
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Quebra de resistência</strong>
                                    <code>* Entrar quando preço > resistencia</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Teste de suporte</strong>
                                    <code>* Entrar quando preço < suporte</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Entre níveis</strong>
                                    <code>* Entrar quando preço > suporte e preço < resistencia</code>
                                </div>
                            </div>
                        </div>

                        <div class="example-category">
                            <h3>📊 Regras com Percentuais</h3>
                            <div class="example-items">
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Variação percentual</strong>
                                    <code>* Entrar quando os dígitos inferiores a 4 > 50%</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Dígitos ímpares</strong>
                                    <code>* Entrar quando percentual de digitos impares > 60%</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Dígitos baixos</strong>
                                    <code>* Entrar quando percentual de digitos abaixo de 3 > 40%</code>
                                </div>
                            </div>
                        </div>

                        <div class="example-category">
                            <h3>💰 Regras com Preço</h3>
                            <div class="example-items">
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Preço acima da resistência</strong>
                                    <code>* Entrar quando ultimo tick > resistencia</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Movimento percentual</strong>
                                    <code>* Entrar quando preco subiu 0.5%</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Sequência de dígitos</strong>
                                    <code>* Entrar quando 3 ticks consecutivos subindo</code>
                                </div>
                            </div>
                        </div>

                        <div class="example-category">
                            <h3>🔄 Trader Ambos (Múltiplas Entradas)</h3>
                            <div class="example-items">
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Entradas individuais</strong>
                                    <code>* Entrar Higher quando RSI > 70, * Entrar Lower quando RSI < 30</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Entradas simultâneas</strong>
                                    <code>* Entrar Higher e Lower quando preço > SMA 20 e RSI > 50</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Combinação complexa</strong>
                                    <code>* Entrar quando ultimo digito > 7 e RSI > 60, * Entrar quando SMA 10 > SMA 20</code>
                                </div>
                            </div>
                        </div>

                        <div class="example-category">
                            <h3>🎲 Estratégias Combinadas</h3>
                            <div class="example-items">
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Dígito + RSI</strong>
                                    <code>* Entrar quando ultimo digito é par e RSI > 50</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Preço + Percentual</strong>
                                    <code>* Entrar quando preço > 1.2400 e variação % > 0.3%</code>
                                </div>
                                <div class="example-item" onclick="MonitoringView.useExample(this)">
                                    <strong>Múltiplas condições</strong>
                                    <code>* Entrar quando RSI > 70 e SMA(10) > SMA(20) e ultimo digito > 5</code>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div class="examples-footer">
                        <p class="examples-disclaimer">
                            💡 <strong>Dica:</strong> Clique em qualquer exemplo para aplicá-lo automaticamente ao campo de estratégia.
                            Você pode modificar e combinar as regras conforme necessário.
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Adicionar estilos se não existirem
        this.addExamplesStyles();

        document.body.appendChild(modal);

        // Animar entrada
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // Usar exemplo selecionado
    static useExample(element) {

        try {
            const codeElement = element.querySelector('code');
            if (!codeElement) {
                console.error('❌ [useExample] Elemento <code> não encontrado');
                return;
            }

            const exampleCode = codeElement.textContent.trim();

            const strategyTextArea = CommonHelpers.getElement('strategy-text');

            if (strategyTextArea) {
                strategyTextArea.value = exampleCode;
                strategyTextArea.dispatchEvent(new Event('input')); // Trigger save

                if (window.StrategyExamplesData && window.regrasJsonManager) {

                    window.regrasJsonManager.clearCachedGeminiJson();
                    this.configModeRules = null;
                    this.currentTranslatedRules = null;

                    const exampleJson = window.StrategyExamplesData.getExampleByRuleText(exampleCode);

                    if (exampleJson) {

                        // 1. Injetar no cache do RegrasJsonManager
                        window.regrasJsonManager.saveCachedTranslation(exampleCode, exampleJson);

                        // Clonar para evitar mutação do original
                        this.configModeRules = JSON.parse(JSON.stringify(exampleJson));
                        this.configModeRules.originalText = exampleCode;

                        // 3. Forçar atualização da UI de parâmetros se estiver visível
                        const configContainer = document.getElementById('config-mode-container');
                        if (configContainer && configContainer.classList.contains('active')) {
                            this.renderParametersUI(this.configModeRules.parameters);
                        }
                    }
                }

                // Fechar modal
                document.querySelector('.examples-modal')?.remove();

                // Scroll para o campo de estratégia
                strategyTextArea.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Destacar brevemente o campo
                strategyTextArea.style.border = '2px solid #28a745';
                setTimeout(() => {
                    strategyTextArea.style.border = '';
                }, 2000);

                // Mostrar feedback
                this.showExampleAppliedFeedback();
            }
        } catch (error) {
            CommonHelpers.showError('❌ Erro ao aplicar exemplo:', error);
        }
    }

    // Mostrar feedback de exemplo aplicado
    static showExampleAppliedFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'example-feedback';
        feedback.innerHTML = '✅ Exemplo aplicado com sucesso!';
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            font-weight: bold;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(feedback);

        // Remover após 3 segundos
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }

    // Aplicar estilos dos botões do header imediatamente
    static applyHeaderButtonStyles() {

        // Apenas garantir que os elementos existam
        const rulesHistoryBtn = CommonHelpers.getElement('rules-history-btn');
        const examplesBtn = CommonHelpers.getElement('examples-btn');
        const suggestionsBtn = CommonHelpers.getElement('suggestions-btn');


    }

    // Adicionar estilos para modal de exemplos
    static addExamplesStyles() {
        if (CommonHelpers.getElement('examples-styles', true)) return;

        const style = document.createElement('style');
        style.id = 'examples-styles';
        style.textContent = `
            .examples-btn {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 0.9em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-right: 10px;
                box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
            }

            .examples-btn:hover {
                background: linear-gradient(135deg, #20c997, #17a2b8);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
            }

            .examples-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                overflow-y: auto;
                padding: 20px;
                box-sizing: border-box;
            }

            .examples-modal.show {
                opacity: 1;
            }

            .examples-modal-content {
                background: #2c3e50;
                border-radius: 15px;
                width: 100%;
                max-width: 1000px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: modalFadeIn 0.3s ease-out;
                overflow: hidden;
            }

            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .examples-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 25px 30px;
                border-bottom: 2px solid #e9ecef;
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
            }

            .examples-modal-header h2 {
                margin: 0;
                font-size: 1.8em;
                font-weight: bold;
            }

            .examples-close-btn {
                font-size: 28px;
                font-weight: bold;
                color: white;
                cursor: pointer;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s ease;
                background: rgba(255,255,255,0.1);
                border: none;
            }

            .examples-close-btn:hover {
                background: rgba(255,255,255,0.2);
                transform: scale(1.1);
            }

            .examples-modal-body {
                padding: 30px;
                overflow-y: auto;
                flex: 1;
            }

            .examples-categories {
                display: grid;
                gap: 25px;
            }

            .example-category {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                border-left: 4px solid #28a745;
            }

            .example-category h3 {
                color: #28a745;
                margin: 0 0 15px 0;
                font-size: 1.3em;
                font-weight: bold;
            }

            .example-items {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 15px;
            }

            .example-item {
                background: #2c3e50;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #dee2e6;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .example-item:hover {
                border-color: #28a745;
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.15);
                transform: translateY(-2px);
            }

            .example-item strong {
                display: block;
                border-left: 3px solid #28a745;
                word-wrap: break-word;
            }

            .examples-footer {
                margin-top: 20px;
                padding: 20px;
                background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
                border-radius: 12px;
                text-align: center;
            }

            .examples-disclaimer {
                margin: 0;
                color: #495057;
                line-height: 1.5;
                font-size: 1em;
            }

            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .examples-modal-content {
                    margin: 10px;
                    max-height: 95vh;
                }

                .examples-modal-header {
                    padding: 20px;
                }

                .examples-modal-header h2 {
                    font-size: 1.5em;
                }

                .examples-modal-body {
                    padding: 20px;
                }

                .example-items {
                    grid-template-columns: 1fr;
                }

                .examples-btn {
                    padding: 6px 12px;
                    font-size: 0.8em;
                    margin-right: 8px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Adicionar estilos para os modals
    static addSuggestionsStyles() {
        if (CommonHelpers.getElement('suggestions-styles', true)) return;

        const style = document.createElement('style');
        style.id = 'suggestions-styles';
        style.textContent = `
            .suggestions-btn {
                background: linear-gradient(135deg, #4a9eff, #74b9ff);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 0.9em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-left: 15px;
                box-shadow: 0 2px 8px rgba(74, 158, 255, 0.3);
            }

            .suggestions-btn:hover {
                background: linear-gradient(135deg, #74b9ff, #0984e3);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(74, 158, 255, 0.4);
            }

            .block-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #e0e0e0;
            }

            .vip-upgrade-buttons {
                display: flex;
                gap: 10px;
                margin-top: 15px;
                justify-content: center;
            }

            .vip-upgrade-button-popup {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #000;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .vip-upgrade-button-popup:hover {
                background: linear-gradient(135deg, #ffed4e, #ffc107);
                transform: translateY(-1px);
            }

            /* Estilos para os modals já existem no sistema IA, mas garantindo compatibilidade */
            .ia-suggestions-modal, .ia-error-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000000;
                overflow-y: auto;
            }

            .ia-error-content {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border-radius: 15px;
                padding: 30px;
                text-align: center;
                border: 2px solid #4a9eff;
                min-width: 300px;
                max-width: 500px;
            }

            .ia-error-icon {
                font-size: 3em;
                margin-bottom: 15px;
            }

            .ia-error-content h2 {
                color: #4a9eff;
                margin: 0 0 15px 0;
            }

            .ia-error-content p {
                color: #e0e0e0;
                margin: 0 0 20px 0;
                line-height: 1.4;
            }

            .ia-error-content button {
                background: #ff6b6b;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
            }

            .group-config-separator {
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
                margin: 5px 0;
            }
            .group-config-item {
                display: block;
                padding: 4px 8px;
                cursor: pointer;
                color: #b0bec5;
                font-size: 0.9em;
                transition: background 0.2s;
                white-space: nowrap; /* Evitar quebra de linha */
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .group-config-item:hover {
                background: rgba(255, 255, 255, 0.05);
                color: #fff;
            }
            .group-config-item input[type="checkbox"] {
                margin-right: 8px;
                appearance: none;
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border: 1px solid #666;
                border-radius: 3px;
                vertical-align: middle;
                position: relative;
                top: -1px;
                cursor: pointer;
                background-color: #333;
            }
            .group-config-item input[type="checkbox"]:checked {
                background-color: #28a745;
                border-color: #28a745;
            }
            .group-config-item input[type="checkbox"]:checked::before {
                content: '✔';
                display: block;
                color: white;
                font-size: 12px;
                line-height: 14px;
                text-align: center;
            }

            .no-suggestions-buttons {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 20px;
            }

            .close-modal-btn {
                background: linear-gradient(135deg, #6c757d, #5a6268) !important;
            }

            .vip-upgrade-btn {
                background: linear-gradient(135deg, #ffd700, #ffed4e) !important;
                color: #000 !important;
            }

            .ia-generate-btn {
                background: linear-gradient(135deg, #4a9eff, #74b9ff) !important;
            }

            .no-suggestions-buttons button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            }

            @media (min-width: 600px) {
                .no-suggestions-buttons {
                    flex-direction: row;
                    justify-content: center;
                }
            }

            .ia-error-content button:hover {
                background: #74b9ff;
            }
        `;

        document.head.appendChild(style);
    }

    // Salvar estratégia automaticamente
    static saveStrategy() {
        const strategyText = CommonHelpers.getElement('strategy-text');
        if (strategyText) {
            const sessionId = SessionManager.getUserSessionId();
            localStorage.setItem(`monitoring_strategy_${sessionId}`, strategyText.value);
        }
    }

    static loadSavedStrategy() {
        const strategyText = CommonHelpers.getElement('strategy-text');
        if (strategyText) {
            const sessionId = SessionManager.getUserSessionId();
            const savedStrategy = localStorage.getItem(`monitoring_strategy_${sessionId}`);
            if (savedStrategy) {
                strategyText.value = savedStrategy;
            } else {

                strategyText.value = "";

            }
        }
    }

    // 1. Atualizar apenas status dos botões de monitoramento
    static updateMonitoringStatus(isActive) {
        // ✅ CORREÇÃO: Buscar TODOS os botões (caso haja duplicatas) e atualizar todos
        const startBtns = document.querySelectorAll('#start-monitoring-btn');
        const stopBtns = document.querySelectorAll('#stop-monitoring-btn');

        // Atualizar TODOS os botões encontrados
        startBtns.forEach(startBtn => {
            if (isActive) {
                CommonHelpers.disableButton(startBtn);
                startBtn.title = 'Monitoramento Ativo';
            } else {
                CommonHelpers.enableButton(startBtn);
                startBtn.title = 'Iniciar Monitoramento';
            }
        });

        stopBtns.forEach(stopBtn => {
            if (isActive) {
                CommonHelpers.enableButton(stopBtn);
                stopBtn.title = 'Parar Monitoramento';
            } else {
                CommonHelpers.disableButton(stopBtn);
                stopBtn.title = 'Parar Monitoramento';
            }
        });
    }

    static updateExecutionTime(timeString) {
        const executionTimeElement = CommonHelpers.getElement('execution-time');
        if (executionTimeElement) {
            executionTimeElement.textContent = timeString;
        }
    }

    static updateAlertsCount(count) {
        const alertsCountElement = CommonHelpers.getElement('alerts-count');
        if (alertsCountElement) {
            alertsCountElement.textContent = count.toString();
        }
    }

    static updateLastCheck(timeString) {
        const lastCheckElement = CommonHelpers.getElement('last-check');
        if (lastCheckElement) {
            lastCheckElement.textContent = timeString;
        }
    }

    static updateGeminiVersion(versionName) {
        const geminiVersionElement = CommonHelpers.getElement('gemini-version');
        if (geminiVersionElement) {
            geminiVersionElement.textContent = versionName;
        }
    }

    static setupAutoAsterisk(textArea) {

    }

    // Obter índice da linha atual baseado na posição do cursor
    static getCurrentLineIndex(text, cursorPosition) {
        const beforeCursor = text.substring(0, cursorPosition);
        return beforeCursor.split('\n').length - 1;
    }

    // Obter posição do início da linha atual
    static getLineStartPosition(text, cursorPosition) {
        const beforeCursor = text.substring(0, cursorPosition);
        const lastNewlineIndex = beforeCursor.lastIndexOf('\n');
        return lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;
    }

    static setupRuleOrganizer(textArea) {
        // Listener para quando o usuário cola conteúdo
        textArea.addEventListener('paste', (e) => {
            // Aguardar o conteúdo ser colado
            setTimeout(() => {
                const organizedText = this.organizeRules(textArea.value);
                if (organizedText !== textArea.value) {
                    const cursorPosition = textArea.selectionStart;
                    textArea.value = organizedText;

                    // Tentar manter cursor em posição similar
                    const newCursorPosition = Math.min(cursorPosition, organizedText.length);
                    textArea.setSelectionRange(newCursorPosition, newCursorPosition);

                }
            }, 50);
        });

        // Listener para quando o usuário para de digitar (debounce)
        let organizeTimeout;
        let lastUserInputTime = 0;

        textArea.addEventListener('input', (e) => {
            lastUserInputTime = Date.now();
            clearTimeout(organizeTimeout);

            // Só organizar se não foi uma simples adição de espaço no final
            const isSimpleSpaceAddition = e.inputType === 'insertText' && e.data === ' ';

            organizeTimeout = setTimeout(() => {
                // Verificar se ainda está digitando (usuário adicionou algo recentemente)
                const timeSinceLastInput = Date.now() - lastUserInputTime;
                if (timeSinceLastInput < 800) {
                    return; // Ainda está digitando, não organizar
                }

                const cursorPosition = textArea.selectionStart;
                const textBeforeCursor = textArea.value.substring(0, cursorPosition);
                const textAfterCursor = textArea.value.substring(cursorPosition);

                if (textBeforeCursor.endsWith(' ') && textAfterCursor.length > 0 && !textAfterCursor.startsWith('\n')) {
                    return;
                }

                const organizedText = this.organizeRules(textArea.value);
                if (organizedText !== textArea.value) {
                    textArea.value = organizedText;

                    // Manter cursor em posição similar
                    const newCursorPosition = Math.min(cursorPosition, organizedText.length);
                    textArea.setSelectionRange(newCursorPosition, newCursorPosition);
                }
            }, 2000);
        });
    }

    static organizeRules(text) {
        if (!text || !text.trim()) {
            return text;
        }

        try {
            // Dividir por asteriscos para encontrar grupos de regras
            const parts = text.split('*').filter(part => part.trim());

            if (parts.length === 0) {
                return text;
            }

            // Reorganizar cada parte como uma regra
            const organizedRules = parts.map(part => {
                const cleaned = part.trim();
                return cleaned ? `* ${cleaned}` : '';
            }).filter(rule => rule);

            // Juntar com quebras de linha
            const organized = organizedRules.join('\n');


            return organized;

        } catch (error) {
            CommonHelpers.showError('❌ [RULE ORGANIZER] Erro ao organizar regras:', error);
            return text; // Retornar texto original em caso de erro
        }
    }

    // Validar estratégia básica
    static validateStrategy(strategyTextElement) {
        const strategyValue = strategyTextElement.value;

        if (!strategyValue || !strategyValue.trim()) {
            return {
                isValid: false,
                errors: ['Estratégia não pode estar vazia']
            };
        }

        // Verificar se tem pelo menos uma regra (linha com *)
        const hasRules = strategyValue.split('\n').some(line =>
            line.trim().startsWith('*') && line.trim().length > 1
        );

        if (!hasRules) {
            return {
                isValid: false,
                errors: ['Estratégia deve conter pelo menos uma regra iniciada com *']
            };
        }

        return {
            isValid: true,
            errors: []
        };
    }

    // Resetar contadores
    resetCounters() {
        this.realWinsStreak = 0;
        this.realLossesStreak = 0;
        this.simulatedLossesStreak = 0;

    }

    // Validar configurações obrigatórias
    static validateRequiredConfigurations() {
        const missingFields = [];

        // Verificar campos obrigatórios
        const requiredFields = [
            { id: 'duration-input', name: 'Duração', type: 'number' },
            { id: 'stake-input', name: 'Valor de Entrada', type: 'number' },
            { id: 'symbol-select', name: 'Símbolo', type: 'select' },
            { id: 'contract-select', name: 'Tipo de Contrato', type: 'select' },
            { id: 'trade-type-select', name: 'Tipo Trade', type: 'select' }
        ];

        requiredFields.forEach(field => {
            const element = CommonHelpers.getElement(field.id);
            if (!element) return;

            let isEmpty = false;
            let value = null;

            if (field.type === 'number') {
                value = parseFloat(element.value);
                isEmpty = isNaN(value) || value <= 0 || element.value.trim() === '';
            } else if (field.type === 'select') {
                value = element.value;
                isEmpty = !value || value.trim() === '';
            } else {
                value = element.value;
                isEmpty = !value || value.trim() === '';
            }

            if (isEmpty) {
                missingFields.push({
                    id: field.id,
                    name: field.name,
                    element: element
                });
            }
        });

        const contractSelect = CommonHelpers.getElement('contract-select');
        if (contractSelect && contractSelect.value && contractSelect.value.startsWith('DIGIT')) {
            // Contratos que NÃO precisam de previsão
            const contractsWithoutPrediction = ['DIGITEVEN', 'DIGITODD'];

            if (!contractsWithoutPrediction.includes(contractSelect.value)) {
                const predictionInput = CommonHelpers.getElement('prediction-input');
                if (predictionInput) {
                    const predictionValue = parseInt(predictionInput.value);
                    if (isNaN(predictionValue) || predictionInput.value.trim() === '') {
                        missingFields.push({
                            id: 'prediction-input',
                            name: 'Previsão',
                            element: predictionInput
                        });
                    }
                }
            }
        }

        return {
            isValid: missingFields.length === 0,
            missingFields: missingFields
        };
    }

    // Adicionar listener para botão de limpar mensagens
    static attachClearMessagesListener() {
        const clearBtn = CommonHelpers.getElement('clear-messages-btn');
        if (clearBtn && !clearBtn.hasAttribute('data-listener-attached')) {
            clearBtn.setAttribute('data-listener-attached', 'true');

            clearBtn.addEventListener('click', () => {

                // 🎯 CRÍTICO: LIMPAR MEMÓRIA PRIMEIRO - Chamar TradeMessagesManager
                try {
                    if (typeof getTradeMessagesInstance === 'function') {
                        const messagesManager = getTradeMessagesInstance();
                        if (messagesManager && typeof messagesManager.clearMessages === 'function') {

                            messagesManager.clearMessages();

                        } else {
                        }
                    }
                } catch (error) {
                }

                // 🧹 Limpar display visual (redundante, mas garante)
                const messagesList = CommonHelpers.getElement('messages-list');
                if (messagesList) {
                    messagesList.innerHTML = '<div class="no-messages">Nenhum trade executado ainda</div>';
                }

                // 🔢 Zerar contadores de histórico no TradeManager
                try {
                    const tradeManager = getTradeManagerInstance();
                    if (tradeManager && typeof tradeManager.clearHistoryCounters === 'function') {
                        tradeManager.clearHistoryCounters();

                    }
                } catch (error) {
                }

                // 📢 Disparar evento para outros sistemas
                document.dispatchEvent(new Event('messagesCleared'));

            });
        }
    }

    // Mostrar alerta de configuração para campos obrigatórios
    static showConfigurationAlert(missingFields) {
        missingFields.forEach(field => {
            const element = field.element;

            // Destacar campo com borda vermelha
            element.style.boxShadow = '0 0 0 2px #dc2626';
            element.style.borderColor = '#dc2626';
            element.classList.add('config-alert-field');

            // Adicionar ícone de alerta
            if (!element.parentElement.querySelector('.config-alert-icon')) {
                const alertIcon = document.createElement('span');
                alertIcon.className = 'config-alert-icon';
                alertIcon.innerHTML = '⚠️';
                alertIcon.style.cssText = `
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #dc2626;
                    font-size: 1.2em;
                    pointer-events: none;
                `;

                if (element.parentElement.style.position !== 'relative') {
                    element.parentElement.style.position = 'relative';
                }

                element.parentElement.appendChild(alertIcon);
            }
        });

        // Mostrar mensagem de alerta
        const fieldNames = missingFields.map(f => f.name).join(', ');
        alert(`Por favor, preencha os seguintes campos obrigatórios: ${fieldNames}`);

        // Focar no primeiro campo com problema
        if (missingFields.length > 0) {
            missingFields[0].element.focus();
        }
    }

    // Mostrar alerta de estratégia vazia
    static showStrategyAlert(strategyElement) {
        if (strategyElement) {
            strategyElement.style.border = '2px solid #fbbf24';
            strategyElement.focus();

            setTimeout(() => {
                strategyElement.style.border = '';
            }, 5000);
        }
    }

    // Mostrar alerta de valor mínimo de entrada
    static showMinimumStakeAlert(stakeInput, currentValue) {
        stakeInput.style.boxShadow = '0 0 0 3px rgba(255, 193, 7, 0.6)';
        stakeInput.style.borderColor = '#ffc107';
        stakeInput.classList.add('stake-alert-field');

        // Adicionar ícone 👈 ao lado do campo
        const parentElement = stakeInput.parentElement;
        if (parentElement) {
            let alertIcon = parentElement.querySelector('.stake-alert-icon');
            if (!alertIcon) {
                alertIcon = document.createElement('span');
                alertIcon.className = 'stake-alert-icon';
                alertIcon.innerHTML = ' 👈';
                alertIcon.style.cssText = `
                    color: #ff6b35;
                    font-weight: bold;
                    margin-left: 8px;
                    animation: pulse 1.5s infinite;
                    position: absolute;
                    margin-top: 5px;
                `;

                // Inserir o ícone após o campo
                stakeInput.parentNode.insertBefore(alertIcon, stakeInput.nextSibling);
            }
        }

        // Criar popup centralizado
        const popup = document.createElement('div');
        popup.className = 'minimum-stake-popup';
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
                background: #2c3e50;
                padding: 30px;
                border-radius: 15px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                border: 3px solid #ffc107;
            ">
                <h3 style="color: #e74c3c; margin-bottom: 20px; font-size: 1.8em;">
                    ⚠️ Valor de Entrada Inválido
                </h3>
                <p style="margin-bottom: 20px; line-height: 1.6; color: #333; font-size: 1.1em;">
                    O valor de entrada configurado é <strong>$${currentValue.toFixed(2)}</strong>, mas a Deriv exige um valor mínimo de <strong>$0.35</strong>.
                </p>
                <p style="margin-bottom: 25px; color: #666; font-size: 1em;">
                    Por favor, ajuste o "Valor de Entrada" para pelo menos $0.35 antes de iniciar o monitoramento.
                </p>
                <button onclick="MonitoringView.closeMinimumStakeAlert()" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1.1em;
                    transition: background 0.3s ease;
                    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
                " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
                    Entendi - Vou Ajustar
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        // Focar no campo de valor de entrada após fechar o popup
        popup.addEventListener('click', (e) => {
            if (e.target === popup || e.target.tagName === 'BUTTON') {
                stakeInput.focus();
                stakeInput.select();
            }
        });

        // Auto-remover após 15 segundos
        setTimeout(() => {
            if (popup && popup.parentNode) {
                popup.remove();
                this.clearStakeAlert();
            }
        }, 15000);

    }

    // Limpar alertas de stake
    static clearStakeAlert() {
        const stakeInput = CommonHelpers.getElement('stake-input');
        if (stakeInput) {
            // Remover estilos de alerta
            stakeInput.style.boxShadow = '';
            stakeInput.style.borderColor = '';
            stakeInput.classList.remove('stake-alert-field');

            // Remover ícone de alerta
            const parentElement = stakeInput.parentElement;
            if (parentElement) {
                const alertIcon = parentElement.querySelector('.stake-alert-icon');
                if (alertIcon) {
                    alertIcon.remove();
                }
            }
        }

        // Remover popup se existir
        const popup = document.querySelector('.minimum-stake-popup');
        if (popup) {
            popup.remove();
        }
    }

    // Fechar alerta de stake mínimo
    static closeMinimumStakeAlert() {
        const popup = document.querySelector('.minimum-stake-popup');
        if (popup) {
            popup.remove();
        }
        this.clearStakeAlert();
    }

    // 🔍 NOVO: Verificar se a regra atual tem JSON no histórico
    static checkForHistoricalJson(strategyText) {
        try {
            const sessionId = SessionManager.getUserSessionId();
            if (!sessionId) return null;

            // Buscar em todas as chaves de histórico do usuário atual
            const allKeys = Object.keys(localStorage);
            const userHistoryKeys = allKeys.filter(key =>
                key.startsWith('rules_history_') &&
                key.includes(sessionId.split('_')[0]) // Usar loginid para buscar
            );

            // Normalizar estratégia para comparação
            const normalizedStrategy = this.normalizeRuleForComparison(strategyText);

            for (const key of userHistoryKeys) {
                try {
                    const historyData = localStorage.getItem(key);
                    if (!historyData) continue;

                    const history = JSON.parse(historyData);
                    if (!Array.isArray(history)) continue;

                    // Procurar regra correspondente com JSON
                    for (const item of history) {
                        if (item.hasJson && item.geminiJson && item.rule) {

                            if (!item.geminiJson.parameters) continue;

                            const normalizedHistoryRule = this.normalizeRuleForComparison(item.rule);

                            // 🎯 Comparação simples de strings normalizadas
                            if (normalizedHistoryRule === normalizedStrategy) {
                                return item.geminiJson;
                            }
                        }
                    }
                } catch (error) {
                    CommonHelpers.showWarning('⚠️ [HISTORICAL CHECK] Erro ao verificar chave', key, error);
                }
            }

            return null;

        } catch (error) {
            CommonHelpers.showError('❌ [HISTORICAL CHECK] Erro ao verificar JSON histórico:', error);
            return null;
        }
    }

    // Remove acentos, espaços extras, mas preserva estrutura semântica
    static normalizeRuleForComparison(ruleText) {
        if (!ruleText) return '';

        return ruleText
            .toLowerCase()
            // Remover acentos
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            // Normalizar espaços (múltiplos espaços vira um só)
            .replace(/\s+/g, ' ')
            // Normalizar quebras de linha
            .replace(/\n+/g, '\n')
            // Remover espaços antes/depois de pontuação
            .replace(/\s*([,;:.])\s*/g, '$1')
            .trim();
    }

    // 🎯 NOVO: Extrair estrutura de grupos e regras do texto
    static extractRuleStructure(ruleText) {
        if (!ruleText) return { groups: [], totalRules: 0 };

        const normalized = this.normalizeRuleForComparison(ruleText);

        // Dividir por asterisco (cada linha com * é uma regra ou grupo)
        const lines = normalized.split('\n').filter(line => line.trim().startsWith('*'));

        // Contar grupos e regras
        const groups = [];
        let currentGroup = [];

        for (const line of lines) {
            const cleanLine = line.replace(/^\*\s*/, '').trim();
            if (!cleanLine) continue;

            currentGroup.push(cleanLine);
        }

        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        const totalRules = groups.reduce((sum, group) => sum + group.length, 0);

        return {
            groups,
            totalRules,
            normalized
        };
    }

    // 🎯 NOVO: Comparar duas regras estruturalmente
    static areRulesEqual(ruleText1, ruleText2) {
        try {
            // Extrair estruturas
            const struct1 = this.extractRuleStructure(ruleText1);
            const struct2 = this.extractRuleStructure(ruleText2);

            // 1. Comparar quantidade de grupos
            if (struct1.groups.length !== struct2.groups.length) {
                return false;
            }

            // 2. Comparar quantidade total de regras
            if (struct1.totalRules !== struct2.totalRules) {
                return false;
            }

            // 3. Comparar cada grupo
            for (let i = 0; i < struct1.groups.length; i++) {
                const group1 = struct1.groups[i];
                const group2 = struct2.groups[i];

                // 3.1. Comparar quantidade de regras no grupo
                if (group1.length !== group2.length) {
                    return false;
                }

                // 3.2. Comparar cada regra do grupo
                for (let j = 0; j < group1.length; j++) {
                    if (group1[j] !== group2[j]) {
                        return false;
                    }
                }
            }

            return true;

        } catch (error) {
            console.error('❌ [RULE COMPARISON] Erro ao comparar regras:', error);
            return false;
        }
    }

    // Traduzir com Gemini AI
    static async translateWithGemini(strategyValue) {
        const gemini = getGeminiInstance();
        return await gemini.translateStrategy(strategyValue);
    }

    // Mostrar mensagem de sucesso
    static showSuccess(message) {

        this.updateAIStatus(message);
    }

    // Mostrar erro
    static showError(message) {
        CommonHelpers.showError(`❌ ${message}`);
        this.updateAIStatus(`Erro: ${message}`);
        alert(message);
    }

    // Atualizar status geral
    static updateStatus(message) {
        this.updateAIStatus(message);
    }

    // Atualizar estado dos botões
    static updateButtonState(isMonitoring) {
        this.updateMonitoringStatus(isMonitoring);
    }

    // Adicionar listeners para campos de configuração
    static attachConfigurationListeners() {
        // Aguardar um pouco para garantir que os elementos estejam disponíveis
        setTimeout(() => {
            const configFields = [
                'duration-input',
                'stake-input',
                'symbol-select',
                'contract-select',
                'prediction-input',
                'trade-type-select' // Adicionado trade-type-select
            ];

            const stakeInput = CommonHelpers.getElement('stake-input');
            if (stakeInput) {
                const clearStakeAlert = () => {
                    const value = parseFloat(stakeInput.value);
                    if (!isNaN(value) && value >= 0.35) {
                        MonitoringView.clearStakeAlert();
                    }
                };

                stakeInput.addEventListener('input', clearStakeAlert);
                stakeInput.addEventListener('change', clearStakeAlert);
                stakeInput.addEventListener('blur', clearStakeAlert);
                stakeInput.addEventListener('keyup', clearStakeAlert);
            }

            configFields.forEach(fieldId => {
                const element = CommonHelpers.getElement(fieldId);
                if (element) {
                    // Função para limpar alertas
                    const clearAlert = () => {

                        const validation = MonitoringView.validateRequiredConfigurations();
                        const isFieldStillInvalid = validation.missingFields.some(f => f.id === fieldId);


                        if (typeof TradeManager !== 'undefined' && TradeManager.updateConfigurationFromUI) {
                            const tm = getTradeManagerInstance();
                            if (tm) tm.updateConfigurationFromUI();
                        }

                        if (!isFieldStillInvalid && element.classList.contains('config-alert-field')) {
                            // Remover alerta apenas deste campo se ele não esteja mais inválido
                            element.style.boxShadow = '';
                            element.style.borderColor = '';
                            element.classList.remove('config-alert-field');

                            // Remover ícone de alerta específico deste campo
                            const parentElement = element.parentElement;
                            if (parentElement) {
                                const alertIcon = parentElement.querySelector('.config-alert-icon');
                                if (alertIcon) {
                                    alertIcon.remove();
                                }
                            }
                        }
                    };

                    // Limpar alertas quando o usuário começar a digitar/selecionar
                    element.addEventListener('input', clearAlert);
                    element.addEventListener('change', clearAlert);
                    element.addEventListener('blur', clearAlert);
                    element.addEventListener('keyup', clearAlert);

                    // Para selects, também escutar evento 'change'
                    if (element.tagName === 'SELECT') {
                        element.addEventListener('change', clearAlert);
                    }

                    // Para o campo de previsão, verificar se permite valor 0
                    if (fieldId === 'prediction-input') {
                        // Sobrescrever a função clearAlert para campo de previsão
                        const clearPredictionAlert = () => {
                            const value = element.value.trim();
                            const numValue = parseInt(value);
                            // Para previsão, aceitar valores de 0 a 9
                            const hasValidValue = value !== '' && !isNaN(numValue) && numValue >= 0 && numValue <= 9;

                            if (hasValidValue && element.classList.contains('config-alert-field')) {
                                // Remover alerta apenas deste campo
                                element.style.boxShadow = '';
                                element.style.borderColor = '';
                                element.classList.remove('config-alert-field');

                                // Remover ícone de alerta específico deste campo
                                const parentElement = element.parentElement;
                                if (parentElement) {
                                    const alertIcon = parentElement.querySelector('.config-alert-icon');
                                    if (alertIcon) {
                                        alertIcon.remove();
                                    }
                                }
                            }
                        };

                        // Substituir os event listeners para previsão
                        element.removeEventListener('input', clearAlert);
                        element.removeEventListener('change', clearAlert);
                        element.removeEventListener('blur', clearAlert);
                        element.removeEventListener('keyup', clearAlert);

                        element.addEventListener('input', clearPredictionAlert);
                        element.addEventListener('change', clearPredictionAlert);
                        element.addEventListener('blur', clearPredictionAlert);
                        element.addEventListener('keyup', clearPredictionAlert);
                        element.addEventListener('paste', () => { setTimeout(clearPredictionAlert, 10); });

                        // Verificar imediatamente se já tem valor válido no carregamento
                        setTimeout(clearPredictionAlert, 100);
                    }
                }
            });
        }, 1000);
    }

    // 🔧 NOVO: Função para esconder overlay de cooldown
    static hideCooldownOverlay() {

        const containers = [
            document.querySelector('.rules-visual-container'),
            CommonHelpers.getElement('rules-visual-display'),
            CommonHelpers.getElement('rules-container'),
            document.querySelector('.strategy-rules-display')
        ];

        let overlaysRemoved = 0;
        containers.forEach(container => {
            if (container) {
                const overlays = container.querySelectorAll('.cooldown-overlay-modal, .cooldown-overlay, .cooldown-display');
                overlays.forEach(overlay => {
                    overlay.remove();
                    overlaysRemoved++;
                });
            }
        });

    }

    // 🔧 NOVO: Restaurar display de regras após cooldown
    static restoreRulesDisplay() {

        // Retomar atualizações visuais se houver regras traduzidas
        if (MonitoringView.currentTranslatedRules) {
            MonitoringView.displayStrategyRules(MonitoringView.currentTranslatedRules, false);
        }
    }

    // 🔧 NOVO: Retomar atualizações pausadas
    static resumeDisplayUpdates() {

        // Forçar atualização imediata das regras visuais
        if (MonitoringView.currentTranslatedRules) {

            this.displayStrategyRules(this.currentTranslatedRules, false);
        }


        this.updateRuleVisuals();

    }

    // 🔧 NOVO: Iniciar subscription unificada de ticks
    static async startUnifiedTickSubscription() {
        try {

            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            const tradeManager = getTradeManagerInstance();
            const config = tradeManager.getConfiguration();
            const symbol = config.symbol;


            if (!symbol) {
                CommonHelpers.showError('❌ [UNIFIED TICK] Nenhum ativo selecionado!');
                throw new Error('ERRO: Nenhum ativo selecionado. Recarregue a página.');
            }

            // Ensure market data is ready
            if (!marketData.isReady()) {

                await marketData.connect();
                // Wait a bit for connection and authorization
                await new Promise(resolve => setTimeout(resolve, 1000));

            }

            // Stop previous subscription if exists
            if (MonitoringView.mainTickUnsubscribe) {

                MonitoringView.mainTickUnsubscribe();
                MonitoringView.mainTickUnsubscribe = null;
            }


            MonitoringView.mainTickUnsubscribe = await marketData.subscribeToTicks(symbol, (tick) => {
                MonitoringView.handleUnifiedTick(tick);
            });


        } catch (error) {
            CommonHelpers.showWarning('⚠️ [UNIFIED TICK] Erro ao iniciar subscription:', error);
        }
    }

    // 🔧 NOVO: Handler unificado de ticks com FSM completo
    static handleUnifiedTick(tick) {
        // console.log('⚡ [MONITORING] handleUnifiedTick CALLED');
        try {
            // 🎯 FIX CRÍTICO: Extrair currentPrice do tick IMEDIATAMENTE (suporte a objeto e número)
            const currentPrice = (typeof tick === 'number') ? tick : (tick?.quote || tick?.price || tick?.ask);

            if (currentPrice === undefined || currentPrice === null) {
                console.warn('⚠️ [UNIFIED TICK] Tick sem preço válido:', tick);
                return; // ⛔ Retorno prematuro impedia execução de trades!
            }

            // 🎯 CONTADOR POR TICK: Resetar contador a cada novo tick
            const tradeManager = getTradeManagerInstance();
            if (tradeManager) {
                // Usar epoch do tick ou timestamp atual como identificador único
                const tickTimestamp = tick?.epoch || Date.now();
                tradeManager.resetTradesCounter(tickTimestamp);
            }

            // 🔍 LOG: Registrar último tick recebido (para debug de reconexão)
            if (!MonitoringView.lastTickLogTime || (Date.now() - MonitoringView.lastTickLogTime) > 30000) {

                MonitoringView.lastTickLogTime = Date.now();
            }

            // 🏥 DIAGNÓSTICO: Log consolidado de saúde a cada tick
            MonitoringView.logSystemHealthDiagnostic();

            // 1. SEMPRE processar cooldown primeiro (mais crítico)
            const cooldownState = getCooldownOverlayInstance().getCooldownState();

            if (cooldownState.active) {
                const tickResult = getCooldownOverlayInstance().processCooldownTick();

                if (tickResult.finished) {

                    // 🔓 Desbloquear previsão dinâmica
                    const tradeManager = getTradeManagerInstance();
                    if (tradeManager) {
                        tradeManager.predictionLocked = false;

                    }

                    // 🔓 CRÍTICO: Limpar isExecutingTrade quando cooldown termina
                    MonitoringView.isExecutingTrade = false;

                    // Cooldown terminou - alterar estado
                    MonitoringView.state = 'MONITORING';
                    MonitoringView.pendingCooldownStart = false;

                }

                return;
            }

            // 2. Verificar se deve iniciar cooldown pendente
            if (MonitoringView.pendingCooldownStart && !cooldownState.active) {
                // 🎯 VERIFICAR: Só ativar cooldown se período > 0
                const tradeManager = getTradeManagerInstance();
                const cooldownPeriod = tradeManager?.config?.cooldownPeriod || 0;

                if (cooldownPeriod > 0) {
                    // Ativar cooldown
                    getCooldownOverlayInstance().activateCooldown();

                    // Alterar estado
                    MonitoringView.state = 'COOLDOWN';
                    MonitoringView.pendingCooldownStart = false;
                } else {
                    // Período = 0, não ativar cooldown
                    MonitoringView.state = 'MONITORING';
                    MonitoringView.pendingCooldownStart = false;
                    MonitoringView.isExecutingTrade = false;
                }

                return;
            }


            // A. Preparar dependências - 🛡️ FIX: Acesso seguro a globais
            const getMarketData = window.getMarketDataInstance || getMarketDataInstance;
            const sessionMgr = window.SessionManager || SessionManager;
            const marketData = (typeof getMarketData === 'function' && sessionMgr) ? getMarketData(sessionMgr.getLocalToken()) : null;

            // tradeManager já foi declarado no início da função (linha ~7934)
            const config = tradeManager?.getConfiguration();

            // 🎯 CRÍTICO: Evitar processamento duplicado do mesmo tick (Key Unica)
            const dedupeKey = `${config?.symbol}_${currentPrice}`;
            if (MonitoringView.lastProcessedTickKey === dedupeKey && (Date.now() - MonitoringView.lastProcessingTime) < 500) {
                // console.warn('⚠️ [MONITORING] Tick duplicado ignorado.');
                return;
            }
            MonitoringView.lastProcessedTickKey = dedupeKey;
            MonitoringView.lastProcessingTime = Date.now();


            const now = Date.now();
            const isLocked = MonitoringView.lockTickPriceUntil && now < MonitoringView.lockTickPriceUntil;

            if (config?.symbol && marketData && !isLocked) {
                MonitoringView.lastTickPrice = currentPrice;
                MonitoringView.lastTickTime = Date.now();

                // 📸 SNAPSHOT DO ESTADO ANTERIOR (DELAY REAL)
                MonitoringView.stablePreviousStats = MonitoringView.calculateProbabilities(false);

                // 🎯 Atualizar histórico de probabilidades IMEDIATAMENTE
                if (currentPrice !== undefined && currentPrice !== null) {
                    MonitoringView.addTickToHistory(config.symbol, currentPrice);
                }
            }

            // Calculamos stats ATUAIS (para UI e Precisão) e SEGUROS (para Regras)
            const currentStats = MonitoringView.calculateProbabilities(false); // UI = Realtime
            let safeStats = MonitoringView.stablePreviousStats || MonitoringView.calculateProbabilities(true);

            // Atualizar Resolver com dados seguros
            if (safeStats && safeStats.sorted && typeof getProbabilityResolver === 'function') {
                const resolver = getProbabilityResolver();
                if (resolver.setSafeProbabilityData) {
                    resolver.setSafeProbabilityData(safeStats.sorted);
                } else {
                    resolver.updateProbabilityData(safeStats.sorted);
                }
            }

            // Isso agora roda SEMPRE, permitindo ver a "Precisão Teórica" antes de iniciar
            if (window.ProbabilityAccuracyManager && MonitoringView.lastTickPrice !== undefined) {
                const accManager = window.ProbabilityAccuracyManager.getInstance();

                // 1. Verificar resultado do tick anterior
                const lastDigitStr = MonitoringView.lastTickPrice.toString().slice(-1);
                const lastDigit = parseInt(lastDigitStr);
                accManager.updateOutcome(lastDigit);

                // 2. Registrar previsão futura
                if (currentStats && currentStats.sorted) {
                    accManager.recordPrediction(currentStats.sorted);
                }

                // 3. Atualizar Badge
                if (typeof MonitoringView.updateAccuracyBadgeV2 === 'function') {
                    MonitoringView.updateAccuracyBadgeV2(accManager.getAccuracy());
                }
            }

            // Atualizar resolver secundário se necessário
            if (currentStats && currentStats.sorted && typeof getProbabilityResolver === 'function') {
                getProbabilityResolver().updateProbabilityData(currentStats.sorted);
            }

            // C. Trading Ativo (Apenas se MONITORING)
            if (MonitoringView.state === 'MONITORING' && !MonitoringView.pendingStop) {
                // ✅ CORREÇÃO DELAY=0: Verificação condicional baseada em estado do contrato
                const tradeManager = getTradeManagerInstance();
                const cooldownPeriod = tradeManager?.config?.cooldownPeriod ?? 3;
                const hasActiveContract = tradeManager?.awaitingExpiration || false;

                // 2. cooldownPeriod = 0 MAS sem contrato ativo (permite primeiro trade)
                const shouldCheckRules = MonitoringView.currentTranslatedRules &&
                    (cooldownPeriod > 0 || !hasActiveContract);

                if (shouldCheckRules) {
                    MonitoringView.checkRulesForTrading(MonitoringView.currentTranslatedRules);
                }
            }

        } catch (error) {
            console.error('❌ Erro no handler de tick:', error);
        }
    }

    // 🎯 NOVO V2: Atualizar Barra de Precisão (Com Seletor de Referência)
    static updateAccuracyBadgeV2(accuracy) {
        // Armazenar para permitir redesenho ao mudar Top N
        this.lastAccuracyValue = accuracy;

        // 🧹 Limpar badge antigo (v1) se existir
        const oldBadge = document.getElementById('prob-accuracy-badge');
        if (oldBadge) oldBadge.remove();

        let wrapper = document.getElementById('prob-accuracy-wrapper');
        let progressBar = document.getElementById('prob-accuracy-bar');

        // Criar estrutura se não existir
        if (!wrapper) {
            let probContainer = document.querySelector('.probability-monitor-block');
            if (!probContainer) {
                const middleList = document.getElementById('prob-middle-list');
                if (middleList) probContainer = middleList.parentNode;
            }
            if (!probContainer) probContainer = document.querySelector('.probability-container');
            if (!probContainer) return;

            // Container principal para alinhar seletor e barra
            wrapper = document.createElement('div');
            wrapper.id = 'prob-accuracy-wrapper';
            wrapper.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                width: 90%;
                margin: 12px auto 5px auto;
                position: relative;
                z-index: 10;
            `;

            // 1. Seletor de Top N (Referência)
            const configContainer = document.createElement('div');
            configContainer.className = 'acc-config-container';
            configContainer.style.cssText = `
                position: relative;
                display: flex;
                align-items: center;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
                padding: 2px 7px;
                transition: all 0.2s ease;
                border: 1px solid rgba(255,255,255,0.1);
            `;

            const currentTopN = window.ProbabilityAccuracyManager ? window.ProbabilityAccuracyManager.getInstance().topN : 5;

            configContainer.innerHTML = `
                <div style="display: flex; align-items: center; pointer-events: none;">
                    <span style="font-size: 10px; color: #bdc3c7; margin-right: 4px; font-weight: bold;">TOP</span>
                    <span id="prob-accuracy-topn-display" style="color: #fff; font-size: 11px; font-weight: bold;">${currentTopN}</span>
                    <span style="font-size: 8px; margin-left: 4px; color: #3498db; opacity: 0.8;">▼</span>
                </div>
                <select id="prob-accuracy-topn-select" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                    z-index: 2;
                ">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}" ${n === currentTopN ? 'selected' : ''} style="background: #2c3e50; color: #fff;">${n}</option>`).join('')}
                </select>
            `;

            // Listener para mudar Top N
            configContainer.querySelector('select').addEventListener('change', (e) => {
                if (window.ProbabilityAccuracyManager) {
                    const val = parseInt(e.target.value);
                    window.ProbabilityAccuracyManager.getInstance().setTopN(val);

                    // Atualizar o número exibido visualmente
                    const display = configContainer.querySelector('#prob-accuracy-topn-display');
                    if (display) display.textContent = val;

                    // Forçar atualização do tooltip e barra
                    this.updateAccuracyBadgeV2(MonitoringView.lastAccuracyValue || 100);
                }
            });

            configContainer.addEventListener('mouseover', () => configContainer.style.background = 'rgba(255,255,255,0.1)');
            configContainer.addEventListener('mouseout', () => configContainer.style.background = 'rgba(255,255,255,0.05)');

            // 2. Barra de Progresso
            progressBar = document.createElement('div');
            progressBar.id = 'prob-accuracy-bar';
            progressBar.style.cssText = `
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                position: relative;
                overflow: hidden;
                cursor: help;
                transition: height 0.2s ease;
            `;

            const fill = document.createElement('div');
            fill.id = 'prob-accuracy-fill';
            fill.style.cssText = `
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%);
                border-radius: 3px;
                transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
            `;

            progressBar.appendChild(fill);
            wrapper.appendChild(configContainer);
            wrapper.appendChild(progressBar);
            probContainer.appendChild(wrapper);

            // Hover effect
            progressBar.addEventListener('mouseenter', () => progressBar.style.height = '8px');
            progressBar.addEventListener('mouseleave', () => progressBar.style.height = '6px');
        }

        // Atualizar largura da barra
        const fill = document.getElementById('prob-accuracy-fill');
        if (fill) {
            fill.style.width = `${accuracy}%`;
        }

        // Atualizar tooltip
        const currentTopN = window.ProbabilityAccuracyManager ? window.ProbabilityAccuracyManager.getInstance().topN : 5;
        wrapper.title = `Precisão da Probabilidade: ${accuracy.toFixed(1)}%\nCritério: Acerto se o último dígito estiver entre os ${currentTopN} de maior chance.\nJanela: Últimos 10 ticks.`;
    }

    // ✅ CORRIGIDO: Buscar proativamente dados históricos se necessário
    static async waitForHistoricalData() {
        return new Promise(async (resolve) => {
            // 🎯 VERIFICAÇÃO INICIAL: Se já tem dados suficientes, resolver imediatamente
            if (this.hasMinimumHistoricalData()) {
                resolve();
                return;
            }

            // 🔍 BUSCA PROATIVA: Buscar dados históricos da API
            try {
                const marketData = getMarketDataInstance(SessionManager.getLocalToken());
                const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');

                if (!marketData || !currentSymbol) {
                    resolve(); // Resolver mesmo assim para não travar
                    return;
                }

                // 🚀 BUSCAR 150 ticks históricos de uma vez (suficiente para RSI, SMA, etc)
                await marketData.getTicksHistoryFromAPI(currentSymbol, 150);

                // Aguardar um momento para processamento
                await new Promise(r => setTimeout(r, 500));

                // Verificar se agora temos dados suficientes
                if (this.hasMinimumHistoricalData()) {
                    resolve();
                    return;
                }
            } catch (error) {
                // Continuar para o modo de espera passiva como fallback
            }

            const checkData = () => {
                if (this.hasMinimumHistoricalData()) {
                    resolve();
                } else {
                    setTimeout(checkData, 1000);
                }
            };
            checkData();
        });
    }

    // Parar análise em tempo real
    stopRealTimeAnalysis() {
        // Parar todas as análises em andamento
        this.stopRealTimeRuleUpdates();

        // Parar indicadores de modo
        this.stopModeIndicatorUpdates();

        // Parar sistema de trading baseado em regras
        if (this.tradingRulesInterval) {
            clearInterval(this.tradingRulesInterval);
            this.tradingRulesInterval = null;
        }


        // Parar TradeManager
        const tradeManager = getTradeManagerInstance();
        tradeManager.stopMonitoring();

        this.currentTranslatedRules = null;

    }

    // 🛠️ UTILITÁRIOS HELPER - Consolidam operações duplicadas
    static _clearAllIntervals() {
        this.stopRealTimeRuleUpdates();
        this.stopModeIndicatorUpdates();
        if (this.tradingRulesInterval) {
            clearInterval(this.tradingRulesInterval);
            this.tradingRulesInterval = null;
        }
        if (this.mainTickUnsubscribe) {
            try {
                this.mainTickUnsubscribe();
                this.mainTickUnsubscribe = null;
            } catch (error) {
                CommonHelpers.showError('❌ Erro ao cancelar subscription:', error);
            }
        }

    }

    static _resetMonitoringState() {
        // ✅ Resetar cooldown via CooldownOverlay
        const cooldownOverlay = getCooldownOverlayInstance();
        cooldownOverlay.cooldownActive = false;
        cooldownOverlay.cooldownTicksRemaining = 0;

        // Isso evita que perdas/ganhos de sessões anteriores bloqueiem regras no início.
        this.lastTradeOutcome = null;

        this.pendingCooldownStart = false;
        this.state = 'IDLE';
        this._parametersApplied = false; // ✅ Resetar flag de parâmetros
        this.hideCooldownOverlay();
    }

    static _validatePreconditions() {
        const strategyText = CommonHelpers.getElement('strategy-text');
        const hasStrategy = strategyText && strategyText.value.trim();

        // Validações de compatibilidade só se TEM estratégia
        if (hasStrategy) {
            const validator = getRuleCompatibilityValidatorInstance();
            const compatibilityValidation = validator.validateStrategyContractCompatibility();
            if (!compatibilityValidation.isValid) {
                validator.showCompatibilityValidationPopup(compatibilityValidation);
                this._handleMonitoringFailure();
                return { isValid: false };
            }

            const bothModeValidation = validator.validateBothModeBeforeStart();
            if (!bothModeValidation.isValid) {
                validator.showBothModeIncompatibilityPopup(bothModeValidation);
                this._handleMonitoringFailure();
                return { isValid: false };
            }

            const validation = this.validateStrategy(strategyText);
            if (!validation.isValid) {
                this.showError(`Erro de validação: ${validation.errors.join(', ')}`);
                this._handleMonitoringFailure();
                return { isValid: false };
            }
        }

        const stakeInput = CommonHelpers.getElement('stake-input');
        if (stakeInput) {
            const stakeValue = parseFloat(stakeInput.value);
            if (isNaN(stakeValue) || stakeValue < 0.35) {
                this.showMinimumStakeAlert(stakeInput, stakeValue || 0);
                this._handleMonitoringFailure();
                return { isValid: false };
            }
        }

        return { isValid: true, strategyText };
    }

    static async _prepareExecutionContext() {
        getCooldownOverlayInstance().clearPreviousOverlay();
        this.updateMonitoringStatus(true);
        this.updateAIStatus('Carregando configurações...');

        const tradeManager = window.tradeManager || getTradeManagerInstance();
        if (tradeManager?.reloadConfigurationFromUI) {
            tradeManager.reloadConfigurationFromUI();
        }

        const gemini = getGeminiInstance();
        await gemini.loadApiKeyFromSecrets();

        if (!gemini.apiKey) {
            alert('API Key do Gemini não configurada. Verifique se GEMINI_API_KEY está definida nos Secrets.');
            this._handleMonitoringFailure();
            return { isValid: false };
        }

        this.updateGeminiVersion(gemini.getCurrentVersion().name);
        this.updateAIStatus('Processando estratégia...');

        return { isValid: true, gemini };
    }

    static _handleMonitoringFailure() {
        this.updateMonitoringStatus(false);
        this.updateAIStatus('Erro');
        if (typeof FooterManager !== 'undefined' && FooterManager.onMonitoringStopped) {
            FooterManager.onMonitoringStopped();
        }
    }

    static _preprocessStrategyForGemini(strategyValue) {

        if (!strategyValue || typeof strategyValue !== 'string') {
            console.warn('⚠️ [FILTRO] Entrada inválida');
            return { processedStrategy: strategyValue, corrections: [] };
        }

        // Dividir a estratégia em linhas
        const lines = strategyValue.split('\n');
        const processedLines = [];
        const corrections = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Verificar se a linha começa com asterisco (início de grupo)
            if (trimmedLine.startsWith('*')) {
                // Extrair o conteúdo após o asterisco
                const contentAfterAsterisk = trimmedLine.substring(1).trim();

                const startsWithEntrar = /^entrar\s+/i.test(contentAfterAsterisk);


                if (!startsWithEntrar && contentAfterAsterisk.length > 0) {
                    // Adicionar "Entrar quando..." após o asterisco
                    const indentation = line.match(/^\s*/)[0]; // Preservar indentação
                    const correctedLine = `${indentation}* Entrar quando ${contentAfterAsterisk}`;
                    processedLines.push(correctedLine);


                    // Registrar correção
                    corrections.push({
                        original: trimmedLine,
                        corrected: `* Entrar quando ${contentAfterAsterisk}`,
                        type: 'add_entrar_quando'
                    });
                } else {
                    // Manter linha original
                    processedLines.push(line);

                }
            } else {
                // Linha que não começa com asterisco, manter como está
                processedLines.push(line);

            }
        }

        const processedStrategy = processedLines.join('\n');

        return { processedStrategy, corrections };
    }

    static async _resolveTranslatedRules(strategyValue) {
        // 🛡️ [STOP SYNC] Verificar se já foi abortado antes de começar
        if (this.state !== 'INITIALIZING') return null;

        const regrasJsonManager = getRegrasJsonManagerInstance();
        let translatedRules = null;

        // 0. 🎯 PRIORIDADE MÁXIMA: Verificar se há JSON pré-carregado do template
        if (this.configModeRules && this.configModeRules.originalText === strategyValue) {

            translatedRules = JSON.parse(JSON.stringify(this.configModeRules)); // Clone
            this.showSuccess('⚡ Template carregado - monitoramento instantâneo!');
            return translatedRules;
        }

        // 1. JSON cached do histórico
        if (regrasJsonManager.hasCachedJson()) {
            translatedRules = regrasJsonManager.getCachedGeminiJson();
            this.showSuccess('⚡ JSON do histórico carregado - monitoramento instantâneo!');
            regrasJsonManager.clearCachedGeminiJson();
            return translatedRules;
        }

        // 2. Código único embutido
        const ruleCode = regrasJsonManager.extractRuleCodeFromText(strategyValue);
        if (ruleCode) {
            const jsonByCode = regrasJsonManager.getJsonByRuleCode(ruleCode);
            if (jsonByCode) {
                translatedRules = jsonByCode;
                this.showSuccess('⚡ JSON identificado pelo código da regra - monitoramento instantâneo!');
                return translatedRules;
            }
        }

        // 🛡️ FALLBACK INLINE ROBUSTO: Se o arquivo externo falhar, usamos esta definição local
        let StrategyData = window.StrategyExamplesData;
        if (StrategyData) {
            const predefinedJson = StrategyData.getExampleByRuleText(strategyValue);
            if (predefinedJson) {
                translatedRules = predefinedJson;
                this.showSuccess('⚡ Estratégia pré-definida encontrada - monitoramento instantâneo!');
                // Salvar no cache para futuras execuções
                await regrasJsonManager.saveCachedTranslation(strategyValue, predefinedJson);
                return translatedRules;
            }
        }

        // 4. Histórico
        const historicalJson = this.checkForHistoricalJson(strategyValue);
        if (historicalJson) {
            translatedRules = historicalJson;
            this.showSuccess('⚡ JSON do histórico encontrado - monitoramento instantâneo!');
            return translatedRules;
        }

        // 5. Cache de traduções
        const cachedTranslation = await regrasJsonManager.getCachedTranslation(strategyValue);
        if (cachedTranslation) {
            translatedRules = cachedTranslation;
            this.showSuccess('⚡ Tradução cached encontrada - monitoramento instantâneo!');
            return translatedRules;
        }

        // 6. Verificar nível do usuário e créditos
        const userLevel = UserLevelsManager.getCurrentUserLevel();
        const isAdmin = userLevel === UserLevelsManager.USER_LEVELS.ADMIN;
        const requiredCredits = CreditsManager.CREDIT_COSTS.GEMINI_TRANSLATION;

        if (!isAdmin) {
            const hasCredits = await CreditsManager.hasEnoughCredits(requiredCredits);

            if (!hasCredits) {
                this.updateMonitoringStatus(false);
                this.updateAIStatus('Créditos insuficientes');

                const currentCredits = await CreditsManager.getCurrentCredits();
                if (typeof ModalCreditos !== 'undefined') {
                    ModalCreditos.showCreditosInsuficientes(
                        requiredCredits,
                        currentCredits,
                        'Tradução de Estratégia com IA'
                    );
                }
                return null;
            }

            // Mostrar confirmação de débito
            const userConfirmed = await ModalCreditos.showCreditsConfirmationModal();
            if (!userConfirmed) {
                // 🔧 Restaurar botões de monitoramento
                this.updateMonitoringStatus(false);
                this.updateAIStatus('Cancelado');
                return null;
            }

            // 💰 DEBITAR AGORA (Momento da aceitação)
            try {
                this.updateAIStatus('Debitando crédito...');
                const gemini = getGeminiInstance();
                await gemini.manualDebit('Processamento de Regra (Confirmado)');
                this.isAlreadyPaid = true; // Flag memorizada para esta tradução
            } catch (debitError) {
                this.showError(`Falha no débito: ${debitError.message}`);
                this._handleMonitoringFailure();
                return null;
            }
        } else {
            this.isAlreadyPaid = false; // Admin não paga
        }

        // 7. ✅ NOVO: Validação pré-Gemini (APÓS confirmação do usuário)
        const validator = getGeminiStrategyValidatorInstance();
        const validationResult = validator.validate(strategyValue);

        // Se há problemas, mostrar modal de validação
        if (!validationResult.valid || validationResult.warnings.length > 0) {

            const modalResult = await StrategyValidationModal.show(validationResult, strategyValue);


            if (modalResult.action === 'cancel') {
                // 🔧 Restaurar botões de monitoramento
                this.updateMonitoringStatus(false);
                this.updateAIStatus('Cancelado');
                return null;
            }

            if (modalResult.action === 'edit') {
                // Usuário quer editar - focar no campo de estratégia
                const strategyInput = document.getElementById('strategy-text');
                if (strategyInput) {
                    strategyInput.focus();
                    strategyInput.select();
                }
                // 🔧 Restaurar botões de monitoramento
                this.updateMonitoringStatus(false);
                this.updateAIStatus('Aguardando edição');
                return null;
            }

        }

        // 9. Mostrar animação de tradução
        let animation;
        try {
            animation = getGeminiTranslationAnimation();
            if (animation) {

                animation.show();
            } else {
                console.error('❌ [DEBUG] getGeminiTranslationAnimation retornou null/undefined');
            }
        } catch (animError) {
            console.error('❌ [DEBUG] Erro ao manipular animação:', animError);
        }

        // 10. Tentar traduzir com Gemini (créditos já foram debitados)
        const gemini = getGeminiInstance();

        try {
            // 🧹 FIX: Limpar caches de memória ANTES da tradução para evitar "envenenamento"
            this.configModeRules = null;
            if (window.regrasJsonManager) {
                window.regrasJsonManager.clearCachedGeminiJson();
            }

            // Callback para atualização de progresso
            const onProgress = (percent, message) => {
                animation.updateProgress(percent, message);
            };

            translatedRules = await gemini.translateStrategy(strategyValue, onProgress, this.isAlreadyPaid);

            // 🛡️ [STOP SYNC] Verificar se foi interrompido durante a tradução da IA
            if (this._checkAbort()) {
                if (animation) animation.hide();
                return null;
            }

            if (translatedRules && translatedRules.groups) {
                // Preparar configuração limpa (padrão: tudo ativado)
                const resetConfig = {};
                translatedRules.groups.forEach((g, idx) => {
                    resetConfig[idx + 1] = {
                        initial: true,
                        winReal: true,
                        lossReal: true,
                        winSimulated: true,
                        lossSimulated: true
                    };
                });

                // Atualizar memória
                if (typeof MonitoringView !== 'undefined') {
                    MonitoringView.groupActivationConfig = resetConfig;
                }

                // Atualizar persistência (Session/LocalStorage)
                try {
                    const sessionId = SessionManager.getUserSessionId();
                    if (typeof SessionManager.saveSessionData === 'function') {
                        SessionManager.saveSessionData('group_activation_config', resetConfig);
                    } else if (typeof SessionManager.setSessionData === 'function') {
                        SessionManager.setSessionData('group_activation_config', resetConfig);
                    } else {
                        localStorage.setItem(`session_data_${sessionId}_group_activation_config`, JSON.stringify(resetConfig));
                    }
                    // Forçar atualização da UI se houver listeners
                    document.dispatchEvent(new CustomEvent('groupConfigUpdated'));
                } catch (e) {
                    console.warn('Erro ao resetar config de grupos:', e);
                }
            }

            // Salvar no cache
            regrasJsonManager.saveCachedTranslation(strategyValue, translatedRules);

            // Mostrar sucesso na animação
            animation.showSuccess('Tradução concluída com sucesso!');

            return translatedRules;

        } catch (error) {

            // Se tem dados de validação do Gemini, mostrar na animação com sugestões
            if (error.geminiValidationData) {
                const geminiError = error.geminiValidationData;

                // Construir mensagem de erro com sugestões
                let errorMsg = '❌ A IA não conseguiu traduzir sua estratégia\n\n';

                if (geminiError.issues && geminiError.issues.length > 0) {
                    errorMsg += '📋 Problemas encontrados:\n';
                    geminiError.issues.forEach(issue => {
                        errorMsg += `• ${issue}\n`;
                    });
                }

                if (geminiError.suggestions && geminiError.suggestions.length > 0) {
                    errorMsg += '\n💡 Sugestões:\n';
                    geminiError.suggestions.forEach(suggestion => {
                        errorMsg += `• ${suggestion}\n`;
                    });
                }

                // Mostrar erro na animação (não esconder, deixar visível)
                animation.showError(errorMsg);

                // 🛑 PARAR MONITORAMENTO e atualizar botões
                this.updateMonitoringStatus(false);
                this.updateAIStatus('Erro na tradução');
                if (typeof FooterManager !== 'undefined' && FooterManager.onMonitoringStopped) {
                    FooterManager.onMonitoringStopped();
                }

                // Não chamar throw error aqui, só logar
                return null;
            }

            // Para outros tipos de erro, mostrar mensagem genérica na animação
            animation.showError(`Erro na tradução: ${error.message}`);

            // 🛑 PARAR MONITORAMENTO e atualizar botões
            this.updateMonitoringStatus(false);
            this.updateAIStatus('Erro');
            if (typeof FooterManager !== 'undefined' && FooterManager.onMonitoringStopped) {
                FooterManager.onMonitoringStopped();
            }

            return null;
        }
    }

    // 🧹 NOVA FUNÇÃO: Limpar completamente o display de regras
    static _clearRulesDisplay() {
        try {
            // Limpar container de regras principal
            const rulesContainer = CommonHelpers.getElement('rules-container');
            if (rulesContainer) {
                rulesContainer.style.display = 'none';
                rulesContainer.innerHTML = '';

            }

            // Limpar bloco de visualização de regras no UI Manager
            const rulesDisplayBlock = CommonHelpers.getElement('rules-visual-display');
            if (rulesDisplayBlock) {
                rulesDisplayBlock.innerHTML = `
                    <div class="rules-placeholder">
                        <div class="waiting-chart-container">
                            <div class="waiting-bars">
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                            </div>
                            <div class="waiting-text">Aguardando Regras...</div>
                        </div>
                    </div>
                `;

            }

            // Disparar evento para garantir que UIManager também limpe
            window.dispatchEvent(new CustomEvent('rulesCleared', {
                detail: { reason: 'Novo monitoramento iniciado' }
            }));

            // Limpar dados cacheados de regras
            this.currentTranslatedRules = null;


        } catch (error) {
        }
    }

    // 🔧 NOVA FUNÇÃO: Parar TUDO - monitoramento, cooldown, overlays, subscriptions
    static stopAll() {
        try {

            MonitoringView.state = 'INTERRUPTED';

            this._clearAllIntervals();

            this._resetMonitoringState();

            const tradeManager = getTradeManagerInstance();
            if (tradeManager) {
                tradeManager.stopMonitoring();
                tradeManager.realWinsStreak = 0;
                tradeManager.realLossesStreak = 0;
                tradeManager.simulatedWinsStreak = 0;
                tradeManager.simulatedLossesStreak = 0;
                tradeManager.popupShown = false;

            }

            try {
                const startBtn = CommonHelpers.getElement('start-monitoring-btn');
                const stopBtn = CommonHelpers.getElement('stop-monitoring-btn');
                const statusText = CommonHelpers.getElement('monitoring-status-text');

                if (startBtn) {
                    startBtn.disabled = false;

                }

                if (stopBtn) {
                    stopBtn.disabled = true;

                }

                if (statusText) {
                    statusText.textContent = 'Status: Inativo';
                    statusText.className = 'status-inactive';

                }
            } catch (uiError) {
            }

            MonitoringView.updateMonitoringStatus(false);

            MonitoringView.updateAIStatus('Parado');

            const cooldownOverlay = getCooldownOverlayInstance();

        } catch (error) {
            console.groupEnd();
        }
    }

    // 🔧 NOVA FUNÇÃO: Limpar overlay anterior antes de iniciar novo monitoramento
    static clearPreviousOverlay() {

        // Buscar e remover overlays em todos os containers possíveis
        const containers = [
            document.querySelector('.rules-visual-container'),
            CommonHelpers.getElement('rules-visual-display'),
            CommonHelpers.getElement('rules-container'),
            document.querySelector('.strategy-rules-display'),
            document.body // Fallback para overlays soltos
        ];

        let overlaysRemoved = 0;
        containers.forEach(container => {
            if (container) {
                // Remover overlays de cooldown
                const cooldownOverlays = container.querySelectorAll('.cooldown-overlay-modal, .cooldown-overlay, .cooldown-display');
                cooldownOverlays.forEach(overlay => {
                    overlay.remove();
                    overlaysRemoved++;
                });
            }
        });

    }

    // 🔧 NOVA FUNÇÃO: Esconder overlay de cooldown modal
    static hideCooldownOverlay() {

        // Buscar overlay no container de regras primeiro (nova localização)
        const rulesContainer = CommonHelpers.getElement('rules-visual-display');
        if (rulesContainer) {
            const overlayModal = rulesContainer.querySelector('.cooldown-overlay-modal');
            if (overlayModal) {
                const overlayId = overlayModal.getAttribute('data-overlay-id');
                overlayModal.remove();

                return;
            }
        }

        // Fallback: remover do body (localização antiga) 
        const overlayModalBody = document.querySelector('.cooldown-overlay-modal');
        if (overlayModalBody) {
            overlayModalBody.remove();

        }

        // Também limpar qualquer overlay antigo no container (compatibilidade)
        if (rulesContainer) {
            const cooldownOverlay = rulesContainer.querySelector('.cooldown-overlay');
            if (cooldownOverlay) {
                cooldownOverlay.remove();

            }
        }

    }

    // 🔄 NOVO: Retomar atualizações do display após cooldown
    static resumeDisplayUpdates() {

        // Forçar uma atualização imediata das regras visuais
        if (this.currentTranslatedRules) {

            this.displayStrategyRules(this.currentTranslatedRules, false);
        }


        this.updateRuleVisuals();

    }

    // 🔧 NOVO: Iniciar subscription unificada de ticks
    static async startUnifiedTickSubscription() {

        try {
            const tradeManager = getTradeManagerInstance();
            const config = tradeManager.getConfiguration();

            // ✅ CRÍTICO: Buscar símbolo de múltiplas fontes em ordem de prioridade
            let symbol = config.symbol
                || window.selectedSymbol
                || SessionManager.getSessionData('selected_symbol')
                || MonitoringView.currentTranslatedRules?.groups?.[0]?.symbol;

            if (!symbol) {
                return;
            }

            const marketData = getMarketDataInstance(SessionManager.getLocalToken());

            if (!marketData.isReady()) {

                await marketData.connect();

                // Aguardar um pouco para garantir que a autorização seja completada
                let attempts = 0;
                while (!marketData.isReady() && attempts < 10) {

                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }

                if (!marketData.isReady()) {
                    throw new Error('Falha ao conectar e autorizar WebSocket após múltiplas tentativas');
                }
            }

            // Parar subscription anterior se existir
            if (MonitoringView.mainTickUnsubscribe) {
                MonitoringView.mainTickUnsubscribe();
                MonitoringView.mainTickUnsubscribe = null;
            }

            // Iniciar nova subscription unificada
            MonitoringView.mainTickUnsubscribe = await marketData.subscribeToTicks(symbol, (price) => {
                // Handler unificado que processa TUDO em um só lugar
                MonitoringView.handleUnifiedTick(price, { epoch: Date.now() });
            });

        } catch (error) {
            CommonHelpers.showError('❌ [UNIFIED TICKS] Erro ao iniciar subscription:', error);

            // Tentar reconectar em caso de erro

            setTimeout(async () => {
                try {
                    await MonitoringView.startUnifiedTickSubscription();
                } catch (retryError) {
                    CommonHelpers.showError('❌ [UNIFIED TICKS] Erro na tentativa de reconexão:', retryError);
                }
            }, 2000);
        }
    }

    static showMinimumStakeAlert(stakeInput, currentValue) {
        const alertHtml = `
            <div class="alert alert-warning">
                <h4>⚠️ Valor Mínimo de Stake</h4>
                <p>O valor mínimo para stake é <strong>$0.35</strong>.</p>
                <p>Valor atual: <strong>$${currentValue.toFixed(2)}</strong></p>
                <p>Por favor, ajuste o valor antes de continuar.</p>
                <div class="mt-3">
                    <button onclick="this.closest('.alert').remove()" class="btn btn-primary">Entendi</button>
                </div>
            </div>
        `;

        const alertContainer = document.createElement('div');
        alertContainer.innerHTML = alertHtml;
        alertContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;

        document.body.appendChild(alertContainer);

        if (stakeInput) {
            stakeInput.focus();
            stakeInput.select();
        }

        setTimeout(() => {
            if (alertContainer && alertContainer.parentNode) {
                alertContainer.remove();
            }
        }, 8000);
    }

    static showFreeUserGeminiAlert() {
        const alertHtml = `
            <div class="alert alert-info">
                <h4>🔒 Recurso Premium</h4>
                <p>A tradução automática com IA Gemini é um recurso <strong>Premium</strong>.</p>
                <p>Para usuários FREE, você pode:</p>
                <ul>
                    <li>Usar regras JSON já existentes no histórico</li>
                    <li>Fazer upgrade para VIP e ganhar créditos</li>
                    <li>Inserir código JSON manualmente</li>
                </ul>
                <div class="mt-3">
                    <button onclick="this.closest('.alert').remove()" class="btn btn-primary">Entendi</button>
                </div>
            </div>
        `;

        this._showAlert(alertHtml);
    }

    static showNoCreditsAlert() {
        const alertHtml = `
            <div class="alert alert-warning">
                <h4>💳 Sem Créditos</h4>
                <p>Você não possui créditos suficientes para usar a IA Gemini.</p>
                <p>Créditos necessários: <strong>1</strong></p>
                <p>Para obter mais créditos, considere fazer upgrade do seu plano.</p>
                <div class="mt-3">
                    <button onclick="this.closest('.alert').remove()" class="btn btn-primary">Entendi</button>
                </div>
            </div>
        `;

        this._showAlert(alertHtml);
    }

    static async showCreditsConfirmationModal() {
        return new Promise((resolve) => {
            const modalHtml = `
                <div class="modal fade" id="creditsConfirmModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">💳 Confirmar Uso de Créditos</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Esta operação irá consumir 1 crédito para traduzir a estratégia usando IA Gemini.</p>
                                <p>Deseja continuar?</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="cancelCredits">Cancelar</button>
                                <button type="button" class="btn btn-primary" id="confirmCredits">Confirmar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer);

            const modal = new bootstrap.Modal(document.getElementById('creditsConfirmModal'));

            document.getElementById('confirmCredits').onclick = () => {
                modal.hide();
                modalContainer.remove();
                resolve(true);
            };

            document.getElementById('cancelCredits').onclick = () => {
                modal.hide();
                modalContainer.remove();
                resolve(false);
            };

            modal.show();
        });
    }

    static _showAlert(alertHtml) {
        const alertContainer = document.createElement('div');
        alertContainer.innerHTML = alertHtml;
        alertContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;

        document.body.appendChild(alertContainer);

        setTimeout(() => {
            if (alertContainer && alertContainer.parentNode) {
                alertContainer.remove();
            }
        }, 10000);
    }


    static validateRiseFallContracts(selectedContract) {
        const riseFallContracts = ['CALL', 'PUT'];

        if (riseFallContracts.includes(selectedContract)) {
            // Rise/Fall não precisa de barreira nem previsão
            return {
                isValid: true,
                requiresBarrier: false,
                requiresPrediction: false
            };
        }

        return {
            isValid: true,
            requiresBarrier: true,
            requiresPrediction: false
        };
    }

    static validateTranslatedRules(translatedRules, originalStrategy) {
        const issues = [];
        let correctedStrategy = null;

        // 1. Verificar se a tradução resultou em um objeto válido
        if (!translatedRules || typeof translatedRules !== 'object' || !translatedRules.groups) {
            issues.push({
                type: 'INVALID_TRANSLATION',
                message: 'A tradução da estratégia resultou em um formato inválido.',
                original: originalStrategy,
                translated: translatedRules
            });
        } else {
            // 2. Verificar se há regras vazias ou malformadas dentro dos grupos
            translatedRules.groups.forEach((group, groupIndex) => {
                if (!group.rules || group.rules.length === 0) {
                    issues.push({
                        type: 'EMPTY_GROUP',
                        message: `O Grupo ${group.id} está vazio ou não contém regras válidas.`,
                        groupId: group.id,
                        groupIndex: groupIndex
                    });
                } else {
                    group.rules.forEach((rule, ruleIndex) => {
                        if (!rule || !rule.type || !rule.id) {
                            issues.push({
                                type: 'MALFORMED_RULE',
                                message: `A Regra ${rule?.id || ruleIndex + 1} no Grupo ${group.id} está malformada.`,
                                groupId: group.id,
                                ruleId: rule?.id,
                                ruleIndex: ruleIndex
                            });
                        }
                        // Adicionar outras verificações de regras específicas se necessário
                    });
                }
            });
        }

        // 3. Tentar gerar uma "estratégia corrigida" se houver problemas
        if (issues.length > 0) {

            correctedStrategy = originalStrategy; // Usar a original como padrão
        }

        return {
            isValid: issues.length === 0,
            issues: issues,
            correctedStrategy: correctedStrategy // Pode ser null ou uma estratégia modificada
        };
    }

    static highlightStrategyForCorrection(issues) {
        const strategyTextArea = CommonHelpers.getElement('strategy-text');
        if (strategyTextArea) {
            strategyTextArea.classList.add('strategy-correction-highlight');
            strategyTextArea.focus(); // Focar para o usuário ver a correção

            // Adicionar um aviso temporário
            const existingHighlight = document.querySelector('.strategy-correction-highlight-msg');
            if (existingHighlight) existingHighlight.remove();

            const msg = document.createElement('div');
            msg.className = 'strategy-correction-highlight-msg';
            msg.style.cssText = `
                position: absolute;
                bottom: -40px; /* Abaixo do textarea */
                left: 0;
                right: 0;
                background: rgba(231, 76, 60, 0.8); /* Vermelho suave */
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 0.9em;
                text-align: center;
                margin-top: 10px;
                z-index: 100;
            `;
            msg.textContent = 'Corrija os erros destacados na sua estratégia antes de continuar.';
            strategyTextArea.parentNode.appendChild(msg);

            // Remover a mensagem após alguns segundos
            setTimeout(() => {
                if (msg.parentNode) {
                    msg.remove();
                }
            }, 7000);

            // Remover a classe de destaque após um tempo maior
            setTimeout(() => {
                strategyTextArea.classList.remove('strategy-correction-highlight');
            }, 10000);
        }
    }


    // Função auxiliar para mostrar erro de tradução
    static showTranslationError(error, strategyValue) {
        const errorMessage = error.message || 'Erro desconhecido na tradução';

        // Remover popup simples que aparece no topo
        const existingPopup = document.querySelector('.translation-error-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Mostrar modal centralizado
        const modal = document.createElement('div');
        modal.className = 'translation-error-popup';
        modal.style.cssText = `
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

        modal.innerHTML = `
            <div style="
                background: #2c3e50;
                padding: 30px;
                border-radius: 15px;
                max-width: 600px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                border: 3px solid #dc3545;
            ">
                <h3 style="color: #dc3545; margin-bottom: 20px; font-size: 1.5em;">
                    ❌ Erro na Tradução da Estratégia
                </h3>
                <p style="margin-bottom: 20px; line-height: 1.6; color: #333; font-size: 1.1em;">
                    <strong>Erro encontrado:</strong><br>
                    ${errorMessage}
                </p>
                <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px; text-align: left;">
                    <strong>Estratégia que causou o erro:</strong><br>
                    <code style="color: #dc3545; font-size: 0.9em; display: block; margin-top: 10px; white-space: pre-wrap; word-break: break-word;">
                        ${strategyValue && strategyValue.length > 200 ? strategyValue.substring(0, 200) + '...' : strategyValue || 'Estratégia não informada'}
                    </code>
                </div>
                <p style="margin-bottom: 25px; color: #666; font-size: 1em;">
                    <strong>Sugestões:</strong><br>
                    • Verifique se a sintaxe das regras está correta<br>
                    • Use operadores válidos: >, <, =, >=, <=, !=<br>
                    • Valores de dígitos devem estar entre 0 e 9<br>
                    • Contagem de dígitos deve estar entre 1 e 50
                </p>
                <button onclick="this.closest('.translation-error-popup').remove()" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 24px;
                    font-size: 1em;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
                " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">
                    ✏️ Corrigir Estratégia
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Destacar campo de estratégia para correção
        const strategyTextArea = CommonHelpers.getElement('strategy-text');
        if (strategyTextArea) {
            setTimeout(() => {
                strategyTextArea.focus();
                strategyTextArea.style.border = '2px solid #dc2626';
                setTimeout(() => {
                    strategyTextArea.style.border = '';
                }, 5000);
            }, 500);
        }
    }

    // 🔍 Método para diagnosticar nível do usuário
    static debugUserLevel() {

        try {
            // Verificar se UserLevelsManager está carregado
            if (typeof UserLevelsManager === 'undefined') {
                return false;
            }

            // Verificar usuário atual
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                return false;
            }

            // Verificar nível do usuário
            const userLevel = UserLevelsManager.getCurrentUserLevel();

            // Verificar se tem acesso ao recurso
            const hasAccess = MonitoringView.isVipOrAdmin();

            // Verificar sugestões salvas
            const savedSuggestions = MonitoringView.getSavedSuggestions();
            if (savedSuggestions) {

            }

            return hasAccess;

        } catch (error) {
            return false;
        }
    }

    // 🔍 Verificar se usuário é VIP ou ADMIN
    static isVipOrAdmin() {
        try {
            if (typeof UserLevelsManager === 'undefined') {

                return false;
            }

            const userLevel = UserLevelsManager.getCurrentUserLevel();
            const isVipOrAdmin = userLevel === UserLevelsManager.USER_LEVELS.VIP ||
                userLevel === UserLevelsManager.USER_LEVELS.ADMIN;


            return isVipOrAdmin;
        } catch (error) {
            return false;
        }
    }

    // 📋 Mostrar mensagem quando não há sugestões
    static showNoSuggestionsMessage() {

        MonitoringView.showNoSuggestionsPopup();
    }

    // 📋 Exibir sugestões de forma simples (fallback)
    static displaySuggestionsSimple(savedData) {

        MonitoringView.displayPreviousSuggestions(savedData);
    }

    // 🎯 NOVO: Processar regras de previsão dinâmica
    processDynamicPredictionRules(rules) {
        try {
            const dynamicRules = rules.filter(rule => rule.type === 'dynamic_prediction');

            if (dynamicRules.length > 0) {

                // Atualizar indicador na interface
                const predictionInput = document.getElementById('prediction-input');
                if (predictionInput) {
                    predictionInput.placeholder = 'Previsão dinâmica ativa';
                    predictionInput.style.borderColor = '#28a745';
                    predictionInput.style.backgroundColor = '#f8fff9';

                    // Adicionar tooltip explicativo
                    predictionInput.title = 'Previsão será definida dinamicamente pelas regras';
                }

                // Adicionar indicador visual
                this.addDynamicPredictionIndicator(dynamicRules.length);
            }

        } catch (error) {
        }
    }

    // 🎯 NOVO: Adicionar indicador visual de previsão dinâmica
    addDynamicPredictionIndicator(rulesCount) {
        try {
            // Remover indicador anterior se existir
            const existingIndicator = document.getElementById('dynamic-prediction-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }

            // Criar novo indicador
            const indicator = document.createElement('div');
            indicator.id = 'dynamic-prediction-indicator';
            indicator.className = 'dynamic-prediction-indicator';
            indicator.innerHTML = `
                <span class="indicator-icon">🎯</span>
                <span class="indicator-text">Previsão Dinâmica (${rulesCount} regra${rulesCount > 1 ? 's' : ''})</span>
            `;
            indicator.style.cssText = `
                position: absolute;
                top: -25px;
                right: 0;
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: bold;
                z-index: 1000;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                animation: pulse 2s infinite;
            `;

            // Adicionar CSS da animação
            if (!document.getElementById('dynamic-prediction-styles')) {
                const style = document.createElement('style');
                style.id = 'dynamic-prediction-styles';
                style.textContent = `
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                        100% { transform: scale(1); }
                    }
                    .dynamic-prediction-indicator {
                        cursor: help;
                    }
                    .dynamic-prediction-indicator:hover {
                        transform: scale(1.1);
                        transition: transform 0.2s ease;
                    }
                `;
                document.head.appendChild(style);
            }

            // Adicionar ao container de configurações
            const configContainer = document.querySelector('.config-section');
            if (configContainer) {
                configContainer.style.position = 'relative';
                configContainer.appendChild(indicator);
            }

        } catch (error) {
        }
    }


    // 🎯 NOVO: Renderizar HTML do dropdown de configuração de grupo
    static renderGroupActivationDropdown(groupNum) {
        // Carregar configuração salva (ou padrão)
        if (!MonitoringView.groupActivationConfig) {
            MonitoringView.groupActivationConfig = MonitoringView.loadSavedGroupConfigs();
        }
        const config = this.loadGroupActivationConfig(groupNum);

        return `
            <div class="group-config-container">
                <div class="group-config-trigger" data-group="${groupNum}" title="Configurar ativação deste grupo">
                    <span style="font-size: 0.8em; margin-right: 5px;">▼</span> 
                </div>
                <div class="group-config-dropdown" id="group-config-dropdown-${groupNum}">
                    <div class="group-config-title">Ativar este grupo em:</div>
                    <div class="group-config-options">
                        <label class="group-config-item">
                        <input type="checkbox" class="group-activation-cb" data-group="${groupNum}" data-type="initial" ${config.initial ? 'checked' : ''}>
                        <span>🚀 Iniciar</span>
                    </label>
                    <div class="group-config-separator"></div>
                    <label class="group-config-item">
                        <input type="checkbox" class="group-activation-cb" data-group="${groupNum}" data-type="winReal" ${config.winReal ? 'checked' : ''}>
                        <span>Win Real</span>
                    </label>
                        <label class="group-config-item">
                            <input type="checkbox" class="group-activation-cb" data-group="${groupNum}" data-type="lossReal" ${config.lossReal ? 'checked' : ''}>
                            Loss Real
                        </label>
                        <label class="group-config-item">
                            <input type="checkbox" class="group-activation-cb" data-group="${groupNum}" data-type="winSimulated" ${config.winSimulated ? 'checked' : ''}>
                            Win Sim
                        </label>
                        <label class="group-config-item">
                            <input type="checkbox" class="group-activation-cb" data-group="${groupNum}" data-type="lossSimulated" ${config.lossSimulated ? 'checked' : ''}>
                            Loss Sim
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    // 🎯 NOVO: Configurar listeners do dropdown
    static setupGroupDropdownListeners() {
        // Toggle dropdown
        const triggers = document.querySelectorAll('.group-config-trigger');

        triggers.forEach(trigger => {
            // Remover listener antigo para evitar duplicidade
            const newTrigger = trigger.cloneNode(true);
            trigger.parentNode.replaceChild(newTrigger, trigger);

            newTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupNum = newTrigger.dataset.group;
                const dropdown = document.getElementById(`group-config-dropdown-${groupNum}`);

                // Fechar outros
                document.querySelectorAll('.group-config-dropdown.show').forEach(d => {
                    if (d.id !== `group-config-dropdown-${groupNum}`) d.classList.remove('show');
                });

                if (dropdown) dropdown.classList.toggle('show');
            });
        });

        // Fechar ao clicar fora (Apenas uma vez)
        if (!this._groupDropdownGlobalListenerAttached) {
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.group-config-container')) {
                    document.querySelectorAll('.group-config-dropdown.show').forEach(d => d.classList.remove('show'));
                }
            });
            this._groupDropdownGlobalListenerAttached = true;
        }

        // Salvar alterações
        const checkboxes = document.querySelectorAll('.group-config-options input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const groupNum = parseInt(e.target.dataset.group);
                const type = e.target.dataset.type;
                const isChecked = e.target.checked;
                this.saveGroupActivationConfig(groupNum, type, isChecked);
            });
        });
    }

    // 🎯 NOVO: Salvar configuração de ativação
    static saveGroupActivationConfig(groupNum, type, value) {
        try {
            groupNum = parseInt(groupNum);
            const getSessionData = (SessionManager.getSessionData && SessionManager.getSessionData.bind(SessionManager)) ||
                ((key) => { try { const sessionId = SessionManager.getUserSessionId(); return JSON.parse(localStorage.getItem(`session_data_${sessionId}_${key}`)); } catch (e) { return null; } });

            const currentConfig = getSessionData('group_activation_config') || {};

            if (!currentConfig[groupNum]) {
                currentConfig[groupNum] = {
                    initial: true,
                    winReal: true,
                    winSimulated: true,
                    lossReal: true,
                    lossSimulated: true
                };
            }

            currentConfig[groupNum][type] = value;

            if (typeof SessionManager.saveSessionData === 'function') {
                SessionManager.saveSessionData('group_activation_config', currentConfig);
            } else if (typeof SessionManager.setSessionData === 'function') {
                SessionManager.setSessionData('group_activation_config', currentConfig);
            } else {
                const sessionId = SessionManager.getUserSessionId();
                localStorage.setItem(`session_data_${sessionId}_group_activation_config`, JSON.stringify(currentConfig));
            }
            MonitoringView.groupActivationConfig = currentConfig;
            document.dispatchEvent(new CustomEvent('groupConfigUpdated'));
        } catch (error) {
            console.error('Erro ao salvar config de grupo:', error);
        }
    }

    // 🎯 NOVO: Carregar configuração de ativação
    static loadGroupActivationConfig(groupNum) {
        try {
            groupNum = parseInt(groupNum);
            const getSessionData = (SessionManager.getSessionData && SessionManager.getSessionData.bind(SessionManager)) ||
                ((key) => { try { const sessionId = SessionManager.getUserSessionId(); return JSON.parse(localStorage.getItem(`session_data_${sessionId}_${key}`)); } catch (e) { return null; } });

            const allConfigs = MonitoringView.groupActivationConfig || getSessionData('group_activation_config') || {};
            const config = allConfigs[groupNum];

            const defaultConfig = {
                initial: true,
                winReal: true,
                winSimulated: true,
                lossReal: true,
                lossSimulated: true
            };

            return {
                initial: config?.initial ?? defaultConfig.initial,
                winReal: config?.winReal ?? defaultConfig.winReal,
                lossReal: config?.lossReal ?? defaultConfig.lossReal,
                winSimulated: config?.winSimulated ?? defaultConfig.winSimulated,
                lossSimulated: config?.lossSimulated ?? defaultConfig.lossSimulated
            };
        } catch (error) {
            console.error('Erro ao carregar config de grupo:', error);
            return { initial: true, winReal: true, winSimulated: true, lossReal: true, lossSimulated: true };
        }
    }

    // 🎯 NOVO: Carregar TODAS as configurações salvas
    static loadSavedGroupConfigs() {
        try {
            const getSessionData = (SessionManager.getSessionData && SessionManager.getSessionData.bind(SessionManager)) ||
                ((key) => { try { const sessionId = SessionManager.getUserSessionId(); return JSON.parse(localStorage.getItem(`session_data_${sessionId}_${key}`)); } catch (e) { return null; } });
            return getSessionData('group_activation_config') || {};
        } catch (error) {
            console.error('Erro ao carregar todas as configs de grupo:', error);
            return {};
        }
    }
}

// Adicionar estilos CSS para o botão da planilha
const style = document.createElement('style');
style.textContent = `
    .suggestions-btn:hover {
        background: linear-gradient(135deg, #2575fc, #6a11cb);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(106, 17, 203, 0.4);
    }

    .planilha-btn {
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 1.2em;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
        min-width: 40px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .planilha-btn:hover {
        background: linear-gradient(135deg, #20c997, #28a745);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
    }
`;
document.head.appendChild(style);
// ✅ NOVO: Método para auto-resize da textarea de estratégia
MonitoringView.initStrategyTextareaAutoResize = function () {
    const textarea = document.getElementById('strategy-text');
    if (!textarea) return;

    // Função para ajustar altura
    const autoResize = () => {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set height to scrollHeight (content height)
        textarea.style.height = textarea.scrollHeight + 'px';
    };

    // Ajustar altura inicial
    autoResize();

    // Ajustar altura quando o conteúdo mudar
    textarea.addEventListener('input', autoResize);

    // Ajustar altura quando carregar estratégia salva
    textarea.addEventListener('change', autoResize);

    // Ajustar altura quando a janela for redimensionada
    window.addEventListener('resize', autoResize);

    // Observer para detectar mudanças no conteúdo (útil quando carregado programaticamente)
    const observer = new MutationObserver(autoResize);
    observer.observe(textarea, {
        attributes: true,
        attributeFilter: ['value']
    });
};

// 🌍 EXPOR MÉTODO DE TESTE GLOBALMENTE
window.testSuggestionsButton = () => MonitoringView.testSuggestionsButton();

// ✅ EXPOR GLOBALMENTE
window.MonitoringView = MonitoringView;

