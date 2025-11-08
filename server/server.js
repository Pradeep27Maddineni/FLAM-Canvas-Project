const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Rooms = require('./rooms');

const app = express();
app.use(cors());

const path = require('path');
app.use(express.static(path.join(__dirname, '../client')));


const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

const rooms = new Rooms();

io.on('connection', socket => {
  console.log('connected', socket.id);

  socket.on('join-room', ({ roomId, username }, ack) => {
    if (!roomId) roomId = 'main';
    socket.join(roomId);
    const user = rooms.addUser(roomId, socket.id, username || 'Anonymous');
    const state = rooms.getState(roomId);
    // send init-state to the new socket
    socket.emit('init-state', { user, users: state.users, ops: state.opsSnapshot });
    // notify all in room about users
    io.to(roomId).emit('users-update', { users: rooms.getUsers(roomId) });
    ack && ack({ ok: true, user });
  });

  socket.on('cursor', ({ roomId, x, y }) => {
    socket.to(roomId).emit('cursor', { socketId: socket.id, x, y });
  });

  // beginStroke includes optional clientTempId so client can reconcile later
  socket.on('beginStroke', ({ roomId, stroke, clientId }, ack) => {
    const op = rooms.beginStroke(roomId, socket.id, stroke, clientId);
    // broadcast begin to others
    socket.to(roomId).emit('beginStroke', { op });
    // acknowledge to sender with op (includes server id and clientId)
    ack && ack({ op });
  });

  // batched points append
  socket.on('strokePoints', ({ roomId, points }) => {
    const op = rooms.appendPoints(roomId, socket.id, points);
    if (op) {
      // broadcast appended points to others (op.id is server id)
      socket.to(roomId).emit('strokePoints', { opId: op.id, points });
    }
  });

  // finalize stroke
  socket.on('endStroke', ({ roomId }) => {
    const finalizedOp = rooms.endStroke(roomId, socket.id);
    if (finalizedOp) {
      // broadcast finalized op to everyone in room (including sender)
      io.to(roomId).emit('endStroke', { op: finalizedOp });
    }
  });

  socket.on('undo', ({ roomId }) => {
  const actor = rooms.getUserMeta(roomId, socket.id); 
  rooms.undo(roomId, socket.id);
  const now = Date.now();
  const last = rooms.lastActionT.get(roomId) || 0;
  if (now - last < 300) return; // drop if too frequent
  rooms.lastActionT.set(roomId, now);
  io.to(roomId).emit('ops-replaced', { ops: rooms.getOps(roomId), action: { type: 'undo', by: actor } });
});

socket.on('redo', ({ roomId }) => {
  const actor = rooms.getUserMeta(roomId, socket.id);
  rooms.redo(roomId, socket.id);
  io.to(roomId).emit('ops-replaced', { ops: rooms.getOps(roomId), action: { type: 'redo', by: actor } });
});


  socket.on('clear', ({ roomId }) => {
    rooms.clear(roomId);
    io.to(roomId).emit('ops-replaced', { ops: rooms.getOps(roomId) });
  });

  socket.on('disconnect', () => {
    const leftRooms = rooms.removeUserFromAllRooms(socket.id);
    leftRooms.forEach(rid => io.to(rid).emit('users-update', { users: rooms.getUsers(rid) }));
    console.log('disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server listening on', PORT));
