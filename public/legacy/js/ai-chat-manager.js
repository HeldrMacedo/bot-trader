// Gerenciador de Chat IA Trader
// Controla o fluxo de conversação com o Gemini

class AIChatManager {
    constructor() {
        this.messages = []; // Histórico da sessão atual
        this.isProcessing = false;
        this.contextProcessor = null;
        this.modal = null;
        this.currentImage = null;
    }

    /**
     * Inicializa o gerenciador
     */
    initialize() {
        if (!this.contextProcessor) {
            this.contextProcessor = getAIChatContextProcessor();
        }
        this.createModal();
    }

    /**
     * Cria o modal de chat
     */
    createModal() {
        if (document.getElementById('ai-chat-modal')) {
            return; // Já existe
        }

        const modalHTML = `
            <div id="ai-chat-modal" class="ai-chat-modal" style="display: none;">
                <div class="ai-chat-modal-backdrop"></div>
                <div class="ai-chat-modal-content">
                    <div class="ai-chat-header">
                        <h3>💬 Converse com a IA Trader</h3>
                        <button class="ai-chat-close-btn" onclick="getAIChatManager().closeChat()">×</button>
                    </div>
                    <div class="ai-chat-messages" id="ai-chat-messages">
                        <!-- Mensagens aqui -->
                    </div>

                    <!-- Container de Preview -->
                    <div id="ai-chat-preview" class="ai-chat-preview-container"></div>

                    <div class="ai-chat-input-container">
                        <!-- Input de Arquivo Oculto -->
                        <input type="file" id="ai-chat-file-input" accept="image/*" style="display: none;" onchange="getAIChatManager().handleFileSelect(this)">

                        <!-- Botão de Upload -->
                        <button class="ai-chat-upload-btn" onclick="document.getElementById('ai-chat-file-input').click()" title="Enviar imagem">
                            📁
                        </button>

                        <textarea 
                            id="ai-chat-input" 
                            placeholder="Digite sua pergunta sobre o mercado..."
                            rows="2"
                        ></textarea>
                        <button id="ai-chat-send-btn" onclick="getAIChatManager().handleSend()">
                            <span>Enviar</span>
                        </button>
                    </div>
                    <div class="ai-chat-footer" id="ai-chat-footer">
                        💳 Créditos: 0
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('ai-chat-modal');

        // Event listener para Enter (com Shift+Enter para nova linha)
        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSend();
                }
            });
        }
    }

    /**
     * Manipula seleção de arquivo
     */
    handleFileSelect(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];

            // Validar tipo
            if (!file.type.startsWith('image/')) {
                alert('❌ Por favor, selecione apenas arquivos de imagem.');
                return;
            }

            // Validar tamanho (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('❌ A imagem deve ter no máximo 5MB.');
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                const base64Data = e.target.result; // Data URL completo

                this.currentImage = {
                    data: base64Data.split(',')[1], // Apenas o base64
                    mimeType: file.type,
                    url: base64Data // Para preview
                };

                this.showImagePreview();
            };

            reader.readAsDataURL(file);
        }
        // Limpar input para permitir selecionar o mesmo arquivo novamente
        input.value = '';
    }

    /**
     * Mostra preview da imagem
     */
    showImagePreview() {
        const container = document.getElementById('ai-chat-preview');
        if (this.currentImage && container) {
            container.innerHTML = `
                <div class="ai-chat-preview-item">
                    <img src="${this.currentImage.url}" alt="Preview">
                    <button class="ai-chat-preview-remove" onclick="getAIChatManager().removeImage()">×</button>
                </div>
            `;
            container.style.display = 'block';
        }
    }

    /**
     * Remove imagem selecionada
     */
    removeImage() {
        this.currentImage = null;
        const container = document.getElementById('ai-chat-preview');
        if (container) {
            container.innerHTML = '';
            container.style.display = 'none';
        }
    }

    /**
     * Abre o chat
     */
    async openChat() {
        // Verificar créditos antes de abrir
        const credits = await CreditsManager.getCurrentCredits();
        if (credits < 1) {
            alert('❌ Você precisa de pelo menos 1 crédito para usar o chat IA.');
            return;
        }

        if (!this.modal) {
            this.initialize();
        }

        // Limpar mensagens anteriores (sem histórico persistente)
        this.messages = [];
        const messagesContainer = document.getElementById('ai-chat-messages');
        messagesContainer.innerHTML = '';

        // Limpar imagem pendente
        this.removeImage();

        // Mensagem de boas-vindas
        this.addMessageToChat('ai', 'Olá! Sou a IA Trader. Posso ajudá-lo com análises de mercado, estatísticas de dígitos, preços e indicadores técnicos. Como posso ajudar?');

        // Atualizar display de créditos
        await this.updateCreditsDisplay();

        // Mostrar modal
        this.modal.style.display = 'flex';

        // Focar no input
        setTimeout(() => {
            const input = document.getElementById('ai-chat-input');
            if (input) input.focus();
        }, 100);
    }

    /**
     * Fecha o chat
     */
    closeChat() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    /**
     * Manipula envio de mensagem
     */
    async handleSend() {
        const input = document.getElementById('ai-chat-input');
        const message = input.value.trim();

        if (!message && !this.currentImage) {
            return;
        }

        if (this.isProcessing) {
            return;
        }

        // Validar créditos
        const credits = await CreditsManager.getCurrentCredits();
        if (credits < 1) {
            alert('❌ Créditos insuficientes. Você precisa de pelo menos 1 crédito.');
            this.updateCreditsDisplay();
            return;
        }

        // Capturar imagem atual e limpar estado
        const imageToSend = this.currentImage;
        this.removeImage();

        // Limpar input
        input.value = '';
        input.style.height = 'auto';

        // Adicionar mensagem do usuário
        this.addMessageToChat('user', message, imageToSend);

        // Processar mensagem
        await this.sendMessage(message, imageToSend);
    }

    /**
     * Envia mensagem para o Gemini
     */
    async sendMessage(userMessage, imageData = null) {
        this.isProcessing = true;

        try {
            const typingId = this.showTypingIndicator();

            let analysis = { dataType: 'none', count: 0 };

            if (!imageData) {
                analysis = this.contextProcessor.analyzeQuestion(userMessage);
            }

            if (analysis.error) {
                this.removeTypingIndicator(typingId);
                this.addMessageToChat('ai', `⚠️ ${analysis.error}`);
                this.isProcessing = false;
                return;
            }

            let marketContext = '';
            if (analysis.dataType !== 'none') {
                marketContext = this.contextProcessor.getMarketData(analysis.dataType, analysis.count);
            }

            const gemini = getGeminiInstance();
            const response = await gemini.chatWithAI(userMessage, marketContext, imageData);

            this.removeTypingIndicator(typingId);
            this.addMessageToChat('ai', response);

            await this.updateCreditsDisplay();

        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
            this.addMessageToChat('ai', `❌ Erro: ${error.message}`);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Adiciona mensagem ao chat
     */
    addMessageToChat(sender, message, imageData = null) {
        const messagesContainer = document.getElementById('ai-chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-chat-message ai-chat-message-${sender}`;

        const bubble = document.createElement('div');
        bubble.className = 'ai-chat-bubble';

        // Se houver imagem, adicionar antes do texto
        if (imageData && imageData.url) {
            const img = document.createElement('img');
            img.src = imageData.url;
            img.alt = 'Imagem enviada';
            img.className = 'ai-chat-message-image';
            bubble.appendChild(img);
        }

        // Adicionar texto se houver
        if (message) {
            const textNode = document.createTextNode(message);
            bubble.appendChild(textNode);
        }

        messageDiv.appendChild(bubble);
        messagesContainer.appendChild(messageDiv);

        // Scroll para o final
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Mostra indicador de digitação
     */
    showTypingIndicator() {
        const messagesContainer = document.getElementById('ai-chat-messages');
        const typingDiv = document.createElement('div');
        const id = 'typing-' + Date.now();
        typingDiv.id = id;
        typingDiv.className = 'ai-chat-message ai-chat-message-ai';
        typingDiv.innerHTML = `
            <div class="ai-chat-bubble">
                <div class="ai-chat-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return id;
    }

    /**
     * Remove indicador de digitação
     */
    removeTypingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Atualiza display de créditos
     */
    async updateCreditsDisplay() {
        const credits = await CreditsManager.getCurrentCredits();
        const footer = document.getElementById('ai-chat-footer');
        if (footer) {
            footer.textContent = `💳 Créditos: ${credits}`;
        }
    }
}

// Instância global
let aiChatManagerInstance = null;

function getAIChatManager() {
    if (!aiChatManagerInstance) {
        aiChatManagerInstance = new AIChatManager();
    }
    return aiChatManagerInstance;
}
