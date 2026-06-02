require('dotenv').config();
const { sendToAll } = require('../backend/services/pushService');

async function test() {
  console.log('📤 Envoi notification de test...');
  await sendToAll(
    '🧪 Test notification',
    'Si tu vois ça, les notifications fonctionnent !',
    { type: 'test' }
  );
  console.log('✅ Envoyé !');
  process.exit(0);
}

test().catch(e => { console.error(e.message); process.exit(1); });