import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://mafia-backend-qbws.onrender.com';

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  reconnection: true
});

interface MafiaChatMessage {
  senderName: string;
  message: string;
  timestamp: number;
}

interface GameState {
  socket: Socket | null;
  roomCode: string | null;
  playerName: string;
  roomData: any | null;
  announcement: string | null;
  investigationResult: string | null;
  mafiaChatMessages: MafiaChatMessage[];
  connect: () => void;
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  startGame: () => void;
  submitNightAction: (targetId: string, role: string) => void;
  submitDayVote: (targetId: string) => void;
}

export const useStore = create<GameState>((set, get) => ({
  socket: socket,
  roomCode: null,
  playerName: '',
  roomData: null,
  announcement: null,
  investigationResult: null,
  mafiaChatMessages: [],

  connect: () => {
    if (!socket.connected) {
      socket.connect();

      socket.on('connect', () => {
        console.log('✅ Connected to Server!');
      });

      socket.on('roomUpdate', (data) => {
        set({ roomData: data, roomCode: data.code });
      });

      socket.on('morningAnnouncement', (msg) => {
        set({ announcement: msg });
        setTimeout(() => set({ announcement: null }), 4000);
      });

      socket.on('investigationResult', (res) => {
        set({ investigationResult: res });
        setTimeout(() => set({ investigationResult: null }), 3000);
      });

      // Only mafia members receive this event (server enforces it)
      socket.on('mafiaChatMessage', (msg: MafiaChatMessage) => {
        set(state => ({
          mafiaChatMessages: [...state.mafiaChatMessages, msg],
        }));
      });
    }
  },

  createRoom: (name) => {
    set({ playerName: name });
    socket.emit('createRoom', { playerName: name });
  },

  joinRoom: (code, name) => {
    set({ playerName: name });
    socket.emit('joinRoom', { roomCode: code, playerName: name });
  },

  startGame: () => {
    const { roomCode } = get();
    socket.emit('startGame', roomCode);
  },

  submitNightAction: (targetId, role) => {
    const { roomCode } = get();
    socket.emit('nightAction', { roomCode, targetId, role });
  },

  submitDayVote: (targetId) => {
    const { roomCode } = get();
    socket.emit('dayVote', { roomCode, targetId });
  },
}));