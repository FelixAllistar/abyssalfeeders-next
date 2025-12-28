import { getDatabase } from './database';
import { getCharacterAbyssalKills } from './zkillboard';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function updateAllCharacters() {
  const db = getDatabase();
  console.log('Starting daily update of all characters...');

  try {
    const result = await db.execute('SELECT character_id, character_name, total_value, last_kill_id FROM leaderboard ORDER BY last_updated ASC');
    const characters = result.rows;

    console.log(`Found ${characters.length} characters to update.`);

    let updatedCount = 0;
    let errorCount = 0;
    const startTime = Date.now();
    // Vercel execution timeout safety buffer (e.g. 50 seconds max execution time)
    const MAX_EXECUTION_TIME = 50 * 1000;

    for (const char of characters) {
      // Check for timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.warn('Execution time limit reached. Stopping updates.');
        break;
      }

      const characterId = Number(char.character_id);
      const characterName = String(char.character_name);
      const currentTotalValue = Number(char.total_value) || 0;
      // Handle missing last_kill_id (e.g. from before migration) by defaulting to 0
      const lastKillId = Number(char.last_kill_id) || 0;

      console.log(`Updating ${characterName} (${characterId})...`);

      try {
        const { totalValue: newKillsValue, latestKillId } = await getCharacterAbyssalKills(characterId, lastKillId);

        // Only update if there are new kills or if we need to set the initial last_kill_id
        // (latestKillId will be > 0 if we fetched anything, or at least equal to lastKillId if no new kills but valid response)

        // CORRECTION: If lastKillId was 0 (or null/missing), we performed a FULL fetch.
        // In that case, newKillsValue represents the TOTAL value of the character.
        // We should overwrite existing total_value, not add to it.
        // If lastKillId > 0, we performed an incremental fetch, so we add.

        let newTotalValue;
        if (lastKillId === 0) {
            newTotalValue = newKillsValue;
        } else {
            newTotalValue = currentTotalValue + newKillsValue;
        }

        // Use the new latest kill ID, or keep the old one if we didn't find a newer one (shouldn't happen if logic is correct, but safe fallback)
        const newLastKillId = latestKillId > lastKillId ? latestKillId : lastKillId;

        // Update database
        await db.execute({
          sql: `UPDATE leaderboard
                SET total_value = ?, last_updated = datetime('now'), last_kill_id = ?
                WHERE character_id = ?`,
          args: [newTotalValue, newLastKillId, characterId]
        });

        updatedCount++;
        // Sleep 2 seconds between characters to respect rate limits
        await sleep(2000);

      } catch (err) {
        console.error(`Failed to update character ${characterName} (${characterId}):`, err);
        errorCount++;
      }
    }

    console.log(`Daily update complete. Updated: ${updatedCount}, Errors: ${errorCount}`);
    return { updatedCount, errorCount };

  } catch (error) {
    console.error('Fatal error during daily update:', error);
    throw error;
  }
}
