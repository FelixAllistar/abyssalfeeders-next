import { getDatabase, ensureDatabaseSchema } from './database';
import { getCharacterAbyssalKills } from './zkillboard';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function updateCharacter(
  characterId: number,
  characterName: string,
  currentTotalValue: number,
  lastKillId: number
) {
  try {
    const { totalValue: newKillsValue, latestKillId } = await getCharacterAbyssalKills(characterId, lastKillId);

    let newTotalValue;
    if (lastKillId === 0) {
      newTotalValue = newKillsValue;
    } else {
      newTotalValue = currentTotalValue + newKillsValue;
    }

    const newLastKillId = latestKillId > lastKillId ? latestKillId : lastKillId;

    const db = getDatabase();
    await db.execute({
      sql: `UPDATE leaderboard
            SET total_value = ?, last_updated = datetime('now'), last_kill_id = ?
            WHERE character_id = ?`,
      args: [newTotalValue, newLastKillId, characterId]
    });

    return { success: true, newTotalValue, newLastKillId };
  } catch (err) {
    console.error(`Failed to update character ${characterName} (${characterId}):`, err);
    throw err;
  }
}

export async function updateAllCharacters() {
  await ensureDatabaseSchema();
  const db = getDatabase();
  console.log('Starting daily update of all characters...');

  try {
    const result = await db.execute('SELECT character_id, character_name, total_value, last_kill_id FROM leaderboard ORDER BY last_updated ASC');
    const characters = result.rows;

    console.log(`Found ${characters.length} characters to update.`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const char of characters) {
      const characterId = Number(char.character_id);
      const characterName = String(char.character_name);
      const currentTotalValue = Number(char.total_value) || 0;
      const lastKillId = Number(char.last_kill_id) || 0;

      console.log(`Updating ${characterName} (${characterId})...`);

      try {
        await updateCharacter(characterId, characterName, currentTotalValue, lastKillId);
        updatedCount++;
        // Sleep 2 seconds between characters to respect rate limits
        await sleep(2000);
      } catch (err) {
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
