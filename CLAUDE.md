# Abyssal Feeders - EVE Online Killmail Tracker

## Project Overview
Abyssal Feeders is a Next.js web application that tracks EVE Online character killmail values specifically in abyssal space. Players can search for characters and view their total killmail values in a leaderboard format.

## Tech Stack
- **Frontend**: Next.js 15.3.5 with React 19
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: SQLite via @libsql/client (previously better-sqlite3)
- **TypeScript**: Full type safety
- **Deployment**: Designed for Docker/Coolify

## Architecture

### Database Schema
Single table `leaderboard` with:
- `id` (INTEGER PRIMARY KEY)
- `character_id` (INTEGER UNIQUE) - EVE character ID
- `character_name` (TEXT) - Character name
- `total_value` (INTEGER) - Total killmail value in ISK
- `last_updated` (DATETIME) - Last data refresh
- `image_data` (BLOB) - Cached character portrait
- `image_content_type` (TEXT) - Image MIME type
- `image_fetched_at` (DATETIME) - Portrait cache timestamp

### API Endpoints

#### `/api/process-character` (POST)
- Processes a character by fetching all abyssal killmails from zKillboard
- Calculates total value from all killmails
- Caches character portrait from EVE API
- Updates/inserts character data in database

#### `/api/leaderboard` (GET)
- Returns top 50 characters by total killmail value
- Ordered by `total_value` DESC

#### `/api/character-image/[charId]` (GET)
- Serves cached character portraits
- Auto-refreshes portraits older than 7 days
- Fallback to EVE API if cache miss

#### `/api/search-character` (GET)
- Searches EVE characters by name via EVE API
- Returns character suggestions for autocomplete

#### `/api/lookup-character` (GET)
- Looks up character name by ID via EVE API

### Key Components

#### `CharacterSearch`
- Autocomplete search input
- Debounced API calls to EVE character search
- Handles character selection

#### `CharacterIdInput`
- Direct character ID input
- Validates and looks up character name

#### `Leaderboard`
- Displays top characters with portraits
- Auto-refreshes data
- Responsive grid layout

#### `ProcessingStatus`
- Shows processing state and results
- Displays character stats after processing

### Data Flow
1. User searches/inputs character
2. Character data fetched from EVE API
3. zKillboard API fetched for all abyssal killmails
4. Total value calculated and stored
5. Character portrait cached
6. Leaderboard updated

### Database Configuration
- Development: `./leaderboard.db`
- Production: `/data/leaderboard.db` (Docker) or configurable via `DATABASE_PATH`
- WAL mode enabled for better concurrency

## Development Commands
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## External APIs Used
- **EVE Online ESI API**: Character search and lookup
- **zKillboard API**: Abyssal killmail data
- **EVE Tech Images**: Character portraits

## Recent Changes
- Migrated from better-sqlite3 to @libsql/client for better Docker compatibility
- No longer requires Python/native compilation for deployment
- Maintains same SQLite functionality with different API syntax

## Deployment Notes
- Uses Docker for containerized deployment
- SQLite database persists to `/data` volume in production
- Character portraits cached to reduce API calls
- Designed for Coolify deployment platform