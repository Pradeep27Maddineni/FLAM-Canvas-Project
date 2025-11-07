const socket = window.__socket;

const roomInput = document.getElementById("room");
const nameInput = document.getElementById("name");
const joinBtn = document.getElementById("joinBtn");
const status = document.getElementById("status");

const toolSel = document.getElementById("tool");
const widthInput = document.getElementById("width");
const colorInput = document.getElementById("color");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const clearBtn = document.getElementById("clear");
const canvasEl = document.getElementById("canvas");

let joined = false;
let user = null;
let roomId = "main";

let drawing = false;
let lastEmit = 0;
const emitInterval = 40;
let localPointsBuffer = [];
let currentClientTempId = null;
let lastCursorTs = 0;
const cursorThrottle = 50;

// join
joinBtn.addEventListener("click", async () => {
  roomId = roomInput.value.trim() || "main";
  const username = nameInput.value.trim() || "Anon";

  await connectAndJoin(roomId, username, (msg) => {
    user = msg.user;
    CanvasAPI.updateUsers(msg.users);
    CanvasAPI.setOps(msg.ops || []);
    status.innerText = `Connected as ${user.name}`;
    joined = true;
  });
});

function currentStrokeMeta() {
  return {
    color: colorInput.value,
    width: parseInt(widthInput.value, 10),
    mode: toolSel.value,
  };
}

function emitBegin() {
  const stroke = currentStrokeMeta();
  currentClientTempId = "local-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
  const op = {
    id: currentClientTempId,
    clientId: currentClientTempId,
    type: "stroke",
    user: user.id,
    stroke,
    points: [],
  };
  CanvasAPI.startLocalStroke(op);

  socket.emit("beginStroke", { roomId, stroke, clientId: currentClientTempId }, (ack) => {
    if (ack && ack.op && window.ClientState.localStroke) {
      window.ClientState.localStroke.id = ack.op.id;
    }
  });
}

function emitPoints() {
  if (localPointsBuffer.length === 0) return;
  const pts = localPointsBuffer.slice();
  socket.emit("strokePoints", { roomId, points: pts });
  localPointsBuffer = [];
}

function emitEnd() {
  socket.emit("endStroke", { roomId });
  CanvasAPI.finalizeLocalStroke();
  currentClientTempId = null;
}

function setupPointer() {
  const rect = () => canvasEl.getBoundingClientRect();

  function toLocalCoords(e) {
    const r = rect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvasEl.addEventListener("pointerdown", (e) => {
    if (!joined) return alert("Join a room first");
    drawing = true;
    localPointsBuffer = [];
    const p = toLocalCoords(e);
    localPointsBuffer.push(p);
    emitBegin();
    CanvasAPI.appendLocalPoints([p]);
    lastEmit = Date.now();
    canvasEl.setPointerCapture?.(e.pointerId);
  });

  canvasEl.addEventListener("pointermove", (e) => {
    const p = toLocalCoords(e);
    const now = Date.now();
    if (now - lastCursorTs > cursorThrottle) {
      socket.emit("cursor", { roomId, x: p.x, y: p.y });
      lastCursorTs = now;
    }
    if (!drawing) return;
    localPointsBuffer.push(p);
    CanvasAPI.appendLocalPoints([p]);
    if (Date.now() - lastEmit > emitInterval) {
      emitPoints();
      lastEmit = Date.now();
    }
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => {
    canvasEl.addEventListener(ev, (e) => {
      if (!drawing) return;
      drawing = false;
      emitPoints();
      emitEnd();
      canvasEl.releasePointerCapture?.(e.pointerId);
    });
  });
}

undoBtn.addEventListener("click", () => {
  if (!joined) return alert("Join first");
  socket.emit("undo", { roomId });
});

redoBtn.addEventListener("click", () => {
  if (!joined) return alert("Join first");
  socket.emit("redo", { roomId });
});

clearBtn.addEventListener("click", () => {
  if (!joined) return alert("Join first");
  if (!confirm("Clear canvas for everyone?")) return;
  socket.emit("clear", { roomId });
});

// socket event listeners
socket.on("users-update", ({ users }) => {
  CanvasAPI.updateUsers(users);
});

socket.on("cursor", ({ socketId, x, y }) => {
  const u = (window.ClientState.users || []).find((u) => u.id === socketId) || {};
  CanvasAPI.setCursor(socketId, x, y, u.name, u.color);
  setTimeout(() => CanvasAPI.removeCursor(socketId), 2000);
});

socket.on("beginStroke", ({ op }) => {
  const exists = (window.ClientState.ops || []).some((o) => o.id === op.id);
  if (!exists) {
    op.points = op.points || [];
    window.ClientState.ops.push(op);
    CanvasRedraw();
  }
});

socket.on("strokePoints", ({ opId, points }) => {
  const ops = window.ClientState.ops;
  let op = ops.find((o) => o.id === opId);
  if (!op) {
    op = { id: opId, type: "stroke", user: null, stroke: { color: "#000", width: 4, mode: "brush" }, points: [] };
    ops.push(op);
  }
  op.points.push(...points);
  CanvasRedraw();
});

socket.on("endStroke", ({ op }) => {
  const ops = window.ClientState.ops;
  const idx = ops.findIndex((o) => o.id === op.id || o.clientId === op.clientId);
  if (idx >= 0) ops[idx] = op;
  else ops.push(op);
  CanvasRedraw();
});

socket.on('ops-replaced', ({ ops, action }) => {
  CanvasAPI.setOps(ops || []);
  if (action && action.by) {
    const who = action.by.name || 'Someone';
    const msg = action.type === 'undo' ? `${who} performed Undo` : `${who} performed Redo`;
    showTransientStatus(msg); // implement small helper below
  }
});

function showTransientStatus(text) {
  const s = document.getElementById('status');
  const prev = s.innerText;
  s.innerText = text;
  setTimeout(()=> s.innerText = prev, 1500);
}


CanvasAPI.initSize();
setupPointer();
