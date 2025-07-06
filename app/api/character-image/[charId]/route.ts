import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ charId: string }> }
) {
  try {
    const { charId } = await params;
    const characterId = parseInt(charId, 10);
    
    if (isNaN(characterId)) {
      return new NextResponse("Invalid character ID", { status: 400 });
    }

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT image_data, image_content_type, image_fetched_at
      FROM leaderboard WHERE character_id = ?
    `);
    const result = stmt.get(characterId) as { 
      image_data: Buffer | null, 
      image_content_type: string | null, 
      image_fetched_at: string | null 
    } | undefined;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let needsFetch = false;

    if (!result || !result.image_data || !result.image_fetched_at || new Date(result.image_fetched_at) < sevenDaysAgo) {
      needsFetch = true;
    }

    let imageData = result?.image_data || null;
    let contentType = result?.image_content_type || null;

    // If we need to fetch or refresh the image
    if (needsFetch) {
      try {
        const imageUrl = `https://images.evetech.net/characters/${characterId}/portrait?tenant=tranquility&size=64`;
        const imageResponse = await fetch(imageUrl);

        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          imageData = Buffer.from(arrayBuffer);
          contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

          // Update the database with new image data
          const updateStmt = db.prepare(`
            UPDATE leaderboard
            SET image_data = ?, image_content_type = ?, image_fetched_at = datetime('now')
            WHERE character_id = ?
          `);

          updateStmt.run(imageData, contentType, characterId);
          console.log(`Refreshed portrait for character ${characterId}`);
        } else {
          console.warn(`Failed to fetch portrait for character ${characterId}: ${imageResponse.status}`);
          // If fetch fails and we have old cached data, use it if available
          if (!result?.image_data) {
            return new NextResponse("Character portrait not found", { status: 404 });
          }
        }
      } catch (fetchError) {
        console.warn(`Error fetching portrait for character ${characterId}:`, fetchError);
        // If fetch fails and we have old cached data, use it if available
        if (!result?.image_data) {
          return new NextResponse("Failed to fetch character portrait", { status: 500 });
        }
      }
    }

    // Serve the image
    if (imageData && contentType) {
      return new NextResponse(imageData, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=604800', // 7 days
        },
      });
    } else {
      return new NextResponse("Character portrait not available", { status: 404 });
    }
  } catch (error) {
    console.error('Character image error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}