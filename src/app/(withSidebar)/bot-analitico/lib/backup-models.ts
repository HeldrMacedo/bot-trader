import * as tf from '@tensorflow/tfjs';

type StoredModelBaseName = `${string}_model`;

export class ModelBackupManager {
  static readonly defaultModels = ['probability_predictor', 'pattern_detector'] as const;

  static getIndexedDBURL(modelName: string) {
    return `indexeddb://${modelName}_model`;
  }

  static async listStoredModelURLs() {
    if (typeof window === 'undefined') return [];
    try {
      const models = await tf.io.listModels();
      return Object.keys(models).filter((k) => k.startsWith('indexeddb://'));
    } catch {
      return [];
    }
  }

  static async hasStoredModel(modelName: string) {
    const url = this.getIndexedDBURL(modelName);
    const urls = await this.listStoredModelURLs();
    return urls.includes(url);
  }

  static async loadStoredModel(modelName: string) {
    const url = this.getIndexedDBURL(modelName);
    const exists = await this.hasStoredModel(modelName);
    if (!exists) return null;
    return tf.loadLayersModel(url);
  }

  static async saveModel(modelName: string, model: tf.LayersModel) {
    const url = this.getIndexedDBURL(modelName);
    await model.save(url);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`ml_model_saved_at:${modelName}`, new Date().toISOString());
    }
  }

  static async saveModels(models: Iterable<[string, tf.LayersModel]>) {
    for (const [name, model] of models) {
      await this.saveModel(name, model);
    }
  }

  static async exportModels(modelNames: readonly string[] = ModelBackupManager.defaultModels) {
    const results: Array<{ name: string; exported: boolean; reason?: string }> = [];

    for (const modelName of modelNames) {
      try {
        const model = await this.loadStoredModel(modelName);
        if (!model) {
          results.push({ name: modelName, exported: false, reason: 'Modelo não encontrado no IndexedDB' });
          continue;
        }
        await model.save(`downloads://${modelName}_model`);
        results.push({ name: modelName, exported: true });
      } catch (error: any) {
        results.push({ name: modelName, exported: false, reason: error?.message || String(error) });
      }
    }

    return results;
  }

  static async importModels(files: FileList) {
    if (!files || files.length === 0) return [];

    const fileArr = Array.from(files);
    const byBaseName = new Map<
      StoredModelBaseName,
      { json?: File; weights?: File }
    >();

    for (const file of fileArr) {
      const name = file.name;
      if (name.endsWith('.json')) {
        const base = name.replace(/\.json$/i, '') as StoredModelBaseName;
        byBaseName.set(base, { ...byBaseName.get(base), json: file });
      } else if (name.endsWith('.weights.bin')) {
        const base = name.replace(/\.weights\.bin$/i, '') as StoredModelBaseName;
        byBaseName.set(base, { ...byBaseName.get(base), weights: file });
      }
    }

    const imported: Array<{ name: string; imported: boolean; reason?: string }> = [];

    for (const [baseName, pair] of byBaseName.entries()) {
      if (!pair.json || !pair.weights) {
        imported.push({
          name: baseName,
          imported: false,
          reason: 'Selecione o .json e o .weights.bin do mesmo modelo',
        });
        continue;
      }

      try {
        const model = await tf.loadLayersModel(tf.io.browserFiles([pair.json, pair.weights]));
        await model.save(`indexeddb://${baseName}`);
        imported.push({ name: baseName, imported: true });
      } catch (error: any) {
        imported.push({ name: baseName, imported: false, reason: error?.message || String(error) });
      }
    }

    return imported;
  }
}
