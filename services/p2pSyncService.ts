
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
    // Generate a slightly more unique ID but keep it short
    const generateId = () => `dsc-${Math.floor(1000 + Math.random() * 9000)}`;
    const startPeer = (id: string) => {
      if (peer) peer.destroy();
      
      peer = new Peer(id, {
        debug: 2 // Log errors and warnings
      });

      peer.on('open', (readyId) => {
        console.log('Peer connected with ID:', readyId);
        onIdReady(readyId);
      });

      peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        setupConnection(conn, onDataReceived, onConnectionChange, getLatestInventory);
      });

      peer.on('error', (err) => {
        console.error('PeerJS Error:', err.type, err);
        if (err.type === 'unavailable-id') {
          // If ID is taken, try another one
          startPeer(generateId());
        } else {
          onConnectionChange(false);
        }
      });
      
      peer.on('disconnected', () => {
        console.log('Peer disconnected from server, attempting reconnect...');
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
    
    // Clean up target ID (remove whitespace)
    const cleanId = targetId.trim();
    console.log('Attempting to connect to:', cleanId);
    
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
    console.log('Connection established with:', conn.peer);
    // Add to active connections if not already there
    if (!activeConnections.find(c => c.peer === conn.peer)) {
      activeConnections.push(conn);
    }
    onStatus(true);
    
    // Immediate handshake: Request and Send data
    conn.send({ type: 'REQUEST_SYNC' });
    const currentData = getLatestInventory();
    if (currentData && currentData.length > 0) {
      conn.send({ type: 'INVENTORY_UPDATE', payload: currentData });
    }
  });

  conn.on('data', (data: any) => {
    console.log('Received P2P Message:', data.type);
    if (!data) return;
    
    if (data.type === 'INVENTORY_UPDATE') {
      onData(data.payload);
    } else if (data.type === 'REQUEST_SYNC') {
      const current = getLatestInventory();
      conn.send({ type: 'INVENTORY_UPDATE', payload: current });
    }
  });

  conn.on('close', () => {
    console.log('Connection closed with:', conn.peer);
    activeConnections = activeConnections.filter(c => c.peer !== conn.peer);
    onStatus(activeConnections.length > 0);
  });

  conn.on('error', (err) => {
    console.error('Connection error:', err);
    activeConnections = activeConnections.filter(c => c.peer !== conn.peer);
    onStatus(activeConnections.length > 0);
  });
}
