
// js/stop-monitor.js
// Sistema centralizado de monitoramento e popups de parada

class StopMonitor {
    static showStopTradePopup(type, currentValue, limitValue) {
        // Remover qualquer popup existente primeiro
        this.removeExistingPopups();

        let title, message, icon;

        switch (type) {
            case 'wins':
                title = '🎉 Limite de Vitórias Atingido';
                message = `Parabéns! Atingiu ${currentValue} Wins reais seguidos (limite: ${limitValue}).`;
                icon = '🎉';
                break;
            
            case 'losses':
                title = '💔 Limite de Perdas Atingido';
                message = `Você atingiu ${currentValue} Loss reais seguidas (limite: ${limitValue}).`;
                icon = '💔';
                break;
            
            case 'meta':
                title = '🎯 Meta de Lucro Atingida';
                message = `Parabéns! Você atingiu sua meta de lucro: $${currentValue.toFixed(2)}`;
                icon = '🎯';
                break;
            
            case 'stoploss':
                title = '🛑 Stop Loss Atingido';
                message = `Stop loss acionado! Perda atual: $${currentValue.toFixed(2)}`;
                icon = '🛑';
                break;
            
            default:
                title = '⚠️ Limite Atingido';
                message = `Um limite foi atingido: ${currentValue}/${limitValue}`;
                icon = '⚠️';
        }

        // Criar o popup
        const popup = document.createElement('div');
        popup.className = 'stop-monitoring-popup';
        popup.innerHTML = `
            <div class="popup-overlay"></div>
            <div class="popup-content">
                <div class="popup-header">
                    <div class="popup-icon ${type === 'wins' ? 'success' : type === 'meta' ? 'success' : 'danger'}">${icon}</div>
                </div>
                <div class="popup-body">
                    <h2 class="popup-title">${title}</h2>
                    <p class="popup-message">${message}</p>
                    <p class="popup-info">
                        O monitoramento foi interrompido automaticamente para proteger seus resultados.
                    </p>
                </div>
                <div class="popup-footer">
                    <button class="popup-close-btn" onclick="StopMonitor.closePopup()">
                        <span class="btn-icon">✓</span>
                        <span class="btn-text">Entendi</span>
                    </button>
                </div>
            </div>
        `;

        // Adicionar estilos dinâmicos
        this.addPopupStyles();

        // Adicionar ao DOM
        document.body.appendChild(popup);

        // Animação de entrada
        requestAnimationFrame(() => {
            popup.classList.add('show');
        });

        // Parar o monitoramento
        this.stopAllMonitoring();

        // ✅ REMOVIDO: Auto-close removido - popup permanece até usuário fechar
    }

    static closePopup() {
        const popup = document.querySelector('.stop-monitoring-popup');
        if (popup) {
            // Animação de saída
            popup.classList.add('hide');
            
            // Remover após animação
            setTimeout(() => {
                popup.remove();
                
                // Resetar flag de popup no TradeManager
                const tradeManager = getTradeManagerInstance();
                if (tradeManager) {
                    tradeManager.popupShown = false;
                }
                
                // Tentar resetar também via StopMonitor
                if (typeof StopMonitor !== 'undefined' && StopMonitor.resetPopupFlag) {
                    StopMonitor.resetPopupFlag();
                }
            }, 300);
        }
    }

    static removeExistingPopups() {
        const existingPopups = document.querySelectorAll('.stop-monitoring-popup');
        existingPopups.forEach(popup => popup.remove());
    }

    static stopAllMonitoring() {
        try {
            // Parar MonitoringView se estiver ativo
            if (typeof MonitoringView !== 'undefined' && MonitoringView.state !== 'IDLE') {
                MonitoringView.stopMonitoring();
            }

            // Atualizar botões de interface
            this.updateMonitoringButtons(false);

        } catch (error) {
            console.error('❌ [STOP MONITOR] Erro ao parar monitoramento:', error);
        }
    }

    static updateMonitoringButtons(isActive) {
        const startBtn = CommonHelpers.getElement('start-monitoring-btn');
        const stopBtn = CommonHelpers.getElement('stop-monitoring-btn');

        if (startBtn) {
            startBtn.disabled = isActive;
        }
        
        if (stopBtn) {
            stopBtn.disabled = !isActive;
        }
    }

    static resetPopupFlag() {
        // Resetar flag de popup no TradeManager
        const tradeManager = getTradeManagerInstance();
        if (tradeManager) {
            tradeManager.popupShown = false;
        }
    }

    static addPopupStyles() {
        // Verificar se estilos já foram adicionados
        if (document.getElementById('stop-popup-styles')) return;

        const style = document.createElement('style');
        style.id = 'stop-popup-styles';
        style.textContent = `
            .stop-monitoring-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transform: scale(0.8);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: none;
            }

            .stop-monitoring-popup.show {
                opacity: 1;
                transform: scale(1);
                pointer-events: all;
            }

            .stop-monitoring-popup.hide {
                opacity: 0;
                transform: scale(0.8);
                pointer-events: none;
            }

            .popup-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
            }

            .popup-content {
                position: relative;
                background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
                border-radius: 20px;
                max-width: 480px;
                width: 90%;
                box-shadow: 
                    0 25px 50px -12px rgba(0, 0, 0, 0.25),
                    0 0 0 1px rgba(255, 255, 255, 0.05);
                overflow: hidden;
                border: 3px solid transparent;
                background-clip: padding-box;
                animation: popupPulse 0.6s ease-out;
            }

            @keyframes popupPulse {
                0% { transform: scale(0.9); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }

            .popup-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 25px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .popup-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                animation: shimmer 2s infinite;
            }

            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            .popup-icon {
                font-size: 4rem;
                margin-bottom: 10px;
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
                animation: iconBounce 1s ease-out;
            }

            @keyframes iconBounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }

            .popup-icon.success {
                color: #28a745;
                text-shadow: 0 0 20px rgba(40, 167, 69, 0.5);
            }

            .popup-icon.danger {
                color: #dc3545;
                text-shadow: 0 0 20px rgba(220, 53, 69, 0.5);
            }

            .popup-body {
                padding: 30px;
                text-align: center;
            }

            .popup-title {
                color: #2c3e50;
                margin: 0 0 20px 0;
                font-size: 1.8rem;
                font-weight: 700;
                line-height: 1.3;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .popup-message {
                color: #495057;
                font-size: 1.2rem;
                line-height: 1.6;
                margin: 0 0 20px 0;
                font-weight: 500;
            }

            .popup-info {
                color: #6c757d;
                font-size: 1rem;
                line-height: 1.5;
                margin: 0;
                padding: 15px;
                background: rgba(102, 126, 234, 0.1);
                border-radius: 10px;
                border-left: 4px solid #667eea;
            }

            .popup-footer {
                padding: 20px 30px 30px;
                text-align: center;
            }

            .popup-close-btn {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                border: none;
                padding: 15px 40px;
                border-radius: 50px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
                border: 2px solid rgba(255, 255, 255, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-width: 160px;
                position: relative;
                overflow: hidden;
            }

            .popup-close-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(40, 167, 69, 0.4);
                background: linear-gradient(135deg, #20c997 0%, #17a2b8 100%);
            }

            .popup-close-btn:active {
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.3);
            }

            .popup-close-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                transition: left 0.5s ease;
            }

            .popup-close-btn:hover::before {
                left: 100%;
            }

            .btn-icon {
                font-size: 1.2rem;
                transition: transform 0.3s ease;
            }

            .popup-close-btn:hover .btn-icon {
                transform: scale(1.2);
            }

            .btn-text {
                font-weight: 600;
                letter-spacing: 0.5px;
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .popup-content {
                    max-width: 95%;
                    margin: 20px;
                }

                .popup-icon {
                    font-size: 3rem;
                }

                .popup-title {
                    font-size: 1.5rem;
                }

                .popup-message {
                    font-size: 1.1rem;
                }

                .popup-close-btn {
                    padding: 12px 30px;
                    font-size: 1rem;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// Disponibilizar globalmente
window.StopMonitor = StopMonitor;
