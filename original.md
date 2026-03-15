monitoring.js?v=20260202-V2:3995   {
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
                    ],
                    "allowedDigits": "6,7,8,9"
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
    "logic": "Grupo único",
    "originalText": "* Entrar UNDER 8 quando os ultimos 3 digitos >= 6"
}


ui.js?v=20260202-V2:906 {
    "groups": [
        {
            "id": 1,
            "rules": [
                {
                    
                    "id": "g1r1",
                    "displayText": "🟢 9,9,7",
                    "status": "satisfied-cooldown"
                }
            ]
        }
    ],
    "isUpdate": true,
    "cooldownActive": true
}