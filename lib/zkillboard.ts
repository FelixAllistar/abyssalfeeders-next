
const USER_AGENT = 'Abyssal Feeders - Felix Allistar <felixallistar@gmail.com>';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

export async function getCharacterAbyssalKills(characterId: number) {
  const allKillmails = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const url = `https://zkillboard.com/api/characterID/${characterId}/abyssal/page/${page}/`;
    console.log(`Fetching page ${page} from: ${url}`);

    const response = await fetchWithRateLimit(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}: ${response.status} ${response.statusText}`);
    }

    const pageKillmails = await response.json();

    if (!Array.isArray(pageKillmails)) {
      throw new Error(`Unexpected response format for page ${page}: expected array`);
    }

    if (pageKillmails.length === 0 || pageKillmails.length < 200) {
      allKillmails.push(...pageKillmails);
      hasMorePages = false;
    } else {
      allKillmails.push(...pageKillmails);
      page++;
      // Sleep 1 second between pages to respect rate limits
      await sleep(1000);
    }
  }

  const totalValue = allKillmails.reduce((sum, killmail) => sum + (killmail.zkb?.totalValue || 0), 0);

  return {
    totalValue,
    killmailCount: allKillmails.length,
    killmails: allKillmails // Optional: return if needed, though we primarily need totalValue
  };
}

export const ABYSSAL_REGION_IDS = [
  12000001,
  12000002,
  12000003,
  12000004,
  12000005
];

export async function getRegionKills(regionId: number, page: number = 1) {
  const url = `https://zkillboard.com/api/regionID/${regionId}/page/${page}/`;
  console.log(`Fetching region ${regionId} page ${page} from: ${url}`);

  const response = await fetchWithRateLimit(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch region ${regionId} page ${page}: ${response.status} ${response.statusText}`);
  }

  const killmails = await response.json();

  if (!Array.isArray(killmails)) {
    throw new Error(`Unexpected response format for region ${regionId} page ${page}: expected array`);
  }

  return killmails;
}
