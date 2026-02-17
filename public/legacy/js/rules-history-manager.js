// js/rules-history-manager.js
// Gerenciador completo de histórico de regras usadas pelo usuário
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

// Importa a função para obter a instância do RegrasJsonManager (se estiver usando módulos)
// const { getRegrasJsonManagerInstance } = require('./regras-json.js'); // Exemplo para CommonJS

// Se não estiver usando módulos, assume que getRegrasJsonManagerInstance está no escopo global

class RulesHistoryManager {
    constructor() {
        this.storageKey = 'rules_history';
        this.maxRules = 50; // Máximo de regras armazenadas
        this.modal = null;
        this.cachedModalRules = null; // 🔧 NOVO: Cache das regras do modal para evitar problemas de sessionId
    }

    // Salvar regra no histórico com JSON do Gemini
    saveRule(ruleText, geminiJson = null) {
        if (!ruleText || !ruleText.trim()) {
            CommonHelpers.showWarning('⚠️ [RULES HISTORY] Tentativa de salvar regra vazia');
            return;
        }

        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser || !currentUser.authorize || !currentUser.authorize.loginid) {
                CommonHelpers.showWarning('⚠️ [RULES HISTORY] Usuário não encontrado para salvar regra');
                return;
            }

            const currentLoginId = currentUser.authorize.loginid;
            const storageKey = `rules_history_${currentLoginId}`;
            let history = this.getHistory();

            // Limpar e normalizar a regra
            const normalizedRule = this.normalizeRule(ruleText);

            // 🔑 NOVO: Gerar código da regra se temos JSON
            let ruleCode = null;
            if (geminiJson) {
                const regrasJsonManager = getRegrasJsonManagerInstance();
                ruleCode = regrasJsonManager.generateRuleCode(ruleText);

                // 💾 Salvar mapeamento código->JSON
                regrasJsonManager.saveRuleCodeMapping(ruleCode, geminiJson, ruleText);
            }

            // Verificar se já existe (evitar duplicatas)
            const existingIndex = history.findIndex(item =>
                this.normalizeRule(item.rule) === normalizedRule
            );

            const ruleData = {
                rule: ruleText.trim(),
                timestamp: Date.now(),
                usageCount: 1,
                hasJson: !!geminiJson,
                geminiJson: geminiJson, // Salvar JSON do Gemini junto com a regra
                ruleCode: ruleCode // 🔑 NOVO: Código único da regra
            };

            if (existingIndex === -1) {
                // Adicionar nova regra no início
                history.unshift(ruleData);

                // Limitar quantidade
                if (history.length > this.maxRules) {
                    history = history.slice(0, this.maxRules);
                }
            } else {
                // Atualizar regra existente
                const existingRule = history[existingIndex];
                existingRule.usageCount += 1;
                existingRule.timestamp = Date.now();

                // Atualizar JSON se fornecido
                if (geminiJson) {
                    existingRule.geminiJson = geminiJson;
                    existingRule.hasJson = true;
                    existingRule.ruleCode = ruleCode; // 🔑 NOVO: Atualizar código
                }

                // Mover para o topo
                history.splice(existingIndex, 1);
                history.unshift(existingRule);
            }

            // Salvar no localStorage
            localStorage.setItem(storageKey, JSON.stringify(history));



            // Verificar se salvou corretamente
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsedSaved = JSON.parse(savedData);

            } else {
                CommonHelpers.showError('❌ [RULES HISTORY] Erro: dados não foram salvos no localStorage');
            }

            // 📦 JSON salvo para download manual posterior via modal
            if (geminiJson) {
                CommonHelpers.logDebug('RULES_HISTORY', 'JSON cached salvo para download manual via histórico');
            }

        } catch (error) {
            CommonHelpers.showError('❌ [RULES HISTORY] Erro ao salvar regra:', error);

            // Sistema de backup: tentar salvar com timestamp como fallback
            try {
                const backupKey = `rules_backup_${Date.now()}`;
                localStorage.setItem(backupKey, JSON.stringify({
                    rule: ruleText,
                    geminiJson: geminiJson,
                    timestamp: Date.now(),
                    sessionId: SessionManager.getUserSessionId()
                }));

            } catch (backupError) {
                CommonHelpers.showError('❌ [RULES HISTORY] Falha total no salvamento:', backupError);
            }
        }
    }

    // 📦 NOVO: Fazer download da regra como arquivo JSON
    downloadRuleAsJson(ruleText, geminiJson) {
        try {
            if (!geminiJson) {
                this.showFeedback('❌ Não há JSON disponível para download', 'error');
                return;
            }

            // Criar dados completos para download
            const downloadData = {
                rule: ruleText.trim(),
                geminiJson: geminiJson,
                timestamp: Date.now(),
                version: '1.0'
            };

            // Gerar nome do arquivo
            const fileName = this.generateFileName(ruleText);

            // Criar e fazer download do arquivo
            this.createAndDownloadFile(downloadData, fileName);

            // Mostrar feedback ao usuário
            this.showFeedback('📦 Download iniciado!', 'success');
        } catch (error) {
            console.error('❌ [DOWNLOAD RULE] Erro no download:', error);
            this.showFeedback('❌ Erro no download', 'error');
        }
    }

    // 🔧 NOVO: Gerar nome do arquivo baseado na regra
    generateFileName(ruleText) {
        try {
            // Pegar as primeiras palavras da regra
            const words = ruleText.trim().split(/\s+/).slice(0, 5);
            let baseName = words.join('_');

            // Sanitizar o nome do arquivo
            baseName = baseName.replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '_');

            // Limitar o tamanho e adicionar timestamp
            if (baseName.length > 30) {
                baseName = baseName.substring(0, 30);
            }

            const timestamp = new Date().toISOString().slice(0, 10);
            return `regra_${baseName}_${timestamp}.json`;
        } catch (error) {
            // Fallback se houver erro
            const timestamp = new Date().toISOString().slice(0, 10);
            return `regra_${timestamp}.json`;
        }
    }

    // 🔧 NOVO: Criar e fazer download do arquivo
    createAndDownloadFile(data, fileName) {
        try {
            // Converter para JSON formatado
            const jsonString = JSON.stringify(data, null, 2);

            // Criar blob
            const blob = new Blob([jsonString], { type: 'application/json' });

            // Criar URL temporária
            const url = URL.createObjectURL(blob);

            // Criar elemento de download
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';

            // Adicionar ao DOM, clicar e remover
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Limpar URL temporária
            setTimeout(() => URL.revokeObjectURL(url), 100);

        } catch (error) {
            console.error('❌ [CREATE DOWNLOAD] Erro ao criar download:', error);
            throw error;
        }
    }

    // 🧹 NOVO: Sanitizar nome do arquivo
    sanitizeFileName(text) {
        // Delega a sanitização para o RegrasJsonManager
        const regrasJsonManager = getRegrasJsonManagerInstance();
        return regrasJsonManager.sanitizeFileName(text);
    }

    // Obter histórico de regras (com consolidação automática)
    getHistory() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser || !currentUser.authorize || !currentUser.authorize.loginid) {
                CommonHelpers.showWarning('⚠️ [RULES HISTORY] Usuário não encontrado para obter histórico');
                return [];
            }

            const currentLoginId = currentUser.authorize.loginid;
            const stableStorageKey = `rules_history_${currentLoginId}`;



            // Primeiro, tentar buscar na chave estável
            let data = localStorage.getItem(stableStorageKey);

            if (!data) {


                // Se não encontrar, tentar consolidar regras antigas
                const consolidated = this.consolidateAllRulesToStableSession();

                if (consolidated) {
                    // Tentar novamente após consolidação
                    data = localStorage.getItem(stableStorageKey);
                }
            }

            if (data) {
                const history = JSON.parse(data);


                // Verificar se é array válido
                if (Array.isArray(history)) {
                    // Ordenar por timestamp (mais recente primeiro)
                    const sortedHistory = history.sort((a, b) => b.timestamp - a.timestamp);

                    return sortedHistory;
                } else {
                    CommonHelpers.showWarning('⚠️ [RULES HISTORY] Dados do histórico não são um array válido');
                    return [];
                }
            }


            return [];
        } catch (error) {
            CommonHelpers.showError('❌ [RULES HISTORY] Erro ao obter histórico:', error);
            CommonHelpers.showError('❌ [RULES HISTORY] Stack trace:', error.stack);
            return [];
        }
    }

    // Normalizar regra para comparação
    normalizeRule(ruleText) {
        return ruleText
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();
    }

    // Mostrar modal com histórico
    showHistoryModal() {


        let history = this.getHistory();


        // Log detalhado para simulação
        if (history.length > 0) {

            history.forEach((rule, index) => {

            });
        }

        // 🔧 CORREÇÃO: Se não encontrou histórico, tentar recuperar de outras chaves
        if (history.length === 0) {

            history = this.recoverLostHistory();

        }

        // 🔧 DEBUG: Log detalhado do estado atual
        const sessionId = SessionManager.getUserSessionId();
        const storageKey = `${this.storageKey}_${sessionId}`;


        if (history.length === 0) {

            this.showEmptyHistoryModal();
            return;
        }

        this.createHistoryModal(history);
    }

    // Modal quando não há histórico
    showEmptyHistoryModal() {
        const modal = document.createElement('div');
        modal.className = 'rules-history-modal';
        modal.innerHTML = `
            <div class="rules-history-content">
                <div class="rules-history-header">
                    <div class="header-left-actions">
                        <button class="load-rules-btn" onclick="window.rulesHistoryManager.loadFilesDirectly()" title="Carregar regras do HD">
                            📁 Carregar
                        </button>
                        <button class="clear-history-btn disabled" disabled title="Nenhuma regra para limpar">
                            🗑️ Limpar
                        </button>
                    </div>
                    <h2>📋 Histórico de Regras</h2>
                    <div class="header-actions">
                        <button class="rules-history-close" onclick="window.rulesHistoryManager.closeModal()">×</button>
                    </div>
                </div>
                <div class="rules-history-body">
                    <div class="empty-history">
                        <div class="empty-icon">📝</div>
                        <h3>Nenhuma Regra Salva</h3>
                        <p>Você ainda não executou nenhuma estratégia. Quando iniciar o monitoramento, suas regras serão salvas automaticamente aqui para reutilização futura.</p>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
        document.body.appendChild(modal);
        this.modal = modal;

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                // 🔧 NOVO: Limpar cache quando modal fecha
                this.cachedModalRules = null;

            }
        });
    }

    // Criar modal com histórico
    createHistoryModal(history) {
        // 🔧 NOVO: Armazenar regras em cache para usar quando clicar
        this.cachedModalRules = history;

        const modal = document.createElement('div');
        modal.className = 'rules-history-modal';
        modal.innerHTML = `
            <div class="rules-history-content">
                <div class="rules-history-header">
                    <div class="header-left-actions">
                        <button class="load-rules-btn" onclick="window.rulesHistoryManager.loadFilesDirectly()" title="Carregar regras do HD">
                            📁 Carregar
                        </button>
                        <button class="clear-history-btn" onclick="window.rulesHistoryManager.clearHistory()" title="Limpar todo o histórico">
                            🗑️ Limpar
                        </button>
                    </div>
                    <h2>📋 Histórico de Regras (${history.length})</h2>
                    <div class="header-actions">
                        <button class="rules-history-close" onclick="window.rulesHistoryManager.closeModal()">×</button>
                    </div>
                </div>
                <div class="rules-history-body">
                    <div class="rules-list">
                        ${this.generateRulesHTML(history)}
                    </div>
                </div>
                <div class="rules-history-footer">
                    <p class="history-info">💡 <strong>Dica:</strong> Clique em qualquer regra para aplicá-la automaticamente ao campo de estratégia.</p>
                </div>
            </div>
        `;

        this.addStyles();
        document.body.appendChild(modal);
        this.modal = modal;

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                // 🔧 NOVO: Limpar cache quando modal fecha
                this.cachedModalRules = null;

            }
        });
    }



    // 📂 NOVO: Iniciar carregamento de arquivos diretamente
    loadFilesDirectly() {
        // Criar um elemento de input de arquivo temporário
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        // Adicionar ouvinte de evento para quando arquivos forem selecionados
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files).filter(file => file.name.endsWith('.json'));
            if (files.length > 0) {
                // Fechar modal atual
                const currentModal = this.modal;
                if (currentModal) {
                    currentModal.remove();
                    this.modal = null;
                }

                // Processar arquivos
                await this.handleFileUpload(files);

                // Reabrir o histórico atualizado imediatamente sem delay
                this.showHistoryModal();
            } else {
                this.showFeedback('❌ Apenas arquivos .json são suportados', 'error');
            }
            fileInput.remove(); // Remover o input temporário
        });

        // Simular clique no input de arquivo
        fileInput.click();
    }

    // e não depende mais da exibição de um modal específico.
    setupFileUploadEvents(modal) {

        // No entanto, podemos manter a referência se houver outros usos.
    }

    // 📂 NOVO: Processar upload de arquivos
    async handleFileUpload(files) {
        let loadedCount = 0;
        let errorCount = 0;
        const totalFiles = files.length;


        // Processamento silencioso sem elementos visuais temporários
        for (let i = 0; i < totalFiles; i++) {
            const file = files[i];


            try {
                // Ler arquivo
                const content = await this.readFileAsText(file);

                const ruleData = JSON.parse(content);

                // Validar estrutura
                const isValid = this.validateRuleFile(ruleData);

                if (isValid) {
                    // Adicionar ao histórico

                    this.loadRuleFromFile(ruleData);
                    loadedCount++;

                } else {
                    console.warn(`⚠️ [FILE UPLOAD] Arquivo ${file.name} tem estrutura inválida`);
                    console.warn(`📋 [FILE UPLOAD] Estrutura recebida:`, ruleData);
                    CommonHelpers.showWarning(`⚠️ Arquivo ${file.name} tem estrutura inválida`);
                    errorCount++;
                }

            } catch (error) {
                console.error(`❌ [FILE UPLOAD] Erro ao carregar ${file.name}:`, error);
                CommonHelpers.showError(`❌ Erro ao carregar ${file.name}:`, error);
                errorCount++;
            }
        }


        // Feedback apenas ao final
        if (loadedCount > 0) {
            this.showFeedback(`✅ ${loadedCount} regra(s) carregada(s) com sucesso!`, 'success');
        }
        if (errorCount > 0) {
            this.showFeedback(`⚠️ ${errorCount} arquivo(s) com erro!`, 'warning');
        }
    }

    // 📄 NOVO: Ler arquivo como texto
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file);
        });
    }

    // ✅ NOVO: Validar estrutura do arquivo de regra
    validateRuleFile(ruleData) {

        // ✅ CORREÇÃO: Aceitar arquivos com apenas 'rule' (geminiJson é opcional)
        const isValid = ruleData &&
            ruleData.rule &&
            typeof ruleData.rule === 'string' &&
            ruleData.rule.trim().length > 0;

        // Validar geminiJson se estiver presente
        if (isValid && ruleData.geminiJson) {
            const hasValidJson = typeof ruleData.geminiJson === 'object' && ruleData.geminiJson !== null;

        }

        return isValid;
    }

    // 📥 NOVO: Carregar regra do arquivo para o histórico
    loadRuleFromFile(ruleData) {

        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser || !currentUser.authorize || !currentUser.authorize.loginid) {
                console.error(`❌ [LOAD FROM FILE] Usuário não encontrado!`);
                CommonHelpers.showWarning('⚠️ [LOAD FROM FILE] Usuário não encontrado para carregar regra');
                return;
            }

            const currentLoginId = currentUser.authorize.loginid;
            const storageKey = `rules_history_${currentLoginId}`;

            let history = this.getHistory();

            // 🔑 NOVO: Gerar código da regra se temos JSON
            let ruleCode = null;
            if (ruleData.geminiJson) {
                const regrasJsonManager = getRegrasJsonManagerInstance();
                ruleCode = regrasJsonManager.generateRuleCode(ruleData.rule);

                // 💾 Salvar mapeamento código->JSON
                regrasJsonManager.saveRuleCodeMapping(ruleCode, ruleData.geminiJson, ruleData.rule);

            }

            // Criar entrada no histórico
            const historyEntry = {
                rule: ruleData.rule,
                timestamp: Date.now(),
                usageCount: 1,
                hasJson: !!ruleData.geminiJson, // ✅ CORREÇÃO: hasJson só true se geminiJson existir
                geminiJson: ruleData.geminiJson || null, // ✅ CORREÇÃO: null se não tiver
                ruleCode: ruleCode,
                loadedFromFile: true,
                originalTimestamp: ruleData.timestamp || Date.now()
            };


            // Verificar duplicata
            const normalizedRule = this.normalizeRule(ruleData.rule);
            const existingIndex = history.findIndex(item =>
                this.normalizeRule(item.rule) === normalizedRule
            );


            if (existingIndex === -1) {
                history.unshift(historyEntry);

                CommonHelpers.logDebug('LOAD_FILE', `Nova regra adicionada: ${ruleData.rule.substring(0, 50)}...`);
            } else {
                // Atualizar existente com JSON
                history[existingIndex] = { ...history[existingIndex], ...historyEntry };

                CommonHelpers.logDebug('LOAD_FILE', `Regra existente atualizada: ${ruleData.rule.substring(0, 50)}...`);
            }

            // Limitar quantidade
            if (history.length > this.maxRules) {
                history = history.slice(0, this.maxRules);

            }

            // Salvar no localStorage com chave correta

            localStorage.setItem(storageKey, JSON.stringify(history));

            // Verificar se foi salvo
            const verification = localStorage.getItem(storageKey);
            if (verification) {
                const parsedVerification = JSON.parse(verification);

                CommonHelpers.logDebug('LOAD_FILE', `Regra salva com sucesso no localStorage`);
            } else {
                console.error(`❌ [LOAD FROM FILE] Falha ao verificar salvamento no localStorage`);
                CommonHelpers.showError('❌ [LOAD FROM FILE] Falha ao salvar no localStorage');
            }

        } catch (error) {
            console.error(`❌ [LOAD FROM FILE] Erro ao carregar regra:`, error);
            CommonHelpers.showError('❌ [LOAD FROM FILE] Erro ao carregar regra:', error);
        }
    }

    // 🔄 NOVO: Recarregar modal do histórico
    reloadHistoryModal() {
        // Fechar modais atuais
        const existingModals = document.querySelectorAll('.rules-history-modal');
        existingModals.forEach(modal => modal.remove());

        // Remover elementos temporários de progresso/resultado, se existirem
        const progressDiv = CommonHelpers.getElement('load-progress');
        if (progressDiv) progressDiv.remove();
        const resultsDiv = CommonHelpers.getElement('load-results');
        if (resultsDiv) resultsDiv.remove();

        // Reabrir histórico atualizado
        this.showHistoryModal();
    }

    // Gerar HTML das regras
    generateRulesHTML(history) {
        return history.map((item, index) => {
            const date = new Date(item.timestamp).toLocaleString('pt-BR');
            const preview = this.generatePreview(item.rule);
            const usageText = item.usageCount > 1 ? ` • Usada ${item.usageCount}x` : '';
            const hasJsonIndicator = item.hasJson ? '<span class="json-indicator" title="Tem JSON cached - monitoramento instantâneo">⚡</span>' : '';
            const loadedFromFileIndicator = item.loadedFromFile ? '<span class="file-indicator" title="Carregada de arquivo">📁</span>' : '';

            // Armazenar dados no elemento para acesso seguro
            const ruleData = {
                rule: item.rule,
                geminiJson: item.hasJson ? item.geminiJson : null,
                index: index
            };

            // Escapar JSON para uso seguro no HTML
            const escapedRuleData = this.escapeHTML(JSON.stringify(ruleData));

            // Botões baseados na disponibilidade do JSON
            let actionButtons;
            if (item.hasJson && item.geminiJson) {
                actionButtons = `
                    <button class="use-rule-btn instant" onclick="event.stopPropagation(); window.rulesHistoryManager.useRuleFromElement(this, ${index}, true)" title="Usar com JSON cached - monitoramento instantâneo">
                        ⚡ Usar Instant
                    </button>
                    <button class="download-rule-btn" onclick="event.stopPropagation(); window.rulesHistoryManager.downloadRuleFromElement(this, ${index})" title="Baixar arquivo JSON">
                        📦 Download
                    </button>
                    <button class="delete-rule-btn" onclick="event.stopPropagation(); window.rulesHistoryManager.deleteRule(${index})" title="Remover esta regra">
                        🗑️ Excluir
                    </button>
                `;
            } else {
                actionButtons = `
                    <button class="use-rule-btn" onclick="event.stopPropagation(); window.rulesHistoryManager.useRuleFromElement(this, ${index}, false)">
                        ✅ Usar
                    </button>
                    <button class="download-rule-btn disabled" disabled title="Não há JSON disponível para download">
                        📦 Download
                    </button>
                    <button class="delete-rule-btn" onclick="event.stopPropagation(); window.rulesHistoryManager.deleteRule(${index})" title="Remover esta regra">
                        🗑️ Excluir
                    </button>
                `;
            }

            return `
                <div class="rule-item ${item.hasJson ? 'has-json' : ''}"
                     data-rule-data="${escapedRuleData}"
                     onclick="window.rulesHistoryManager.useRuleFromElement(this, ${index}, ${item.hasJson})">
                    <div class="rule-header">
                        <span class="rule-number">#${index + 1}</span>
                        <div class="rule-indicators">
                            ${hasJsonIndicator}
                            ${loadedFromFileIndicator}
                        </div>
                        <span class="rule-date">${date}${usageText}</span>
                    </div>
                    <div class="rule-preview">${preview}</div>
                    <div class="rule-actions">
                        ${actionButtons}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Gerar preview da regra
    generatePreview(ruleText) {
        const lines = ruleText.split('\n').filter(line => line.trim());

        if (lines.length === 1) {
            return `<div class="single-rule">${this.escapeHTML(lines[0])}</div>`;
        } else {
            const preview = lines.slice(0, 3).map(line =>
                `<div class="rule-line">${this.escapeHTML(line)}</div>`
            ).join('');

            const moreLines = lines.length > 3 ? `<div class="more-rules">... e mais ${lines.length - 3} linha(s)</div>` : '';

            return `<div class="multi-rules">${preview}${moreLines}</div>`;
        }
    }

    // Usar regra selecionada
    useRule(ruleText, geminiJson = null) {
        try {
            const strategyTextArea = CommonHelpers.getElement('strategy-text');
            if (strategyTextArea) {
                const regrasJsonManager = getRegrasJsonManagerInstance();

                // 🔑 NOVO: Preparar texto final (sem código visível na interface)
                let finalRuleText = ruleText;
                let ruleCode = null;

                if (geminiJson) {
                    // Verificar se já tem código embutido
                    const existingCode = regrasJsonManager.extractRuleCodeFromText(ruleText);

                    if (existingCode) {
                        // Regra já tem código - remover do texto visível mas manter mapeamento
                        finalRuleText = ruleText.replace(/<!--\s*RGJ_CODE:\s*[A-Z0-9_]+\s*-->/gi, '').trim();
                        ruleCode = existingCode;


                        // Verificar se o mapeamento existe, se não, criar
                        const existingJson = regrasJsonManager.getJsonByRuleCode(existingCode);
                        if (!existingJson) {
                            regrasJsonManager.saveRuleCodeMapping(existingCode, geminiJson, ruleText);
                        }
                    } else {
                        // Gerar novo código mas não adicionar ao texto visível
                        ruleCode = regrasJsonManager.generateRuleCode(ruleText);

                        // Salvar mapeamento
                        regrasJsonManager.saveRuleCodeMapping(ruleCode, geminiJson, ruleText);

                    }

                    // Para o monitoramento, adicionar código invisível temporariamente
                    const hiddenCodeText = regrasJsonManager.addCodeToRuleText(finalRuleText, ruleCode);

                    // Salvar versão com código para detecção futura, mas mostrar versão limpa
                    setTimeout(() => {
                        // Substituir temporariamente com código para detecção
                        const tempValue = strategyTextArea.value;
                        strategyTextArea.value = hiddenCodeText;
                        strategyTextArea.setAttribute('data-has-hidden-code', 'true');
                        strategyTextArea.setAttribute('data-rule-code', ruleCode);

                        // Voltar para versão limpa após 100ms
                        setTimeout(() => {
                            if (strategyTextArea.getAttribute('data-has-hidden-code') === 'true') {
                                strategyTextArea.value = finalRuleText;
                            }
                        }, 100);
                    }, 50);
                }

                strategyTextArea.value = finalRuleText;
                strategyTextArea.dispatchEvent(new Event('input'));

                // 🚀 NOVO: Se temos JSON cached, usar diretamente para monitoramento
                // Atualizado para usar o RegrasJsonManager
                if (geminiJson && window.MonitoringView) {
                    // Salvar JSON cached para uso direto no RegrasJsonManager
                    const regrasJsonManager = getRegrasJsonManagerInstance();
                    regrasJsonManager.setCachedGeminiJson(geminiJson);

                    this.showFeedback('✅ Regra carregada com JSON cached - monitoramento será instantâneo!', 'success');
                } else {
                    this.showFeedback('✅ Regra aplicada com sucesso!', 'success');
                }

                // Fechar modal
                if (this.modal) {
                    this.modal.remove();
                }

                // 🔧 NOVO: Limpar cache das regras do modal
                this.cachedModalRules = null;

                // Scroll para o campo
                strategyTextArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                strategyTextArea.focus();
            }
        } catch (error) {
            CommonHelpers.showError('❌ [RULES HISTORY] Erro ao usar regra:', error);
            this.showFeedback('❌ Erro ao aplicar regra', 'error');
        }
    }

    // 🆕 NOVO: Método seguro para usar regra a partir do elemento
    useRuleFromElement(element, index, hasJson) {

        try {
            // Tentar múltiplos métodos para obter os dados
            let ruleData = null;

            // Método 1: Tentar do atributo data-rule-data
            const dataAttr = element.getAttribute('data-rule-data');
            if (dataAttr) {
                try {
                    // Decodificar HTML entities se necessário
                    const decodedData = dataAttr.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                    ruleData = JSON.parse(decodedData);
                } catch (parseError) {
                    CommonHelpers.showWarning('⚠️ [RULES HISTORY] Erro ao parsear atributo data-rule-data:', parseError);
                }
            }

            // Método 2: Se não conseguiu, buscar do histórico usando o índice
            if (!ruleData || !ruleData.rule) {

                // 🔧 CORREÇÃO: Usar cache de regras do modal em vez de buscar novamente do localStorage
                if (this.cachedModalRules && this.cachedModalRules[index]) {
                    const cachedRule = this.cachedModalRules[index];
                    ruleData = {
                        rule: cachedRule.rule,
                        geminiJson: cachedRule.hasJson ? cachedRule.geminiJson : null,
                        index: index
                    };

                } else {
                    // Fallback: tentar buscar do histórico atual
                    const history = this.getHistory();
                    if (history && history[index]) {
                        ruleData = {
                            rule: history[index].rule,
                            geminiJson: history[index].hasJson ? history[index].geminiJson : null,
                            index: index
                        };

                    }
                }
            }

            if (!ruleData || !ruleData.rule) {
                CommonHelpers.showError('❌ [RULES HISTORY] Dados da regra não encontrados no elemento');
                this.showFeedback('❌ Erro: dados da regra corrompidos', 'error');
                return;
            }

            this.useRule(ruleData.rule, hasJson ? ruleData.geminiJson : null);

        } catch (error) {
            CommonHelpers.showError('❌ [RULES HISTORY] Erro ao usar regra do elemento:', error);
            CommonHelpers.showError('❌ [RULES HISTORY] Stack trace:', error.stack);
            this.showFeedback('❌ Erro ao aplicar regra', 'error');
        }
    }

    // 🆕 NOVO: Método seguro para download a partir do elemento
    downloadRuleFromElement(element, index) {
        try {
            // Tentar múltiplos métodos para obter os dados
            let ruleData = null;

            // Método 1: Tentar do atributo data-rule-data
            const dataAttr = element.getAttribute('data-rule-data');
            if (dataAttr) {
                try {
                    // Decodificar HTML entities se necessário
                    const decodedData = dataAttr.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                    ruleData = JSON.parse(decodedData);
                } catch (parseError) {
                    CommonHelpers.showWarning('⚠️ [RULES HISTORY] Erro ao parsear atributo data-rule-data:', parseError);
                }
            }

            // Método 2: Se não conseguiu, usar cache do modal primeiro
            if (!ruleData || !ruleData.rule) {


                // 🔧 CORREÇÃO: Usar cache de regras do modal em vez de buscar novamente do localStorage
                if (this.cachedModalRules && this.cachedModalRules[index]) {
                    const cachedRule = this.cachedModalRules[index];
                    ruleData = {
                        rule: cachedRule.rule,
                        geminiJson: cachedRule.hasJson ? cachedRule.geminiJson : null,
                        index: index
                    };

                } else {
                    // Fallback: tentar buscar do histórico atual
                    const history = this.getHistory();
                    if (history && history[index]) {
                        ruleData = {
                            rule: history[index].rule,
                            geminiJson: history[index].hasJson ? history[index].geminiJson : null,
                            index: index
                        };

                    }
                }
            }

            if (!ruleData || !ruleData.rule || !ruleData.geminiJson) {
                CommonHelpers.showError('❌ [RULES HISTORY] Dados insuficientes para download');
                this.showFeedback('❌ Erro: dados da regra incompletos', 'error');
                return;
            }

            this.downloadRuleAsJson(ruleData.rule, ruleData.geminiJson);

        } catch (error) {
            CommonHelpers.showError('❌ [RULES HISTORY] Erro no download da regra:', error);
            CommonHelpers.showError('❌ [RULES HISTORY] Stack trace:', error.stack);
            this.showFeedback('❌ Erro no download', 'error');
        }
    }

    // Deletar regra específica
    deleteRule(index) {
        try {
            // 🔧 CORREÇÃO CRÍTICA: Usar cache do modal como fonte primária
            let workingHistory;

            if (this.cachedModalRules && this.cachedModalRules.length > 0) {
                // Usar cache do modal (mais confiável para dados recuperados)
                workingHistory = [...this.cachedModalRules]; // Cópia independente

            } else {
                // Fallback: buscar do localStorage
                workingHistory = this.getHistory();

            }

            if (index < 0 || index >= workingHistory.length) {
                CommonHelpers.showError('❌ [DELETE RULE] Índice inválido:', index, 'Total regras:', workingHistory.length);
                this.showFeedback('❌ Erro: regra não encontrada', 'error');
                return;
            }

            // 🎯 OBTER regra que será excluída para remoção global
            const ruleToDelete = workingHistory[index];
            const normalizedRuleToDelete = this.normalizeRule(ruleToDelete.rule);

            // 🗑️ REMOÇÃO GLOBAL: Remover de TODAS as chaves do localStorage do usuário
            this.removeRuleFromAllUserKeys(normalizedRuleToDelete);

            // Remover regra do array de trabalho
            const deletedRule = workingHistory.splice(index, 1)[0];

            // 🔧 CORREÇÃO CRÍTICA: Salvar no localStorage com sessionId atual
            const sessionId = SessionManager.getUserSessionId();
            const storageKey = `${this.storageKey}_${sessionId}`;
            localStorage.setItem(storageKey, JSON.stringify(workingHistory));

            // Verificar se foi salvo corretamente
            const verificacao = localStorage.getItem(storageKey);
            if (verificacao) {
                const dadosVerificados = JSON.parse(verificacao);

            } else {
                CommonHelpers.showError('❌ [DELETE RULE] ERRO CRÍTICO: Dados não foram salvos no localStorage!');
            }

            // 🔧 IMPORTANTE: Atualizar cache do modal com dados atualizados
            this.cachedModalRules = [...workingHistory]; // Copia independente

            // Fechar modal atual
            if (this.modal) {
                this.modal.remove();
                this.modal = null;
            }

            // Recriar modal com dados atualizados
            if (workingHistory.length > 0) {
                this.createHistoryModal(workingHistory);
            } else {
                this.showEmptyHistoryModal();
            }

            // 🔧 IMPORTANTE: Se foi a última regra, marcar timestamp para prevenir recuperação
            if (workingHistory.length === 0) {
                const currentUser = SessionManager.getCurrentUser();
                if (currentUser && currentUser.authorize && currentUser.authorize.loginid) {
                    const cleanupMarker = `rules_cleanup_${currentUser.authorize.loginid}`;
                    localStorage.setItem(cleanupMarker, Date.now().toString());

                }
            }

            this.showFeedback('🗑️ Regra removida globalmente de todo o histórico', 'success');


        } catch (error) {
            CommonHelpers.showError('❌ [RULES HISTORY] Erro ao deletar regra:', error);
            CommonHelpers.showError('❌ [DELETE RULE] Stack trace:', error.stack);
            this.showFeedback('❌ Erro ao remover regra', 'error');
        }
    }

    // Limpar todo o histórico
    clearHistory() {
        try {
            const sessionId = SessionManager.getUserSessionId();
            const storageKey = `${this.storageKey}_${sessionId}`;
            localStorage.removeItem(storageKey);

            // 🔧 IMPORTANTE: Limpar cache do modal
            this.cachedModalRules = [];

            // Fechar modal atual
            if (this.modal) {
                this.modal.remove();
                this.modal = null;
            }

            // Mostrar modal vazio
            this.showEmptyHistoryModal();
            this.showFeedback('🗑️ Histórico limpo completamente', 'info');

        } catch (error) {
            CommonHelpers.showError('❌ [RULES HISTORY] Erro ao limpar histórico:', error);
            this.showFeedback('❌ Erro ao limpar histórico', 'error');
        }
    }

    // Mostrar feedback
    showFeedback(message, type = 'info') {
        const feedback = document.createElement('div');
        feedback.className = `rules-feedback rules-feedback-${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease-out;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        `;

        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }

    // Escapar HTML
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Escapar para JavaScript
    escapeForJS(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
    }

    // 🔧 NOVO: Recuperar histórico perdido de outras sessões e migrar para sessão estável
    recoverLostHistory() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser || !currentUser.authorize || !currentUser.authorize.loginid) {
                CommonHelpers.showWarning('⚠️ [RECOVERY] Usuário atual não encontrado para recuperação');
                return [];
            }

            const currentLoginId = currentUser.authorize.loginid;
            const allKeys = Object.keys(localStorage);

            // Buscar TODAS as chaves de histórico (não apenas do usuário atual)
            const allHistoryKeys = allKeys.filter(key => key.startsWith('rules_history_'));

            // Também buscar chaves específicas do usuário atual
            const userHistoryKeys = allHistoryKeys.filter(key => key.includes(currentLoginId));

            // 🔧 IMPORTANTE: Obter o timestamp da última limpeza global do histórico
            const cleanupMarker = `rules_cleanup_${currentLoginId}`;
            const lastCleanup = localStorage.getItem(cleanupMarker);

            // 🚫 Buscar regras marcadas como deletadas para filtrar da recuperação
            const deletedRulesMarkers = allKeys.filter(key =>
                key.startsWith(`deleted_rule_${currentLoginId}_`)
            );

            const deletedRulesSet = new Set();
            deletedRulesMarkers.forEach(marker => {
                try {
                    const deletedData = localStorage.getItem(marker);
                    if (deletedData) {
                        const parsed = JSON.parse(deletedData);
                        if (parsed.normalizedRule) {
                            deletedRulesSet.add(parsed.normalizedRule);
                        }
                    }
                } catch (error) {
                    CommonHelpers.showWarning(`⚠️ [RECOVERY] Erro ao ler marcador ${marker}:`, error);
                }
            });


            let allRules = [];

            userHistoryKeys.forEach(key => {
                try {
                    const data = localStorage.getItem(key);
                    if (data) {
                        const rules = JSON.parse(data);
                        if (Array.isArray(rules)) {
                            // Filtrar apenas regras criadas antes da última limpeza (se houver)
                            let validRules = lastCleanup ?
                                rules.filter(rule => rule.timestamp < parseInt(lastCleanup)) :
                                rules;

                            // 🚫 IMPORTANTE: Filtrar regras que foram explicitamente deletadas
                            const beforeDeleteFilter = validRules.length;
                            validRules = validRules.filter(rule => {
                                const normalized = this.normalizeRule(rule.rule);
                                return !deletedRulesSet.has(normalized);
                            });
                            const afterDeleteFilter = validRules.length;

                            allRules = allRules.concat(validRules);

                        }
                    }
                } catch (error) {
                    CommonHelpers.showError(`❌ [RECOVERY] Erro ao recuperar de ${key}:`, error);
                }
            });

            if (allRules.length > 0) {
                // Remover duplicatas e ordenar por timestamp
                const uniqueRules = this.removeDuplicateRules(allRules);
                const sortedRules = uniqueRules.sort((a, b) => b.timestamp - a.timestamp);

                // Salvar no formato atual
                const sessionId = SessionManager.getUserSessionId();
                const storageKey = `${this.storageKey}_${sessionId}`;
                localStorage.setItem(storageKey, JSON.stringify(sortedRules));

                return sortedRules;
            }

            return [];
        } catch (error) {
            CommonHelpers.showError('❌ [RECOVERY] Erro na recuperação:', error);
            return [];
        }
    }

    // 🔧 NOVO: Remover regras duplicadas
    removeDuplicateRules(rules) {
        const seen = new Set();
        return rules.filter(rule => {
            const normalized = this.normalizeRule(rule.rule);
            if (seen.has(normalized)) {
                return false;
            }
            seen.add(normalized);
            return true;
        });
    }

    // 🔧 NOVO: Consolidar todas as regras em sessão única estável
    consolidateAllRulesToStableSession() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser || !currentUser.authorize || !currentUser.authorize.loginid) {
                CommonHelpers.showWarning('⚠️ [CONSOLIDATE] Usuário atual não encontrado');
                return false;
            }

            const currentLoginId = currentUser.authorize.loginid;
            const stableStorageKey = `rules_history_${currentLoginId}`;
            const allKeys = Object.keys(localStorage);

            // Buscar TODAS as chaves de histórico existentes
            const allHistoryKeys = allKeys.filter(key => key.startsWith('rules_history_'));
            let allRules = [];


            // Coletar regras de todas as sessões
            allHistoryKeys.forEach(key => {
                try {
                    const data = localStorage.getItem(key);
                    if (data) {
                        const rules = JSON.parse(data);
                        if (Array.isArray(rules) && rules.length > 0) {
                            allRules = allRules.concat(rules);

                        }
                    }
                } catch (error) {
                    CommonHelpers.showWarning(`⚠️ [CONSOLIDATE] Erro ao ler ${key}:`, error);
                }
            });

            if (allRules.length > 0) {
                // Remover duplicatas e ordenar
                const uniqueRules = this.removeDuplicateRules(allRules);
                const sortedRules = uniqueRules.sort((a, b) => b.timestamp - a.timestamp);

                // Limitar a 50 regras mais recentes
                const finalRules = sortedRules.slice(0, this.maxRules);

                // Salvar na sessão estável
                localStorage.setItem(stableStorageKey, JSON.stringify(finalRules));

                // Remover todas as chaves antigas (exceto a nova)
                allHistoryKeys.forEach(key => {
                    if (key !== stableStorageKey) {
                        localStorage.removeItem(key);
                    }
                });


                return true;
            } else {

                return false;
            }

        } catch (error) {
            CommonHelpers.showError('❌ [CONSOLIDATE] Erro na consolidação:', error);
            return false;
        }
    }

    // 🔧 MÉTODO DE DEBUG: Verificar estado do localStorage
    debugLocalStorage() {
        const sessionId = SessionManager.getUserSessionId();
        const storageKey = `${this.storageKey}_${sessionId}`;


        const data = localStorage.getItem(storageKey);

        if (data) {
            try {
                const parsed = JSON.parse(data);

            } catch (error) {
                CommonHelpers.showError('🔍 [DEBUG] Erro ao parsear dados:', error);
            }
        }

        // Listar todas as chaves do localStorage relacionadas a regras
        const allKeys = Object.keys(localStorage);
        const ruleKeys = allKeys.filter(key => key.includes('rules_history'));

    }

    // Adicionar estilos
    addStyles() {
        if (CommonHelpers.getElement('rules-history-styles')) return;

        const style = document.createElement('style');
        style.id = 'rules-history-styles';
        style.textContent = `
            .rules-history-btn {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 0.9em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-left: 10px;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }

            .rules-history-btn:hover {
                background: linear-gradient(135deg, #764ba2, #667eea);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .rules-history-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                overflow-y: auto;
                padding: 20px;
                box-sizing: border-box;
            }

            .rules-history-content {
            background: var(--modal-bg-dark);
            background-color: #0c1318; /* Fundo sólido */
            color: var(--modal-text);
            border: 1px solid var(--modal-border);
            border-radius: 15px;
            width: 100%;
            max-width: 900px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: modalFadeIn 0.3s ease-out;
            overflow: hidden;
        }

            .rules-history-header {
                position: relative;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 25px 30px;
                border-bottom: 1px solid var(--modal-border);
                background: var(--modal-header-bg);
                color: var(--modal-text);
                height: 70px;
                min-height: 70px;
            }

            .rules-history-header h2 {
                margin: 0;
                font-size: 1.8em;
                font-weight: bold;
                flex-shrink: 1;
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;
            }

            .header-left-actions {
                display: flex;
                gap: 10px;
                align-items: center;
                flex-shrink: 0;
            }

            .header-actions {
                display: flex;
                gap: 10px;
                align-items: center;
                flex-shrink: 0;
            }

            .clear-history-btn {
                background: rgba(255,255,255,0.2);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9em;
                transition: all 0.3s ease;
            }

            .clear-history-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: scale(1.05);
            }

            .clear-history-btn.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: rgba(255,255,255,0.1);
            }

            .clear-history-btn.disabled:hover {
                background: rgba(255,255,255,0.1);
                transform: none;
            }

            .load-rules-btn {
                background: rgba(255,255,255,0.2);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9em;
                transition: all 0.3s ease;
                margin-right: 10px;
            }

            .load-rules-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: scale(1.05);
            }

            .rules-history-close {
                font-size: 28px;
                font-weight: bold;
                color: white;
                cursor: pointer;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s ease;
                background: rgba(255,255,255,0.1);
                border: none;
            }

            .rules-history-close:hover {
                background: rgba(255,255,255,0.2);
                transform: scale(1.1);
            }

            .rules-history-body {
                padding: 30px;
                overflow-y: auto;
                flex: 1;
                max-height: 60vh;
            }

            .rules-list {
                display: grid;
                gap: 20px;
            }

            .rule-item {
                background: var(--modal-input-bg);
                border: 1px solid var(--modal-border);
                border-radius: 12px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            }

            .rule-item:hover {
                border-color: var(--primary-color);
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15);
                transform: translateY(-2px);
            }

            .rule-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .rule-indicators {
                display: flex;
                gap: 5px;
                align-items: center;
            }

            .json-indicator {
                background: #28a745;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 0.8em;
                cursor: help;
            }

            .file-indicator {
                background: #17a2b8;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 0.8em;
                cursor: help;
            }

            .rule-item.has-json {
                border-left: 4px solid #28a745;
            }

            .load-rules-modal .rules-history-content {
                max-width: 600px;
            }

            .load-rules-instructions {
                background: var(--modal-input-bg);
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 20px;
                border-left: 4px solid var(--primary-color);
            }

            .load-rules-instructions h3 {
                margin-top: 0;
                color: var(--modal-text);
            }

            .load-rules-instructions ol {
                margin: 10px 0 0 20px;
                color: var(--modal-text-secondary);
            }

            .file-upload-area {
                margin: 20px 0;
            }

            .file-drop-zone {
                border: 2px dashed var(--primary-color);
                border-radius: 10px;
                padding: 40px 20px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                background: var(--modal-input-bg);
            }

            .file-drop-zone:hover, .file-drop-zone.drag-over {
                border-color: #0056b3;
                background: #e7f3ff;
                transform: scale(1.02);
            }

            .drop-zone-icon {
                font-size: 3em;
                margin-bottom: 10px;
            }

            .drop-zone-text {
                font-size: 1.1em;
                color: var(--modal-text);
                margin-bottom: 10px;
            }

            .drop-zone-hint {
                font-size: 0.9em;
                color: #6c757d;
                font-style: italic;
            }

            .load-progress {
                background: var(--modal-input-bg);
                padding: 20px;
                border-radius: 10px;
                text-align: center;
            }

            .progress-bar {
                width: 100%;
                height: 10px;
                background: #e9ecef;
                border-radius: 5px;
                overflow: hidden;
                margin-bottom: 10px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #007bff, #28a745);
                width: 0%;
                transition: width 0.3s ease;
            }

            .progress-text {
                color: #495057;
                font-weight: 500;
            }

            .load-results {
                background: var(--modal-input-bg);
                padding: 20px;
                border-radius: 10px;
            }

            .load-results h4 {
                margin-top: 0;
                color: var(--modal-text);
            }

            .result-item {
                padding: 8px 12px;
                margin: 5px 0;
                border-radius: 5px;
                font-weight: 500;
            }

            .result-item.success {
                background: #d4edda;
                color: #155724;
                border-left: 4px solid #28a745;
            }

            .result-item.error {
                background: #f8d7da;
                color: #721c24;
                border-left: 4px solid #dc3545;
            }

            .result-item.info {
                background: #d1ecf1;
                color: #0c5460;
                border-left: 4px solid #17a2b8;
            }

            .reload-history-btn {
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                margin-top: 15px;
                transition: background 0.3s ease;
            }

            .reload-history-btn:hover {
                background: #0056b3;
            }

            .use-rule-btn.instant {
                background: #28a745;
            }

            .use-rule-btn.instant:hover {
                background: #218838;
            }

            .download-rule-btn {
                background: #17a2b8;
                color: white;
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 0.85em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 85px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
            }

            .download-rule-btn:hover {
                background: #138496;
                transform: scale(1.05);
            }



            .rule-number {
                background: #667eea;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.8em;
                font-weight: bold;
            }

            .rule-date {
                color: #6c757d;
                font-size: 0.85em;
            }

            .rule-preview {
                margin-bottom: 15px;
            }

            .single-rule, .rule-line {
                background: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                color: #495057;
                margin-bottom: 5px;
                border-left: 3px solid #667eea;
            }

            .more-rules {
                color: #6c757d;
                font-style: italic;
                font-size: 0.85em;
                padding: 5px 0;
            }

            .rule-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .use-rule-btn, .download-rule-btn, .delete-rule-btn {
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-size: 0.8em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 85px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
            }

            .use-rule-btn {
                background: #28a745;
                color: white;
            }

            .use-rule-btn:hover {
                background: #218838;
                transform: scale(1.05);
            }

            .download-rule-btn {
                background: #17a2b8;
                color: white;
            }

            .download-rule-btn:hover {
                background: #138496;
                transform: scale(1.05);
            }

            .download-rule-btn.disabled {
                background: #6c757d;
                color: #adb5bd;
                cursor: not-allowed;
                opacity: 0.6;
            }

            .download-rule-btn.disabled:hover {
                background: #6c757d;
                transform: none;
            }

            .delete-rule-btn {
                background: #dc3545;
                color: white;
            }

            .delete-rule-btn:hover {
                background: #c82333;
                transform: scale(1.05);
            }

            .empty-history {
                text-align: center;
                padding: 60px 20px;
                color: #6c757d;
            }

            .empty-icon {
                font-size: 4em;
                margin-bottom: 20px;
            }

            .empty-history h3 {
                color: #495057;
                margin: 0 0 15px 0;
                font-size: 1.5em;
            }

            .empty-history p {
                line-height: 1.6;
                max-width: 500px;
                margin: 0 auto;
            }

            .rules-history-footer {
                padding: 20px 30px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                text-align: center;
            }

            .history-info {
                margin: 0;
                color: #6c757d;
                font-size: 0.9em;
                line-height: 1.4;
            }

            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .rules-history-content {
                    margin: 10px;
                    max-height: 95vh;
                }

                .rules-history-header {
                    padding: 15px 20px;
                    height: auto;
                    min-height: 60px;
                    gap: 10px;
                }

                .rules-history-header h2 {
                    font-size: 1.4em;
                    order: 2;
                    margin: 8px 0;
                }

                .header-left-actions {
                    order: 1;
                    gap: 8px;
                }

                .header-actions {
                    order: 3;
                    gap: 8px;
                }

                .clear-history-btn,
                .load-rules-btn {
                    padding: 6px 10px;
                    font-size: 0.8em;
                    min-width: auto;
                }

                .rules-history-close {
                    width: 32px;
                    height: 32px;
                    font-size: 24px;
                }

                .rules-history-body {
                    padding: 20px;
                }

                .rule-item {
                    padding: 15px;
                }

                .rule-actions {
                    flex-direction: column;
                }

                .rules-history-btn {
                    padding: 6px 12px;
                    font-size: 0.8em;
                }
            }

            /* Mobile muito pequeno */
            @media (max-width: 480px) {
                .rules-history-header {
                    padding: 12px 15px;
                    flex-direction: column;
                    text-align: center;
                }

                .rules-history-header h2 {
                    font-size: 1.2em;
                    order: 1;
                    margin-bottom: 10px;
                }

                .header-left-actions,
                .header-actions {
                    order: 2;
                    justify-content: center;
                    width: 100%;
                }

                .header-actions {
                    order: 3;
                    margin-top: 8px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 🔧 NOVO: Método para fechar o modal e limpar o cache
    closeModal() {
        if (this.modal) {
            this.modal.remove();
            this.cachedModalRules = null;

        }
    }

    // 🗑️ NOVO: Método para remover uma regra de TODAS as chaves de histórico do usuário
    removeRuleFromAllUserKeys(normalizedRule) {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser || !currentUser.authorize || !currentUser.authorize.loginid) {
                CommonHelpers.showWarning('⚠️ [REMOVE GLOBAL] Usuário não encontrado para remoção global');
                return;
            }

            const currentLoginId = currentUser.authorize.loginid;
            const allKeys = Object.keys(localStorage);

            // Encontrar todas as chaves de histórico do usuário
            const userHistoryKeys = allKeys.filter(key => key.startsWith(`${this.storageKey}_`) && key.includes(currentLoginId));


            let rulesRemovedCount = 0;

            userHistoryKeys.forEach(key => {
                try {
                    const data = localStorage.getItem(key);
                    if (!data) return;

                    const history = JSON.parse(data);
                    if (!Array.isArray(history)) return;

                    const initialLength = history.length;
                    const updatedHistory = history.filter(item => this.normalizeRule(item.rule) !== normalizedRule);
                    const removedCount = initialLength - updatedHistory.length;

                    if (removedCount > 0) {

                        localStorage.setItem(key, JSON.stringify(updatedHistory));
                        rulesRemovedCount += removedCount;

                        // 🚫 Registrar a regra deletada para evitar recuperação
                        const ruleIdentifier = `deleted_rule_${currentLoginId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
                        localStorage.setItem(ruleIdentifier, JSON.stringify({
                            normalizedRule: normalizedRule,
                            timestamp: Date.now(),
                            sourceKey: key
                        }));
                    }
                } catch (error) {
                    CommonHelpers.showError(`❌ [REMOVE GLOBAL] Erro ao processar chave ${key}:`, error);
                }
            });


        } catch (error) {
            CommonHelpers.showError('❌ [REMOVE GLOBAL] Erro inesperado na remoção global:', error);
        }
    }
}

// Instância global
window.rulesHistoryManager = new RulesHistoryManager();

// Expor método de debug globalmente
window.debugRulesHistory = () => {
    window.rulesHistoryManager.debugLocalStorage();
};