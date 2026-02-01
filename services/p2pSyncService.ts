
import Peer, { DataConnection } from 'peerjs';
import { Product } from '../types';

let peer: Peer | null = null;
let activeConnections: DataConnection[] = [];
let currentInventory: Product[] = [];

export const p2pSyncService = {
  init: (
    onDataReceived: (data: Product[]) => void, 
    onConnectionChange: (connected: boolean) => void,
    onIdReady: (id: string) => void,
    getLatestInventory: () => Product[]
  ) => {
    const shortId = `discreet-${Math.floor(1000 + Math.random() * 9000)}`;
    peer = new Peer(shortId);

    peer.on('open', (id) => {
      console.log('Peer ID ready:', id);
      onIdReady(id);
    });

    peer.on('connection', (conn) => {
      setupConnection(conn, onDataReceived, onConnectionChange, getLatestInventory);
    });

    peer.on('error', (err) => {
      console.error('PeerJS Error:', err);
      onConnectionChange(false);
    });
  },

  connectToPeer: (
    targetId: string, 
    onDataReceived: (data: Product[]) => void, 
    onConnectionChange: (connected: boolean) => void,
    getLatestInventory: () => Product[]
  ) => {
    if (!peer || !targetId) return;
    const conn = peer.connect(targetId);
    setupConnection(conn, onDataReceived, onConnectionChange, getLatestInventory);
  },

  broadcastUpdate: (inventory: Product[]) => {
    currentInventory = inventory;
    activeConnections.forEach(conn => {
      if (conn.open) {
        conn.send({ type: 'INVENTORY_UPDATE', payload: inventory });
      }
    });
  },

  disconnect: () => {
    activeConnections.forEach(c => c.close());
    activeConnections = [];
    peer?.destroy();
  }
};

function setupConnection(
  conn: DataConnection, 
  onData: (data: Product[]) => void, 
  onStatus: (connected: boolean) => void,
  getLatestInventory: () => Product[]
) {
  conn.on('open', () => {
    activeConnections.push(conn);
    onStatus(true);
    
    // Request initial data from the peer we just connected to
    conn.send({ type: 'REQUEST_SYNC' });
    
    // Also send our current data to them immediately
    const data = getLatestInventory();
    if (data.length > 0) {
      conn.send({ type: 'INVENTORY_UPDATE', payload: data });
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
    activeConnections = activeConnections.filter(c => c !== conn);
    onStatus(activeConnections.length > 0);
  });

  conn.on('error', () => {
    onStatus(false);
  });
}
