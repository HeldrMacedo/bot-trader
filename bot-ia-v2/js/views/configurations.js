// js/views/configurations.js
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class ConfigurationsView {
    // 🎯 FUNÇÃO UTILITÁRIA: Obter ativo selecionado (SEM FALLBACKS)
    static getSelectedSymbol() {
        const globalSymbol = window.selectedSymbol;
        const sessionSymbol = SessionManager.getSessionData('selected_symbol');
        const selectedSymbol = globalSymbol || sessionSymbol;

        if (!selectedSymbol) {
            CommonHelpers.showError('❌ [GET SYMBOL] CRÍTICO: Nenhum ativo selecionado!');
            throw new Error('ERRO CRÍTICO: Nenhum ativo foi selecionado na inicialização. Recarregue a página.');
        }

        return selectedSymbol;
    }

    // Renderiza a interface de configurações no elemento container
    static async render(containerId) {

        const container = CommonHelpers.getElement(containerId);
        if (!container) {
            CommonHelpers.showError('❌ [CONFIG RENDER] Container não encontrado:', containerId);
            return;
        }

        // ✅ Verificar se já foi renderizado
        const existingDropdown = container.querySelector('#contract-select');
        if (existingDropdown) {
            // ✅ CORREÇÃO CRÍTICA: Garantir que símbolos sejam carregados e setup executado
            if (!ConfigurationsView.availableSymbols || ConfigurationsView.availableSymbols.length === 0) {
                await ConfigurationsView.loadSymbols();
            }
            ConfigurationsView.setupAssetDisplay();
            return;
        }


        container.innerHTML = `
            <!-- 🎯 BLOCO 1: SELETOR DE CONTAS - ACIMA DAS CONFIGURAÇÕES -->
            <div class="block-content account-selector-block">
                <div class="account-selector-display">
                    <div class="dropdown-wrapper asset-dropdown">
                        <button class="account-dropdown-btn asset-account-selector">
                            <span id="current-account-display">💎 Carregando...</span>
                            <span class="dropdown-arrow">▲</span>
                        </button>
                        <div class="account-dropdown-content asset-account-dropdown">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- 💰 VISOR DE SALDO - ABAIXO DO DROPDOWN -->
                    <div class="balance-display-wrapper" id="balance-display-wrapper" title="Clique para atualizar saldo">
                        <div class="balance-icon">💰</div>
                        <div class="balance-info">
                            <div class="balance-label">Saldo da Conta</div>
                            <div class="balance-value" id="header-balance-value">
                                <span class="balance-currency">USD</span>
                                <span class="balance-amount">0.00</span>
                            </div>
                        </div>
                        <div class="balance-refresh-icon" id="balance-refresh-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 10C21 10 18.995 7.26822 17.3662 5.63824C15.7373 4.00827 13.4864 3 11 3C6.02944 3 2 7.02944 2 12C2 16.9706 6.02944 21 11 21C15.1031 21 18.5649 18.2543 19.6482 14.5M21 10V4M21 10H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 🎯 BLOCO 2: CONFIGURAÇÕES - BLOCO DO MEIO -->
            <div class="block-content">
                <div class="trade-settings-group">

                    <!-- SEPARADOR: TRADE (Gradiente Escurecido e Altura Reduzida) -->
                    <div style="width: 100%; padding: 6px; text-align: center; border-radius: 8px; font-weight: bold; color: white; margin: 0 0 15px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-shadow: 0 1px 2px rgba(0,0,0,0.2); background: linear-gradient(135deg, #0cebeb 0%, #024a43 100%); position: relative;">
                        <button id="trade-tutorial-btn" title="Ver Tutorial em Vídeo" style="position: absolute; top: 50%; left: 8px; transform: translateY(-50%); background: transparent; border: none; border-radius: 4px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; padding: 0; z-index: 10;">
                            <img src="media/youtube-btn.png" style="width: 75%; height: 75%; object-fit: contain;">
                        </button>
                        💰 Trade
                    </div>

                    <!-- DROPDOWN DE CONTRATOS MOVIDO PARA DENTRO DO BLOCO -->
                    <div class="form-group-inline">
                        <label for="contract-select">Contrato:</label>
                        <select id="contract-select" class="form-control" disabled onchange="ConfigurationsView.validateAndSaveDuration();">
                            <option value="">Carregando contratos...</option>
                        </select>
                    </div>
                    <div class="form-group-inline">
                        <label for="trade-type-select">Tipo Trade:</label>
                        <select id="trade-type-select" class="form-control" disabled onchange="ConfigurationsView.saveCurrentConfiguration();">
                            <option value="">Selecione um contrato primeiro</option>
                        </select>
                    </div>
                       <div class="form-group-inline">
                        <label for="duration-input">Duração:</label>
                        <input type="number" id="duration-input" class="form-control" value="1" min="1" onchange="ConfigurationsView.validateAndSaveDuration();">
                        <select id="duration-unit-select" class="form-control" onchange="ConfigurationsView.validateAndSaveDuration();">
                            <option value="t" selected>Ticks</option>
                            <option value="s">Segundos</option>
                            <option value="m">Minutos</option>
                            <option value="h">Horas</option>
                        </select>
                    </div>

                    <!-- PREVISÃO (MOVIDO PARA SEÇÃO TRADE) -->
                    <div id="prediction-barrier-container" class="form-group-inline">
                        <label for="prediction-input">Previsão:</label>
                        <input type="text" id="prediction-input" class="form-control" value="0" placeholder="Ex: 0, 1, 2, 3..." onchange="ConfigurationsView.saveCurrentConfiguration();">
                    </div>

                    <!-- SEPARADOR: GESTÃO (Gradiente Escurecido e Altura Reduzida) -->
                    <div style="width: 100%; padding: 6px; text-align: center; border-radius: 8px; font-weight: bold; color: white; margin: 20px 0 15px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-shadow: 0 1px 2px rgba(0,0,0,0.2); background: linear-gradient(135deg, #11998e 0%, #06423b 100%);">
                        📚 Gestão
                    </div>

                    <div class="form-group-inline">
                        <label for="stake-input" class="notranslate" translate="no">Valor de Entrada:</label>
                        <input type="number" id="stake-input" class="form-control" value="0.35" min="0.35" step="0.01" onchange="ConfigurationsView.saveCurrentConfiguration();">
                    </div>
                    <div class="form-group-inline">
                        <label for="goal-input">Valor da Meta:</label>
                        <input type="number" id="goal-input" class="form-control" value="1" onchange="ConfigurationsView.saveCurrentConfiguration();">
                    </div>
                    <div class="form-group-inline">
                        <label for="stop-loss-input">Valor Stop Loss:</label>
                        <input type="number" id="stop-loss-input" class="form-control" value="100" onchange="ConfigurationsView.saveCurrentConfiguration();">
                    </div>

                    <div class="form-group-inline">
                        <label for="gale-multiplier-input" class="notranslate" translate="no">Ajuste de Gale:</label>
                        <div class="input-with-action" style="display: flex; gap: 2px; align-items: center; width: 100%;">
                            <input type="number" id="gale-multiplier-input" class="form-control" value="1.0" min="0" max="5.0" step="0.1" title="Multiplicador do cálculo automático de recuperação" onchange="ConfigurationsView.saveCurrentConfiguration();" style="flex: 0.7;">

                            <!-- ➗ SELETOR HÍBRIDO: THRESHOLD + DIVISÃO -->
                            <div class="split-gale-container" style="flex: 2.0; display: flex; position: relative;">
                                <!-- Input do Gatilho (Threshold) -->
                                <input type="number" id="gale-split-threshold" class="form-control" 
                                       placeholder="$0.00" 
                                       title="Valor mínimo de perda acumulada para iniciar a divisão (Gatilho)" 
                                       onchange="ConfigurationsView.saveCurrentConfiguration();" 
                                       style="width: 70%; border-top-right-radius: 0; border-bottom-right-radius: 0; border-right: none;">

                                <!-- Botão Trigger do Dropdown -->
                                <div class="split-dropdown-trigger" id="split-selector-btn" 
                                     title="Selecionar quantidade de parcelas da divisão"
                                     onclick="ConfigurationsView.toggleSplitDropdown();"
                                     style="width: 30%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-left: 1px solid rgba(255,255,255,0.1); border-radius: 0 8px 8px 0; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.9em; user-select: none;">
                                    <span id="split-value-display">1</span>
                                    <span style="font-size: 0.8em; margin-left: 4px;">▼</span>
                                </div>

                                <!-- Menu Dropdown Customizado -->
                                <div id="split-dropdown-menu" class="split-dropdown-menu" style="display: none; position: absolute; top: 100%; right: 0; width: 100%; background: #2c3e50; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; z-index: 100; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.3); margin-top: 5px;">
                                    <!-- Options populated by JS -->
                                </div>

                                <!-- Input Oculto para armazenar valor real da divisão -->
                                <input type="hidden" id="gale-split-input" value="1">
                            </div>
                        </div>
                    </div>

                    <!-- Qtde Soros (MOVIDO PARA SEÇÃO GESTÃO) -->
                    <div class="form-group-inline">
                        <label for="soros-limit-input" class="notranslate" translate="no">Qtde Soros:</label>
                        <div class="input-with-action" style="display: flex; gap: 2px; align-items: center; width: 100%;">
                            <input type="number" id="soros-limit-input" class="form-control" value="0" min="0" step="1" oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();" title="Defina quantas vitórias seguidas usarão lucro acumulado (0 = Desativado)" style="flex: 0 0 20%;">
                            <input type="number" id="soros-profit-percentage" class="form-control" value="100" min="0" max="100" step="1" oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();" title="Porcentagem do lucro a ser reinvestida na próxima stake (%)" placeholder="100%" style="flex: 1;">
                            <input type="checkbox" id="gale-removes-soros" onchange="ConfigurationsView.saveCurrentConfiguration();" title="🛡️ Proteger Soros: Remove o acréscimo do Soros ao calcular o Gale (usa apenas stake base)" style="cursor: pointer; width: 14px; height: 14px; margin: 0; flex-shrink: 0;">
                        </div>
                    </div>

                    <!-- SEPARADOR: CONTROLE (AMARELO -> ESCURO e Altura Reduzida) -->
                    <div style="width: 100%; padding: 6px; text-align: center; border-radius: 8px; font-weight: bold; color: white; margin: 20px 0 15px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-shadow: 0 1px 2px rgba(0,0,0,0.2); background: linear-gradient(135deg, #FFD700 0%, #3E2723 100%);">
                        🥞 Controle
                    </div>

                    <div class="form-group-inline">
                        <label for="win-real-input">Vitórias Reais:</label>
                        <input type="number" id="win-real-input" class="form-control" value="5" min="0" step="1" oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();" title="Apenas números inteiros">
                    </div>
                    <div class="form-group-inline">
                        <label for="loss-real-input">Perdas Reais:</label>
                        <input type="number" id="loss-real-input" class="form-control" value="1" min="0" step="1" oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();" title="Apenas números inteiros">
                    </div>
                    <div class="form-group-inline">
                        <label for="win-simulated-input">Vitórias Simuladas:</label>
                        <input type="number" id="win-simulated-input" class="form-control" value="0" min="0" step="1" oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();" title="Apenas números inteiros">
                    </div>
                    <div class="form-group-inline">
                        <label for="loss-simulated-input">Perdas Simuladas:</label>
                        <input type="number" id="loss-simulated-input" class="form-control" value="1" min="0" step="1" oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();" title="Apenas números inteiros">
                    </div>
                    <div class="form-group-inline">
                        <label for="trade-limit-input">Limite de Trades:</label>
                        <input type="number" id="trade-limit-input" class="form-control" value="0" min="0" step="1" oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();" title="Apenas números inteiros">
                    </div>
                    <div class="form-group-inline">
                        <label for="cooldown-period-input" class="notranslate" translate="no">Tempo Delay:</label>
                        <input type="number" id="cooldown-period-input" class="form-control" value="3" min="1" step="1" oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();" title="Ticks extras após duração do contrato">
                    </div>

                    <!-- Tempo de Pausa (Estilo Soros) -->
                    <div class="form-group-inline">
                        <label for="pause-time-input">Tempo Pausa:</label>
                        <div class="input-with-action" style="display: flex; gap: 2px; align-items: center; width: 100%;">
                            <input type="number" id="pause-time-input" class="form-control" value="" min="0" step="1" oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();" title="Tempo de pausa em minutos (Vazio = Desativado)" placeholder="Minutos" style="flex: 1;">
                            <input type="number" id="pause-trades-input" class="form-control" value="2" min="1" step="1" oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();" title="Quantidade de trades para ativar a pausa" placeholder="Trades" style="flex: 1;">
                            <input type="checkbox" id="pause-on-wins" onchange="ConfigurationsView.saveCurrentConfiguration();" title="Ativado = Ganhos, Desativado = Perdas (Padrão: Perdas)" style="cursor: pointer; width: 14px; height: 14px; margin: 0; flex-shrink: 0;">
                        </div>
                    </div>

                    <!-- Contar Dígitos Repetidos (GLOBAL) -->
                    <div class="form-group-inline">
                        <label for="count-repeated-digits-input">Contar Dig Repetido?</label>
                        <input type="checkbox" id="count-repeated-digits-input" checked onchange="ConfigurationsView.saveCurrentConfiguration();" title="Marcado = Contar dígitos repetidos consecutivos | Desmarcado = Pular dígitos repetidos" style="cursor: pointer; width: 18px; height: 18px;">
                    </div>

                    <!-- NOTIFICAÇÕES TELEGRAM -->
                     <div class="form-group-inline" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        <label for="telegram-token-input" style="color: #4CAF50;">Telegram Token:</label>
                        <!-- Envolto em form para evitar aviso do Chrome: "Password field is not contained in a form" -->
                        <form onsubmit="return false;" style="display: flex; width: 100%; position: relative; margin: 0;">
                            <input type="password" id="telegram-token-input" class="form-control" placeholder="Bot Token" onchange="ConfigurationsView.saveCurrentConfiguration();" title="Token do seu Bot do Telegram" autocomplete="new-password">
                            <button type="button" onclick="const el=document.getElementById('telegram-token-input'); el.type = el.type === 'password' ? 'text' : 'password';" style="background:none; border:none; cursor:pointer; color: #aaa; margin-left: -30px; z-index: 10;">👁️</button>
                        </form>
                    </div>
                    <div class="form-group-inline">
                        <label for="telegram-chat-id-input" style="color: #4CAF50;">Chat ID:</label>
                        <input type="text" id="telegram-chat-id-input" class="form-control" placeholder="Chat ID" onchange="ConfigurationsView.saveCurrentConfiguration();" title="ID do Chat para receber notificações">
                    </div>
                </div>
            </div>

            <!-- 🎯 BLOCO 3: VISOR DO ATIVO - ABAIXO DAS CONFIGURAÇÕES -->
            <div class="block-content asset-display-block">
                <div class="asset-display-content">
                    <span id="current-asset-name" class="asset-name">Carregando...</span>
                    <button id="change-asset-btn" class="change-asset-btn" title="Trocar Ativo">
                        🧿
                    </button>
                </div>
            </div>
        `;



        // Adicionar validação para campos de números inteiros
        setTimeout(async () => {
            ConfigurationsView.addIntegerValidation();
            ConfigurationsView.applyDefaultValues();
            ConfigurationsView.populateContractTypeOptions(); // Preencher opções de contrato

            // ✅ CORREÇÃO: Carregar símbolos PRIMEIRO, depois configurar display
            await ConfigurationsView.loadSymbols(); // Carregar símbolos para validação interna
            ConfigurationsView.setupAssetDisplay(); // ✅ NOVO: Configurar visor de ativo (após símbolos)
            ConfigurationsView.setupTutorialButtons(); // ✅ NOVO: Configurar botões de tutorial
        }, 100);
    }

    // ✅ NOVO: Configurar visor de ativo e botão de reinicialização
    static setupAssetDisplay() {
        const sessionSymbol = SessionManager.getSessionData('selected_symbol');
        const globalSymbol = window.selectedSymbol;
        const selectedSymbol = globalSymbol || sessionSymbol;


        if (!selectedSymbol) {
            CommonHelpers.showError('❌ [ASSET DISPLAY] ERRO CRÍTICO: Nenhum ativo selecionado!');
            alert('ERRO CRÍTICO: Nenhum ativo foi selecionado na inicialização.\n\nO sistema não pode continuar sem um ativo.');
            throw new Error('Ativo não selecionado');
        }

        // 💎 Popular dropdown de contas
        this.populateAssetAccountDropdown();

        // Atualizar visor do ativo
        const assetNameElement = CommonHelpers.getElement('current-asset-name');
        if (assetNameElement) {
            // Buscar nome amigável do ativo
            const symbolData = this.availableSymbols?.find(s => s.symbol === selectedSymbol);
            const displayName = symbolData?.display_name || selectedSymbol;

            assetNameElement.textContent = displayName;
            assetNameElement.title = `Código: ${selectedSymbol}`;

        }

        // Configurar botão de troca de ativo
        const changeBtn = CommonHelpers.getElement('change-asset-btn');
        if (changeBtn) {
            changeBtn.addEventListener('click', () => {
                this.handleAssetChangeRequest();
            });

        }

        // Configurar event listeners do dropdown de contas
        this.setupAssetAccountDropdownListeners();

        // 💰 NOVO: Configurar visor de saldo
        this.setupBalanceDisplay();

        // Carregar contratos para este ativo específico

        this.loadContractsForSymbol(selectedSymbol);
    }

    // 💰 NOVO: Configurar visor de saldo e atualização
    static setupBalanceDisplay() {
        const balanceWrapper = document.getElementById('balance-display-wrapper');
        const balanceRefreshBtn = document.getElementById('balance-refresh-btn');

        if (!balanceWrapper) return;

        // Atualizar saldo inicial
        this.updateBalanceDisplay();

        // Evento de clique para atualizar saldo
        balanceWrapper.addEventListener('click', async () => {
            await this.refreshBalance();
        });

        // Evento específico no botão de refresh
        if (balanceRefreshBtn) {
            balanceRefreshBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.refreshBalance();
            });
        }

        // Escutar evento global de atualização de saldo
        window.addEventListener('balanceUpdated', (event) => {
            this.updateBalanceDisplay(event.detail);
        });

        // Atualizar quando trocar de conta
        window.addEventListener('accountSwitched', () => {

            // Apenas atualizar o display com os dados da nova conta
            // O refresh completo será feito pelo footer-manager
            setTimeout(() => {
                this.updateBalanceDisplay();
            }, 200);
        });
    }

    // 💰 NOVO: Atualizar exibição do saldo
    static updateBalanceDisplay(balanceData) {
        const balanceValueEl = document.getElementById('header-balance-value');
        if (!balanceValueEl) return;

        const currencyEl = balanceValueEl.querySelector('.balance-currency');
        const amountEl = balanceValueEl.querySelector('.balance-amount');

        if (!currencyEl || !amountEl) return;

        // Obter dados do saldo
        let currency = 'USD';
        let amount = '0.00';

        if (balanceData) {
            currency = balanceData.currency || balanceData.balance?.currency || 'USD';
            amount = balanceData.amount || balanceData.balance?.balance || balanceData.balance || '0.00';
        } else {
            // Buscar do SessionManager
            const currentUser = SessionManager.getCurrentUser();
            if (currentUser?.balance) {
                currency = currentUser.balance.currency || 'USD';
                amount = currentUser.balance.balance || '0.00';
            }
        }

        // Formatar valor
        const formattedAmount = typeof amount === 'number' ? amount.toFixed(2) : parseFloat(amount).toFixed(2);

        // Atualizar DOM
        currencyEl.textContent = currency;
        amountEl.textContent = formattedAmount;
    }

    // 💰 NOVO: Atualizar saldo da Deriv
    static async refreshBalance() {
        const balanceWrapper = document.getElementById('balance-display-wrapper');
        const refreshBtn = document.getElementById('balance-refresh-btn');

        if (!balanceWrapper) return;

        // Adicionar classe de loading
        balanceWrapper.classList.add('refreshing');
        if (refreshBtn) {
            refreshBtn.classList.add('spinning');
        }

        try {
            // Buscar saldo atualizado da API
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                throw new Error('Usuário não autenticado');
            }

            // Usar a API do DerivMarketData se disponível
            let balanceResponse = null;
            if (window.marketData && window.marketData.api) {
                balanceResponse = await window.marketData.api.sendRequest({ "balance": 1 });
            } else if (window.api) {
                balanceResponse = await window.api.sendRequest({ "balance": 1 });
            }

            if (balanceResponse && balanceResponse.balance) {
                // Atualizar SessionManager
                currentUser.balance = balanceResponse.balance;
                SessionManager.saveCurrentUser(currentUser);

                // Atualizar display
                this.updateBalanceDisplay({
                    currency: balanceResponse.balance.currency,
                    amount: balanceResponse.balance.balance
                });

                // Disparar evento global
                window.dispatchEvent(new CustomEvent('balanceUpdated', {
                    detail: {
                        balance: balanceResponse.balance,
                        currency: balanceResponse.balance.currency,
                        amount: balanceResponse.balance.balance
                    }
                }));

                CommonHelpers.showSuccess('✅ Saldo atualizado com sucesso!');
            }
        } catch (error) {
            CommonHelpers.showError('❌ Erro ao atualizar saldo:', error);
            console.error('[BALANCE REFRESH] Erro:', error);
        } finally {
            // Remover classe de loading
            setTimeout(() => {
                balanceWrapper.classList.remove('refreshing');
                if (refreshBtn) {
                    refreshBtn.classList.remove('spinning');
                }
            }, 500);
        }
    }

    // 💎 Popular dropdown de contas no visor de ativo
    static populateAssetAccountDropdown() {
        const currentUser = SessionManager.getCurrentUser();
        const accountList = currentUser?.authorize?.account_list || [];
        const currentLoginId = currentUser?.authorize?.loginid;

        // Atualizar botão com conta atual
        const accountDisplay = document.getElementById('current-account-display');
        if (accountDisplay) {
            accountDisplay.textContent = `💎 ${currentLoginId || 'N/A'}`;
        }

        // Popular dropdown
        const dropdownContent = document.querySelector('.asset-account-dropdown');
        if (dropdownContent) {
            let html = '';

            if (accountList.length > 1) {
                accountList.forEach(account => {
                    const hasToken = SessionManager.getTokenByLoginId(account.loginid);
                    const statusIcon = hasToken ? '🟢' : '🟡';
                    const isActive = account.loginid === currentLoginId;
                    html += `
                        <a href="#" class="account-item ${isActive ? 'active' : ''}" data-loginid="${account.loginid}">
                            ${statusIcon} ${account.loginid} - ${account.currency}
                        </a>
                    `;
                });
                html += '<div class="dropdown-separator"></div>';
            }

            html += `
                <a href="#" class="account-item logout-item" onclick="ModalLogout.show(); return false;">
                    🚪 Sair
                </a>
            `;

            dropdownContent.innerHTML = html;
        }
    }

    // 💎 Configurar event listeners do dropdown (usando event delegation)
    static setupAssetAccountDropdownListeners() {
        // Evitar múltiplos event listeners
        if (this._assetDropdownListenersSetup) {
            return;
        }
        this._assetDropdownListenersSetup = true;

        // Toggle dropdown
        const dropdownBtn = document.querySelector('.asset-account-selector');
        const dropdownContent = document.querySelector('.asset-account-dropdown');

        if (dropdownBtn && dropdownContent) {
            dropdownBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                dropdownContent.classList.toggle('show');
            });
        }

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (event) => {
            if (dropdownContent && !event.target.closest('.asset-dropdown')) {
                dropdownContent.classList.remove('show');
            }
        });

        // 🎯 Event delegation para troca de conta (funciona mesmo após repopular)
        if (dropdownContent) {
            dropdownContent.addEventListener('click', async (event) => {
                // Encontrar o account-item clicado
                const accountItem = event.target.closest('.account-item:not(.logout-item)');

                if (accountItem) {
                    event.preventDefault();
                    const loginid = accountItem.dataset.loginid;

                    // Fechar dropdown
                    dropdownContent.classList.remove('show');

                    if (loginid && typeof AccountManager !== 'undefined' && AccountManager.switchAccount) {
                        await AccountManager.switchAccount(loginid);
                        // Atualizar dropdown após troca
                        this.populateAssetAccountDropdown();
                    }
                }
            });
        }
    }

    // ✅ OTIMIZADO: Carregar contratos com suporte melhorado para usuários FREE
    static async loadContractsForSymbol(symbol, retryCount = 0) {
        // ✅ DETECTAR tipo de usuário para ajustar parâmetros
        const currentUser = SessionManager.getCurrentUser();
        const isVirtualAccount = currentUser?.authorize?.loginid?.startsWith('VRT') || false;
        const maxRetries = isVirtualAccount ? 30 : 20; // Mais tentativas para usuários FREE
        const retryDelay = isVirtualAccount ? 1000 : 500; // Delay maior para FREE

        // Aguardar símbolos disponíveis se necessário
        if (!this.availableSymbols || this.availableSymbols.length === 0) {
            if (retryCount >= maxRetries) {
                CommonHelpers.showError(`❌ [CONTRACTS] TIMEOUT: Símbolos não carregaram após ${maxRetries} tentativas (usuário: ${isVirtualAccount ? 'FREE' : 'REAL'})`);

                const errorMessage = isVirtualAccount
                    ? 'ERRO: Símbolos não carregaram (usuário FREE).\n\nPor favor:\n1. Verifique sua conexão com a internet\n2. Recarregue a página\n3. Se o problema persistir, tente novamente em alguns minutos'
                    : 'ERRO CRÍTICO: Não foi possível carregar os símbolos da Deriv.\n\nRecarregue a página.';

                alert(errorMessage);
                return;
            }


            setTimeout(() => this.loadContractsForSymbol(symbol, retryCount + 1), retryDelay);
            return;
        }

        // Verificar se o ativo existe
        const symbolExists = this.availableSymbols.find(s => s.symbol === symbol);
        if (!symbolExists) {
            CommonHelpers.showError(`❌ [CONTRACTS] Ativo ${symbol} não encontrado!`);
            alert(`ERRO: O ativo "${symbol}" não está disponível.\n\nO sistema não pode continuar.`);
            throw new Error(`Ativo ${symbol} não disponível`);
        }

        // Popular dropdown de contratos para este ativo
        try {
            await this.populateContractsDropdown(symbol);

        } catch (error) {
            CommonHelpers.showError(`❌ [CONTRACTS] Erro ao carregar contratos:`, error);

            const errorMessage = isVirtualAccount
                ? `ERRO ao carregar contratos para "${symbol}" (usuário FREE):\n\n${error.message}\n\nTente:\n1. Verificar sua conexão\n2. Recarregar a página\n3. Aguardar alguns minutos`
                : `ERRO ao carregar contratos para "${symbol}":\n\n${error.message}\n\nVerifique sua conexão.`;

            alert(errorMessage);
            throw error;
        }
    }

    // ✅ NOVO: Manipular solicitação de troca de ativo (reinicialização)
    static handleAssetChangeRequest() {
        const currentSymbol = SessionManager.getSessionData('selected_symbol') || window.selectedSymbol;
        ConfigurationsView.showChangeAssetModal(currentSymbol);
    }

    // ✅ NOVO: Mostrar modal de confirmação para troca de ativo
    static showChangeAssetModal(currentSymbol) {
        // Remover modal existente se houver
        const existingModal = CommonHelpers.getElement('change-asset-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'change-asset-modal';
        modal.className = 'change-asset-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <div class="header-content">
                        <div class="header-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="header-text">
                            <h2>Trocar Ativo de Trading</h2>
                            <p>Esta ação reiniciará completamente o sistema</p>
                        </div>
                    </div>
                    <button class="modal-close" aria-label="Fechar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="current-asset-display">
                        <div class="asset-display-card">
                            <div class="asset-icon-container">
                                <div class="asset-icon">📊</div>
                            </div>
                            <div class="asset-details">
                                <div class="asset-label">Ativo Atual em Uso</div>
                                <div class="asset-name" id="current-asset-name">${currentSymbol || 'Nenhum ativo selecionado'}</div>
                                <div class="asset-status">
                                    <span class="status-dot active"></span>
                                    <span class="status-text">Ativo</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="warning-section">
                        <div class="warning-header">
                            <div class="warning-icon">⚠️</div>
                            <h3>Sistema será Reinicializado</h3>
                        </div>
                        <p class="warning-description">
                            Ao trocar de ativo, toda a sessão atual será encerrada e o sistema será completamente reinicializado para garantir a integridade dos dados.
                        </p>
                    </div>

                    <div class="data-loss-section">
                        <div class="section-header">
                            <div class="section-icon">📋</div>
                            <h4>O que será perdido:</h4>
                        </div>
                        <div class="data-items">
                            <div class="data-item">
                                <div class="item-icon">📈</div>
                                <span>Histórico de trades da sessão atual</span>
                            </div>
                            <div class="data-item">
                                <div class="item-icon">⚙️</div>
                                <span>Configurações temporárias não salvas</span>
                            </div>
                            <div class="data-item">
                                <div class="item-icon">💾</div>
                                <span>Cache de dados de mercado</span>
                            </div>
                            <div class="data-item">
                                <div class="item-icon">🎯</div>
                                <span>Estratégias ativas em execução</span>
                            </div>
                        </div>
                    </div>

                    <div class="recommendation-section">
                        <div class="recommendation-content">
                            <div class="recommendation-icon">💡</div>
                            <div class="recommendation-text">
                                <strong>Recomendação:</strong> Certifique-se de que não há trades em andamento e que todas as configurações importantes foram salvas antes de continuar.
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary">
                        <span class="btn-icon">✕</span>
                        <span class="btn-text">Cancelar</span>
                    </button>
                    <button class="btn btn-primary">
                        <span class="btn-icon">🔄</span>
                        <span class="btn-text">Trocar Ativo</span>
                    </button>
                </div>
            </div>
        `;

        // Adicionar estilos do modal
        this.addChangeAssetModalStyles();

        // Adicionar ao DOM
        document.body.appendChild(modal);

        // Animar entrada
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Event listeners
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.btn-secondary');
        const confirmBtn = modal.querySelector('.btn-primary');
        const backdrop = modal.querySelector('.modal-backdrop');

        const closeModal = () => {
            modal.classList.add('hide');
            setTimeout(() => {
                modal.remove();
            }, 300);
        };

        const confirmChange = () => {
            closeModal();
            // Redirecionar para página inicial para reinicializar
            window.location.href = '/';
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', confirmChange);
        backdrop.addEventListener('click', closeModal);

        // Fechar com ESC
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    }

    // ✅ NOVO: Adicionar estilos do modal de troca de ativo
    static addChangeAssetModalStyles() {
        if (CommonHelpers.getElement('change-asset-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'change-asset-modal-styles';
        style.textContent = `
            .change-asset-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .change-asset-modal.show {
                opacity: 1;
                visibility: visible;
            }

            .change-asset-modal.hide {
                opacity: 0;
                visibility: hidden;
            }

            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
            }

            .modal-container {
                position: relative;
                background: #2c3e50;
                border-radius: 16px;
                width: 100%;
                max-width: 520px;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
                transform: scale(0.95) translateY(20px);
                transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                margin: 20px;
                display: flex;
                flex-direction: column; /* ✅ FIX: Layout flexível vertical */
            }

            .change-asset-modal.show .modal-container {
                transform: scale(1) translateY(0);
            }

            .modal-header {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
                padding: 24px 28px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: relative;
                flex-shrink: 0; /* ✅ FIX: Não encolher header */
            }

            /* ... (header styles omitted) ... */

            .modal-body {
                padding: 28px;
                overflow-y: auto;
                flex: 1; /* ✅ FIX: Ocupar espaço restante */
                max-height: none; /* ✅ FIX: Remover altura fixa calculada */
            }

            .current-asset-display {
                margin-bottom: 30px;
            }

            .asset-display-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px;
                padding: 24px;
                display: flex;
                align-items: center;
                gap: 20px;
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.25);
                border: 1px solid rgba(255, 255, 255, 0.2);
                position: relative;
                overflow: hidden;
            }

            .asset-display-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                transition: left 0.6s ease;
            }

            .asset-display-card:hover::before {
                left: 100%;
            }

            .asset-icon-container {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 16px;
                padding: 16px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                min-width: 64px;
                height: 64px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .asset-icon {
                font-size: 1.8em;
                filter: brightness(1.2);
            }

            .asset-details {
                flex: 1;
                color: white;
            }

            .asset-label {
                font-size: 0.85em;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 6px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .asset-name {
                font-size: 1.6em;
                font-weight: 700;
                color: white;
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                line-height: 1.2;
            }

            .asset-status {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #28a745;
                animation: pulse-dot 2s infinite;
            }

            .status-dot.active {
                background: #28a745;
                box-shadow: 0 0 0 4px rgba(40, 167, 69, 0.3);
            }

            @keyframes pulse-dot {
                0%, 100% {
                    opacity: 1;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.7;
                    transform: scale(0.8);
                }
            }

            .status-text {
                font-size: 0.8em;
                color: rgba(255, 255, 255, 0.9);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .warning-section {
                margin-bottom: 24px;
                padding: 20px;
                background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                border-radius: 12px;
                border: 1px solid #ffc107;
            }

            .warning-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }

            .warning-icon {
                font-size: 1.25rem;
            }

            .warning-header h3 {
                margin: 0;
                font-size: 1.125rem;
                font-weight: 700;
                color: #856404;
            }

            .warning-description {
                margin: 0;
                color: #856404;
                line-height: 1.5;
                font-size: 0.9rem;
            }

            .data-loss-section {
                margin-bottom: 24px;
            }

            .section-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }

            .section-icon {
                font-size: 1.125rem;
            }

            .section-header h4 {
                margin: 0;
                font-size: 1rem;
                font-weight: 600;
                color: #495057;
            }

            .data-items {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .data-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 3px solid #dc3545;
                transition: all 0.2s ease;
            }

            .data-item:hover {
                background: #e9ecef;
                transform: translateX(4px);
            }

            .item-icon {
                font-size: 1rem;
                opacity: 0.8;
            }

            .data-item span {
                font-size: 0.9rem;
                color: #495057;
                font-weight: 500;
            }

            .recommendation-section {
                padding: 20px;
                background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
                border-radius: 12px;
                border: 1px solid #17a2b8;
            }

            .recommendation-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }

            .recommendation-icon {
                font-size: 1.25rem;
                margin-top: 2px;
            }

            .recommendation-text {
                color: #0c5460;
                line-height: 1.5;
                font-size: 0.9rem;
            }

            .recommendation-text strong {
                color: #0c5460;
            }

            .modal-footer {
                padding: 24px 28px;
                background: #f8f9fa;
                border-top: 1px solid #dee2e6;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                flex-shrink: 0; /* ✅ FIX: Não encolher footer */
            }

            .btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
                min-width: 120px;
                justify-content: center;
            }

            .btn-secondary {
                background: #6c757d;
                color: white;
                border: 1px solid #6c757d;
            }

            .btn-secondary:hover {
                background: #5a6268;
                border-color: #545b62;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
            }

            .btn-primary {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
                border: 1px solid #ff6b6b;
            }

            .btn-primary:hover {
                background: linear-gradient(135deg, #ee5a24 0%, #d63031 100%);
                border-color: #ee5a24;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
            }

            .btn-icon {
                font-size: 1rem;
            }

            .btn-text {
                font-size: 0.9rem;
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .modal-container {
                    margin: 10px;
                    max-width: calc(100vw - 20px);
                    max-height: calc(100vh - 20px);
                }

                .modal-header {
                    padding: 20px 24px;
                }

                .header-content {
                    gap: 12px;
                }

                .header-icon {
                    width: 40px;
                    height: 40px;
                }

                .header-text h2 {
                    font-size: 1.125rem;
                }

                .modal-body {
                    padding: 24px;
                }

                .modal-footer {
                    padding: 20px 24px;
                    flex-direction: column;
                }

                .btn {
                    width: 100%;
                }

                .asset-display-card {
                    padding: 18px;
                    gap: 15px;
                }

                .asset-icon-container {
                    width: 50px;
                    height: 50px;
                    padding: 12px;
                }

                .asset-icon {
                    font-size: 1.5em;
                }

                .asset-details {
                    flex: 1;
                }

                .asset-label {
                    font-size: 0.8em;
                }

                .asset-name {
                    font-size: 1.3em;
                }

                .asset-status {
                    gap: 6px;
                }

                .status-dot {
                    width: 7px;
                    height: 7px;
                }

                .status-text {
                    font-size: 0.75em;
                }

                .warning-section,
                .recommendation-section {
                    padding: 16px;
                }
            }

            @media (max-width: 480px) {
                .header-text h2 {
                    font-size: 1rem;
                }

                .header-text p {
                    font-size: 0.8rem;
                }

                .modal-body {
                    padding: 20px;
                }

                .modal-footer {
                    padding: 16px 20px;
                }
            }
        `;

        document.head.appendChild(style);
    }


    // Carrega a lista de ativos e preenche o dropdown
    static async loadSymbols() {
        const symbolSelect = CommonHelpers.getElement('symbol-select');

        // ❌ CORREÇÃO CRÍTICA: Não retornar early - símbolos são necessários mesmo sem select visual


        try {
            if (symbolSelect) {
                symbolSelect.innerHTML = '<option value="">Carregando ativos...</option>';
                symbolSelect.disabled = true;
            }

            const marketData = getMarketDataInstance(SessionManager.getLocalToken());

            if (!marketData) {
                throw new Error('MarketData não disponível');
            }


            // ✅ PARALELO: Carregar símbolos em paralelo com outras operações
            const symbolsPromise = this.loadSymbolsWithRetry(marketData);

            // ✅ ANTECIPADO: Já popular as opções de contrato enquanto carrega símbolos
            this.populateContractTypeOptions();

            // ⏳ Aguardar símbolos carregarem
            const symbols = await symbolsPromise;
            this.availableSymbols = symbols;

            // 🎯 POPULAR select de símbolos (se existir)
            if (symbolSelect) {
                this.populateSymbolSelect(symbols);
            }

        } catch (error) {
            CommonHelpers.showError('❌ [CONFIG] Erro ao carregar símbolos:', error);
            alert(`ERRO FATAL: Não foi possível carregar os símbolos da Deriv.\n\nErro: ${error.message}\n\nO sistema não pode continuar sem acesso aos dados da Deriv.`);
            throw error;
        }
    }

    // ✅ OTIMIZADO: Método de retry com suporte melhorado para usuários FREE
    static async loadSymbolsWithRetry(marketData, maxAttempts = 8) {

        // ✅ DETECTAR tipo de usuário para ajustar timeouts
        const currentUser = SessionManager.getCurrentUser();
        const isVirtualAccount = currentUser?.authorize?.loginid?.startsWith('VRT') || false;
        const baseTimeout = isVirtualAccount ? 20000 : 12000; // 20s para FREE, 12s para real
        const baseDelay = isVirtualAccount ? 3000 : 2000; // Delays maiores para FREE


        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {

                // ✅ CRÍTICO: Verificar conexão a cada tentativa
                if (!marketData.isReady()) {

                    // ✅ TIMEOUT de conexão mais generoso para usuários FREE
                    const connectPromise = marketData.connect();
                    const connectTimeout = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout na conexão')), baseTimeout / 2)
                    );

                    try {
                        await Promise.race([connectPromise, connectTimeout]);
                    } catch (connectError) {
                        CommonHelpers.showWarning(`⚠️ [SYMBOLS RETRY] Erro de conexão: ${connectError.message}`);
                        if (attempt === maxAttempts) throw connectError;
                        continue;
                    }

                    // ✅ Aguardar autorização com paciência específica por tipo de usuário
                    let retries = 0;
                    const maxRetries = isVirtualAccount ? 20 : 10; // Mais paciência para FREE
                    const retryDelay = isVirtualAccount ? 1000 : 500; // Delays maiores para FREE

                    while (!marketData.isReady() && retries < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        retries++;
                    }

                    if (!marketData.isReady()) {
                        throw new Error(`MarketData não conseguiu autorizar após ${maxRetries} tentativas`);
                    }
                }


                // ✅ TIMEOUT DIFERENCIADO por tipo de usuário
                const symbolsPromise = marketData.getActiveSymbols();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout ao carregar símbolos (${baseTimeout}ms)`)), baseTimeout)
                );

                const symbols = await Promise.race([symbolsPromise, timeoutPromise]);

                if (symbols && symbols.length > 0) {

                    return symbols;
                }



                if (attempt < maxAttempts) {
                    const delay = baseDelay * attempt;

                    await new Promise(resolve => setTimeout(resolve, delay));
                }

            } catch (error) {
                CommonHelpers.showError(`❌ [SYMBOLS RETRY] Tentativa ${attempt} falhou:`, error.message);

                // ✅ Para usuários FREE, ser mais tolerante com erros de timeout
                if (isVirtualAccount && error.message.includes('Timeout')) {
                    CommonHelpers.showWarning(`🔄 [FREE USER] Timeout detectado - tentando novamente com mais paciência...`);
                }

                if (attempt < maxAttempts) {
                    const delay = baseDelay * attempt; // Delay progressivo

                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    CommonHelpers.showError(`❌ [SYMBOLS RETRY] Todas as tentativas falharam`);

                    // ✅ MENSAGEM ESPECÍFICA para usuários FREE
                    const errorMessage = isVirtualAccount
                        ? `Falha ao carregar símbolos (usuário FREE após ${maxAttempts} tentativas). Verifique sua conexão e tente recarregar a página.`
                        : `Falha após ${maxAttempts} tentativas: ${error.message}`;

                    throw new Error(errorMessage);
                }
            }
        }

        throw new Error('Falha ao carregar símbolos após todas as tentativas');
    }

    // Preenche o dropdown de símbolos com os dados recebidos
    static populateSymbolSelect(symbols) {
        const symbolSelect = CommonHelpers.getElement('symbol-select');
        if (!symbolSelect) return;

        const optionsHtml = symbols.map(s => `<option value="${s.symbol}">${s.display_name}</option>`).join('');
        symbolSelect.innerHTML = optionsHtml;

        // 🎯 NOVA LÓGICA: Usar sempre o ativo selecionado na inicialização
        const sessionSymbol = SessionManager.getSessionData('selected_symbol');
        let initialSymbol = sessionSymbol;

        // Se não há ativo na sessão, mostrar erro explícito
        if (!initialSymbol) {
            CommonHelpers.showError('❌ [CONFIG LOAD] Nenhum ativo selecionado na sessão!');
            alert('ERRO CRÍTICO: Nenhum ativo foi selecionado na inicialização do sistema.\n\nO sistema não pode funcionar sem um ativo específico.');
            throw new Error('Nenhum ativo selecionado na sessão');
        }

        // Verificar se o ativo da sessão existe nos símbolos disponíveis
        const symbolExists = symbols.find(s => s.symbol === initialSymbol);
        if (!symbolExists) {
            CommonHelpers.showError(`❌ [CONFIG LOAD] Ativo da sessão ${initialSymbol} não está disponível!`);
            const availableSymbols = symbols.map(s => s.symbol).slice(0, 10).join(', ');
            alert(`ERRO CRÍTICO: O ativo "${initialSymbol}" não está mais disponível no servidor da Deriv.\n\nSímbolos disponíveis: ${availableSymbols}\n\nO sistema não pode continuar.`);
            throw new Error(`Ativo ${initialSymbol} não disponível`);
        }

        // Definir símbolo selecionado
        symbolSelect.value = initialSymbol;

        // Carregar contratos para o ativo selecionado
        if (symbols.length > 0) {

            // Aguardar um pouco e então carregar configurações salvas (que irá popular contratos)
            setTimeout(() => {
                ConfigurationsView.loadSavedConfigurationIntoUI();
            }, 300);

            symbolSelect.addEventListener('change', (event) => {
                const selectedSymbol = event.target.value;
                ConfigurationsView.populateContractsDropdown(selectedSymbol);

                // Salvar mudança de símbolo
                ConfigurationsView.saveCurrentConfiguration();

                if (window.displayViewInstance) {
                    window.displayViewInstance.setSymbol(selectedSymbol);
                }
            });
        }
    }

    // Configurar botões de tutorial em vídeo
    static setupTutorialButtons() {
        const tradeTutorialBtn = document.getElementById('trade-tutorial-btn');
        if (tradeTutorialBtn) {
            tradeTutorialBtn.onmouseover = () => {
                tradeTutorialBtn.style.transform = 'translateY(-50%) scale(1.2)';
            };
            tradeTutorialBtn.onmouseout = () => {
                tradeTutorialBtn.style.transform = 'translateY(-50%) scale(1)';
            };
            tradeTutorialBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.VideoTutorialModal && window.VideoTutorialModal.show) {
                    window.VideoTutorialModal.show('kKBxgp5wFrg');
                } else {
                    window.open('https://youtu.be/kKBxgp5wFrg?si=OzLXavS4sFEDa_Oc', '_blank');
                }
            };
        }
    }

    // Preenche o dropdown de contratos e configura listeners
    static populateContractTypeOptions() {
        const contractSelect = CommonHelpers.getElement('contract-select');

        // ✅ INICIALIZAR DROPDOWN CUSTOMIZADO DE SPLIT
        ConfigurationsView.populateSplitDropdown();

        if (!contractSelect) return;

        // Adicionar event listener para mudanças no contrato
        contractSelect.addEventListener('change', (event) => {
            const selectedContractType = event.target.value;

            ConfigurationsView.updateDurationOptions(selectedContractType);


            ConfigurationsView.updatePredictionBarrierFields(selectedContractType);


            ConfigurationsView.updateTradeTypeDropdown(selectedContractType);


            ConfigurationsView.validateBothModeConfiguration();

            // Salvar mudança de contrato
            setTimeout(() => {

                ConfigurationsView.saveCurrentConfiguration();
            }, 100);


        });
    }

    // 🔧 NOVA FUNÇÃO: Obter configuração salva sem aplicar na UI
    static getSavedConfiguration(loginid = null) {
        try {

            // Carregar configuração global
            const globalConfigKey = `trade_config_global`;
            const globalSaved = localStorage.getItem(globalConfigKey);

            if (globalSaved) {
                try {
                    const globalParsedData = JSON.parse(globalSaved);
                    const config = globalParsedData.config || globalParsedData;

                    return config;
                } catch (error) {
                    CommonHelpers.showWarning('⚠️ [GET CONFIG] Erro ao parsear configuração global');
                }
            }

            return null;
        } catch (error) {
            CommonHelpers.showError('❌ [GET CONFIG] Erro ao obter configuração:', error);
            return null;
        }
    }

    // ✅ NOVA FUNÇÃO: Validar duração mínima para Higher/Lower
    static validateAndSaveDuration() {
        const contractSelect = CommonHelpers.getElement('contract-select');
        const durationInput = CommonHelpers.getElement('duration-input');
        const durationUnitSelect = CommonHelpers.getElement('duration-unit-select');

        if (!contractSelect || !durationInput || !durationUnitSelect) {
            ConfigurationsView.saveCurrentConfiguration();
            return;
        }

        const contractType = contractSelect.value;
        const unit = durationUnitSelect.value;
        const currentValue = parseInt(durationInput.value) || 1;

        // 🔍 Detectar se é Higher/Lower (CALLE, PUTE, CALLPUT)
        const isHigherLower = ['CALLE', 'PUTE', 'CALLPUT'].includes(contractType);

        if (isHigherLower) {
            // 📊 Definir valores mínimos por unidade para Higher/Lower
            const minimumsByUnit = {
                't': 5,      // Ticks: mínimo 5
                's': 15,     // Segundos: mínimo 15
                'm': 1,      // Minutos: mínimo 1
                'h': 1       // Horas: mínimo 1
            };

            const minimum = minimumsByUnit[unit] || 1;

            // ✅ Validar e corrigir se necessário
            if (currentValue < minimum) {
                durationInput.value = minimum;

                // Feedback visual
                durationInput.style.borderColor = '#ffc107';
                durationInput.style.backgroundColor = '#fff3cd';

                const unitName = unit === 't' ? 'Ticks' :
                    unit === 's' ? 'Segundos' :
                        unit === 'm' ? 'Minutos' : 'Horas';

                CommonHelpers.showWarning(`⚠️ Para Higher/Lower, duração mínima é ${minimum} ${unitName}. Valor ajustado automaticamente.`);

                setTimeout(() => {
                    durationInput.style.borderColor = '';
                    durationInput.style.backgroundColor = '';
                }, 2000);
            }

            // Atualizar atributo min do input
            durationInput.setAttribute('min', minimum);
        } else {
            // Para outros contratos, resetar para mínimo 1
            durationInput.setAttribute('min', '1');
        }

        // Salvar configuração
        ConfigurationsView.saveCurrentConfiguration();
    }

    // ✅ NOVA FUNÇÃO: Validar e salvar barreira com sinal obrigatório
    static validateAndSaveBarrier(input) {
        const value = input.value.trim();
        const barrierRegex = /^[+-]\d+(\.\d+)?$/;

        // Validar formato: deve começar com + ou - seguido de número
        if (!barrierRegex.test(value)) {
            // Mostrar erro
            input.style.borderColor = '#dc3545';
            input.style.backgroundColor = '#fff3cd';

            CommonHelpers.showError('⚠️ Barreira inválida! Use formato: +0.5 ou -0.3');

            // Restaurar valor padrão
            setTimeout(() => {
                input.value = '+1';
                input.style.borderColor = '';
                input.style.backgroundColor = '';
                this.saveCurrentConfiguration();
            }, 2000);

            return false;
        }

        // Validação OK - remover estilos de erro
        input.style.borderColor = '#28a745';
        input.style.backgroundColor = '';

        // Salvar configuração
        setTimeout(() => {
            input.style.borderColor = '';
            this.saveCurrentConfiguration();
        }, 500);

        return true;
    }

    // 💾 NOVA FUNÇÃO: Salvar configuração atual automaticamente
    static saveCurrentConfiguration() {
        try {

            // 📋 Obter valores atuais de todos os campos (sem fallbacks fixos)
            const config = {
                symbol: SessionManager.getSessionData('selected_symbol'),
                contractType: CommonHelpers.getElement('contract-select')?.value,
                tradeType: CommonHelpers.getElement('trade-type-select')?.value,
                duration: parseInt(CommonHelpers.getElement('duration-input')?.value) || 1,
                durationUnit: CommonHelpers.getElement('duration-unit-select')?.value || 't',
                stake: parseFloat(CommonHelpers.getElement('stake-input')?.value) || 0.35,
                goal: parseFloat(CommonHelpers.getElement('goal-input')?.value) || 1,
                stopLoss: parseFloat(CommonHelpers.getElement('stop-loss-input')?.value) || 100,
                galeMultiplier: parseFloat(CommonHelpers.getElement('gale-multiplier-input')?.value) || 1.0,
                galeSplit: parseInt(CommonHelpers.getElement('gale-split-input')?.value) || 1,
                galeSplitThreshold: parseFloat(CommonHelpers.getElement('gale-split-threshold')?.value) || 0, // 🎯 NOVO: Threshold
                winReal: parseInt(CommonHelpers.getElement('win-real-input')?.value) ?? 5,
                lossReal: parseInt(CommonHelpers.getElement('loss-real-input')?.value) ?? 1,
                winSimulated: parseInt(CommonHelpers.getElement('win-simulated-input')?.value) ?? 0,
                lossSimulated: parseInt(CommonHelpers.getElement('loss-simulated-input')?.value) ?? 1,
                tradeLimit: parseInt(CommonHelpers.getElement('trade-limit-input')?.value) ?? 0,
                cooldownPeriod: parseInt(CommonHelpers.getElement('cooldown-period-input')?.value) ?? 3,
                telegramToken: CommonHelpers.getElement('telegram-token-input')?.value || '',
                telegramChatId: CommonHelpers.getElement('telegram-chat-id-input')?.value || '',
                pauseTime: parseInt(CommonHelpers.getElement('pause-time-input')?.value) || null,
                pauseTrades: parseInt(CommonHelpers.getElement('pause-trades-input')?.value) || 2,
                pauseOnWins: CommonHelpers.getElement('pause-on-wins')?.checked || false,
                countRepeated: CommonHelpers.getElement('count-repeated-digits-input')?.checked ?? true
            };

            // 🎯 Obter valores de previsão/barreira se existirem
            const predictionInput = CommonHelpers.getElement('prediction-input', true);
            const barrierInput = CommonHelpers.getElement('barrier-input', true);
            const barrierHighInput = CommonHelpers.getElement('barrier-high-input', true);
            const barrierLowInput = CommonHelpers.getElement('barrier-low-input', true);



            if (predictionInput && predictionInput.value !== '') {
                config.prediction = predictionInput.value;
            }
            if (barrierInput && barrierInput.value !== '') {
                config.barrier = barrierInput.value;

            }
            if (barrierHighInput && barrierHighInput.value !== '') {
                config.barrierHigh = barrierHighInput.value;
            }
            if (barrierLowInput && barrierLowInput.value !== '') {
                config.barrierLow = barrierLowInput.value;
            }

            // O grupo sintético não é reconhecido pelos checks normais, então forçar salvamento
            if (config.contractType === 'HIGHER_LOWER_GROUP') {

                if (barrierInput) {
                    if (!config.barrier && barrierInput.value) {
                        config.barrier = barrierInput.value;

                    } else if (config.barrier) {

                    }
                } else {
                    console.warn('⚠️ [SAVE CONFIG - HIGHER_LOWER_GROUP] barrier-input não encontrado no DOM!');
                }
            }

            // 💾 Salvar no localStorage POR USUÁRIO (para sincronizar com TradeManager)
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser || !currentUser.authorize || !currentUser.authorize.loginid) {
                console.warn('⚠️ [CONFIG] Nenhum usuário logado, configuração não será salva');
                return;
            }

            const loginid = currentUser.authorize.loginid;
            const userConfigKey = `trade_config_user_${loginid}`;
            const dataToSave = {
                config: config,
                _timestamp: Date.now(),
                _autoSaved: true,
                _userId: loginid
            };

            localStorage.setItem(userConfigKey, JSON.stringify(dataToSave));

            // Sem isso, o RiskController continua usando a config antiga até o próximo reload
            if (window.tradeManager && typeof window.tradeManager.updateConfigurationFromUI === 'function') {
                window.tradeManager.updateConfigurationFromUI();
                logConfig.info('configurations', '🔄 [SYNC] Configuração enviada para TradeManager em tempo real.');
            }

        } catch (error) {
            CommonHelpers.showError('❌ [CONFIG] Erro ao salvar configuração:', error);
        }
    }

    // 🔧 NOVA FUNÇÃO: Carregar configurações salvas nos campos de input
    static loadSavedConfigurationIntoUI() {
        try {
            // ✅ CORREÇÃO: Pegar loginid DIRETO do localStorage para evitar getCurrentUser() desatualizado
            const currentLoginId = localStorage.getItem('current_user_loginid');

            if (!currentLoginId) {
                CommonHelpers.showWarning('⚠️ [CONFIG UI] Nenhum usuário logado para carregar configurações');
                return false;
            }

            // Usar método dedicado para obter configuração, passando loginid explicitamente
            const config = ConfigurationsView.getSavedConfiguration(currentLoginId);

            if (!config) {

                return false;
            }

            // 🔧 Carregar valores salvos nos campos de input
            const fieldsToUpdate = [
                { id: 'duration-input', value: config.duration, defaultValue: 1 },
                { id: 'duration-unit-select', value: config.durationUnit, defaultValue: 't' },
                { id: 'stake-input', value: config.stake, defaultValue: 0.35 },
                { id: 'goal-input', value: config.goal, defaultValue: 1 },
                { id: 'stop-loss-input', value: config.stopLoss, defaultValue: 100 },
                { id: 'gale-multiplier-input', value: config.galeMultiplier, defaultValue: 1.0 },
                { id: 'gale-split-input', value: config.galeSplit, defaultValue: 1 },
                { id: 'gale-split-threshold', value: config.galeSplitThreshold, defaultValue: 0 }, // 🎯 NOVO
                { id: 'win-real-input', value: config.realWinsLimit, defaultValue: 5 },
                { id: 'loss-real-input', value: config.realLossesLimit, defaultValue: 1 },
                { id: 'win-simulated-input', value: config.simulatedWinsLimit, defaultValue: 0 },
                { id: 'loss-simulated-input', value: config.simulatedLossesLimit, defaultValue: 1 },
                { id: 'symbol-select', value: config.symbol }, // Sem defaultValue - ativo vem da sessão
                { id: 'contract-select', value: config.contractType }, // Sem defaultValue - usuário deve escolher
                { id: 'trade-type-select', value: config.tradeType }, // Sem defaultValue - depende do contrato
                { id: 'telegram-token-input', value: config.telegramToken, defaultValue: '' },
                { id: 'telegram-chat-id-input', value: config.telegramChatId, defaultValue: '' },
                { id: 'pause-time-input', value: config.pauseTime, defaultValue: '' },
                { id: 'pause-trades-input', value: config.pauseTrades, defaultValue: 2 },
                { id: 'pause-on-wins', value: config.pauseOnWins, defaultValue: false, type: 'checkbox' },
                { id: 'count-repeated-digits-input', value: config.countRepeated, defaultValue: true, type: 'checkbox' } // 🎯 NOVO
            ];

            fieldsToUpdate.forEach(field => {
                const element = CommonHelpers.getElement(field.id);
                if (element) {
                    if (field.type === 'checkbox') {
                        element.checked = (field.value !== undefined && field.value !== null) ? field.value : field.defaultValue;
                    } else {
                        // Usar valor salvo ou valor padrão se vazio/nulo
                        const valueToUse = (field.value !== undefined && field.value !== null && field.value !== '')
                            ? field.value
                            : field.defaultValue;

                        element.value = valueToUse;
                    }
                }
            });

            // 🎯 Carregar campos de previsão/barreira se existirem
            if (config.prediction !== undefined) {
                const predictionInput = CommonHelpers.getElement('prediction-input');
                if (predictionInput) {
                    predictionInput.value = config.prediction;
                }
            }
            if (config.barrier !== undefined) {
                const barrierInput = CommonHelpers.getElement('barrier-input', true);
                if (barrierInput) {
                    barrierInput.value = config.barrier;
                }
            }
            if (config.barrierHigh !== undefined) {
                const barrierHighInput = CommonHelpers.getElement('barrier-high-input', true);
                if (barrierHighInput) {
                    barrierHighInput.value = config.barrierHigh;
                }
            }
            if (config.barrierLow !== undefined) {
                const barrierLowInput = CommonHelpers.getElement('barrier-low-input');
                if (barrierLowInput) {
                    barrierLowInput.value = config.barrierLow;
                }
            }

            // 🔧 NOVO: Carregar limite de trades
            const tradeLimitInput = CommonHelpers.getElement('trade-limit-input');
            if (tradeLimitInput) tradeLimitInput.value = config.tradeLimit || 0;

            // 🔧 NOVO: Carregar período de cooldown
            const cooldownPeriodInput = CommonHelpers.getElement('cooldown-period-input');
            if (cooldownPeriodInput) cooldownPeriodInput.value = config.cooldownPeriod || 3;


            // 🔧 SINCRONIZAÇÃO CRÍTICA: Validar e sincronizar campos dependentes
            const symbolSelect = CommonHelpers.getElement('symbol-select'); // Mantido para referência interna
            const contractSelect = CommonHelpers.getElement('contract-select');

            // ✅ CORREÇÃO CRÍTICA: Usar símbolo atual se o salvo for null
            const symbolToUse = config.symbol || symbolSelect?.value || SessionManager.getSessionData('selected_symbol');

            // Validar e sincronizar símbolo salvo
            if (symbolSelect && symbolToUse) {
                // Verificar se o símbolo existe nas opções
                const symbolExists = Array.from(symbolSelect.options).some(opt => opt.value === symbolToUse);

                if (symbolExists) {
                    symbolSelect.value = symbolToUse;

                    ConfigurationsView.populateContractsDropdown(symbolToUse, config.contractType).then(() => {

                        // Validar e definir contrato salvo
                        if (contractSelect && config.contractType) {
                            const contractExists = Array.from(contractSelect.options).some(opt => opt.value === config.contractType);

                            if (contractExists) {
                                contractSelect.value = config.contractType;

                            } else {
                                CommonHelpers.showWarning(`⚠️ [CONFIG UI] Contrato salvo ${config.contractType} não existe, usando primeiro disponível`);
                                if (contractSelect.options.length > 1) {
                                    contractSelect.value = contractSelect.options[1].value; // Skip first empty option
                                }
                            }

                            // Sincronizar campos dependentes do contrato
                            const finalContractType = contractSelect.value;
                            if (finalContractType) {
                                ConfigurationsView.updateDurationOptions(finalContractType);
                                ConfigurationsView.updatePredictionBarrierFields(finalContractType);
                            }
                        }

                        // Disparar eventos de mudança para manter listeners sincronizados
                        symbolSelect.dispatchEvent(new Event('change'));
                        if (contractSelect && contractSelect.value) {
                            contractSelect.dispatchEvent(new Event('change'));
                        }
                    }).catch(error => {
                        CommonHelpers.showWarning('⚠️ [CONFIG UI] Erro ao popular contratos:', error);
                    });

                } else {
                    CommonHelpers.showWarning(`⚠️ [CONFIG UI] Símbolo salvo ${config.symbol} não existe mais, mantendo padrão`);
                }
            }


            if (window.tradeManager && typeof window.tradeManager.updateConfigurationFromUI === 'function') {
                // Pequeno delay para garantir que o DOM propagou as mudanças
                setTimeout(() => {
                    window.tradeManager.updateConfigurationFromUI();
                    logConfig.info('configurations', '🚀 [INIT SYNC] Configuração UI carregada e sincronizada com TradeManager.');
                }, 100);
            }

            return true; // Configuração foi carregada com sucesso

        } catch (error) {
            CommonHelpers.showError('❌ [CONFIG UI] Erro ao carregar configurações na UI:', error);
            return false;
        }
    }

    // 🔧 NOVA FUNÇÃO: Adicionar validação para campos de números inteiros
    static addIntegerValidation() {
        const integerFields = [
            'win-real-input',
            'loss-real-input',
            'win-simulated-input',
            'loss-simulated-input',
            'trade-limit-input',
            'cooldown-period-input',
            'pause-time-input',
            'pause-trades-input'
        ];

        integerFields.forEach(fieldId => {
            const element = CommonHelpers.getElement(fieldId);
            if (element) {
                // Função para validar e corrigir entrada
                const validateInteger = () => {
                    let value = element.value;

                    // Remover caracteres não numéricos (exceto números)
                    value = value.replace(/[^\d]/g, '');

                    // Converter para número inteiro
                    if (value !== '') {
                        value = Math.floor(Math.abs(parseInt(value) || 0));
                    }

                    // Definir valor corrigido
                    element.value = value;
                };

                // Adicionar listeners para diferentes eventos
                element.addEventListener('input', validateInteger);
                element.addEventListener('paste', (e) => {
                    // Aguardar o paste ser processado
                    setTimeout(validateInteger, 10);
                });
                element.addEventListener('blur', validateInteger);
                element.addEventListener('keypress', (e) => {
                    // Bloquear caracteres não numéricos durante digitação
                    const char = String.fromCharCode(e.which);
                    if (!/[0-9]/.test(char)) {
                        e.preventDefault();
                    }
                });
            }
        });
    }

    // 🚫 NOVO: Lista de contratos bloqueados/filtrados
    static getBlockedContracts() {
        return [
            'ACCU',           // Accumulator Up
            'CLOSE_LOW',      // Close-Low
            'CLOSELOW',       // Close-Low (variação)
            'CLOSE-LOW',      // Close-Low (com hífen)
            'HIGH_CLOSE',     // High-Close
            'HIGHCLOSE',      // High-Close (variação)
            'HIGH-CLOSE',     // High-Close (com hífen)
            'HIGH_LOW',       // High-Low
            'HIGHLOW',        // High-Low (variação)
            'HIGH-LOW',       // High-Low (com hífen)
            'TURBOSLONG',     // Turbos Long
            'TURBOSSHORT',    // Turbos Short
            'VANILLALONGCALL', // Vanilla Long Call
            'VANILLALONGPUT', // Vanilla Long Put
            'TICKHIGH',       // High/Low Ticks - Tick High
            'TICKLOW',        // High/Low Ticks - Tick Low
            'MULTUP',         // Run High/Low (Legacy) - Mult Up
            'MULTDOWN',       // Run High/Low (Legacy) - Mult Down
            'ASIANU',         // Asians - Asian Up
            'ASIAND',         // Asians - Asian Down
            'RESETCALL',      // Reset Call
            'RESETPUT',       // Reset Put
            'RUNHIGH',        // Only Ups
            'RUNLOW',         // Only Downs
            'TOUCH',          // Touch
            'NOTOUCH',        // No Touch
            'ONETOUCH',       // One Touch
            'EXPIRYRANGE',    // Ends Between
            'EXPIRYMISS',     // Ends Outside
            'RANGE',          // Stays Between
            'UPORDOWN',       // Goes Outside
            'CALLE',          // Higher (European)
            'PUTE',           // Lower (European)
            'CALLPUT',        // Higher/Lower Group
            'HIGHER_LOWER_GROUP' // Higher/Lower Group ID
        ];
    }

    // 🔗 NOVO: Agrupar contratos Higher/Lower
    static processHigherLowerGrouping(contractsList) {
        const blockedContracts = ConfigurationsView.getBlockedContracts();
        const higherLowerContracts = ['CALLPUT', 'CALLE', 'PUTE'];

        // Filtrar contratos bloqueados (verificação case-insensitive e múltiplas variações)
        let filteredContracts = contractsList.filter(contract => {
            const contractType = contract.contract_type;
            const contractDisplay = contract.contract_display || '';

            // Verificar se o contrato está na lista de bloqueados (exato)
            if (blockedContracts.includes(contractType)) {

                return false;
            }

            // Verificar variações case-insensitive no contract_type
            const contractUpper = contractType.toUpperCase();
            for (const blocked of blockedContracts) {
                if (contractUpper === blocked.toUpperCase()) {

                    return false;
                }
            }

            // Verificar também no contract_display (nome amigável)
            const displayUpper = contractDisplay.toUpperCase();
            const blockedDisplays = ['CLOSE-LOW', 'HIGH-CLOSE', 'HIGH-LOW', 'TICK HIGH', 'TICK LOW'];
            for (const blocked of blockedDisplays) {
                if (displayUpper === blocked || displayUpper.includes(blocked)) {

                    return false;
                }
            }

            return true;
        });

        // Verificar se há contratos Higher/Lower disponíveis
        const availableHigherLower = filteredContracts.filter(contract =>
            higherLowerContracts.includes(contract.contract_type)
        );

        if (availableHigherLower.length > 0) {

            // Remover contratos Higher/Lower individuais da lista
            const beforeFilter = filteredContracts.length;
            filteredContracts = filteredContracts.filter(contract =>
                !higherLowerContracts.includes(contract.contract_type)
            );
            const afterFilter = filteredContracts.length;


            // Adicionar grupo Higher/Lower usando o primeiro contrato disponível como base
            const baseContract = availableHigherLower[0];


            const higherLowerGroup = {
                ...baseContract,
                contract_type: 'HIGHER_LOWER_GROUP',
                contract_display: 'Higher/Lower',
                grouped_contracts: availableHigherLower.map(c => c.contract_type)
            };


            filteredContracts.push(higherLowerGroup);

        }

        return filteredContracts;
    }

    // Carrega a lista de contratos para o ativo selecionado e preenche o dropdown AGRUPADO
    static async populateContractsDropdown(symbol, preferredContract = null) {
        // ✅ CORREÇÃO CRÍTICA: Se não há preferredContract, buscar da configuração GLOBAL
        if (!preferredContract) {
            const savedConfig = ConfigurationsView.getSavedConfiguration();
            if (savedConfig && savedConfig.contractType) {
                preferredContract = savedConfig.contractType;

            }
        }

        const contractSelect = CommonHelpers.getElement('contract-select');
        if (!contractSelect) {
            CommonHelpers.showError(`❌ [DROPDOWN] Elemento 'contract-select' NÃO ENCONTRADO no DOM!`);
            return;
        }


        contractSelect.innerHTML = '<option value="">Carregando contratos...</option>';
        contractSelect.disabled = true;

        try {

            const marketDataInstance = getMarketDataInstance(SessionManager.getLocalToken());


            const contractsData = await marketDataInstance.getContractsFor(symbol);

            const contractsList = contractsData?.available || [];

            if (contractsList.length > 0) {
                // 🚫 NOVO: Processar filtros de bloqueio e agrupamento Higher/Lower
                const processedContracts = ConfigurationsView.processHigherLowerGrouping(contractsList);

                // Armazenar os contratos processados para referência
                ConfigurationsView.availableContracts = processedContracts;

                // ✅ NOVO: Agrupar contratos por grupos definidos
                const contractGroups = ConfigurationsView.getContractGroups();
                const uniqueContracts = [...new Set(processedContracts.map(c => c.contract_type))];

                let optionsHtml = '';
                const groupsAdded = new Set();

                // Percorrer grupos e adicionar apenas grupos que têm contratos disponíveis
                for (const [groupName, groupData] of Object.entries(contractGroups)) {
                    // Verificar quais contratos deste grupo estão disponíveis
                    const availableGroupContracts = groupData.contracts.filter(ct =>
                        uniqueContracts.includes(ct)
                    );

                    if (availableGroupContracts.length > 0) {
                        // Usar o primeiro contrato disponível do grupo como valor
                        const groupValue = availableGroupContracts[0];
                        optionsHtml += `<option value="${groupValue}" data-group="${groupName}">${groupData.label}</option>`;
                        groupsAdded.add(groupName);

                    }
                }

                // Adicionar contratos que não pertencem a nenhum grupo (individuais)
                const groupedContracts = new Set();
                Object.values(contractGroups).forEach(groupData => {
                    groupData.contracts.forEach(ct => groupedContracts.add(ct));
                });

                uniqueContracts.forEach(contractType => {
                    if (!groupedContracts.has(contractType)) {
                        const contractInfo = processedContracts.find(c => c.contract_type === contractType);
                        const displayName = contractInfo?.contract_display || contractType;
                        optionsHtml += `<option value="${contractType}">${displayName}</option>`;

                    }
                });

                contractSelect.innerHTML = `<option value="">Selecione um tipo de contrato</option>${optionsHtml}`;
                contractSelect.disabled = false;

                // ✅ CORREÇÃO: Priorizar contrato preferido (salvo) sobre padrão
                if (preferredContract && uniqueContracts.includes(preferredContract)) {

                    contractSelect.value = preferredContract;
                    ConfigurationsView.updateDurationOptions(preferredContract);
                    ConfigurationsView.updatePredictionBarrierFields(preferredContract);
                    ConfigurationsView.updateTradeTypeDropdown(preferredContract);
                } else {

                    // Apenas se NÃO houver preferência, usar padrão
                    const defaultContract = 'DIGITDIFF';
                    const differExists = uniqueContracts.includes(defaultContract);

                    // Verificar se Higher/Lower está disponível
                    const hasHigherLower = uniqueContracts.some(contract => ['CALLE', 'PUTE', 'HIGHER_LOWER_GROUP'].includes(contract));

                    if (differExists) {

                        contractSelect.value = defaultContract;

                        ConfigurationsView.updateDurationOptions(defaultContract);

                        ConfigurationsView.updatePredictionBarrierFields(defaultContract);

                        ConfigurationsView.updateTradeTypeDropdown(defaultContract);

                    } else if (hasHigherLower) {
                        // Se não tem DIGITDIFF mas tem Higher/Lower, usar Higher/Lower
                        const higherLowerContract = uniqueContracts.find(contract => ['CALLE', 'PUTE', 'HIGHER_LOWER_GROUP'].includes(contract));
                        if (higherLowerContract) {

                            contractSelect.value = higherLowerContract;

                            ConfigurationsView.updateDurationOptions(higherLowerContract);

                            ConfigurationsView.updatePredictionBarrierFields(higherLowerContract);

                            ConfigurationsView.updateTradeTypeDropdown(higherLowerContract);
                        }
                    }
                }


            } else {
                contractSelect.innerHTML = '<option value="">Nenhum contrato disponível</option>';
                CommonHelpers.showWarning(`⚠️ [DROPDOWN] Nenhum contrato disponível para ${symbol}`);
            }
        } catch (error) {
            CommonHelpers.showError(`❌ [DROPDOWN] Erro ao carregar contratos:`, error);
            contractSelect.innerHTML = '<option value="">Erro ao carregar contratos</option>';
        }
    }

    // Define grupos de contratos para exibição
    static getContractGroups() {
        return {
            'Over/Under': {
                label: 'Over/Under',
                contracts: ['DIGITOVER', 'DIGITUNDER'],
                description: 'Apostar se o último dígito será maior ou menor que um valor',
                hasBarrier: false,
                usesDigitPrediction: true,
                minDuration: 1,
                allowedUnits: ['t']
            },
            'Rise/Fall': {
                label: 'Rise/Fall',
                contracts: ['CALL', 'PUT'],
                description: 'Apostar na direção do preço (subir ou descer)',
                hasBarrier: false,
                usesDigitPrediction: false,
                minDuration: 1,
                allowedUnits: ['t', 's', 'm', 'h']
            },
            'Differ/Match': {
                label: 'Differ/Match',
                contracts: ['DIGITDIFF', 'DIGITMATCH'],
                description: 'Apostar se o último dígito será diferente ou igual a um valor',
                hasBarrier: false,
                usesDigitPrediction: true,
                minDuration: 1,
                allowedUnits: ['t']
            },
            'Even/Odd': {
                label: 'Even/Odd',
                contracts: ['DIGITEVEN', 'DIGITODD'],
                description: 'Apostar se o último dígito será par ou ímpar',
                hasBarrier: false,
                usesDigitPrediction: false,
                minDuration: 1,
                allowedUnits: ['t']
            },
            'Higher/Lower': {
                label: 'Higher/Lower',
                contracts: ['CALLE', 'PUTE', 'CALLPUT'], // ✅ INCLUIR CALLPUT (representa modo "Ambos")
                description: 'Apostar se o preço será maior ou menor que uma barreira',
                hasBarrier: true,
                singleBarrier: true,
                usesDigitPrediction: false,
                minDuration: 1,
                allowedUnits: ['t', 's', 'm', 'h']
            },
            'Asians': {
                label: 'Asians',
                contracts: ['ASIANU', 'ASIAND'],
                description: 'Apostas baseadas na média dos ticks',
                hasBarrier: false,
                usesDigitPrediction: false,
                minDuration: 5,
                allowedUnits: ['t']
            },
            'Reset Call/Put': {
                label: 'Reset Call/Put',
                contracts: ['RESETCALL', 'RESETPUT'],
                description: 'Contratos com funcionalidade de reset',
                hasBarrier: false,
                usesDigitPrediction: false,
                minDuration: 1,
                allowedUnits: ['t', 's', 'm', 'h']
            },
            'High/Low Ticks': {
                label: 'High/Low Ticks',
                contracts: ['TICKHIGH', 'TICKLOW'],
                description: 'Apostas em sequências de ticks',
                hasBarrier: false,
                usesDigitPrediction: false,
                usesPredictionRange: true, // 1 a 5
                minDuration: 1,
                allowedUnits: ['t']
            },
            'Only Ups/Downs': {
                label: 'Only Ups/Downs',
                contracts: ['RUNHIGH', 'RUNLOW'],
                description: 'Apenas movimentos para cima ou para baixo',
                hasBarrier: false,
                singleBarrier: false,
                usesDigitPrediction: false,
                minDuration: 2,
                allowedUnits: ['t']
            },
            'Touch/No Touch': {
                label: 'Touch/No Touch',
                contracts: ['TOUCH', 'NOTOUCH', 'ONETOUCH'],
                description: 'Apostar se o preço tocará ou não uma barreira específica',
                hasBarrier: true,
                singleBarrier: true,
                usesDigitPrediction: false,
                minDuration: 2,
                allowedUnits: ['t', 'm', 'h']
            },
            'Ends Between/Outside': {
                label: 'Ends Between/Outside',
                contracts: ['EXPIRYRANGE', 'EXPIRYMISS'],
                description: 'Apostar se o preço terminará dentro ou fora de um range',
                hasBarrier: true,
                doubleBarrier: true,
                usesDigitPrediction: false,
                minDuration: 2,
                allowedUnits: ['m', 'h', 'd']
            },
            'Stays Between/Goes Outside': {
                label: 'Stays Between/Goes Outside',
                contracts: ['RANGE', 'UPORDOWN'],
                description: 'Apostar se o preço permanecerá dentro ou sairá de um range',
                hasBarrier: true,
                doubleBarrier: true,
                usesDigitPrediction: false,
                minDuration: 2,
                allowedUnits: ['m', 'h', 'd']
            },
            'Run High/Low': {
                label: 'Run High/Low (Legacy)',
                contracts: ['MULTUP', 'MULTDOWN'],
                description: 'Apostas em sequências consecutivas (legacy)',
                hasBarrier: false,
                usesDigitPrediction: false,
                minDuration: 2,
                allowedUnits: ['t']
            },

            'Contratos Individuais': {
                label: 'Contratos Individuais',
                contracts: ['HIGHLOW', 'HIGHEREVEN', 'LOWEREVENT'],
                description: 'Contratos que não se encaixam em outras categorias',
                hasBarrier: false,
                usesDigitPrediction: false,
                minDuration: 1,
                allowedUnits: ['t', 's', 'm', 'h']
            }
        };
    }

    // Organiza os contratos removendo duplicatas e agrupando por tipo
    static organizeContractsByGroups(contractsList) {
        const contractGroups = ConfigurationsView.getContractGroups();
        const organizedGroups = {};
        const contractMap = new Map();

        // Remover duplicatas primeiro
        contractsList.forEach(contract => {
            if (!contractMap.has(contract.contract_type)) {
                contractMap.set(contract.contract_type, {
                    contract_type: contract.contract_type,
                    contract_display: contract.contract_display || contract.contract_type
                });
            }
        });

        const uniqueContracts = Array.from(contractMap.values());

        // Organizar por grupos
        for (const [groupName, groupData] of Object.entries(contractGroups)) {
            organizedGroups[groupName] = [];

            groupData.contracts.forEach(contractType => {
                const matchingContract = uniqueContracts.find(c => c.contract_type === contractType);
                if (matchingContract) {
                    organizedGroups[groupName].push(matchingContract);
                }
            });
        }

        return organizedGroups;
    }

    // Atualiza o dropdown "Tipo Trade:" baseado no contrato selecionado
    static updateTradeTypeDropdown(contractType) {

        const tradeTypeSelect = CommonHelpers.getElement('trade-type-select');

        if (!tradeTypeSelect || !contractType) {

            if (tradeTypeSelect) {
                tradeTypeSelect.innerHTML = '<option value="">Selecione um contrato primeiro</option>';
                tradeTypeSelect.disabled = true;
            }
            return;
        }

        // 🔧 DETECÇÃO MELHORADA: Verificar se é contrato Higher/Lower
        const contractGroups = ConfigurationsView.getContractGroups();

        const higherLowerGroup = contractGroups['Higher/Lower'];
        const hasHigherLowerGroup = !!higherLowerGroup;

        // 🔧 LÓGICA DE DETECÇÃO CORRIGIDA - INCLUIR HIGHER_LOWER_GROUP
        const isHigherLowerGroup = contractType === 'HIGHER_LOWER_GROUP';
        const isHigherLowerContract = ['CALLE', 'PUTE', 'CALLPUT'].includes(contractType);
        // ✅ CORREÇÃO CRÍTICA: Se é HIGHER_LOWER_GROUP, então É Higher/Lower
        const isHigherLower = isHigherLowerGroup || isHigherLowerContract;

        // 🎯 LÓGICA HIGHER/LOWER: Configurar opções específicas
        if (isHigherLower) {

            // 🎯 CONFIGURAÇÃO FIXA: Sempre mostrar apenas Higher, Lower e Ambos
            const higherLowerOptions = [
                { value: 'CALLE', text: 'Higher' },
                { value: 'PUTE', text: 'Lower' },
                { value: 'BOTH', text: 'Ambos' }
            ];

            // Aplicar opções ao select
            tradeTypeSelect.innerHTML = higherLowerOptions
                .map(opt => `<option value="${opt.value}">${opt.text}</option>`)
                .join('');

            tradeTypeSelect.disabled = false;

            // ✅ DEFINIR valor padrão como Higher
            tradeTypeSelect.value = "CALLE";

            // ✅ CORREÇÃO: Forçar atualização dos campos de barreira para Higher/Lower

            ConfigurationsView.updatePredictionBarrierFields(contractType);

        } else {

            // ✅ LÓGICA NORMAL para outros grupos (não Higher/Lower)
            let currentGroup = null;
            let groupContracts = [];

            for (const [groupName, groupData] of Object.entries(contractGroups)) {
                if (groupData.contracts.includes(contractType)) {
                    currentGroup = groupName;
                    // Filtrar apenas contratos disponíveis no grupo
                    groupContracts = groupData.contracts.filter(ct => {
                        return ConfigurationsView.availableContracts.some(ac => ac.contract_type === ct);
                    });

                    break;
                }
            }

            if (!currentGroup || groupContracts.length === 0) {
                // Contrato individual ou grupo não encontrado - mostrar o próprio contrato
                const contract = ConfigurationsView.availableContracts.find(c => c.contract_type === contractType);
                if (contract) {
                    tradeTypeSelect.innerHTML = `
                        <option value="">Selecione o tipo</option>
                        <option value="${contractType}" selected>${contract.contract_display || contractType}</option>
                    `;
                    tradeTypeSelect.disabled = false;
                    tradeTypeSelect.value = contractType;

                } else {
                    tradeTypeSelect.innerHTML = '<option value="">Contrato não encontrado</option>';
                    tradeTypeSelect.disabled = true;
                    CommonHelpers.showWarning(`⚠️ [TRADE TYPE DEBUG] Contrato não encontrado: ${contractType}`);
                }
                return;
            }

            // Popular dropdown com contratos do grupo + opção "Ambos"
            let optionsHtml = '<option value="">Selecione o tipo</option>';

            // Mapeamento de nomes amigáveis para contratos específicos
            const contractDisplayNames = {
                'CALLPUT': 'Higher/Lower',
                'CALLE': 'Higher',
                'PUTE': 'Lower',
                'CALL': 'Call',
                'PUT': 'Put',
                'DIGITOVER': 'Over',
                'DIGITUNDER': 'Under',
                'DIGITDIFF': 'Differ',
                'DIGITMATCH': 'Match',
                'DIGITEVEN': 'Even',
                'DIGITODD': 'Odd',
                'TOUCH': 'Touch',
                'NOTOUCH': 'No Touch',
                'ASIANU': 'Asian Up',
                'ASIAND': 'Asian Down'
            };

            groupContracts.forEach(contractTypeInGroup => {
                const contract = ConfigurationsView.availableContracts.find(c => c.contract_type === contractTypeInGroup);
                if (contract) {
                    const displayName = contractDisplayNames[contractTypeInGroup] || contract.contract_display || contractTypeInGroup;
                    optionsHtml += `<option value="${contractTypeInGroup}">${displayName}</option>`;

                }
            });

            // Adicionar opção "Ambos" apenas se houver 2 ou mais contratos no grupo
            if (groupContracts.length >= 2) {
                optionsHtml += '<option value="BOTH">Ambos</option>';

            }

            tradeTypeSelect.innerHTML = optionsHtml;
            tradeTypeSelect.disabled = false;

            // Para outros grupos, usar lógica existente
            if (groupContracts.includes(contractType)) {
                tradeTypeSelect.value = contractType;

            } else if (groupContracts.length > 0) {
                tradeTypeSelect.value = groupContracts[0];

            }

        }
    }

    // Atualiza as opções de duração baseadas no contrato selecionado
    static updateDurationOptions(contractType) {
        const durationUnitSelect = CommonHelpers.getElement('duration-unit-select');
        const durationInput = CommonHelpers.getElement('duration-input');

        if (!durationUnitSelect || !contractType) {
            return;
        }

        // ✅ CORREÇÃO CRÍTICA: Detectar HIGHER_LOWER_GROUP e tratá-lo como Higher/Lower
        if (contractType === 'HIGHER_LOWER_GROUP') {
            const higherLowerGroup = ConfigurationsView.getContractGroups()['Higher/Lower'];
            if (higherLowerGroup) {
                const availableUnits = new Set(higherLowerGroup.allowedUnits);
                this.populateDurationUnitsSelect(durationUnitSelect, availableUnits, contractType);

                if (durationInput && higherLowerGroup.minDuration) {
                    const currentDuration = parseInt(durationInput.value) || 1;
                    if (currentDuration < higherLowerGroup.minDuration) {
                        durationInput.value = higherLowerGroup.minDuration;
                        durationInput.min = higherLowerGroup.minDuration;
                    }
                }
                return;
            }
        }

        // Buscar grupo do contrato
        const contractGroups = ConfigurationsView.getContractGroups();
        let contractGroup = null;

        for (const [groupName, groupData] of Object.entries(contractGroups)) {
            if (groupData.contracts.includes(contractType)) {
                contractGroup = groupData;
                break;
            }
        }

        // Se não encontrou o grupo, usar lógica legacy
        if (!contractGroup) {
            CommonHelpers.showWarning(`⚠️ Contrato ${contractType} não encontrado nos grupos, usando lógica legacy`);
            return this.updateDurationOptionsLegacy(contractType);
        }

        // Configurar unidades de duração baseado no grupo
        const availableUnits = new Set();
        contractGroup.allowedUnits.forEach(unit => {
            availableUnits.add(unit);
        });

        // Popular o select com as unidades permitidas
        this.populateDurationUnitsSelect(durationUnitSelect, availableUnits, contractType);

        // Configurar duração mínima
        if (durationInput && contractGroup.minDuration) {
            const currentDuration = parseInt(durationInput.value) || 1;
            if (currentDuration < contractGroup.minDuration) {
                durationInput.value = contractGroup.minDuration;
                durationInput.min = contractGroup.minDuration;
            }
        }

    }

    // Método legacy para contratos não configurados
    static updateDurationOptionsLegacy(contractType) {
        const durationUnitSelect = CommonHelpers.getElement('duration-unit-select');

        // Mapas de fallback para contratos legacy
        const contractMappings = {
            // Contratos de dígitos - apenas ticks
            'DIGITDIFF': ['t'],
            'DIGITMATCH': ['t'],
            'DIGITOVER': ['t'],
            'DIGITUNDER': ['t'],
            'DIGITEVEN': ['t'],
            'DIGITODD': ['t'],

            // Rise/Fall - múltiplas unidades
            'CALL': ['t', 's', 'm', 'h'],
            'PUT': ['t', 's', 'm', 'h'],
            'CALLE': ['t', 's', 'm', 'h'],
            'PUTE': ['t', 's', 'm', 'h'],

            // Touch - ticks e tempo
            'TOUCH': ['t', 'm', 'h'],
            'NOTOUCH': ['t', 'm', 'h'],
            'ONETOUCH': ['t', 'm', 'h'],

            // Outros
            'RESETCALL': ['t', 's', 'm', 'h'],
            'RESETPUT': ['t', 's', 'm', 'h']
        };

        const units = contractMappings[contractType] || ['t'];
        const availableUnits = new Set(units);

        this.populateDurationUnitsSelect(durationUnitSelect, availableUnits, contractType);
    }

    // ✅ NOVA FUNÇÃO: Popular select de unidades de duração
    static populateDurationUnitsSelect(durationUnitSelect, availableDurationUnits, contractType) {
        // Mapeamento das unidades para display
        const unitDisplayMap = {
            't': { value: 't', display: 'Ticks' },
            's': { value: 's', display: 'Segundos' },
            'm': { value: 'm', display: 'Minutos' },
            'h': { value: 'h', display: 'Horas' },
            'd': { value: 'd', display: 'Dias' }
        };

        // Ordem especial das unidades
        const unitOrder = ['t', 's', 'm', 'h', 'd'];

        // Construir HTML das opções ordenadas
        const sortedUnits = unitOrder.filter(unit => availableDurationUnits.has(unit));

        if (sortedUnits.length > 0) {
            const optionsHtml = sortedUnits.map(unit => {
                const unitInfo = unitDisplayMap[unit];
                return `<option value="${unitInfo.value}">${unitInfo.display}</option>`;
            }).join('');

            durationUnitSelect.innerHTML = optionsHtml;

            // Definir valor padrão baseado no tipo de contrato
            let defaultValue = sortedUnits[0]; // Primeira disponível como fallback

            // 🔧 NOVA LÓGICA: Valores padrão específicos por contrato
            if (['DIGITDIFF', 'DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD', 'DIGITMATCH'].includes(contractType)) {
                defaultValue = 't'; // Dígitos sempre ticks
            } else if (['TICKHIGH', 'TICKLOW'].includes(contractType)) {
                defaultValue = 't'; // Ticks obrigatório
            } else if (['CALL', 'PUT', 'CALLE', 'PUTE', 'RESETCALL', 'RESETPUT'].includes(contractType)) {
                // Rise/Fall: preferir ticks se disponível, senão segundos
                if (availableDurationUnits.has('t')) defaultValue = 't';
                else if (availableDurationUnits.has('s')) defaultValue = 's';
            } else if (['TOUCH', 'NOTOUCH', 'ONETOUCH'].includes(contractType)) {
                // Touch: preferir minutos
                if (availableDurationUnits.has('m')) defaultValue = 'm';
                else if (availableDurationUnits.has('t')) defaultValue = 't';
            } else if (['EXPIRYRANGE', 'EXPIRYMISS', 'RANGE', 'UPORDOWN'].includes(contractType)) {
                // 2 barreiras: preferir minutos
                if (availableDurationUnits.has('m')) defaultValue = 'm';
                else if (availableDurationUnits.has('h')) defaultValue = 'h';
            }

            durationUnitSelect.value = defaultValue;


        } else {
            // Fallback se nenhuma unidade foi determinada
            CommonHelpers.showWarning(`⚠️ Nenhuma unidade determinada para ${contractType}, usando fallback`);
            durationUnitSelect.innerHTML = `<option value="t">Ticks</option>`;
            durationUnitSelect.value = 't';
        }
    }

    // Atualiza os campos de Previsão/Barreira baseados no tipo de contrato
    static updatePredictionBarrierFields(contractType) {
        const container = CommonHelpers.getElement('prediction-barrier-container');
        if (!container || !contractType) {
            // Se não houver tipo de contrato, limpar campos e ocultar container
            ConfigurationsView.clearPredictionBarrierFields();
            container.style.display = 'none';
            return;
        }

        // ✅ CORREÇÃO CRÍTICA: Detectar APENAS contratos Higher/Lower europeus que precisam de barreira
        const isHigherLowerGroup = contractType === 'HIGHER_LOWER_GROUP';
        const isHigherLowerContract = ['CALLE', 'PUTE', 'CALLPUT'].includes(contractType);
        const isHigherLower = isHigherLowerGroup || isHigherLowerContract;

        // ❌ CORREÇÃO: Rise/Fall (CALL/PUT) NÃO precisam de barreira
        const isRiseFallContract = ['CALL', 'PUT'].includes(contractType);


        // Se é Higher/Lower europeu (CALLE/PUTE), forçar exibição da barreira
        if (isHigherLower && !isRiseFallContract) {

            container.style.display = 'flex';
            container.innerHTML = `
                <label for="barrier-input">Barreira:</label>
                <input type="text" id="barrier-input" class="form-control"
                       value="+1"
                       placeholder="Ex: +0.5 ou -0.3"
                       title="Barreira com sinal obrigatório: +0.5 ou -0.3"
                       pattern="^[+-]\\d+(\\.\\d+)?$"
                       onchange="ConfigurationsView.validateAndSaveBarrier(this);"
                       style="font-family: monospace;">
            `;

            // Salvar configuração após atualizar campos
            setTimeout(() => {
                ConfigurationsView.saveCurrentConfiguration();
            }, 100);
            return;
        }

        // Se é Rise/Fall (CALL/PUT), não mostrar barreira
        if (isRiseFallContract) {

            ConfigurationsView.clearPredictionBarrierFields();
            container.style.display = 'none';
            return;
        }

        // Buscar configuração do grupo para outros contratos
        const contractGroups = ConfigurationsView.getContractGroups();
        let contractGroup = null;

        for (const [groupName, groupData] of Object.entries(contractGroups)) {
            if (groupData.contracts.includes(contractType)) {
                contractGroup = groupData;
                break;
            }
        }

        // Se não encontrou o grupo, usar lógica legacy
        if (!contractGroup) {
            return this.updatePredictionBarrierFieldsLegacy(contractType);
        }

        // Verificar se usa previsão de dígitos (0-9)
        const usesDigitPrediction = contractGroup.usesDigitPrediction ||
            ['DIGITOVER', 'DIGITUNDER', 'DIGITDIFF', 'DIGITMATCH'].includes(contractType);

        // Verificar se não usa barreira e não usa previsão
        if (!contractGroup.hasBarrier && !usesDigitPrediction && !contractGroup.usesPredictionRange) {
            ConfigurationsView.clearPredictionBarrierFields();
            container.style.display = 'none';
            return;
        }

        // Exibir o container
        container.style.display = 'flex';

        let html = '';

        // Verificar tipo de barreira/previsão
        if (usesDigitPrediction) {
            // Campo de previsão para contratos de dígitos (0-9)
            const defaultValue = contractType.includes('OVER') || contractType.includes('UNDER') ? '5' : '0';
            html = `
                <label for="prediction-input">Previsão:</label>
                <input type="number" id="prediction-input" class="form-control"
                       min="0" max="9" step="1"
                       value="${defaultValue}"
                       placeholder="0-9"
                       title="Digite um número de 0 a 9"
                       oninput="this.value = this.value.slice(0,1); if(this.value > 9) this.value = 9; if(this.value < 0) this.value = 0; ConfigurationsView.saveCurrentConfiguration();">
            `;
        } else if (contractGroup.usesPredictionRange) {
            // Campo de previsão com range (1-5) para High/Low Ticks
            html = `
                <label for="prediction-input">Previsão:</label>
                <input type="number" id="prediction-input" class="form-control"
                       min="1" max="5" step="1"
                       value="3"
                       placeholder="1-5"
                       title="Digite um número de 1 a 5"
                       oninput="this.value = Math.max(1, Math.min(5, Math.floor(this.value))); ConfigurationsView.saveCurrentConfiguration();">
            `;
        } else if (contractGroup.doubleBarrier) {
            // Campos de barreiras duplas
            html = `
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <div class="form-group-inline" style="margin-bottom: 8px;">
                        <label for="barrier-high-input">Barreira Superior:</label>
                        <input type="number" id="barrier-high-input" class="form-control"
                               step="0.00001"
                               value="0.001"
                               placeholder="Ex: 0.001"
                               title="Barreira superior"
                               onchange="ConfigurationsView.saveCurrentConfiguration();">
                    </div>
                    <div class="form-group-inline" style="margin-bottom: 0;">
                        <label for="barrier-low-input">Barreira Inferior:</label>
                        <input type="number" id="barrier-low-input" class="form-control"
                               step="0.00001"
                               value="-0.001"
                               placeholder="Ex: -0.001"
                               title="Barreira inferior"
                               onchange="ConfigurationsView.saveCurrentConfiguration();">
                    </div>
                </div>
            `;
        } else if (contractGroup.singleBarrier) {
            // Campo de barreira única
            html = `
                <label for="barrier-input">Barreira:</label>
                <input type="text" id="barrier-input" class="form-control"
                       value="+1"
                       placeholder="Ex: +0.5 ou -0.3"
                       title="Barreira com sinal obrigatório: +0.5 ou -0.3"
                       pattern="^[+-]\\d+(\\.\\d+)?$"
                       onchange="ConfigurationsView.validateAndSaveBarrier(this);"
                       style="font-family: monospace;">
            `;
        }

        container.innerHTML = html;

        // 💾 Salvar configuração após atualizar campos
        setTimeout(() => {
            ConfigurationsView.saveCurrentConfiguration();
            // ✅ Validar duração após trocar contrato
            ConfigurationsView.validateAndSaveDuration();
        }, 100);
    }

    // Método legacy para contratos não configurados
    static updatePredictionBarrierFieldsLegacy(contractType) {
        const container = CommonHelpers.getElement('prediction-barrier-container');

        // Definir tipos de contratos e suas necessidades (legacy)
        const contractRequirements = {
            // Contratos de dígitos - usam PREVISÃO (0-9)
            'DIGITDIFF': { type: 'prediction', label: 'Previsão:' },
            'DIGITMATCH': { type: 'prediction', label: 'Previsão:' },
            'DIGITOVER': { type: 'prediction', label: 'Previsão:' },
            'DIGITUNDER': { type: 'prediction', label: 'Previsão:' },
            'DIGITEVEN': { type: 'none', label: '' },
            'DIGITODD': { type: 'none', label: '' },

            // Contratos Only Ups/Downs - NÃO usam barreira
            'RUNHIGH': { type: 'none', label: '' },
            'RUNLOW': { type: 'none', label: '' },

            // Outros contratos legacy
            'RESETCALL': { type: 'none', label: '' },
            'RESETPUT': { type: 'none', label: '' }
        };

        const requirement = contractRequirements[contractType];

        if (!requirement || requirement.type === 'none') {
            ConfigurationsView.clearPredictionBarrierFields();
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        if (requirement.type === 'prediction') {
            container.innerHTML = `
                <label for="prediction-input">${requirement.label}</label>
                <input type="number" id="prediction-input" class="form-control"
                       min="0" max="9" step="1"
                       value="${requirement.defaultValue}"
                       placeholder="0-9"
                       title="Digite um número de 0 a 9"
                       oninput="this.value = this.value.slice(0,1); if(this.value > 9) this.value = 9; if(this.value < 0) this.value = 0; ConfigurationsView.saveCurrentConfiguration();">
            `;
        }

        setTimeout(() => {
            ConfigurationsView.saveCurrentConfiguration();
        }, 100);
    }

    // Método para limpar campos específicos quando nenhum contrato individual está selecionado
    static clearPredictionBarrierFields() {
        const predictionInput = CommonHelpers.getElement('prediction-input');
        const barrierInput = CommonHelpers.getElement('barrier-input', true);
        const barrierHighInput = CommonHelpers.getElement('barrier-high-input', true);
        const barrierLowInput = CommonHelpers.getElement('barrier-low-input');

        if (predictionInput) predictionInput.value = '';
        if (barrierInput) barrierInput.value = '';
        if (barrierHighInput) barrierHighInput.value = '';
        if (barrierLowInput) barrierLowInput.value = '';

        // Ocultar o container se estiver visível
        const container = CommonHelpers.getElement('prediction-barrier-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    // Obter valores de previsão/barreira dos campos de input
    static getPredictionBarrierValues() {
        const predictionInput = CommonHelpers.getElement('prediction-input');
        const barrierInput = CommonHelpers.getElement('barrier-input', true);
        const barrierHighInput = CommonHelpers.getElement('barrier-high-input', true);
        const barrierLowInput = CommonHelpers.getElement('barrier-low-input');
        const tradeTypeSelect = CommonHelpers.getElement('trade-type-select');
        const contractSelect = CommonHelpers.getElement('contract-select');

        const selectedTradeType = tradeTypeSelect?.value;
        const selectedContractGroup = contractSelect?.value;


        // ✅ CORREÇÃO: MODO AMBOS - usar contrato selecionado como base
        if (selectedTradeType === 'BOTH' && selectedContractGroup) {

            // Para modo AMBOS, usar o contrato selecionado no dropdown como referência
            const referenceContractType = selectedContractGroup;

            // Buscar o contrato nos disponíveis
            const referenceContract = ConfigurationsView.availableContracts?.find(c => c.contract_type === referenceContractType);

            if (referenceContract) {

                const result = ConfigurationsView.getPredictionBarrierValuesForContract(
                    referenceContract.contract_type,
                    null, // groupId não é necessário
                    predictionInput,
                    barrierInput,
                    barrierHighInput,
                    barrierLowInput
                );

                return result;
            } else {
                CommonHelpers.showWarning('⚠️ [PREDICTION DEBUG] Contrato de referência não encontrado');
            }
        }

        // Se nenhum trade type selecionado
        if (!selectedTradeType) {

            return { type: 'none', value: null };
        }

        // Se modo "Ambos" sem contrato válido, retornar none
        if (selectedTradeType === 'BOTH') {

            return { type: 'none', value: null };
        }

        // Obter o contrato individual selecionado
        const contractType = selectedTradeType;


        // Buscar o contrato completo para obter detalhes
        const selectedContract = ConfigurationsView.availableContracts?.find(c => c.contract_type === contractType);

        if (!selectedContract) {
            CommonHelpers.showWarning('⚠️ [PREDICTION DEBUG] Contrato não encontrado:', contractType);
            return { type: 'none', value: null };
        }

        const result = ConfigurationsView.getPredictionBarrierValuesForContract(
            selectedContract.contract_type,
            selectedContract.groupId,
            predictionInput,
            barrierInput,
            barrierHighInput,
            barrierLowInput
        );

        return result;
    }

    // Método auxiliar para obter valores de previsão/barreira para um contrato específico, considerando seus requisitos
    static getPredictionBarrierValuesForContract(contractType, groupId, predictionInput, barrierInput, barrierHighInput, barrierLowInput) {
        // Mapeamento de contratos para requisitos de barreira
        const contractBarrierRequirements = {
            // ✅ CORREÇÃO: Rise/Fall (CALL/PUT) NÃO precisam de barreira
            'CALL': { type: 'none', required: false },
            'PUT': { type: 'none', required: false },
            // Apenas Higher/Lower europeus precisam de barreira
            'CALLE': { type: 'single_barrier', required: true },
            'PUTE': { type: 'single_barrier', required: true },

            // Contratos Asian
            'ASIANU': { type: 'none', required: false },
            'ASIAND': { type: 'none', required: false },

            // Outros contratos com barreira única
            'TOUCH': { type: 'single_barrier', required: true },
            'NOTOUCH': { type: 'single_barrier', required: true },
            'ONETOUCH': { type: 'single_barrier', required: true },
            'RUNHIGH': { type: 'single_barrier', required: true }, // Only Ups/Downs
            'RUNLOW': { type: 'single_barrier', required: true }, // Only Ups/Downs
            'CALLPUT': { type: 'single_barrier', required: true }, // Higher/Lower

            // Contratos com barreiras duplas
            'RANGE': { type: 'double_barrier', required: true },
            'UPORDOWN': { type: 'double_barrier', required: true },
            'EXPIRYRANGE': { type: 'double_barrier', required: true },
            'EXPIRYMISS': { type: 'double_barrier', required: true },

            // Contratos de dígitos (previsão)
            'DIGITDIFF': { type: 'prediction', required: true },
            'DIGITMATCH': { type: 'prediction', required: true },
            'DIGITOVER': { type: 'prediction', required: true },
            'DIGITUNDER': { type: 'prediction', required: true },

            // Contratos sem necessidade de previsão ou barreira
            'TICKHIGH': { type: 'none', required: false },
            'TICKLOW': { type: 'none', required: false },
            'DIGITEVEN': { type: 'none', required: false },
            'DIGITODD': { type: 'none', required: false },
            'HIGHLOW': { type: 'none', required: false }, // Contrato individual genérico
            'HIGHEREVEN': { type: 'none', required: false },
            'LOWEREVENT': { type: 'none', required: false },

            // Contratos com campos de reset
            'RESETCALL': { type: 'single_barrier', required: true, reset: true },
            'RESETPUT': { type: 'single_barrier', required: true, reset: true }
        };

        const requirement = contractBarrierRequirements[contractType];

        if (!requirement) {
            CommonHelpers.showWarning('⚠️ [CONTRACT DEBUG] Nenhum requisito encontrado para:', contractType);
            return { type: 'none', value: null };
        }

        // Para contratos de dígitos
        if (requirement.type === 'prediction') {
            if (predictionInput) {
                const rawValue = predictionInput.value;
                const predictionValue = parseInt(rawValue);

                if (!isNaN(predictionValue) && predictionValue >= 0 && predictionValue <= 9) {
                    const result = {
                        type: 'prediction',
                        value: predictionValue
                    };
                    return result;
                } else {
                    CommonHelpers.showWarning('⚠️ [CONTRACT DEBUG] Valor de previsão inválido:', rawValue);
                }
            } else {
                CommonHelpers.showWarning('⚠️ [CONTRACT DEBUG] predictionInput não encontrado');
            }
            return { type: 'none', value: null };
        }

        // Para outros tipos de contrato com barreira única
        if (requirement.type === 'single_barrier') {
            if (barrierInput && barrierInput.value) {
                const result = {
                    type: 'single_barrier',
                    value: parseFloat(barrierInput.value)
                };
                return result;
            }
            CommonHelpers.showWarning('⚠️ [CONTRACT DEBUG] Barreira única não encontrada');
            return { type: 'none', value: null };
        }

        // Para contratos com barreiras duplas
        if (requirement.type === 'double_barrier') {
            if (barrierHighInput && barrierLowInput && barrierHighInput.value && barrierLowInput.value) {
                const result = {
                    type: 'double_barrier',
                    high: parseFloat(barrierHighInput.value),
                    low: parseFloat(barrierLowInput.value)
                };
                return result;
            }
            CommonHelpers.showWarning('⚠️ [CONTRACT DEBUG] Barreiras duplas não encontradas');
            return { type: 'none', value: null };
        }

        // Para contratos sem necessidade de previsão/barreira
        return { type: 'none', value: null };
    }

    // ✅ NOVA FUNÇÃO: Validar configuração do modo "Ambos" em tempo real
    static validateBothModeConfiguration() {
        const tradeTypeSelect = CommonHelpers.getElement('trade-type-select');
        const contractSelect = CommonHelpers.getElement('contract-select');
        const predictionInput = CommonHelpers.getElement('prediction-input');

        if (!tradeTypeSelect || tradeTypeSelect.value !== 'BOTH') {
            return; // Não é modo "Ambos"
        }

        const selectedContractType = contractSelect?.value;
        if (!selectedContractType) {
            return; // Nenhum contrato selecionado
        }

        // Verificar se contratos de dígitos precisam de previsão
        const digitContracts = ['DIGITDIFF', 'DIGITOVER', 'DIGITUNDER', 'DIGITMATCH'];
        const needsPrediction = digitContracts.includes(selectedContractType);

        if (needsPrediction) {
            const predictionValue = predictionInput?.value;
            const isValidPrediction = predictionValue !== '' &&
                !isNaN(predictionValue) &&
                parseInt(predictionValue) >= 0 &&
                parseInt(predictionValue) <= 9;

            if (!isValidPrediction) {
                // Destacar campo de previsão
                if (predictionInput) {
                    predictionInput.style.boxShadow = '0 0 0 2px rgba(255, 193, 7, 0.5)';
                    predictionInput.style.border = '1px solid #ffc107';
                    predictionInput.title = 'Previsão obrigatória para modo "Ambos" com contratos de dígitos';

                    // Mostrar tooltip
                    ConfigurationsView.showValidationTooltip(predictionInput,
                        'Modo "Ambos" requer previsão (0-9) para contratos de dígitos');
                }
            } else {
                // Remover destaque se válido
                if (predictionInput) {
                    predictionInput.style.boxShadow = '';
                    predictionInput.style.border = '';
                    predictionInput.title = '';
                }
            }
        }
    }

    // 🎯 NOVA FUNÇÃO: Aplicar valores padrão em campos vazios
    static applyDefaultValues() {
        const defaultValues = {

            'contract-select': 'DIGITDIFF',
            'trade-type-select': 'DIGITDIFF',
            'duration-input': '1',
            'duration-unit-select': 't',
            'stake-input': '0.35',
            'goal-input': '1',
            'stop-loss-input': '100',
            'stop-loss-input': '100',
            'gale-multiplier-input': '1.0',
            'gale-split-input': '1',
            'gale-split-threshold': '0', // Default
            'prediction-input': '0',
            'barrier-input': '1',
            'barrier-high-input': '0.001',
            'barrier-low-input': '-0.001',
            'win-real-input': '5',
            'loss-real-input': '1',
            'win-simulated-input': '0',
            'loss-simulated-input': '1',
            'trade-limit-input': '0', // Default value for trade limit
            'cooldown-period-input': '3', // Default value for cooldown period
            'pause-time-input': '', // Vazio = Desativado
            'pause-trades-input': '2',
            'pause-on-wins': false
        };

        Object.entries(defaultValues).forEach(([fieldId, defaultValue]) => {
            const element = CommonHelpers.getElement(fieldId);
            if (element) {
                if (element.type === 'checkbox') {
                    // Para checkboxes, só aplicamos o padrão se não houver valor salvo anterior (opcional)
                    // Por simplicidade, se odefaultValue for booleano, aplicamos
                    if (typeof defaultValue === 'boolean') {
                        element.checked = defaultValue;
                    }
                } else if (!element.value || element.value.trim() === '') {
                    element.value = defaultValue;
                }
            }
        });

        // Salvar configuração após aplicar valores padrão
        setTimeout(() => {
            ConfigurationsView.saveCurrentConfiguration();
        }, 200);
    }

    // ✅ NOVA FUNÇÃO: Mostrar tooltip de validação
    static showValidationTooltip(element, message) {
        // Remover tooltip existente
        const existingTooltip = document.querySelector('.validation-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'validation-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            max-width: 200px;
            pointer-events: none;
        `;
        tooltip.textContent = message;

        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;

        document.body.appendChild(tooltip);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (tooltip && tooltip.parentElement) {
                tooltip.remove();
            }
        }, 5000);
    }

    // ✅ NOVA FUNÇÃO: Lidar com entrada do campo de barreira superior
    static handleBarrierHighInput(input) {
        let value = parseFloat(input.value);

        // Garantir que seja sempre positivo
        if (!isNaN(value) && value < 0) {
            input.value = Math.abs(value);
        }
    }

    // ✅ NOVA FUNÇÃO: Lidar com entrada do campo de barreira inferior
    static handleBarrierLowInput(input) {
        let value = parseFloat(input.value);

        if (!isNaN(value)) {
            // Se o usuário digitou um valor positivo, converter para negativo automaticamente
            if (value > 0) {
                input.value = -value;
            }

        }
    }

    // ➗ NOVA LÓGICA: SPLIT GALE DROPDOWN CUSTOMIZADO
    static toggleSplitDropdown() {
        const menu = CommonHelpers.getElement('split-dropdown-menu');
        if (menu) {
            const isVisible = menu.style.display === 'block';
            menu.style.display = isVisible ? 'none' : 'block';
        }
    }

    static selectSplitOption(value) {
        // Atualizar hidden input
        const hiddenInput = CommonHelpers.getElement('gale-split-input');
        if (hiddenInput) {
            hiddenInput.value = value;
        }

        // Atualizar display
        const display = CommonHelpers.getElement('split-value-display');
        if (display) {
            display.textContent = `${value}`;
        }

        // Fechar menu
        const menu = CommonHelpers.getElement('split-dropdown-menu');
        if (menu) {
            menu.style.display = 'none';
        }

        // Salvar configuração
        ConfigurationsView.saveCurrentConfiguration();
    }

    static populateSplitDropdown() {
        const menu = CommonHelpers.getElement('split-dropdown-menu');
        if (!menu) return;

        let html = '';
        for (let i = 1; i <= 10; i++) {
            html += `
                <div class="split-option" 
                     onclick="ConfigurationsView.selectSplitOption(${i})"
                     style="padding: 8px 12px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span>${i}</span>
                </div>
            `;
        }
        menu.innerHTML = html;

        // Adicionar hover effect via JS simples
        const options = menu.querySelectorAll('.split-option');
        options.forEach(opt => {
            opt.addEventListener('mouseenter', () => opt.style.backgroundColor = 'rgba(255,255,255,0.1)');
            opt.addEventListener('mouseleave', () => opt.style.backgroundColor = 'transparent');
        });

        // Setup click outside
        this.setupSplitDropdownOutsideClick();
    }

    static setupSplitDropdownOutsideClick() {
        if (this._splitDropdownClickSetup) return;
        this._splitDropdownClickSetup = true;

        document.addEventListener('click', (e) => {
            const container = document.querySelector('.split-gale-container');
            const menu = CommonHelpers.getElement('split-dropdown-menu');

            if (menu && menu.style.display === 'block' && container && !container.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
    }

    // Normalizar operadores para exibição
    normalizeOperator(operator) {
        const operatorMap = {
            '>': 'mais que',
            '<': 'menos que',
            '=': 'exatamente',
            '>=': 'pelo menos',
            '<=': 'no máximo'
        };
        return operatorMap[operator] || operator;
    }

    // ✅ NOVA FUNÇÃO: Validar duração em tempo real para um contrato
    static validateDurationForContract(contractType, duration, durationUnit) {
        const contractInfo = this.availableContracts?.find(c => c.contract_type === contractType);
        if (!contractInfo) {
            return { isValid: false, error: 'Contrato não encontrado para validação de duração.' };
        }

        // 1. Obter limites de duração
        let minDuration = contractInfo.min_contract_duration;
        let maxDuration = contractInfo.max_contract_duration;

        // Converter limites para a unidade desejada (se necessário)
        const convertToSeconds = (value, unit) => {
            switch (unit) {
                case 's': return value;
                case 'm': return value * 60;
                case 'h': return value * 3600;
                case 'd': return value * 86400;
                case 't': return null; // Ticks não são convertidos para segundos
                default: return null;
            }
        };

        // Se a unidade for ticks, a validação é diferente
        if (durationUnit === 't') {
            // Contratos de dígitos geralmente têm limite implícito de 1-10 ticks
            if (['DIGITDIFF', 'DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD', 'DIGITMATCH'].includes(contractType)) {
                if (duration < 1 || duration > 10) {
                    return { isValid: false, error: `Para contratos de ${contractType}, a duração em Ticks deve ser entre 1 e 10.` };
                }
            }
            // Contratos de tick (TICKHIGH, TICKLOW) também
            else if (['TICKHIGH', 'TICKLOW'].includes(contractType)) {
                if (duration < 1 || duration > 10) { // Supondo limite similar
                    return { isValid: false, error: `Para contratos de ${contractType}, a duração em Ticks deve ser entre 1 e 10.` };
                }
            }
            // Outros contratos que aceitam ticks (como Rise/Fall em alguns ativos)
            else if (minDuration && maxDuration) {
                // Verificar se ticks estão dentro dos limites gerais definidos para o contrato
                if (duration < minDuration || duration > maxDuration) {
                    return { isValid: false, error: `Duração em Ticks fora do intervalo permitido (${minDuration}-${maxDuration}) para ${contractType}.` };
                }
            }
        } else {
            // Validação para unidades de tempo (s, m, h, d)
            const durationInSeconds = convertToSeconds(duration, durationUnit);
            const minDurationInSeconds = minDuration ? convertToSeconds(minDuration, contractInfo.duration_units && contractInfo.duration_units.includes('s') ? 's' : 't') : null; // Assumindo segundos como unidade base se disponível
            const maxDurationInSeconds = maxDuration ? convertToSeconds(maxDuration, contractInfo.duration_units && contractInfo.duration_units.includes('s') ? 's' : 't') : null;

            // Lógica específica para contratos com durações definidas
            if (minDurationInSeconds !== null && maxDurationInSeconds !== null) {
                if (durationInSeconds < minDurationInSeconds || durationInSeconds > maxDurationInSeconds) {
                    return { isValid: false, error: `Duração em ${durationUnitDisplayMap[durationUnit]} (${duration}) fora do intervalo permitido (${minDuration}-${maxDuration} em segundos) para ${contractType}.` };
                }
            } else {
                // Lógica para contratos sem limites claros em segundos, mas com limites em outras unidades
                if (['CALL', 'PUT', 'CALLE', 'PUTE', 'RESETCALL', 'RESETPUT'].includes(contractType)) {
                    if (durationUnit === 's' && (duration < 5 || duration > 3600)) return { isValid: false, error: `Duração em Segundos fora do intervalo (5s-1h) para ${contractType}.` };
                    if (durationUnit === 'm' && (duration < 1 || duration > 60)) return { isValid: false, error: `Duração em Minutos fora do intervalo (1m-60m) para ${contractType}.` };
                    if (durationUnit === 'h' && duration > 24) return { isValid: false, error: `Duração em Horas fora do intervalo (até 24h) para ${contractType}.` };
                } else if (['TOUCH', 'NOTOUCH', 'ONETOUCH'].includes(contractType)) {
                    if (durationUnit === 's' && duration < 1) return { isValid: false, error: `Duração em Segundos deve ser pelo menos 1 para ${contractType}.` };
                    if (durationUnit === 'm' && duration < 2) return { isValid: false, error: `Duração em Minutos deve ser pelo menos 2 para ${contractType}.` };
                    if (durationUnit === 'h' && duration < 1) return { isValid: false, error: `Duração em Horas deve ser pelo menos 1 para ${contractType}.` };
                } else if (['RANGE', 'UPORDOWN', 'EXPIRYMISS', 'EXPIRYRANGE'].includes(contractType)) {
                    if (durationUnit === 'm' && duration < 2) return { isValid: false, error: `Duração em Minutos deve ser pelo menos 2 para ${contractType}.` };
                    if (durationUnit === 'h' && duration < 1) return { isValid: false, error: `Duração em Horas deve ser pelo menos 1 para ${contractType}.` };
                    if (durationUnit === 'd' && duration < 1) return { isValid: false, error: `Duração em Dias deve ser pelo menos 1 para ${contractType}.` };
                } else if (['ASIANU', 'ASIAND'].includes(contractType)) {
                    if (durationUnit === 't' && (duration < 5 || duration > 100)) return { isValid: false, error: `Duração em Ticks fora do intervalo (5-100) para ${contractType}.` };
                } else if (['RESETCALL', 'RESETPUT'].includes(contractType)) {
                    if (durationUnit === 't' && (duration < 1 || duration > 10)) return { isValid: false, error: `Duração em Ticks fora do intervalo (1-10) para ${contractType}.` };
                    if (durationUnit === 'm' && (duration < 1 || duration > 24)) return { isValid: false, error: `Duração em Minutos fora do intervalo (1-24) para ${contractType}.` };
                    if (durationUnit === 'h' && duration < 1) return { isValid: false, error: `Duração em Horas deve ser pelo menos 1 para ${contractType}.` };
                }
            }
        }

        return { isValid: true, error: null };
    }

    // Atualizar display do ativo selecionado
    static updateSelectedAssetDisplay(symbol) {
        const assetDisplay = CommonHelpers.getElement('selected-asset-display');
        if (!assetDisplay) return;

        const symbolName = this.getSymbolName(symbol) || symbol;

        assetDisplay.innerHTML = `
            <div class="asset-info">
                <div class="asset-header-row">
                    <div class="asset-icon">📊</div>
                    <div class="asset-text-container">
                        <div class="asset-label">Ativo Selecionado</div>
                        <div class="asset-name">${symbolName}</div>
                    </div>
                </div>
            </div>
            <div class="asset-actions-container">
                <button class="change-asset-btn" onclick="ConfigurationsView.openSymbolSelector()" title="Trocar Ativo">
                    <span class="btn-icon">🔄</span>
                    <span>Trocar</span>
                </button>
            </div>
        `;

        // 🔒 FORÇA estilo consistente imediatamente
        this.forceConsistentAssetDisplayStyle();
    }

    // 🔒 NOVO: Força estilo consistente do display de ativo
    static forceConsistentAssetDisplayStyle() {
        const assetDisplay = CommonHelpers.getElement('selected-asset-display');
        if (!assetDisplay) return;

        // Aplicar estilo forçado
        assetDisplay.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border-radius: 12px !important;
            padding: 16px 20px !important;
            margin-bottom: 20px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3) !important;
            border: 2px solid rgba(255, 255, 255, 0.2) !important;
            min-height: 60px !important;
            color: white !important;
        `;

        // Forçar estilo dos elementos filhos
        const assetInfo = assetDisplay.querySelector('.asset-info');
        if (assetInfo) {
            assetInfo.style.cssText = `
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                flex: 1 !important;
                color: white !important;
                background: none !important;
            `;
        }

        const assetLabel = assetDisplay.querySelector('.asset-label');
        if (assetLabel) {
            assetLabel.style.cssText = `
                color: rgba(255, 255, 255, 0.9) !important;
                font-size: 0.95em !important;
                font-weight: 500 !important;
                margin-right: 8px !important;
                background: none !important;
            `;
        }

        const assetName = assetDisplay.querySelector('.asset-name');
        if (assetName) {
            assetName.style.cssText = `
                color: #ffffff !important;
                font-size: 1.2em !important;
                font-weight: 700 !important;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
                letter-spacing: 0.5px !important;
                background: none !important;
            `;
        }

        const changeBtn = assetDisplay.querySelector('.change-asset-btn');
        if (changeBtn) {
            changeBtn.style.cssText = `
                background: rgba(255, 255, 255, 0.95) !important;
                color: #667eea !important;
                border: 2px solid rgba(255, 255, 255, 0.3) !important;
                border-radius: 50% !important;
                padding: 0 !important;
                font-size: 1.1em !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
                width: 32px !important;
                height: 32px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-width: 32px !important;
                flex-shrink: 0 !important;
            `;
        }
    }

}

// Helper para mapear unidades de duração para display
const durationUnitDisplayMap = {
    't': 'Ticks',
    's': 'Segundos',
    'm': 'Minutos',
    'h': 'Horas',
    'd': 'Dias'
};