const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');

// userId -> Set of live socket connections for that user
const userSockets = new Map();

function initWebSocket(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    // Verify the JWT before completing the WebSocket handshake, so an
    // invalid/missing token is rejected outright rather than accepted and
    // then immediately closed.
    verifyClient: ({ req }, callback) => {
      const { query } = url.parse(req.url, true);
      try {
        const payload = jwt.verify(query.token, process.env.JWT_SECRET);
        req.userId = String(payload.sub);
        callback(true);
      } catch (err) {
        callback(false, 401, 'Unauthorized');
      }
    },
  });

  wss.on('connection', (ws, req) => {
    const userId = req.userId;

    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(ws);

    ws.send(JSON.stringify({ type: 'connected' }));

    ws.on('close', () => {
      const set = userSockets.get(userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) userSockets.delete(userId);
      }
    });

    // Basic keepalive so idle connections don't silently die behind proxies
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  return wss;
}

function broadcastToUser(userId, payload) {
  const set = userSockets.get(String(userId));
  if (!set) return;
  const message = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(message);
  }
}

module.exports = { initWebSocket, broadcastToUser };
