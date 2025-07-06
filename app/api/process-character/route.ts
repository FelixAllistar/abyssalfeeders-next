import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { characterId, characterName } = await request.json();

    // Fetch killmail data from Zkillboard with pagination
    const allKillmails = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const url = `https://zkillboard.com/api/characterID/${characterId}/abyssal/page/${page}/`;
      console.log(`Fetching page ${page} from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Abyssal Feeders - Felix Allistar <felixallistar@gmail.com>',
          'Accept-Encoding': 'gzip',
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        console.warn(`Failed to fetch page ${page}: ${response.status}`);
        break;
      }

      const pageKillmails = await response.json();

      if (pageKillmails.length === 0 || pageKillmails.length < 200) {
        allKillmails.push(...pageKillmails);
        hasMorePages = false;
      } else {
        allKillmails.push(...pageKillmails);
        page++;
      }
    }

    const totalValue = allKillmails.reduce((sum, killmail) => sum + (killmail.zkb?.totalValue || 0), 0);

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
    const stmt = db.prepare(`
      INSERT INTO leaderboard (character_id, character_name, total_value, last_updated, image_data, image_content_type, image_fetched_at)
      VALUES (?, ?, ?, datetime('now'), ?, ?, ?)
      ON CONFLICT(character_id) DO UPDATE SET
      total_value = excluded.total_value,
      last_updated = excluded.last_updated,
      image_data = excluded.image_data,
      image_content_type = excluded.image_content_type,
      image_fetched_at = excluded.image_fetched_at
    `);
    stmt.run(characterId, characterName, totalValue, imageData, imageContentType, imageFetchedAt);

    return NextResponse.json({
      characterId,
      characterName,
      totalValue,
      killmailCount: allKillmails.length,
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: "Failed to process character" },
      { status: 500 }
    );
  }
}