import { getDatabase } from './database';
import { getCharacterAbyssalKills } from './zkillboard';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function updateAllCharacters() {
  const db = getDatabase();
  console.log('Starting daily update of all characters...');

  try {
    const result = await db.execute('SELECT character_id, character_name FROM leaderboard ORDER BY last_updated ASC');
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

      console.log(`Updating ${characterName} (${characterId})...`);

      try {
        const { totalValue } = await getCharacterAbyssalKills(characterId);

        // Update database
        await db.execute({
          sql: `UPDATE leaderboard
                SET total_value = ?, last_updated = datetime('now')
                WHERE character_id = ?`,
          args: [totalValue, characterId]
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
