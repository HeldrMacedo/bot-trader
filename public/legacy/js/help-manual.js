// Sistema de Manual de Instruções
class HelpManual {
    static isModalOpen = false;

    static init() {

        this.createHelpIcon();
        this.createModalStructure();
        this.attachEventListeners();

        this.createHelpIcon();
        this.createModalStructure();
        this.attachEventListeners();
        this.attachSearchListener(); // Novo listener para busca
    }

    static attachSearchListener() {
        const searchInput = document.getElementById('help-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterManual(e.target.value));
        } else {
            // Tentar novamente se o modal ainda não foi criado (embora createModalStructure seja chamado antes)
            // Mas como o modal pode ser recriado...
            // Melhor apenas garantir que qnd o modal abrir, o listener esteja lá.
            // Vamos delegar ao evento de abertura ou verificar na hora.
            // Simplificação: Adicionar onkeyup direto no HTML ou re-anexar ao abrir.
        }
    }

    static filterManual(searchTerm) {
        searchTerm = searchTerm.toLowerCase().trim();
        const startSections = document.querySelectorAll('.manual-section');
        const helpContent = document.querySelector('.help-modal-body');

        if (!searchTerm) {
            startSections.forEach(sec => sec.style.display = 'block');
            return;
        }

        let firstMatch = null;

        startSections.forEach(section => {
            const text = section.innerText.toLowerCase();
            if (text.includes(searchTerm)) {
                section.style.display = 'block';
                if (!firstMatch) firstMatch = section;

                // Highlight logic could go here but simple filtering is sufficient for now
            } else {
                section.style.display = 'none';
            }
        });

        if (firstMatch && helpContent) {
            // Scroll suave apenas se necessário
            // helpContent.scrollTop = firstMatch.offsetTop; 
        }
    }

    static createHelpIcon() {
        // O botão de Ajuda agora faz parte do header fixo em monitoring.js
        // Apenas anexar o event listener ao botão existente
        const headerHelpIcon = document.querySelector('.header-center-actions #help-icon');
        if (headerHelpIcon) {
            headerHelpIcon.addEventListener('click', () => this.showModal());
            return;
        }

        // Se ainda não foi renderizado, tentar novamente após 500ms
        setTimeout(() => this.createHelpIcon(), 500);
    }

    static createModalStructure() {
        // Verificar se já existe
        if (document.getElementById('help-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'help-modal';
        modal.className = 'help-modal';
        modal.innerHTML = `
            <div class="help-modal-content">
                <div class="help-modal-header">
                    <h2>📚 Manual de Instruções - Strategy Free</h2>
                    <div class="help-search-container" style="margin-top: 10px; position: relative;">
                        <input type="text" id="help-search-input" placeholder="🔍 Pesquisar no manual..." style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #444; background: #222; color: #fff;">
                    </div>
                    <span class="help-close-btn">&times;</span>
                </div>
                <div class="help-modal-body">
                    ${this.getManualContent()}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    static getManualContent() {
        return `
            <div class="manual-section">
                <h3>🎯 Visão Geral do Sistema</h3>
                <p>O Strategy Free é uma plataforma de trading automatizado que utiliza Inteligência Artificial para interpretar suas estratégias escritas em linguagem natural e executar trades na plataforma Deriv.</p>
                <p><strong>Novidade:</strong> Agora com sistema de <strong>Filtro de Risco Algorítmico com IA</strong> que analisa o mercado em tempo real e ajusta os parâmetros de risco automaticamente!</p>
            </div>

            <div class="manual-section highlight">
                <h3>🛡️ Sistema de Filtro de Risco com IA</h3>
                <p>O Filtro de Risco é um sistema avançado que utiliza Inteligência Artificial para analisar o comportamento do mercado e ajustar automaticamente os parâmetros de risco das suas estratégias.</p>

                <h4>📊 Como Funciona:</h4>
                <ul>
                    <li><strong>Análise Algorítmica:</strong> A IA analisa os últimos dígitos do mercado usando métricas como Entropia de Shannon e Momentum</li>
                    <li><strong>Análise Periódica:</strong> Configurável para analisar a cada N ticks (padrão: 50 ticks)</li>
                    <li><strong>Ajuste Automático:</strong> Os parâmetros de risco são ajustados dinamicamente baseado na análise</li>
                    <li><strong>Fallback Inteligente:</strong> Se a IA falhar, o sistema assume automaticamente um estado de "mercado estável" sem cobrar créditos</li>
                </ul>

                <h4>🎯 Status de Risco:</h4>
                <div class="code-block">
                    🟢 <strong>NORMAL:</strong> Mercado estável, parâmetros padrão<br>
                    🟡 <strong>ATENÇÃO:</strong> Volatilidade moderada, parâmetros ajustados<br>
                    🔴 <strong>CRÍTICO:</strong> Alta volatilidade, parâmetros restritivos
                </div>

                <h4>⚙️ Como Ativar:</h4>
                <ol>
                    <li>Clique no botão "Filtro de Risco" no painel de controle</li>
                    <li>Configure o intervalo de análise (recomendado: 50 ticks)</li>
                    <li>O sistema começará a analisar automaticamente</li>
                    <li>Acompanhe o status em tempo real no visor</li>
                </ol>

                <p><strong>💡 Dica:</strong> O filtro de risco funciona melhor em mercados voláteis como Volatility 75 e Volatility 100.</p>
            </div>

            <div class="manual-section">
                <h3>🎲 Sistema de Gale Automático</h3>
                <p>O sistema de Gale (Martingale) permite recuperação automática de perdas através do ajuste inteligente do valor das próximas entradas.</p>

                <h4>⚙️ Configuração do Ajuste de Gale:</h4>
                <div class="code-block">
                    <strong>Multiplicador 0.0:</strong> Gale desativado (sem recuperação)<br>
                    <strong>Multiplicador 1.0:</strong> Cálculo exato de recuperação (recomendado)<br>
                    <strong>Multiplicador < 1.0:</strong> Modo conservador (ex: 0.8 = 80% do valor calculado)<br>
                    <strong>Multiplicador > 1.0:</strong> Modo agressivo (ex: 1.5 = 150% do valor calculado)
                </div>

                <h4>📐 Como Funciona:</h4>
                <p>Quando você perde um trade, o sistema calcula automaticamente o valor necessário para recuperar a perda + obter lucro no próximo trade, considerando o payout do contrato.</p>

                <p><strong>Exemplo:</strong></p>
                <div class="code-block">
                    Perda: $1.00 | Payout: 95% | Multiplicador: 1.0<br>
                    Próximo trade: $2.11 (recupera $1.00 + lucro de $1.00)
                </div>

                <p><strong>⚠️ Atenção:</strong> Use o Gale com cautela. Defina sempre um Stop Loss adequado para evitar perdas excessivas.</p>
            </div>

            <div class="manual-section">
                <h3>🔄 Gestão de Contas</h3>
                <p>Gerencie múltiplas contas Deriv sem precisar fazer logout e login novamente.</p>

                <h4>💎 Como Trocar de Conta:</h4>
                <ol>
                    <li>Clique no dropdown de contas (ícone 💎 no topo)</li>
                    <li>Selecione a conta desejada da lista</li>
                    <li>O sistema sincroniza automaticamente os dados</li>
                    <li>Não é necessário recarregar a página!</li>
                </ol>

                <h4>🟢 Status de Token:</h4>
                <div class="code-block">
                    🟢 Verde: Token válido e ativo<br>
                    🟡 Amarelo: Token precisa ser renovado
                </div>

                <p><strong>💡 Dica:</strong> Você pode adicionar múltiplas contas durante o login OAuth da Deriv.</p>
            </div>

            <div class="manual-section">
                <h3>⏱️ Sistema de Tempo de Delay (Cooldown)</h3>
                <p>O Tempo de Delay adiciona ticks extras após a duração do contrato para evitar trades sobrepostos e dar tempo para o resultado ser processado.</p>

                <h4>⚙️ Configuração:</h4>
                <ul>
                    <li><strong>Valor Padrão:</strong> 3 ticks</li>
                    <li><strong>Mínimo:</strong> 1 tick</li>
                    <li><strong>Recomendado:</strong> 3-5 ticks para contratos de dígitos</li>
                </ul>

                <h4>📊 Como Funciona:</h4>
                <p>Se você configurar duração de 5 ticks e delay de 3 ticks, o sistema aguardará 8 ticks no total antes de permitir um novo trade.</p>

                <p><strong>💡 Benefício:</strong> Previne erros de execução e garante que todos os resultados sejam processados corretamente.</p>
            </div>

            <div class="manual-section highlight">
                <h3>🐛 Correção Importante: Extração de Dígitos</h3>
                <p>Uma correção crítica foi implementada no sistema de extração do último dígito dos preços.</p>

                <h4>❌ Problema Anterior:</h4>
                <p>O sistema estava extraindo o <strong>penúltimo dígito</strong> em vez do último quando o preço terminava em 0.</p>
                <div class="code-block">
                    Exemplo: 545.340<br>
                    ❌ Antes: Sistema analisava o dígito 4<br>
                    ✅ Agora: Sistema analisa corretamente o dígito 0
                </div>

                <h4>✅ Solução Implementada:</h4>
                <p>O sistema agora detecta automaticamente a quantidade de casas decimais do ativo e extrai o dígito correto:</p>
                <ul>
                    <li><strong>2 casas decimais</strong> (ex: EUR/USD = 1.05): Dígito 5 ✅</li>
                    <li><strong>3 casas decimais</strong> (ex: Volatility = 545.340): Dígito 0 ✅</li>
                    <li><strong>5 casas decimais</strong> (ex: Forex = 1.23456): Dígito 6 ✅</li>
                </ul>

                <p><strong>🎯 Impacto:</strong> Todas as estratégias baseadas em dígitos agora funcionam corretamente para qualquer ativo!</p>
            </div>


            <div class="manual-section">
                <h3>🤖 Sistema de Criação de Regras com IA</h3>
                <p>Nossa IA interpreta suas estratégias e as converte em regras executáveis. Aqui estão os principais conceitos:</p>

                <h4>📝 Exemplos de Regras Reconhecidas:</h4>
                <div class="examples-list">
                    <div class="example-item">
                        <strong>Dígitos:</strong>
                        <ul>
                            <li>"Se o último dígito for par"</li>
                            <li>"Quando o último dígito for maior que 5"</li>
                            <li>"Se os ultimos 5 dígitos for menor que 3"</li>
                            <li>"Quando apareceu 3 dígitos ímpares seguidos"</li>
                        </ul>
                    </div>

                    <div class="example-item">
                        <strong>Preços:</strong>
                        <ul>
                            <li>"Se o preço subir 0.5%"</li>
                            <li>"Quando o preço cair mais que 1%"</li>
                            <li>"Se o preço estiver acima da média dos últimos 10 ticks"</li>
                            <li>"Quando o preço romper resistência"</li>
                        </ul>
                    </div>

                    <div class="example-item">
                        <strong>Indicadores Técnicos:</strong>
                        <ul>
                            <li>"Se RSI estiver acima de 70"</li>
                            <li>"Quando RSI for menor que 30"</li>
                            <li>"Se SMA de 20 períodos > SMA de 80"</li>
                            <li>"Quando SMA20 cruzar SMA50"</li>
                        </ul>
                    </div>

                    <div class="example-item">
                        <strong>Padrões de Dígitos (XO):</strong>
                        <ul>
                            <li>"Padrão dos dígitos XXOX" (ex: 2-2-0-2)</li>
                            <li>"Padrão dos dígitos XOXO" (ex: 5-3-5-3)</li>
                            <li>"Padrão dos dígitos XXXO" (ex: 7-7-7-1)</li>
                            <li>"Padrão dos dígitos OXXX" (ex: 4-9-9-9)</li>
                            <li>"Padrão dos dígitos XXOO" (ex: 8-8-3-1)</li>
                            <li>"Padrão dos dígitos OOXX" (ex: 6-2-4-4)</li>
                            <li>"Padrão dos dígitos XOXOX" (ex: 1-7-1-5-1)</li>
                            <li>"Padrão dos dígitos OXOXO" (ex: 3-8-3-6-3)</li>
                        </ul>
                    </div>

                    <div class="example-item">
                        <strong>Padrões Temporais:</strong>
                        <ul>
                            <li>"Nos primeiros 5 ticks"</li>
                            <li>"A cada 10 segundos"</li>
                            <li>"Após 3 movimentos consecutivos"</li>
                            <li>"Durante os próximos 2 minutos"</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="manual-section">
                <h3>📚 Referência Completa de Tipos de Regras</h3>
                <p>Esta é a lista completa de TODOS os tipos de regras que a IA entende. Use como referência para criar suas estratégias:</p>

                <div class="rules-reference">
                    <div class="rule-type">
                        <h4>1. ÚLTIMOS DÍGITOS</h4>
                        <p>Compara os últimos N dígitos com um valor usando operadores.</p>
                        <div class="code-block">
                            * ultimos 3 digitos < 5<br>
                            * 6 ultimos digitos > 2<br>
                            * ultimos 4 digitos igual a 7<br>
                            * ultimos 2 digitos maior que 8<br>
                            * ultimos 5 digitos menor ou igual a 1<br>
                            * ultimos 7 digitos maior ou igual a 9<br>
                            * ultimos 3 digitos diferente de 2
                        </div>
                    </div>

                    <div class="rule-type">
                        <h4>2. REPETIÇÃO DE DÍGITOS</h4>
                        <p>Detecta quando os últimos N dígitos se repetem (são todos iguais).</p>
                        <div class="code-block">
                            * ultimos 2 digitos se repetir<br>
                            * ultimos 3 digitos repetirem<br>
                            * quando os ultimos 4 digitos forem iguais<br>
                            * ultimos 5 digitos repetem<br>
                            * repetição dos ultimos 2 digitos<br>
                            * se os 3 ultimos digitos se repetirem
                        </div>
                    </div>

                    <div class="rule-type">
                        <h4>3. PADRÃO DE DÍGITOS (XO)</h4>
                        <p>Detecta padrões usando X (iguais) e O (diferentes).</p>
                        <div class="code-block">
                            * padrão dos dígitos XXOX<br>
                            * padrão dos dígitos XOXO<br>
                            * padrão dos dígitos XXXO<br>
                            * padrão dos dígitos OXXX<br>
                            * padrão dos dígitos XOXOX<br>
                            * padrão dos dígitos XXXXOO
                        </div>
                    </div>

                    <div class="rule-type">
                        <h4>4. RSI (Índice de Força Relativa)</h4>
                        <p>Analisa o RSI com operadores. Padrão: período 14.</p>
                        <div class="code-block">
                            * rsi > 70<br>
                            * rsi < 30<br>
                            * rsi(20) >= 65<br>
                            * rsi(14) <= 35<br>
                            * rsi entre 40 e 60
                        </div>
                    </div>

                    <div class="rule-type">
                        <h4>5. SMA (Média Móvel Simples)</h4>
                        <p>Compara SMAs entre si ou com o preço.</p>
                        <div class="code-block">
                            * sma(14) > sma(30)<br>
                            * sma(20) < sma(50)<br>
                            * preco acima da sma(14)<br>
                            * preco abaixo da sma(30)<br>
                            * sma(10) cruzou sma(20)
                        </div>
                    </div>

                    <div class="rule-type">
                        <h4>6. SUPORTE E RESISTÊNCIA</h4>
                        <p>Detecta quando preço toca ou quebra níveis.</p>
                        <div class="code-block">
                            * ultimo tick < suporte<br>
                            * ultimo tick > resistencia<br>
                            * preço tocou suporte<br>
                            * preço quebrou resistencia<br>
                            * atingir suporte 1.1800<br>
                            * quebrar resistencia 15000
                        </div>
                    </div>

                    <div class="rule-type">
                        <h4>7. MOVIMENTAÇÃO DE PREÇO</h4>
                        <p>Detecta movimentos percentuais ou em pontos.</p>
                        <div class="code-block">
                            * preco subiu 0.5%<br>
                            * preco caiu 2%<br>
                            * preco subiu 1.5% no periodo de 30<br>
                            * preco caiu 40% no periodo de 40<br>
                            * preco subiu 10 pontos<br>
                            * preco subir mais de 10 pontos
                        </div>
                    </div>

                    <div class="rule-type">
                        <h4>8. SEQUÊNCIA</h4>
                        <p>Detecta X ticks/velas consecutivos subindo ou descendo.</p>
                        <div class="code-block">
                            * 5 ticks consecutivos subindo<br>
                            * 3 velas seguidas descendo<br>
                            * 2 candles consecutivos em alta<br>
                            * 4 movimentos consecutivos para baixo
                        </div>
                    </div>

                    <div class="rule-type">
                        <h4>9. PERCENTUAL DE DÍGITOS</h4>
                        <p>Analisa % de dígitos que atendem condição. Período padrão: 25.</p>
                        <div class="code-block">
                            * percentual dos digitos inferiores a 4 > 40%<br>
                            * percentual dos digitos abaixo de 3 > 50%<br>
                            * percentual dos digitos pares >= 30%<br>
                            * percentual dos digitos acima de 5 > 60% no periodo de 50<br>
                            * percentual dos digitos impares maior ou igual a 40%<br>
                            * percentual dos digitos igual a 7 > 10% no periodo de 100
                        </div>
                    </div>

                    <div class="rule-type">
                        <h4>10. PREVISÃO DINÂMICA</h4>
                        <p>Especifica o contrato (over/under/match/differ) com número.</p>
                        <div class="code-block">
                            * Entrar over 2 quando os 2 ultimos digitos <= 2<br>
                            * Entrar under 7 quando os 2 ultimos digitos >= 7<br>
                            * Entrar over 4 quando os 4 ultimos digitos <= 4<br>
                            * Entrar match 3 quando ultimo digito = 3<br>
                            * Entrar differ do ultimo digito<br>
                            * Entrar match do ultimo digito<br>
                            * Entrar differ do digito que repetir 3 vezes
                        </div>
                    </div>

                    <div class="rule-type highlight">
                        <h4>11. ENTRADAS DUPLAS (BOTH MODE) 🆕</h4>
                        <p>Execute 2 trades simultâneos especificando ambos os contratos na mesma regra.</p>
                        <div class="code-block">
                            * Entrar over 1 e under 8 quando ultimo digito <= 1<br>
                            * Entrar match 3 e differ 7 quando ultimos 2 digitos >= 5<br>
                            * Over 2 e under 7 quando os 3 ultimos digitos < 3<br>
                            * Match 5 e differ 2 quando padrão XXOX
                        </div>
                        <p><strong>Como funciona:</strong> O sistema detecta múltiplos contratos e executa ambos quando a condição é atendida!</p>
                    </div>

                    <div class="rule-type warning">
                        <h4>12. CONDIÇÕES COM "OU" ⚠️</h4>
                        <p>Para condições "OU", use grupos separados com asterisco (*).</p>
                        <div class="code-block">
                            ❌ <span style="color: red;">ERRADO:</span> ultimos 3 digitos <= 2 ou >= 7<br>
                            <br>
                            ✅ <span style="color: green;">CORRETO:</span><br>
                            * ultimos 3 digitos <= 2<br>
                            * ultimos 3 digitos >= 7
                        </div>
                        <p><strong>Dica:</strong> Se usar "OU" na mesma linha, a IA vai sugerir a reformulação correta!</p>
                    </div>

                    <div class="rule-type">
                        <h4>13. DÍGITOS x E o (PERDA E GANHO)</h4>
                        <p>"x" = dígitos perdedores | "o" = dígitos vencedores (variam por contrato).</p>
                        <div class="code-block">
                            <strong>Over 4:</strong> x=0,1,2,3,4 (perda) | o=5,6,7,8,9 (ganho)<br>
                            <strong>Odd:</strong> x=0,2,4,6,8 (perda) | o=1,3,5,7,9 (ganho)<br>
                            <strong>Even:</strong> x=1,3,5,7,9 (perda) | o=0,2,4,6,8 (ganho)<br>
                            <strong>Match 3:</strong> x=0,1,2,4,5,6,7,8,9 (perda) | o=3 (ganho)
                        </div>
                        <div class="code-block">
                            * Entrar Over 4 quando 5 últimos dígitos = x<br>
                            * Entrar Odd quando último dígito = o<br>
                            * Match 3 quando padrão x-o-x
                        </div>
                    </div>

                    <div class="rule-type highlight">
                        <h4>14. ÚLTIMOS X DÍGITOS = (LISTA PERMITIDA) 🆕</h4>
                        <p>Verifica se TODOS os últimos N dígitos estão em uma lista de dígitos permitidos.</p>
                        <div class="code-block">
                            * Entrar quando os ultimos 3 digitos = (2,4,7,6,9)<br>
                            * Quando os ultimos 5 digitos forem (1,3,5,7,9)<br>
                            * Se os ultimos 2 digitos = (0,2,4,6,8)<br>
                            * Ultimos 4 digitos sejam (2,4,7)
                        </div>
                        <p><strong>Como funciona:</strong> Cada dígito individual deve estar na lista. Pode repetir!</p>
                        <p><strong>Exemplos válidos</strong> para "ultimos 3 = (2,4,7,6,9)":</p>
                        <div class="code-block">
                            ✅ 2,2,2 - todos são 2 (está na lista)<br>
                            ✅ 2,4,7 - todos estão na lista<br>
                            ✅ 7,7,9 - todos estão na lista<br>
                            ✅ 4,2,6 - todos estão na lista<br>
                            ✅ 9,4,2 - todos estão na lista<br>
                            ❌ 2,4,1 - o 1 NÃO está na lista<br>
                            ❌ 3,7,9 - o 3 NÃO está na lista
                        </div>
                    </div>
                </div>

                <h4>💡 Operadores Suportados:</h4>
                <div class="operators-list">
                    <code>></code> maior que, acima de<br>
                    <code><</code> menor que, abaixo de<br>
                    <code>=</code> igual a, igual<br>
                    <code>>=</code> maior ou igual, maior igual<br>
                    <code><=</code> menor ou igual, menor igual<br>
                    <code>!=</code> diferente de, diferente, não igual
                </div>
            </div>

            <div class="manual-section">
                <h3>🎯 Padrões de Dígitos Avançados (XO)</h3>
                <p>O sistema reconhece padrões complexos usando X (dígitos iguais) e O (dígitos diferentes):</p>

                <h4>📋 Padrões Básicos (4 dígitos):</h4>
                <div class="pattern-examples">
                    <div class="pattern-item">
                        <strong>XXOX:</strong> 3 iguais, 1 diferente, volta ao igual
                        <br><code>Exemplo: 5-5-2-5 ou 8-8-1-8</code>
                    </div>
                    <div class="pattern-item">
                        <strong>XOXO:</strong> Alternado entre 2 dígitos
                        <br><code>Exemplo: 4-7-4-7 ou 1-9-1-9</code>
                    </div>
                    <div class="pattern-item">
                        <strong>XXXO:</strong> 3 iguais seguidos, 1 diferente
                        <br><code>Exemplo: 6-6-6-2 ou 0-0-0-8</code>
                    </div>
                    <div class="pattern-item">
                        <strong>OXXX:</strong> 1 diferente, 3 iguais seguidos
                        <br><code>Exemplo: 3-7-7-7 ou 9-1-1-1</code>
                    </div>
                </div>

                <h4>📋 Padrões Intermediários (5 dígitos):</h4>
                <div class="pattern-examples">
                    <div class="pattern-item">
                        <strong>XOXOX:</strong> Alternado com 3 dígitos
                        <br><code>Exemplo: 2-8-2-4-2 ou 5-1-5-9-5</code>
                    </div>
                    <div class="pattern-item">
                        <strong>OXOXO:</strong> Alternado iniciando diferente
                        <br><code>Exemplo: 7-3-7-1-7 ou 0-6-0-9-0</code>
                    </div>
                    <div class="pattern-item">
                        <strong>XXOOX:</strong> 2 iguais, 2 diferentes, volta ao igual
                        <br><code>Exemplo: 4-4-8-1-4 ou 9-9-2-5-9</code>
                    </div>
                    <div class="pattern-item">
                        <strong>OXXOX:</strong> Diferente, 2 iguais, diferente, igual
                        <br><code>Exemplo: 6-3-3-7-3 ou 1-8-8-4-8</code>
                    </div>
                </div>

                <h4>📋 Padrões Avançados (6+ dígitos):</h4>
                <div class="pattern-examples">
                    <div class="pattern-item">
                        <strong>XXXXOO:</strong> 4 iguais, 2 diferentes
                        <br><code>Exemplo: 7-7-7-7-3-1</code>
                    </div>
                    <div class="pattern-item">
                        <strong>OOXXXX:</strong> 2 diferentes, 4 iguais
                        <br><code>Exemplo: 5-9-2-2-2-2</code>
                    </div>
                    <div class="pattern-item">
                        <strong>XOXOXO:</strong> Alternado longo
                        <br><code>Exemplo: 1-6-1-8-1-4</code>
                    </div>
                </div>

                <h4>💡 Dicas para Usar Padrões:</h4>
                <ul>
                    <li><strong>X</strong> = Dígitos que se repetem no padrão</li>
                    <li><strong>O</strong> = Dígitos diferentes dos que se repetem</li>
                    <li>Comece com padrões simples (4-5 dígitos)</li>
                    <li>Teste em modo simulação primeiro</li>
                    <li>Combine com outras regras para maior precisão</li>
                </ul>
            </div>

            <div class="manual-section">
                <h3>🔗 Sistema de Grupos de Regras</h3>

                <h4>🟢 Regras AND (Todas devem ser atendidas):</h4>
                <div class="rule-group-example">
                    <p><strong>Exemplo:</strong></p>
                    <div class="code-block">
                        "Se o último dígito for par, RSI estiver acima de 70, o preço subir 0.3%"
                    </div>
                    <p>Com a divisão das regras por vírgula(,), todas as condições devem ser verdadeiras simultaneamente.</p>
                </div>

                <h4>🔵 Regras OR (Pelo menos uma deve ser atendida):</h4>
                <div class="rule-group-example">
                    <p><strong>Exemplo:</strong></p>
                    <div class="code-block">
                        "* Se o último dígito for 0"
                    </div>
                    <div class="code-block">
                        "* Se Rsi > 80"
                    </div>
                    <p>Quando vc usa "Enter" e cria uma nova regra, o sistema entende como um novo grupo de regras, nesse caso, qualquer uma das condições sendo verdadeira já executa o trade.</p>
                </div>

                <h4>🔄 Grupos Mistos:</h4>
                <div class="rule-group-example">
                    <p><strong>Exemplo Complexo:</strong></p>
                    <div class="code-block">
                        "* Se o dígito for par, RSI > 70"
                    </div>
                    <div class="code-block">
                        "* Se o preço subir 10%"
                    </div>
                    <p>Use simbolos como (>, <, =) para formar suas regras</p>
                </div>
            </div>

            <div class="manual-section">
                <h3>📊 Indicadores Reconhecidos</h3>

                <div class="indicators-list">
                    <div class="indicator-item">
                        <strong>RSI (Índice de Força Relativa):</strong>
                        <ul>
                            <li>"RSI acima de 70" (sobrecomprado)</li>
                            <li>"RSI abaixo de 30" (sobrevendido)</li>
                            <li>"RSI entre 40 e 60" (neutro)</li>
                        </ul>
                    </div>

                    <div class="indicator-item">
                        <strong>SMA (Média Móvel Simples):</strong>
                        <ul>
                            <li>"Preço acima da SMA20"</li>
                            <li>"SMA10 cruzando SMA20"</li>
                            <li>"Média móvel ascendente"</li>
                        </ul>
                    </div>

                    <div class="indicator-item">
                        <strong>Volatilidade:</strong>
                        <ul>
                            <li>"Suporte e Resistência"</li>
                            <li>"Alta volatilidade"</li>
                            <li>"Mercado calmo"</li>
                            <li>"Movimento brusco"</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="manual-section">
                <h3>⚙️ Configurações de Trade</h3>

                <h3>📋 Tipos de Contratos</h3>
            <div class="help-section">
                <p><strong>Over/Under:</strong> Aposta se o último dígito será maior ou menor que um valor específico.</p>
                <p><strong>Differ/Match:</strong> Aposta se o último dígito será diferente ou igual a um valor específico.</p>
                <p><strong>Even/Odd:</strong> Aposta se o último dígito será par ou ímpar.</p>
                <p><strong>Call/Put:</strong> Aposta na direção do preço (subir ou descer).</p>

                <h4>🎯 Modo "Ambos"</h4>
                <p>Quando você seleciona "Ambos" no Tipo Trade, o sistema oferece duas opções:</p>

                <p><strong>1. Regras Específicas:</strong> Especifique qual contrato usar em cada regra:</p>
                <div class="code-example">
                    <pre>* Entrar em Over quando o ultimo digito > 5
* Entrar em Under quando o percentual dos digitos abaixo de 3 > 70%</pre>
                </div>

                <p><strong>2. Trades Simultâneos:</strong> Se não especificar o contrato nas regras, o sistema executará ambos os contratos simultaneamente quando as condições forem atendidas.</p>

                <p><strong>Palavras-chave reconhecidas:</strong></p>
                <ul>
                    <li><strong>Over/Under:</strong> "over", "under", "maior", "menor", "acima", "abaixo"</li>
                    <li><strong>Call/Put:</strong> "call", "put", "subir", "descer", "alta", "baixa"</li>
                    <li><strong>Differ/Match:</strong> "differ", "match", "diferente", "igual"</li>
                    <li><strong>Even/Odd:</strong> "even", "odd", "par", "ímpar"</li>
                </ul>
            </div>

                <h4>⏱️ Durações Disponíveis:</h4>
                <ul>
                    <li>1 a 10 ticks (movimentos do preço)</li>
                    <li>15 segundos a 5 minutos</li>
                    <li>Configurável nos campos de duração</li>
                </ul>

                <h4>💰 Gestão de Risco:</h4>
                <ul>
                    <li><strong>Valor de Entrada:</strong> Defina o valor fixo por trade</li>
                    <li><strong>Valor Stop Loss:</strong> Pare após X valor negativo atingido</li>
                    <li><strong>Valor da Meta:</strong> Pare após X valor positivo atingido</li>
                    <li><strong>Previsão:</strong> Defina o dígito da negociação</li>
                    <li><strong>Ajuste de Gale:</strong> Multiplicador para recuperação de perdas (0.0 a 5.0, padrão: 1.0)</li>
                    <li><strong>Tempo Delay:</strong> Ticks extras após a duração do contrato (padrão: 3 ticks)</li>
                    <li><strong>Vitórias Reais:</strong> Pare ou mude para Simulação após X ganhos reais consecutivos</li>
                    <li><strong>Perdas Reais:</strong> Pare ou mude para Simulação após X perdas reais consecutivas</li>
                    <li><strong>Vitórias Simuladas:</strong> Mude para Trades reais após X ganhos simulados consecutivos</li>
                    <li><strong>Perdas Simuladas:</strong> Mude para Trades reais após X perdas simuladas consecutivas</li>
                    <li><strong>Limite de Trades:</strong> Número máximo de trades a executar (0 = ilimitado)</li>
                </ul>
            </div>

            <div class="manual-section">
                <h3>🔄 Modos de Trading</h3>

                <div class="trading-modes">
                    <div class="mode-item simulacao">
                        <h4>🟡 SIMULAÇÃO</h4>
                        <p>Testa estratégias sem risco real. Usa dados de mercado reais mas não executa trades de verdade.</p>
                    </div>

                    <div class="mode-item virtual">
                        <h4>🟢 VIRTUAL</h4>
                        <p>Executa trades reais na conta demo da Deriv. Usa dinheiro virtual para testes realistas.</p>
                    </div>

                    <div class="mode-item real">
                        <h4>🔴 REAL</h4>
                        <p>Executa trades com dinheiro real. Use apenas após testar completamente sua estratégia.</p>
                    </div>
                </div>
            </div>

            <div class="manual-section">
                <h3>🎮 Como Usar o Sistema</h3>

                <div class="step-by-step">
                    <div class="step">
                        <h4>1️⃣ Configuração Inicial</h4>
                        <ul>
                            <li>Escolha o símbolo de trading (ex: Volatility 75)</li>
                            <li>Defina o tipo de contrato</li>
                            <li>Configure duração, valor da aposta etc...</li>
                        </ul>
                    </div>

                    <div class="step">
                        <h4>2️⃣ Criação da Estratégia</h4>
                        <ul>
                            <li>Escreva sua estratégia em linguagem natural</li>
                            <li>Use palavras-chave como "Se", "Quando", "Maior", "Menor"</li>
                            <li>Seja específico com valores e condições</li>
                        </ul>
                    </div>

                    <div class="step">
                        <h4>3️⃣ Teste e Monitoramento</h4>
                        <ul>
                            <li>Clique em "Iniciar Monitoramento"</li>
                            <li>Observe as regras sendo avaliadas em tempo real</li>
                            <li>Acompanhe os resultados na seção de mensagens</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="manual-section">
                <h3>💡 Dicas Avançadas</h3>

                <ul>
                    <li><strong>Seja Específico:</strong> "RSI acima de 70" é melhor que "RSI alto"</li>
                    <li><strong>Teste Gradualmente:</strong> Comece com estratégias simples</li>
                    <li><strong>Use vírgula(,):</strong> Para agrupar condições complexas</li>
                    <li><strong>Monitore Resultados:</strong> Analise os logs de trade para otimizar</li>
                    <li><strong>Gestão de Risco:</strong> Sempre defina limites de perda</li>
                </ul>
            </div>

            <div class="manual-section warning">
                <h3>⚠️ Avisos Importantes</h3>
                <ul>
                    <li>Trading envolve riscos. Nunca invista mais do que pode perder</li>
                    <li>Teste sempre em modo simulação primeiro</li>
                    <li>A IA interpreta estratégias, mas você é responsável pelos resultados</li>
                    <li>Monitore sempre seus trades ativamente</li>
                </ul>
            </div>

            <div class="manual-section">
                <h3>💸 Créditos e Custos</h3>
                <p>Entenda como os créditos funcionam e quais são os custos associados ao uso da plataforma.</p>
                <div class="credits-cost-list">
                    <div class="cost-item">
                        <strong>Créditos para Tradução de Estratégias:</strong>
                        <p>Cada tradução de estratégia com a IA consome créditos. Isso nos ajuda a manter a infraestrutura de IA funcionando.</p>
                        <p>Custo: <strong>1 crédito fixo</strong> por tradução bem-sucedida.</p>
                        <p><strong>💡 Importante:</strong> Se a IA falhar e o sistema usar o fallback, <strong>NÃO são cobrados créditos</strong>!</p>
                    </div>
                    <div class="cost-item">
                        <strong>Análise de Risco com IA:</strong>
                        <p>O Filtro de Risco analisa o mercado periodicamente usando IA.</p>
                        <p>Custo: Incluído no sistema, sem custo adicional por análise.</p>
                        <p><strong>💡 Fallback:</strong> Se a análise falhar, o sistema usa parâmetros padrão sem cobrar créditos.</p>
                    </div>
                    <div class="cost-item">
                        <strong>Execução de Trades:</strong>
                        <p>A execução de trades em modo REAL ou SIMULADO não consome créditos.</p>
                        <p>Custo: <strong>Gratuito</strong> - os créditos são cobrados apenas na criação/tradução de estratégias.</p>
                    </div>
                    <div class="cost-item">
                        <strong>Créditos Gratuitos:</strong>
                        <p>Ao se registrar, você recebe uma quantidade inicial de créditos gratuitos para experimentar o sistema.</p>
                        <p>Quantidade inicial: <strong>10 créditos de Boas-Vindas!</strong></p>
                    </div>
                    <div class="cost-item">
                        <strong>Cache de Traduções:</strong>
                        <p>O sistema salva suas traduções em cache. Se você usar a mesma estratégia novamente, <strong>não são cobrados créditos</strong>!</p>
                        <p><strong>💡 Dica:</strong> Reutilize estratégias que funcionam para economizar créditos.</p>
                    </div>
                </div>
                <h4>💡 Dicas para Gerenciar Créditos:</h4>
                <ul>
                    <li>Teste suas estratégias em modo simulação antes de traduzir</li>
                    <li>Reutilize estratégias que já foram traduzidas (cache automático)</li>
                    <li>Otimize suas regras para reduzir a necessidade de recriação</li>
                    <li>Monitore o consumo de créditos no seu painel</li>
                    <li>Considere planos de assinatura para um fluxo contínuo de créditos</li>
                </ul>
            </div>

            <div class="manual-section">
                <h3>📝 Como Escrever Regras para a IA</h3>
                <p>A IA foi treinada para entender linguagem natural. Siga estas diretrizes para obter os melhores resultados:</p>
                <div class="code-example">
                    <pre><strong>Exemplo de Regra Simples:</strong>
"Se o último dígito for 7"

<strong>Exemplo de Regra com Indicador:</strong>
"Quando RSI for menor que 30 e o preço subir 0.2%"

<strong>Exemplo de Regra com Padrão de Dígito:</strong>
"Se o padrão dos dígitos for XXOX"

<strong>Exemplo de Regra Temporal:</strong>
"Nos primeiros 10 ticks da vela"
</pre>
                </div>
                <h4>✅ Boas Práticas:</h4>
                <ul>
                    <li><strong>Clareza:</strong> Use frases diretas e objetivas.</li>
                    <li><strong>Especificidade:</strong> Mencione valores exatos (ex: "maior que 5", "menor que 0.5%").</li>
                    <li><strong>Contexto:</strong> Inclua o tipo de contrato (Over/Under, Call/Put) se necessário.</li>
                    <li><strong>Combinação:</strong> Use vírgulas para conectar condições múltiplas (AND).</li>
                    <li><strong>Alternativas:</strong> Use um novo parágrafo ou asterisco (*) para condições OR.</li>
                </ul>
                <h4>❌ O que Evitar:</h4>
                <ul>
                    <li>Ambiguidade: "Preço está bom"</li>
                    <li>Generalizações: "Se subir muito"</li>
                    <li>Erros de digitação: Verifique a ortografia.</li>
                </ul>
            </div>

            <div class="manual-section highlight">
                <h3>🆕 NOVIDADE: Dígitos Isolados</h3>
                <p>Detecte ocorrências não consecutivas de dígitos que atendem a uma condição.</p>
                <div class="code-block">
                    * Entrar quando 4 digitos isolados > 6<br>
                    * Entrar quando o digito acima de 7 >= 5 isolados
                </div>
                <p><strong>Como funciona:</strong> O sistema conta quantos dígitos atenderam à condição (ex: > 6) mas zera a contagem se dois dígitos seguidos atenderem à condição.</p>
                <p>Disponível visual: <code>🔴/🟢 ÚltimoDígito (IsoladosAcumulados)</code></p>
            </div>

            <div class="manual-section">
                <h3>🆕 Definição de Contratos nas Regras</h3>
                <p>Agora você pode especificar o tipo de contrato diretamente na regra!</p>
                <div class="code-block">
                    * Entrar <strong>Over 2</strong> quando 4 digitos isolados > 6<br>
                    * Entrar <strong>Odd</strong> quando o digito acima de 7 >= 5 isolados<br>
                    * Entrar <strong>Match 3</strong> se o ultimo digito for 3
                </div>
                <p>Isso permite criar estratégias híbridas que usam diferentes contratos para diferentes condições.</p>
            </div>

            <div class="manual-section">
                <h3>🆕 Ativação de Grupos de Regras</h3>
                <p>Controle exatamente quando cada grupo de regras deve ser usado:</p>
                <ul>
                    <li><strong>Início:</strong> O grupo é usado desde o primeiro trade.</li>
                    <li><strong>Após Win:</strong> O grupo só ativa após uma vitória (real ou simulada).</li>
                    <li><strong>Após Loss:</strong> O grupo só ativa após uma derrota (real ou simulada).</li>
                </ul>
                <p><strong>Exemplo de Estratégia de Recuperação:</strong></p>
                <ol>
                    <li>Crie um grupo conservador e marque "Início" e "Após Win".</li>
                    <li>Crie um grupo agressivo (Gale) e marque APENAS "Após Loss".</li>
                </ol>
            </div>

            <div class="manual-section">
                <h3>🆕 Previsão Dinâmica de Probabilidade</h3>
                <p>Use a IA estatística para entrar a favor da probabilidade.</p>
                <div class="code-block">
                    * Entrar quando o ultimo digito = <strong>maior chance</strong><br>
                    * Entrar quando o ultimo digito = <strong>menor chance</strong>
                </div>
                <p>O sistema calcula qual dígito tem a maior ou menor probabilidade baseada no histórico recente e faz a entrada automaticamente.</p>
            </div>

            <div class="manual-section">
                <h3>💡 Como a IA Entende e o que o Sistema Faz</h3>
                <p>Quando você cria uma regra, o sistema passa por um processo para entendê-la e executá-la:</p>
                <div class="keywords-grid">
                    <div class="keyword-group">
                        <h5>1. Processamento da Linguagem Natural (PLN)</h5>
                        <ul>
                            <li>A IA analisa sua frase para identificar palavras-chave, números, operadores e relações lógicas.</li>
                            <li>Ex: "Se o último dígito for maior que 5" -> (Condição: Último Dígito, Operador: >, Valor: 5)</li>
                        </ul>
                    </div>
                    <div class="keyword-group">
                        <h5>2. Validação da Regra</h5>
                        <ul>
                            <li>O sistema verifica se a regra é válida e compreensível.</li>
                            <li>Verifica se os indicadores ou padrões mencionados existem.</li>
                        </ul>
                    </div>
                    <div class="keyword-group">
                        <h5>3. Tradução para Código Executável</h5>
                        <ul>
                            <li>A regra interpretada é convertida em comandos que o sistema de trading pode executar.</li>
                            <li>Isso envolve a chamada de funções específicas para verificar condições e executar ordens.</li>
                        </ul>
                    </div>
                    <div class="keyword-group">
                        <h5>4. Execução e Monitoramento</h5>
                        <ul>
                            <li>O sistema monitora os dados de mercado em tempo real.</li>
                            <li>Quando as condições da regra são atendidas, o trade é executado (em modo real/virtual).</li>
                        </ul>
                    </div>
                    <div class="keyword-group">
                        <h5>5. Armazenamento e Log</h5>
                        <ul>
                            <li>Cada trade executado, bem-sucedido ou não, é registrado.</li>
                            <li>Esses logs são salvos para análise posterior e podem ser visualizados no seu histórico de trades.</li>
                        </ul>
                    </div>
                </div>
                <h4>✅ O que o Sistema Faz para Você:</h4>
                <ul>
                    <li>Interpreta sua estratégia escrita em linguagem natural.</li>
                    <li>Converte a estratégia em regras de trading acionáveis.</li>
                    <li>Monitora o mercado 24/7.</li>
                    <li>Executa trades automaticamente com base nas suas regras.</li>
                    <li>Gerencia riscos (Stop Loss, Take Profit).</li>
                    <li>Salva um histórico detalhado de todas as operações.</li>
                </ul>
            </div>

            <div class="manual-section">
                <h3>❓ Troubleshooting Comum</h3>
                <div class="troubleshooting-list">
                    <div class="problem-solution">
                        <strong>Problema:</strong> A regra não está sendo acionada.
                        <strong>Possíveis Causas:</strong>
                        <ul>
                            <li>A condição da regra é muito restritiva ou nunca ocorre.</li>
                            <li>Há um erro de digitação ou sintaxe na regra.</li>
                            <li>O tipo de contrato ou duração está incorreto.</li>
                            <li>O mercado não está apresentando as condições necessárias.</li>
                        </ul>
                        <strong>Solução:</strong>
                        <ul>
                            <li>Simplifique a regra ou teste com condições mais amplas.</li>
                            <li>Revise a escrita da regra cuidadosamente.</li>
                            <li>Verifique as configurações de contrato e duração.</li>
                            <li>Consulte o histórico de trades para ver se as condições foram atendidas.</li>
                        </ul>
                    </div>
                    <div class="problem-solution">
                        <strong>Problema:</strong> Erro ao criar uma regra.
                        <strong>Possíveis Causas:</strong>
                        <ul>
                            <li>A sintaxe da regra é inválida.</li>
                            <li>O indicador mencionado não é reconhecido ou está mal escrito.</li>
                            <li>Você excedeu o limite de regras (se aplicável).</li>
                        </ul>
                        <strong>Solução:</strong>
                        <ul>
                            <li>Verifique a seção "Como Escrever Regras para a IA".</li>
                            <li>Consulte a lista de indicadores reconhecidos.</li>
                            <li>Verifique seu limite de regras no painel.</li>
                        </ul>
                    </div>
                    <div class="problem-solution">
                        <strong>Problema:</strong> Trades estão sendo executados com valores incorretos.
                        <strong>Possíveis Causas:</strong>
                        <ul>
                            <li>Configurações de Valor de Entrada, Stop Loss ou Take Profit estão incorretas.</li>
                            <li>O modo de gerenciamento de risco não está configurado como esperado.</li>
                        </ul>
                        <strong>Solução:</strong>
                        <ul>
                            <li>Revise todas as configurações de gerenciamento de risco na seção "Configurações de Trade".</li>
                            <li>Certifique-se de que os valores de Stop Loss e Take Profit estejam definidos corretamente.</li>
                        </ul>
                    </div>
                    <div class="problem-solution">
                        <strong>Problema:</strong> Filtro de Risco não está ativando.
                        <strong>Possíveis Causas:</strong>
                        <ul>
                            <li>O intervalo de análise está muito alto.</li>
                            <li>Não há ticks suficientes sendo processados.</li>
                            <li>Erro de conexão com a API da IA.</li>
                        </ul>
                        <strong>Solução:</strong>
                        <ul>
                            <li>Reduza o intervalo de análise para 30-50 ticks.</li>
                            <li>Verifique se o monitoramento está ativo.</li>
                            <li>Aguarde alguns minutos e tente novamente.</li>
                            <li>O sistema usará fallback automático se houver erro.</li>
                        </ul>
                    </div>
                    <div class="problem-solution">
                        <strong>Problema:</strong> Não consigo trocar de conta.
                        <strong>Possíveis Causas:</strong>
                        <ul>
                            <li>Token da conta está expirado.</li>
                            <li>Conta não foi adicionada durante o login OAuth.</li>
                            <li>Erro de sincronização.</li>
                        </ul>
                        <strong>Solução:</strong>
                        <ul>
                            <li>Faça logout e login novamente.</li>
                            <li>Adicione a conta durante o processo de OAuth.</li>
                            <li>Verifique o status do token (ícone 🟢/🟡).</li>
                        </ul>
                    </div>
                    <div class="problem-solution">
                        <strong>Problema:</strong> Gale não está funcionando.
                        <strong>Possíveis Causas:</strong>
                        <ul>
                            <li>Multiplicador de Gale está em 0.0 (desativado).</li>
                            <li>Saldo insuficiente para o próximo trade.</li>
                            <li>Stop Loss foi atingido.</li>
                        </ul>
                        <strong>Solução:</strong>
                        <ul>
                            <li>Verifique se o Ajuste de Gale está > 0.0.</li>
                            <li>Certifique-se de ter saldo suficiente.</li>
                            <li>Ajuste o Stop Loss para permitir recuperação.</li>
                            <li>Use multiplicador 1.0 para cálculo exato.</li>
                        </ul>
                    </div>
                    <div class="problem-solution">
                        <strong>Problema:</strong> Trades estão muito lentos / sobrepostos.
                        <strong>Possíveis Causas:</strong>
                        <ul>
                            <li>Tempo de Delay muito baixo.</li>
                            <li>Duração do contrato muito curta.</li>
                            <li>Processamento de resultado lento.</li>
                        </ul>
                        <strong>Solução:</strong>
                        <ul>
                            <li>Aumente o Tempo Delay para 3-5 ticks.</li>
                            <li>Use durações maiores (5+ ticks).</li>
                            <li>Aguarde o overlay de cooldown desaparecer.</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    static attachEventListeners() {
        // Abrir modal
        document.addEventListener('click', (e) => {
            if (e.target.id === 'help-icon') {
                this.openModal();
            }

            // Fechar modal
            if (e.target.classList.contains('help-close-btn') ||
                e.target.closest('.help-close-btn') ||
                e.target.id === 'help-modal') {
                this.closeModal();
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen) {
                this.closeModal();
            }
        });
    }

    static openModal() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.isModalOpen = true;
            document.body.style.overflow = 'hidden';
        }
    }

    static closeModal() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.style.display = 'none';
            this.isModalOpen = false;
            document.body.style.overflow = 'auto';
        }
    }
}

// Inicializar apenas após o loading ser completamente finalizado
// Não inicializar automaticamente no DOMContentLoaded

// Exportar para uso global
window.HelpManual = HelpManual;

// Adicionar estilos CSS para as novas seções do manual
const styleTag = document.createElement('style');
styleTag.innerHTML = `
    /* Modal Structure Styles */
    .help-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: none;
        justify-content: center;
        align-items: center;
    }
    .help-modal-content {
        background: var(--modal-bg-dark);
        background-color: #0c1318; /* Fallback sólido */
        color: var(--modal-text);
        border: 1px solid var(--modal-border);
        border-radius: 15px;
        width: 90%;
        max-width: 1000px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .help-modal-header {
        padding: 20px;
        border-bottom: 1px solid var(--modal-border);
        background: var(--modal-header-bg);
        border-radius: 15px 15px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .help-modal-header h2 {
        margin: 0;
        color: var(--modal-text);
    }
    .help-close-btn {
        color: var(--modal-text);
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
    }
    .help-modal-body {
        padding: 20px;
        overflow-y: auto;
        background-color: #0c1318; /* Fundo sólido */
    }

    .credits-cost-list {
        background: var(--modal-input-bg);
        padding: 15px;
        border-radius: 8px;
        margin: 10px 0;
    }

    .cost-item {
        margin-bottom: 12px;
        padding: 8px;
        background: var(--modal-bg-dark);
        border-radius: 5px;
        border-left: 4px solid var(--primary-color);
        color: var(--modal-text);
    }

    .cost-item:last-child {
        margin-bottom: 0;
    }

    .code-example {
        background: var(--modal-input-bg);
        border: 1px solid var(--modal-border);
        border-radius: 5px;
        padding: 12px;
        margin: 10px 0;
        font-family: 'Courier New', monospace;
    }

    .code-example pre {
        margin: 0;
        white-space: pre-wrap;
        color: var(--modal-text);
    }

    .keywords-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin: 15px 0;
    }

    .keyword-group {
        background: var(--modal-input-bg);
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--modal-border);
    }

    .keyword-group h5 {
        margin: 0 0 8px 0;
        color: var(--primary-color);
        font-size: 0.95em;
    }

    .keyword-group ul {
        margin: 0;
        padding-left: 15px;
    }

    .keyword-group li {
        font-size: 0.9em;
        margin-bottom: 3px;
    }

    .digit-rules-examples {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
        margin: 15px 0;
    }

    .rule-example {
        background: var(--modal-input-bg);
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--warning-color);
    }

    .rule-example strong {
        color: var(--warning-color);
        display: block;
        margin-bottom: 5px;
    }

    .rule-example code {
        background: var(--modal-bg-dark);
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 0.85em;
        display: block;
        margin: 2px 0;
    }

    .troubleshooting-list {
        margin: 15px 0;
    }

    .problem-solution {
        background: var(--modal-input-bg);
        border: 1px solid var(--danger-color);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
    }

    .problem-solution strong:first-child {
        color: #c53030;
    }

    .problem-solution strong:last-of-type {
        color: #38a169;
    }

    /* Responsividade para mobile */
    @media (max-width: 768px) {
        .keywords-grid {
            grid-template-columns: 1fr;
        }

        .digit-rules-examples {
            grid-template-columns: 1fr;
        }
    }

    /* Estilos para Referência Completa de Regras */
    .rules-reference {
        margin: 20px 0;
    }

    .rule-type {
        background: var(--modal-input-bg);
        border: 1px solid var(--modal-border);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        transition: all 0.3s ease;
    }

    .rule-type:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transform: translateY(-2px);
    }

    .rule-type h4 {
        margin: 0 0 8px 0;
        color: var(--primary-color);
        font-size: 1.1em;
        border-bottom: 2px solid var(--primary-color);
        padding-bottom: 5px;
    }

    .rule-type p {
        margin: 8px 0;
        color: var(--modal-text);
        font-size: 0.95em;
    }

    .rule-type .code-block {
        background: var(--modal-bg-dark);
        border-left: 4px solid var(--primary-color);
        padding: 12px;
        margin: 10px 0;
        font-family: 'Courier New', monospace;
        font-size: 0.9em;
        line-height: 1.8;
        border-radius: 4px;
        color: var(--modal-text);
    }

    .rule-type.highlight {
        background: var(--modal-input-bg);
        border: 2px solid var(--primary-color);
    }

    .rule-type.highlight h4 {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
    }

    .rule-type.highlight .code-block {
        border-left-color: var(--primary-color);
        background: var(--modal-bg-dark);
    }

    .rule-type.warning {
        background: var(--modal-input-bg);
        border: 2px solid var(--warning-color);
    }

    .rule-type.warning h4 {
        color: var(--warning-color);
        border-bottom-color: var(--warning-color);
    }

    .rule-type.warning .code-block {
        border-left-color: var(--warning-color);
        background: var(--modal-bg-dark);
    }

    .operators-list {
        background: var(--modal-input-bg);
        padding: 15px;
        border-radius: 8px;
        margin: 10px 0;
        border-left: 4px solid var(--secondary-color);
    }

    .operators-list code {
        background: var(--modal-bg-dark);
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: bold;
        color: var(--secondary-color);
    }
`;
document.head.appendChild(styleTag);