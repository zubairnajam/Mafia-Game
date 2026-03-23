const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const gameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  const emitRoomUpdate = (roomCode) => {
    const room = gameManager.rooms.get(roomCode);
    if (!room) return;
    room.players.forEach(p => {
      io.to(p.id).emit('roomUpdate', gameManager.getSanitizedRoomState(roomCode, p.id));
    });
  };

  socket.on('createRoom', ({ playerName }) => {
    const roomCode = gameManager.createRoom(socket.id, playerName);
    socket.join(roomCode);
    socket.emit('roomCreated', roomCode);
    emitRoomUpdate(roomCode);
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const success = gameManager.joinRoom(roomCode, socket.id, playerName);
    if (success) {
      socket.join(roomCode);
      emitRoomUpdate(roomCode);
    } else {
      socket.emit('error', 'Room not found or game already started');
    }
  });

  socket.on('startGame', (roomCode) => {
    const room = gameManager.rooms.get(roomCode);
    if (room && room.host === socket.id) {
      gameManager.startGame(roomCode);
      emitRoomUpdate(roomCode);
    }
  });

  socket.on('nightAction', ({ roomCode, targetId, role }) => {
    const room = gameManager.rooms.get(roomCode);
    if (!room || room.status !== 'NIGHT') return;

    if (role === 'MAFIA') room.nightActions.mafiaTarget = targetId;
    if (role === 'DOCTOR') room.nightActions.doctorTarget = targetId;

    if (role === 'DETECTIVE') {
      room.nightActions.detectiveTarget = targetId;
      const targetPlayer = room.players.find(p => p.id === targetId);
      const isMafia = targetPlayer && targetPlayer.role === 'MAFIA';
      socket.emit('investigationResult', isMafia ? `🕵️ YES! ${targetPlayer.name} is the Mafia!` : `❌ No, ${targetPlayer.name} is innocent.`);
    }

    const aliveMafia = room.players.filter(p => p.role === 'MAFIA' && p.isAlive).length > 0;
    const aliveDoctor = room.players.filter(p => p.role === 'DOCTOR' && p.isAlive).length > 0;
    const aliveDetective = room.players.filter(p => p.role === 'DETECTIVE' && p.isAlive).length > 0;

    const mafiaDone = !aliveMafia || room.nightActions.mafiaTarget;
    const doctorDone = !aliveDoctor || room.nightActions.doctorTarget;
    const detectiveDone = !aliveDetective || room.nightActions.detectiveTarget;

    // This block runs when ALL alive special roles have locked in their choices
    if (mafiaDone && doctorDone && detectiveDone) {
       const deadPlayer = gameManager.processNightActions(roomCode);
       
       if (gameManager.checkWinCondition(roomCode)) {
         io.to(roomCode).emit('morningAnnouncement', deadPlayer ? `${deadPlayer} was killed. GAME OVER!` : `Nobody died. GAME OVER!`);
       } else {
         io.to(roomCode).emit('morningAnnouncement', deadPlayer ? `${deadPlayer} was killed in the night.` : `Nobody died last night.`);
       }
       emitRoomUpdate(roomCode);
    }
  });

  socket.on('dayVote', ({ roomCode, targetId }) => {
    const room = gameManager.rooms.get(roomCode);
    if (!room || room.status !== 'DAY') return;

    room.votes[socket.id] = targetId;

    const alivePlayers = room.players.filter(p => p.isAlive);
    // Check if everyone alive has voted
    if (Object.keys(room.votes).length === alivePlayers.length) {
      
      const voteCounts = {};
      Object.values(room.votes).forEach(id => {
        voteCounts[id] = (voteCounts[id] || 0) + 1;
      });

      let maxVotes = 0;
      let eliminatedIds = []; // 🔥 NEW: Keep track of ties

      // Find the highest votes
      for (const [id, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          eliminatedIds = [id]; // New leader
        } else if (count === maxVotes) {
          eliminatedIds.push(id); // Tie!
        }
      }

      // 🔥 NEW: Tie-Breaker Logic
      if (eliminatedIds.length === 1) {
        // Only one person got the max votes, execute them!
        const target = room.players.find(p => p.id === eliminatedIds[0]);
        if (target) {
          target.isAlive = false;
          
          if (gameManager.checkWinCondition(roomCode)) {
             io.to(roomCode).emit('morningAnnouncement', `${target.name} was voted out. GAME OVER!`);
          } else {
             io.to(roomCode).emit('morningAnnouncement', `${target.name} was voted out!`);
          }
        }
      } else {
        // It's a tie! Nobody dies.
        io.to(roomCode).emit('morningAnnouncement', `The town was split! Nobody was voted out today.`);
      }

      // Move to night phase if game isn't over
      if (room.status !== 'END') {
        room.status = 'NIGHT';
      }
      room.votes = {};
      emitRoomUpdate(roomCode);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));