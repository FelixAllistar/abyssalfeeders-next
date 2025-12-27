import { NextResponse } from 'next/server';
import { updateAllCharacters } from '@/lib/update-service';

// This route is intended to be called by a cron job service (e.g., Vercel Cron)
// It triggers a full update of all characters in the leaderboard.
export async function GET(request: Request) {
  // Check for authorization header if needed (optional for now, but good practice)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await updateAllCharacters();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Update cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
