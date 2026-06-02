require('dotenv').config();
'use strict';
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const { initDB } = require('./database/db');
const { startScheduler } = require('./worker/scheduler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API routes ────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/matches',         require('./routes/matches'));
app.use('/api/predictions',     require('./routes/predictions'));
app.use('/api/standings',       require('./routes/standings'));
app.use('/api/admin',           require('./routes/admin'));
app.use('/api/teams',           require('./routes/teams'));
app.use('/api/squads',          require('./routes/squads'));
app.use('/api/tournament',      require('./routes/tournament'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/profile',         require('./routes/profile'));

// ── Health check ──────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Frontend statique ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/index.html'))
);

// ── Boot ──────────────────────────────────────────────────────────────
initDB();
startScheduler();
require('./services/h2hCsvService').preloadH2H();

app.listen(PORT, '0.0.0.0', () =>
  console.log(`✅  Serveur démarré sur le port ${PORT}`)
);