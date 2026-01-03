
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
    cache: 'no-store',
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
    // Explicitly fetching losses to focus on ship destruction (feeder stats)
    const url = `https://zkillboard.com/api/losses/characterID/${characterId}/abyssal/page/${page}/`;
    console.log(`Fetching page ${page} from: ${url}`);

    const response = await fetchWithRateLimit(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}: ${response.status} ${response.statusText}`);
    }

    let pageKillmails: any[];
    try {
      pageKillmails = await response.json();
    } catch (e) {
      console.error(`Failed to parse JSON from ${url}`);
      throw new Error(`Failed to parse JSON from ${url}: ${e}`);
    }

    if (!Array.isArray(pageKillmails)) {
      console.error(`Unexpected response format from ${url}. Received:`, typeof pageKillmails, pageKillmails);
      throw new Error(`Unexpected response format for page ${page}: expected array`);
    }

    // Capture the latest kill ID from the first page
    if (page === 1) {
      const firstValid = pageKillmails.find(k => k && typeof k === 'object' && k.killmail_id);
      if (firstValid) {
        latestKillId = firstValid.killmail_id;
      } else if (pageKillmails.length > 0) {
        console.warn(`Page 1 has ${pageKillmails.length} entries but no valid killmail_id found in first entry. First entry:`, pageKillmails[0]);
      }
    }

    // Filter out any null/undefined entries with loud logging
    let killsToAdd: { killmail_id: number; zkb?: { totalValue: number } }[] = [];

    for (let i = 0; i < pageKillmails.length; i++) {
      const k = pageKillmails[i];
      if (k === null || typeof k !== 'object') {
        console.error(`CRITICAL: Null or non-object entry found at index ${i} on page ${page} for character ${characterId}. URL: ${url}`);
        continue;
      }
      if (typeof k.killmail_id !== 'number') {
        console.error(`CRITICAL: Entry at index ${i} on page ${page} missing numeric killmail_id. Data:`, JSON.stringify(k));
        continue;
      }
      killsToAdd.push(k);
    }

    // Filter kills if afterKillId is provided (only if > 0, as 0 means new character wanting full history)
    if (afterKillId && afterKillId > 0) {
      const cutoffIndex = killsToAdd.findIndex(k => k.killmail_id <= afterKillId);
      if (cutoffIndex !== -1) {
        // We found a kill that we've already seen (or older).
        // Take everything before it.
        killsToAdd = killsToAdd.slice(0, cutoffIndex);
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

  const totalValue = newKillmails.reduce((sum, killmail) => {
    if (!killmail?.zkb) {
      console.warn(`Value Calculation: Kill ${killmail?.killmail_id} for character ${characterId} is missing 'zkb' property (price data). Full data:`, JSON.stringify(killmail));
      return sum;
    }
    return sum + (killmail.zkb.totalValue || 0);
  }, 0);

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
