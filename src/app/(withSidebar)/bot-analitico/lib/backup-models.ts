export class ModelBackupManager {
  static async exportModels() {
    const models = ['probability_predictor', 'pattern_detector'];
    const backups = [];
    
    for (const modelName of models) {
      try {
        // 1. Carregar do IndexedDB
        const model = await (window as any).tf.loadLayersModel(`indexeddb://${modelName}_model`);
        
        // 2. Converter para formato JSON
        const modelArtifacts = await model.save('downloads://');
        
        // 3. Salvar como arquivo
        backups.push({
          name: modelName,
          date: new Date().toISOString(),
          artifacts: modelArtifacts
        });
        
        console.log(`✅ Modelo ${modelName} exportado`);
      } catch (error) {
        console.warn(`⚠️ Não foi possível exportar ${modelName}:`, error);
      }
    }
    
    // 4. Criar arquivo de backup
    const backupStr = JSON.stringify(backups, null, 2);
    this.downloadFile(`ml_backup_${Date.now()}.json`, backupStr);
    
    return backups;
  }
  
  static async importModels(backupFile: File) {
    const text = await backupFile.text();
    const backups = JSON.parse(text);
    
    for (const backup of backups) {
      try {
        // Reconstruir modelo
        const model = await (window as any).tf.models.modelFromJSON(backup.artifacts.modelTopology);
        model.weights = backup.artifacts.weightData;
        
        // Salvar no IndexedDB
        await model.save(`indexeddb://${backup.name}_model`);
        
        console.log(`✅ Modelo ${backup.name} importado`);
      } catch (error) {
        console.error(`❌ Erro ao importar ${backup.name}:`, error);
      }
    }
  }
  
  private static downloadFile(filename: string, text: string) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}