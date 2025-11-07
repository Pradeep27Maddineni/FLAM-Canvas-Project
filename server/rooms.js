// server/rooms.js
const { v4: uuidv4 } = require('uuid');
const DrawingState = require('./drawing-state');

class Rooms {
  constructor() {
    this.rooms = new Map(); // roomId -> { users: Map, state: DrawingState }
    this.lastActionT = new Map();
  }

  _ensureRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Map(),
        state: new DrawingState()
      });
    }
    return this.rooms.get(roomId);
  }

  addUser(roomId, socketId, name='Anon') {
    const r = this._ensureRoom(roomId);
    const color = this._assignColor(r.users.size);
    const user = { id: socketId, name, color };
    r.users.set(socketId, user);
    return user;
  }

  _assignColor(idx) {
    const palette = ['#e6194b','#3cb44b','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe','#008080'];
    return palette[idx % palette.length];
  }

  getUsers(roomId) {
    const r = this.rooms.get(roomId);
    if (!r) return [];
    return Array.from(r.users.values());
  }
  getUserMeta(roomId, socketId) {
  const r = this.rooms.get(roomId);
  if (!r) return null;
  return r.users.get(socketId) || null;
}

  getState(roomId) {
    const r = this._ensureRoom(roomId);
    return { users: this.getUsers(roomId), opsSnapshot: r.state.getOps() };
  }

  beginStroke(roomId, socketId, stroke, clientId) {
    const r = this._ensureRoom(roomId);
    return r.state.beginStroke(socketId, stroke, clientId);
  }

  appendPoints(roomId, socketId, points) {
    const r = this._ensureRoom(roomId);
    return r.state.appendPoints(socketId, points);
  }

  endStroke(roomId, socketId) {
    const r = this._ensureRoom(roomId);
    return r.state.endStroke(socketId);
  }

  undo(roomId, socketId) {
    const r = this._ensureRoom(roomId);
    return r.state.undo(socketId);
  }

  redo(roomId, socketId) {
    const r = this._ensureRoom(roomId);
    return r.state.redo(socketId);
  }

  getOps(roomId) {
    const r = this._ensureRoom(roomId);
    return r.state.getOps();
  }

  clear(roomId) {
    const r = this._ensureRoom(roomId);
    r.state.clear();
  }

  removeUserFromAllRooms(socketId) {
    const left = [];
    for (const [roomId, r] of this.rooms.entries()) {
      if (r.users.delete(socketId)) left.push(roomId);
    }
    return left;
  }
}

module.exports = Rooms;
