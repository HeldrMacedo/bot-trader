Resultados
❌ DIGITOVER 3  |  5503.553 |  5503.470 |   $0.41:   -0.41 | 22:57:28 - LOSS
✅ DIGITOVER 1  |  5503.350 |  5503.327 |   $0.35:   +0.06 | 22:56:18 - WIN 
❌ DIGITOVER 1  |  5520.125 |  5520.110 |   $0.35:   -0.35 | 17:08:05 - LOSS
_______________________________________________________________________________________
configuração
trade: {
    tipo de contrato: differ/match
    entrada inicial: 0.35
    duração: 1 / ticks
    tipo de trade: differ
    previsão: 0
}

Gestão: {
    Valor de Entrada ($): 0.35
    Valor da Meta (Goal) ($): 10
    Valor Stop Loss ($): 10
    Ajuste de Gale: 1 / 0 / 1
    Qtde Soros: 0 / 100 
}

controler: {
    Vitórias Reais: 0
    Perdas Reais: 0
    Vitórias Simuladas: 0 
    Perdas Simuladas: 0
    Limite de Trades (0 = Infinito): 0
    Tempo Delay (Ticks): 3
}

Estrategia na IA {
    * Entrar over 1 quando percentual dos dígitos (0,1) > 30% 
    * Entrar over 3 quando percentual dos dígitos (0,1,2,3) > 50%, últimos 3 dígitos <= 3
}

confiração no grupo
{
    grupo_1: {
        iniciar: true
        win real: false
        win sim: false
        loss real: true
        loss sim: true
    },
    grupo_2:{ 
        iniciar: false
        win real: true
        win sim: true
        loss real: false
        loss sim: false
    }
}