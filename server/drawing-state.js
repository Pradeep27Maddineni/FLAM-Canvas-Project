const { v4: uuidv4 } = require('uuid');

class DrawingState {
  constructor() {
    this.ops = []; // canonical applied ops
    this.redoStack = [];
    this.currentStrokeMap = new Map(); // socketId -> partial op (in-progress)
  }

  beginStroke(socketId, stroke, clientId) {
    const op = {
      id: uuidv4(),
      clientId: clientId || null,
      type: 'stroke',
      user: socketId,
      stroke,
      points: []
    };
    this.currentStrokeMap.set(socketId, op);
    return op;
  }

  appendPoints(socketId, points) {
    const op = this.currentStrokeMap.get(socketId);
    if (!op) return null;
    op.points.push(...points);
    return op;
  }

  endStroke(socketId) {
    const op = this.currentStrokeMap.get(socketId);
    if (!op) return null;
    this.currentStrokeMap.delete(socketId);
    this.ops.push(op);
    // Clear redo on new op
    this.redoStack = [];
    // Trim ops if extremely big (simple memory guard)
    if (this.ops.length > 2000) {
      this.ops = this.ops.slice(-2000);
    }
    return op;
  }

  undo(socketId) {
    if (this.ops.length === 0) return null;
    const op = this.ops.pop();
    this.redoStack.push(op);
    return op;
  }

  redo(socketId) {
    if (this.redoStack.length === 0) return null;
    const op = this.redoStack.pop();
    this.ops.push(op);
    return op;
  }

  getOps() {
    return this.ops;
  }

  clear() {
    this.ops = [];
    this.redoStack = [];
    this.currentStrokeMap.clear();
  }
}

module.exports = DrawingState;
