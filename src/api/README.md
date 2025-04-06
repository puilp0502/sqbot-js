# Quiz API Server

This API server provides endpoints for managing quiz packs for the music quiz application.

## Setup

The API server uses Express.js and connects to the SQLite database that's also used by the bot.

## Running the Server

To run the API server:

1. Build the TypeScript files:
   ```
   pnpm build
   ```

2. Start the API server:
   ```
   pnpm api
   ```

The server runs on port 3001 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

### GET /api/:pack_id

Retrieves a quiz pack by its ID.

**Response:**
- `200 OK` with the quiz pack data if found
- `404 Not Found` if the quiz pack doesn't exist

Example response:
```json
{
  "id": "12345",
  "name": "80s Rock Hits",
  "description": "Classic rock songs from the 1980s",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-02T00:00:00.000Z",
  "entries": [
    {
      "id": "entry1",
      "performer": "Queen",
      "canonicalName": "We Will Rock You",
      "possibleAnswers": ["We Will Rock You", "Rock You"],
      "ytVideoId": "abcd1234",
      "songStart": 30,
      "playDuration": 20
    }
  ]
}
```

### PUT /api/:pack_id

Updates a quiz pack with the provided data.

**Request Body:**
- The complete quiz pack object with the same ID as in the URL

**Response:**
- `200 OK` with `{ "success": true }` if updated successfully
- `400 Bad Request` if the IDs don't match
- `404 Not Found` if the quiz pack doesn't exist

## Environment Variables

- `PORT`: The port number for the API server (default: 3001)
- `DB_PATH`: Path to the SQLite database file (default: './sample.sqlite3')
- `NODE_ENV`: Set to 'production' to hide error details in responses