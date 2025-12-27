import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getCharacterAbyssalKills } from '@/lib/zkillboard';

export async function POST(request: NextRequest) {
  try {
    const { characterId, characterName } = await request.json();

    // Fetch killmail data from Zkillboard with pagination
    const { totalValue, killmailCount } = await getCharacterAbyssalKills(characterId);

    // Reject characters with zero killmail value
    if (totalValue === 0) {
      return NextResponse.json(
        { error: "Character has no abyssal killmail value" },
        { status: 400 }
      );
    }

    // Fetch and cache character portrait
    let imageData = null;
    let imageContentType = null;
    const imageFetchedAt = new Date().toISOString();
    try {
      const imageUrl = `https://images.evetech.net/characters/${characterId}/portrait?tenant=tranquility&size=64`;
      const imageResponse = await fetch(imageUrl);
      if (imageResponse.ok) {
        const arrayBuffer = await imageResponse.arrayBuffer();
        imageData = Buffer.from(arrayBuffer);
        imageContentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      }
    } catch (e) {
      console.error('Image fetch error:', e);
    }

    const db = getDatabase();
    await db.execute({
      sql: `INSERT INTO leaderboard (character_id, character_name, total_value, last_updated, image_data, image_content_type, image_fetched_at)
            VALUES (?, ?, ?, datetime('now'), ?, ?, ?)
            ON CONFLICT(character_id) DO UPDATE SET
            total_value = excluded.total_value,
            last_updated = excluded.last_updated,
            image_data = excluded.image_data,
            image_content_type = excluded.image_content_type,
            image_fetched_at = excluded.image_fetched_at`,
      args: [characterId, characterName, totalValue, imageData, imageContentType, imageFetchedAt]
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