
import Peer, { DataConnection } from 'peerjs';
import { Product } from '../types';

let peer: Peer | null = null;
let activeConnections: DataConnection[] = [];
let retryTimeout: number | null = null;

export const p2pSyncService = {
  init: (
    onDataReceived: (data: Product[]) => void, 
    onConnectionChange: (connected: boolean) => void,
    onIdReady: (id: string) => void,
    getLatestInventory: () => Product[]
  ) => {
    const generateId = () => `dsc-${Math.floor(1000 + Math.random() * 9000)}`;
    const startPeer = (id: string) => {
      if (peer) peer.destroy();
      
      peer = new Peer(id, {
        debug: 1
      });

      peer.on('open', (readyId) => {
        onIdReady(readyId);
      });

      peer.on('connection', (conn) => {
        setupConnection(conn, onDataReceived, onConnectionChange, getLatestInventory);
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          startPeer(generateId());
        } else {
          onConnectionChange(false);
        }
      });
      
      peer.on('disconnected', () => {
        peer?.reconnect();
      });
    };

    startPeer(generateId());
  },

  connectToPeer: (
    targetId: string, 
    onDataReceived: (data: Product[]) => void, 
    onConnectionChange: (connected: boolean) => void,
    getLatestInventory: () => Product[]
  ) => {
    if (!peer || !targetId) return;
    
    const cleanId = targetId.trim();
    const conn = peer.connect(cleanId, {
      reliable: true
    });
    
    setupConnection(conn, onDataReceived, onConnectionChange, getLatestInventory);
  },

  broadcastUpdate: (inventory: Product[]) => {
    activeConnections.forEach(conn => {
      if (conn.open) {
        conn.send({ type: 'INVENTORY_UPDATE', payload: inventory });
      }
    });
  },

  disconnect: () => {
    if (retryTimeout) clearTimeout(retryTimeout);
    activeConnections.forEach(c => c.close());
    activeConnections = [];
    peer?.destroy();
    peer = null;
  }
};

function setupConnection(
  conn: DataConnection, 
  onData: (data: Product[]) => void, 
  onStatus: (connected: boolean) => void,
  getLatestInventory: () => Product[]
) {
  conn.on('open', () => {
    if (!activeConnections.find(c => c.peer === conn.peer)) {
      activeConnections.push(conn);
    }
    onStatus(true);
    
    conn.send({ type: 'REQUEST_SYNC' });
    const currentData = getLatestInventory();
    if (currentData && currentData.length > 0) {
      conn.send({ type: 'INVENTORY_UPDATE', payload: currentData });
    }
  });

  conn.on('data', (data: any) => {
    if (!data) return;
    
    if (data.type === 'INVENTORY_UPDATE') {
      onData(data.payload);
    } else if (data.type === 'REQUEST_SYNC') {
      const current = getLatestInventory();
      conn.send({ type: 'INVENTORY_UPDATE', payload: current });
    }
  });

  conn.on('close', () => {
    activeConnections = activeConnections.filter(c => c.peer !== conn.peer);
    onStatus(activeConnections.length > 0);
  });

  conn.on('error', () => {
    activeConnections = activeConnections.filter(c => c.peer !== conn.peer);
    onStatus(activeConnections.length > 0);
  });
}
