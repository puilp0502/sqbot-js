import { MusicQuizMySQLDatastore } from "../mysql";

const MYSQL_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "testpassword",
  database: process.env.DB_NAME || "sqbot_test",
};

// Only run these tests when DB_BACKEND=mysql is set
const describeIfMySQL =
  process.env.DB_BACKEND === "mysql" ? describe : describe.skip;

describeIfMySQL("MusicQuizMySQLDatastore", () => {
  let datastore: MusicQuizMySQLDatastore;

  beforeAll(async () => {
    datastore = new MusicQuizMySQLDatastore(MYSQL_CONFIG);
    // Wait for tables to be created, then seed test data
    await datastore.updateQuizPack("pack1", {
      id: "pack1",
      name: "VTuber Hits",
      description: "VTuber Hit Songs",
      tags: ["vtuber", "jpop"],
      playCount: 0,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      entries: [
        {
          id: "1",
          performer: "코보 카나에루",
          canonicalName: "HELP!!",
          ytVideoId: "z2tDtdHHAHg",
          songStart: 0,
          playDuration: -1,
          possibleAnswers: ["help", "헬프"],
        },
        {
          id: "2",
          performer: "호시마치 스이세이",
          canonicalName: "Stellar Stellar",
          ytVideoId: "a51VH9BYzZA",
          songStart: 0,
          playDuration: -1,
          possibleAnswers: ["스텔라스텔라"],
        },
      ],
    });

    await datastore.updateQuizPack("pack2", {
      id: "pack2",
      name: "Empty Pack",
      description: "No entries",
      tags: [],
      playCount: 0,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
      entries: [],
    });
  });

  afterAll(async () => {
    await datastore.close();
  });

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

      const pack1 = result.find((pack) => pack.id === "pack1");
      expect(pack1?.entries).toHaveLength(2);

      const emptyPack = result.find((pack) => pack.id === "pack2");
      expect(emptyPack?.entries).toHaveLength(0);
    });
  });

  describe("data transformation", () => {
    it("should properly parse dates and JSON fields", async () => {
      const pack = await datastore.getQuizPack("pack1");

      expect(pack?.createdAt).toBeInstanceOf(Date);
      expect(pack?.updatedAt).toBeInstanceOf(Date);

      expect(pack?.entries[0].possibleAnswers).toEqual(["help", "헬프"]);
    });
  });

  describe("tags", () => {
    it("should return tags for a quiz pack", async () => {
      const pack = await datastore.getQuizPack("pack1");
      expect(pack?.tags).toEqual(expect.arrayContaining(["vtuber", "jpop"]));
      expect(pack?.tags).toHaveLength(2);
    });

    it("should return all tags", async () => {
      const tags = await datastore.getAllTags();
      expect(tags).toEqual(expect.arrayContaining(["vtuber", "jpop"]));
    });
  });

  describe("incrementPlayCount", () => {
    it("should increment the play count", async () => {
      const before = await datastore.getQuizPack("pack1");
      const beforeCount = before?.playCount || 0;

      await datastore.incrementPlayCount("pack1");

      const after = await datastore.getQuizPack("pack1");
      expect(after?.playCount).toBe(beforeCount + 1);
    });
  });
});
