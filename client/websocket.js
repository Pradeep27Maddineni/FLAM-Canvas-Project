(function () {
  const s = io("http://localhost:3000");

  console.log("🔌 Attempting Socket.io connection...");

  s.on("connect", () => {
    console.log("✅ Connected to server with id:", s.id);
  });

  s.on("disconnect", () => {
    console.log("❌ Disconnected from server");
  });

  s.on("init-state", (msg) => {
    console.log("📦 Received init-state from server:", msg);
  });

  // expose only via window.__socket (no global 'socket' identifier)
  window.__socket = s;

  // connectAndJoin utility: listen for init-state then emit join
  function connectAndJoin(roomId, username, onInit) {
    return new Promise((resolve) => {
      // attach once-listener for init-state BEFORE emitting join
      s.once("init-state", (msg) => {
        onInit && onInit(msg);
      });

      s.emit("join-room", { roomId, username }, (res) => {
        console.log("Server ACK for join-room:", res);
        resolve(res);
      });
    });
  }

  // export
  window.connectAndJoin = connectAndJoin;
})();
