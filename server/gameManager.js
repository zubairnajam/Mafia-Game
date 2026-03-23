
class GameManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> RoomData
  }

  createRoom(hostId, hostName) {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.rooms.set(roomCode, {
      code: roomCode,
      host: hostId,
      status: 'LOBBY', // LOBBY, NIGHT, DAY, END
      players: [{ id: hostId, name: hostName, role: null, isAlive: true }],
      settings: { mafiaCount: 1, hasDoctor: true, hasDetective: true, hasCupid: false },
      nightActions: {}, // { mafiaTarget: id, doctorTarget: id, detectiveTarget: id }
      votes: {} // { voterId: targetId }
    });
    return roomCode;
  }

  joinRoom(roomCode, playerId, playerName) {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'LOBBY') return false;
    room.players.push({ id: playerId, name: playerName, role: null, isAlive: true });
    return true;
  }

  startGame(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    
    // 1. Assign Roles
    this.assignRoles(room);
    
    // 2. Switch to Night Phase
    room.status = 'NIGHT';
    room.nightActions = {};
  }

  assignRoles(room) {
    const players = room.players;
    
    // 🔥 NEW: Dynamic Mafia Logic! > 6 players = 2 Mafia. Otherwise 1.
    const actualMafiaCount = players.length > 6 ? 2 : 1;
    
    let pool = Array(players.length).fill('CIVILIAN');
    
    let index = 0;
    // Assign the correct number of Mafia
    for (let i = 0; i < actualMafiaCount; i++) {
      pool[index++] = 'MAFIA';
    }
    
    if (room.settings.hasDoctor) pool[index++] = 'DOCTOR';
    if (room.settings.hasDetective) pool[index++] = 'DETECTIVE';
    if (room.settings.hasCupid) pool[index++] = 'CUPID';

    // Shuffle and assign
    pool.sort(() => Math.random() - 0.5);
    players.forEach((p, i) => p.role = pool[i]);
  }

  processNightActions(roomCode) {
    const room = this.rooms.get(roomCode);
    const { mafiaTarget, doctorTarget } = room.nightActions;
    let deadPlayer = null;

    if (mafiaTarget && mafiaTarget !== doctorTarget) {
      const target = room.players.find(p => p.id === mafiaTarget);
      if (target) {
        target.isAlive = false;
        deadPlayer = target.name;
      }
    }
    room.status = 'DAY';
    room.nightActions = {};
    room.votes = {};
    return deadPlayer; // Returns who died for the morning announcement
  }

  checkWinCondition(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    const alivePlayers = room.players.filter(p => p.isAlive);
    const aliveMafia = alivePlayers.filter(p => p.role === 'MAFIA').length;
    const aliveCivilians = alivePlayers.length - aliveMafia;

    if (aliveMafia === 0) {
      room.status = 'END';
      room.winner = 'CIVILIANS 🎉';
      return true;
    } else if (aliveMafia >= aliveCivilians) {
      room.status = 'END';
      room.winner = 'MAFIA 🔪';
      return true;
    }
    return false;
  }

  // Security step: Clients only get the info they are allowed to see
  getSanitizedRoomState(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    
    // Deep copy to avoid mutating actual state
    const safeRoom = JSON.parse(JSON.stringify(room));
    
    safeRoom.players = safeRoom.players.map(p => {
      // Hide roles unless: game is over, it's the player's own role, or they are fellow mafia
      const showRole = 
        room.status === 'END' || 
        p.id === playerId || 
        (player?.role === 'MAFIA' && p.role === 'MAFIA');

      return {
        ...p,
        role: showRole ? p.role : '???'
      };
    });

    return safeRoom;
  }
}

module.exports = new GameManager();