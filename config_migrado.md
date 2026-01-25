RESULTADO
24/01/2026, 22:53:20	R_10	DIGITDIFF	2	5505.248	0.35	WIN	+0.02	REAL
24/01/2026, 22:52:54	R_10	DIGITDIFF	6	5504.444	0.35	WIN	+0.02   REAL
---------------------------------------------------------------------------------------
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