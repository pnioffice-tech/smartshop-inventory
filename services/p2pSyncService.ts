
import Peer, { DataConnection } from 'peerjs';
import { Product } from '../types';

let peer: Peer | null = null;
let activeConnections: DataConnection[] = [];

export const p2pSyncService = {
  init: (onDataReceived: (data: Product[]) => void, onConnectionChange: (connected: boolean) => void): string => {
    // Generate a short readable ID
    const shortId = `discreet-${Math.floor(1000 + Math.random() * 9000)}`;
    
    peer = new Peer(shortId);

    peer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
    });

    peer.on('connection', (conn) => {
      console.log('Incoming connection...');
      setupConnection(conn, onDataReceived, onConnectionChange);
    });

    return shortId;
  },

  connectToPeer: (targetId: string, onDataReceived: (data: Product[]) => void, onConnectionChange: (connected: boolean) => void) => {
    if (!peer) return;
    const conn = peer.connect(targetId);
    setupConnection(conn, onDataReceived, onConnectionChange);
  },

  broadcastUpdate: (inventory: Product[]) => {
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

function setupConnection(conn: DataConnection, onData: (data: Product[]) => void, onStatus: (connected: boolean) => void) {
  conn.on('open', () => {
    console.log('Connected to peer');
    activeConnections.push(conn);
    onStatus(true);
  });

  conn.on('data', (data: any) => {
    if (data && data.type === 'INVENTORY_UPDATE') {
      onData(data.payload);
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
