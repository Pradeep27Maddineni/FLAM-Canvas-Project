# Collaborative Canvas – Architecture Overview

This document describes the internal working and design of the **Collaborative Canvas** — a real-time multi-user drawing web app built using **Vanilla JavaScript**, **HTML5 Canvas**, **Node.js**, and **Socket.io**.

---

## Data Flow Diagram

```
+-----------+        +--------------------+        +-----------+
|  Client A | <----> |  Node.js Server    | <----> |  Client B |
| (Browser) |  WS    |  (Socket.io Hub)   |  WS    | (Browser) |
+-----------+        +--------------------+        +-----------+
     |                         |                         |
     |--- beginStroke -------->|                         |
     |<-- broadcast beginStroke|                         |
     |--- strokePoints -------->|                         |
     |<-- broadcast strokePoints|<------------------------|
     |--- endStroke ----------->|                         |
     |<-- broadcast endStroke --|------------------------>|

```
**Explanation**:

- Each client emits drawing events (`beginStroke`, `strokePoints`, `endStroke`) through WebSockets.
- The server maintains a global canvas state (`ops[]`) and rebroadcasts updates to all users.
- Clients redraw from the synchronized event stream — ensuring everyone sees the same output.


## WebSocket Protocol

| Event | Direction | Payload | Description |
|--------|------------|----------|--------------|
| `join-room` | Client → Server | `{ roomId, username }` | Join or create a room |
| `init-state` | Server → Client | `{ user, users, ops }` | Sends initial state |
| `users-update` | Server → All | `{ users }` | Broadcasts list of connected users |
| `beginStroke` | Client ↔ Server | `{ stroke, clientId }` | Start of new stroke |
| `strokePoints` | Client ↔ Server | `{ opId, points }` | Adds points to a stroke |
| `endStroke` | Client ↔ Server | `{ op }` | Finalizes and saves a stroke |
| `cursor` | Client → Server | `{ x, y }` | Sends live cursor position |
| `undo` / `redo` | Client → Server | `{ roomId }` | Performs global undo or redo |
| `ops-replaced` | Server → All | `{ ops }` | Replaces operation list after undo/redo |
| `clear` | Client → Server | `{ roomId }` | Clears the canvas for all |

---

## Undo / Redo Strategy

Goal:
Maintain global consistency of the canvas so that undo/redo affects all users.

Implementation:
Each room maintains two stacks:

ops[] → list of current strokes

redoStack[] → list of undone strokes

Undo:
if (ops.length > 0) {
redoStack.push(ops.pop());
broadcast("ops-replaced", ops);
}

Redo:
if (redoStack.length > 0) {
ops.push(redoStack.pop());
broadcast("ops-replaced", ops);
}

When a user undoes or redoes:

The server updates ops[] and redoStack[].

All clients receive ops-replaced with the new operation list.

Each client clears and redraws the canvas based on the new ops[].

---

## Performance Decisions

Optimization Techniques:

Batched Stroke Points (every 40ms)

Collects multiple mousemove events before emitting.

Reduces network traffic while maintaining smoothness.

Cursor Throttling (every 50ms)

Sends cursor positions less frequently to lower network overhead.

Server-Authoritative Order

All events are processed by the server first to maintain order.

Optimized Redraws

Canvas only updates when new stroke data arrives, preventing unnecessary re-renders.

Socket.io Transport

Provides auto-reconnection, binary event optimization, and cross-browser reliability.

Effect:
These optimizations allow real-time synchronization to remain smooth,
even with multiple users drawing simultaneously.


---

## Conflict Resolution

Problem:
When multiple users draw or erase at once, overlapping operations may cause inconsistency.

Solution:

The server timestamps and queues every operation (FIFO order).

All clients apply operations in the same order they were broadcast.

Eraser uses Canvas 'destination-out' mode to globally clear pixels.

Ensures that all clients see the exact same final output.

Example:

User A draws a blue line at time T1.

User B draws a red line over it at time T2.

The server broadcasts both operations in order (T1 then T2).

All clients draw in the same order, so the red line consistently overlaps the blue one.

Result:
Deterministic rendering across all clients — no conflicts or mismatched canvases.

---

## Summary

Real-time synchronization is achieved using Socket.io WebSocket events.

Global Undo/Redo ensures all users share a consistent canvas state.

Performance is maintained via batching, throttling, and minimal redraws.

Conflict resolution guarantees that simultaneous drawings are ordered and identical.

The result is a stable, scalable, and responsive collaborative drawing platform.

