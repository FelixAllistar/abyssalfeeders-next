import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// Database path configuration
// Use /data/leaderboard.db for Docker (Coolify), fallback to local for development
const getDbPath = () => {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  
  // For development, always use local file to avoid permission issues
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'leaderboard.db');
  }
  
  // Check if /data directory exists (Docker environment)
  try {
    if (fs.existsSync('/data')) {
      return '/data/leaderboard.db';
    }
  } catch {
    // Fallback to local file
  }
  
  // Local development fallback
  return path.join(process.cwd(), 'leaderboard.db');
};

let db: Client | null = null;

export function getDatabase() {
  if (!db) {
    const dbPath = getDbPath();
    console.log(`Database path: ${dbPath}`);

    // Initialize SQLite database
    db = createClient({
      url: `file:${dbPath}`
    });

    // Create leaderboard table and add columns if they don't exist
    db.execute(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER UNIQUE,
        character_name TEXT,
        total_value INTEGER,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        image_data BLOB,
        image_content_type TEXT,
        image_fetched_at DATETIME
      )
    `);

    console.log("Database initialized successfully");

    // Enable WAL mode for better concurrency
    db.execute('PRAGMA journal_mode = WAL');

    // Close database on process exit
    process.on('SIGINT', () => {
      if (db) {
        db.close();
      }
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      if (db) {
        db.close();
      }
      process.exit(0);
    });
  }
  
  return db;
}

// Don't initialize immediately - only when needed
// export default getDatabase();