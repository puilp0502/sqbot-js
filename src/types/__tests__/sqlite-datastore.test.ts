import { MusicQuizSQLiteDatastore } from "../sqlite-datastore";
import { Database } from "sqlite3";

describe("MusicQuizSQLiteDatastore", () => {
  let datastore: MusicQuizSQLiteDatastore;
  let db: Database;
  const TEST_DB_PATH = ":memory:";

  // Set up the database once for all tests
  beforeAll(async () => {
    // Create the database and insert test data
    db = new Database(TEST_DB_PATH);
    await initializeTestData(db);
    datastore = new MusicQuizSQLiteDatastore("_", db);
  });

  // Close connections after all tests
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      db.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // Helper function to set up test data
  async function initializeTestData(db: Database): Promise<void> {
    const setup = `
      -- First create the tables
      CREATE TABLE IF NOT EXISTS quiz_packs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );

      CREATE TABLE IF NOT EXISTS quiz_entries (
        id TEXT PRIMARY KEY,
        quiz_pack_id TEXT NOT NULL,
        performer TEXT NOT NULL,
        canonical_name TEXT NOT NULL,
        yt_video_id TEXT NOT NULL,
        song_start INTEGER NOT NULL,
        play_duration INTEGER NOT NULL,
        possible_answers TEXT NOT NULL,
        FOREIGN KEY (quiz_pack_id) REFERENCES quiz_packs(id)
      );

      -- Insert test quiz packs
      INSERT INTO quiz_packs (id, name, description, created_at, updated_at)
      VALUES 
        ('pack1', 'Rock Classics', 'Classic rock songs', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
        ('pack2', 'Empty Pack', 'No entries', '2024-01-02T00:00:00.000Z', '2024-01-02T00:00:00.000Z');

      -- Insert test quiz entries
      INSERT INTO quiz_entries (id, quiz_pack_id, performer, canonical_name, yt_video_id, song_start, play_duration, possible_answers)
      VALUES 
        ('entry1', 'pack1', 'Led Zeppelin', 'Stairway to Heaven', 'video1', 30, 20, '["Stairway to Heaven", "Highway to Hell", "Smoke on the Water"]'),
        ('entry2', 'pack1', 'Deep Purple', 'Smoke on the Water', 'video2', 0, 30, '["Smoke on the Water", "Purple Rain", "Black Smoke Rising"]');
    `;

    return new Promise((resolve, reject) => {
      db.exec(setup, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  describe("getQuizPack", () => {
    it("should return null for non-existent quiz pack", async () => {
      const result = await datastore.getQuizPack("non-existent-id");
      expect(result).toBeNull();
    });

    it("should correctly retrieve an existing quiz pack with entries", async () => {
      const result = await datastore.getQuizPack("pack1");
      expect(result).toMatchObject({
        id: "pack1",
        name: "Rock Classics",
        description: "Classic rock songs",
        entries: expect.arrayContaining([
          expect.objectContaining({
            id: "entry1",
            performer: "Led Zeppelin",
            canonicalName: "Stairway to Heaven",
          }),
          expect.objectContaining({
            id: "entry2",
            performer: "Deep Purple",
            canonicalName: "Smoke on the Water",
          }),
        ]),
      });
      expect(result?.entries).toHaveLength(2);
    });

    it("should correctly retrieve a quiz pack with no entries", async () => {
      const result = await datastore.getQuizPack("pack2");
      expect(result).toMatchObject({
        id: "pack2",
        name: "Empty Pack",
        description: "No entries",
        entries: [],
      });
    });
  });

  describe("listQuizPacks", () => {
    it("should return all quiz packs with their entries", async () => {
      const result = await datastore.listQuizPacks();
      expect(result).toHaveLength(2);

      // Find and verify the Rock Classics pack
      const rockPack = result.find((pack) => pack.id === "pack1");
      expect(rockPack?.entries).toHaveLength(2);

      // Find and verify the Empty pack
      const emptyPack = result.find((pack) => pack.id === "pack2");
      expect(emptyPack?.entries).toHaveLength(0);
    });
  });

  describe("data transformation", () => {
    it("should properly parse dates and JSON fields", async () => {
      const pack = await datastore.getQuizPack("pack1");

      // Verify date parsing
      expect(pack?.createdAt).toBeInstanceOf(Date);
      expect(pack?.updatedAt).toBeInstanceOf(Date);

      // Verify JSON parsing of possible answers
      expect(pack?.entries[0].possibleAnswers).toEqual([
        "Stairway to Heaven",
        "Highway to Hell",
        "Smoke on the Water",
      ]);
    });
  });
});
