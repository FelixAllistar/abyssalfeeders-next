
const USER_AGENT = 'Abyssal Feeders - Felix Allistar <felixallistar@gmail.com>';

async function fetchWithRateLimit(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  return response;
}

export async function getKillmailDetails(killmailId: number, hash: string) {
  const url = `https://esi.evetech.net/latest/killmails/${killmailId}/${hash}/`;
  const response = await fetchWithRateLimit(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch killmail ${killmailId}: ${response.status} ${response.statusText}`);
  }

  try {
    return await response.json();
  } catch (e) {
    console.error(`Failed to parse JSON for killmail ${killmailId} from ${url}`);
    throw new Error(`Failed to parse JSON: ${e}`);
  }
}
