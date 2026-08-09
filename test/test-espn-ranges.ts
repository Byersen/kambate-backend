import axios from 'axios';

async function testRanges() {
  const leagues = [
    'esp.1', // La Liga
    'eng.1', // Premier League
    'ita.1', // Serie A
    'ger.1', // Bundesliga
    'fra.1', // Ligue 1
    'uefa.champions',
    'conmebol.libertadores',
    'arg.1',
  ];

  console.log('--- Testing ESPN Scoreboard date ranges ---');

  // Format date range: 3 days ago to 14 days ahead (YYYYMMDD-YYYYMMDD)
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - 3);
  const future = new Date(now);
  future.setDate(now.getDate() + 14);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };

  const range = `${formatDate(past)}-${formatDate(future)}`;
  console.log(`Querying date range: ${range}`);

  for (const league of leagues) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${range}`;
      const res = await axios.get(url, { timeout: 8000 });
      const events = res.data?.events || [];
      console.log(`League [${league}]: ${events.length} matches found.`);
      if (events.length > 0) {
        for (const e of events.slice(0, 3)) {
          console.log(`   -> ${e.name} (${e.date})`);
        }
      }
    } catch (err: any) {
      console.log(`League [${league}] error: ${err.message}`);
    }
  }
}

testRanges();
