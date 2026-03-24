# 🕵️‍♂️ Shadow State: A Real-Time Mafia Engine
[![Framework: Next.js](https://img.shields.io/badge/Framework-Next.js-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Backend: Node.js](https://img.shields.io/badge/Backend-Node.js-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Protocol: Socket.io](https://img.shields.io/badge/Protocol-Socket.io-blue?style=flat-square&logo=socket.io)](https://socket.io/)
[![Deployment: Vercel](https://img.shields.io/badge/Deployment-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

**Shadow State** is a high-performance, event-driven multiplayer social deduction game. Unlike traditional turn-based games, this engine utilizes a **synchronous state-machine** architecture to manage complex player interactions, role assignments, and real-time game loops across distributed clients.

---

## 🚀 Architectural Overview
This project was engineered with a focus on **low-latency communication** and **persistent state management**.

* **Frontend:** Built with **Next.js 16 (Turbopack)** and **Tailwind CSS**. State management is handled via **Zustand**, ensuring a reactive UI that scales with complex game data without unnecessary re-renders.
* **Backend:** A **Node.js/Express** microservice utilizing **Socket.io** for full-duplex communication.
* **Game Logic:** Implemented a custom **Game Manager** class on the server to handle:
    * Dynamic Role Distribution (Mafia, Detective, Doctor, Civilian).
    * Turn-based Night Phase sequencing.
    * Real-time Vote Tallying with tie-breaker logic.
    * Automated Win-Condition verification.

---

## 🛠️ Key Technical Features

### 1. Sequential Turn-Based Synchronization
Implemented a **State-Machine Night Cycle** where roles act in a specific sequence (Mafia → Detective → Doctor). The UI dynamically updates to provide "Ghost Turns" for dead roles, preventing information leakage to other players.

### 2. Event-Driven Messaging
Leveraged **WebSockets (WSS)** with customized CORS policies and heartbeats to ensure stable connections on distributed cloud environments (Render/Vercel). 

### 3. UX/UI Polish
* **Dramatic Overlay System:** A custom-built announcement engine that uses high-priority Z-indexing and backdrop blurs to deliver game-changing news.
* **Responsive Grid:** A mobile-first player layout that adapts to any screen size.
* **Visual Feedback:** Real-time "VOTED" markers and vote counters synced across all clients.

---

## 📦 Installation & Local Development

### Prerequisites
* Node.js (v18+)
* npm / yarn

### Step-by-Step Setup

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/zubairnajam/Mafia-Game.git](https://github.com/zubairnajam/Mafia-Game.git)
   cd Mafia-Game
