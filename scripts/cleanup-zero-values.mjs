#!/usr/bin/env node

import { createClient } from '@libsql/client';
import fs from 'fs';

// Database path configuration - same logic as in database.ts
const getDbPath = () => {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  
  if (process.env.NODE_ENV === 'development') {
    return './leaderboard.db';
  }
  
  try {
    if (fs.existsSync('/data')) {
      return '/data/leaderboard.db';
    }
  } catch {
    // Fallback
  }
  
  return './leaderboard.db';
};

async function cleanup() {
  try {
    const dbPath = getDbPath();
    console.log(`Using database: ${dbPath}`);
    
    const db = createClient({
      url: `file:${dbPath}`
    });
    
    // First check how many records have zero value
    const countResult = await db.execute('SELECT COUNT(*) as count FROM leaderboard WHERE total_value = 0');
    const count = countResult.rows[0].count;
    
    console.log(`Found ${count} records with zero total_value`);
    
    if (count > 0) {
      // Delete records with zero value
      const deleteResult = await db.execute('DELETE FROM leaderboard WHERE total_value = 0');
      console.log(`Deleted ${deleteResult.rowsAffected} records`);
    } else {
      console.log('No records to delete');
    }
    
    // Show remaining records count
    const remainingResult = await db.execute('SELECT COUNT(*) as count FROM leaderboard');
    console.log(`Remaining records: ${remainingResult.rows[0].count}`);
    
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanup();