'use client';
import { useEffect, useState } from 'react';
import { useStore } from '../store/userStore';

export default function Home() {
  const { connect, roomData, roomCode, createRoom, joinRoom, startGame, socket } = useStore();
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');

  useEffect(() => {
    connect();
  }, [connect]);

  if (!roomData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white font-sans p-6">
        <h1 className="text-5xl font-bold mb-8 tracking-wider">MAFIA</h1>
        <div className="bg-neutral-800 p-8 rounded-xl w-full max-w-md shadow-2xl space-y-4">
          <input 
            className="w-full p-3 bg-neutral-700 rounded outline-none" 
            placeholder="Enter your name" 
            value={nameInput} 
            onChange={e => setNameInput(e.target.value)} 
          />
          <button 
            className="w-full p-3 bg-indigo-600 hover:bg-indigo-500 rounded font-bold transition"
            onClick={() => createRoom(nameInput)}>
            Create Room
          </button>
          <div className="flex gap-2">
            <input 
              className="flex-1 p-3 bg-neutral-700 rounded outline-none uppercase" 
              placeholder="ROOM CODE" 
              maxLength={4}
              value={codeInput} 
              onChange={e => setCodeInput(e.target.value)} 
            />
            <button 
              className="p-3 bg-emerald-600 hover:bg-emerald-500 rounded font-bold transition"
              onClick={() => joinRoom(codeInput.toUpperCase(), nameInput)}>
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LOBBY VIEW
  if (roomData.status === 'LOBBY') {
    const isHost = roomData.host === socket?.id;
    return (
      <div className="min-h-screen bg-neutral-900 text-white p-8 flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-2">Room Code: <span className="text-indigo-400">{roomData.code}</span></h2>
        <div className="w-full max-w-lg bg-neutral-800 rounded-xl p-6 mt-6">
          <h3 className="text-xl font-semibold mb-4 border-b border-neutral-700 pb-2">Players ({roomData.players.length})</h3>
          <ul className="space-y-2">
            {roomData.players.map((p: any) => (
              <li key={p.id} className="p-3 bg-neutral-700 rounded flex justify-between items-center">
                <span>{p.name} {p.id === roomData.host && '👑'}</span>
              </li>
            ))}
          </ul>
          {isHost && (
             <button 
              className="w-full mt-6 p-4 bg-indigo-600 hover:bg-indigo-500 rounded font-bold text-lg"
              onClick={startGame}>
              Start Game
            </button>
          )}
        </div>
      </div>
    );
  }

  // GAME VIEW
  return <GameScreen />;
}

function GameScreen() {
  const { roomData, socket, submitNightAction, submitDayVote, announcement, investigationResult } = useStore();
  const me = roomData.players.find((p: any) => p.id === socket?.id);
  
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTarget(null);
  }, [roomData.status]);

  // 🛡️ THE SAFETY NET: Must be exactly here!
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white">
        <h1 className="text-3xl font-bold animate-pulse text-indigo-400">Syncing player data...</h1>
      </div>
    );
  }

  const getPhaseSubtitle = () => {
    if (roomData.status === 'END') return `The ${roomData.winner} have won the game!`;
    if (!me.isAlive) return "You are dead. You can only watch the chaos unfold.";
    if (selectedTarget) return "Action locked in. Waiting for others...";
    if (roomData.status === 'DAY') return "Discuss and select someone to vote out!";
    if (me.role === 'MAFIA') return "Select your target to eliminate tonight.";
    if (me.role === 'DETECTIVE') return "Select one person to investigate.";
    if (me.role === 'DOCTOR') return "Select someone (even yourself) to protect.";
    return "The town is asleep. Waiting for special roles to act...";
  };

  const canInteract = (targetPlayer: any) => {
    if (!me.isAlive || !targetPlayer.isAlive || roomData.status === 'END') return false;
    if (selectedTarget) return false; 
    
    if (roomData.status === 'DAY') {
      return targetPlayer.id !== me.id; 
    }
    
    if (roomData.status === 'NIGHT') {
      if (me.role === 'CIVILIAN') return false; 
      if (me.role === 'DOCTOR') return true; 
      return targetPlayer.id !== me.id; 
    }
    return false;
  };

  return (
    <div className={`min-h-screen p-8 text-white transition-colors duration-1000 
      ${roomData.status === 'NIGHT' ? 'bg-slate-900' : roomData.status === 'END' ? 'bg-indigo-950' : 'bg-orange-50'}`}>
      
      {announcement && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-red-600 px-6 py-3 rounded-full font-bold shadow-2xl animate-bounce z-50">
          {announcement}
        </div>
      )}

      {investigationResult && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-blue-600 px-6 py-3 rounded-full font-bold shadow-2xl z-50">
          {investigationResult}
        </div>
      )}

      {selectedTarget && roomData.status !== 'END' && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-emerald-600 px-6 py-3 rounded-full font-bold shadow-2xl z-50 animate-pulse">
          Action confirmed. Waiting for others...
        </div>
      )}

      <header className="flex justify-between items-center mb-10 bg-black/20 p-6 rounded-2xl backdrop-blur-sm">
        <div>
          <h1 className={`text-5xl font-extrabold tracking-tight ${roomData.status === 'NIGHT' ? 'text-indigo-300' : roomData.status === 'END' ? 'text-yellow-400' : 'text-orange-600'}`}>
            {roomData.status === 'NIGHT' ? '🌙 Night Phase' : roomData.status === 'END' ? '🏆 Game Over' : '☀️ Day Phase'}
          </h1>
          <p className={`text-xl mt-3 font-medium ${roomData.status === 'NIGHT' ? 'text-indigo-200' : 'text-orange-800'}`}>
            {getPhaseSubtitle()}
          </p>
        </div>
        <div className="text-right bg-black/30 p-4 rounded-xl">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Your Identity</p>
          <p className={`text-3xl font-black ${me.role === 'MAFIA' ? 'text-red-500' : 'text-emerald-500'}`}>{me.role}</p>
        </div>
      </header>

      {roomData.status === 'END' && (
        <div className="w-full bg-yellow-500/20 border-2 border-yellow-500 p-8 rounded-2xl text-center mb-8">
          <h2 className="text-4xl font-black text-yellow-400">VICTORY FOR THE {roomData.winner}!</h2>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {roomData.players.map((p: any) => {
          const isInteractable = canInteract(p);
          const isSelected = selectedTarget === p.id;

          return (
            <button 
              key={p.id}
              disabled={!isInteractable && !isSelected}
              onClick={() => {
                 if (!isInteractable) return;
                 setSelectedTarget(p.id); 
                 
                 if (roomData.status === 'NIGHT') {
                   submitNightAction(p.id, me.role);
                 } else if (roomData.status === 'DAY') {
                   submitDayVote(p.id);
                 }
              }}
              className={`relative p-8 rounded-2xl flex flex-col items-center justify-center border-4 transition-all duration-300
                ${!p.isAlive ? 'opacity-40 grayscale border-neutral-800 bg-black/50 cursor-not-allowed' : 'bg-neutral-800 shadow-xl'}
                ${isInteractable ? 'hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-400 cursor-pointer border-neutral-600' : 'border-neutral-700 cursor-default'}
                ${isSelected ? 'border-emerald-500 bg-emerald-900/30 scale-105' : ''}
              `}
            >
              {isSelected && <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-2 rounded-full text-xs font-bold">VOTED</div>}
              
              <div className="text-2xl font-black mb-2">{p.name} {p.id === me.id && '(You)'}</div>
              <div className="text-md text-gray-400 font-bold tracking-widest uppercase">{p.role === '???' ? 'Hidden' : p.role}</div>
              
              {!p.isAlive && (
                <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] rounded-xl">
                   <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-black text-xl transform -rotate-12 border-2 border-red-900 shadow-2xl">ELIMINATED</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  );
}