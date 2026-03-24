class GameManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(hostId, hostName) {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.rooms.set(roomCode, {
      code: roomCode,
      host: hostId,
      status: 'LOBBY',
      players: [{ id: hostId, name: hostName, role: null, isAlive: true }],
      settings: { mafiaCount: 1, hasDoctor: true, hasDetective: true, hasCupid: false },
      nightActions: {},
      votes: {},
      winner: null, // ← added so frontend can always read this
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
    this.assignRoles(room);
    room.status = 'MAFIA_TURN';
    room.nightActions = {};
    room.votes = {};
    room.winner = null;
  }

  assignRoles(room) {
    const players = room.players;
    const actualMafiaCount = players.length > 6 ? 2 : 1;

    let pool = Array(players.length).fill('CIVILIAN');
    let index = 0;

    for (let i = 0; i < actualMafiaCount; i++) {
      pool[index++] = 'MAFIA';
    }
    if (room.settings.hasDoctor && index < players.length) pool[index++] = 'DOCTOR';
    if (room.settings.hasDetective && index < players.length) pool[index++] = 'DETECTIVE';
    if (room.settings.hasCupid && index < players.length) pool[index++] = 'CUPID';

    pool.sort(() => Math.random() - 0.5);
    players.forEach((p, i) => (p.role = pool[i]));
  }

  processNightActions(roomCode) {
    const room = this.rooms.get(roomCode);
    const { mafiaTarget, doctorTarget } = room.nightActions;
    let deadPlayerName = null;

    if (mafiaTarget && mafiaTarget !== doctorTarget) {
      const target = room.players.find(p => p.id === mafiaTarget);
      if (target) {
        target.isAlive = false;
        deadPlayerName = target.name;
      }
    }

    // Don't set status here — caller handles that after checking win condition
    room.nightActions = {};
    room.votes = {};
    return deadPlayerName;
  }

  checkWinCondition(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    const alivePlayers = room.players.filter(p => p.isAlive);

    // ← FIX: count ALL mafia-aligned roles, not just 'MAFIA'
    const MAFIA_ROLES = ['MAFIA', 'GODFATHER', 'FATHER_MAFIA'];
    const aliveMafia = alivePlayers.filter(p => MAFIA_ROLES.includes(p.role)).length;
    const aliveTown = alivePlayers.length - aliveMafia;

    if (aliveMafia === 0) {
      room.status = 'END';
      room.winner = 'CIVILIANS';
      return true;
    }

    if (aliveMafia >= aliveTown) {
      room.status = 'END';
      room.winner = 'MAFIA';
      return true;
    }

    return false;
  }

  getSanitizedRoomState(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    const safeRoom = JSON.parse(JSON.stringify(room));

    const MAFIA_ROLES = ['MAFIA', 'GODFATHER', 'FATHER_MAFIA'];

    safeRoom.players = safeRoom.players.map(p => {
      const showRole =
        room.status === 'END' ||
        p.id === playerId ||
        (player?.role && MAFIA_ROLES.includes(player.role) && MAFIA_ROLES.includes(p.role));

      return { ...p, role: showRole ? p.role : '???' };
    });

    return safeRoom;
  }
}

module.exports = new GameManager();
