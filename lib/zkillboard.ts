
const USER_AGENT = 'Abyssal Feeders - Felix Allistar <felixallistar@gmail.com>';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRateLimit(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
    // We allow caching here to respect zKillboard's headers and reduce load on their servers.
    // This means updates might be delayed by the cache duration (e.g. 1 hour),
    // but eventually consistency is maintained as long as a user doesn't get >200 kills in that window.
    // cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  return response;
}

export async function getCharacterAbyssalKills(characterId: number, afterKillId?: number) {
  const newKillmails = [];
  let page = 1;
  let hasMorePages = true;
  let latestKillId = 0;

  while (hasMorePages) {
    const url = `https://zkillboard.com/api/characterID/${characterId}/abyssal/page/${page}/`;
    console.log(`Fetching page ${page} from: ${url}`);

    const response = await fetchWithRateLimit(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}: ${response.status} ${response.statusText}`);
    }

    let pageKillmails: { killmail_id: number; zkb?: { totalValue: number } }[];
    try {
      pageKillmails = await response.json() as { killmail_id: number; zkb?: { totalValue: number } }[];
    } catch (e) {
      console.error(`Failed to parse JSON from ${url}`);
      throw new Error(`Failed to parse JSON from ${url}: ${e}`);
    }

    if (!Array.isArray(pageKillmails)) {
      throw new Error(`Unexpected response format for page ${page}: expected array`);
    }

    // Capture the latest kill ID from the first page
    if (page === 1 && pageKillmails.length > 0) {
      latestKillId = pageKillmails[0].killmail_id;
    }

    // Filter kills if afterKillId is provided
    let killsToAdd = pageKillmails;
    if (afterKillId) {
      const cutoffIndex = pageKillmails.findIndex(k => k.killmail_id <= afterKillId);
      if (cutoffIndex !== -1) {
        // We found a kill that we've already seen (or older).
        // Take everything before it.
        killsToAdd = pageKillmails.slice(0, cutoffIndex);
        hasMorePages = false; // Stop fetching further pages
      }
    }

    newKillmails.push(...killsToAdd);

    // If we stopped early due to afterKillId, we are done.
    // Otherwise, check if we need to fetch the next page.
    if (hasMorePages) {
      if (pageKillmails.length < 200) {
        // End of list reached
        hasMorePages = false;
      } else {
        page++;
        // Sleep 1 second between pages to respect rate limits
        await sleep(1000);
      }
    }
  }

  const totalValue = newKillmails.reduce((sum, killmail) => sum + (killmail.zkb?.totalValue || 0), 0);

  return {
    totalValue,
    killmailCount: newKillmails.length,
    killmails: newKillmails,
    latestKillId
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

  let killmails;
  try {
    killmails = await response.json();
  } catch (e) {
    console.error(`Failed to parse JSON from ${url}`);
    throw new Error(`Failed to parse JSON from ${url}: ${e}`);
  }

  if (!Array.isArray(killmails)) {
    throw new Error(`Unexpected response format for region ${regionId} page ${page}: expected array`);
  }

  return killmails;
}
