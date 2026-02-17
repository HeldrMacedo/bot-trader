// js/strategy-library-modal.js
// Modal de Biblioteca de Estratégias Compartilhadas

class StrategyLibraryModal {
    constructor() {
        this.modal = null;
        this.currentTab = 'library'; // 'library' ou 'upload'
        this.init();
    }

    init() {
        this.createModal();
        this.attachEventListeners();
    }

    createModal() {
        const modalHTML = `
            <div class="strategy-modal-overlay" id="strategy-modal-overlay" style="display: none;">
                <div class="strategy-modal">
                    <div class="strategy-modal-header">
                        <div class="strategy-header-content">
                            <span class="strategy-header-icon">📚</span>
                            <h3>Biblioteca de Estratégias</h3>
                        </div>
                        <button class="strategy-close-btn" id="strategy-close-btn">×</button>
                    </div>

                    <div class="strategy-modal-tabs">
                        <button class="strategy-tab active" data-tab="library">
                            📖 Biblioteca
                        </button>
                        <button class="strategy-tab" data-tab="files">
                            📂 Arquivos
                        </button>
                        <button class="strategy-tab" data-tab="upload">
                            📤 Compartilhar
                        </button>
                    </div>

                    <div class="strategy-modal-body">
                        <!-- ABA BIBLIOTECA -->
                        <div class="strategy-tab-content active" id="library-tab">
                            <div class="strategy-info-box">
                                <span class="info-icon">ℹ️</span>
                                <p>Estratégias compartilhadas pela comunidade. Clique em "Download" para baixar.</p>
                            </div>

                            <div class="strategy-search">
                                <input type="text" id="strategy-search-input" placeholder="🔍 Buscar estratégia..." class="strategy-search-input">
                            </div>

                            <div id="strategies-list" class="strategies-list">
                                <div class="loading-strategies">
                                    <div class="loading-spinner"></div>
                                    <p>Carregando estratégias...</p>
                                </div>
                            </div>
                        </div>

                        <!-- ABA ARQUIVOS (COMMON FILES) -->
                        <div class="strategy-tab-content" id="files-tab">
                            <div class="strategy-info-box" style="background: rgba(40, 167, 69, 0.1); border: 1px solid rgba(40, 167, 69, 0.3);">
                                <span class="info-icon">📂</span>
                                <p>Arquivos e programas úteis compartilhados pela administração.</p>
                            </div>

                            <div id="files-list" class="strategies-list">
                                <div class="loading-strategies">
                                    <div class="loading-spinner"></div>
                                    <p>Carregando arquivos...</p>
                                </div>
                            </div>
                        </div>

                        <!-- ABA COMPARTILHAR -->
                        <div class="strategy-tab-content" id="upload-tab">
                            <div class="strategy-info-box">
                                <span class="info-icon">📤</span>
                                <p><strong>Compartilhe sua estratégia com a comunidade!</strong><br>
                                Apenas arquivos .json são aceitos (máximo 100KB)</p>
                            </div>

                            <div class="strategy-upload-container">
                                <label class="strategy-file-label">
                                    <input 
                                        type="file" 
                                        id="strategy-file-input" 
                                        class="strategy-file-input" 
                                        accept=".json"
                                    >
                                    <div class="strategy-file-btn">
                                        <span class="upload-icon">📁</span>
                                        <span>Selecionar Arquivo JSON</span>
                                    </div>
                                </label>
                                <div id="strategy-file-preview" class="strategy-file-preview"></div>
                            </div>

                            <div class="strategy-upload-actions">
                                <button class="strategy-upload-btn" id="strategy-upload-btn" disabled>
                                    <span class="upload-icon">📤</span>
                                    Compartilhar Estratégia
                                </button>
                            </div>
                        </div>

                        <!-- SEÇÃO ADMIN - Upload de Arquivos de Uso Geral -->
                        <div class="admin-upload-section" id="admin-upload-section" style="display: none; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;">
                            <div class="strategy-info-box" style="background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3);">
                                <span class="info-icon">🔐</span>
                                <p><strong>Área Administrativa - Upload de Arquivos Comuns</strong><br>
                                Envie arquivos (PDF, ZIP, etc.) para a Home Page publicamente.</p>
                            </div>

                            <div class="strategy-upload-container">
                                <label class="strategy-file-label">
                                    <input 
                                        type="file" 
                                        id="admin-file-input" 
                                        class="strategy-file-input" 
                                    >
                                    <div class="strategy-file-btn" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
                                        <span class="upload-icon">📁</span>
                                        <span>Selecionar Arquivo (Admin)</span>
                                    </div>
                                </label>
                                <div id="admin-file-preview" class="strategy-file-preview"></div>
                            </div>

                            <div class="strategy-upload-actions">
                                <button class="strategy-upload-btn" id="admin-upload-btn" disabled style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-top: 1px solid rgba(255,255,255,0.2);">
                                    <span class="upload-icon">🚀</span>
                                    Enviar para Home Page
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('strategy-modal-overlay');
    }

    attachEventListeners() {
        // Botão fechar
        const closeBtn = document.getElementById('strategy-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Fechar ao clicar fora
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.hide();
            }
        });

        // Abas
        const tabs = document.querySelectorAll('.strategy-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Upload de arquivo
        const fileInput = document.getElementById('strategy-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Botão de upload
        const uploadBtn = document.getElementById('strategy-upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.handleUpload());
        }

        // ================= ADMIN LISTENERS =================
        const adminFileInput = document.getElementById('admin-file-input');
        if (adminFileInput) {
            adminFileInput.addEventListener('change', (e) => this.handleAdminFileSelect(e));
        }

        const adminUploadBtn = document.getElementById('admin-upload-btn');
        if (adminUploadBtn) {
            adminUploadBtn.addEventListener('click', () => this.handleAdminUpload());
        }

        // Busca
        const searchInput = document.getElementById('strategy-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Atualizar botões das abas
        document.querySelectorAll('.strategy-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Atualizar conteúdo das abas
        document.querySelectorAll('.strategy-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Carregar estratégias se for aba biblioteca
        if (tabName === 'library') {
            this.loadStrategies();
        }

        // Carregar arquivos se for aba arquivos
        if (tabName === 'files') {
            this.loadCommonFiles();
        }

        // Verificar permissões de admin ao mudar para aba upload
        if (tabName === 'upload') {
            this.checkAdminAccess();
        }
    }

    async show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            // Carregar estratégias ao abrir
            if (this.currentTab === 'library') {
                await this.loadStrategies();
            }
        }
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const preview = document.getElementById('strategy-file-preview');
        const uploadBtn = document.getElementById('strategy-upload-btn');

        const fileSize = (file.size / 1024).toFixed(2);
        preview.innerHTML = `
            <div class="file-preview-item">
                <span class="file-icon">📄</span>
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${fileSize} KB</span>
                </div>
            </div>
        `;

        uploadBtn.disabled = false;
    }

    async handleUpload() {
        const fileInput = document.getElementById('strategy-file-input');
        const file = fileInput.files[0];

        if (!file) {
            this.showNotification('⚠️ Selecione um arquivo primeiro!', 'warning');
            return;
        }

        // Verificar se strategySharing está inicializado
        if (!window.strategySharing || !window.strategySharing.db) {
            this.showNotification('❌ Firebase não inicializado. Recarregue a página.', 'error', 5000);
            console.error('StrategySharing ou Firebase DB não disponível:', {
                strategySharing: !!window.strategySharing,
                db: window.strategySharing ? !!window.strategySharing.db : false
            });
            return;
        }

        try {
            this.showNotification('📤 Compartilhando estratégia...', 'info');

            const result = await window.strategySharing.uploadStrategy(file);

            this.showNotification(`✅ Estratégia "${result.fileName}" compartilhada com sucesso!`, 'success');

            // Limpar formulário
            fileInput.value = '';
            document.getElementById('strategy-file-preview').innerHTML = '';
            document.getElementById('strategy-upload-btn').disabled = true;

            // Voltar para aba biblioteca
            this.switchTab('library');

        } catch (error) {
            this.showNotification(`❌ Erro: ${error}`, 'error');
            console.error('Erro no upload:', error);
        }
    }

    async loadStrategies() {
        const listContainer = document.getElementById('strategies-list');
        listContainer.innerHTML = '<div class="loading-strategies"><div class="loading-spinner"></div><p>Carregando...</p></div>';

        try {
            const strategies = await window.strategySharing.listStrategies();

            if (strategies.length === 0) {
                listContainer.innerHTML = '<div class="no-strategies"><p>📭 Nenhuma estratégia compartilhada ainda.<br>Seja o primeiro!</p></div>';
                return;
            }

            listContainer.innerHTML = strategies.map(strategy => this.createStrategyCard(strategy)).join('');

            // Adicionar event listeners aos botões de download
            document.querySelectorAll('.strategy-download-btn').forEach(btn => {
                btn.addEventListener('click', () => this.handleDownload(btn.dataset.id));
            });

            // Adicionar event listeners aos botões de delete (apenas Admin)
            document.querySelectorAll('.strategy-delete-btn').forEach(btn => {
                btn.addEventListener('click', () => this.handleDelete(btn.dataset.id, btn.dataset.name));
            });

        } catch (error) {
            listContainer.innerHTML = `<div class="error-strategies"><p>❌ Erro ao carregar estratégias: ${error.message}</p></div>`;
        }
    }

    createStrategyCard(strategy) {
        const date = strategy.uploadDate ? new Date(strategy.uploadDate.toDate()).toLocaleDateString('pt-BR') : 'Data desconhecida';
        const fileSize = (strategy.fileSize / 1024).toFixed(2);

        // 📝 Extrair descrição da regra para tooltip
        let tooltipText = '';
        if (strategy.content) {
            if (strategy.content.rule && typeof strategy.content.rule === 'string') {
                // Se tiver o texto original da regra salvo
                tooltipText = strategy.content.rule;
            } else if (typeof strategy.content === 'string') {
                // Se o conteúdo for a própria string (legado)
                tooltipText = strategy.content;
            } else if (Array.isArray(strategy.content)) {
                // Se for array de regras JSON
                tooltipText = `${strategy.content.length} regras definidas. Clique para baixar e ver detalhes.`;

                // Tentar gerar descrição sumária se FormatGenerator estiver disponível
                if (typeof FormatGenerator !== 'undefined') {
                    try {
                        const generator = new FormatGenerator();
                        const firstRule = strategy.content[0];
                        if (firstRule) {
                            const desc = generator.generateDisplayFormat(firstRule);
                            tooltipText = `Regra 1: ${desc}\n(+${strategy.content.length - 1} regras)`;
                        }
                    } catch (e) {
                        console.warn('Erro ao gerar tooltip:', e);
                    }
                }
            } else if (strategy.content.geminiJson) {
                // Estrutura nova com geminiJson separado
                const rules = strategy.content.geminiJson;
                if (Array.isArray(rules) && rules.length > 0) {
                    tooltipText = `${rules.length} regras definidas.`;
                    if (typeof FormatGenerator !== 'undefined') {
                        try {
                            const generator = new FormatGenerator();
                            const firstRule = rules[0];
                            const desc = generator.generateDisplayFormat(firstRule);
                            tooltipText = `Regra 1: ${desc}\n(+${rules.length - 1} regras)`;
                        } catch (e) { }
                    }
                }
            }
        }

        // Limitar tamanho do tooltip e escapar aspas
        if (tooltipText.length > 300) tooltipText = tooltipText.substring(0, 297) + '...';
        tooltipText = tooltipText.replace(/"/g, '&quot;');

        return `
            <div class="strategy-card" title="${tooltipText}">
                <div class="strategy-card-header">
                    <span class="strategy-icon">📄</span>
                    <div class="strategy-info">
                        <h4 class="strategy-name">${strategy.fileName}</h4>
                        <p class="strategy-meta">
                            Por: <strong>${strategy.userName}</strong> • 
                            ${date} • 
                            ${fileSize} KB • 
                            ${strategy.downloads || 0} downloads
                        </p>
                    </div>
                </div>
                <div class="strategy-card-actions">
                    ${this.getDeleteButton(strategy)}
                    <button class="strategy-download-btn" data-id="${strategy.id}">
                        ⬇️ Download
                    </button>
                </div>
            </div>
        `;
    }

    getDeleteButton(strategy) {
        // Verificar se é Admin
        const isAdmin = typeof UserLevelsManager !== 'undefined' &&
            UserLevelsManager.getCurrentUserLevel() === UserLevelsManager.USER_LEVELS.ADMIN;

        // Verificar se é o dono (opcional, já que admin pode tudo, mas bom para UX)
        const isOwner = window.strategySharing &&
            window.strategySharing.currentUser &&
            window.strategySharing.currentUser.loginid === strategy.uploadedBy;

        if (isAdmin || isOwner) {
            return `
                <button class="strategy-delete-btn" data-id="${strategy.id}" data-name="${strategy.fileName}" title="Deletar Estratégia">
                    🗑️
                </button>
            `;
        }
        return '';
    }

    async handleDelete(strategyId, strategyName) {
        if (!confirm(`Tem certeza que deseja deletar a estratégia "${strategyName}"? Esta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            this.showNotification('🗑️ Deletando estratégia...', 'info');
            await window.strategySharing.deleteStrategy(strategyId);
            this.showNotification('✅ Estratégia deletada com sucesso!', 'success');
            // Recarregar lista
            await this.loadStrategies();
        } catch (error) {
            this.showNotification(`❌ Erro ao deletar: ${error.message}`, 'error');
        }
    }

    async handleDownload(strategyId) {
        try {
            this.showNotification('⬇️ Baixando estratégia...', 'info');
            await window.strategySharing.downloadStrategy(strategyId);
            this.showNotification('✅ Download concluído!', 'success');
            // Recarregar lista para atualizar contador
            await this.loadStrategies();
        } catch (error) {
            this.showNotification(`❌ Erro ao baixar: ${error.message}`, 'error');
        }
    }

    handleSearch(query) {
        // Filtrar estratégias
        if (this.currentTab === 'library') {
            const cards = document.querySelectorAll('#strategies-list .strategy-card');
            const searchLower = query.toLowerCase();

            cards.forEach(card => {
                const name = card.querySelector('.strategy-name').textContent.toLowerCase();
                const meta = card.querySelector('.strategy-meta').textContent.toLowerCase();
                const matches = name.includes(searchLower) || meta.includes(searchLower);
                card.style.display = matches ? 'flex' : 'none';
            });
        }

        // Filtrar arquivos comuns
        if (this.currentTab === 'files') {
            const cards = document.querySelectorAll('#files-list .strategy-card');
            const searchLower = query.toLowerCase();

            cards.forEach(card => {
                const name = card.querySelector('.strategy-name').textContent.toLowerCase();
                const meta = card.querySelector('.strategy-meta').textContent.toLowerCase();
                const matches = name.includes(searchLower) || meta.includes(searchLower);
                card.style.display = matches ? 'flex' : 'none';
            });
        }
    }

    // ================= COMMON FILES METHODS =================
    async loadCommonFiles() {
        const listContainer = document.getElementById('files-list');
        listContainer.innerHTML = '<div class="loading-strategies"><div class="loading-spinner"></div><p>Carregando arquivos...</p></div>';

        if (!window.fileSharing) {
            if (window.FileSharing) {
                window.fileSharing = new FileSharing();
            } else {
                listContainer.innerHTML = '<div class="error-strategies"><p>❌ Sistema de arquivos não disponível.</p></div>';
                return;
            }
        }

        try {
            // Obter e filtrar arquivos
            const allFiles = await window.fileSharing.listFiles();
            const commonFiles = allFiles.filter(f => f.isCommonFile === true);

            if (commonFiles.length === 0) {
                listContainer.innerHTML = '<div class="no-strategies"><p>📭 Nenhum arquivo compartilhado ainda.</p></div>';
                return;
            }

            listContainer.innerHTML = commonFiles.map(file => this.createCommonFileCard(file)).join('');

            // Listeners
            document.querySelectorAll('.file-download-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const isDb = btn.dataset.isdb === 'true';
                    if (isDb) {
                        this.handleCommonFileDownload(btn.dataset.id, btn.dataset.name, btn.dataset.type);
                    } else {
                        // Link direto (url) já tratado no href se possível, mas aqui usamos JS
                        window.open(btn.dataset.url, '_blank');
                        window.fileSharing.incrementDownloads(btn.dataset.id);
                    }
                });
            });

            document.querySelectorAll('.file-delete-btn').forEach(btn => {
                btn.addEventListener('click', () => this.handleCommonFileDelete(btn.dataset.id, btn.dataset.name));
            });

        } catch (error) {
            listContainer.innerHTML = `<div class="error-strategies"><p>❌ Erro ao carregar arquivos: ${error.message}</p></div>`;
        }
    }

    createCommonFileCard(file) {
        const date = file.uploadDate ? new Date(file.uploadDate.seconds * 1000).toLocaleDateString('pt-BR') : 'Data desconhecida';
        const fileSize = (file.fileSize / 1024).toFixed(2);
        const isDatabaseFile = file.storageType === 'firestore_detached' || file.storageType === 'firestore_chunks';

        // Verificar Admin
        const isAdmin = typeof UserLevelsManager !== 'undefined' &&
            UserLevelsManager.getCurrentUserLevel() === UserLevelsManager.USER_LEVELS.ADMIN;

        let deleteBtn = '';
        if (isAdmin) {
            deleteBtn = `
                <button class="strategy-delete-btn file-delete-btn" data-id="${file.id}" data-name="${file.fileName}" title="Deletar Arquivo">
                    🗑️
                </button>
            `;
        }

        return `
            <div class="strategy-card">
                <div class="strategy-card-header">
                    <span class="strategy-icon">📦</span>
                    <div class="strategy-info">
                        <h4 class="strategy-name">${file.fileName}</h4>
                        <p class="strategy-meta">
                            ${date} • ${fileSize} KB • ${file.downloads || 0} downloads
                        </p>
                        ${file.description ? `<p style="font-size: 0.8rem; color: #aaa; margin-top: 4px;">${file.description}</p>` : ''}
                    </div>
                </div>
                <div class="strategy-card-actions">
                    ${deleteBtn}
                    <button class="strategy-download-btn file-download-btn" 
                        data-id="${file.id}" 
                        data-name="${file.fileName}"
                        data-type="${file.fileType}"
                        data-url="${file.url}"
                        data-isdb="${isDatabaseFile}">
                        ⬇️ Download
                    </button>
                </div>
            </div>
        `;
    }

    async handleCommonFileDownload(fileId, fileName, fileType) {
        try {
            this.showNotification('⬇️ Iniciando download...', 'info');
            await window.fileSharing.downloadDatabaseFile(fileId, fileName, fileType);
            this.showNotification('✅ Download concluído!', 'success');
            this.loadCommonFiles(); // Atualizar contador
        } catch (error) {
            this.showNotification(`❌ Erro no download: ${error.message}`, 'error');
        }
    }

    async handleCommonFileDelete(fileId, fileName) {
        if (!confirm(`Tem certeza que deseja deletar o arquivo "${fileName}"? Isso removerá da Home Page também.`)) {
            return;
        }

        try {
            this.showNotification('🗑️ Deletando arquivo...', 'info');
            await window.fileSharing.deleteFile(fileId);
            this.showNotification('✅ Arquivo deletado!', 'success');
            this.loadCommonFiles();
        } catch (error) {
            this.showNotification(`❌ Erro ao deletar: ${error.message}`, 'error');
        }
    }

    // ================= ADMIN METHODS =================
    checkAdminAccess() {
        // Verificar se é Admin
        const isAdmin = typeof UserLevelsManager !== 'undefined' &&
            UserLevelsManager.getCurrentUserLevel() === UserLevelsManager.USER_LEVELS.ADMIN;

        const adminSection = document.getElementById('admin-upload-section');
        if (adminSection) {
            adminSection.style.display = isAdmin ? 'block' : 'none';
        }
    }

    handleAdminFileSelect(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('admin-file-preview');
        const uploadBtn = document.getElementById('admin-upload-btn');
        const btnText = document.querySelector('.strategy-file-btn span:last-child'); // Cuidado com seletor genérico

        if (!file) {
            preview.innerHTML = '';
            preview.classList.remove('active');
            uploadBtn.disabled = true;
            return;
        }

        // Mostrar preview/info do arquivo
        const fileSize = (file.size / 1024).toFixed(1);
        preview.innerHTML = `
            <div class="file-info-item">
                <span class="file-icon">📄</span>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${fileSize} KB</span>
                </div>
            </div>
        `;
        preview.classList.add('active');
        uploadBtn.disabled = false;
    }

    async handleAdminUpload() {
        const fileInput = document.getElementById('admin-file-input');
        const file = fileInput.files[0];

        if (!file) {
            this.showNotification('❌ Selecione um arquivo para enviar.', 'error');
            return;
        }

        if (!window.fileSharing) {
            this.showNotification('❌ Sistema de arquivos não inicializado.', 'error');
            return;
        }

        try {
            this.showNotification('📤 Enviando arquivo para Home Page...', 'info');

            // Upload usando o novo helper
            const result = await window.fileSharing.uploadFile(file);

            this.showNotification(`✅ Arquivo "${result.fileName}" enviado com sucesso!`, 'success');

            // Limpar formulário
            fileInput.value = '';
            document.getElementById('admin-file-preview').innerHTML = '';
            document.getElementById('admin-file-preview').classList.remove('active');
            document.getElementById('admin-upload-btn').disabled = true;

        } catch (error) {
            console.error(error);
            this.showNotification(`❌ Erro no envio: ${error.message}`, 'error');
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        const existingNotification = document.querySelector('.strategy-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `strategy-notification strategy-notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.strategyLibraryModal = new StrategyLibraryModal();
  
});
