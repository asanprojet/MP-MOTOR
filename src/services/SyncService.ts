/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Background Sync Service (Local-First Priority)
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

class SyncService {
  private queue: Array<{ key: string; value: any }> = [];

  constructor() {
    window.addEventListener('online', () => this.processQueue());
  }

  public async push(key: string, value: any): Promise<void> {
    // La donnée est déjà dans localStorage via StorageService
    // On tente une mise à jour Cloud immédiate
    if (navigator.onLine) {
      try {
        const docRef = doc(db, 'local_storage_sync', key);
        await setDoc(docRef, { data: value, updatedAt: new Date().toISOString() });
      } catch (e) {
        console.warn('Sync cloud échouée, mise en file d\'attente:', e);
        this.queue.push({ key, value });
      }
    } else {
      this.queue.push({ key, value });
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;
    console.log('Synchronisation des données en attente...');
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        try {
          const docRef = doc(db, 'local_storage_sync', item.key);
          await setDoc(docRef, { data: item.value, updatedAt: new Date().toISOString() });
        } catch (e) {
          console.error('Erreur lors de la synchro:', e);
          this.queue.unshift(item); // Remet dans la file
          break;
        }
      }
    }
  }
}

export const syncService = new SyncService();
