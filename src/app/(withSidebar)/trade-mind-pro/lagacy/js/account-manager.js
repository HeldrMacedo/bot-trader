// js/account-manager.js
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO
class AccountManager {
    // ✅ NOVO: Método para atualizar apenas os dados da conta sem reload completo
    static async updateAccountDataOnly(loginid, token) {
        let updateSuccess = false;
        let localApiInstance = null;

        try {
            // 1. Obter instância da API (global ou criar nova se necessário)
            let apiToUse = window.AppManager?.apiInstance;

            if (!apiToUse) {
                // ✅ AGUARDAR AppManager estar pronto antes de criar instância temporária
                let waitAttempts = 0;
                while (!window.AppManager?.apiInstance && waitAttempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    waitAttempts++;
                    apiToUse = window.AppManager?.apiInstance;
                }

                if (!apiToUse) {
                    console.warn('⚠️ [ACCOUNT UPDATE] API global não disponível após aguardar, criando instância temporária...');
                    // Tentar recuperar DerivAPI
                    if (typeof DerivAPI !== 'undefined') {
                        localApiInstance = new DerivAPI();
                        apiToUse = localApiInstance;
                    } else {
                        throw new Error('DerivAPI não definida - impossível conectar');
                    }
                }
            }

            // 1b. Buscar novos dados da conta via API
            const freshAccountData = await apiToUse.getUserAccountData(token);

            if (freshAccountData && freshAccountData.authorize) {
                const newLoginId = freshAccountData.authorize.loginid;

                // 2. Salvar novos dados da conta
                SessionManager.saveUserData(freshAccountData);

                // 🔍 DEBUG: Verificar estado antes da promoção
             

                // ✅ CRÍTICO: Se criamos uma instância local, promovê-la a GLOBAL
                if (localApiInstance) {
                    // Garantir que AppManager existe (fallback se necessário)
                    if (!window.AppManager) {
                        console.warn('⚠️ [ACCOUNT DEBUG] AppManager global não encontrado! Recriando namespace...');
                        window.AppManager = {};
                    }

                    console.log('🔄 [ACCOUNT UPDATE] Promovendo API temporária para Global...');
                    window.AppManager.apiInstance = localApiInstance;

                    // Notificar o sistema que a API voltou
                    window.dispatchEvent(new CustomEvent('AppManagerReady', {
                        detail: { apiInstance: localApiInstance }
                    }));

                    // Impedir que o finally desconecte esta instância
                    localApiInstance = null;
                }

                // 3. ✅ Atualizar dados da conta no footer
                if (typeof FooterManager !== 'undefined') {
                    FooterManager.updateAccountBalance();
                    FooterManager.forceUpdateDropdown(newLoginId);
                }

                // 4. ✅ OTIMIZADO: Atualizar apenas saldo no TradeManager
                if (window.tradeManager && typeof window.tradeManager.updateAccountBalance === 'function') {
                    await window.tradeManager.updateAccountBalance();
                }

                // 5. Disparar eventos para componentes se atualizarem
                window.dispatchEvent(new CustomEvent('accountSwitched', {
                    detail: {
                        loginid,
                        accountData: freshAccountData
                    }
                }));

                updateSuccess = true;

            } else {
                throw new Error('Dados da conta inválidos recebidos da API');
            }

        } catch (error) {
            console.error(`❌ [ACCOUNT UPDATE] Erro ao atualizar dados da conta:`, error);
            updateSuccess = false;
            throw error; // Re-throw para switchAccount capturar

        } finally {
            // Limpar instância local se foi criada E NÃO FOI PROMOVIDA
            if (localApiInstance) {
                try {
                    console.warn('⚠️ [ACCOUNT UPDATE] Desconectando API temporária (não promovida)...');
                    localApiInstance.disconnect();
                } catch (e) {
                    console.warn('Erro ao desconectar API temporária:', e);
                }
            }

            // 🔒 CRÍTICO: SEMPRE limpar overlay, mesmo em caso de erro
            // Usar setTimeout para garantir que a UI processe antes
            setTimeout(() => {
                if (typeof AppManager !== 'undefined') {
                    if (typeof AppManager.hideAccountSwitchLoading === 'function') {
                        AppManager.hideAccountSwitchLoading(updateSuccess);
                    }
                    if (typeof AppManager.unblurFloatingComponents === 'function') {
                        AppManager.unblurFloatingComponents();
                    }
                }
            }, 150); // 150ms para garantir processamento da UI
        }
    }

    // ✅ OTIMIZADO: Troca de conta simples - apenas atualizar dados da conta
    static async clearAccountSpecificDisplays() {
        // Método mantido para compatibilidade
    }

    static async switchAccount(loginid) {
        if (!loginid) {
            console.error("ID de login inválido.");
            return;
        }

        // 🔒 CRÍTICO: Bloquear TODAS as atualizações de balance durante troca
        window.accountSwitchInProgress = true;

        // 🎯 USAR TOKEN CORRETO: Buscar token salvo no localStorage, não da lista de contas
        const savedToken = SessionManager.getTokenByLoginId(loginid);

        if (!savedToken) {
            console.error(`❌[ACCOUNT SWITCH] Token não encontrado para conta: ${loginid}`);
            console.error(`Tokens devem estar salvos no localStorage. Verificando...`);

            // Listar todos os tokens salvos para debug
            const allKeys = Object.keys(localStorage);
            const tokenKeys = allKeys.filter(key => key.startsWith('token_'));

            window.accountSwitchInProgress = false; // Liberar flag
            return;
        }

        // 🔐 Atualizar current_user_loginid para a nova conta
        SessionManager.setCurrentUserLoginId(loginid);

        // 🔒 CRÍTICO: Bloquear trades ANTES de trocar token (previne race conditions)
        if (window.tradeManager && typeof window.tradeManager.beginAccountSwitch === 'function') {
            window.tradeManager.beginAccountSwitch();
        }

        try {
            // 🔄 Armazenar o token da nova conta como token ativo
            SessionManager.saveLocalToken(savedToken);

            // ✅ CORREÇÃO: Atualização seletiva em vez de reload da página inteira
            await this.updateAccountDataOnly(loginid, savedToken);

            // ✅ Overlay é removido automaticamente no finally do updateAccountDataOnly

        } catch (error) {
            console.error('❌ [ACCOUNT SWITCH] Erro durante troca de conta:', error);

            // 🧹 Garantir limpeza do overlay em caso de erro (backup)
            setTimeout(() => {
                if (typeof AppManager !== 'undefined') {
                    if (typeof AppManager.hideAccountSwitchLoading === 'function') {
                        AppManager.hideAccountSwitchLoading(false);
                    }
                    if (typeof AppManager.unblurFloatingComponents === 'function') {
                        AppManager.unblurFloatingComponents();
                    }
                }
            }, 200);

            throw error; // Re-throw para o finally pegar
        } finally {
            // 🔓 CRÍTICO: Liberar flag de switch SEMPRE
            window.accountSwitchInProgress = false;

            // 🔓 CRÍTICO: Liberar trades SEMPRE (mesmo se houver erro)
            // Garante que sistema não fique bloqueado permanentemente
            if (window.tradeManager && typeof window.tradeManager.endAccountSwitch === 'function') {
                window.tradeManager.endAccountSwitch();
            }
        }
    }
}
