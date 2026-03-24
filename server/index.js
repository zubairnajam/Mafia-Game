const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const gameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// How long to show a "ghost turn" for a dead role (ms)
// Long enough that no one knows the role is dead, short enough to keep game moving
const GHOST_TURN_DELAY = 3000;

const MAFIA_ROLES = ['MAFIA', 'GODFATHER', 'FATHER_MAFIA'];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  const emitRoomUpdate = (roomCode) => {
    const room = gameManager.rooms.get(roomCode);
    if (!room) return;
    room.players.forEach((p) => {
      io.to(p.id).emit('roomUpdate', gameManager.getSanitizedRoomState(roomCode, p.id));
    });
  };

  const isRoleAlive = (room, role) => {
    return room.players.some(p => p.role === role && p.isAlive);
  };

  // After mafia or detective acts, figure out what comes next.
  // If the next role is DEAD, show their turn briefly (ghost turn) then auto-skip.
  // If the role is DISABLED entirely (settings), skip with no delay.
  const advanceNightTurn = (roomCode) => {
    const room = gameManager.rooms.get(roomCode);
    const { hasDetective, hasDoctor } = room.settings;

    if (room.status === 'MAFIA_TURN') {

      if (hasDetective) {
        // Detective is in the game — show their turn regardless of alive status
        room.status = 'DETECTIVE_TURN';
        emitRoomUpdate(roomCode);

        if (!isRoleAlive(room, 'DETECTIVE')) {
          // Ghost turn: detective is dead, wait briefly then auto-advance
          setTimeout(() => advanceNightTurn(roomCode), GHOST_TURN_DELAY);
        }
        // If detective IS alive, we wait for them to submit a nightAction normally

      } else if (hasDoctor) {
        // No detective in game at all, check doctor
        room.status = 'DOCTOR_TURN';
        emitRoomUpdate(roomCode);

        if (!isRoleAlive(room, 'DOCTOR')) {
          setTimeout(() => handleNightTransition(roomCode), GHOST_TURN_DELAY);
        }

      } else {
        // Neither detective nor doctor in game — resolve immediately
        handleNightTransition(roomCode);
      }

    } else if (room.status === 'DETECTIVE_TURN') {
      // Detective just finished (or ghost turn expired), move to doctor

      if (hasDoctor) {
        room.status = 'DOCTOR_TURN';
        emitRoomUpdate(roomCode);

        if (!isRoleAlive(room, 'DOCTOR')) {
          // Ghost turn for dead doctor
          setTimeout(() => handleNightTransition(roomCode), GHOST_TURN_DELAY);
        }
        // If doctor IS alive, wait for their nightAction

      } else {
        // No doctor in game — resolve now
        handleNightTransition(roomCode);
      }
    }
  };

  // ── Room Events ────────────────────────────────────────────────────────────

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

  // ── Night Actions ──────────────────────────────────────────────────────────

  socket.on('nightAction', ({ roomCode, targetId, role }) => {
    const room = gameManager.rooms.get(roomCode);
    if (!room) return;

    if (MAFIA_ROLES.includes(role)) {
      room.nightActions.mafiaTarget = targetId;
      advanceNightTurn(roomCode);

    } else if (role === 'DETECTIVE') {
      // Guard: only process if it's actually detective's turn and they're alive
      if (room.status !== 'DETECTIVE_TURN') return;
      room.nightActions.detectiveTarget = targetId;
      const target = room.players.find((p) => p.id === targetId);
      // Godfather always appears innocent
      const isEvil = target && MAFIA_ROLES.includes(target.role) && target.role !== 'GODFATHER';
      socket.emit('investigationResult', isEvil ? '🕵️ MAFIA FOUND!' : '❌ Innocent.');
      advanceNightTurn(roomCode);

    } else if (role === 'DOCTOR') {
      // Guard: only process if it's doctor's turn and they're alive
      if (room.status !== 'DOCTOR_TURN') return;
      room.nightActions.doctorTarget = targetId;
      handleNightTransition(roomCode);
    }
  });

  // ── Day Vote ───────────────────────────────────────────────────────────────

  socket.on('dayVote', ({ roomCode, targetId }) => {
    const room = gameManager.rooms.get(roomCode);
    if (!room || room.status !== 'DAY') return;

    room.votes[socket.id] = targetId;

    const alivePlayers = room.players.filter((p) => p.isAlive);

    if (Object.keys(room.votes).length >= alivePlayers.length) {
      const voteCounts = {};
      Object.values(room.votes).forEach((id) => {
        voteCounts[id] = (voteCounts[id] || 0) + 1;
      });

      let maxVotes = 0;
      let eliminatedIds = [];
      for (const [id, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) { maxVotes = count; eliminatedIds = [id]; }
        else if (count === maxVotes) { eliminatedIds.push(id); }
      }

      let msg = '';
      if (eliminatedIds.length === 1) {
        const target = room.players.find((p) => p.id === eliminatedIds[0]);
        if (target) {
          target.isAlive = false;
          msg = `⚖️ The town has spoken. ${target.name} has been voted out.`;
        }
      } else {
        msg = '🤝 The town was split! Nobody was voted out today.';
      }

      io.to(roomCode).emit('morningAnnouncement', msg);

      setTimeout(() => {
        const gameEnded = gameManager.checkWinCondition(roomCode);
        if (gameEnded) {
          emitRoomUpdate(roomCode);
        } else {
          showContinueSequence(roomCode, 'night');
        }
      }, 4500);

    } else {
      emitRoomUpdate(roomCode);
    }
  });

  // ── Mafia Chat ─────────────────────────────────────────────────────────────
  // Server enforces that only mafia members can send AND receive this event.
  // Town members never get these messages — not even in the wrong state.

  socket.on('mafiaChatMessage', ({ roomCode, message }) => {
    const room = gameManager.rooms.get(roomCode);
    if (!room) return;

    // Verify the sender is actually mafia (server-side check, not client trust)
    const sender = room.players.find(p => p.id === socket.id);
    if (!sender || !MAFIA_ROLES.includes(sender.role)) return;

    // Only during night phases — mafia can't use secret channel during day
    const nightStatuses = ['MAFIA_TURN', 'DETECTIVE_TURN', 'DOCTOR_TURN'];
    if (!nightStatuses.includes(room.status)) return;

    // Trim and cap message length
    const clean = String(message).trim().slice(0, 200);
    if (!clean) return;

    const payload = {
      senderName: sender.name,
      message: clean,
      timestamp: Date.now(),
    };

    // Send ONLY to mafia members — loop through players, emit per socket id
    room.players.forEach(p => {
      if (MAFIA_ROLES.includes(p.role)) {
        io.to(p.id).emit('mafiaChatMessage', payload);
      }
    });
  });

  // ── Night → Day Transition ─────────────────────────────────────────────────

  function handleNightTransition(roomCode) {
    const room = gameManager.rooms.get(roomCode);
    if (!room) return;

    const deadPlayerName = gameManager.processNightActions(roomCode);

    const msg = deadPlayerName
      ? `💀 ${deadPlayerName} was killed last night.`
      : '🛡️ A quiet night... The Doctor saved someone!';

    io.to(roomCode).emit('morningAnnouncement', msg);

    setTimeout(() => {
      const gameEnded = gameManager.checkWinCondition(roomCode);
      if (gameEnded) {
        emitRoomUpdate(roomCode);
      } else {
        showContinueSequence(roomCode, 'day');
      }
    }, 4500);
  }

  function showContinueSequence(roomCode, nextPhase) {
    const room = gameManager.rooms.get(roomCode);
    if (!room) return;

    const mafiaAlive = room.players.some(p => p.isAlive && MAFIA_ROLES.includes(p.role));

    if (mafiaAlive) {
      io.to(roomCode).emit('morningAnnouncement', '⚠️ MAFIA STILL REMAINS...');
    }

    setTimeout(() => {
      if (nextPhase === 'day') {
        io.to(roomCode).emit('morningAnnouncement', '☀️ Day breaks. Discuss and vote!');
      } else {
        io.to(roomCode).emit('morningAnnouncement', '🌙 Night falls again. Next Round...');
      }

      setTimeout(() => {
        room.status = nextPhase === 'day' ? 'DAY' : 'MAFIA_TURN';
        room.votes = {};
        room.nightActions = {};
        emitRoomUpdate(roomCode);
      }, 2500);

    }, mafiaAlive ? 3500 : 500);
  }

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
