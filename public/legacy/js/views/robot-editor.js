// Robot Editor View - Manages the Blockly Editor
class RobotEditorView {
    constructor() {
        this.workspace = null;
        this.modal = null;
        this.logModal = null;
        this.logs = [];
        // Delay init to ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        if (document.getElementById('robot-editor-modal')) return;

        // Create modal container
        const modalDiv = document.createElement('div');
        modalDiv.id = 'robot-editor-modal';
        modalDiv.className = 'robot-editor-modal';

        modalDiv.innerHTML = `
            <div class="robot-editor-header">
                <div class="robot-editor-title">
                    <span style="font-size: 1.5rem;">🧩</span> Editor de Robôs
                </div>
                <div class="robot-editor-account-info">
                    <select id="account-selector" class="account-selector">
                        <option value="">Selecionar Conta</option>
                    </select>
                    <span class="account-balance-label">Saldo:</span>
                    <span id="robot-editor-balance" class="account-balance-value">$0.00</span>
                </div>
                <div class="robot-editor-controls">
                     <button id="run-robot-btn" class="robot-editor-btn run-btn" title="Executar">
                        <i class="fas fa-play"></i> Executar
                    </button>
                     <label for="robot-file-input" class="robot-editor-btn" title="Carregar XML">
                        <i class="fas fa-folder-open"></i> Carregar
                        <input type="file" id="robot-file-input" accept=".sbot,.xml" style="display: none;">
                    </label>
                    <button id="save-robot-btn" class="robot-editor-btn" title="Salvar XML">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                    <button id="organize-blocks-btn" class="robot-editor-btn" title="Organizar">
                        <i class="fas fa-align-left"></i> Organizar
                    </button>
                    <button id="show-logs-btn" class="robot-editor-btn" title="Logs">
                        <i class="fas fa-list"></i> Logs
                    </button>
                    <button id="zoom-in-btn" class="robot-editor-btn" title="Aumentar Zoom">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button id="zoom-reset-btn" class="robot-editor-btn" title="Resetar Zoom">
                        <i class="fas fa-compress-arrows-alt"></i>
                    </button>
                    <button id="zoom-out-btn" class="robot-editor-btn" title="- Zoom">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <button id="close-robot-editor-btn" class="robot-editor-btn close-btn" title="Fechar">
                        <i class="fas fa-times"></i> Fechar
                    </button>
                </div>
            </div>
            <div class="robot-editor-workspace">
                <div id="blocklyDiv"></div>
            </div>
        `;

        document.body.appendChild(modalDiv);
        this.modal = modalDiv;
    }

    bindEvents() {
        const closeBtn = document.getElementById('close-robot-editor-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        const fileInput = document.getElementById('robot-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        const saveBtn = document.getElementById('save-robot-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveRobot());
        }

        const runBtn = document.getElementById('run-robot-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => this.runRobot());
        }

        const accountSelector = document.getElementById('account-selector');
        if (accountSelector) {
            accountSelector.addEventListener('change', (e) => this.onAccountChange(e));
        }

        const organizeBtn = document.getElementById('organize-blocks-btn');
        if (organizeBtn) {
            organizeBtn.addEventListener('click', () => this.organizeBlocks());
        }

        const showLogsBtn = document.getElementById('show-logs-btn');
        if (showLogsBtn) {
            showLogsBtn.addEventListener('click', () => this.openLogModal());
        }

        // Zoom control buttons in header
        const zoomInBtn = document.getElementById('zoom-in-btn');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                if (this.workspace) this.workspace.zoomCenter(1);
            });
        }

        const zoomOutBtn = document.getElementById('zoom-out-btn');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                if (this.workspace) this.workspace.zoomCenter(-1);
            });
        }

        const zoomResetBtn = document.getElementById('zoom-reset-btn');
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => {
                if (this.workspace) {
                    this.workspace.setScale(1.0);
                    this.workspace.scrollCenter();
                }
            });
        }

        // Listen for global balance updates from API
        window.addEventListener('deriv-api-message', (e) => {
            const data = e.detail;
            if (data.msg_type === 'balance') {
                const balance = data.balance.balance;
                const currency = data.balance.currency;
                const loginid = data.balance.loginid;

                // Update specific account in dropdown if it exists
                const accountSelector = document.getElementById('account-selector');
                if (accountSelector) {
                    const option = accountSelector.querySelector(`option[value="${loginid}"]`);
                    if (option) {
                        option.dataset.balance = balance;
                        // If this is the currently selected account, update text immediately
                        if (accountSelector.value === loginid) {
                            this.updateBalance(balance);
                        }
                    }
                }
            }
        });
    }

    populateAccounts() {
        const accountSelector = document.getElementById('account-selector');
        if (!accountSelector) return;

        // Clear existing options except first
        accountSelector.innerHTML = `<option value="">Selecionar Conta</option>`;

        try {
            // Get current user from SessionManager
            const currentUser = typeof SessionManager !== 'undefined' ? SessionManager.getCurrentUser() : null;

            if (currentUser && currentUser.authorize && currentUser.authorize.account_list) {
                const accountList = currentUser.authorize.account_list;
                const currentLoginId = currentUser.loginid || currentUser.authorize.loginid;
                const balanceData = currentUser.balance;

                // Check if we have multi-account balance data (from balance:1, account:'all')
                const allBalances = balanceData && balanceData.accounts ? balanceData.accounts : null;

                // console.log('✅ [ROBOT EDITOR] Contas disponíveis:', accountList.length);

                // Iterate through all accounts
                accountList.forEach(account => {
                    const option = document.createElement('option');

                    option.value = account.loginid;
                    option.textContent = `${account.loginid} (${account.currency})`;

                    // Precise Balance Logic
                    let balance = 0;
                    let currency = account.currency || 'USD';

                    if (allBalances && allBalances[account.loginid]) {
                        // Priority 1: Use specific balance from 'accounts' dictionary
                        balance = allBalances[account.loginid].balance;
                        currency = allBalances[account.loginid].currency;
                    } else if (account.loginid === currentLoginId && balanceData) {
                        // Priority 2: Use main balance for current user
                        // Handle where balanceData is object or number
                        if (typeof balanceData === 'number') {
                            balance = balanceData;
                        } else if (balanceData && typeof balanceData === 'object' && balanceData.balance !== undefined) {
                            balance = balanceData.balance;
                        }
                    }

                    option.dataset.balance = balance;
                    option.dataset.currency = currency;

                    accountSelector.appendChild(option);

                    // Select the current account
                    if (account.loginid === currentLoginId) {
                        accountSelector.value = account.loginid;
                    }
                });

                // Verify selection matches global
                if (accountSelector.value !== currentLoginId) {
                    // Force match if list didn't contain it? Or just log
                    console.log('[UI] Selector default to', accountSelector.value);
                }

                // console.log('✅ [ROBOT EDITOR] Dropdown populado com', accountList.length, 'contas');
            } else {
                // Fallback ...
                if (window.accountData) {
                    // ...
                }
            }
        } catch (error) {
            console.error('❌ [ROBOT EDITOR] Erro ao popular contas:', error);
        }

        // Update balance for initially selected account
        this.updateBalance();
    }

    async onAccountChange(event) {
        const newAccount = event.target.value;
        const accountSelector = document.getElementById('account-selector');

        // Update balance display immediately (using dataset if available)
        this.updateBalance();

        if (newAccount && typeof AccountManager !== 'undefined') {
            const current = typeof SessionManager !== 'undefined' ? SessionManager.getCurrentUser().loginid : null;
            if (current !== newAccount) {
                // console.log(`[UI] Dropdown changed. Global Switch to ${newAccount} (via AccountManager)...`);
                try {
                    // Use AccountManager directly to avoid AppManager's overlay
                    await AccountManager.switchAccount(newAccount);
                } catch (err) {
                    console.error("Account Switch Failed:", err);
                    Swal.fire('Erro', 'Falha ao trocar conta: ' + err.message, 'error');
                    // Revert selection
                    if (current) accountSelector.value = current;
                }
            }
        } else if (newAccount && typeof AppManager !== 'undefined') {
            // Fallback to AppManager if AccountManager is missing
            const current = typeof SessionManager !== 'undefined' ? SessionManager.getCurrentUser().loginid : null;
            if (current !== newAccount) {
                await AppManager.switchAccount(newAccount);
            }
        }
    }

    updateBalance() {
        const balanceElement = document.getElementById('robot-editor-balance');
        const accountSelector = document.getElementById('account-selector');

        if (!balanceElement) return;

        if (accountSelector && accountSelector.selectedOptions.length > 0) {
            const selectedOption = accountSelector.selectedOptions[0];
            const balance = parseFloat(selectedOption.dataset.balance) || 0;
            const currency = selectedOption.dataset.currency || 'USD';
            balanceElement.textContent = `${balance.toFixed(2)} ${currency}`;
        } else if (window.accountData && window.accountData.balance !== undefined) {
            const currency = window.accountData.currency || 'USD';
            balanceElement.textContent = `${window.accountData.balance.toFixed(2)} ${currency}`;
        } else {
            balanceElement.textContent = '$0.00';
        }
    }

    runRobot() {
        // Check if workspace exists and has blocks
        if (!this.workspace) {
            Swal.fire({
                title: 'Erro',
                text: 'Workspace do Blockly não inicializado.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }

        const blocks = this.workspace.getAllBlocks(false);
        if (blocks.length === 0) {
            Swal.fire({
                title: 'Workspace Vazio',
                text: 'Adicione blocos ao workspace antes de executar.',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Check if account is selected
        const accountSelector = document.getElementById('account-selector');
        if (!accountSelector || !accountSelector.value) {
            Swal.fire({
                title: 'Conta não selecionada',
                text: 'Selecione uma conta antes de executar o robô.',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Generate XML from workspace
        const xml = Blockly.Xml.workspaceToDom(this.workspace);
        const xmlText = Blockly.Xml.domToText(xml);

        // Show confirmation dialog
        Swal.fire({
            title: 'Executar Robô?',
            html: `
                <p>Deseja iniciar a execução do robô?</p>
                <p><strong>Conta:</strong> ${accountSelector.selectedOptions[0].textContent}</p>
                <p><strong>Blocos configurados:</strong> ${blocks.length}</p>
                <p class="text-warning"><small>⚠️ A execução real do bot requer implementação do engine de trading.</small></p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Executar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.executeRobot(xmlText, accountSelector.value);
            }
        });
    }

    async executeRobot(xmlText, accountId) {
        try {
            // 0. Sync Account Context
            if (accountId && typeof SessionManager !== 'undefined' && typeof AppManager !== 'undefined') {
                const current = SessionManager.getCurrentUser();
                const currentId = current ? (current.loginid || current.authorize.loginid) : null;

                if (currentId && currentId !== accountId) {
                    console.log(`[UI] Switching account from ${currentId} to ${accountId}...`);

                    try {
                        await AppManager.switchAccount(accountId);
                        // Wait a bit for connection to stabilize
                        await new Promise(r => setTimeout(r, 1000));
                    } catch (err) {
                        console.error("Erro ao trocar conta:", err);
                        // Keep error alert, it's important
                        Swal.fire('Erro', 'Falha ao trocar de conta: ' + err.message, 'error');
                        return;
                    }
                }
            }

            // 1. Generate JavaScript code from workspace
            // Ensure Blockly.JavaScript is initialized
            if (!Blockly.JavaScript) {
                throw new Error("Gerador JavaScript não carregado.");
            }

            // Verify if our custom generators are registered
            const hasTradeGen = (Blockly.JavaScript.forBlock && Blockly.JavaScript.forBlock['trade']) || Blockly.JavaScript['trade'];
            if (!hasTradeGen) {
                throw new Error("Geradores do DerivBot ainda não foram carregados. Aguarde um momento e tente novamente.");
            }

            // Standardize generic generators if needed (usually handled by blockly compressed)
            Blockly.JavaScript.addReservedWords('code,timeouts,check');

            var code = Blockly.JavaScript.workspaceToCode(this.workspace);

            // console.log("📜 Código Gerado:\n", code);

            // 2. Execute the code
            // The code is expected to use the global 'Bot' instance (RobotStrategy)
            if (!window.Bot) {
                throw new Error("Engine do Robô (Bot) não inicializado.");
            }

            // Define UI updates
            const updateUI = (isRunning) => {
                this.updateButtonState(isRunning);
            };

            const notifyUI = (msg, type, sound) => {
                this.addLogToModal(msg, type);
            };

            // Execute via eval
            const initCode = `
                try {
                    ${code}
                } catch(e) {
                    console.error("Erro no script gerado:", e);
                    Bot.notify("Erro Script: " + e.message, 'error');
                }
            `;

            // Attach UI callbacks to Bot
            window.Bot.onUpdate = updateUI;
            window.Bot.onNotify = notifyUI;

            // Run the code
            window.eval(initCode);

            // Notify Success
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Robô Iniciado!',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (error) {
            console.error('❌ Erro ao iniciar robô:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro de Execução',
                text: error.message
            });
        }
    }

    updateButtonState(isRunning) {
        let btn = document.getElementById('run-robot-btn');
        if (!btn) return;

        // console.log(`[UI] updateButtonState called. isRunning: ${isRunning}`);

        // Clone to strip all previous event listeners (fix for "Stop" calling "Start" logic)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        btn = newBtn;

        if (isRunning) {
            btn.innerHTML = '<i class="fas fa-stop"></i> Parar';
            btn.classList.add('btn-stop');
            btn.addEventListener('click', (e) => {
                console.log("[UI] Parar clicked");
                e.preventDefault();
                e.stopPropagation();
                if (window.Bot) window.Bot.stop();
            });
        } else {
            console.log("[UI] Resetting to Executar state");
            btn.innerHTML = '<i class="fas fa-play"></i> Executar';
            btn.classList.remove('btn-stop');
            btn.addEventListener('click', (e) => {
                console.log("[UI] Executar clicked");
                e.preventDefault();
                this.runRobot();
            });
        }
    }

    addLogToModal(msg, type) {
        const logEntry = {
            timestamp: new Date(),
            message: msg,
            type: type || 'info'
        };

        this.logs.unshift(logEntry); // Add to beginning

        // Update modal if it's open
        if (this.logModal && this.logModal.classList.contains('active')) {
            this.updateLogModalContent();
        }
    }

    createLogModal() {
        if (document.getElementById('robot-log-modal')) return;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'robot-log-modal';
        modalDiv.className = 'log-modal';

        modalDiv.innerHTML = `
            <div class="log-modal-content">
                <div class="log-modal-header">
                    <h3><i class="fas fa-list"></i> Logs de Mensagens do Bot</h3>
                    <button class="log-modal-close" id="close-log-modal-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="log-modal-body" id="log-modal-body">
                    <div class="no-logs">Nenhuma mensagem ainda</div>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
        this.logModal = modalDiv;

        // Close button
        const closeBtn = document.getElementById('close-log-modal-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeLogModal());
        }

        // Close when clicking outside
        modalDiv.addEventListener('click', (e) => {
            if (e.target === modalDiv) {
                this.closeLogModal();
            }
        });
    }

    openLogModal() {
        if (!this.logModal) {
            this.createLogModal();
        }

        this.updateLogModalContent();
        this.logModal.classList.add('active');
    }

    closeLogModal() {
        if (this.logModal) {
            this.logModal.classList.remove('active');
        }
    }

    updateLogModalContent() {
        const logBody = document.getElementById('log-modal-body');
        if (!logBody) return;

        if (this.logs.length === 0) {
            logBody.innerHTML = '<div class="no-logs">Nenhuma mensagem ainda</div>';
            return;
        }

        logBody.innerHTML = '';
        this.logs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = `log-item ${log.type}`;
            const timeStr = log.timestamp.toLocaleTimeString('pt-BR');
            logItem.textContent = `[${timeStr}] ${log.message}`;
            logBody.appendChild(logItem);
        });
    }

    organizeBlocks() {
        if (!this.workspace) {
            console.warn('Workspace não inicializado');
            return;
        }

        // Use Blockly's cleanUp function to organize blocks vertically
        this.workspace.cleanUp();

        // Show feedback
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Blocos organizados!',
            showConfirmButton: false,
            timer: 1500
        });
    }

    open() {
        if (!this.modal) this.createModal();

        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        // Populate accounts and update balance
        this.populateAccounts();
        this.updateBalance();

        // Initialize Blockly only when visible (needed for correct sizing)
        // Use a small timeout to allow CSS transition/render
        setTimeout(() => {
            if (!this.workspace) {
                this.initBlockly();
            } else {
                Blockly.svgResize(this.workspace);
            }
        }, 100);
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        // Close log modal if open
        this.closeLogModal();

        // Stop robot if running? Optionally.
        // if (window.Bot && window.Bot.isRunning) window.Bot.stop(); 
    }

    initBlockly() {
        // Verify if Blockly is loaded
        if (typeof Blockly === 'undefined') {
            console.error('Blockly not loaded!');
            alert('Erro: Biblioteca Blockly não carregada.');
            return;
        }

        // 🔄 FORCE CLEAR BLOCKLY CACHE
        // This ensures blocks are re-registered with latest definitions
        if (Blockly.Blocks) {
            // 🎨 FORCE STANDARD BLOCKS TO GRAYSCALE (Global Override)
            // Standard blocks use hue-based colors. Setting Saturation to 0 makes them all gray.
            // Custom blocks using Hex colors are unaffected.
            Blockly.HSV_SATURATION = 0;
            Blockly.HSV_VALUE = 0.75; // Light Gray (~#b0bec5)

            // 🛡️ MONKEY PATCH setColour REMOVED - using direct init override below

            // 🎨 FORCE ALL NON-CUSTOM BLOCKS TO GRAYSCALE
            // This iterates over every registered block details. If it's not one of our custom ones, we force it to Gray.
            const customBlocksSet = new Set(['purchase', 'trade', 'before_purchase', 'after_purchase',
                'during_purchase', 'check_sell', 'last_digit', 'tradeOptions',
                'tick', 'notify', 'text_prompt_inp', 'macda', 'payout', 'text', 'selectinput', 'report',
                'update_trade_option', 'bb', 'optionselect', 'todatetime', 'check_direction']);

            // Wait for custom definitions to match against
            const allBlocks = Object.keys(Blockly.Blocks);
            allBlocks.forEach(key => {
                if (!customBlocksSet.has(key)) {
                    const blockDef = Blockly.Blocks[key];

                    // 1. Force JSON 'colour' property (Common in modern blocks)
                    if (blockDef.colour !== undefined) {
                        blockDef.colour = '#b0bec5';
                    }

                    // 2. Override init function
                    if (typeof blockDef.init === 'function') {
                        const originalInit = blockDef.init;
                        blockDef.init = function () {
                            originalInit.call(this);
                            this.setColour('#b0bec5'); // Force Light Gray
                            // Force Black Text Class
                            if (this.setCssClass) {
                                this.setCssClass('gray-block');
                            } else if (this.addClass) { // Fallback for older Blockly
                                this.addClass('gray-block');
                            }
                        };
                    }

                    // 3. Override jsonInit function
                    if (typeof blockDef.jsonInit === 'function') {
                        const originalJsonInit = blockDef.jsonInit;
                        blockDef.jsonInit = function (json) {
                            originalJsonInit.call(this, json);
                            this.setColour('#b0bec5');
                            // Force Black Text Class
                            if (this.setCssClass) {
                                this.setCssClass('gray-block');
                            } else if (this.addClass) {
                                this.addClass('gray-block');
                            }
                        };
                    }
                }
            });

            // Clear specific custom blocks that might be cached
            const customBlocks = ['purchase', 'trade', 'before_purchase', 'after_purchase',
                'during_purchase', 'check_sell', 'last_digit', 'tradeOptions',
                'tick', 'notify', 'text_prompt_inp', 'macda', 'payout', 'text', 'selectinput', 'report',
                'update_trade_option', 'bb', 'optionselect', 'todatetime', 'check_direction', 'sma'];
            customBlocks.forEach(blockType => {
                if (Blockly.Blocks[blockType]) {
                    delete Blockly.Blocks[blockType];
                }
            });
        }

        // Init custom blocks definitions
        if (window.initCustomBlocks) {
            window.initCustomBlocks();
        } else {
            console.warn('Custom blocks definitions not found (initCustomBlocks)');
        }

        // 🎨 CUSTOM THEME FOR STANDARD BLOCKS (Light Gray)
        const derivBotTheme = Blockly.Theme.defineTheme('derivBotTheme', {
            'blockStyles': {
                'logic_blocks': { 'colourPrimary': '#b0bec5', 'colourSecondary': '#cfd8dc', 'colourTertiary': '#90a4ae' },
                'loop_blocks': { 'colourPrimary': '#b0bec5', 'colourSecondary': '#cfd8dc', 'colourTertiary': '#90a4ae' },
                'math_blocks': { 'colourPrimary': '#b0bec5', 'colourSecondary': '#cfd8dc', 'colourTertiary': '#90a4ae' },
                'text_blocks': { 'colourPrimary': '#b0bec5', 'colourSecondary': '#cfd8dc', 'colourTertiary': '#90a4ae' },
                'list_blocks': { 'colourPrimary': '#b0bec5', 'colourSecondary': '#cfd8dc', 'colourTertiary': '#90a4ae' },
                'variable_blocks': { 'colourPrimary': '#b0bec5', 'colourSecondary': '#cfd8dc', 'colourTertiary': '#90a4ae' },
                'procedure_blocks': { 'colourPrimary': '#b0bec5', 'colourSecondary': '#cfd8dc', 'colourTertiary': '#90a4ae' }
            },
            'componentStyles': {
                'workspaceBackgroundColour': '#1e1e1e',
                'toolboxBackgroundColour': '#1e1e1e',
                'toolboxForegroundColour': '#ffffff',
                'flyoutBackgroundColour': '#2d2d2d',
                'flyoutForegroundColour': '#ccc',
                'scrollbarColour': '#555',
                'insertionMarkerColour': '#fff',
                'insertionMarkerOpacity': 0.3,
                'scrollbarOpacity': 0.4,
                'cursorColour': '#ffffff'
            }
        });

        this.workspace = Blockly.inject('blocklyDiv', {
            toolbox: this.getToolbox(),
            theme: derivBotTheme,
            media: 'media/', // Prevent CSP connection to Google
            scrollbars: true,
            trashcan: true,
            grid: {
                spacing: 20,
                length: 3,
                colour: '#444',
                snap: true
            },
            zoom: {
                controls: true,
                wheel: true,
                startScale: 1.0,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.2
            },
            // Dark Theme Configuration
            theme: Blockly.Theme.defineTheme('dark', {
                'base': Blockly.Themes.Classic,
                'componentStyles': {
                    'workspaceBackgroundColour': '#1e1e1e',
                    'toolboxBackgroundColour': '#2d2d2d',
                    'toolboxForegroundColour': '#fff',
                    'flyoutBackgroundColour': '#252526',
                    'flyoutOpacity': 1,
                    'scrollbarColour': '#797979',
                    'insertionMarkerColour': '#fff',
                    'insertionMarkerOpacity': 0.3,
                    'scrollbarOpacity': 0.4,
                    'cursorColour': '#d0d0d0',
                    'blackBackground': '#333'
                }
            })
        });

        // Add resize listener
        window.addEventListener('resize', () => {
            if (this.workspace) Blockly.svgResize(this.workspace);
        });

        // Hide default Blockly zoom controls (we use header buttons instead)
        setTimeout(() => {
            const zoomControls = document.querySelector('.blocklyZoom');
            if (zoomControls) {
                zoomControls.style.display = 'none';
            }
        }, 100);
    }


    getToolbox() {
        return `
        <xml id="toolbox" style="display: none">
            <category name="Lógica" colour="#5b80a5">
                <block type="controls_if"></block>
                <block type="logic_compare"></block>
                <block type="logic_operation"></block>
                <block type="logic_negate"></block>
                <block type="logic_boolean"></block>
                <block type="logic_null"></block>
                <block type="logic_ternary"></block>
            </category>
            <category name="Matemática" colour="#5b67a5">
                <block type="math_number"></block>
                <block type="math_arithmetic"></block>
                <block type="math_single"></block>
                <block type="math_trig"></block>
                <block type="math_constant"></block>
                <block type="math_number_property"></block>
                <block type="math_round"></block>
                <block type="math_on_list"></block>
                <block type="math_modulo"></block>
                <block type="math_constrain"></block>
                <block type="math_random_int"></block>
                <block type="math_random_float"></block>
            </category>
             <category name="Texto" colour="#5ba58c">
                <block type="text"></block>
                <block type="text_join"></block>
                <block type="text_append"></block>
                <block type="text_length"></block>
                <block type="text_isEmpty"></block>
                <block type="text_indexOf"></block>
                <block type="text_charAt"></block>
                <block type="text_getSubstring"></block>
                <block type="text_changeCase"></block>
                <block type="text_trim"></block>
                <block type="text_print"></block>
                <block type="text_prompt_ext"></block>
            </category>
             <category name="Variáveis" colour="#a55b80" custom="VARIABLE"></category>
             <category name="Funções" colour="#995ba5" custom="PROCEDURE"></category>
            <sep></sep>
              <category name="Deriv Bot" colour="#a55b80">
                <block type="trade"></block>
                <block type="before_purchase"></block>
                <block type="purchase"></block>
                <block type="after_purchase"></block>
                <block type="trade_again"></block>
            </category>
             <category name="Ferramentas" colour="#5ba5a5">
                <block type="notify"></block>
                <block type="read_details"></block>
                <block type="tick_analysis"></block>
                <block type="tick"></block>
                <block type="contract_check_result"></block>
                <block type="total_profit"></block>
                <block type="payout"></block>
                <block type="text_prompt_inp"></block>
                <block type="goback_tradeoptions"></block>
                <block type="lastDigitList"></block>
                <block type="last_digit"></block>
                <block type="macda"></block>
                <block type="during_purchase"></block>
                <block type="check_sell"></block>
                <block type="timeout"></block>
                <block type="tradeOptions"></block>
                <block type="ticks"></block>
            </category>
        </xml>
        `;
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const xmlText = e.target.result;
            this.loadXml(xmlText);
        };
        reader.readAsText(file);

        // Reset input value so same file can be selected again
        event.target.value = '';
    }

    loadXml(xmlText) {
        try {
            if (!this.workspace) return;

            const xml = Blockly.utils.xml.textToDom(xmlText);

            // Check if XML is empty
            if (!xml) {
                Swal.fire('Erro', 'Arquivo XML inválido ou vazio.', 'error');
                return;
            }

            // 🔐 DOMAIN PROTECTION VALIDATION
            const metadataNode = xml.querySelector('metadata');
            const currentDomain = window.location.hostname;

            if (metadataNode) {
                // File has metadata - validate domain
                const siteNode = metadataNode.querySelector('site');
                const fileDomain = siteNode ? siteNode.textContent : null;

                if (fileDomain && fileDomain !== currentDomain) {
                    // Domain mismatch - block loading
                    Swal.fire({
                        icon: 'error',
                        title: '🔒 Arquivo Protegido',
                        html: `
                            <p>Este arquivo foi criado em <strong>${fileDomain}</strong></p>
                            <p>e só pode ser carregado nesse domínio.</p>
                            <p class="text-muted"><small>Domínio atual: ${currentDomain}</small></p>
                        `,
                        confirmButtonText: 'Entendi'
                    });
                    return;
                }

                // Valid domain - show file info
                const createdNode = metadataNode.querySelector('created');
                const createdDate = createdNode ? new Date(createdNode.textContent).toLocaleString('pt-BR') : 'Desconhecida';

                console.log(`✅ Arquivo validado: criado em ${fileDomain} em ${createdDate}`);

                // Remove metadata before loading into Blockly (it doesn't understand it)
                metadataNode.remove();
            } else {
                // Legacy file without metadata - show warning
                Swal.fire({
                    icon: 'warning',
                    title: 'Arquivo Legado',
                    html: `
                        <p>Este arquivo não possui proteção de domínio.</p>
                        <p><small>Arquivos salvos a partir de agora incluirão proteção automática.</small></p>
                    `,
                    timer: 3000,
                    showConfirmButton: false
                });
            }

            this.workspace.clear();
            Blockly.Xml.domToWorkspace(xml, this.workspace);

            // Center visible
            this.workspace.scrollCenter();

            Swal.fire({
                icon: 'success',
                title: 'Carregado!',
                text: 'Robô carregado com sucesso.',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Erro ao processar XML: ' + e.message, 'error');
        }
    }

    saveRobot() {
        try {
            if (!this.workspace) return;

            const xml = Blockly.Xml.workspaceToDom(this.workspace);

            // 🔐 Add domain protection metadata
            const metadata = xml.ownerDocument.createElement('metadata');

            // Site domain
            const siteNode = xml.ownerDocument.createElement('site');
            siteNode.textContent = 'strategyfree.com';
            metadata.appendChild(siteNode);

            // Favicon (base64) - Using SVG for better quality
            const faviconNode = xml.ownerDocument.createElement('favicon');
            faviconNode.textContent = 'data:image/svg+xml;base64,CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI+CiAgPGRlZnM+CiAgICA8IS0tIEdyYWRpZW50ZSB2ZXJkZSBjbGFybyBwYXJhIHZlcmRlIGVzY3VybyAtLT4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JlZW5HcmFkaWVudDEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMzJDRDMyO3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMyMjhCMjI7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPCEtLSBHcmFkaWVudGUgdmVyZGUgZXNjdXJvIHBhcmEgdmVyZGUgY2xhcm8gLS0+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyZWVuR3JhZGllbnQyIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzIyOEIyMjtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMzJDRDMyO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgCiAgPCEtLSBGdW5kbyB0cmFuc3BhcmVudGUgKHJlbW92aWRvKSAtLT4KICAKICA8IS0tIExldHJhIFMgZXN0aWxpemFkYSBjb20gZG9pcyB0b25zIGRlIHZlcmRlIC0tPgogIDwhLS0gUGFydGUgc3VwZXJpb3IgZG8gUyAtLT4KICA8cGF0aCBkPSJNIDEyOCA2NCAKICAgICAgICAgICAgQyA2NCA2NCwgMzIgOTYsIDMyIDE2MAogICAgICAgICAgICBDIDMyIDIyNCwgNjQgMjU2LCAxMjggMjU2CiAgICAgICAgICAgIEwgMzIwIDI1NgogICAgICAgICAgICBDIDM1MiAyNTYsIDM4NCAyMjQsIDM4NCAxOTIKICAgICAgICAgICAgQyAzODQgMTYwLCAzNTIgMTI4LCAzMjAgMTI4CiAgICAgICAgICAgIEwgMTYwIDEyOAogICAgICAgICAgICBDIDE0NCAxMjgsIDEyOCAxMTIsIDEyOCA5NgogICAgICAgICAgICBDIDEyOCA4MCwgMTQ0IDY0LCAxNjAgNjQKICAgICAgICAgICAgTCAzODQgNjQKICAgICAgICAgICAgQyA0MTYgNjQsIDQ0OCA5NiwgNDQ4IDEyOAogICAgICAgICAgICBMIDQ0OCAxNjAKICAgICAgICAgICAgQyA0NDggMTc2LCA0MzIgMTkyLCA0MTYgMTkyCiAgICAgICAgICAgIEwgMTI4IDE5MgogICAgICAgICAgICBDIDk2IDE5MiwgNjQgMTYwLCA2NCAxMjgKICAgICAgICAgICAgQyA2NCA5NiwgOTYgNjQsIDEyOCA2NCBaIiAKICAgICAgICBmaWxsPSJ1cmwoI2dyZWVuR3JhZGllbnQxKSIvPgogIAogIDwhLS0gUGFydGUgaW5mZXJpb3IgZG8gUyAtLT4KICA8cGF0aCBkPSJNIDM4NCA0NDgKICAgICAgICAgICAgQyA0NDggNDQ4LCA0ODAgNDE2LCA0ODAgMzUyCiAgICAgICAgICAgIEMgNDgwIDI4OCwgNDQ4IDI1NiwgMzg0IDI1NgogICAgICAgICAgICBMIDE5MiAyNTYKICAgICAgICAgICAgQyAxNjAgMjU2LCAxMjggMjg4LCAxMjggMzIwCiAgICAgICAgICAgIEMgMTI4IDM1MiwgMTYwIDM4NCwgMTkyIDM4NAogICAgICAgICAgICBMIDM1MiAzODQKICAgICAgICAgICAgQyAzNjggMzg0LCAzODQgNDAwLCAzODQgNDE2CiAgICAgICAgICAgIEMgMzg0IDQzMiwgMzY4IDQ0OCwgMzUyIDQ0OAogICAgICAgICAgICBMIDEyOCA0NDgKICAgICAgICAgICAgQyA5NiA0NDgsIDY0IDQxNiwgNjQgMzg0CiAgICAgICAgICAgIEwgNjQgMzUyCiAgICAgICAgICAgIEMgNjQgMzM2LCA4MCAzMjAsIDk2IDMyMAogICAgICAgICAgICBMIDM4NCAzMjAKICAgICAgICAgICAgQyA0MTYgMzIwLCA0NDggMzUyLCA0NDggMzg0CiAgICAgICAgICAgIEMgNDQ4IDQxNiwgNDE2IDQ0OCwgMzg0IDQ0OCBaIgogICAgICAgIGZpbGw9InVybCgjZ3JlZW5HcmFkaWVudDIpIi8+Cjwvc3ZnPgo=';
            metadata.appendChild(faviconNode);

            // Creation timestamp
            const createdNode = xml.ownerDocument.createElement('created');
            createdNode.textContent = new Date().toISOString();
            metadata.appendChild(createdNode);

            // Version
            const versionNode = xml.ownerDocument.createElement('version');
            versionNode.textContent = '1.0';
            metadata.appendChild(versionNode);

            // Insert metadata as first child
            xml.insertBefore(metadata, xml.firstChild);

            const xmlText = Blockly.utils.xml.domToText(xml);

            // Create download link with branded filename (.sbot extension)
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const filename = `robot_strategyfree_${timestamp}.sbot`;

            const blob = new Blob([xmlText], { type: 'application/x-strategybot' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: 'Salvo!',
                html: `Arquivo <strong>${filename}</strong> gerado com proteção de domínio.`,
                timer: 2000,
                showConfirmButton: false
            });

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Erro ao salvar XML: ' + e.message, 'error');
        }
    }
}

// Instantiate globally to be accessible
window.RobotEditor = new RobotEditorView();
