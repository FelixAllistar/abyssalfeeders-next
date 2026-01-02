import { getDatabase, ensureDatabaseSchema } from './database';
import { ABYSSAL_REGION_IDS, getRegionKills, getCharacterAbyssalKills } from './zkillboard';
import { getKillmailDetails } from './esi';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to get detailed killmail info from ESI if needed
// zKillboard list response usually doesn't have victim/attacker details, so we need to fetch them.
// We can use ESI for that.
async function fetchKillmailDetails(killmailId: number, hash: string) {
  try {
    return await getKillmailDetails(killmailId, hash);
  } catch (error) {
    console.error(`Failed to fetch details for killmail ${killmailId}:`, error);
    return null;
  }
}

export async function scanAbyssalRegions() {
  await ensureDatabaseSchema();
  const db = getDatabase();
  console.log('Starting scan of Abyssal regions...');

  const newCharacters = new Set<number>();
  let newCharactersCount = 0;
  let errorCount = 0;

  // We only check the first page of each region to find recent active characters
  for (const regionId of ABYSSAL_REGION_IDS) {
    try {
      const kills = await getRegionKills(regionId, 1);
      console.log(`Region ${regionId}: Found ${kills.length} kills.`);

      // Limit to processing a subset to avoid timeouts if too many
      // For discovery, checking the most recent 50 kills per region is probably enough
      const killsToProcess = kills.slice(0, 50);

      for (const kill of killsToProcess) {
        const { killmail_id, zkb } = kill;

        // Skip kills with missing zkb data (sometimes zKillboard returns incomplete data)
        if (!zkb?.hash) {
          console.warn(`Skipping kill ${killmail_id}: missing zkb.hash`);
          continue;
        }

        const hash = zkb.hash;

        // Fetch full details from ESI
        const details = await fetchKillmailDetails(killmail_id, hash);
        if (!details) continue;

        const victimId = details.victim?.character_id;

        // Some kills might be structure kills or NPC kills without a character victim (unlikely in Abyss but possible)
        if (!victimId) continue;

        // Check if character is already in DB
        // We use a local cache (Set) to avoid repeated DB lookups in this run
        if (newCharacters.has(victimId)) continue;

        const existing = await db.execute({
          sql: 'SELECT 1 FROM leaderboard WHERE character_id = ?',
          args: [victimId]
        });

        if (existing.rows.length === 0) {
          // Character not in DB. Add them.
          console.log(`Discovered new character: ${victimId}. Fetching stats...`);

          // We need the character name.
          // The killmail details usually have it, but sometimes it's not resolved if we used ESI directly?
          // ESI killmail response has `victim.character_id`. It does NOT always have the name if it's just an ID.
          // Wait, ESI killmail response usually has IDs.
          // We might need to resolve the name.
          // However, getCharacterAbyssalKills fetches from zKillboard, which doesn't return the name directly either unless we parse it.
          // But usually we need the name for the leaderboard.

          // Let's try to get the name from ESI /characters/{id}/
          const name = await getCharacterName(victimId);

          if (name) {
            try {
              const { totalValue, latestKillId } = await getCharacterAbyssalKills(victimId);

              await db.execute({
                sql: `INSERT INTO leaderboard (character_id, character_name, total_value, last_updated, last_kill_id)
                              VALUES (?, ?, ?, datetime('now'), ?)`,
                args: [victimId, name, totalValue, latestKillId]
              });

              console.log(`Added ${name} (${victimId}) to leaderboard.`);
              newCharacters.add(victimId);
              newCharactersCount++;
            } catch (err) {
              console.error(`Failed to add character ${victimId}:`, err);
              errorCount++;
            }
          }
        }
      }

      // Sleep between regions
      await sleep(1000);

    } catch (err) {
      console.error(`Failed to scan region ${regionId}:`, err);
      errorCount++;
    }
  }

  console.log(`Scan complete. New characters added: ${newCharactersCount}. Errors: ${errorCount}`);
  return { newCharactersCount, errorCount };
}

async function getCharacterName(characterId: number): Promise<string | null> {
  try {
    const response = await fetch(`https://esi.evetech.net/latest/characters/${characterId}/`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.name;
  } catch (error) {
    console.error(`Failed to fetch name for ${characterId}:`, error);
    return null;
  }
}
