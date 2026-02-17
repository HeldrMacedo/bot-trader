// js/Auxiliar-regras.js
// Sistema auxiliar para criação de regras compatíveis com Gemini

class AuxiliarRegras {
    constructor() {
        this.currentStep = 0;
        this.answers = {};
        this.modal = null;

        // Contratos válidos do Deriv
        this.validContracts = {
            'DIGITOVER': 'Digit Over (Último dígito maior que)',
            'DIGITUNDER': 'Digit Under (Último dígito menor que)',
            'DIGITEVEN': 'Digit Even (Último dígito par)',
            'DIGITODD': 'Digit Odd (Último dígito ímpar)',
            'DIGITDIFF': 'Digit Differs (Último dígito diferente de)',
            'DIGITMATCH': 'Digit Matches (Último dígito igual a)'
        };

        // Padrões de regras compatíveis com Gemini
        this.rulePatterns = {
            'digit_comparison': {
                examples: [
                    'Entrar quando os ultimos 3 digitos > 5',
                    'Entrar quando ultimo digito <= 3',
                    'Entrar quando os ultimos 5 digitos >= 7'
                ],
                template: (n, operator, value) => `Entrar quando os ultimos ${n} digitos ${operator} ${value}`
            },
            'digit_sequence': {
                examples: [
                    'Entrar quando os ultimos 4 digitos forem todos pares',
                    'Entrar quando os ultimos 3 digitos forem todos impares',
                    'Entrar quando os ultimos 5 digitos forem todos iguais'
                ],
                template: (n, condition) => `Entrar quando os ultimos ${n} digitos forem todos ${condition}`
            },
            'digit_specific': {
                examples: [
                    'Entrar quando ultimo digito = 5',
                    'Entrar quando ultimo digito != 0',
                    'Entrar quando os ultimos 2 digitos = (1,3,5,7,9)'
                ],
                template: (n, value) => `Entrar quando ultimos ${n} digito${n > 1 ? 's' : ''} = ${value}`
            },
            'digit_repeated': {
                examples: [
                    'Entrar quando houver 3 digitos repetidos nos ultimos 10 digitos',
                    'Entrar quando um digito se repetir 4 vezes nos ultimos 20 digitos'
                ],
                template: (repeats, lastN) => `Entrar quando houver ${repeats} digitos repetidos nos ultimos ${lastN} digitos`
            },
            'price_movement': {
                examples: [
                    'Entrar quando preco subiu 0.5%',
                    'Entrar quando 3 ticks consecutivos subindo',
                    'Entrar quando ultimo tick > resistencia'
                ],
                template: null // Gerado dinamicamente
            }
        };
    }

    // Abrir modal do assistente
    show() {
        if (this.modal) {
            this.modal.remove();
        }

        this.currentStep = 0;
        this.answers = {};

        this.modal = document.createElement('div');
        this.modal.className = 'auxiliar-regras-modal';
        this.modal.innerHTML = `
            <div class="auxiliar-regras-content">
                <div class="auxiliar-regras-header">
                    <h2>🤓 Assistente de Criação de Regras</h2>
                    <button class="auxiliar-regras-close" onclick="auxiliarRegrasInstance.close()">×</button>
                </div>
                <div class="auxiliar-regras-body">
                    <div class="auxiliar-info-box">
                        <p><strong>ℹ️ Importante:</strong></p>
                        <p>A estratégia que você vai criar é apenas uma <strong>regra de gatilho</strong>.</p>
                        <p>O sistema aguardará o momento em que a regra for atendida para executar o trade.</p>
                        <p>As <strong>configurações da operação</strong> (valor de entrada, duração, tipo de conta, etc.) devem ser feitas no bloco de configurações.</p>
                    </div>
                    <div id="auxiliar-questions-container"></div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Adicionar estilos
        this.addStyles();

        // Animar entrada
        setTimeout(() => {
            this.modal.classList.add('show');
            this.showStep(0);
        }, 10);
    }

    // Fechar modal
    close() {
        if (this.modal) {
            this.modal.classList.remove('show');
            setTimeout(() => {
                this.modal.remove();
                this.modal = null;
            }, 300);
        }
    }

    // Mostrar etapa atual
    showStep(step) {
        this.currentStep = step;
        const container = document.getElementById('auxiliar-questions-container');
        if (!container) return;

        switch (step) {
            case 0:
                this.askContract(container);
                break;
            case 1:
                this.askRuleType(container);
                break;
            case 2:
                this.askRuleDetails(container);
                break;
            case 3:
                this.generateRule(container);
                break;
        }
    }

    // Pergunta 1: Qual contrato deseja negociar?
    askContract(container) {
        container.innerHTML = `
            <div class="auxiliar-question">
                <h3>Qual contrato deseja negociar?</h3>
                <p class="auxiliar-hint">A regra gerada funcionará para este tipo de contrato.</p>
                <div class="auxiliar-contract-options">
                    ${Object.entries(this.validContracts).map(([code, name]) => `
                        <button class="auxiliar-contract-btn" onclick="auxiliarRegrasInstance.selectContract('${code}')">
                            <strong>${code}</strong>
                            <span>${name}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="auxiliar-custom-input" style="margin-top: 20px;">
                    <p>Outro Contrato (Manual):</p>
                    <input type="text" id="custom-contract-input" placeholder="Ex: DIGITOVER, CALL, PUT..." />
                    <button onclick="auxiliarRegrasInstance.validateCustomContract()">Confirmar</button>
                </div>
            </div>
        `;
    }

    // Selecionar contrato pré-definido
    selectContract(contractCode) {
        this.answers.contract = contractCode;
        this.showStep(1);
    }

    // Validar contrato personalizado
    validateCustomContract() {
        const input = document.getElementById('custom-contract-input');
        const value = input.value.trim().toUpperCase();

        if (!value) {
            this.showError('Por favor, digite um contrato válido.');
            return;
        }

        // Verificar se está na lista de contratos válidos
        if (this.validContracts[value]) {
            this.answers.contract = value;
            this.showStep(1);
        } else {
            // Aceitar outros contratos mas avisar
            const confirmCustom = confirm(`"${value}" não está na lista de contratos conhecidos.\n\nDeseja continuar mesmo assim?`);
            if (confirmCustom) {
                this.answers.contract = value;
                this.showStep(1);
            }
        }
    }

    // Pergunta 2: Que tipo de regra deseja criar?
    askRuleType(container) {
        container.innerHTML = `
            <div class="auxiliar-question">
                <h3>Que tipo de regra deseja criar?</h3>
                <p class="auxiliar-hint">Escolha a base para sua regra de gatilho.</p>
                <div class="auxiliar-rule-types">
                    <button class="auxiliar-rule-type-btn" onclick="auxiliarRegrasInstance.selectRuleType('digit_comparison')">
                        <strong>🔢 Comparação de Dígitos</strong>
                        <span>Verifica se os últimos dígitos são maiores, menores ou iguais a um valor.</span>
                        <code>Ex: ultimos 3 digitos > 5</code>
                    </button>
                    <button class="auxiliar-rule-type-btn" onclick="auxiliarRegrasInstance.selectRuleType('digit_sequence')">
                        <strong>📊 Sequência de Dígitos</strong>
                        <span>Verifica se uma sequência é toda par, ímpar ou igual.</span>
                        <code>Ex: ultimos 4 digitos todos pares</code>
                    </button>
                    <button class="auxiliar-rule-type-btn" onclick="auxiliarRegrasInstance.selectRuleType('digit_specific')">
                        <strong>🎯 Dígito Específico</strong>
                        <span>Verifica se o último ou últimos dígitos são iguais a um valor ou lista.</span>
                        <code>Ex: ultimo digito = 5</code>
                    </button>
                    <button class="auxiliar-rule-type-btn" onclick="auxiliarRegrasInstance.selectRuleType('digit_repeated')">
                        <strong>🔄 Dígitos Repetidos</strong>
                        <span>Verifica se um dígito se repete X vezes nos últimos Y ticks.</span>
                        <code>Ex: 3 digitos repetidos</code>
                    </button>
                    <button class="auxiliar-rule-type-btn" onclick="auxiliarRegrasInstance.selectRuleType('price_movement')">
                        <strong>📈 Movimento de Preço</strong>
                        <span>Verifica variações de preço, ticks consecutivos ou rompimentos.</span>
                        <code>Ex: preco subiu 0.5%</code>
                    </button>
                    <button class="auxiliar-rule-type-btn" onclick="auxiliarRegrasInstance.selectRuleType('custom')">
                        <strong>✍️ Regra Personalizada</strong>
                        <span>Descreva sua regra livremente (IA tentará entender).</span>
                    </button>
                </div>
                <button class="auxiliar-back-btn" onclick="auxiliarRegrasInstance.showStep(0)">← Voltar</button>
            </div>
        `;
    }

    // Selecionar tipo de regra
    selectRuleType(ruleType) {
        this.answers.ruleType = ruleType;
        this.showStep(2);
    }

    // Pergunta 3: Detalhes da regra
    askRuleDetails(container) {
        const ruleType = this.answers.ruleType;

        let detailsHTML = '';

        switch (ruleType) {
            case 'digit_comparison':
                detailsHTML = `
                    <h3>Configure sua regra de comparação:</h3>
                    <div class="auxiliar-form-group">
                        <label>Quantos dígitos deseja verificar?</label>
                        <input type="number" id="detail-digits" min="1" max="100" value="3" />
                    </div>
                    <div class="auxiliar-form-group">
                        <label>Operador de comparação:</label>
                        <select id="detail-operator">
                            <option value=">">Maior que (>)</option>
                            <option value="<">Menor que (<)</option>
                            <option value=">=">Maior ou igual (>=)</option>
                            <option value="<=">Menor ou igual (<=)</option>
                            <option value="=">Igual a (=)</option>
                            <option value="!=">Diferente de (!=)</option>
                        </select>
                    </div>
                    <div class="auxiliar-form-group">
                        <label>Valor de referência:</label>
                        <input type="number" id="detail-value" min="0" max="9" value="5" />
                    </div>
                `;
                break;

            case 'digit_sequence':
                detailsHTML = `
                    <h3>Configure sua regra de sequência:</h3>
                    <div class="auxiliar-form-group">
                        <label>Quantos dígitos deseja verificar?</label>
                        <input type="number" id="detail-digits" min="1" max="100" value="4" />
                    </div>
                    <div class="auxiliar-form-group">
                        <label>Condição da sequência:</label>
                        <select id="detail-condition">
                            <option value="pares">Todos pares</option>
                            <option value="impares">Todos ímpares</option>
                            <option value="iguais">Todos iguais</option>
                            <option value="crescentes">Em ordem crescente</option>
                            <option value="decrescentes">Em ordem decrescente</option>
                        </select>
                    </div>
                `;
                break;

            case 'digit_specific':
                detailsHTML = `
                    <h3>Configure sua regra de dígito específico:</h3>
                    <div class="auxiliar-form-group">
                        <label>Verificar:</label>
                        <select id="detail-type">
                            <option value="ultimo">Último dígito</option>
                            <option value="ultimos">Últimos N dígitos</option>
                        </select>
                    </div>
                    <div class="auxiliar-form-group" id="digits-group" style="display:none;">
                        <label>Quantos dígitos?</label>
                        <input type="number" id="detail-digits" min="1" max="10" value="2" />
                    </div>
                    <div class="auxiliar-form-group">
                        <label>Deve ser igual a:</label>
                        <input type="text" id="detail-value" placeholder="Ex: 5 ou (1,3,5,7,9)" />
                        <small>Digite um número ou uma lista separada por vírgulas entre parênteses</small>
                    </div>
                `;
                break;

            case 'digit_repeated':
                detailsHTML = `
                    <h3>Configure sua regra de repetição:</h3>
                    <div class="auxiliar-form-group">
                        <label>Quantas vezes um dígito deve se repetir?</label>
                        <input type="number" id="detail-repeats" min="2" max="100" value="3" />
                    </div>
                    <div class="auxiliar-form-group">
                        <label>Verificar nos últimos quantos dígitos?</label>
                        <input type="number" id="detail-lastN" min="2" max="100" value="10" />
                    </div>
                `;
                break;

            case 'price_movement':
                detailsHTML = `
                    <h3>Configure sua regra de movimento de preço:</h3>
                    <div class="auxiliar-form-group">
                        <label>Tipo de movimento:</label>
                        <select id="detail-movement">
                            <option value="percentual">Variação percentual</option>
                            <option value="ticks">Ticks consecutivos</option>
                            <option value="resistencia">Rompimento de resistência</option>
                            <option value="suporte">Rompimento de suporte</option>
                        </select>
                    </div>
                    <div id="movement-details"></div>
                `;
                break;

            case 'custom':
                detailsHTML = `
                    <h3>Descreva sua regra:</h3>
                    <div class="auxiliar-form-group">
                        <label>Escreva como você deseja que a regra funcione:</label>
                        <textarea id="detail-custom" rows="4" placeholder="Ex: Entrar quando os últimos 5 dígitos formarem um padrão crescente e o RSI estiver acima de 70"></textarea>
                        <small>Seja o mais claro e específico possível. O sistema tentará formatar sua regra para ser compatível com o Gemini.</small>
                    </div>
                `;
                break;
        }

        container.innerHTML = `
            <div class="auxiliar-question">
                ${detailsHTML}
                <div class="auxiliar-actions">
                    <button class="auxiliar-back-btn" onclick="auxiliarRegrasInstance.showStep(1)">← Voltar</button>
                    <button class="auxiliar-next-btn" onclick="auxiliarRegrasInstance.collectDetails()">Gerar Regra →</button>
                </div>
            </div>
        `;

        // Event listeners especiais
        if (ruleType === 'digit_specific') {
            const typeSelect = document.getElementById('detail-type');
            const digitsGroup = document.getElementById('digits-group');
            typeSelect.addEventListener('change', () => {
                digitsGroup.style.display = typeSelect.value === 'ultimos' ? 'block' : 'none';
            });
        }

        if (ruleType === 'price_movement') {
            this.updateMovementDetails();
            document.getElementById('detail-movement').addEventListener('change', () => {
                this.updateMovementDetails();
            });
        }
    }

    // Atualizar detalhes de movimento de preço
    updateMovementDetails() {
        const movement = document.getElementById('detail-movement').value;
        const detailsDiv = document.getElementById('movement-details');

        let html = '';
        switch (movement) {
            case 'percentual':
                html = `
                    <div class="auxiliar-form-group">
                        <label>Direção:</label>
                        <select id="detail-direction">
                            <option value="subiu">Subiu</option>
                            <option value="caiu">Caiu</option>
                        </select>
                    </div>
                    <div class="auxiliar-form-group">
                        <label>Percentual (%):</label>
                        <input type="number" id="detail-percent" step="0.1" min="0.1" max="100" value="0.5" />
                    </div>
                `;
                break;
            case 'ticks':
                html = `
                    <div class="auxiliar-form-group">
                        <label>Direção:</label>
                        <select id="detail-direction">
                            <option value="subindo">Subindo</option>
                            <option value="descendo">Descendo</option>
                        </select>
                    </div>
                    <div class="auxiliar-form-group">
                        <label>Quantos ticks consecutivos?</label>
                        <input type="number" id="detail-ticks" min="2" max="100" value="3" />
                    </div>
                `;
                break;
            case 'resistencia':
            case 'suporte':
                html = `
                    <div class="auxiliar-form-group">
                        <label>Direção do rompimento:</label>
                        <select id="detail-direction">
                            <option value=">">Acima (>)</option>
                            <option value="<">Abaixo (<)</option>
                        </select>
                    </div>
                    <div class="auxiliar-form-group">
                        <label>Tipo:</label>
                        <small>A ${movement} será calculada automaticamente com base no histórico de preços</small>
                    </div>
                `;
                break;
        }
        detailsDiv.innerHTML = html;
    }

    // Coletar detalhes e gerar regra
    collectDetails() {
        const ruleType = this.answers.ruleType;
        let details = {};

        switch (ruleType) {
            case 'digit_comparison':
                details = {
                    digits: document.getElementById('detail-digits').value,
                    operator: document.getElementById('detail-operator').value,
                    value: document.getElementById('detail-value').value
                };
                break;

            case 'digit_sequence':
                details = {
                    digits: document.getElementById('detail-digits').value,
                    condition: document.getElementById('detail-condition').value
                };
                break;

            case 'digit_specific':
                details = {
                    type: document.getElementById('detail-type').value,
                    digits: document.getElementById('detail-type').value === 'ultimos' ?
                        document.getElementById('detail-digits').value : 1,
                    value: document.getElementById('detail-value').value
                };
                break;

            case 'digit_repeated':
                details = {
                    repeats: document.getElementById('detail-repeats').value,
                    lastN: document.getElementById('detail-lastN').value
                };
                break;

            case 'price_movement':
                const movement = document.getElementById('detail-movement').value;
                details = { movement };

                if (movement === 'percentual') {
                    details.direction = document.getElementById('detail-direction').value;
                    details.percent = document.getElementById('detail-percent').value;
                } else if (movement === 'ticks') {
                    details.direction = document.getElementById('detail-direction').value;
                    details.ticks = document.getElementById('detail-ticks').value;
                } else {
                    details.direction = document.getElementById('detail-direction').value;
                }
                break;

            case 'custom':
                details = {
                    customRule: document.getElementById('detail-custom').value
                };
                break;
        }

        this.answers.details = details;
        this.showStep(3);
    }

    // Reformular regra personalizada para formato compatível com Gemini
    reformulateCustomRule(userInput) {
        const text = userInput.toLowerCase().trim();

        // Padrões de detecção e reformulação - ORDEM IMPORTA!
        // Regras mais específicas primeiro, genéricas depois

        // 1. Detectar valor específico (ANTES de repetição para evitar conflito com "igual")
        if (text.match(/(?:ultimo|últimos?)\s+(?:digito|dígito)s?\s+(?:igual|=|seja|for)\s+(?:a\s+)?(\d+)/)) {
            const numbers = text.match(/\d+/g);
            if (numbers && numbers.length >= 1) {
                const value = numbers[numbers.length - 1]; // Pegar o último número como valor
                return {
                    success: true,
                    rule: `* Entrar quando ultimo digito = ${value}`,
                    explanation: `Detectei que você quer verificar um valor específico. Reformulei para: verificar quando o último dígito for igual a ${value}.`
                };
            }
        }

        // 2. Detectar repetição de dígitos (MAIS ESPECÍFICO - apenas quando falar explicitamente de repetição)
        if (text.match(/repet|(\d+)\s*vezes|seguid.*(\d+)/)) {
            // Extrair números se houver
            const numbers = text.match(/\d+/g);
            if (numbers && numbers.length >= 1) {
                const repeats = numbers[0];
                const lastN = numbers[1] || '10';
                return {
                    success: true,
                    rule: `* Entrar quando houver ${repeats} digitos repetidos nos ultimos ${lastN} digitos`,
                    explanation: `Detectei que você quer verificar repetição de dígitos. Reformulei para: verificar quando ${repeats} dígitos se repetirem nos últimos ${lastN} dígitos.`
                };
            } else {
                return {
                    success: true,
                    rule: `* Entrar quando houver 3 digitos repetidos nos ultimos 10 digitos`,
                    explanation: `Detectei que você quer verificar repetição de dígitos. Reformulei para: verificar quando 3 dígitos se repetirem nos últimos 10 dígitos. Ajuste os números se necessário.`
                };
            }
        }

        // 3. Detectar sequências (par, ímpar)
        if (text.match(/\b(?:par|pares|impar|impares|ímpar|ímpares)\b/)) {
            const isPar = text.match(/\bpar(?:es)?\b/) !== null;
            const numbers = text.match(/\d+/g);
            const digits = numbers && numbers[0] ? numbers[0] : '3';
            const condition = isPar ? 'pares' : 'impares';
            return {
                success: true,
                rule: `* Entrar quando os ultimos ${digits} digitos forem todos ${condition}`,
                explanation: `Detectei que você quer verificar dígitos ${condition}. Reformulei para: verificar quando os últimos ${digits} dígitos forem todos ${condition}.`
            };
        }

        // 4. Detectar comparação (maior que, menor que)
        if (text.match(/maior|menor|>/)) {
            const numbers = text.match(/\d+/g);
            if (numbers && numbers.length >= 2) {
                const digits = numbers[0];
                const value = numbers[1];
                const operator = text.match(/maior|>/) ? '>' : '<';
                return {
                    success: true,
                    rule: `* Entrar quando os ultimos ${digits} digitos ${operator} ${value}`,
                    explanation: `Detectei comparação de dígitos. Reformulei para: verificar quando os últimos ${digits} dígitos forem ${operator === '>' ? 'maiores que' : 'menores que'} ${value}.`
                };
            }
        }

        // 5. Detectar valor específico GENÉRICO (fallback para casos não capturados acima)
        if (text.match(/igual|exato|específico|especifico|=|seja/)) {
            const numbers = text.match(/\d+/g);
            if (numbers && numbers.length >= 1) {
                const value = numbers[numbers.length - 1]; // Pegar o último número como valor
                return {
                    success: true,
                    rule: `* Entrar quando ultimo digito = ${value}`,
                    explanation: `Detectei que você quer verificar um valor específico. Reformulei para: verificar quando o último dígito for igual a ${value}.`
                };
            }
        }

        // 6. Detectar movimento de preço
        if (text.match(/preço|preco|subiu|caiu|variação|variacao|%/)) {
            const numbers = text.match(/\d+\.?\d*/g);
            if (numbers && numbers.length >= 1) {
                const percent = numbers[0];
                const direction = text.match(/subiu|subir|subi/) ? 'subiu' : 'caiu';
                return {
                    success: true,
                    rule: `* Entrar quando preco ${direction} ${percent}%`,
                    explanation: `Detectei movimento de preço. Reformulei para: verificar quando o preço ${direction} ${percent}%.`
                };
            }
        }

        // 7. Detectar ticks consecutivos
        if (text.match(/tick|consecutiv/)) {
            const numbers = text.match(/\d+/g);
            if (numbers && numbers.length >= 1) {
                const ticks = numbers[0];
                const direction = text.match(/subindo|subir|cima|acima/) ? 'subindo' : 'descendo';
                return {
                    success: true,
                    rule: `* Entrar quando ${ticks} ticks consecutivos ${direction}`,
                    explanation: `Detectei verificação de ticks. Reformulei para: verificar quando houver ${ticks} ticks consecutivos ${direction}.`
                };
            }
        }

        // Se não conseguiu detectar nenhum padrão específico, tentar uma reformulação genérica
        return {
            success: false,
            rule: null,
            suggestions: [
                'Para repetição de dígitos: "Entrar quando houver 3 digitos repetidos nos ultimos 10 digitos"',
                'Para comparação: "Entrar quando os ultimos 3 digitos > 5"',
                'Para sequência: "Entrar quando os ultimos 4 digitos forem todos pares"',
                'Para valor específico: "Entrar quando ultimo digito = 7"',
                'Para preço: "Entrar quando preco subiu 0.5%"',
                'Para ticks: "Entrar quando 3 ticks consecutivos subindo"'
            ]
        };
    }

    // Gerar regra final
    generateRule(container) {
        const { contract, ruleType, details } = this.answers;
        let generatedRule = '';
        let reformulationInfo = null;

        switch (ruleType) {
            case 'digit_comparison':
                generatedRule = `* Entrar quando os ultimos ${details.digits} digitos ${details.operator} ${details.value}`;
                break;

            case 'digit_sequence':
                generatedRule = `* Entrar quando os ultimos ${details.digits} digitos forem todos ${details.condition}`;
                break;

            case 'digit_specific':
                const digitText = details.type === 'ultimo' ? 'ultimo digito' : `ultimos ${details.digits} digitos`;
                generatedRule = `* Entrar quando ${digitText} = ${details.value}`;
                break;

            case 'digit_repeated':
                generatedRule = `* Entrar quando houver ${details.repeats} digitos repetidos nos ultimos ${details.lastN} digitos`;
                break;

            case 'price_movement':
                if (details.movement === 'percentual') {
                    generatedRule = `* Entrar quando preco ${details.direction} ${details.percent}%`;
                } else if (details.movement === 'ticks') {
                    generatedRule = `* Entrar quando ${details.ticks} ticks consecutivos ${details.direction}`;
                } else {
                    generatedRule = `* Entrar quando ultimo tick ${details.direction} ${details.movement}`;
                }
                break;

            case 'custom':
                // Reformular regra personalizada usando IA de detecção de padrões
                reformulationInfo = this.reformulateCustomRule(details.customRule);

                if (reformulationInfo.success) {
                    generatedRule = reformulationInfo.rule;
                } else {
                    // Se não conseguiu reformular, mostrar sugestões
                    this.showReformulationHelp(container, details.customRule, reformulationInfo.suggestions);
                    return;
                }
                break;
        }

        // Mostrar explicação da reformulação se for regra personalizada
        const reformulationExplanation = reformulationInfo && reformulationInfo.explanation ? `
            <div class="auxiliar-info-box" style="background: #fff3cd; border-left-color: #ffc107;">
                <p><strong>🤖 Reformulação Automática:</strong></p>
                <p>${reformulationInfo.explanation}</p>
                <p><small>Se a reformulação não estiver correta, você pode voltar e tentar com outra descrição ou escolher um dos outros tipos de regra.</small></p>
            </div>
        ` : '';

        container.innerHTML = `
            <div class="auxiliar-question">
                <div class="auxiliar-success-box">
                    <h3>✅ Regra Gerada com Sucesso!</h3>
                    <p>Sua regra foi criada e está pronta para uso:</p>
                </div>
                ${reformulationExplanation}
                <div class="auxiliar-generated-rule">
                    <strong>Contrato:</strong> ${contract}
                    <br/><br/>
                    <strong>Regra de Gatilho:</strong>
                    <pre>${generatedRule}</pre>
                </div>
                <div class="auxiliar-info-box">
                    <p><strong>📝 Próximos Passos:</strong></p>
                    <ol>
                        <li>A regra foi copiada automaticamente para o campo de estratégia</li>
                        <li>Configure o tipo de contrato como <strong>${contract}</strong> no bloco de configurações</li>
                        <li>Ajuste valor de entrada, duração e outras configurações conforme necessário</li>
                        <li>Clique em "Traduzir" para validar a regra com o Gemini</li>
                        <li>Inicie o monitoramento quando estiver pronto</li>
                    </ol>
                </div>
                <div class="auxiliar-actions">
                    <button class="auxiliar-use-btn" onclick="auxiliarRegrasInstance.useRule('${generatedRule.replace(/'/g, "\\'")}')">
                        ✅ Usar esta Regra
                    </button>
                    <button class="auxiliar-restart-btn" onclick="auxiliarRegrasInstance.show()">
                        🔄 Recomeçar
                    </button>
                    <button class="auxiliar-close-final-btn" onclick="auxiliarRegrasInstance.close()">
                        Fechar
                    </button>
                </div>
            </div>
        `;
    }

    // Mostrar ajuda quando não consegue reformular
    showReformulationHelp(container, originalText, suggestions) {
        container.innerHTML = `
            <div class="auxiliar-question">
                <div class="auxiliar-info-box" style="background: #fff3cd; border-left-color: #ffc107;">
                    <h3>⚠️ Não consegui reformular automaticamente</h3>
                    <p>Você escreveu:</p>
                    <pre style="background: #fff; padding: 10px; border-radius: 4px; margin: 10px 0;">${originalText}</pre>
                    <p>Não consegui identificar um padrão específico nesta descrição. Por favor, seja mais específico ou use uma das opções guiadas.</p>
                </div>

                <div class="auxiliar-info-box">
                    <p><strong>💡 Exemplos de formatos aceitos:</strong></p>
                    <ul style="list-style-type: none; padding-left: 0;">
                        ${suggestions.map(s => `<li style="margin: 8px 0;">✓ ${s}</li>`).join('')}
                    </ul>
                </div>

                <div class="auxiliar-info-box" style="background: #e3f2fd; border-left-color: #2196f3;">
                    <p><strong>📌 Dica:</strong></p>
                    <p>Você pode voltar e escolher um dos tipos de regra guiados (Comparação, Sequência, etc.) para ter um assistente passo a passo, em vez de escrever livremente.</p>
                </div>

                <div class="auxiliar-actions">
                    <button class="auxiliar-back-btn" onclick="auxiliarRegrasInstance.showStep(2)">
                        ← Voltar e Tentar Novamente
                    </button>
                    <button class="auxiliar-restart-btn" onclick="auxiliarRegrasInstance.showStep(1)">
                        🔄 Escolher Tipo Guiado
                    </button>
                    <button class="auxiliar-close-final-btn" onclick="auxiliarRegrasInstance.close()">
                        Fechar
                    </button>
                </div>
            </div>
        `;
    }

    // Usar regra gerada
    useRule(rule) {
        const strategyTextarea = document.getElementById('strategy-text');
        if (strategyTextarea) {
            strategyTextarea.value = rule;
            strategyTextarea.focus();

            // Fechar modal
            this.close();

            // Mostrar mensagem de sucesso
            if (typeof CommonHelpers !== 'undefined') {
                CommonHelpers.showWarning('✅ Regra aplicada com sucesso! Configure o contrato e clique em "Traduzir".', 'Sucesso');
            }
        } else {
            this.showError('Não foi possível encontrar o campo de estratégia.');
        }
    }

    // Mostrar erro
    showError(message) {
        if (typeof CommonHelpers !== 'undefined') {
            CommonHelpers.showError(message);
        } else {
            alert(message);
        }
    }

    // Adicionar estilos
    addStyles() {
        if (document.getElementById('auxiliar-regras-styles')) return;

        const style = document.createElement('style');
        style.id = 'auxiliar-regras-styles';
        style.textContent = `
            .auxiliar-regras-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .auxiliar-regras-modal.show {
                opacity: 1;
            }

            .auxiliar-regras-content {
                background: var(--modal-bg-dark);
                background-color: #0c1318; /* Fundo sólido */
                color: var(--modal-text);
                border: 1px solid var(--modal-border);
                border-radius: 12px;
                width: 90%;
                max-width: 700px;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            }

            .auxiliar-regras-header {
                background: var(--modal-header-bg);
                color: var(--modal-text);
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--modal-border);
            }

            .auxiliar-regras-header h2 {
                margin: 0;
                font-size: 22px;
                font-weight: 600;
            }

            .auxiliar-regras-close {
                background: none;
                border: none;
                color: #fff;
                font-size: 32px;
                cursor: pointer;
                line-height: 1;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
            }

            .auxiliar-regras-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .auxiliar-regras-body {
                padding: 25px;
                overflow-y: auto;
                flex: 1;
                background-color: #0c1318; /* Fundo sólido */
            }

            .auxiliar-info-box {
                background: rgba(33, 150, 243, 0.1);
                border-left: 4px solid #2196f3;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 20px;
                color: var(--modal-text);
            }

            .auxiliar-info-box p {
                margin: 8px 0;
                line-height: 1.6;
            }

            .auxiliar-info-box strong {
                color: #1565c0;
            }

            .auxiliar-success-box {
                background: rgba(76, 175, 80, 0.1);
                border-left: 4px solid #4caf50;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 20px;
                color: var(--modal-text);
            }

            .auxiliar-success-box h3 {
                margin: 0 0 10px 0;
                color: #2e7d32;
            }

            .auxiliar-question h3 {
                color: var(--modal-text);
                margin: 0 0 15px 0;
                font-size: 20px;
            }

            .auxiliar-hint {
                color: #8b9cb5;
                margin-bottom: 20px;
            }

            .auxiliar-contract-options,
            .auxiliar-rule-types {
                display: grid;
                gap: 12px;
            }

            .auxiliar-contract-btn,
            .auxiliar-rule-type-btn {
                background: var(--modal-input-bg);
                border: 1px solid var(--modal-border);
                border-radius: 8px;
                padding: 15px;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .auxiliar-contract-btn:hover,
            .auxiliar-rule-type-btn:hover {
                background: var(--modal-header-bg);
                border-color: var(--modal-input-focus);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            }

            .auxiliar-contract-btn strong,
            .auxiliar-rule-type-btn strong {
                color: var(--modal-text);
                font-size: 16px;
            }

            .auxiliar-contract-btn span,
            .auxiliar-rule-type-btn span {
                color: #8b9cb5;
                font-size: 14px;
            }

            .auxiliar-rule-type-btn code {
                background: rgba(255, 255, 255, 0.1);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                color: #a5b4fc;
                margin-top: 5px;
                display: inline-block;
            }

            .auxiliar-custom-input {
                margin-top: 20px;
                padding: 15px;
                background: var(--modal-input-bg);
                border: 1px solid var(--modal-border);
                border-radius: 8px;
            }

            .auxiliar-custom-input input {
                width: calc(100% - 120px);
                padding: 10px;
                background: var(--modal-input-bg);
                color: var(--modal-text);
                border: 1px solid var(--modal-input-border);
                border-radius: 6px;
                font-size: 14px;
                margin-right: 10px;
            }

            .auxiliar-custom-input button {
                padding: 10px 20px;
                background: #667eea;
                color: #fff;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: background 0.2s;
            }

            .auxiliar-custom-input button:hover {
                background: #5568d3;
            }

            .auxiliar-form-group {
                margin-bottom: 20px;
            }

            .auxiliar-form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: var(--modal-text);
            }

            .auxiliar-form-group input,
            .auxiliar-form-group select,
            .auxiliar-form-group textarea {
                width: 100%;
                padding: 10px;
                background: var(--modal-input-bg);
                color: var(--modal-text);
                border: 1px solid var(--modal-input-border);
                border-radius: 6px;
                font-size: 14px;
                font-family: inherit;
            }

            .auxiliar-form-group small {
                display: block;
                margin-top: 5px;
                color: #8b9cb5;
                font-size: 12px;
            }

            .auxiliar-generated-rule {
                background: var(--modal-input-bg);
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
                color: var(--modal-text);
            }

            .auxiliar-generated-rule pre {
                background: rgba(0, 0, 0, 0.3);
                padding: 15px;
                border-radius: 6px;
                border: 1px solid var(--modal-border);
                margin: 10px 0 0 0;
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: 'Courier New', monospace;
                color: #4caf50;
                font-weight: 500;
            }

            .auxiliar-actions {
                margin-top: 25px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                flex-wrap: wrap;
            }

            .auxiliar-back-btn,
            .auxiliar-next-btn,
            .auxiliar-use-btn,
            .auxiliar-restart-btn,
            .auxiliar-close-final-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: all 0.2s;
            }

            .auxiliar-back-btn {
                background: var(--modal-input-bg);
                color: var(--modal-text);
                border: 1px solid var(--modal-border);
            }

            .auxiliar-back-btn:hover {
                background: var(--modal-header-bg);
                border-color: var(--modal-input-focus);
            }

            .auxiliar-next-btn,
            .auxiliar-use-btn {
                background: #667eea;
                color: #fff;
            }

            .auxiliar-next-btn:hover,
            .auxiliar-use-btn:hover {
                background: #5568d3;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .auxiliar-restart-btn {
                background: #ff9800;
                color: #fff;
            }

            .auxiliar-restart-btn:hover {
                background: #f57c00;
            }

            .auxiliar-close-final-btn {
                background: #9e9e9e;
                color: #fff;
            }

            .auxiliar-close-final-btn:hover {
                background: #757575;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .auxiliar-regras-content {
                    width: 95%;
                    max-height: 95vh;
                }

                .auxiliar-custom-input input {
                    width: 100%;
                    margin-right: 0;
                    margin-bottom: 10px;
                }

                .auxiliar-custom-input button {
                    width: 100%;
                }

                .auxiliar-actions {
                    flex-direction: column;
                }

                .auxiliar-actions button {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// Criar instância global
window.auxiliarRegrasInstance = new AuxiliarRegras();
