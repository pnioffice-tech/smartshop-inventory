
import { Product } from '../types';

const CHANNEL_NAME = 'discreet_local_sync';

// Initialize the broadcast channel
const channel = typeof window !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

export const localSyncService = {
  /**
   * Broadcasts the updated inventory to all other tabs
   */
  broadcastUpdate: (inventory: Product[]) => {
    if (channel) {
      channel.postMessage({
        type: 'INVENTORY_UPDATE',
        payload: inventory,
        timestamp: Date.now()
      });
    }
  },

  /**
   * Listens for updates from other tabs
   */
  subscribe: (callback: (inventory: Product[]) => void) => {
    if (!channel) return () => {};

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'INVENTORY_UPDATE') {
        callback(event.data.payload);
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => channel.removeEventListener('message', handleMessage);
  }
};
