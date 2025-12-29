import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getCharacterAbyssalKills } from '@/lib/zkillboard';

export async function POST(request: NextRequest) {
  try {
    const { characterId, characterName } = await request.json();

    // Fetch killmail data from Zkillboard with pagination
    const { totalValue, killmailCount, latestKillId } = await getCharacterAbyssalKills(characterId);

    // Reject characters with zero killmail value
    if (totalValue === 0) {
      return NextResponse.json(
        { error: "Character has no abyssal killmail value" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.execute({
      sql: `INSERT INTO leaderboard (character_id, character_name, total_value, last_updated, last_kill_id)
            VALUES (?, ?, ?, datetime('now'), ?)
            ON CONFLICT(character_id) DO UPDATE SET
            total_value = excluded.total_value,
            last_updated = excluded.last_updated,
            last_kill_id = excluded.last_kill_id`,
      args: [characterId, characterName, totalValue, latestKillId]
    });

    return NextResponse.json({
      characterId,
      characterName,
      totalValue,
      killmailCount,
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: "Failed to process character" },
      { status: 500 }
    );
  }
}