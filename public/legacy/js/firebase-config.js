// js/firebase-config.js
// Configuração do Firebase para o DerivBot

const firebaseConfig = {
    apiKey: "AIzaSyDWHQNHKoMzPKgetp_hn0ych7x6X3-FIF0",
    authDomain: "strategyfree-9bb82.firebaseapp.com",
    projectId: "strategyfree-9bb82",
    storageBucket: "strategyfree-9bb82.firebasestorage.app",
    messagingSenderId: "636243038084",
    appId: "1:636243038084:web:a4f75d27bb8cd7d008d7d1"
};

// Variáveis globais para Firebase
let firebaseApp = null;
let firestoreDb = null;
let initAttempts = 0;
const maxAttempts = 20; // Aumentado para 20 tentativas

// Inicializar Firebase quando o script carregar
function initializeFirebase() {
    try {
      
        // Verificar se Firebase está disponível
        if (typeof firebase === 'undefined') {
            console.warn('⚠️ Firebase SDK ainda não carregado, aguardando...');
            initAttempts++;
            if (initAttempts < maxAttempts) {
                setTimeout(initializeFirebase, 500); // Tentar a cada 500ms
            } else {
                console.error('❌ Firebase SDK não carregou após múltiplas tentativas!');
                console.error('Verifique se os scripts do Firebase estão carregando corretamente.');
            }
            return false;
        }

        // Verificar se já foi inicializado (Verificação robusta)
        if (firebase.apps.length > 0) {
         
            firebaseApp = firebase.app(); // Usa o app padrão
        } else {
            // Inicializar Firebase App
         
            firebaseApp = firebase.initializeApp(firebaseConfig);
        }

        // Inicializar Firestore se ainda não estiver (idempotente)
        if (!firestoreDb) {
          
            firestoreDb = firebase.firestore();
        }

        // Pré-inicializar Storage aqui também para garantir
        if (!firebaseStorage && firebaseApp) {
            firebaseStorage = firebase.storage();
        }

        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        console.error('Detalhes:', error.message);

        // Tentativa de recuperação para erro "default app already exists"
        if (error.code === 'app/duplicate-app' || error.message.includes('default')) {
        
            try {
                firebaseApp = firebase.app();
                firestoreDb = firebase.firestore();
                firebaseStorage = firebase.storage();
                return true;
            } catch (recError) {
                console.error('❌ Falha na recuperação fatal:', recError);
            }
        }
        return false;
    }
}

// Função para obter instância do Firestore
function getFirestore() {
    if (!firestoreDb) {
        console.warn('⚠️ Firestore não inicializado ainda');
        return null;
    }
    return firestoreDb;
}

// Variável para Storage
let firebaseStorage = null;

function getStorage() {
    if (!firebaseStorage) {
        if (firebaseApp) {
            firebaseStorage = firebase.storage();
        } else if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            // Tentar recuperar do app padrão se a variável local estiver nula
            firebaseApp = firebase.app();
            firebaseStorage = firebase.storage();
        } else {
            console.warn('⚠️ Firebase App não inicializado ainda');
            return null;
        }
    }
    return firebaseStorage;
}

// Exportar para uso global
window.getFirestore = getFirestore;
window.getStorage = getStorage;
window.initializeFirebase = initializeFirebase;
window.firebaseReady = false;

// Tentar inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
       
        initializeFirebase();
    });
} else {
  
    initializeFirebase();
}

// Também tentar quando a janela carregar completamente
window.addEventListener('load', () => {
    if (!firebaseApp || !firestoreDb) {
      
        initializeFirebase();
    } else {
        window.firebaseReady = true;
      
    }
});
