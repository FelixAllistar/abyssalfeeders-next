#!/usr/bin/env node
const { getDatabase } = require('../lib/database.ts');

async function cleanup() {
  try {
    const db = getDatabase();
    
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
    
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanup();