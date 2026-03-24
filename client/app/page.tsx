'use client';
import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/userStore';

/* ─────────────────────────────────────────────────────────────────────────────
   FONTS injected via <style> — Playfair Display + DM Sans
   No emoji in UI chrome. SVG icons only. Noise texture via inline SVG filter.
───────────────────────────────────────────────────────────────────────────── */

const MAFIA_ROLES = ['MAFIA', 'GODFATHER', 'FATHER_MAFIA'];

const ROLE_META: Record<string, { label: string; color: string; glyph: string }> = {
  MAFIA:       { label: 'Mafia',        color: '#c0392b', glyph: '✦' },
  GODFATHER:   { label: 'Godfather',    color: '#922b21', glyph: '✦' },
  FATHER_MAFIA:{ label: 'Father Mafia', color: '#a93226', glyph: '✦' },
  DETECTIVE:   { label: 'Detective',    color: '#1a6fa8', glyph: '◎' },
  DOCTOR:      { label: 'Doctor',       color: '#1e8449', glyph: '✚' },
  CUPID:       { label: 'Cupid',        color: '#8e44ad', glyph: '◆' },
  CIVILIAN:    { label: 'Civilian',     color: '#7f8c8d', glyph: '●' },
  '???':       { label: 'Unknown',      color: '#4a4a4a', glyph: '?' },
};

function getRoleMeta(role: string) {
  return ROLE_META[role] ?? ROLE_META['???'];
}

/* ── Shared CSS injected once ─────────────────────────────────────────────── */
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --ink:        #0d0b08;
  --felt:       #111009;
  --card-bg:    #1a1710;
  --card-bg2:   #211f15;
  --border:     rgba(212,180,100,0.18);
  --border-hi:  rgba(212,180,100,0.5);
  --gold:       #c9a84c;
  --gold-dim:   rgba(201,168,76,0.12);
  --gold-glow:  rgba(201,168,76,0.25);
  --cream:      #e8dfc4;
  --muted:      #7a7060;
  --red:        #c0392b;
  --red-dim:    rgba(192,57,43,0.15);
  --green:      #1e8449;
  --blue:       #1a6fa8;
  --serif:      'Playfair Display', Georgia, serif;
  --sans:       'DM Sans', system-ui, sans-serif;
  --radius:     4px;
  --radius-lg:  10px;
}

html, body { height: 100%; background: var(--ink); color: var(--cream); font-family: var(--sans); font-size: 15px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
#root, body > div { min-height: 100vh; }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--ink); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* noise overlay — single SVG filter applied to body via pseudo */
body::before {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  opacity: 1;
}

/* vignette */
body::after {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.65) 100%);
}

.layer { position: relative; z-index: 1; }

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 26px; border: 1px solid var(--border-hi);
  background: transparent; color: var(--gold);
  font-family: var(--serif); font-size: 13px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
  border-radius: var(--radius); transition: all 0.2s;
  position: relative; overflow: hidden;
}
.btn::before {
  content: ''; position: absolute; inset: 0;
  background: var(--gold-dim); opacity: 0; transition: opacity 0.2s;
}
.btn:hover::before { opacity: 1; }
.btn:hover { border-color: var(--gold); box-shadow: 0 0 20px var(--gold-glow); }
.btn:disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }

.btn-fill {
  background: var(--gold); color: var(--ink); border-color: var(--gold);
  font-weight: 700;
}
.btn-fill:hover { background: #dbb855; box-shadow: 0 0 28px var(--gold-glow); }
.btn-fill::before { display: none; }

.btn-danger { border-color: rgba(192,57,43,0.5); color: var(--red); }
.btn-danger:hover { border-color: var(--red); box-shadow: 0 0 20px rgba(192,57,43,0.25); }

/* ── Inputs ── */
.field {
  width: 100%; padding: 12px 16px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--border);
  border-radius: var(--radius); color: var(--cream);
  font-family: var(--sans); font-size: 15px; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field::placeholder { color: var(--muted); }
.field:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
.field.mono { font-family: 'Courier New', monospace; letter-spacing: 0.2em; font-size: 17px; text-transform: uppercase; }

/* ── Ornamental divider ── */
.ornament {
  display: flex; align-items: center; gap: 12px;
  color: var(--muted); font-size: 11px; letter-spacing: 0.2em;
  margin: 6px 0;
}
.ornament::before, .ornament::after { content: ''; flex: 1; height: 1px; background: var(--border); }

/* ── Announcement cinematic overlay ── */
.cinematic {
  position: fixed; inset: 0; z-index: 200;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.92);
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.cinematic-text {
  font-family: var(--serif); font-size: clamp(2rem, 6vw, 4.5rem);
  font-weight: 700; font-style: italic;
  color: var(--cream); text-align: center; padding: 0 32px;
  line-height: 1.25; max-width: 800px;
  text-shadow: 0 2px 40px rgba(0,0,0,0.8);
}
.cinematic-rule {
  width: 80px; height: 2px; background: var(--gold);
  margin: 24px auto 0;
  animation: expand 4.5s linear forwards;
}
@keyframes expand { from { width: 0; } to { width: 280px; } }

/* ── Player card ── */
.p-card {
  position: relative;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 22px 16px 18px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 140px;
  cursor: default;
  transition: all 0.2s ease;
  overflow: hidden;
}
.p-card::before {
  content: ''; position: absolute; inset: 0; border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 60%);
  pointer-events: none;
}
.p-card.selectable { cursor: pointer; }
.p-card.selectable:hover {
  border-color: var(--gold);
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px var(--gold-glow);
  background: var(--card-bg2);
}
.p-card.selected {
  border-color: var(--gold);
  box-shadow: 0 0 0 2px var(--gold), 0 8px 32px rgba(0,0,0,0.5);
  background: var(--card-bg2);
}
.p-card.dead { opacity: 0.38; filter: grayscale(0.7); pointer-events: none; }

/* ── Scroll-area for chat ── */
.scroll-area { overflow-y: auto; flex: 1; min-height: 0; }

@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.slide-up { animation: slideUp 0.35s ease forwards; }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT EXPORT
───────────────────────────────────────────────────────────────────────────── */
export default function Home() {
  const { connect, roomData, createRoom, joinRoom, socket } = useStore();
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');

  useEffect(() => { connect(); }, [connect]);

  if (!roomData) {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>
        <div className="layer" style={s.landingWrap}>

          {/* Background city silhouette */}
          <div style={s.cityBg} aria-hidden />

          <div style={s.landingCard} className="slide-up">
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={s.logoGlyph}>✦</div>
              <h1 style={s.logoTitle}>MAFIA</h1>
              <p style={s.logoSub}>A Game of Deception &amp; Trust</p>
            </div>

            {/* Tab switcher */}
            <div style={s.tabRow}>
              {(['create', 'join'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    ...s.tab,
                    ...(tab === t ? s.tabActive : {}),
                  }}
                >
                  {t === 'create' ? 'Create Room' : 'Join Room'}
                </button>
              ))}
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={s.label}>Your Name</label>
                <input
                  className="field"
                  placeholder="Enter your alias"
                  value={nameInput}
                  maxLength={20}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? createRoom(nameInput) : joinRoom(codeInput.toUpperCase(), nameInput))}
                />
              </div>

              {tab === 'join' && (
                <div>
                  <label style={s.label}>Room Code</label>
                  <input
                    className="field mono"
                    placeholder="XXXX"
                    maxLength={4}
                    value={codeInput}
                    onChange={e => setCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && joinRoom(codeInput.toUpperCase(), nameInput)}
                  />
                </div>
              )}

              <button
                className="btn btn-fill"
                style={{ width: '100%', marginTop: 4, padding: '13px 26px', fontSize: 14 }}
                onClick={() => tab === 'create' ? createRoom(nameInput) : joinRoom(codeInput.toUpperCase(), nameInput)}
              >
                {tab === 'create' ? 'Open the Room' : 'Enter the Room'}
              </button>
            </div>

            <div className="ornament" style={{ marginTop: 20 }}>
              <span>4 – 20 players · No account needed</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (roomData.status === 'LOBBY') return <LobbyScreen />;
  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <GameScreen />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LOBBY
───────────────────────────────────────────────────────────────────────────── */
function LobbyScreen() {
  const { roomData, socket } = useStore();
  const isHost = roomData.host === socket?.id;

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div className="layer" style={s.lobbyWrap}>
        <div style={s.lobbyInner}>

          {/* Left — room info */}
          <div style={s.lobbyLeft}>
            <div style={s.panelBox}>
              <p style={s.panelLabel}>Room Code</p>
              <div style={s.roomCode}>{roomData.code}</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8, fontFamily: 'var(--sans)' }}>
                Share this code with your crew
              </p>
            </div>

            <div style={{ ...s.panelBox, flex: 1 }}>
              <div style={s.panelHeader}>
                <span style={s.panelTitle}>Players</span>
                <span style={s.countBadge}>{roomData.players.length}</span>
              </div>
              <hr style={s.hr} />
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {roomData.players.map((p: any, i: number) => (
                  <li key={p.id} style={s.playerRow} className="slide-up">
                    <div style={s.playerDot} />
                    <span style={s.playerName}>
                      {p.name}
                      {p.id === socket?.id && <span style={s.youTag}> — you</span>}
                    </span>
                    {p.id === roomData.host && (
                      <span style={s.hostBadge}>Host</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right — start */}
          <div style={s.lobbyRight}>
            <div style={s.panelBox}>
              <h2 style={s.lobbyHeading}>The Night Awaits</h2>
              <p style={s.lobbyDesc}>
                Roles will be assigned at random. Mafia members will know each other.
                Town must root them out before it's too late.
              </p>
              <div className="ornament" style={{ margin: '20px 0' }}>
                <span>minimum 4 players</span>
              </div>

              {isHost ? (
                <button
                  className="btn btn-fill"
                  style={{ width: '100%', padding: '14px', fontSize: 14 }}
                  disabled={roomData.players.length < 4}
                  onClick={() => useStore.getState().startGame()}
                >
                  Begin the Game
                </button>
              ) : (
                <div style={s.waitingBox}>
                  <div style={s.waitingDot} />
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--sans)', fontSize: 14 }}>
                    Waiting for the host to start...
                  </span>
                </div>
              )}
            </div>

            {/* Role legend */}
            <div style={s.panelBox}>
              <p style={s.panelLabel}>Roles in this game</p>
              <hr style={s.hr} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {[
                  { role: 'MAFIA', desc: 'Eliminate town each night' },
                  { role: 'DETECTIVE', desc: 'Investigate one player per night' },
                  { role: 'DOCTOR', desc: 'Protect one player per night' },
                  { role: 'CIVILIAN', desc: 'Vote out suspects by day' },
                ].map(({ role, desc }) => {
                  const m = getRoleMeta(role);
                  return (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: m.color, fontSize: 12, width: 14, textAlign: 'center' }}>{m.glyph}</span>
                      <span style={{ color: 'var(--cream)', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, minWidth: 90 }}>{m.label}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAFIA CHAT
───────────────────────────────────────────────────────────────────────────── */
function MafiaChat({ roomCode }: { roomCode: string }) {
  const { socket, mafiaChatMessages } = useStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mafiaChatMessages.length]);

  const send = () => {
    const msg = input.trim();
    if (!msg || !socket) return;
    socket.emit('mafiaChatMessage', { roomCode, message: msg });
    setInput('');
  };

  return (
    <div style={s.chatWrap}>
      <div style={s.chatHeader}>
        <span style={{ color: 'var(--red)', fontSize: 11, letterSpacing: '0.1em' }}>✦</span>
        <span style={s.chatTitle}>Encrypted Channel</span>
        <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 'auto', fontFamily: 'var(--sans)' }}>MAFIA ONLY</span>
      </div>

      <div className="scroll-area" style={s.chatMessages}>
        {mafiaChatMessages.length === 0 && (
          <p style={s.chatEmpty}>Speak freely. This channel is yours alone.</p>
        )}
        {mafiaChatMessages.map((m: any, i: number) => (
          <div key={i} style={s.chatMsg}>
            <span style={s.chatSender}>{m.senderName}</span>
            <span style={s.chatText}>{m.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={s.chatInputRow}>
        <input
          className="field"
          style={{ flex: 1, padding: '9px 12px', fontSize: 14, background: 'rgba(192,57,43,0.06)', borderColor: 'rgba(192,57,43,0.25)' }}
          placeholder="Message your team..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
          maxLength={200}
        />
        <button className="btn btn-danger btn-sm" onClick={send} style={{ padding: '9px 16px', fontSize: 13 }}>
          Send
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GAME SCREEN
───────────────────────────────────────────────────────────────────────────── */
function GameScreen() {
  const { roomData, socket, submitNightAction, submitDayVote, announcement, investigationResult } = useStore();
  const me = roomData.players.find((p: any) => p.id === socket?.id);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => { setSelectedTarget(null); }, [roomData.status]);

  if (!me) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--gold)', fontStyle: 'italic' }}>
          Connecting to the room...
        </p>
      </div>
    );
  }

  const isMafia = MAFIA_ROLES.includes(me.role);
  const isNight = roomData.status.includes('TURN');
  const meta = getRoleMeta(me.role);

  /* ── Game Over ── */
  if (roomData.status === 'END') {
    const mafiaWon = roomData.winner === 'MAFIA';
    const iWon = (mafiaWon && isMafia) || (!mafiaWon && !isMafia);

    return (
      <div style={s.endWrap} className="layer">
        <div style={s.endInner} className="slide-up">
          <p style={s.endEyebrow}>— Game Over —</p>
          <h1 style={{ ...s.endTitle, color: mafiaWon ? 'var(--red)' : '#1e8449' }}>
            {mafiaWon ? 'The Mafia Prevails' : 'The Town Survives'}
          </h1>
          <p style={s.endSub}>
            {mafiaWon ? 'Darkness has consumed the town.' : 'Justice has been served.'}
          </p>
          <div style={{ ...s.endBadge, borderColor: iWon ? '#1e8449' : 'var(--red)', color: iWon ? '#1e8449' : 'var(--red)' }}>
            {iWon ? 'Victory' : 'Defeated'}
          </div>

          <div style={s.revealTable}>
            <div style={s.revealHeader}>Final Roles</div>
            {roomData.players.map((p: any) => {
              const pm = getRoleMeta(p.role);
              const evil = MAFIA_ROLES.includes(p.role);
              return (
                <div key={p.id} style={s.revealRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.isAlive ? '#1e8449' : 'var(--muted)', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 15, textDecoration: p.isAlive ? 'none' : 'line-through', color: p.isAlive ? 'var(--cream)' : 'var(--muted)' }}>
                      {p.name}{p.id === socket?.id && <span style={{ color: 'var(--muted)', fontSize: 12 }}> (you)</span>}
                    </span>
                  </div>
                  <span style={{ ...s.rolePill, background: evil ? 'rgba(192,57,43,0.15)' : 'rgba(30,132,73,0.12)', color: pm.color, borderColor: evil ? 'rgba(192,57,43,0.35)' : 'rgba(30,132,73,0.3)' }}>
                    {pm.glyph} {pm.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--sans)', marginTop: 24 }}>
            Refresh the page to start a new game
          </p>
        </div>
      </div>
    );
  }

  /* ── Phase subtitle ── */
  const getSubtitle = () => {
    if (!me.isAlive) return 'You have been eliminated. Watch silently.';
    if (selectedTarget) return 'Locked in. Waiting for others...';
    if (roomData.status === 'DAY') return 'The town convenes. Discuss, then cast your vote.';
    if (roomData.status === 'MAFIA_TURN') return isMafia ? 'Choose your target for tonight.' : 'The night is quiet. Something stirs in the dark...';
    if (roomData.status === 'DETECTIVE_TURN') return me.role === 'DETECTIVE' ? 'Choose someone to investigate.' : 'A shadow moves through the alleys...';
    if (roomData.status === 'DOCTOR_TURN') return me.role === 'DOCTOR' ? 'Choose someone to protect.' : 'A lantern flickers in the dark...';
    return 'The town sleeps.';
  };

  const canInteract = (p: any) => {
    if (!me.isAlive || !p.isAlive || selectedTarget) return false;
    if (roomData.status === 'DAY') return p.id !== me.id;
    if (roomData.status === 'MAFIA_TURN' && isMafia) return !MAFIA_ROLES.includes(p.role);
    if (roomData.status === 'DETECTIVE_TURN' && me.role === 'DETECTIVE') return p.id !== me.id;
    if (roomData.status === 'DOCTOR_TURN' && me.role === 'DOCTOR') return true;
    return false;
  };

  const showMafiaChat = isMafia && me.isAlive && isNight;

  return (
    <div
      className="layer"
      style={{
        minHeight: '100vh',
        padding: '24px',
        background: isNight
          ? 'radial-gradient(ellipse at 50% 0%, #1a1508 0%, #0d0b08 70%)'
          : 'radial-gradient(ellipse at 50% 0%, #1c1a0e 0%, #0d0b08 70%)',
        transition: 'background 1.2s ease',
      }}
    >
      {/* ── Cinematic Announcement ── */}
      {announcement && (
        <div className="cinematic">
          <div className="cinematic-text">{announcement}</div>
          <div className="cinematic-rule" />
        </div>
      )}

      {/* ── Investigation Toast ── */}
      {investigationResult && (
        <div style={s.toast}>
          {investigationResult}
        </div>
      )}

      {/* ── Header bar ── */}
      <header style={{ ...s.header, borderColor: isNight ? 'rgba(212,180,100,0.12)' : 'rgba(212,180,100,0.18)' }}>
        <div>
          <div style={s.phaseEyebrow}>
            {isNight ? 'Night Phase' : 'Day Phase'}
          </div>
          <p style={s.phaseSubtitle}>{getSubtitle()}</p>
        </div>

        <div style={s.identityBox}>
          <p style={s.identityLabel}>Your Role</p>
          <p style={{ ...s.identityRole, color: meta.color }}>
            {meta.glyph} {meta.label}
          </p>
        </div>
      </header>

      {/* ── Body: grid + optional chat ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginTop: 20 }}>

        {/* Player grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 14,
          flex: 1,
        }}>
          {roomData.players.map((p: any) => {
            const interactable = canInteract(p);
            const myId = socket?.id ?? '';
            const hasMyVote = roomData.votes?.[myId] === p.id;
            const voteCount = roomData.status === 'DAY'
              ? Object.values(roomData.votes ?? {}).filter(v => v === p.id).length
              : 0;
            const pm = getRoleMeta(p.role);
            const isSelected = hasMyVote || selectedTarget === p.id;

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!interactable) return;
                  setSelectedTarget(p.id);
                  if (roomData.status.includes('TURN')) submitNightAction(p.id, me.role);
                  else if (roomData.status === 'DAY') submitDayVote(p.id);
                }}
                className={[
                  'p-card',
                  !p.isAlive ? 'dead' : '',
                  interactable ? 'selectable' : '',
                  isSelected ? 'selected' : '',
                ].join(' ')}
              >
                {/* Vote count badge */}
                {voteCount > 0 && (
                  <div style={s.voteBadge}>{voteCount}</div>
                )}

                {/* Selected/voted checkmark */}
                {isSelected && p.isAlive && (
                  <div style={s.selectedBadge}>&#10003;</div>
                )}

                {/* Role glyph */}
                <div style={{ ...s.cardGlyph, color: pm.color }}>{pm.glyph}</div>

                {/* Name */}
                <div style={s.cardName}>
                  {p.name}
                  {p.id === me.id && <span style={{ color: 'var(--muted)', fontSize: 11 }}> (you)</span>}
                </div>

                {/* Role label — only show own or revealed */}
                <div style={{ ...s.cardRole, color: pm.color }}>
                  {p.role === '???' ? '· · ·' : pm.label}
                </div>

                {/* Eliminated stamp */}
                {!p.isAlive && (
                  <div style={s.eliminatedStamp}>
                    Eliminated
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mafia chat — only for mafia during night */}
        {showMafiaChat && (
          <div style={{ width: 300, flexShrink: 0, height: 480 }}>
            <MafiaChat roomCode={roomData.code} />
          </div>
        )}
      </div>

      {/* LinkedIn */}
      <a
        href="https://www.linkedin.com/in/zubair-najam"
        target="_blank"
        rel="noopener noreferrer"
        style={s.linkedin}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      </a>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLE OBJECTS  (inline styles keep everything in one file)
───────────────────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  /* Landing */
  landingWrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
    background: 'radial-gradient(ellipse at 50% 30%, #1e1a0c 0%, #0a0907 100%)',
  },
  cityBg: {
    position: 'fixed', bottom: 0, left: 0, right: 0, height: '45vh',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 300'%3E%3Crect x='0' y='180' width='60' height='120' fill='%23111009'/%3E%3Crect x='80' y='140' width='80' height='160' fill='%230e0d08'/%3E%3Crect x='180' y='100' width='50' height='200' fill='%23111009'/%3E%3Crect x='250' y='160' width='90' height='140' fill='%230e0d08'/%3E%3Crect x='360' y='120' width='60' height='180' fill='%23111009'/%3E%3Crect x='440' y='80' width='100' height='220' fill='%230e0d08'/%3E%3Crect x='560' y='150' width='70' height='150' fill='%23111009'/%3E%3Crect x='650' y='110' width='85' height='190' fill='%230e0d08'/%3E%3Crect x='755' y='170' width='55' height='130' fill='%23111009'/%3E%3Crect x='830' y='90' width='95' height='210' fill='%230e0d08'/%3E%3Crect x='945' y='140' width='65' height='160' fill='%23111009'/%3E%3Crect x='1030' y='115' width='80' height='185' fill='%230e0d08'/%3E%3Crect x='1130' y='160' width='70' height='140' fill='%23111009'/%3E%3C/svg%3E")`,
    backgroundSize: 'cover', backgroundPosition: 'bottom',
    opacity: 0.6, pointerEvents: 'none', zIndex: 0,
  },
  landingCard: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: 420,
    background: 'rgba(20,18,10,0.92)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '44px 40px 36px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,180,100,0.08)',
  },
  logoGlyph: {
    fontSize: 28, color: 'var(--gold)', display: 'block',
    marginBottom: 8, letterSpacing: '0.3em',
  },
  logoTitle: {
    fontFamily: 'var(--serif)', fontSize: 52, fontWeight: 900,
    letterSpacing: '0.35em', color: 'var(--gold)',
    textShadow: '0 0 60px rgba(201,168,76,0.3)',
    lineHeight: 1,
  },
  logoSub: {
    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15,
    color: 'var(--muted)', letterSpacing: '0.08em', marginTop: 8,
  },
  tabRow: {
    display: 'flex', gap: 0,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border)',
    borderRadius: 6, overflow: 'hidden', marginBottom: 20,
  },
  tab: {
    flex: 1, padding: '10px 8px',
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
    color: 'var(--muted)', letterSpacing: '0.04em',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'var(--gold-dim)', color: 'var(--gold)',
    borderBottom: '2px solid var(--gold)',
  },
  label: {
    display: 'block', fontFamily: 'var(--sans)', fontSize: 11,
    fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--muted)', marginBottom: 6,
  },

  /* Lobby */
  lobbyWrap: {
    minHeight: '100vh', padding: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    paddingTop: 60,
    background: 'radial-gradient(ellipse at 50% 0%, #1a1710 0%, #0d0b08 80%)',
  },
  lobbyInner: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
    maxWidth: 860, width: '100%',
  },
  lobbyLeft: { display: 'flex', flexDirection: 'column', gap: 16 },
  lobbyRight: { display: 'flex', flexDirection: 'column', gap: 16 },
  panelBox: {
    background: 'var(--card-bg)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '24px',
  },
  panelLabel: {
    fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)',
    marginBottom: 10,
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  panelTitle: {
    fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: 'var(--cream)',
  },
  countBadge: {
    background: 'var(--gold-dim)', color: 'var(--gold)',
    border: '1px solid rgba(201,168,76,0.3)',
    fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700,
    padding: '2px 10px', borderRadius: 100,
  },
  roomCode: {
    fontFamily: "'Courier New', monospace", fontSize: 44, fontWeight: 700,
    letterSpacing: '0.25em', color: 'var(--gold)',
    textShadow: '0 0 30px rgba(201,168,76,0.3)',
  },
  hr: { border: 'none', height: 1, background: 'var(--border)', marginBottom: 12 },
  playerRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border)',
    borderRadius: 6,
  },
  playerDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#1e8449', boxShadow: '0 0 6px rgba(30,132,73,0.6)',
    flexShrink: 0,
  },
  playerName: { fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--cream)', flex: 1 },
  youTag: { color: 'var(--muted)', fontSize: 13 },
  hostBadge: {
    fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--gold)', background: 'var(--gold-dim)',
    border: '1px solid rgba(201,168,76,0.25)',
    padding: '2px 8px', borderRadius: 100,
  },
  lobbyHeading: {
    fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, fontStyle: 'italic',
    color: 'var(--cream)', marginBottom: 12,
  },
  lobbyDesc: {
    fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.65,
  },
  waitingBox: {
    display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
    padding: '14px', border: '1px solid var(--border)', borderRadius: 6,
  },
  waitingDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--gold)', animation: 'pulse 2s infinite',
  },

  /* Game header */
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px',
    background: 'rgba(13,11,8,0.7)',
    border: '1px solid',
    borderRadius: 8,
    backdropFilter: 'blur(8px)',
  },
  phaseEyebrow: {
    fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, fontStyle: 'italic',
    color: 'var(--gold)',
  },
  phaseSubtitle: {
    fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--muted)', marginTop: 4,
  },
  identityBox: { textAlign: 'right' },
  identityLabel: {
    fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4,
  },
  identityRole: {
    fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700,
  },

  /* Player card */
  cardGlyph: {
    fontSize: 22, marginBottom: 8,
  },
  cardName: {
    fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600,
    color: 'var(--cream)', textAlign: 'center', marginBottom: 4,
  },
  cardRole: {
    fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500,
    letterSpacing: '0.1em', textTransform: 'uppercase',
  },
  voteBadge: {
    position: 'absolute', top: -8, left: -8,
    width: 24, height: 24, borderRadius: '50%',
    background: 'var(--gold)', color: 'var(--ink)',
    fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },
  selectedBadge: {
    position: 'absolute', top: -8, right: -8,
    width: 22, height: 22, borderRadius: '50%',
    background: '#1e8449', color: '#fff',
    fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  eliminatedStamp: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)',
    borderRadius: 10,
    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14,
    color: 'var(--red)', letterSpacing: '0.06em',
    border: '1px solid rgba(192,57,43,0.3)',
  },

  /* Announcement */
  toast: {
    position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
    background: 'var(--blue)', color: '#fff',
    fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15,
    padding: '12px 28px', borderRadius: 100,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    zIndex: 150, whiteSpace: 'nowrap',
  },

  /* Mafia chat */
  chatWrap: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: 'rgba(30,8,8,0.95)',
    border: '1px solid rgba(192,57,43,0.3)',
    borderRadius: 10, overflow: 'hidden',
  },
  chatHeader: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px',
    borderBottom: '1px solid rgba(192,57,43,0.2)',
    background: 'rgba(192,57,43,0.08)',
  },
  chatTitle: {
    fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red)',
  },
  chatMessages: { padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 },
  chatEmpty: {
    color: 'rgba(192,57,43,0.4)', fontSize: 12, fontStyle: 'italic',
    textAlign: 'center', padding: '20px 8px', fontFamily: 'var(--sans)',
  },
  chatMsg: { display: 'flex', flexDirection: 'column', gap: 1 },
  chatSender: {
    fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700,
    color: 'rgba(192,57,43,0.9)', letterSpacing: '0.06em', textTransform: 'uppercase',
  },
  chatText: {
    fontFamily: 'var(--sans)', fontSize: 14, color: 'rgba(232,223,196,0.85)',
    lineHeight: 1.4,
  },
  chatInputRow: {
    display: 'flex', gap: 8, padding: '10px 12px',
    borderTop: '1px solid rgba(192,57,43,0.2)',
  },

  /* End screen */
  endWrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 32,
    background: 'radial-gradient(ellipse at 50% 30%, #130d0d 0%, #0a0807 100%)',
  },
  endInner: {
    maxWidth: 600, width: '100%', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
  },
  endEyebrow: {
    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16,
    color: 'var(--muted)', letterSpacing: '0.15em', marginBottom: 16,
  },
  endTitle: {
    fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 7vw, 72px)',
    fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1,
  },
  endSub: {
    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18,
    color: 'var(--muted)', marginTop: 12, marginBottom: 24,
  },
  endBadge: {
    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, fontWeight: 700,
    padding: '8px 32px', border: '1px solid', borderRadius: 4, marginBottom: 32,
  },
  revealTable: {
    width: '100%', background: 'var(--card-bg)',
    border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
  },
  revealHeader: {
    padding: '12px 20px', borderBottom: '1px solid var(--border)',
    fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)',
  },
  revealRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)',
  },
  rolePill: {
    fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    padding: '3px 12px', borderRadius: 100, border: '1px solid',
  },

  /* LinkedIn */
  linkedin: {
    position: 'fixed', bottom: 18, right: 18,
    color: 'var(--muted)', background: 'var(--card-bg)',
    border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px', display: 'flex', alignItems: 'center',
    transition: 'all 0.2s', textDecoration: 'none',
    zIndex: 60,
  },
};