* Entrar over 1 quando percentual dos dígitos (0,1) > 30%
* Entrar over 3 quando percentual dos dígitos (0,1,2,3) > 50%, últimos 3 dígitos <= 3
{
    "groups": [
        {
            "id": 1,
            "rules": [
                {
                    "id": 1,
                    "displayText": "🔴 0, 1 = 20% (→1)",
                    "status": "failed"
                }
            ]
        },
        {
            "id": 2,
            "rules": [
                {
                    "id": 1,
                    "displayText": "🔴 0, 1, 2, 3 = 44% (→3)",
                    "status": "failed"
                },
                {
                    "id": 2,
                    "displayText": "🔴 2,0,8",
                    "status": "failed"
                }
            ]
        }
    ],
    "isUpdate": true,
    "cooldownActive": false
}

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



-------------------------------------------------------------------------------------------
* Entrar over quando ultimo digito > 7 e RSI > 60
* Entrar differ quando SMA 10 > SMA 20
* Entrar under quando os ultimo 3 dígitos  > 7
* entrar even quando percentual de ímpares  > 60%
{
    "groups": [
        {
            "id": 1,
            "rules": [
                {
                    "id": 1,
                    "displayText": "🔴 0",
                    "status": "failed"
                },
                {
                    "id": 2,
                    "displayText": "🔴 RSI(14) 60.9 (→over)",
                    "status": "failed"
                }
            ]
        },
        {
            "id": 2,
            "rules": [
                {
                    "id": 1,
                    "displayText": "🔴 SMA(10) 5489.05960 SMA(20) 5489.00000",
                    "status": "failed"
                }
            ]
        },
        {
            "id": 3,
            "rules": [
                {
                    "id": 1,
                    "displayText": "🔴 9,4,0",
                    "status": "failed"
                }
            ]
        },
        {
            "id": 4,
            "rules": [
                {
                    "id": 1,
                    "displayText": "🔴 ímpares = 44% (→even)",
                    "status": "failed"
                }
            ]
        }
    ],
    "isPreview": false
}

<div class="rules-visual-container">
                    <div id="rules-visual-display" class="rules-visual-display">
                <div class="rules-visual-display">
                    
                    <div class="rule-group group-failed" data-group-id="1" style="opacity: 1; filter: none; pointer-events: auto;">
                        <div class="group-header" style="opacity: 1; filter: none;">
                            <span class="group-label">Regra Grupo 1</span>
                        </div>
                        <div class="group-rules" style="opacity: 1; filter: none;">
                 
                        <div class="rule-visual-item grouped-rule grouped" data-rule-id="1">🔴 3</div>
                     
                        <div class="rule-visual-item grouped-rule grouped" data-rule-id="2">🔴 RSI(14) 52.0 (→over)</div>
                     </div></div>
                    <div class="rule-group group-inactive-filtered group-satisfied" data-group-id="2" style="opacity: 1; filter: none; pointer-events: none; position: relative;">
                        <div class="group-header" style="opacity: 0.1; filter: grayscale(100%) blur(1px);">
                            <span class="group-label">Regra Grupo 2</span>
                        </div>
                        <div class="group-rules" style="opacity: 0.1; filter: grayscale(100%) blur(1px);">
                 
                        <div class="rule-visual-item grouped-rule grouped" data-rule-id="1">🟢 SMA(10) 5489.58210 SMA(20) 5489.35860</div>
                
                    <div class="rule-group group-inactive-filtered group-failed" data-group-id="3" style="opacity: 1; filter: none; pointer-events: none; position: relative;">
                        <div class="group-header" style="opacity: 0.1; filter: grayscale(100%) blur(1px);">
                            <span class="group-label">Regra Grupo 3</span>
                        </div>
                        <div class="group-rules" style="opacity: 0.1; filter: grayscale(100%) blur(1px);">
                 
                        <div class="rule-visual-item grouped-rule grouped" data-rule-id="1">🔴 5,6,3</div>
                    <div class="rule-group group-failed" data-group-id="4" style="opacity: 1; filter: none; pointer-events: auto;">
                        <div class="group-header" style="opacity: 1; filter: none;">
                            <span class="group-label">Regra Grupo 4</span>
                        </div>
                        <div class="group-rules" style="opacity: 1; filter: none;">
                 
                        <div class="rule-visual-item grouped-rule grouped" data-rule-id="1">🔴 ímpares = 52% (→even)</div>
                     </div></div>
                </div>
            </div>
                
                
            
                
            </div>