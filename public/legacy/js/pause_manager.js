/**
 * js/pause_manager.js
 * Gerenciador de Pausa para o DerivBot
 * Responsável por exibir o overlay de bloqueio e o cronômetro regressivo.
 */

class PauseManager {
    static isPaused = false;
    static countdownInterval = null;
    static stylesInjected = false;

    /**
     * Injeta os estilos CSS necessários para o overlay de pausa
     */
    static injectStyles() {
        if (this.stylesInjected) return;

        const style = document.createElement('style');
        style.id = 'pause-overlay-styles';
        style.textContent = `
            .pause-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(4px);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                opacity: 0;
                transition: opacity 0.3s ease;
                color: white;
                text-align: center;
                pointer-events: all;
            }

            .pause-overlay.show {
                opacity: 1;
            }

            .pause-icon {
                font-size: 3rem;
                margin-bottom: 10px;
                animation: pulse-pause 2s infinite;
            }

            .pause-title {
                font-size: 1.2rem;
                font-weight: bold;
                margin-bottom: 5px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .pause-countdown {
                font-size: 1.5rem;
                font-family: 'Courier New', Courier, monospace;
                background: rgba(0, 0, 0, 0.6);
                padding: 5px 15px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            @keyframes pulse-pause {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }

            /* Garante que o container monitorado tenha posição relativa para o overlay se fixar */
            .rules-visual-container, #rules-visual-display, #rules-container {
                position: relative !important;
            }
        `;
        document.head.appendChild(style);
        this.stylesInjected = true;
    }

    /**
     * Exibe o overlay de pausa sobre os grupos de monitoramento
     * @param {number} durationMinutes Duração da pausa em minutos
     * @param {Function} onFinish Callback executado quando a pausa termina
     */
    static showOverlay(durationMinutes, onFinish) {
        this.injectStyles();

        // 🔍 Tentar encontrar o container de regras (mesmo usado pelo Cooldown)
        const container = document.querySelector('.rules-visual-container') ||
            document.getElementById('rules-visual-display') ||
            document.getElementById('rules-container');

        if (!container) {
            console.error('❌ [PAUSE] Container de monitoramento não encontrado!');
            return;
        }

        // 🔧 Garantir que o container tenha posição relativa para o overlay absoluto
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        this.forceStop(); // Garantir que não existam duplicados

        // Criar overlay
        const overlay = document.createElement('div');
        overlay.id = 'pause-overlay';
        overlay.className = 'pause-overlay';
        overlay.innerHTML = `
            <div class="pause-icon">⏰</div>
            <div class="pause-title">Tempo de Pausa</div>
            <div id="pause-timer-display" class="pause-countdown">00:00</div>
        `;

        container.appendChild(overlay);

        // Animar entrada
        setTimeout(() => overlay.classList.add('show'), 10);

        // Iniciar countdown
        this.startCountdown(durationMinutes * 60, onFinish);
        this.isPaused = true;
    }

    /**
     * Inicia o cronômetro regressivo
     */
    static startCountdown(secondsLeft, onFinish) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        const updateDisplay = (s) => {
            const display = document.getElementById('pause-timer-display');
            if (!display) return;
            const mins = Math.floor(s / 60);
            const secs = s % 60;
            display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        updateDisplay(secondsLeft);

        this.countdownInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                this.stopPause(onFinish);
            } else {
                updateDisplay(secondsLeft);
            }
        }, 1000);
    }

    /**
     * Finaliza a pausa e remove o overlay
     */
    static stopPause(onFinish) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.isPaused = false;

        const overlay = document.getElementById('pause-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }

        if (typeof onFinish === 'function') {
            onFinish();
        }
    }

    /**
     * Remove a pausa forçadamente (ex: quando o monitoramento é parado)
     */
    static forceStop() {
        this.stopPause();
    }
}

// Tornar global
window.PauseManager = PauseManager;
