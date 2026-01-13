REQUEST PAYLOAD:{
    "contents": [
        {
            "parts": [
                {
                    "text": "\n=== CONHECIMENTO DO SISTEMA DERIVBOT ===\n\nVocê é um assistente especializado no DerivBot, um sistema de trading automatizado para a plataforma Deriv.\n\n## FORMATO DE REGRAS JSON\n\nAs regras são criadas em formato JSON com a seguinte estrutura:\n\n{\n  \"name\": \"Nome da Estratégia\",\n  \"description\": \"Breve descrição\",\n  \"conditions\": [\n    {\n        \"indicator\": \"RSI\" | \"SMA\" | \"PRICE\" | \"DIGIT\",\n        \"period\": number (para indicadores),\n        \"operator\": \">\" | \"<\" | \">=\" | \"<=\" | \"==\" | \"!=\" | \"CROSS_UP\" | \"CROSS_DOWN\" | \"IS_EVEN\" | \"IS_ODD\",\n        \"value\": number | \"SMA\" | \"EMA\",\n        \"compare_period\": number (opcional, se comparar com outra média)\n    }\n  ],\n  \"action\": \"CALL\" | \"PUT\" | \"DIGITOVER\" | \"DIGITUNDER\" | \"DIGITMATCH\" | \"DIGITDIFF\" | \"DIGITEVEN\" | \"DIGITODD\",\n  \"prediction\": number (para DIGITOVER/UNDER/MATCH/DIFF),\n  \"money_management\": {\n    \"stake\": number,\n    \"stop_loss\": number,\n    \"take_profit\": number\n  }\n}\n\n## EXEMPLOS DE CONDIÇÕES\n\n1. **RSI**: \"Se RSI(14) > 70\"\n   {\"indicator\": \"RSI\", \"period\": 14, \"operator\": \">\", \"value\": 70}\n\n2. **SMA**: \"Se SMA(10) > SMA(20)\"\n   {\"indicator\": \"SMA\", \"period\": 10, \"operator\": \">\", \"value\": \"SMA\", \"compare_period\": 20}\n\n3. **Dígito**: \"Se último dígito for par\"\n   {\"indicator\": \"DIGIT\", \"operator\": \"IS_EVEN\"}\n\n4. **Preço**: \"Se preço > 1000\"\n   {\"indicator\": \"PRICE\", \"operator\": \">\", \"value\": 1000}\n\n## FUNCIONALIDADES DO APP\n\n- **Processamento de Regras**: Digite regras em português e o sistema converte para JSON\n- **Indicadores**: Suporta RSI, SMA, Padrões de Dígitos\n- **Gestão**: Martingale configurável, Stop Loss, Take Profit\n\nSEMPRE forneça exemplos de JSON quando o usuário pedir ajuda para criar regras.\n\n\n* entrar differ quando o ultimo digito repetir duas vezes\n\n--- Contexto de Mercado ---\nAtivo: 1HZ10V\nÚltimos 83 dígitos: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]"
                }
            ]
        }
    ]
}

https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDO8QsMYHkItt2gP6FdpLCbayvzw9RkCZU
{
    "error": {
        "code": 429,
        "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.0-flash\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash\nPlease retry in 52.516869287s.",
        "status": "RESOURCE_EXHAUSTED",
        "details": [
            {
                "@type": "type.googleapis.com/google.rpc.Help",
                "links": [
                    {
                        "description": "Learn more about Gemini API quotas",
                        "url": "https://ai.google.dev/gemini-api/docs/rate-limits"
                    }
                ]
            },
            {
                "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                "violations": [
                    {
                        "quotaMetric": "generativelanguage.googleapis.com/generate_content_free_tier_input_token_count",
                        "quotaId": "GenerateContentInputTokensPerModelPerMinute-FreeTier",
                        "quotaDimensions": {
                            "model": "gemini-2.0-flash",
                            "location": "global"
                        }
                    },
                    {
                        "quotaMetric": "generativelanguage.googleapis.com/generate_content_free_tier_requests",
                        "quotaId": "GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
                        "quotaDimensions": {
                            "location": "global",
                            "model": "gemini-2.0-flash"
                        }
                    },
                    {
                        "quotaMetric": "generativelanguage.googleapis.com/generate_content_free_tier_requests",
                        "quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
                        "quotaDimensions": {
                            "location": "global",
                            "model": "gemini-2.0-flash"
                        }
                    }
                ]
            },
            {
                "@type": "type.googleapis.com/google.rpc.RetryInfo",
                "retryDelay": "52s"
            }
        ]
    }
}

https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDO8QsMYHkItt2gP6FdpLCbayvzw9RkCZU
{
    "error": {
        "code": 404,
        "message": "models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.",
        "status": "NOT_FOUND"
    }
}

https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=AIzaSyDO8QsMYHkItt2gP6FdpLCbayvzw9RkCZU
{
    "error": {
        "code": 404,
        "message": "models/gemini-1.5-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.",
        "status": "NOT_FOUND"
    }
}