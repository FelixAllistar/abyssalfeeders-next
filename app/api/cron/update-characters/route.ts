import { NextResponse } from 'next/server';
import { updateAllCharacters } from '@/lib/update-service';
import { scanAbyssalRegions } from '@/lib/discovery';

// This route is intended to be called by a cron job service (e.g., Vercel Cron)
// It triggers a full update of all characters in the leaderboard.
export async function GET(request: Request) {
  // Check for authorization header if needed (optional for now, but good practice)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Run discovery first to find new active characters
    console.log('Running Abyssal discovery...');
    const discoveryResult = await scanAbyssalRegions();

    // Then run the update for all characters (including potentially new ones)
    // Note: If updateAllCharacters takes too long, we might hit timeout.
    // Since discovery takes time, we might want to split these into different crons or just accept it.
    // For now, we run both.
    const updateResult = await updateAllCharacters();

    return NextResponse.json({ success: true, discovery: discoveryResult, update: updateResult });
  } catch (error) {
    console.error('Update cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
