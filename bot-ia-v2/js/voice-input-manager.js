/**
 * Voice Input Manager - Reconhecimento de Voz para Estratégias
 * Usa Web Speech API para transcrever voz em texto
 */

class VoiceInputManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.voiceBtn = null;
        this.textarea = null;

        this.init();
    }

    init() {
        // Verificar suporte do navegador
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('⚠️ Reconhecimento de voz não suportado neste navegador');
            return;
        }

        // Criar instância do reconhecimento
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configurações
        this.recognition.lang = 'pt-BR';
        this.recognition.continuous = true; // Modo contínuo para melhor detecção
        this.recognition.interimResults = true; // Mostrar resultados parciais
        this.recognition.maxAlternatives = 1;

        // Event listeners do reconhecimento
        this.recognition.onstart = () => this.onStart();
        this.recognition.onresult = (event) => this.onResult(event);
        this.recognition.onerror = (event) => this.onError(event);
        this.recognition.onend = () => this.onEnd();

        // Aguardar DOM carregar e configurar listener delegado
        const setup = () => {
            // Listener delegado para o botão (robusto a re-renders)
            document.body.addEventListener('click', (e) => {
                const btn = e.target.closest('#voice-input-btn');
                if (btn) {
                 
                    if (this.isListening) {
                        this.stopListening();
                    } else {
                        this.startListening();
                    }
                }
            });
           
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    getUIElements() {
        this.voiceBtn = document.getElementById('voice-input-btn');
        this.textarea = document.getElementById('strategy-text');
        return this.voiceBtn && this.textarea;
    }

    // setupUI removido

    // attachEventListeners removido

    startListening() {
        this.getUIElements(); // Atualizar referências

        if (!this.recognition) {
            alert('❌ Reconhecimento de voz não disponível neste navegador.\n\nUse Chrome, Edge ou Safari para esta funcionalidade.');
            return;
        }

        try {
            this.recognition.start();
          
            // Mostrar instruções importantes
            setTimeout(() => {
                if (this.isListening && this.textarea) {
                    const currentPlaceholder = this.textarea.placeholder;
                    this.textarea.placeholder = '🎤 FALE AGORA - Fale ALTO e PRÓXIMO ao microfone!';

                    // Restaurar placeholder original após 5 segundos
                    setTimeout(() => {
                        if (this.textarea) {
                            this.textarea.placeholder = currentPlaceholder;
                        }
                    }, 5000);
                }
            }, 500);

            // Alerta de diagnóstico se não detectar fala em 3 segundos
            this.diagnosticTimeout = setTimeout(() => {
              
            }, 3000);
        } catch (error) {
            console.error('❌ Erro ao iniciar reconhecimento:', error);
            if (error.message.includes('already started')) {
                // Já está rodando, apenas atualizar UI
                this.isListening = true;
                this.updateButtonState();
            }
        }
    }

    stopListening() {
      
        // Limpar timeout de diagnóstico
        if (this.diagnosticTimeout) {
            clearTimeout(this.diagnosticTimeout);
            this.diagnosticTimeout = null;
        }

        // CRÍTICO: Desligar flag ANTES de parar para evitar auto-restart
        this.isListening = false;

        if (this.recognition) {
            try {
                this.recognition.stop();
                this.updateButtonState();
            } catch (error) {
                console.warn('⚠️ Erro ao parar reconhecimento:', error.message);
            }
        }
    }

    onStart() {
        this.isListening = true;
        this.updateButtonState();
       
    }

    onResult(event) {
        // Limpar timeout de diagnóstico - áudio foi detectado!
        if (this.diagnosticTimeout) {
            clearTimeout(this.diagnosticTimeout);
            this.diagnosticTimeout = null;
        }

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }

        // Adicionar texto final ao textarea
        if (finalTranscript) {
            const currentText = this.textarea.value;
            const newText = currentText ? currentText + '\n' + finalTranscript.trim() : finalTranscript.trim();
            this.textarea.value = newText;

            // Trigger input event para auto-resize
            this.textarea.dispatchEvent(new Event('input', { bubbles: true }));

          
        }
    }

    onError(event) {
        console.error('❌ Erro no reconhecimento de voz:', event.error);

        // Parar microfone imediatamente
        this.isListening = false;
        this.updateButtonState();

        // Limpar timeout de diagnóstico
        if (this.diagnosticTimeout) {
            clearTimeout(this.diagnosticTimeout);
            this.diagnosticTimeout = null;
        }

        let errorTitle = '🎤 Erro no Reconhecimento de Voz';
        let errorMessage = '';
        let showModal = true;

        switch (event.error) {
            case 'no-speech':
                // Detectar se está em modo anônimo
                const isIncognito = this.detectIncognitoMode();

                if (isIncognito) {
                    errorTitle = '🕵️ Modo Anônimo Detectado';
                    errorMessage = `
                        <p><strong>Você está usando uma guia anônima.</strong></p>
                        <p>O Chrome em modo anônimo tem restrições mais severas para microfone.</p>
                        <br>
                        <p><strong>Soluções:</strong></p>
                        <ul style="text-align: left; margin-left: 20px;">
                            <li>Use uma <strong>guia normal</strong> (recomendado)</li>
                            <li>Ou conceda permissão do microfone <strong>toda vez</strong></li>
                            <li>Fale <strong>IMEDIATAMENTE</strong> após clicar no microfone</li>
                            <li>Fale <strong>ALTO</strong> e <strong>PRÓXIMO</strong> ao microfone</li>
                        </ul>
                    `;
                } else {
                    errorTitle = '🎤 Microfone Não Detectou Áudio';
                    errorMessage = `
                        <p><strong>O microfone está ativo, mas não detectou nenhum áudio.</strong></p>
                        <br>
                        <p><strong>Verifique:</strong></p>
                        <ul style="text-align: left; margin-left: 20px;">
                            <li>Volume do microfone está em <strong>90-100%</strong>?</li>
                            <li>Microfone correto selecionado no Chrome?</li>
                            <li>Está falando <strong>ALTO</strong> e <strong>PRÓXIMO</strong>?</li>
                            <li>Fale <strong>IMEDIATAMENTE</strong> após clicar</li>
                        </ul>
                        <br>
                        <p><small>Teste seu microfone em: Configurações do Windows → Som → Testar microfone</small></p>
                    `;
                }
                break;

            case 'audio-capture':
                errorTitle = '🎤 Microfone Não Encontrado';
                errorMessage = `
                    <p><strong>Nenhum microfone foi detectado.</strong></p>
                    <br>
                    <p><strong>Soluções:</strong></p>
                    <ul style="text-align: left; margin-left: 20px;">
                        <li>Conecte um microfone ao computador</li>
                        <li>Verifique se o microfone está habilitado no Windows</li>
                        <li>Reinicie o navegador</li>
                    </ul>
                `;
                break;

            case 'not-allowed':
                errorTitle = '🚫 Permissão Negada';
                errorMessage = `
                    <p><strong>Você negou a permissão do microfone.</strong></p>
                    <br>
                    <p><strong>Para permitir:</strong></p>
                    <ol style="text-align: left; margin-left: 20px;">
                        <li>Clique no <strong>cadeado 🔒</strong> na barra de endereço</li>
                        <li>Clique em <strong>"Configurações do site"</strong></li>
                        <li>Em <strong>"Microfone"</strong>, selecione <strong>"Permitir"</strong></li>
                        <li><strong>Recarregue a página</strong> (F5)</li>
                    </ol>
                `;
                break;

            case 'network':
                errorTitle = '🌐 Erro de Rede';
                errorMessage = `
                    <p><strong>Erro de conexão com o serviço de reconhecimento de voz.</strong></p>
                    <br>
                    <p><strong>Soluções:</strong></p>
                    <ul style="text-align: left; margin-left: 20px;">
                        <li>Verifique sua conexão com a internet</li>
                        <li>Tente novamente em alguns segundos</li>
                    </ul>
                `;
                break;

            case 'aborted':
                // Erro de abortar é normal quando o usuário para manualmente
                showModal = false;
            
                break;

            default:
                errorMessage = `
                    <p><strong>Ocorreu um erro inesperado: ${event.error}</strong></p>
                    <br>
                    <p>Tente recarregar a página ou usar outro navegador.</p>
                `;
        }

        // Mostrar modal apenas se necessário
        if (showModal) {
            this.showErrorModal(errorTitle, errorMessage);
        }
    }

    detectIncognitoMode() {
        // Detectar modo anônimo
        return new Promise((resolve) => {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                navigator.storage.estimate().then(({ quota }) => {
                    // Em modo anônimo, a quota é muito menor
                    resolve(quota < 120000000); // < 120MB = provavelmente anônimo
                });
            } else {
                resolve(false);
            }
        });

        // Retorno síncrono simplificado (não 100% preciso mas funcional)
        try {
            return !window.localStorage || window.localStorage.length === 0;
        } catch (e) {
            return true; // Se der erro ao acessar localStorage = modo anônimo
        }
    }

    showErrorModal(title, message) {
        // Remover modal anterior se existir
        const existingModal = document.getElementById('voice-error-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'voice-error-modal';
        modal.innerHTML = `
            <div class="voice-modal-overlay">
                <div class="voice-modal-content">
                    <h2 style="margin-top: 0; color: #dc3545;">${title}</h2>
                    <div class="voice-modal-body">
                        ${message}
                    </div>
                    <button class="voice-modal-close-btn" onclick="document.getElementById('voice-error-modal').remove()">
                        Entendi
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar ao clicar fora
        modal.querySelector('.voice-modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('voice-modal-overlay')) {
                modal.remove();
            }
        });
    }

    onEnd() {
       
        // Se ainda está em modo de escuta, reiniciar automaticamente
        if (this.isListening) {
         
            setTimeout(() => {
                if (this.isListening) {
                    try {
                        this.recognition.start();
                    } catch (error) {
                        console.warn('⚠️ Erro ao reiniciar:', error.message);
                    }
                }
            }, 100);
        } else {
            this.updateButtonState();
        }
    }

    updateButtonState() {
        if (!this.voiceBtn) return;

        if (this.isListening) {
            this.voiceBtn.innerHTML = '🔴'; // Microfone ativo (vermelho)
            this.voiceBtn.style.animation = 'pulse 1.5s infinite';
            this.voiceBtn.title = 'Clique para parar de ouvir';
        } else {
            this.voiceBtn.innerHTML = '🎤'; // Microfone normal
            this.voiceBtn.style.animation = 'none';
            this.voiceBtn.title = 'Clique para falar sua estratégia';
        }
    }
}

// Adicionar animação de pulso ao CSS
if (!document.getElementById('voice-input-styles')) {
    const voiceStyles = document.createElement('style');
    voiceStyles.id = 'voice-input-styles';
    voiceStyles.textContent = `
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.1);
                opacity: 0.8;
            }
        }

        #voice-input-btn {
            font-size: 16px !important;
            width: 28px !important;
            height: 28px !important;
            padding: 2px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }

        .voice-input-btn:hover {
            transform: scale(1.15);
            filter: brightness(1.2);
        }

        .voice-input-btn:active {
            transform: scale(0.95);
        }

        /* Modal de erro */
        .voice-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .voice-modal-content {
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
            text-align: center;
        }

        @keyframes slideUp {
            from {
                transform: translateY(50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .voice-modal-body {
            margin: 20px 0;
            color: #333;
            line-height: 1.6;
        }

        .voice-modal-body ul,
        .voice-modal-body ol {
            margin: 10px 0;
        }

        .voice-modal-body li {
            margin: 8px 0;
        }

        .voice-modal-close-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }

        .voice-modal-close-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
    `;
    document.head.appendChild(voiceStyles);
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.voiceInputManager = new VoiceInputManager();
    });
} else {
    window.voiceInputManager = new VoiceInputManager();
}
