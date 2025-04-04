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
- **Audio Source**: YouTube (via ytdl-core)
- **Database**: SQLite3

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Discord Bot Token (from Discord Developer Portal)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/discord-music-quiz.git
   cd discord-music-quiz
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file with required configuration:
   ```
   DISCORD_TOKEN=your_discord_token
   DATABASE_URL=your_database_url
   ```

4. Build the project
   ```
   npm run build
   ```

5. Start the bot
   ```
   npm start
   ```

## Development

### Database Schema

Refer to `src/types/sqlite-datastore.ts` for the full schema.

### Testing

Run tests with:
```
npm test
```


## Bot Commands

- `!quiz start [pack_name]` - Start a new quiz with the specified pack
- `!quiz stop` - End the current quiz session
- `!quiz scores` - Show current scores
- `!quiz list` - List available quiz packs

## Game Flow

1. A user starts a quiz with `!quiz start [pack_name]`
2. Bot joins the user's voice channel
3. Bot announces the start of the quiz and explains rules
4. For each round:
   - Bot plays a song clip
   - Players type answers in the text channel
   - First correct answer wins points
   - Bot reveals correct answer and current scores
5. After all rounds, final scores are displayed