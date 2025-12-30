import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    const result = await db.execute({
      sql: `SELECT character_id, character_name, total_value, last_updated
            FROM leaderboard
            ORDER BY total_value DESC
            LIMIT 100`
    });
    const leaderboard = result.rows;

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: "Failed to get leaderboard" },
      { status: 500 }
    );
  }
}