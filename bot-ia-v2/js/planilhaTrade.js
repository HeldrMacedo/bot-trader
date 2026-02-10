
// js/planilhaTrade.js
// Sistema de planilha manual de trades
// Permite ao usuário registrar manualmente seu histórico de trades

class PlanilhaTrade {
    static modalInstance = null;
    static entries = [];

    // Inicializar o sistema
    static init() {
        this.addStyles();
        this.loadEntries();
    }

    // Mostrar modal da planilha
    static showModal() {
        this.loadEntries();
        this.createModal();
    }



    // Carregar dados salvos
    static loadEntries() {
        try {
            const sessionId = SessionManager.getUserSessionId();
            const currentUser = SessionManager.getCurrentUser();

            if (!currentUser) {
                this.entries = [];
                return;
            }

            const saved = localStorage.getItem(`planilha_manual_${sessionId}`);
            this.entries = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('❌ [PLANILHA] Erro ao carregar dados:', error);
            this.entries = [];
        }
    }

    // Salvar dados
    static saveEntries() {
        try {
            const sessionId = SessionManager.getUserSessionId();
            localStorage.setItem(`planilha_manual_${sessionId}`, JSON.stringify(this.entries));
        } catch (error) {
            console.error('❌ [PLANILHA] Erro ao salvar dados:', error);
        }
    }

    // Criar modal da planilha
    static createModal() {
        // Verificar se já existe um modal aberto
        if (this.modalInstance) {

            return;
        }

        // Remover qualquer modal órfão
        const existingModals = document.querySelectorAll('.planilha-trade-modal');
        existingModals.forEach(modal => modal.remove());

        const modal = document.createElement('div');
        modal.className = 'planilha-trade-modal';
        modal.innerHTML = this.getModalHTML();

        document.body.appendChild(modal);
        this.modalInstance = modal;

        // Event listeners
        this.attachEventListeners();

        // Animar entrada
        setTimeout(() => {
            if (this.modalInstance && !this.modalInstance.dataset.closing) {
                modal.classList.add('show');
            }
        }, 10);
    }

    // HTML do modal
    static getModalHTML() {
        const totalValue = this.entries.reduce((sum, entry) => sum + entry.value, 0);
        const positiveCount = this.entries.filter(e => e.value > 0).length;
        const negativeCount = this.entries.filter(e => e.value < 0).length;

        return `
            <div class="planilha-modal-content">
                <div class="planilha-header">
                    <div class="planilha-title">
                        <h2>📊 Planilha de Histórico de Trades</h2>
                        <div class="planilha-stats">
                            <span class="stat-item">Total de Registros: ${this.entries.length}</span>
                            <span class="stat-item positive">Positivos: ${positiveCount}</span>
                            <span class="stat-item negative">Negativos: ${negativeCount}</span>
                            <span class="stat-item ${totalValue >= 0 ? 'positive' : 'negative'}">
                                Total: $${totalValue.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <button class="planilha-close-btn" data-action="close">×</button>
                </div>

                <div class="planilha-form-section">
                    <h3>➕ Adicionar Novo Registro</h3>
                    <form class="planilha-form" id="planilha-form">
                        <div class="form-group">
                            <label for="entry-date">📅 Data:</label>
                            <input type="date" id="entry-date" name="date" required />
                        </div>
                        <div class="form-group">
                            <label for="entry-description">📝 Descrição:</label>
                            <input type="text" id="entry-description" name="description" 
                                   placeholder="Ex: Trade EUR/USD - Call" required />
                        </div>
                        <div class="form-group">
                            <label for="entry-value">💰 Valor:</label>
                            <input type="number" id="entry-value" name="value" 
                                   step="0.01" placeholder="Ex: 50.00 ou -25.00" required />
                        </div>
                        <button type="submit" class="planilha-btn add">➕ Adicionar Registro</button>
                    </form>
                </div>

                <div class="planilha-actions">
                    <button class="planilha-btn download" data-action="excel">
                        📥 Download Excel
                    </button>
                    <button class="planilha-btn download" data-action="csv">
                        📄 Download CSV
                    </button>
                    <button class="planilha-btn print" data-action="print">
                        🖨️ Imprimir
                    </button>
                </div>

                <div class="planilha-table-container">
                    <table class="planilha-table" id="trades-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateTableRows()}
                        </tbody>
                    </table>
                    ${this.entries.length === 0 ? '<div class="no-trades">📝 Nenhum registro ainda. Adicione seu primeiro trade acima!</div>' : ''}
                </div>
            </div>
        `;
    }

    // Gerar linhas da tabela
    static generateTableRows() {
        return this.entries
            .sort((a, b) => new Date(b.date) - new Date(a.date)) // Mais recente primeiro
            .map(entry => {
                const formattedDate = new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR');
                const valueClass = entry.value >= 0 ? 'positive' : 'negative';
                const valueSymbol = entry.value >= 0 ? '+' : '';

                return `
                    <tr class="trade-row">
                        <td class="date-cell">${formattedDate}</td>
                        <td class="description-cell">${this.escapeHtml(entry.description)}</td>
                        <td class="value-cell ${valueClass}">
                            ${valueSymbol}$${entry.value.toFixed(2)}
                        </td>
                        <td class="actions-cell">
                            <button class="action-btn edit" data-id="${entry.id}" data-action="edit" title="Editar">✏️</button>
                            <button class="action-btn delete" data-id="${entry.id}" data-action="delete" title="Excluir">🗑️</button>
                        </td>
                    </tr>
                `;
            }).join('');
    }

    // Escapar HTML para evitar XSS
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event listeners
    static attachEventListeners() {
        if (!this.modalInstance) return;

        // Fechar modal clicando no X
        const closeBtn = this.modalInstance.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            });
        }

        // Fechar modal clicando fora (apenas se clicar diretamente no overlay)
        this.modalInstance.addEventListener('click', (e) => {
            if (e.target === this.modalInstance && e.target.classList.contains('planilha-trade-modal')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            }
        });

        // Prevenir propagação de cliques no conteúdo do modal
        const modalContent = this.modalInstance.querySelector('.planilha-modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Fechar com ESC
        document.addEventListener('keydown', this.handleKeydown);

        // Form submit
        const form = this.modalInstance.querySelector('#planilha-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addEntry(e.target);
            });
        }

        // Botões de ação
        const excelBtn = this.modalInstance.querySelector('[data-action="excel"]');
        const csvBtn = this.modalInstance.querySelector('[data-action="csv"]');
        const printBtn = this.modalInstance.querySelector('[data-action="print"]');

        if (excelBtn) excelBtn.addEventListener('click', () => this.downloadExcel());
        if (csvBtn) csvBtn.addEventListener('click', () => this.downloadCSV());
        if (printBtn) printBtn.addEventListener('click', () => this.printTable());

        // Botões de editar e excluir
        this.modalInstance.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('[data-id]').dataset.id;
                this.editEntry(id);
            });
        });

        this.modalInstance.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('[data-id]').dataset.id;
                this.deleteEntry(id);
            });
        });
    }

    // Handler para teclas
    static handleKeydown = (e) => {
        if (e.key === 'Escape' && this.modalInstance) {
            this.closeModal();
        }
    }

    // Adicionar novo registro
    static addEntry(form) {
        const formData = new FormData(form);
        const entry = {
            id: Date.now().toString(),
            date: formData.get('date'),
            description: formData.get('description'),
            value: parseFloat(formData.get('value'))
        };

        // Validar dados
        if (!entry.date || !entry.description || isNaN(entry.value)) {
            this.showFeedback('❌ Preencha todos os campos corretamente!');
            return;
        }


        this.entries.push(entry);
        this.saveEntries();

        // Limpar formulário
        form.reset();

        // Atualizar modal
        this.refreshModal();

        this.showFeedback('✅ Registro adicionado com sucesso!');

    }

    // Editar registro
    static editEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (!entry) return;

        const form = this.modalInstance.querySelector('#planilha-form');
        if (!form) return;

        // Preencher o formulário com os dados do registro
        form.querySelector('[name="date"]').value = entry.date;
        form.querySelector('[name="description"]').value = entry.description;
        form.querySelector('[name="value"]').value = entry.value;

        // Remover o registro antigo
        this.deleteEntry(id, false);

        // Scroll para o formulário
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        this.showFeedback('✏️ Editando registro. Modifique e clique em Adicionar.');
    }

    // Excluir registro
    static deleteEntry(id, showConfirm = true) {
        if (showConfirm && !confirm('🗑️ Tem certeza que deseja excluir este registro?')) {
            return;
        }

        this.entries = this.entries.filter(e => e.id !== id);
        this.saveEntries();
        this.refreshModal();

        if (showConfirm) {
            this.showFeedback('✅ Registro excluído com sucesso!');
        }
    }

    // Atualizar modal
    static refreshModal() {
        if (!this.modalInstance || this.modalInstance.dataset.closing === 'true') return;

        const content = this.modalInstance.querySelector('.planilha-modal-content');
        if (content) {
            // Salvar estado de scroll
            const scrollTop = content.scrollTop;

            // Obter novo HTML completo
            const newHTML = this.getModalHTML();

            // Extrair apenas o conteúdo interno
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHTML;
            const newContent = tempDiv.querySelector('.planilha-modal-content');

            if (newContent) {
                // Substituir todo o conteúdo
                content.innerHTML = newContent.innerHTML;

                // Restaurar scroll
                content.scrollTop = scrollTop;

                // Reattachar listeners
                this.attachEventListeners();

            }
        }
    }

    // Fechar modal
    static closeModal() {
        if (this.modalInstance) {
            // Remover event listeners
            document.removeEventListener('keydown', this.handleKeydown);

            // Marcar como fechando para evitar múltiplas execuções
            if (this.modalInstance.dataset.closing === 'true') {
                return;
            }
            this.modalInstance.dataset.closing = 'true';

            // Primeiro remover a classe show para animar a saída
            this.modalInstance.classList.remove('show');
            this.modalInstance.classList.add('hide');

            // Aguardar a animação e remover o elemento
            setTimeout(() => {
                if (this.modalInstance && this.modalInstance.parentNode) {
                    this.modalInstance.parentNode.removeChild(this.modalInstance);
                }
                this.modalInstance = null;

                // Limpar quaisquer modais órfãos
                const orphanModals = document.querySelectorAll('.planilha-trade-modal');
                orphanModals.forEach(modal => {
                    if (modal.parentNode) {
                        modal.remove();
                    }
                });

            }, 300);
        }
    }

    // Download Excel
    static downloadExcel() {
        try {
            if (this.entries.length === 0) {
                alert('📝 Nenhum registro para exportar!');
                return;
            }

            const csvContent = this.generateCSVContent();
            const blob = new Blob(['\uFEFF' + csvContent], {
                type: 'text/csv;charset=utf-8;'
            });

            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `planilha_trades_${this.getDateString()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showFeedback('✅ Planilha Excel baixada com sucesso!');
        } catch (error) {
            console.error('❌ [PLANILHA] Erro no download Excel:', error);
            alert('❌ Erro ao baixar planilha Excel');
        }
    }

    // Download CSV
    static downloadCSV() {
        try {
            if (this.entries.length === 0) {
                alert('📝 Nenhum registro para exportar!');
                return;
            }

            const csvContent = this.generateCSVContent();
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `planilha_trades_${this.getDateString()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showFeedback('✅ Arquivo CSV baixado com sucesso!');
        } catch (error) {
            console.error('❌ [PLANILHA] Erro no download CSV:', error);
            alert('❌ Erro ao baixar arquivo CSV');
        }
    }

    // Gerar conteúdo CSV
    static generateCSVContent() {
        const headers = ['Data', 'Descrição', 'Valor'];
        let csvContent = headers.join(',') + '\n';

        const sortedEntries = [...this.entries].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedEntries.forEach(entry => {
            const formattedDate = new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR');
            const row = [
                formattedDate,
                entry.description,
                entry.value.toFixed(2)
            ];
            csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });

        return csvContent;
    }

    // Imprimir tabela
    static printTable() {
        try {
            if (this.entries.length === 0) {
                alert('📝 Nenhum registro para imprimir!');
                return;
            }

            const printWindow = window.open('', '_blank');
            const printContent = this.generatePrintHTML();

            printWindow.document.write(printContent);
            printWindow.document.close();

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);

            this.showFeedback('🖨️ Preparando impressão...');
        } catch (error) {
            console.error('❌ [PLANILHA] Erro na impressão:', error);
            alert('❌ Erro ao preparar impressão');
        }
    }

    // Gerar HTML para impressão
    static generatePrintHTML() {
        const totalValue = this.entries.reduce((sum, entry) => sum + entry.value, 0);
        const positiveCount = this.entries.filter(e => e.value > 0).length;
        const negativeCount = this.entries.filter(e => e.value < 0).length;
        const sortedEntries = [...this.entries].sort((a, b) => new Date(b.date) - new Date(a.date));

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Planilha de Histórico de Trades</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .stats { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; }
                    .stat-item { padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    .positive { color: #28a745; font-weight: bold; }
                    .negative { color: #dc3545; font-weight: bold; }
                    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; }
                    @media print {
                        body { margin: 0; }
                        .stats { justify-content: space-around; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 Planilha de Histórico de Trades</h1>
                    <p><strong>Strategy Free</strong> - ${new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                <div class="stats">
                    <div class="stat-item">Total de Registros: ${this.entries.length}</div>
                    <div class="stat-item positive">Positivos: ${positiveCount}</div>
                    <div class="stat-item negative">Negativos: ${negativeCount}</div>
                    <div class="stat-item ${totalValue >= 0 ? 'positive' : 'negative'}">
                        Total: $${totalValue.toFixed(2)}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedEntries.map(entry => {
            const formattedDate = new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR');
            const valueClass = entry.value >= 0 ? 'positive' : 'negative';
            const valueSymbol = entry.value >= 0 ? '+' : '';
            return `
                                <tr>
                                    <td>${formattedDate}</td>
                                    <td>${this.escapeHtml(entry.description)}</td>
                                    <td class="${valueClass}">
                                        ${valueSymbol}$${entry.value.toFixed(2)}
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <p>Relatório gerado pelo Strategy Free em ${new Date().toLocaleString('pt-BR')}</p>
                </div>
            </body>
            </html>
        `;
    }

    // Utilitários
    static getDateString() {
        const now = new Date();
        return now.toISOString().slice(0, 10).replace(/-/g, '');
    }

    // Mostrar feedback
    static showFeedback(message) {
        const feedback = document.createElement('div');
        feedback.className = 'planilha-feedback';
        feedback.textContent = message;
        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.classList.add('show');
        }, 10);

        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.remove();
                }
            }, 300);
        }, 3000);
    }


    // Adicionar estilos CSS
    static addStyles() {
        if (document.getElementById('planilha-trade-styles')) return;

        const style = document.createElement('style');
        style.id = 'planilha-trade-styles';
        style.textContent = `
            .planilha-trade-modal {
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
                opacity: 0;
                transition: opacity 0.3s ease;
                padding: 20px;
                box-sizing: border-box;
                overflow-y: auto;
            }

            .planilha-trade-modal.show {
                opacity: 1;
            }

            .planilha-trade-modal.hide {
                opacity: 0;
                transform: scale(0.95);
            }

            .planilha-modal-content {
            background: var(--modal-bg-dark);
            background-color: #0c1318; /* Fundo sólido */
            color: var(--modal-text);
            border: 1px solid var(--modal-border);
            border-radius: 15px;
            width: 95%;
            max-width: 1000px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: modalSlideIn 0.3s ease-out;
        }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .planilha-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 25px 30px;
                border-bottom: 1px solid var(--modal-border);
                background: var(--modal-header-bg);
                color: var(--modal-text);
                border-radius: 15px 15px 0 0;
            }

            .planilha-title h2 {
                margin: 0 0 15px 0;
                font-size: 1.8em;
                color: white;
            }

            .planilha-stats {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }

            .stat-item {
                background: rgba(255, 255, 255, 0.2);
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.9em;
                font-weight: bold;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }

            .stat-item.positive {
                background: rgba(40, 167, 69, 0.3);
                border-color: rgba(40, 167, 69, 0.5);
            }

            .stat-item.negative {
                background: rgba(220, 53, 69, 0.3);
                border-color: rgba(220, 53, 69, 0.5);
            }

            .planilha-close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                font-size: 2em;
                color: white;
                cursor: pointer;
                padding: 0;
                width: 45px;
                height: 45px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                line-height: 1;
            }

            .planilha-close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
                border-color: rgba(255, 255, 255, 0.5);
            }

            .planilha-form-section {
                padding: 25px 30px;
                background: var(--modal-input-bg);
                border-bottom: 1px solid var(--modal-border);
            }

            .planilha-form-section h3 {
                margin: 0 0 20px 0;
                color: var(--modal-text);
                font-size: 1.3em;
            }

            .planilha-form {
                display: grid;
                grid-template-columns: 1fr 2fr 1fr auto;
                gap: 15px;
                align-items: start;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
            }

            .form-group label {
                margin-bottom: 8px;
                font-weight: bold;
                color: var(--modal-text);
                font-size: 0.9em;
                height: 20px;
                display: flex;
                align-items: center;
            }

            .form-group input {
                padding: 10px;
                background: var(--modal-input-bg);
                color: var(--modal-text);
                border: 1px solid var(--modal-input-border);
                border-radius: 8px;
                font-size: 1em;
                transition: all 0.3s ease;
                height: 42px;
                box-sizing: border-box;
            }

            .form-group input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .planilha-btn.add {
                height: 42px;
                box-sizing: border-box;
                margin-top: 28px;
                align-self: flex-start;
            }

            .planilha-actions {
                display: flex;
                gap: 10px;
                padding: 20px 30px;
                background: var(--modal-bg-dark);
                border-bottom: 1px solid var(--modal-border);
                flex-wrap: wrap;
            }

            .planilha-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 0.95em;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }

            .planilha-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
            }

            .planilha-btn.add {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
            }

            .planilha-btn.download {
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
            }

            .planilha-btn.print {
                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
                color: white;
            }

            .planilha-table-container {
                padding: 30px;
                max-height: 400px;
                overflow-y: auto;
            }

            .planilha-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.95em;
            }

            .planilha-table thead {
                position: sticky;
                top: 0;
                background: #f8f9fa;
                z-index: 10;
            }

            .planilha-table th {
                padding: 12px;
                text-align: left;
                font-weight: bold;
                color: #495057;
                border-bottom: 2px solid #dee2e6;
            }

            .planilha-table td {
                padding: 12px;
                border-bottom: 1px solid #e9ecef;
            }

            .planilha-table tbody tr:hover {
                background: #f8f9fa;
            }

            .date-cell {
                color: #6c757d;
                font-weight: 500;
            }

            .description-cell {
                color: #495057;
            }

            .value-cell {
                font-weight: bold;
                font-size: 1.1em;
            }

            .value-cell.positive {
                color: #28a745;
            }

            .value-cell.negative {
                color: #dc3545;
            }

            .actions-cell {
                text-align: center;
            }

            .action-btn {
                background: none;
                border: none;
                font-size: 1.3em;
                cursor: pointer;
                padding: 5px;
                margin: 0 3px;
                transition: transform 0.2s ease;
            }

            .action-btn:hover {
                transform: scale(1.2);
            }

            .action-btn.edit {
                filter: grayscale(0.3);
            }

            .action-btn.delete {
                filter: grayscale(0.3);
            }

            .no-trades {
                text-align: center;
                padding: 40px;
                color: #6c757d;
                font-size: 1.1em;
            }

            .planilha-feedback {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10001;
                opacity: 0;
                transition: opacity 0.3s ease;
                font-weight: bold;
            }

            .planilha-feedback.show {
                opacity: 1;
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .planilha-form {
                    grid-template-columns: 1fr;
                }

                .planilha-stats {
                    flex-direction: column;
                    gap: 8px;
                }

                .planilha-actions {
                    flex-direction: column;
                }

                .planilha-btn {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PlanilhaTrade.init());
} else {
    PlanilhaTrade.init();
}
