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
        image_fetched_at DATETIME,
        last_kill_id INTEGER
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

// Helper to ensure schema migration is complete
export async function ensureDatabaseSchema() {
  const db = getDatabase();

  // Check if last_kill_id column exists (migration for existing DBs)
  try {
    const result = await db.execute("PRAGMA table_info(leaderboard)");
    const columns = result.rows.map(row => row.name);

    if (!columns.includes('last_kill_id')) {
      console.log("Migrating database: Adding last_kill_id column");
      await db.execute("ALTER TABLE leaderboard ADD COLUMN last_kill_id INTEGER");
      console.log("Migration complete.");
    }
  } catch (error) {
    console.error("Database migration check failed:", error);
    // We don't throw here to avoid crashing if it's just a transient issue,
    // but in a real scenario we might want to halt.
    throw error;
  }
}

// Don't initialize immediately - only when needed
// export default getDatabase();