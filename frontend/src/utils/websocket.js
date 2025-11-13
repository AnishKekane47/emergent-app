import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace('/api', '').replace('https://', 'wss://').replace('http://', 'ws://');

let socket = null;

export const connectWebSocket = (userId, onAlert) => {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(`${WS_URL}/ws`, {
    transports: ['websocket', 'polling'],
    auth: { user_id: userId }
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
    socket.emit('authenticate', { user_id: userId });
  });

  socket.on('authenticated', (data) => {
    console.log('WebSocket authenticated:', data);
  });

  socket.on('alert:new', (alert) => {
    console.log('New alert received:', alert);
    if (onAlert) {
      onAlert(alert);
    }
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return socket;
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;