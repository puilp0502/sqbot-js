# sqbot-js

A Discord bot that allows users to play a music guessing game in voice channels. Players listen to short clips of songs and compete to identify the song first.

## Project Overview

This project is a TypeScript application that:
- Connects to Discord via Discord.js
- Plays music clips in voice channels
- Tracks player scores and game state
- Uses a datastore to maintain quiz packs and song information

## Tech Stack

- **Language**: TypeScript
- **Testing Framework**: Jest
- **Discord Library**: Discord.js
- **Voice Support**: @discordjs/voice
- **Audio Source**: YouTube (via ytdlp-nodejs)
- **Database**: SQLite3

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- pnpm
- Discord Bot Token (from Discord Developer Portal)

### Option 1: Local Installation

1. Clone the repository
   ```
   git clone https://github.com/puilp0502/sqbot-js.git
   cd sqbot-js
   ```

2. Install dependencies
   ```
   pnpm install
   ```

3. Create a `.env` file with required configuration:
   ```
   BOT_TOKEN=your_discord_token
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=secure_password
   ```

4. Build the project
   ```
   pnpm run build
   ```

5. Start the bot and API server
   ```
   # Start the API server
   pnpm run api
   # In another terminal, start the bot
   pnpm run bot
   ```

### Option 2: Docker Installation

1. Clone the repository
   ```
   git clone https://github.com/puilp0502/sqbot-js.git
   cd sqbot-js
   ```

2. Copy the example environment file
   ```
   cp .env.example .env
   ```

3. Edit the `.env` file to add your Discord Bot Token and customize other settings
   ```
   BOT_TOKEN=your_discord_bot_token_here
   ADMIN_USERNAME=choose_admin_username
   ADMIN_PASSWORD=choose_secure_password
   ```

4. Create a data directory for SQLite database persistence
   ```
   mkdir -p data
   ```

5. Build and start the Docker containers
   ```
   docker compose up -d
   ```

   This will start three services:
   - API server (accessible at http://localhost:3001)
   - Discord bot
   - Web client (accessible at http://localhost:8088)

6. To check the logs
   ```
   docker compose logs -f
   ```

7. To stop the services
   ```
   docker compose down
   ```

## Development

### Database Schema

Refer to `src/types/sqlite-datastore.ts` for the full schema.

### Testing

Run tests with:
```
pnpm test
```


## Game Flow

1. A user starts a quiz with `!sqbot start [pack_id]`
2. Bot joins the user's voice channel
3. Bot announces the start of the quiz and explains rules
4. For each round:
   - Bot plays a song clip
   - Players type answers in the text channel
   - First correct answer wins points
   - Bot reveals correct answer and current scores
5. After all rounds, final scores are displayed

## Docker Configuration

The project is fully containerized using Docker, with three main services:

1. **API Server**: Provides the backend REST API for managing quiz packs
   - Runs on port 3001
   - Handles quiz pack management, tags, and search

2. **Discord Bot**: Connects to Discord and runs the music quiz game
   - Uses the same codebase as the API Server
   - Connects to Discord using the BOT_TOKEN in the .env file
   - Requires YTDLP_PATH configured (pre-set in the Docker image)

3. **Web Client**: React-based frontend for managing quiz packs
   - Served through Nginx on port 8088
   - Configured for SPA (Single Page Application) routing
   - Communicates with the API server

### Database Persistence

The SQLite database is stored in a bind-mounted directory (`./data`) for persistence between container restarts. Make sure this directory exists before starting the containers.

### Environment Variables

Customize your deployment by modifying the variables in the `.env` file:

- `BOT_TOKEN`: Your Discord bot token (required)
- `ADMIN_USERNAME` and `ADMIN_PASSWORD`: Credentials for accessing the API
- `PORT`: API server port (default: 3001)
- `CORS_HOST`: Allow CORS requests from this host. Should be the URL in which your frontend is served
- `DB_PATH`: Database file location (default: /app/data/sqbot.sqlite3)

### Working with Containers

- View container logs: `docker compose logs -f [service-name]`
- Restart a specific service: `docker compose restart [service-name]`
- Rebuild containers after code changes: `docker compose up -d --build`