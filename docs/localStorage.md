Dados salvos no localStorage

access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc3MDU1NDEzMn0.RJbWe314KObz2qfBobantOU4ShY59GYpa17w1jUW7j8

deriv_accounts: [
    {
        "activeToken": "a1-DlxgXIhgrsiFoThhxAAiz74GwNIS0",
        "amount": 0.35,
        "barrier": "",
        "digits": 3,
        "volatility": "R_100",
        "finishedTradeList": [],
        "lastTrade": null,
        "name": " Helder Fábio",
        "openTradeId": null,
        "results": {
            "loss": 0,
            "result": 0,
            "wins": 0
        },
        "selectedLoginId": "VRTC12422137",
        "tokens": [
            {
                "acct": "VRTC12422137",
                "is_virtual": true,
                "token": "a1-DlxgXIhgrsiFoThhxAAiz74GwNIS0",
                "cur": "USD",
                "balance": 10029.88
            },
            {
                "acct": "CR9114004",
                "is_virtual": false,
                "token": "a1-lJ3dtpnW8KSza7zFieAyt1hcQd3Vr",
                "cur": "USD",
                "balance": 0.27
            }
        ]
    }
]

global_persistent_session_id: session_global_mlclp4u0

monitoring_group_activation_config_VRTC12422137: {"_meta":{"groupsSignature":"[]"}}

monitoring_group_activation_config_global: {"_meta":{"groupsSignature":"[]"}}

monitoring_strategy_VRTC12422137: * Entrar under 8 quando os ultimos 3 digitos >= 6

prob_accuracy_topN: 5

selectedSymbol: R_10
strategy_cache_global: {
    "bbbssh": {
        "originalText": "* Entrar under 8 quando os ultimos 3 digitos >= 8\n* Entrar over 2 quando os ultimos 2 digitos <=2",
        "translation": {
            "groups": [
                {
                    "id": 1,
                    "rules": [
                        {
                            "type": "dynamic_prediction",
                            "description": "Entrar under 8 quando os ultimos 3 digitos >= (8,9)",
                            "displayFormat": "Previsão dinâmica: Entrar UNDER 8 quando os ultimos 3 digitos >= 8",
                            "parameters": {
                                "type": "dynamic_prediction",
                                "predictionType": "conditional_value",
                                "predictionAction": "under",
                                "targetValue": 8,
                                "explicitPrediction": true,
                                "count": 3,
                                "allowedDigits": [
                                    8,
                                    9
                                ],
                                "parameter_key": "param_contract_val_g1r1",
                                "parameter_key_allowed_digits": "param_allowed_digits_g1r1"
                            },
                            "status": "waiting",
                            "currentValue": null,
                            "count": 3,
                            "targetValue": 8,
                            "predictionAction": "under",
                            "predictionType": "conditional_value",
                            "allowedDigits": [
                                8,
                                9
                            ],
                            "parameters_ui": [
                                {
                                    "key": "param_count_g1_r1",
                                    "label": "Qtd. Últimos Dígitos (G1R1)",
                                    "value": 3,
                                    "type": "number",
                                    "path": "groups[0].rules[0].parameters.count"
                                },
                                {
                                    "key": "param_targetValue_g1_r1",
                                    "label": "Valor Alvo (Ação) (G1R1)",
                                    "value": 8,
                                    "type": "number",
                                    "path": "groups[0].rules[0].parameters.targetValue"
                                },
                                {
                                    "key": "param_allowedDigits_g1_r1",
                                    "label": "Dígitos Permitidos (G1R1)",
                                    "value": "8,9",
                                    "type": "text",
                                    "path": "groups[0].rules[0].allowedDigits",
                                    "isArray": true
                                }
                            ]
                        }
                    ]
                },
                {
                    "id": 2,
                    "rules": [
                        {
                            "type": "dynamic_prediction",
                            "description": "Entrar over 2 quando os ultimos 2 digitos <= (0,1,2)",
                            "displayFormat": "Previsão dinâmica: Entrar OVER 2 quando os ultimos 2 digitos <= 2",
                            "parameters": {
                                "type": "dynamic_prediction",
                                "predictionType": "conditional_value",
                                "predictionAction": "over",
                                "targetValue": 2,
                                "explicitPrediction": true,
                                "count": 2,
                                "allowedDigits": [
                                    0,
                                    1,
                                    2
                                ],
                                "parameter_key": "param_contract_val_g1r1",
                                "parameter_key_allowed_digits": "param_allowed_digits_g1r1"
                            },
                            "status": "waiting",
                            "currentValue": null,
                            "count": 2,
                            "targetValue": 2,
                            "predictionAction": "over",
                            "predictionType": "conditional_value",
                            "allowedDigits": [
                                0,
                                1,
                                2
                            ],
                            "parameters_ui": [
                                {
                                    "key": "param_count_g2_r1",
                                    "label": "Qtd. Últimos Dígitos (G2R1)",
                                    "value": 2,
                                    "type": "number",
                                    "path": "groups[1].rules[0].parameters.count"
                                },
                                {
                                    "key": "param_targetValue_g2_r1",
                                    "label": "Valor Alvo (Ação) (G2R1)",
                                    "value": 2,
                                    "type": "number",
                                    "path": "groups[1].rules[0].parameters.targetValue"
                                },
                                {
                                    "key": "param_allowedDigits_g2_r1",
                                    "label": "Dígitos Permitidos (G2R1)",
                                    "value": "0,1,2",
                                    "type": "text",
                                    "path": "groups[1].rules[0].allowedDigits",
                                    "isArray": true
                                }
                            ]
                        }
                    ]
                }
            ],
            "action": "entry",
            "logic": "OR entre grupos",
            "parameters": [
                {
                    "key": "param_count_g1_r1",
                    "label": "Qtd. Últimos Dígitos (G1R1)",
                    "value": 3,
                    "type": "number",
                    "path": "groups[0].rules[0].parameters.count"
                },
                {
                    "key": "param_targetValue_g1_r1",
                    "label": "Valor Alvo (Ação) (G1R1)",
                    "value": 8,
                    "type": "number",
                    "path": "groups[0].rules[0].parameters.targetValue"
                },
                {
                    "key": "param_allowedDigits_g1_r1",
                    "label": "Dígitos Permitidos (G1R1)",
                    "value": "8,9",
                    "type": "text",
                    "path": "groups[0].rules[0].allowedDigits",
                    "isArray": true
                },
                {
                    "key": "param_count_g2_r1",
                    "label": "Qtd. Últimos Dígitos (G2R1)",
                    "value": 2,
                    "type": "number",
                    "path": "groups[1].rules[0].parameters.count"
                },
                {
                    "key": "param_targetValue_g2_r1",
                    "label": "Valor Alvo (Ação) (G2R1)",
                    "value": 2,
                    "type": "number",
                    "path": "groups[1].rules[0].parameters.targetValue"
                },
                {
                    "key": "param_allowedDigits_g2_r1",
                    "label": "Dígitos Permitidos (G2R1)",
                    "value": "0,1,2",
                    "type": "text",
                    "path": "groups[1].rules[0].allowedDigits",
                    "isArray": true
                }
            ],
            "source": "local_template"
        },
        "timestamp": 1772371948087
    },
    "etdr9j": {
        "originalText": "* Entrar under 8 quando os ultimos 3 digitos >= 7",
        "translation": {
            "groups": [
                {
                    "id": 1,
                    "rules": [
                        {
                            "type": "dynamic_prediction",
                            "description": "Entrar under 8 quando os ultimos 3 digitos >= (7,8,9)",
                            "displayFormat": "Previsão dinâmica: Entrar UNDER 8 quando os ultimos 3 digitos >= 7",
                            "parameters": {
                                "type": "dynamic_prediction",
                                "predictionType": "conditional_value",
                                "predictionAction": "under",
                                "targetValue": 8,
                                "explicitPrediction": true,
                                "count": 3,
                                "allowedDigits": [
                                    7,
                                    8,
                                    9
                                ],
                                "parameter_key": "param_contract_val_g1r1",
                                "parameter_key_allowed_digits": "param_allowed_digits_g1r1"
                            },
                            "status": "waiting",
                            "currentValue": null,
                            "count": 3,
                            "targetValue": 8,
                            "predictionAction": "under",
                            "predictionType": "conditional_value",
                            "allowedDigits": [
                                7,
                                8,
                                9
                            ],
                            "parameters_ui": [
                                {
                                    "key": "param_count_g1_r1",
                                    "label": "Qtd. Últimos Dígitos (G1R1)",
                                    "value": 3,
                                    "type": "number",
                                    "path": "groups[0].rules[0].parameters.count"
                                },
                                {
                                    "key": "param_targetValue_g1_r1",
                                    "label": "Valor Alvo (Ação) (G1R1)",
                                    "value": 8,
                                    "type": "number",
                                    "path": "groups[0].rules[0].parameters.targetValue"
                                },
                                {
                                    "key": "param_allowedDigits_g1_r1",
                                    "label": "Dígitos Permitidos (G1R1)",
                                    "value": "7,8,9",
                                    "type": "text",
                                    "path": "groups[0].rules[0].allowedDigits",
                                    "isArray": true
                                }
                            ]
                        }
                    ]
                }
            ],
            "action": "entry",
            "logic": "Grupo único",
            "parameters": [
                {
                    "key": "param_count_g1_r1",
                    "label": "Qtd. Últimos Dígitos (G1R1)",
                    "value": 3,
                    "type": "number",
                    "path": "groups[0].rules[0].parameters.count"
                },
                {
                    "key": "param_targetValue_g1_r1",
                    "label": "Valor Alvo (Ação) (G1R1)",
                    "value": 8,
                    "type": "number",
                    "path": "groups[0].rules[0].parameters.targetValue"
                },
                {
                    "key": "param_allowedDigits_g1_r1",
                    "label": "Dígitos Permitidos (G1R1)",
                    "value": "7,8,9",
                    "type": "text",
                    "path": "groups[0].rules[0].allowedDigits",
                    "isArray": true
                }
            ],
            "source": "local_template"
        },
        "timestamp": 1772375069508
    },
    "etdr9k": {
        "originalText": "* Entrar under 8 quando os ultimos 3 digitos >= 8",
        "translation": {
            "groups": [
                {
                    "id": 1,
                    "rules": [
                        {
                            "type": "dynamic_prediction",
                            "description": "Entrar under 8 quando os ultimos 3 digitos >= (8,9)",
                            "displayFormat": "Previsão dinâmica: Entrar UNDER 8 quando os ultimos 3 digitos >= 8",
                            "parameters": {
                                "type": "dynamic_prediction",
                                "predictionType": "conditional_value",
                                "predictionAction": "under",
                                "targetValue": 8,
                                "explicitPrediction": true,
                                "count": 3,
                                "allowedDigits": [
                                    8,
                                    9
                                ],
                                "parameter_key": "param_contract_val_g1r1",
                                "parameter_key_allowed_digits": "param_allowed_digits_g1r1"
                            },
                            "status": "waiting",
                            "currentValue": null,
                            "count": 3,
                            "targetValue": 8,
                            "predictionAction": "under",
                            "predictionType": "conditional_value",
                            "allowedDigits": [
                                8,
                                9
                            ],
                            "parameters_ui": [
                                {
                                    "key": "param_count_g1_r1",
                                    "label": "Qtd. Últimos Dígitos (G1R1)",
                                    "value": 3,
                                    "type": "number",
                                    "path": "groups[0].rules[0].parameters.count"
                                },
                                {
                                    "key": "param_targetValue_g1_r1",
                                    "label": "Valor Alvo (Ação) (G1R1)",
                                    "value": 8,
                                    "type": "number",
                                    "path": "groups[0].rules[0].parameters.targetValue"
                                },
                                {
                                    "key": "param_allowedDigits_g1_r1",
                                    "label": "Dígitos Permitidos (G1R1)",
                                    "value": "8,9",
                                    "type": "text",
                                    "path": "groups[0].rules[0].allowedDigits",
                                    "isArray": true
                                }
                            ]
                        }
                    ]
                }
            ],
            "action": "entry",
            "logic": "Grupo único",
            "parameters": [
                {
                    "key": "param_count_g1_r1",
                    "label": "Qtd. Últimos Dígitos (G1R1)",
                    "value": 3,
                    "type": "number",
                    "path": "groups[0].rules[0].parameters.count"
                },
                {
                    "key": "param_targetValue_g1_r1",
                    "label": "Valor Alvo (Ação) (G1R1)",
                    "value": 8,
                    "type": "number",
                    "path": "groups[0].rules[0].parameters.targetValue"
                },
                {
                    "key": "param_allowedDigits_g1_r1",
                    "label": "Dígitos Permitidos (G1R1)",
                    "value": "8,9",
                    "type": "text",
                    "path": "groups[0].rules[0].allowedDigits",
                    "isArray": true
                }
            ],
            "source": "local_template"
        },
        "timestamp": 1772981067531
    },
    "etdr9i": {
        "originalText": "* Entrar under 8 quando os ultimos 3 digitos >= 6",
        "translation": {
            "groups": [
                {
                    "id": 1,
                    "rules": [
                        {
                            "id": "g1r1",
                            "type": "dynamic_prediction",
                            "description": "Entrar under 8 quando os ultimos 3 digitos >= (6,7,8,9)",
                            "displayFormat": "Previsão dinâmica: Entrar under 8 quando os ultimos 3 digitos >= (6,7,8,9)",
                            "parameters": {
                                "type": "dynamic_prediction",
                                "displayFormat": "Previsão dinâmica: Entrar UNDER 8 quando os ultimos 3 digitos >= 6",
                                "status": "waiting",
                                "currentValue": null,
                                "count": 3,
                                "targetValue": 8,
                                "predictionAction": "under",
                                "predictionType": "conditional_value",
                                "allowedDigits": [
                                    6,
                                    7,
                                    8,
                                    9
                                ],
                                "parameters_ui": [
                                    {
                                        "key": "param_count_g1_r1",
                                        "label": "Qtd. Últimos Dígitos (G1R1)",
                                        "value": 3,
                                        "type": "number",
                                        "path": "groups[0].rules[0].parameters.count"
                                    },
                                    {
                                        "key": "param_targetValue_g1_r1",
                                        "label": "Valor Alvo (Ação) (G1R1)",
                                        "value": 8,
                                        "type": "number",
                                        "path": "groups[0].rules[0].parameters.targetValue"
                                    },
                                    {
                                        "key": "param_allowedDigits_g1_r1",
                                        "label": "Dígitos Permitidos (G1R1)",
                                        "value": "6,7,8,9",
                                        "type": "text",
                                        "path": "groups[0].rules[0].allowedDigits",
                                        "isArray": true
                                    }
                                ]
                            },
                            "status": "waiting",
                            "currentValue": null,
                            "count": 3,
                            "targetValue": 8,
                            "predictionAction": "under",
                            "predictionType": "conditional_value",
                            "parameters_ui": [
                                {
                                    "key": "param_count_g1_r1",
                                    "label": "Qtd. Últimos Dígitos (G1R1)",
                                    "value": 3,
                                    "type": "number",
                                    "path": "groups[0].rules[0].parameters.count"
                                },
                                {
                                    "key": "param_targetValue_g1_r1",
                                    "label": "Valor Alvo (Ação) (G1R1)",
                                    "value": 8,
                                    "type": "number",
                                    "path": "groups[0].rules[0].parameters.targetValue"
                                },
                                {
                                    "key": "param_allowedDigits_g1_r1",
                                    "label": "Dígitos Permitidos (G1R1)",
                                    "value": "6,7,8,9",
                                    "type": "text",
                                    "path": "groups[0].rules[0].allowedDigits",
                                    "isArray": true
                                }
                            ]
                        }
                    ],
                    "status": "inactive"
                }
            ],
            "parameters": [
                {
                    "key": "param_count_g1_r1",
                    "label": "Qtd. Últimos Dígitos (G1R1)",
                    "value": 3,
                    "type": "number",
                    "path": "groups[0].rules[0].parameters.count"
                },
                {
                    "key": "param_targetValue_g1_r1",
                    "label": "Valor Alvo (Ação) (G1R1)",
                    "value": 8,
                    "type": "number",
                    "path": "groups[0].rules[0].parameters.targetValue"
                },
                {
                    "key": "param_allowedDigits_g1_r1",
                    "label": "Dígitos Permitidos (G1R1)",
                    "value": "6,7,8,9",
                    "type": "text",
                    "path": "groups[0].rules[0].allowedDigits",
                    "isArray": true
                }
            ],
            "totalRules": 1,
            "logic": "Grupo único"
        },
        "timestamp": 1773269724447
    }
}

token_list: [
    {
        "acct": "CR9114004",
        "is_virtual": false,
        "token": "a1-lJ3dtpnW8KSza7zFieAyt1hcQd3Vr",
        "cur": "USD"
    },
    {
        "acct": "VRTC12422137",
        "is_virtual": true,
        "token": "a1-DlxgXIhgrsiFoThhxAAiz74GwNIS0",
        "cur": "USD"
    }
]

trade_config_controller:{
    "config": {
        "winReal": 5,
        "lossReal": 1,
        "winSimulated": 0,
        "lossSimulated": 1,
        "tradeLimit": 0,
        "cooldownPeriod": 3,
        "pauseTime": null,
        "pauseTrades": 2,
        "pauseOnWins": false,
        "countRepeated": false
    },
    "_timestamp": 1773271212306,
    "_autoSaved": true
}

trade_config_full: {
    "config": {
        "contractType": "DIGITOVER",
        "tradeType": "DIGITOVER",
        "duration": 1,
        "durationUnit": "t",
        "prediction": "0",
        "barrier": "+1",
        "barrierHigh": "0.001",
        "barrierLow": "-0.001",
        "stake": 0.35,
        "goal": 1,
        "stopLoss": 100,
        "galeMultiplier": 1,
        "galeSplit": 1,
        "galeSplitThreshold": 0,
        "sorosLimit": 0,
        "sorosProfitPercentage": 100,
        "galeRemovesSoros": false,
        "winReal": 5,
        "lossReal": 1,
        "winSimulated": 0,
        "lossSimulated": 1,
        "tradeLimit": 0,
        "cooldownPeriod": 3,
        "pauseTime": null,
        "pauseTrades": 2,
        "pauseOnWins": false,
        "countRepeated": true,
        "selectedSymbol": "R_10"
    },
    "_timestamp": 1772994433296,
    "_autoSaved": true
}

trade_config_management: {
    "config": {
        "stake": 0.35,
        "goal": 1,
        "stopLoss": 100,
        "galeMultiplier": 1,
        "galeSplit": 1,
        "galeSplitThreshold": 0,
        "sorosLimit": 0,
        "sorosProfitPercentage": 100,
        "galeRemovesSoros": false
    },
    "_timestamp": 1773271022051,
    "_autoSaved": true
}

trade_config_trade: {
    "config": {
        "contractType": "DIGITOVER",
        "tradeType": "DIGITOVER",
        "duration": 1,
        "durationUnit": "t",
        "prediction": "0",
        "barrier": "+1",
        "barrierHigh": "0.001",
        "barrierLow": "-0.001"
    },
    "_timestamp": 1773271235196,
    "_autoSaved": true
}

trade_config_user_VRTC12422137: {"config":{"symbol":"R_10","contractType":"DIGITDIFF","tradeType":"CALL","duration":1,"durationUnit":"t","stake":0.35,"goal":10,"stopLoss":10,"galeMultiplier":1,"galeSplit":1,"galeSplitThreshold":0,"winReal":0,"lossReal":0,"winSimulated":0,"lossSimulated":0,"tradeLimit":0,"cooldownPeriod":3,"prediction":0},"_timestamp":1773244846000,"_autoSaved":true,"_userId":"VRTC12422137"} 