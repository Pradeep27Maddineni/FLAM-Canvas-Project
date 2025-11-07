(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const devicePixelRatio = window.devicePixelRatio || 1;

  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    redraw();
  }

  // client-side state mirror
  window.ClientState = {
    ops: [], // canonical ops mirror (server-provided)
    users: [],
    cursors: new Map(),
    localStroke: null // temporary local drawing while drawing
  };

  // Draw a stroke operation onto given context
  function drawStrokeOnContext(ctx, op) {
    if (!op || !op.points || op.points.length === 0) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = op.stroke.width;
    if (op.stroke.mode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = op.stroke.color;
    }

    const pts = op.points;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    // simple smoothing with quadratic curves (midpoint method)
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    if (pts.length > 1) {
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // full redraw (replay model)
  function redraw() {
    // clear
    ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
    // replay ops
    const ops = window.ClientState.ops || [];
    for (const op of ops) {
      drawStrokeOnContext(ctx, op);
    }
    // draw local in-progress stroke on top
    if (window.ClientState.localStroke) {
      drawStrokeOnContext(ctx, window.ClientState.localStroke);
    }
  }

  // expose API
  window.CanvasAPI = {
    initSize: fitCanvas,
    setOps(ops) {
      window.ClientState.ops = ops || [];
      redraw();
    },
    appendOp(op) {
      // avoid duplicate by id
      if (!op) return;
      const found = (window.ClientState.ops || []).some(o => o.id === op.id);
      if (!found) {
        window.ClientState.ops.push(op);
        drawStrokeOnContext(ctx, op);
      }
    },
    updateUsers(users) {
      window.ClientState.users = users || [];
      renderUsers(users);
    },
    setCursor(id, x, y, name, color) {
      window.ClientState.cursors.set(id, { x, y, name, color });
      renderCursors();
    },
    removeCursor(id) {
      window.ClientState.cursors.delete(id);
      renderCursors();
    },
    startLocalStroke(op) {
      window.ClientState.localStroke = op;
      redraw();
    },
    appendLocalPoints(points) {
      if (!window.ClientState.localStroke) return;
      window.ClientState.localStroke.points.push(...points);
      redraw();
    },
    finalizeLocalStroke() {
      if (!window.ClientState.localStroke) return;
      const op = window.ClientState.localStroke;
      window.ClientState.localStroke = null;
      // push local placeholder op into ops (so it is visible immediately as part of ops)
      window.ClientState.ops.push(op);
      redraw();
    }
  };

  // UI rendering helpers
 function renderUsers(users) {
  const ul = document.getElementById('users');
  ul.innerHTML = '';
  users.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
  users.forEach(u => {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'user-dot';
    dot.style.background = u.color;
    li.appendChild(dot);
    li.appendChild(document.createTextNode(u.name || u.id));
    ul.appendChild(li);
  });
}


  function renderCursors() {
  const container = document.getElementById('cursors');
  container.innerHTML = '';
  for (const [id, c] of window.ClientState.cursors.entries()) {
    const el = document.createElement('div');
    el.className = 'cursor';
    el.style.left = `${c.x}px`;
    el.style.top = `${c.y}px`;
    el.style.borderColor = c.color || '#333';
    el.style.background = 'rgba(255,255,255,0.95)';
    el.innerHTML = `<span style="display:inline-block;width:10px;height:10px;background:${c.color};border-radius:50%;margin-right:6px;vertical-align:middle"></span>${c.name || id}`;
    container.appendChild(el);
  }
}


  window.CanvasRedraw = redraw;

  // initialize
  setTimeout(fitCanvas, 50);
  window.addEventListener('resize', () => {
    fitCanvas();
  });
})();
