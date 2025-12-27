
const USER_AGENT = 'Abyssal Feeders - Felix Allistar <felixallistar@gmail.com>';

async function fetchWithRateLimit(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'gzip',
      'Accept': 'application/json',
    }
  });
  return response;
}

export async function getKillmailDetails(killmailId: number, hash: string) {
  const url = `https://esi.evetech.net/latest/killmails/${killmailId}/${hash}/`;
  const response = await fetchWithRateLimit(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch killmail ${killmailId}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
