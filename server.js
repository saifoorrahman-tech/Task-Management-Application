require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { initWebSocket } = require('./ws');

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET. Copy .env.example to .env and set a real secret before starting.');
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, 'public')));

// Anything else falls back to the SPA-ish entry point for direct links
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const server = http.createServer(app);
initWebSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Dispatch task manager running at http://localhost:${PORT}`);
});
