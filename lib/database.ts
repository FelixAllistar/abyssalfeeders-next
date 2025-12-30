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

    // Enable WAL mode for better concurrency
    // ensureDatabaseSchema should be awaited before using the db


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

  // Check for migrations
  try {
    // Enable WAL mode for better concurrency
    await db.execute('PRAGMA journal_mode = WAL');

    // Create leaderboard table and add columns if they don't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER UNIQUE,
        character_name TEXT,
        total_value INTEGER,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_kill_id INTEGER
      )
    `);

    const result = await db.execute("PRAGMA table_info(leaderboard)");
    const columns = result.rows.map(row => row.name);

    // Migration 1: Add last_kill_id
    if (!columns.includes('last_kill_id')) {
      console.log("Migrating database: Adding last_kill_id column");
      await db.execute("ALTER TABLE leaderboard ADD COLUMN last_kill_id INTEGER");
      console.log("Migration 1 complete.");
    }

    // Migration 2: Remove image columns (cleanup)
    const hasImageColumns = columns.some(col =>
      ['image_data', 'image_content_type', 'image_fetched_at'].includes(col as string)
    );

    if (hasImageColumns) {
      console.log('Migrating database: Removing image columns...');

      // Create backup/new table without image columns
      await db.execute(`
        CREATE TABLE leaderboard_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          character_id INTEGER UNIQUE,
          character_name TEXT,
          total_value INTEGER,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_kill_id INTEGER
        )
      `);

      // Copy data
      await db.execute(`
        INSERT INTO leaderboard_new (id, character_id, character_name, total_value, last_updated, last_kill_id)
        SELECT id, character_id, character_name, total_value, last_updated, last_kill_id
        FROM leaderboard
      `);

      // Swap tables
      await db.execute("DROP TABLE leaderboard");
      await db.execute("ALTER TABLE leaderboard_new RENAME TO leaderboard");

      console.log('Migration 2 complete: Image columns removed.');
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