import * as tf from '@tensorflow/tfjs';

export class MLInitializer {
  static async initialize() {
    console.log('🚀 Inicializando TensorFlow.js...');
    
    try {
      // 1. Verificar se WebGL está disponível
      const backend = await tf.setBackend('webgl');
      if (!backend) {
        console.warn('⚠️ WebGL não disponível. Usando CPU backend.');
        await tf.setBackend('cpu');
      }
      
      // 2. Verificar memória
      const memoryInfo = tf.memory();
      console.log(`💾 Memória TF.js: ${memoryInfo.numBytes} bytes`);
      
      // 3. Limpar modelos antigos se necessário
      await this.clearOldIndexedDB();
      
      console.log('✅ TensorFlow.js inicializado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro na inicialização do TensorFlow:', error);
      return false;
    }
  }

  static async clearOldIndexedDB() {
    if (typeof window === 'undefined') return;
    
    try {
      const databases = await window.indexedDB.databases();
      const tfjsDbs = databases.filter(db => 
        db.name && db.name.includes('tensorflowjs')
      );
      
      for (const db of tfjsDbs) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
          console.log(`🗑️ Limpando banco de dados: ${db.name}`);
        }
      }
      
      return true;
    } catch (error) {
      console.warn('⚠️ Não foi possível limpar IndexedDB:', error);
      return false;
    }
  }

  static async checkCompatibility() {
  try {
    await tf.ready(); // Garante que TF está pronto
    
    const checks = {
      webgl: tf.getBackend() === 'webgl',
      memory: tf.memory().numBytes < 100000000,
      backendAvailable: tf.getBackend() !== null,
      features: {
        hasWebGL: tf.engine().backendNames().includes('webgl'),
        hasCPU: tf.engine().backendNames().includes('cpu'),
      }
    };
    
    console.log('🔍 Verificando compatibilidade:', checks);
    return checks;
  } catch (error) {
    console.error('❌ Erro na verificação de compatibilidade:', error);
    return {
      webgl: false,
      memory: false,
      backendAvailable: false,
      features: { hasWebGL: false, hasCPU: true }
    };
  }
}
}