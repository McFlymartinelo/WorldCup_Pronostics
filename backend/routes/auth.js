'use strict';
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { run, get } = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register  — inscription libre
router.post('/register', (req, res) => {
  const { pseudo, password } = req.body;
  if (!pseudo || !password)
    return res.status(400).json({ error: 'pseudo et password requis' });
  if (pseudo.length < 2 || pseudo.length > 20)
    return res.status(400).json({ error: 'pseudo : 2 à 20 caractères' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Mot de passe trop court (min 6)' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO users (pseudo, password_hash) VALUES (?, ?)`)
      .run(pseudo.trim(), hash);
    const token = signToken({ id: lastInsertRowid, pseudo, role: 'player' });
    res.status(201).json({ token, pseudo, role: 'player' });
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(409).json({ error: 'Ce pseudo est déjà pris' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { pseudo, password } = req.body;

  // Ajout de la vérification
  if (!pseudo || !password)
    return res.status(400).json({ error: 'pseudo et password requis' });

  const user = await get(
    'SELECT * FROM users WHERE LOWER(pseudo) = LOWER(?)',
    [pseudo]
  );

  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' });

  const token = signToken({ id: user.id, pseudo: user.pseudo, role: user.role });
  res.json({ token, pseudo: user.pseudo, role: user.role });
});

// GET /api/auth/me — vérifie le token
router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, pseudo: req.user.pseudo, role: req.user.role });
});

function signToken (payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

module.exports = router;