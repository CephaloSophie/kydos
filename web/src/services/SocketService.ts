import { io, type Socket } from 'socket.io-client';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000';

let socketInstance: Socket | null = null;

export class SocketService {
  getSocket(): Socket {
    if (!socketInstance) {
      socketInstance = io(API_BASE_URL, {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket', 'polling'],
      });
    }
    return socketInstance;
  }

  disconnect(): void {
    socketInstance?.disconnect();
    socketInstance = null;
  }
}

export const socketService = new SocketService();
