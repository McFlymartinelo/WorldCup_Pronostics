'use strict';
const { isPoolMember } = require('../services/poolService');

function parsePoolId (req) {
  const raw = req.headers['x-pool-id'] || req.query.pool_id;
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function requirePool (req, res, next) {
  const poolId = parsePoolId(req);
  if (!poolId) {
    return res.status(400).json({ error: 'Groupe requis (header X-Pool-Id)' });
  }

  const member = await isPoolMember(req.user.id, poolId);
  if (!member) {
    return res.status(403).json({ error: 'Vous n\'appartenez pas à ce groupe' });
  }

  req.poolId = poolId;
  next();
}

module.exports = { requirePool, parsePoolId };
