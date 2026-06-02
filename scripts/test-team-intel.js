require('dotenv').config();
const { buildTeamIntel } = require('../backend/services/teamIntelBuilder');

(async () => {
  for (const team of ['France', 'Senegal', 'Mexico', 'Argentina', 'Germany']) {
    const intel = await buildTeamIntel(team);
    console.log('\n===', team, '===');
    console.log('fifa_rank:', intel?.fifa_rank);
    console.log('qualification:', intel?.qualification?.slice(0, 80));
    console.log('qual matches:', intel?.qualification_matches?.length);
    console.log('friendlies:', intel?.friendlies?.length);
    console.log('streak:', intel?.streak);
    console.log('form:', intel?.form_extended);
    console.log('watch:', intel?.watch);
    console.log('best/capped/scorer:', intel?.best, intel?.capped, intel?.scorer);
  }
})();
