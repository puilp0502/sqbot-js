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
        ('pack1', 'VTuber Hits', 'VTuber Hit Songs', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
        ('pack2', 'Empty Pack', 'No entries', '2024-01-02T00:00:00.000Z', '2024-01-02T00:00:00.000Z');

      -- Insert test quiz entries
      INSERT INTO quiz_entries (id, quiz_pack_id, performer, canonical_name, yt_video_id, song_start, play_duration, possible_answers)
      VALUES 
        ('1', 'pack1', '코보 카나에루', 'HELP!!', 'z2tDtdHHAHg', 0, -1, '["help", "헬프"]'),
        ('2', 'pack1', '호시마치 스이세이', 'Stellar Stellar', 'a51VH9BYzZA', 0, -1, '["스텔라스텔라"]');
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
        name: "VTuber Hits",
        description: "VTuber Hit Songs",
        entries: expect.arrayContaining([
          expect.objectContaining({
            id: "1",
            performer: "코보 카나에루",
            canonicalName: "HELP!!",
          }),
          expect.objectContaining({
            id: "2",
            performer: "호시마치 스이세이",
            canonicalName: "Stellar Stellar",
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
      expect(pack?.entries[0].possibleAnswers).toEqual(["help", "헬프"]);
    });
  });
});
