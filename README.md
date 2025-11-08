# Collaborative Canvas

A **real-time collaborative drawing application** built using  
**Vanilla JavaScript**, **HTML5 Canvas**, **Node.js**, and **Socket.io**.

Multiple users can draw together on the same canvas,  
see each other's drawings live, and use **global undo/redo** — all synchronized in real time.

---

##  Setup Instructions

To run this project locally:

### Step 1: Clone the repository
git clone https://github.com/Pradeep27Maddineni/FLAM-Canvas-Project.git
cd collaborative-canvas

### Step 2: Install dependencies


npm install


### Step 3: Start the server


npm start


Then open **http://localhost:3000** in your browser.  
You should see the collaborative drawing canvas load.

---

## 🧪 How to Test with Multiple Users

1. Open **two or more browser tabs** (or use two different browsers/devices).  
2. In each tab:
   - Enter a **room name** (e.g., `main`)
   - Enter your **username**
   - Click **Join**
3. Start drawing in one tab — other tabs update live.
4. Try:
   - **Brush / Eraser** tools  
   - **Color & Stroke Width** adjustments  
   - **Undo / Redo / Clear** buttons  
5. Move your cursor — others see it labeled with your username.
6. Close one tab — that user disappears from the "Users Online" list.

---

## Known Limitations / Bugs

| Issue | Description |
|--------|--------------|
| **Persistence** | Canvas resets on server restart (no database yet). |
| **Heavy Load** | Minor lag may appear with 50+ simultaneous users. |
| **Global Undo/Redo** | Affects all users (not per-user yet). |
| **Eraser** | Works pixel-wise, not vector-based. |
| **Mobile** | Touch drawing supported, but no pressure sensitivity. |

---

## Time Spent on the Project

| Task | Duration |
|-------|-----------|
| Research & Planning | 3 hours |
| Canvas + WebSocket Implementation | 6 hours |
| Undo/Redo Logic | 3 hours |
| UI & User Cursors | 2 hours |
| Documentation | 1 hour |
| **Total** | **15 hours (approx.)** |

---

## 🚀 Submission Method

Please follow the steps below to submit your project for review.

###  GitHub Repository

- Push complete project to a GitHub repository.  
- Repository can be **public** or **private** (but must grant access to reviewers).  
- Make sure your repo includes:
  - `/client` folder (frontend files: `index.html`, `style.css`, `canvas.js`, `websocket.js`, etc.)
  - `/server` folder (backend files: `server.js`, `rooms.js`, `drawing-state.js`, etc.)
  - `README.md` (setup instructions, testing guide, known limitations)
  - `ARCHITECTURE.md` (architecture overview and technical explanation)
  - `package.json` (dependencies and start scripts)

Example repository structure:
```bash
collaborative-canvas/
├── client/
│   ├── index.html
│   ├── style.css
│   ├── canvas.js
│   ├── websocket.js
│   └── main.js
├── server/
│   ├── server.js
│   ├── rooms.js
│   └── drawing-state.js
├── README.md
├── ARCHITECTURE.md
└── package.json

