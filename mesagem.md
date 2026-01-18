Configuração sem IA
configurações de entrada: {
  trade: {
    tipo de contrato: differ/match,
    entrada inicial: 0.35,
    duração: 1 ticks,
    tipo trader: differ,
    previsão (digito): 5
  },
  gestão: {
    campos com valores padrão,
  },
  controler: {
    campos com valores padrão
  }
}

strategy: {
    "name": "Manual Strategy",
    "conditions": [],
    "action": "DIGITDIFF"
}

------------------------------------------------------
Configuração com IA
configurações de entrada: {
  trade: {
    tipo de contrato: differ/match,
    entrada inicial: 0.35,
    duração: 1 ticks,
    tipo trader: differ,
    previsão (digito): 5
  },
  gestão: {
    campos com valores padrão,
  },
  controler: {
    campos com valores padrão
  }
}
strategy: {
    "parameters": [
        {
            "key": "param_g1r1_last_digits_count",
            "label": "Qtd. Últimos Dígitos (G1R1)",
            "value": 2,
            "type": "number",
            "path": "groups[0].rules[0].combinedRule.patternRule.count"
        }
    ],
    "groups": [
        {
            "operator": "AND",
            "rules": [
                {
                    "description": "entrar differ quando os 2 ultimos digitos forem iguais",
                    "type": "dynamic_prediction",
                    "predictionAction": "differ",
                    "targetValue": "dynamic_repeated_digit",
                    "explicitPrediction": true,
                    "predictionType": "conditional_pattern",
                    "combinedRule": {
                        "patternRule": {
                            "type": "digit_repetition",
                            "count": 2,
                            "parameter_key": "param_g1r1_last_digits_count"
                        }
                    }
                }
            ]
        }
    ]
}

activeGroupIds  [1]0: 1length: 1[[Prototype]]: Array(0)
groupId  1
GROUP  {
    "operator": "AND",
    "rules": [
        {
            "description": "entrar differ quando os 2 ultimos digitos forem iguais",
            "type": "dynamic_prediction",
            "predictionAction": "differ",
            "targetValue": "dynamic_repeated_digit",
            "explicitPrediction": true,
            "predictionType": "conditional_pattern",
            "combinedRule": {
                "patternRule": {
                    "type": "digit_repetition",
                    "count": 2,
                    "parameter_key": "param_g1r1_last_digits_count"
                }
            }
        }
    ]
}

COD: {
    "description": "entrar differ quando os 2 ultimos digitos forem iguais",
    "type": "dynamic_prediction",
    "predictionAction": "differ",
    "targetValue": "dynamic_repeated_digit",
    "explicitPrediction": true,
    "predictionType": "conditional_pattern",
    "combinedRule": {
        "patternRule": {
            "type": "digit_repetition",
            "count": 2,
            "parameter_key": "param_g1r1_last_digits_count"
        }
    }
}
