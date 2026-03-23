import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface GameState {
  socket: Socket | null;
  roomCode: string | null;
  playerName: string;
  roomData: any | null;
  announcement: string | null;
  investigationResult: string | null;
  connect: () => void;
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  startGame: () => void;
  submitNightAction: (targetId: string, role: string) => void;
  submitDayVote: (targetId: string) => void;
  
}

export const useStore = create<GameState>((set, get) => ({
  socket: null,
  roomCode: null,
  playerName: '',
  roomData: null,
  announcement: null,
  investigationResult: null,

  connect: () => {
    const socket = io('https://mafia-backend-qbws.onrender.com');
    
    socket.on('roomCreated', (code) => set({ roomCode: code }));
    socket.on('roomUpdate', (data) => set({ roomData: data }));
    socket.on('morningAnnouncement', (msg) => {
        set({ announcement: msg });
        setTimeout(() => set({ announcement: null }), 5000); // Clear after 5s
    });
    socket.on('investigationResult', (msg) => {
        set({ investigationResult: msg });
        setTimeout(() => set({ investigationResult: null }), 8000); // Hide after 8s
    });

    set({ socket });
  },

  createRoom: (name) => {
    set({ playerName: name });
    get().socket?.emit('createRoom', { playerName: name });
  },

  joinRoom: (code, name) => {
    set({ playerName: name, roomCode: code });
    get().socket?.emit('joinRoom', { roomCode: code, playerName: name });
  },

  

  startGame: () => {
    get().socket?.emit('startGame', get().roomCode);
  },

  submitNightAction: (targetId, role) => {
    get().socket?.emit('nightAction', { roomCode: get().roomCode, targetId, role });
  },
  submitDayVote: (targetId) => {
  get().socket?.emit('dayVote', { roomCode: get().roomCode, targetId });
}
}));