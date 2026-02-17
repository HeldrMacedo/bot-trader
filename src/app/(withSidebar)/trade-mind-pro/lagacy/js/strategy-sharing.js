// js/strategy-sharing.js
// Módulo de compartilhamento de estratégias JSON entre usuários

class StrategySharing {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.initAttempts = 0;
        this.maxAttempts = 10;
        this.blacklist = new Set(); // 🛡️ Blacklist local
        this.init();
    }

    init() {
        // Aguardar Firebase estar pronto
        if (typeof getFirestore === 'function') {
            this.db = getFirestore();
            if (this.db) {
                this.getCurrentUser();
              
                return;
            }
        }

        // Tentar novamente se não conseguiu
        this.initAttempts++;
        if (this.initAttempts < this.maxAttempts) {
            console.warn(`⚠️ Firebase não disponível, tentativa ${this.initAttempts}/${this.maxAttempts}...`);
            setTimeout(() => this.init(), 1000);
        } else {
            console.error('❌ Firebase não inicializou após múltiplas tentativas');
        }
    }

    getCurrentUser() {
        // Obter informações do usuário logado na Deriv
        try {
            if (window.accountManager && window.accountManager.currentAccount) {
                const account = window.accountManager.currentAccount;
                this.currentUser = {
                    loginid: account.loginid || 'Anônimo',
                    name: account.name || account.loginid || 'Usuário'
                };
            } else {
                this.currentUser = {
                    loginid: 'guest',
                    name: 'Convidado'
                };
            }
        } catch (error) {
            console.error('Erro ao obter usuário:', error);
            this.currentUser = {
                loginid: 'unknown',
                name: 'Usuário'
            };
        }
    }

    // Validar arquivo JSON
    validateJSON(file) {
        return new Promise((resolve, reject) => {
            // Verificar extensão
            if (!file.name.endsWith('.json')) {
                reject('Apenas arquivos .json são permitidos');
                return;
            }

            // Verificar tamanho (100KB = 102400 bytes)
            if (file.size > 102400) {
                reject('Arquivo muito grande! Máximo: 100KB');
                return;
            }

            // Ler e validar conteúdo JSON
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = JSON.parse(e.target.result);
                    resolve({ file, content });
                } catch (error) {
                    reject('Arquivo JSON inválido');
                }
            };
            reader.onerror = () => reject('Erro ao ler arquivo');
            reader.readAsText(file);
        });
    }

    // Fazer upload de estratégia
    async uploadStrategy(file) {
        try {
            // Validar arquivo
            const { content } = await this.validateJSON(file);

            // Atualizar informações do usuário
            this.getCurrentUser();

            // Sanitizar nome do arquivo
            const sanitizedFileName = file.name
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .substring(0, 100);

            // Criar documento no Firestore
            const strategyData = {
                fileName: sanitizedFileName,
                content: content,
                uploadedBy: this.currentUser.loginid,
                userName: this.currentUser.name,
                uploadDate: firebase.firestore.FieldValue.serverTimestamp(),
                fileSize: file.size,
                downloads: 0
            };

            // Salvar no Firestore
            const docRef = await this.db.collection('strategies').add(strategyData);

           
            return {
                success: true,
                id: docRef.id,
                fileName: sanitizedFileName
            };

        } catch (error) {
            console.error('❌ Erro ao compartilhar estratégia:', error);
            throw error;
        }
    }

    // Listar todas as estratégias
    async listStrategies() {
        try {
            const snapshot = await this.db.collection('strategies')
                .orderBy('uploadDate', 'desc')
                .get();

            await this.fetchBlacklist();

            const strategies = [];
            snapshot.forEach(doc => {
                // 🛡️ FILTER: Ignorar estratégias banidas ou Arquivos Comuns
                if (this.blacklist.has(doc.id)) return;
                if (doc.data().isCommonFile) return; // Ignorar arquivos de download (file-sharing.js)

                strategies.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return strategies;
        } catch (error) {
            console.error('❌ Erro ao listar estratégias:', error);
            throw error;
        }
    }

    // Fazer download de estratégia
    async downloadStrategy(strategyId) {
        try {
            const doc = await this.db.collection('strategies').doc(strategyId).get();

            if (!doc.exists) {
                throw new Error('Estratégia não encontrada');
            }

            const data = doc.data();

            // Incrementar contador de downloads
            await this.db.collection('strategies').doc(strategyId).update({
                downloads: firebase.firestore.FieldValue.increment(1)
            });

            // Criar arquivo para download
            const blob = new Blob([JSON.stringify(data.content, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

       
            return {
                success: true,
                fileName: data.fileName
            };

        } catch (error) {
            console.error('❌ Erro ao fazer download:', error);
            throw error;
        }
    }

    // Deletar estratégia (apenas se for do usuário ou se for ADMIN)
    async deleteStrategy(strategyId) {
        try {
            const doc = await this.db.collection('strategies').doc(strategyId).get();

            if (!doc.exists) {
                throw new Error('Estratégia não encontrada');
            }

            const data = doc.data();

            // Verificar se é Admin
            const isAdmin = typeof UserLevelsManager !== 'undefined' &&
                UserLevelsManager.getCurrentUserLevel() === UserLevelsManager.USER_LEVELS.ADMIN;

            // Verificar se é o dono ou Admin
            if (data.uploadedBy !== this.currentUser.loginid && !isAdmin) {
                throw new Error('Você só pode deletar suas próprias estratégias');
            }

            try {
                await this.db.collection('strategies').doc(strategyId).delete();
            
                return { success: true };
            } catch (deleteError) {
                // 🛡️ FALLBACK: Se Firebase negar (regras de segurança) e for Admin, usar Blacklist
                if (isAdmin) {
                    console.warn('⚠️ Firebase negou delete. Tentando Blacklist (Admin Workaround)...');
                    const adminKey = prompt('🔑 Permissão negada pelo Firebase (Cliente).\n\nDigite a CHAVE ADMIN para executar a DELEÇÃO REAL via servidor:');

                    if (adminKey) {
                        await this.deleteStrategyAdmin(strategyId, adminKey);
                     
                        return { success: true };
                    }
                }
                throw deleteError;
            }

        } catch (error) {
            console.error('❌ Erro ao deletar estratégia:', error);
            throw error;
        }
    }

    // 🛡️ NOVO: Buscar blacklist do servidor
    async fetchBlacklist() {
        try {
            const response = await fetch('/api/strategies/blacklist');

            // 🛡️ Verificação robusta de resposta
            if (!response.ok) {
                // Silenciosamente falhar se endpoint não existir (404) ou erro de servidor
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();

            // 🛡️ Verificação de tipo garantida
            if (data.success && Array.isArray(data.blacklist)) {
                this.blacklist = new Set(data.blacklist);
            } else {
                this.blacklist = new Set();
            }
        } catch (error) {
            // Log discreto para não poluir console do usuário com erros esperados (ex: 404)
            console.debug('⚠️ Blacklist não carregada (usando vazia):', error.message);
            this.blacklist = new Set();
        }
    }

    // 🛡️ NOVO: Deletar estratégia via servidor (Modo Deus)
    async deleteStrategyAdmin(strategyId, adminKey) {
        const response = await fetch('/api/admin/strategies/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ strategyId, adminKey })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
    }

}


// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.strategySharing = new StrategySharing();
   
});
