// js/user-levels.js
// Sistema de níveis de usuário com isolamento seguro
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class UserLevelsManager {
    // 🔑 ADMIN IDs - Suas contas da Deriv (proprietário do app)
    static ADMIN_LOGIN_IDS = [
        'CR2691758',  // Sua conta real principal
        'VRTC4540558', // Sua conta virtual
        'CR5996283',   // Sua conta adicional
        'CR3853510'    // Sua conta adicional
    ];

    // 🎯 Níveis de usuário
    static USER_LEVELS = {
        FREE: 'free',
        VIP: 'vip',
        ADMIN: 'admin'
    };

    // Mapas para cache de nível de usuário
    static levelCache = new Map();
    static levelCacheTime = new Map();

    // 🔍 Detectar nível do usuário atual (com verificação de bônus PRIORITÁRIA)
    static getCurrentUserLevel() {
        const currentUser = SessionManager.getCurrentUser();
        const loginId = currentUser?.authorize?.loginid;

        if (!loginId) {
            return this.USER_LEVELS.FREE;
        }

        // 👑 Verificar se é ADMIN primeiro
        if (this.ADMIN_LOGIN_IDS.includes(loginId)) {

            return this.USER_LEVELS.ADMIN;
        }

        // ✅ PRIMEIRO: VERIFICAÇÃO SÍNCRONA DE BÔNUS (ANTES de qualquer coisa)
        const localBonusKey = `welcome_bonus_${loginId}`;
        const hasLocalBonus = localStorage.getItem(localBonusKey) === 'true';


        // ✅ CRÍTICO: Aguardar sincronização do servidor antes de recriar dados
        let vipData = this.getVipData(loginId);

        // ✅ AGUARDAR SINCRONIZAÇÃO: Não recriar dados VIP - deixar o CreditsManager gerenciar


        // ✅ SEGUNDA VERIFICAÇÃO: Se já tem créditos/VIP existente, retornar VIP imediatamente
        if (vipData && this.isVipActive(vipData)) {


            // Salvar no cache
            if (!this.levelCache) this.levelCache = new Map();
            if (!this.levelCacheTime) this.levelCacheTime = new Map();
            this.levelCache.set(`user_level_${loginId}`, this.USER_LEVELS.VIP);
            this.levelCacheTime.set(`user_level_${loginId}`, Date.now());

            return this.USER_LEVELS.VIP;
        }

        // ✅ CORREÇÃO CRÍTICA: Verificar créditos mesmo sem vipData
        // Os créditos estão em user_credits_{loginId}, separado de vip_status_{loginId}
        if (typeof CreditsManager !== 'undefined') {
            try {
                const creditsKey = `user_credits_${loginId}`;
                const creditsDataString = localStorage.getItem(creditsKey);
                if (creditsDataString) {
                    const creditsData = JSON.parse(creditsDataString);
                    if (creditsData && creditsData.credits > 0) {
                        console.log(`✅ [USER LEVEL] Usuário tem ${creditsData.credits} créditos - promovendo para VIP`);

                        // Salvar no cache
                        if (!this.levelCache) this.levelCache = new Map();
                        if (!this.levelCacheTime) this.levelCacheTime = new Map();
                        this.levelCache.set(`user_level_${loginId}`, this.USER_LEVELS.VIP);
                        this.levelCacheTime.set(`user_level_${loginId}`, Date.now());

                        return this.USER_LEVELS.VIP;
                    }
                }
            } catch (error) {
                console.warn('⚠️ [USER LEVEL] Erro ao verificar créditos:', error);
            }
        }

        // 🎁 BÔNUS PROCESSADO DURANTE LOADING: Não fazer verificação assíncrona aqui
        // O AppManager já processou todos os bônus durante a tela de loading


        // 🔧 CACHE: Evitar detecções redundantes durante inicialização
        const cacheKey = `user_level_${loginId}`;
        const cachedLevel = this.levelCache?.get(cacheKey);
        const cacheTime = this.levelCacheTime?.get(cacheKey);
        const now = Date.now();

        // ✅ CORREÇÃO: Cache válido por apenas 1 segundo para detectar mudanças VIP mais rapidamente
        if (cachedLevel && cacheTime && (now - cacheTime) < 1000) {
            return cachedLevel;
        }

        // 💎 VERIFICAÇÃO FINAL: Se chegou até aqui e não tem dados VIP, é FREE

        const detectedLevel = this.USER_LEVELS.FREE;

        // Salvar no cache
        if (!this.levelCache) this.levelCache = new Map();
        if (!this.levelCacheTime) this.levelCacheTime = new Map();
        this.levelCache.set(cacheKey, detectedLevel);
        this.levelCacheTime.set(cacheKey, now);

        return detectedLevel;
    }

    // 💎 Verificar status VIP do usuário
    static getVipData(loginId) {
        if (!loginId) return null;

        // 🔒 SEGURANÇA: Verificar se o usuário atual tem permissão para acessar estes dados VIP
        const currentUser = SessionManager.getCurrentUser();
        if (!currentUser || !currentUser.authorize) {
            console.warn('⚠️ [VIP SECURITY] Nenhum usuário logado - acesso negado aos dados VIP');
            return null;
        }

        const currentLoginId = currentUser.authorize.loginid;

        // ✅ Permitir acesso apenas se:
        // 1. É o próprio usuário
        // 2. É um Admin (pode visualizar qualquer VIP para gerenciamento)
        // 3. São contas relacionadas do mesmo usuário (mesmo prefixo)
        const isOwner = currentLoginId === loginId;
        const isAdmin = this.ADMIN_LOGIN_IDS.includes(currentLoginId);
        const isSameAccountFamily = this.extractAccountBase(currentLoginId) === this.extractAccountBase(loginId);

        if (!isOwner && !isAdmin && !isSameAccountFamily) {
            console.warn(`🔒 [VIP SECURITY] Usuário ${currentLoginId} tentou acessar dados VIP de ${loginId} - ACESSO NEGADO`);
            return null;
        }

        const vipKey = `vip_status_${loginId}`;

        // 🚨 VERIFICAR se dados VIP foram limpos pelo servidor recentemente
        const cleanupFlag = `cleanup_flag_${loginId}`;
        const cleanupData = localStorage.getItem(cleanupFlag);
        if (cleanupData) {
            try {
                const cleanup = JSON.parse(cleanupData);
                const timeSinceCleanup = Date.now() - cleanup.cleanedAt;
                const cleanupValidityPeriod = 10 * 60 * 1000; // 10 minutos

                if (timeSinceCleanup < cleanupValidityPeriod) {

                    return null;
                }

                // Cleanup flag expirado, pode remover
                localStorage.removeItem(cleanupFlag);
            } catch (e) {
                localStorage.removeItem(cleanupFlag);
            }
        }

        // ✅ CRÍTICO: SEMPRE ler dados FRESCOS do localStorage (sem cache)
        const vipDataString = localStorage.getItem(vipKey);

        if (!vipDataString) {

            return null;
        }

        try {
            const parsedData = JSON.parse(vipDataString);

            // ✅ DEBUG: Log dos dados lidos


            // 🚨 CRÍTICO: Se dados vieram do servidor e indicam 0 créditos, remover dados locais antigos
            if (parsedData.serverSourced && parsedData.credits === 0) {
                console.warn(`🧹 [VIP DATA] Servidor confirma 0 créditos - removendo dados VIP locais para ${loginId}`);
                localStorage.removeItem(vipKey);
                return null;
            }

            // ⏰ CRÍTICO: Validar se dados são muito antigos sem confirmação do servidor
            const now = Date.now();
            const lastServerSync = parsedData.lastServerSync || 0;
            const timeSinceSync = now - lastServerSync;
            const maxAgeWithoutSync = 5 * 60 * 1000; // 5 minutos

            // Se dados são antigos E não vieram do servidor, podem ser obsoletos
            if (!parsedData.serverSourced && timeSinceSync > maxAgeWithoutSync) {

                localStorage.removeItem(vipKey);
                return null;
            }

            // ✅ CORREÇÃO CRÍTICA: Validação que ACEITA créditos = 0
            if (!parsedData) {
                console.warn(`❌ [VIP DATA] Dados VIP nulos para ${loginId}`);
                localStorage.removeItem(vipKey); // Limpa dados corrompidos
                return null;
            }

            // Verificar se tem créditos (VIP por créditos) OU data de expiração válida (VIP por tempo)
            const hasCredits = parsedData.credits !== undefined && parsedData.credits > 0; // Mudança: Só aceita créditos > 0
            const hasValidExpiration = parsedData.expiresAt && parsedData.expiresAt !== 'undefined';

            if (!hasCredits && !hasValidExpiration) {
                console.warn(`❌ [VIP DATA] Dados VIP sem créditos válidos nem expiração para ${loginId}`);
                localStorage.removeItem(vipKey); // Limpa dados corrompidos
                return null;
            }

            return parsedData;
        } catch (error) {
            console.error(`❌ [VIP DATA] Erro ao parsear dados VIP para ${loginId}:`, error);
            localStorage.removeItem(vipKey); // Limpa dados inválidos
            return null;
        }
    }

    // 💎 Verificar se o VIP está ativo (incluindo por créditos)
    static isVipActive(vipData) {
        if (!vipData) {
            return false;
        }

        // ✅ NOVO: VIP por créditos (se tem créditos >= 0, é VIP)
        if (vipData.credits !== undefined && vipData.credits >= 0) {

            return true;
        }

        // ✅ VIP por tempo (sistema antigo)
        if (!vipData.expiresAt) {
            return false;
        }

        try {
            const expiresAt = new Date(vipData.expiresAt);
            const now = new Date();
            const isActive = expiresAt > now;


            return isActive;
        } catch (error) {
            console.error(`❌ [VIP STATUS] Erro ao comparar datas de expiração:`, error);
            return false;
        }
    }

    // ⏱️ Deduzir tempo do plano VIP (usado quando VIP usa função IA)
    static deductVipTime(loginId, milliseconds) {
        return new Promise((resolve, reject) => {
            try {
                if (!loginId) {
                    reject(new Error('LoginId é obrigatório'));
                    return;
                }

                const vipData = this.getVipData(loginId);
                if (!vipData || !vipData.expiresAt) {
                    reject(new Error('Dados VIP não encontrados'));
                    return;
                }

                // Verificar se o plano está ativo
                if (!this.isVipActive(vipData)) {
                    reject(new Error('Plano VIP expirado'));
                    return;
                }

                // Deduzir tempo
                const currentExpiry = new Date(vipData.expiresAt);
                const newExpiry = new Date(currentExpiry.getTime() - milliseconds);

                // Atualizar dados VIP
                vipData.expiresAt = newExpiry.toISOString();

                // Salvar de volta no localStorage
                const vipKey = `vip_status_${loginId}`;
                localStorage.setItem(vipKey, JSON.stringify(vipData));

                // Limpar cache de nível de usuário
                this.levelCache?.delete(`user_level_${loginId}`);
                this.levelCacheTime?.delete(`user_level_${loginId}`);



                resolve({
                    success: true,
                    newExpiry: newExpiry,
                    timeDeducted: milliseconds
                });
            } catch (error) {
                console.error('❌ [VIP TIME] Erro ao deduzir tempo:', error);
                reject(error);
            }
        });
    }

    // 💳 Ativar VIP para usuário (versão local - pode ativar para múltiplas contas)
    static activateVip(loginId, plan = 'monthly', activateAllAccounts = true) {
        if (!loginId) {
            console.error('❌ [VIP ACTIVATION] LoginId é obrigatório');
            return false;
        }

        // Verificar se era FREE antes da ativação
        const wasFreeBefore = this.getCurrentUserLevel() === this.USER_LEVELS.FREE;

        const planDurations = {
            'daily': 1,       // 1 dia
            'monthly': 30,    // 1 mês
            'quarterly': 90,  // 3 meses
            'annual': 365     // 1 ano
        };

        const durationDays = planDurations[plan] || 30;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));

        if (activateAllAccounts) {
            // Buscar todas as contas relacionadas no localStorage
            const relatedAccounts = this.findRelatedAccounts(loginId);

            let activatedCount = 0;

            for (const accountId of relatedAccounts) {
                const vipData = {
                    isVip: true,
                    plan: plan,
                    purchaseDate: now.toISOString(),
                    expiresAt: expiresAt.toISOString(),
                    activatedBy: 'payment_system',
                    masterAccount: loginId,
                    groupActivation: true
                };

                const vipKey = `vip_status_${accountId}`;
                localStorage.setItem(vipKey, JSON.stringify(vipData));

                // Limpar cache de nível de usuário
                this.levelCache?.delete(`user_level_${accountId}`);
                this.levelCacheTime?.delete(`user_level_${accountId}`);

                activatedCount++;
            }



        } else {
            // Ativar apenas para a conta específica
            const vipData = {
                isVip: true,
                plan: plan,
                purchaseDate: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                activatedBy: 'payment_system'
            };

            const vipKey = `vip_status_${loginId}`;
            localStorage.setItem(vipKey, JSON.stringify(vipData));

            // Limpar cache de nível de usuário
            this.levelCache?.delete(`user_level_${loginId}`);
            this.levelCacheTime?.delete(`user_level_${loginId}`);
        }

        // Notificar sistema de logs se era FREE e virou VIP
        if (wasFreeBefore && typeof UserConnectionLogger !== 'undefined') {
            const currentUser = SessionManager.getCurrentUser();
            const userEmail = currentUser?.authorize?.email || `${loginId}@noemail.com`;
            UserConnectionLogger.logUserUpgradeToVip(loginId, userEmail, plan);
        }

        return true;
    }

    // 🔍 Encontrar contas relacionadas no localStorage
    static findRelatedAccounts(loginId) {
        const relatedAccounts = new Set([loginId]); // Começar com a conta atual

        // Buscar por contas com mesmo padrão base
        const accountBase = this.extractAccountBase(loginId);

        // Percorrer localStorage procurando por contas VIP relacionadas
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (key && key.startsWith('vip_status_')) {
                const accountId = key.replace('vip_status_', '');
                const currentAccountBase = this.extractAccountBase(accountId);

                // Se encontrar contas com mesmo padrão base, adicionar ao grupo
                if (currentAccountBase === accountBase) {
                    relatedAccounts.add(accountId);
                }
            }
        }

        // Também buscar por tokens salvos (se houver sistema de múltiplas contas)
        const tokenKeys = Object.keys(localStorage).filter(key => key.includes('token_') || key.includes('session_'));

        for (const key of tokenKeys) {
            try {
                const data = JSON.parse(localStorage.getItem(key) || '{}');
                if (data.loginId) {
                    const accountBase = this.extractAccountBase(data.loginId);
                    const currentAccountBase = this.extractAccountBase(loginId);

                    if (accountBase === currentAccountBase) {
                        relatedAccounts.add(data.loginId);
                    }
                }
            } catch (error) {
                // Ignorar erros de parsing
            }
        }

        return Array.from(relatedAccounts);
    }

    // 🔧 Função auxiliar para extrair base da conta
    static extractAccountBase(loginId) {
        if (!loginId) return '';

        // Para contas CR1234567, extrair "CR"
        // Para contas VRTC1234567, extrair "VRTC"
        const match = loginId.match(/^([A-Z]+)/);
        return match ? match[1] : '';
    }

    // 🚫 Desativar VIP para usuário
    static deactivateVip(loginId) {
        if (!loginId) return false;

        const vipKey = `vip_status_${loginId}`;
        localStorage.removeItem(vipKey);


        // Limpar cache de nível de usuário
        this.levelCache?.delete(`user_level_${loginId}`);
        this.levelCacheTime?.delete(`user_level_${loginId}`);

        return true;
    }

    // 🔒 Verificar se usuário tem acesso a funcionalidade
    static hasAccess(feature, requiredLevel = this.USER_LEVELS.FREE) {
        const currentLevel = this.getCurrentUserLevel();

        const levelHierarchy = {
            [this.USER_LEVELS.FREE]: 1,
            [this.USER_LEVELS.VIP]: 2,
            [this.USER_LEVELS.ADMIN]: 3
        };

        const userLevelValue = levelHierarchy[currentLevel] || 1;
        const requiredLevelValue = levelHierarchy[requiredLevel] || 1;

        const hasAccess = userLevelValue >= requiredLevelValue;

        if (!hasAccess) {
            console.warn(`🔒 [ACCESS DENIED] Feature '${feature}' requires ${requiredLevel}, user has ${currentLevel}`);
        }

        return hasAccess;
    }

    // 📊 Obter informações detalhadas do usuário
    static getUserInfo() {
        const currentUser = SessionManager.getCurrentUser();
        if (!currentUser) return null;

        const loginId = currentUser.authorize.loginid;
        const level = this.getCurrentUserLevel();
        const vipStatus = this.getVipData(loginId); // Usar getVipData para obter os dados brutos
        const isVipActiveStatus = this.isVipActive(vipStatus); // Verificar se está ativo

        return {
            loginId: loginId,
            level: level,
            isAdmin: level === this.USER_LEVELS.ADMIN,
            isVip: isVipActiveStatus, // Usar o resultado da verificação de atividade
            isFree: level === this.USER_LEVELS.FREE,
            vipStatus: vipStatus, // Passar os dados brutos para inspeção se necessário
            accountType: currentUser.authorize.account_list?.find(acc => acc.loginid === loginId)?.is_virtual ? 'virtual' : 'real'
        };
    }

    // 🎨 Obter cor do badge do usuário
    static getUserLevelBadge() {
        const level = this.getCurrentUserLevel();

        const badges = {
            [this.USER_LEVELS.FREE]: {
                text: 'FREE',
                color: '#6c757d',
                background: '#f8f9fa',
                icon: '🆓'
            },
            [this.USER_LEVELS.VIP]: {
                text: 'VIP',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
                icon: '💎'
            },
            [this.USER_LEVELS.ADMIN]: {
                text: 'ADMIN',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #dc3545, #fd7e14)',
                icon: '👑'
            }
        };

        return badges[level] || badges[this.USER_LEVELS.FREE];
    }

    // 🔄 Atualizar interface baseada no nível do usuário
    static updateInterfaceForUserLevel() {
        // 🚨 PROTEÇÃO: Não atualizar durante fluxo de inicialização
        const isInitializing = window.AppManager?.isInitialized === false;
        if (isInitializing) {

            return;
        }

        const userInfo = this.getUserInfo();

        if (!userInfo) {
            return;
        }



        // Atualizar badge do usuário
        // ⚠️ CORRIGIDO: Não atualizar badge durante loading
        const loadingScreen = document.getElementById('loading-screen');
        const isLoadingActive = loadingScreen &&
            (loadingScreen.style.display !== 'none' &&
                getComputedStyle(loadingScreen).display !== 'none');

        if (!isLoadingActive) {
            this.updateUserLevelBadge();
        }

        // 🦶 OTIMIZADO: Atualizar rodapé sem forçar re-inicializações desnecessárias
        if (typeof FooterManager !== 'undefined') {
            // Verificar se já está no nível correto para evitar re-inicializações
            const currentFooterLevel = FooterManager.currentLevel;

            if (currentFooterLevel !== userInfo.level) {

                FooterManager.updateFooterForLevel(userInfo.level);
            }
        } else {
            // Fallback para método legado
            this.updateFooterForLevel(userInfo.level);
        }

        // 💎 Botões agora são gerenciados pelo monitoring.js no header
        // Código legado de botões flutuantes removido

        // Disparar evento para outros componentes
        window.dispatchEvent(new CustomEvent('userLevelChanged', {
            detail: userInfo
        }));


    }

    // 🏷️ Atualizar badge do nível do usuário
    static updateUserLevelBadge() {
        // ❌ DESABILITADO: Badge removido do cabeçalho conforme solicitado pelo usuário
        // O badge não deve mais aparecer no topo da página

        // Remover badge existente se houver
        const existingBadge = document.querySelector('.user-level-container');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Não criar novo badge - função desabilitada
        return;
    }

    // 🎯 Destacar nível atual no dropdown
    static highlightCurrentLevel() {
        const currentLevel = this.getCurrentUserLevel();
        const floatingDropdown = document.getElementById('floating-level-dropdown');

        if (!floatingDropdown) return;

        const levelItems = floatingDropdown.querySelectorAll('.level-item');

        // Mapear nível atual para data-level
        const levelToDataMap = {
            [this.USER_LEVELS.FREE]: 'free',
            [this.USER_LEVELS.VIP]: 'vip',
            [this.USER_LEVELS.ADMIN]: 'admin'
        };

        const currentDataLevel = levelToDataMap[currentLevel];

        levelItems.forEach(item => {
            item.classList.remove('current');
            if (item.dataset.level === currentDataLevel) {
                item.classList.add('current');
            }
        });
    }

    // 🔄 Alternar para um nível específico (apenas Admin pode fazer isso)
    static switchToLevel(targetLevel) {
        const currentUser = SessionManager.getCurrentUser();
        const isOriginalAdmin = currentUser && this.ADMIN_LOGIN_IDS.includes(currentUser.authorize?.loginid);

        // Verificar se é Admin original
        if (!isOriginalAdmin) {
            console.warn('🔒 [LEVEL SWITCH] Apenas Admin pode alternar níveis');
            return;
        }

        // Mapear níveis
        const levelMap = {
            'free': this.USER_LEVELS.FREE,
            'vip': this.USER_LEVELS.VIP,
            'admin': this.USER_LEVELS.ADMIN
        };

        const newLevel = levelMap[targetLevel];
        if (!newLevel) {
            console.error('❌ [LEVEL SWITCH] Nível inválido:', targetLevel);
            return;
        }


        // Salvar ou remover modo temporário do Admin
        if (newLevel === this.USER_LEVELS.ADMIN) {
            localStorage.removeItem('admin_temp_level');
        } else {
            localStorage.setItem('admin_temp_level', newLevel);
        }

        // Atualizar interface
        this.updateInterfaceForUserLevel();

        // Notificar outros componentes
        window.dispatchEvent(new CustomEvent('adminLevelChanged', {
            detail: {
                originalLevel: this.USER_LEVELS.ADMIN,
                tempLevel: newLevel,
                isTemporary: newLevel !== this.USER_LEVELS.ADMIN
            }
        }));
    }

    // 🔄 Resetar modo temporário do Admin
    static resetAdminTempLevel() {
        const currentUser = SessionManager.getCurrentUser();
        const isOriginalAdmin = currentUser && this.ADMIN_LOGIN_IDS.includes(currentUser.authorize?.loginid);

        if (isOriginalAdmin) {
            localStorage.removeItem('admin_temp_level');

            this.updateInterfaceForUserLevel();
        }
    }

    // 🔍 Obter nível atual considerando modo temporário do Admin (redefinição da função original para incluir cache e admin_temp_level)
    static getCurrentUserLevel() {
        const currentUser = SessionManager.getCurrentUser();
        if (!currentUser || !currentUser.authorize) {
            return this.USER_LEVELS.FREE;
        }

        const loginId = currentUser.authorize.loginid;

        // 👑 Verificar se é ADMIN (proprietário)
        if (this.ADMIN_LOGIN_IDS.includes(loginId)) {
            // Verificar se Admin está em modo temporário
            const tempLevel = localStorage.getItem('admin_temp_level');
            if (tempLevel && [this.USER_LEVELS.FREE, this.USER_LEVELS.VIP, this.USER_LEVELS.ADMIN].includes(tempLevel)) {
                return tempLevel;
            }
            return this.USER_LEVELS.ADMIN;
        }

        // 💎 Verificar se é VIP (assinante) - Reutilizando a lógica de cache aqui
        const cacheKey = `user_level_${loginId}`;
        const cachedLevel = this.levelCache?.get(cacheKey);
        const cacheTime = this.levelCacheTime?.get(cacheKey);
        const now = Date.now();

        // ⚡ REDUZIR tempo de cache para 5 segundos para detectar mudanças VIP mais rapidamente
        if (cachedLevel && cacheTime && (now - cacheTime) < 5000) {
            return cachedLevel;
        }

        // Detectar nível VIP ou FREE se não for Admin
        const vipStatus = this.getVipData(loginId);
        const isVipActiveStatus = this.isVipActive(vipStatus);

        let detectedLevel = this.USER_LEVELS.FREE; // Padrão

        if (isVipActiveStatus) {

            detectedLevel = this.USER_LEVELS.VIP;
        } else {

            detectedLevel = this.USER_LEVELS.FREE;
        }

        // Salvar no cache se não for Admin (Admin já tem seu próprio cache de nível)
        if (!this.levelCache) this.levelCache = new Map();
        if (!this.levelCacheTime) this.levelCacheTime = new Map();
        this.levelCache.set(cacheKey, detectedLevel);
        this.levelCacheTime.set(cacheKey, now);

        return detectedLevel;
    }

    // 🦶 Atualizar rodapé baseado no nível do usuário
    static updateFooterForLevel(level) {

    }



    // ✅ BOTÃO IA é criado apenas pelo VipFooter.addFloatingIAButton() após loading completo
    // 📋 Função para mostrar a lista de assinantes
    static showSubscribersList() {
        // Criar o modal de lista de assinantes
        const modal = document.createElement('div');
        modal.id = 'subscribers-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: #fff;
            padding: 30px;
            border-radius: 10px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        `;

        const modalHeader = document.createElement('h2');
        modalHeader.textContent = 'Lista de Assinantes VIP';
        modalHeader.style.cssText = `
            margin-top: 0;
            color: #333;
            text-align: center;
            margin-bottom: 20px;
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Fechar';
        closeButton.style.cssText = `
            background-color: #dc3545;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            float: right;
            margin-bottom: 20px;
        `;
        closeButton.onclick = () => document.body.removeChild(modal);

        const subscribersList = document.createElement('ul');
        subscribersList.id = 'subscribers-list';
        subscribersList.style.cssText = `
            list-style: none;
            padding: 0;
            margin: 0;
        `;

        // Obter a lista de assinantes do localStorage
        const subscribers = this.getAllSubscribers();

        if (subscribers.length === 0) {
            const noSubscribersMessage = document.createElement('p');
            noSubscribersMessage.textContent = 'Nenhum assinante encontrado.';
            noSubscribersMessage.style.textAlign = 'center';
            subscribersList.appendChild(noSubscribersMessage);
        } else {
            subscribers.forEach(sub => {
                const listItem = document.createElement('li');
                listItem.style.cssText = `
                    padding: 12px 0;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;

                const emailSpan = document.createElement('span');
                emailSpan.textContent = sub.email;
                emailSpan.style.fontWeight = 'bold';

                const expirySpan = document.createElement('span');
                expirySpan.textContent = `Expira em: ${sub.expiresInHours} horas`;
                expirySpan.style.color = '#6c757d';

                listItem.appendChild(emailSpan);
                listItem.appendChild(expirySpan);
                subscribersList.appendChild(listItem);
            });
        }

        modalContent.appendChild(modalHeader);
        modalContent.appendChild(closeButton);
        modalContent.appendChild(subscribersList);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    // 📋 Função para obter todos os assinantes do localStorage
    static getAllSubscribers() {
        const subscribers = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('vip_status_')) {
                try {
                    const vipData = JSON.parse(localStorage.getItem(key));
                    if (vipData && vipData.email && vipData.expiresAt) {
                        const expiresAt = new Date(vipData.expiresAt);
                        const now = new Date();
                        const expiresInMs = expiresAt.getTime() - now.getTime();
                        const expiresInHours = Math.max(0, Math.ceil(expiresInMs / (1000 * 60 * 60))); // Garantir que não seja negativo

                        // Adicionar apenas assinantes VIP ativos ou com expiração futura
                        if (vipData.isVip && expiresInHours > 0) {
                            subscribers.push({
                                email: vipData.email,
                                expiresAt: vipData.expiresAt,
                                expiresInHours: expiresInHours
                            });
                        }
                    }
                } catch (error) {
                    console.error(`❌ Erro ao processar dados de assinante para a chave ${key}:`, error);
                }
            }
        }

        // Ordenar por data de expiração (mais próximos primeiro)
        subscribers.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

        return subscribers;
    }

    // 💳 Adicionar campo de email para pagamento manual (exemplo de integração)
    // Esta função seria chamada quando um pagamento manual é iniciado.
    // Ela adicionaria um campo de input para o email do cliente.
    static addManualPaymentEmailField() {
        // Exemplo: Suponha que exista um modal de pagamento manual
        const manualPaymentModal = document.getElementById('manual-payment-modal'); // ID fictício
        if (manualPaymentModal) {
            const emailInputGroup = document.createElement('div');
            emailInputGroup.className = 'form-group';
            emailInputGroup.innerHTML = `
                <label for="manual-payment-email">Email do Assinante:</label>
                <input type="email" id="manual-payment-email" name="email" required>
            `;
            // Inserir o campo no local apropriado do modal
            manualPaymentModal.querySelector('.modal-body').prepend(emailInputGroup); // Exemplo de inserção
        } else {
            console.warn("Modal de pagamento manual não encontrado para adicionar campo de email.");
        }
    }

    // 💳 Salvar email do assinante durante pagamento manual (exemplo)
    // Esta função seria chamada APÓS o admin preencher o campo e confirmar o pagamento.
    static saveSubscriberEmailFromManualPayment(email) {
        if (!email) {
            console.error("Email é obrigatório para salvar como assinante.");
            return false;
        }

        // Aqui você ativaria o plano VIP para o usuário e salvaria o email.
        // Por exemplo, se você tem um `loginId` associado ao pagamento manual:
        // const loginId = getLoginIdFromManualPayment(); // Função fictícia
        // const vipData = { email: email, ... }; // Dados a serem salvos no localStorage
        // localStorage.setItem(`vip_status_${loginId}`, JSON.stringify(vipData));


        // Implementar lógica real de salvamento aqui.
        // Por exemplo, usar `this.activateVip` com o email e um `loginId` associado.
        // Se for um pagamento manual sem loginId direto, pode ser necessário
        // um mapeamento ou um item separado no localStorage para emails de "assinantes pendentes".
        return true;
    }


    // 🔧 NOVO: Método separado para criar o elemento do badge
    static createBadgeElement() {
        // Remover badge existente se houver
        const existingBadge = document.getElementById('user-level-badge-container');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Determinar nível e estilo
        const userLevel = this.getCurrentUserLevel();
        let badgeConfig = {
            text: 'FREE',
            gradient: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
            textColor: '#ffffff'
        };

        if (userLevel === 'VIP') {
            badgeConfig = {
                text: 'VIP',
                gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                textColor: '#000000'
            };
        } else if (userLevel === 'ADMIN') {
            badgeConfig = {
                text: 'ADMIN',
                gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                textColor: '#ffffff'
            };
        }

        // Criar container do badge
        const badgeContainer = document.createElement('div');
        badgeContainer.id = 'user-level-badge-container';
        badgeContainer.className = 'user-level-container';

        // HTML do badge
        badgeContainer.innerHTML = `
            <div class="user-level-badge" style="
                background: ${badgeConfig.gradient};
                color: ${badgeConfig.textColor};
            ">
                ${badgeConfig.text}
            </div>
        `;

        document.body.appendChild(badgeContainer);
    }

    // 🔐 Atualizar informações do usuário
    static updateUserInfo(userData) {
        // Primeiro salvar os dados
        SessionManager.saveUserData(userData);

        // Obter informações mais recentes
        const userInfo = this.getUserInfo();

        // 🏷️ CORRIGIDO: Não atualizar badge se loading ainda estiver ativo
        const loadingScreen = document.getElementById('loading-screen');
        const isLoadingActive = loadingScreen &&
            (loadingScreen.style.display !== 'none' &&
                getComputedStyle(loadingScreen).display !== 'none');

        if (!isLoadingActive) {
            this.updateUserLevelBadge();
        }

        // 📊 Disparar evento de mudança de nível de usuário
        window.dispatchEvent(new CustomEvent('userLevelChanged', {
            detail: userInfo
        }));

    }
}