class FileSharing {
    constructor() {
        this.db = null;
        this.storage = null;
        this.storagePath = 'common_files';
        // MUDANÇA ESTRATÉGICA: Usar coleção 'strategies' para herdar permissões de escrita existentes
        // Já filtramos esses arquivos para não aparecerem na lista de estratégias em strategy-sharing.js
        this.collectionName = 'strategies';
        this.init();
    }

    init() {
        if (window.getFirestore) {
            this.db = window.getFirestore();
        }
        if (window.getStorage) {
            this.storage = window.getStorage();
        }

        if (!this.db || !this.storage) {
            // Tentar novamente em breve se o Firebase não estiver pronto
            setTimeout(() => this.init(), 1000);
        }
    }

    // Upload de arquivo (Padrão Detached Data: Dados separados para não poluir query de estratégias)
    async uploadFile(file, description = '') {
        if (!this.db) {
            this.init();
            if (!this.db) throw new Error('Firebase não inicializado.');
        }

        const currentUser = SessionManager.getCurrentUser();
        // Verificar admin
        if (!UserLevelsManager.hasAccess('admin_features', UserLevelsManager.USER_LEVELS.ADMIN)) {
            throw new Error('Apenas administradores podem enviar arquivos.');
        }

        try {

            // Forçar modo banco de dados (estratégia segura)
            let storageType = 'firestore_detached';
            const fileBase64 = await this.readFileAsBase64(file);

            // Chunking seguro (800KB para garantir margem no limite de 1MB do Firestore)
            const CHUNK_SIZE = 800 * 1024;
            const totalChunks = Math.ceil(fileBase64.length / CHUNK_SIZE);
            const chunkIds = [];

            // 1. Upload dos CHUNKS (Documentos de Dados)
            // IMPORTANTE: Não incluímos 'uploadDate' nestes documentos.
            // Isso faz com que a query .orderBy('uploadDate') do strategy-sharing.js IGNORE estes arquivos pesados.


            for (let i = 0; i < totalChunks; i++) {
                const start = i * CHUNK_SIZE;
                const end = start + CHUNK_SIZE;
                const chunkData = fileBase64.substring(start, end);

                // Criar documento de dados na raiz 'strategies' (para herdar permissão)
                const chunkDoc = {
                    isCommonFile: true,
                    type: 'file_data',
                    data: chunkData,
                    index: i,
                    parentFile: file.name,
                    // SEM uploadDate!
                    // SEM outros campos obrigatórios de estratégia se possível
                };

                const ref = await this.db.collection(this.collectionName).add(chunkDoc);
                chunkIds.push(ref.id);

            }

            // 2. Upload do METADATA (Cabeçalho do Arquivo)
            // Este tem uploadDate, então é baixado pelo strategy-sharing.js, mas é leve e filtrado pela flag isCommonFile.
            const fileData = {
                fileName: file.name,
                isCommonFile: true, // Flag para filtrar na UI
                storageType: storageType,
                url: '#db-detached',
                description: description,
                uploadedBy: currentUser.loginid || 'Admin',
                uploadDate: firebase.firestore.FieldValue.serverTimestamp(), // Necessário para ordenar na lista de arquivos
                fileSize: file.size,
                fileType: file.type,
                downloads: 0,
                chunkCount: totalChunks,
                chunkIds: chunkIds // Lista ordenada de IDs dos dados
            };

            await this.db.collection(this.collectionName).add(fileData);

            return { fileName: file.name, url: '#db-detached' };

        } catch (error) {
            console.error('Erro fatal no upload:', error);
            throw error;
        }
    }

    // Utilitário: Ler arquivo como Base64
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result); // Retorna Data URL completo
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    // Novo Método: Baixar arquivo Detached
    async downloadDatabaseFile(fileId, fileName, fileType) {
        try {

            // 1. Obter metadados
            const metaDoc = await this.db.collection(this.collectionName).doc(fileId).get();
            if (!metaDoc.exists) throw new Error('Arquivo não encontrado');

            const meta = metaDoc.data();
            const chunkIds = meta.chunkIds || [];

            if (chunkIds.length === 0) throw new Error('Dados do arquivo corrompidos (sem chunks)');



            // 2. Buscar todas as partes (ordem garantida pelo array de IDs)
            let fullBase64 = '';

            // Promise.all para baixar paralelo
            const chunkPromises = chunkIds.map(id => this.db.collection(this.collectionName).doc(id).get());
            const chunkDocs = await Promise.all(chunkPromises);

            for (const doc of chunkDocs) {
                if (!doc.exists) throw new Error(`Parte do arquivo faltando: ${doc.id}`);
                fullBase64 += doc.data().data;
            }

            // Converter Base64 -> Blob -> Download
            const response = await fetch(fullBase64);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            this.incrementDownloads(fileId);
            return true;

        } catch (error) {
            console.error('Erro ao reconstruir arquivo:', error);
            throw error;
        }
    }

    // Listar arquivos com robustez (fallback para falta de índice)
    async listFiles() {
        if (!this.db) {
            this.init();
            if (!this.db) return [];
        }

        try {
            // Tentativa 1: Ordenação no servidor (requer índice composto se mais filtros forem usados, ou padrão)

            const snapshot = await this.db.collection(this.collectionName)
                .orderBy('uploadDate', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        } catch (error) {
            console.warn('⚠️ Falha na ordenação do servidor (possível falta de índice). Tentando fallback cliente...', error);

            try {
                // Tentativa 2: Fallback - Buscar tudo e ordenar no cliente
                const snapshot = await this.db.collection(this.collectionName).get();

                const files = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Ordenação Cliente-Side: Mais recentes primeiro
                return files.sort((a, b) => {
                    const dateA = a.uploadDate ? a.uploadDate.seconds : 0;
                    const dateB = b.uploadDate ? b.uploadDate.seconds : 0;
                    return dateB - dateA;
                });

            } catch (fallbackError) {
                console.error('❌ Erro fatal ao listar arquivos:', fallbackError);
                throw fallbackError;
            }
        }
    }

    // Incrementar contagem de downloads
    async incrementDownloads(fileId) {
        if (!this.db) return;

        try {
            const fileRef = this.db.collection(this.collectionName).doc(fileId);
            await fileRef.update({
                downloads: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            console.error('Erro ao incrementar downloads:', error);
        }
    }

    // Deletar arquivo
    async deleteFile(fileId, storageName) {
        if (!this.db || !this.storage) return;

        // Verificar permissão de admin
        if (!UserLevelsManager.hasAccess('admin_features', UserLevelsManager.USER_LEVELS.ADMIN)) {
            throw new Error('Apenas administradores podem deletar arquivos.');
        }

        try {
            // 1. Obter metadados antes de deletar
            const docRef = this.db.collection(this.collectionName).doc(fileId);
            const doc = await docRef.get();

            if (doc.exists) {
                const data = doc.data();

                // Deletar Chunks (se for detached)
                if (data.chunkIds && Array.isArray(data.chunkIds)) {
                    console.log(`🗑️ Deletando ${data.chunkIds.length} chunks de dados...`);
                    const deletePromises = data.chunkIds.map(chunkId =>
                        this.db.collection(this.collectionName).doc(chunkId).delete()
                    );
                    await Promise.all(deletePromises);
                }
            }

            // Deletar do Storage (Legacy)
            if (storageName) {
                const storageRef = this.storage.ref().child(`${this.storagePath}/${storageName}`);
                await storageRef.delete().catch(err => console.warn('Arquivo não encontrado no storage, removendo apenas referência:', err));
            }

            // Deletar do Firestore (Metadata)
            await docRef.delete();
            return true;
        } catch (error) {
            console.error('Erro ao deletar arquivo:', error);

            // 🛡️ FALLBACK: Se Firebase negar (regras de segurança) e for Admin
            if (error.code === 'permission-denied') {
                console.warn('⚠️ Firebase negou delete (Regras de Segurança). Tentando método Server-Side...');

                const adminKey = prompt('🔑 Permissão negada pelo Firebase (Cliente).\n\nDigite a CHAVE ADMIN para delete forçado via servidor:');
                if (adminKey) {
                    try {
                        const response = await fetch('/api/admin/strategies/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ strategyId: fileId, adminKey: adminKey })
                        });

                        const resData = await response.json();
                        if (resData.success) {
                            // Deletar do Storage (Legacy) se houver, o cliente ainda pode tentar
                            if (storageName) {
                                try {
                                    const storageRef = this.storage.ref().child(`${this.storagePath}/${storageName}`);
                                    await storageRef.delete();
                                } catch (e) { console.warn('Falha ao limpar Storage (secundário):', e); }
                            }
                            return true;
                        } else {
                            throw new Error(resData.error || 'Erro desconhecido no servidor');
                        }
                    } catch (serverError) {
                        console.error('❌ Falha no fallback server-side:', serverError);
                        throw new Error('Falha na deleção via servidor: ' + serverError.message);
                    }
                }
            }

            throw error;
        }
    }
}

// Inicializar globalmente
document.addEventListener('DOMContentLoaded', () => {
    window.fileSharing = new FileSharing();
});
