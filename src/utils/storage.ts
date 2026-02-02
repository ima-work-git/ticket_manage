// Persistent Storage API
// Requests the browser to not automatically clear IndexedDB data

export interface StorageStatus {
  persisted: boolean;
  quota?: number;
  usage?: number;
  usagePercent?: number;
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    console.log('Persistent storage not supported');
    return false;
  }

  try {
    const persisted = await navigator.storage.persist();
    console.log(`Persistent storage ${persisted ? 'granted' : 'denied'}`);
    return persisted;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

export async function checkStorageStatus(): Promise<StorageStatus> {
  const result: StorageStatus = { persisted: false };

  if (!navigator.storage) {
    return result;
  }

  try {
    // Check if storage is persisted
    if (navigator.storage.persisted) {
      result.persisted = await navigator.storage.persisted();
    }

    // Check storage quota
    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      result.quota = estimate.quota;
      result.usage = estimate.usage;
      if (estimate.quota && estimate.usage) {
        result.usagePercent = Math.round((estimate.usage / estimate.quota) * 100);
      }
    }
  } catch (error) {
    console.error('Failed to check storage status:', error);
  }

  return result;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
