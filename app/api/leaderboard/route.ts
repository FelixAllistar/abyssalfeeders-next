import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT character_id, character_name, total_value, last_updated
      FROM leaderboard
      ORDER BY total_value DESC
      LIMIT 50
    `);
    const leaderboard = stmt.all();
    
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: "Failed to get leaderboard" },
      { status: 500 }
    );
  }
}