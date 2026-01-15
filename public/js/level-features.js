
// js/level-features.js
// Gerenciamento de funcionalidades por nível de usuário
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class LevelFeaturesManager {
    // 🎯 Funcionalidades por nível
    static FEATURES = {
        // 🆓 FREE - Funcionalidades básicas
        FREE: {
            maxStrategies: 1,
            maxActiveSymbols: 2,
            advancedIndicators: false,
            customAlerts: false,
            reportExport: false,
            prioritySupport: false,
            autoBackup: false,
            customInterface: false
        },
        
        // 💎 VIP - Funcionalidades premium
        VIP: {
            maxStrategies: 10,
            maxActiveSymbols: 10,
            advancedIndicators: true,
            customAlerts: true,
            reportExport: true,
            prioritySupport: true,
            autoBackup: true,
            customInterface: true
        },
        
        // 👑 ADMIN - Acesso total
        ADMIN: {
            maxStrategies: -1, // Ilimitado
            maxActiveSymbols: -1, // Ilimitado
            advancedIndicators: true,
            customAlerts: true,
            reportExport: true,
            prioritySupport: true,
            autoBackup: true,
            customInterface: true,
            adminPanel: true,
            userManagement: true,
            systemStats: true
        }
    };

    // 🔍 Verificar se usuário tem acesso a funcionalidade
    static hasFeature(featureName) {
        const userLevel = UserLevelsManager.getCurrentUserLevel();
        const features = this.FEATURES[userLevel.toUpperCase()] || this.FEATURES.FREE;
        
        return features[featureName] === true;
    }

    // 📊 Obter limite de funcionalidade
    static getFeatureLimit(featureName) {
        const userLevel = UserLevelsManager.getCurrentUserLevel();
        const features = this.FEATURES[userLevel.toUpperCase()] || this.FEATURES.FREE;
        
        return features[featureName] || 0;
    }

    // 🚫 Mostrar modal de upgrade quando funcionalidade não está disponível
    static showUpgradeModal(featureName, featureDescription) {
        const userLevel = UserLevelsManager.getCurrentUserLevel();
        
        if (userLevel === UserLevelsManager.USER_LEVELS.FREE) {
            const modal = this.createUpgradeModal(featureName, featureDescription);
            document.body.appendChild(modal);
            
            setTimeout(() => {
                modal.querySelector('.upgrade-modal-content').style.transform = 'scale(1)';
                modal.querySelector('.upgrade-modal-content').style.opacity = '1';
            }, 10);
        }
    }

    // 🏗️ Criar modal de upgrade
    static createUpgradeModal(featureName, featureDescription) {
        const modal = document.createElement('div');
        modal.className = 'upgrade-required-modal';
        modal.innerHTML = `
            <div class="upgrade-modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="upgrade-modal-content">
                <div class="upgrade-modal-header">
                    <h3>🔒 Funcionalidade VIP</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="upgrade-modal-body">
                    <div class="feature-locked-icon">🔒</div>
                    <h4>${featureDescription}</h4>
                    <p>Esta funcionalidade está disponível apenas para usuários <strong>VIP</strong>.</p>
                    <div class="vip-benefits-preview">
                        <h5>💎 Com o VIP você terá acesso a:</h5>
                        <ul>
                            <li>🚀 Estratégias avançadas ilimitadas</li>
                            <li>📊 Indicadores técnicos premium</li>
                            <li>🔔 Alertas personalizados</li>
                            <li>📈 Relatórios detalhados</li>
                            <li>💾 Backup automático</li>
                        </ul>
                    </div>
                </div>
                <div class="upgrade-modal-footer">
                    <button class="upgrade-now-btn" onclick="VipPaymentModal.show(); this.parentElement.parentElement.parentElement.remove();">
                        💎 Fazer Upgrade para VIP
                    </button>
                    <button class="maybe-later-btn" onclick="this.parentElement.parentElement.remove()">
                        Talvez depois
                    </button>
                </div>
            </div>
        `;

        // Adicionar estilos se não existirem
        this.addUpgradeModalStyles();

        return modal;
    }

    // 🎨 Adicionar estilos do modal de upgrade
    static addUpgradeModalStyles() {
        if (document.getElementById('upgrade-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'upgrade-modal-styles';
        style.textContent = `
            .upgrade-required-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
            }

            .upgrade-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(3px);
            }

            .upgrade-modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 15px 50px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                opacity: 0;
                transition: all 0.3s ease;
            }

            .upgrade-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 25px;
                border-bottom: 2px solid #f0f0f0;
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                border-radius: 12px 12px 0 0;
            }

            .upgrade-modal-header h3 {
                margin: 0;
                color: #000;
                font-size: 1.3em;
            }

            .upgrade-modal-body {
                padding: 25px;
                text-align: center;
            }

            .feature-locked-icon {
                font-size: 4em;
                margin-bottom: 15px;
                opacity: 0.7;
            }

            .upgrade-modal-body h4 {
                color: #333;
                margin-bottom: 10px;
            }

            .upgrade-modal-body p {
                color: #666;
                margin-bottom: 20px;
                line-height: 1.5;
            }

            .vip-benefits-preview {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }

            .vip-benefits-preview h5 {
                color: #333;
                margin-bottom: 10px;
                text-align: center;
            }

            .vip-benefits-preview ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .vip-benefits-preview li {
                padding: 5px 0;
                font-size: 0.9em;
                color: #555;
            }

            .upgrade-modal-footer {
                padding: 20px 25px;
                border-top: 1px solid #f0f0f0;
                display: flex;
                gap: 10px;
                justify-content: center;
            }

            .upgrade-now-btn {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #000;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                flex: 1;
                transition: all 0.3s ease;
            }

            .upgrade-now-btn:hover {
                background: linear-gradient(135deg, #ffed4e, #ffc107);
                transform: translateY(-1px);
            }

            .maybe-later-btn {
                background: #6c757d;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .maybe-later-btn:hover {
                background: #5a6268;
            }
        `;

        document.head.appendChild(style);
    }

    // 🎯 Aplicar restrições de funcionalidades na interface
    static applyLevelRestrictions() {
        const userLevel = UserLevelsManager.getCurrentUserLevel();
        
        // Esconder/mostrar elementos baseado no nível
        this.toggleElementsByLevel(userLevel);
        
        // Aplicar limitações específicas
        this.applyFeatureLimitations(userLevel);
        
        
    }

    // 👁️ Mostrar/esconder elementos baseado no nível
    static toggleElementsByLevel(userLevel) {
        // Elementos que só VIP+ podem ver
        const vipElements = document.querySelectorAll('[data-level="vip"], [data-level="vip+"]');
        vipElements.forEach(el => {
            if (userLevel === UserLevelsManager.USER_LEVELS.FREE) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });

        // Elementos que só ADMIN pode ver
        const adminElements = document.querySelectorAll('[data-level="admin"]');
        adminElements.forEach(el => {
            if (userLevel !== UserLevelsManager.USER_LEVELS.ADMIN) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });
    }

    // ⚡ Aplicar limitações específicas
    static applyFeatureLimitations(userLevel) {
        const features = this.FEATURES[userLevel.toUpperCase()] || this.FEATURES.FREE;
        
        // Limitar número de estratégias
        if (features.maxStrategies > 0) {
            this.limitStrategies(features.maxStrategies);
        }
        
        // Limitar símbolos ativos
        if (features.maxActiveSymbols > 0) {
            this.limitActiveSymbols(features.maxActiveSymbols);
        }
        
        // Desabilitar indicadores avançados para FREE
        if (!features.advancedIndicators) {
            this.disableAdvancedIndicators();
        }
    }

    // 📊 Limitar número de estratégias
    static limitStrategies(maxStrategies) {
        // Implementar lógica para limitar estratégias
       
    }

    // 📈 Limitar símbolos ativos
    static limitActiveSymbols(maxSymbols) {
        // Implementar lógica para limitar símbolos
       
    }

    // 🔒 Desabilitar indicadores avançados
    static disableAdvancedIndicators() {
        // Implementar lógica para desabilitar indicadores avançados
       
    }

    // 🧪 Função de teste para verificar funcionalidades (somente Admin)
    static testFeatureAccess(featureName) {
        const userLevel = UserLevelsManager.getCurrentUserLevel();
        const hasAccess = this.hasFeature(featureName);
        const limit = this.getFeatureLimit(featureName);
        
              
        if (!hasAccess && userLevel === UserLevelsManager.USER_LEVELS.FREE) {
            this.showUpgradeModal(featureName, `Funcionalidade: ${featureName}`);
        }
        
        return hasAccess;
    }
}

// 🎧 Configurar listeners para nível de usuário
window.addEventListener('userLevelChanged', (event) => {
    const userInfo = event.detail;
     
    // Aplicar restrições baseadas no novo nível
    LevelFeaturesManager.applyLevelRestrictions();
});
