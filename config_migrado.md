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
<div class="group-rules" style="opacity: 1; filter: none;">             
<div class="rule-visual-item grouped-rule grouped" data-rule-id="1">🔴 0, 1 = 28% (→1)</div>
</div>

<div class="group-rules" style="opacity: 1; filter: none;">
 <div class="rule-visual-item grouped-rule grouped" data-rule-id="1">🔴 0, 1, 2, 3 = 28% (→3)</div>
    <div class="rule-visual-item grouped-rule grouped" data-rule-id="2">🔴 5,7,3</div>
</div>

<div class="rules-visual-container">
                    <div id="rules-visual-display" class="rules-visual-display">
                <div class="rules-visual-display">
                    
                    <div class="rule-group group-failed" data-group-id="1" style="opacity: 1; filter: none; pointer-events: auto;">
                        <div class="group-header" style="opacity: 1; filter: none;">
                            <span class="group-label">Regra Grupo 1</span>
                        </div>
                        <div class="group-rules" style="opacity: 1; filter: none;">
                 
                        <div class="rule-visual-item grouped-rule grouped" data-rule-id="1">🔴 0, 1 = 28% (→1)</div>
                     </div></div>
                    <div class="rule-group group-satisfied-cooldown" data-group-id="2" style="opacity: 1; filter: none; pointer-events: auto;">
                        <div class="group-header" style="opacity: 1; filter: none;">
                            <span class="group-label">Regra Grupo 2</span>
                        </div>
                        <div class="group-rules" style="opacity: 1; filter: none;">
                 
                        <div class="rule-visual-item grouped-rule grouped" data-rule-id="1">🟢 (0,1,2,3) = 56% (→3)</div>
                     
                        <div class="rule-visual-item grouped-rule grouped" data-rule-id="2">🔴 0,7,1</div>
                     </div></div>
                </div>
            </div>
                
                <div class="cooldown-overlay-modal" data-overlay-id="cooldown-1769355047019" style="position: absolute !important; inset: 0px !important; width: 100% !important; height: 100% !important; z-index: 9999 !important; display: flex; justify-content: center !important; align-items: center !important; border-radius: 8px !important; overflow: hidden !important; margin: 0px !important; padding: 0px !important; box-sizing: border-box !important; background: linear-gradient(135deg, rgba(255, 235, 130, 0.92) 0%, rgba(255, 220, 100, 0.92) 100%) !important; backdrop-filter: blur(10px) !important; visibility: visible; opacity: 1;">
                    <div class="cooldown-overlay-content" style="
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #f5d950 0%, #f0c854 100%);
                        border-radius: 15px;
                        padding: 20px;
                        width: 80%;
                        max-width: 300px;
                        min-height: 200px;
                        max-height: 90%;
                        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
                        border: 2px solid #fff;
                        text-align: center;
                        color: #333;
                        box-sizing: border-box;
                    ">
                        <div class="cooldown-header">
                            <h3 style="margin: 0 0 15px 0; font-size: 1.4em; color: #d63384; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                                📊 Contrato Aberto
                            </h3>
                        </div>

                        <div class="cooldown-progress-container" style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                            <div class="cooldown-circle" style="
                                width: 90px;
                                height: 90px;
                                border-radius: 50%;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                                animation: cooldownPulse 2s infinite;
                            ">
                                <span class="cooldown-number" style="font-size: 1.8em; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);">1</span>
                            </div>

                            <div class="cooldown-text" style="margin: 8px 0; font-size: 1em; color: #495057; font-weight: 600;">Aguardando 1 de 4 tick</div>

                            <div class="cooldown-progress-bar" style="
                                width: 180px;
                                height: 8px;
                                background: rgba(255, 255, 255, 0.4);
                                border-radius: 4px;
                                overflow: hidden;
                                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
                            ">
                                <div class="cooldown-progress" style="height: 100%; background: linear-gradient(90deg, rgb(40, 167, 69), rgb(32, 201, 151)); border-radius: 4px; transition: width 0.3s; box-shadow: rgba(0, 0, 0, 0.2) 0px 1px 3px; width: 75%;"></div>
                            </div>
                            <div style="font-size: 0.8em; color: #6c757d; margin-top: 5px;">
                                Progresso: <span class="cooldown-percentage">75%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>