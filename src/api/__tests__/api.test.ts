import request, { SuperTest, Test } from "supertest";
import { createApp } from "../index";
import { v4 as uuidv4 } from "uuid";
import { QuizPack, MusicQuizDatastore } from "../../shared/types/quiz";
import { MusicQuizSQLiteDatastore } from "../../shared/database/sqlite";
import { Application } from "express";
import dotenv from "dotenv";

dotenv.config();

// Sample data for testing
const createSampleQuizPack = (id: string, options = {}): QuizPack => ({
  id,
  name: "Test Quiz Pack",
  description: "A pack created for testing",
  createdAt: new Date(),
  updatedAt: new Date(),
  playCount: 0,
  tags: [],
  entries: [
    {
      id: uuidv4(),
      performer: "Test Artist",
      canonicalName: "Test Song",
      possibleAnswers: ["test", "song"],
      ytVideoId: "testvideo123",
      songStart: 0,
      playDuration: 30,
    },
  ],
  ...options,
});

type TestEnvironment = {
  datastore: MusicQuizDatastore;
  app: Application;
  createTestQuizPack: (id: string, options?: any) => Promise<QuizPack>;
  authRequest: (method: string, url: string) => request.Test;
};

/**
 * Create a test environment with isolated datastore and app
 */
function createTestEnvironment(): TestEnvironment {
  // Create a fresh in-memory database for this test
  const datastore = new MusicQuizSQLiteDatastore(":memory:");

  // Create an app with this datastore
  const app = createApp(datastore);

  // Helper to add a quiz pack to the database
  const createTestQuizPack = async (
    id: string = uuidv4(),
    options = {}
  ): Promise<QuizPack> => {
    const quizPack = createSampleQuizPack(id, options);
    await datastore.updateQuizPack(id, quizPack);
    return quizPack;
  };

  // Basic auth credentials for tests
  const AUTH_CREDENTIALS = Buffer.from(
    `${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`
  ).toString("base64");

  // Helper to create an authenticated request
  const authRequest = (method: string, url: string) => {
    const req = request(app);

    switch (method.toLowerCase()) {
      case "get":
        return req.get(url).set("Authorization", `Basic ${AUTH_CREDENTIALS}`);
      case "post":
        return req.post(url).set("Authorization", `Basic ${AUTH_CREDENTIALS}`);
      case "put":
        return req.put(url).set("Authorization", `Basic ${AUTH_CREDENTIALS}`);
      case "delete":
        return req
          .delete(url)
          .set("Authorization", `Basic ${AUTH_CREDENTIALS}`);
      case "patch":
        return req.patch(url).set("Authorization", `Basic ${AUTH_CREDENTIALS}`);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  };

  return {
    datastore,
    app,
    createTestQuizPack,
    authRequest,
  };
}

describe("Quiz Pack API", () => {
  describe("GET /api/pack/:pack_id", () => {
    it("should return 404 if quiz pack not found", async () => {
      // Create isolated test environment
      const { authRequest } = createTestEnvironment();

      const response = await authRequest("get", "/api/pack/nonexistent-pack");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Quiz pack not found");
    });

    it("should return quiz pack data if found", async () => {
      // Create isolated test environment
      const { authRequest, createTestQuizPack } = createTestEnvironment();

      // Add test quiz pack to database
      const quizPack = await createTestQuizPack("test-pack-1");

      const response = await authRequest("get", `/api/pack/${quizPack.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", quizPack.id);
      expect(response.body).toHaveProperty("name", quizPack.name);
      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].performer).toBe("Test Artist");
    });

    it("should return 401 without authentication", async () => {
      // Create isolated test environment
      const { app, createTestQuizPack } = createTestEnvironment();

      const quizPack = await createTestQuizPack("test-pack-auth");

      const response = await request(app).get(`/api/pack/${quizPack.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/pack/:pack_id", () => {
    it("should return 404 if quiz pack to update not found", async () => {
      // Create isolated test environment
      const { authRequest } = createTestEnvironment();

      const nonExistentId = "nonexistent-pack";
      const quizPack = createSampleQuizPack(nonExistentId);

      const response = await authRequest(
        "put",
        `/api/pack/${nonExistentId}`
      ).send(quizPack);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Quiz pack not found");
    });

    it("should return 400 if pack ID in URL doesn't match request body", async () => {
      // Create isolated test environment
      const { authRequest, createTestQuizPack } = createTestEnvironment();

      // First create a quiz pack
      const quizPack = await createTestQuizPack("test-pack-2");

      // Modify the pack ID to mismatch URL
      const modifiedPack = { ...quizPack, id: "different-id" };

      const response = await authRequest(
        "put",
        `/api/pack/${quizPack.id}`
      ).send(modifiedPack);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Quiz pack ID in request body does not match URL parameter"
      );
    });

    it("should update quiz pack successfully", async () => {
      // Create isolated test environment
      const { authRequest, createTestQuizPack } = createTestEnvironment();

      // First create a quiz pack
      const quizPack = await createTestQuizPack("test-pack-3");

      // Modify the pack
      const updatedPack = {
        ...quizPack,
        name: "Updated Pack Name",
        entries: [
          ...quizPack.entries,
          {
            id: uuidv4(),
            performer: "New Artist",
            canonicalName: "New Song",
            possibleAnswers: ["new", "song"],
            ytVideoId: "newvideo123",
            songStart: 10,
            playDuration: 20,
          },
        ],
      };

      const response = await authRequest(
        "put",
        `/api/pack/${quizPack.id}`
      ).send(updatedPack);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);

      // Verify the update by fetching the pack
      const getResponse = await authRequest("get", `/api/pack/${quizPack.id}`);
      expect(getResponse.body).toHaveProperty("name", "Updated Pack Name");
      expect(getResponse.body.entries).toHaveLength(2);
    });
  });

  describe("Tags API", () => {
    it("should add tags to a quiz pack", async () => {
      // Create isolated test environment
      const { authRequest, createTestQuizPack } = createTestEnvironment();

      // Create a quiz pack first
      const quizPack = await createTestQuizPack("test-pack-tags");

      // Add tags to the quiz pack
      const tagsToAdd = ["J-Pop", "2010", "Anime"];
      const response = await authRequest(
        "post",
        `/api/pack/${quizPack.id}/tags`
      ).send({ tags: tagsToAdd });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.tags).toEqual(expect.arrayContaining(tagsToAdd));

      // Verify tags were added by fetching the pack
      const getResponse = await authRequest("get", `/api/pack/${quizPack.id}`);
      expect(getResponse.body.tags).toEqual(expect.arrayContaining(tagsToAdd));
    });

    it("should remove a tag from a quiz pack", async () => {
      // Create isolated test environment
      const { authRequest, createTestQuizPack } = createTestEnvironment();

      // Create a quiz pack with tags
      const quizPack = await createTestQuizPack("test-pack-tag-removal", {
        tags: ["J-Pop", "K-Pop", "2010"],
      });

      // Remove a tag
      const response = await authRequest(
        "delete",
        `/api/pack/${quizPack.id}/tags/K-Pop`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.tags).toEqual(
        expect.arrayContaining(["J-Pop", "2010"])
      );
      expect(response.body.tags).not.toContain("K-Pop");

      // Verify tag was removed
      const getResponse = await authRequest("get", `/api/pack/${quizPack.id}`);
      expect(getResponse.body.tags).toEqual(
        expect.arrayContaining(["J-Pop", "2010"])
      );
      expect(getResponse.body.tags).not.toContain("K-Pop");
    });

    it("should get all available tags", async () => {
      // Create isolated test environment
      const { authRequest, createTestQuizPack } = createTestEnvironment();

      // Create quiz packs with various tags
      await createTestQuizPack("test-pack-tags-1", {
        tags: ["J-Pop", "2010", "Anime"],
      });

      await createTestQuizPack("test-pack-tags-2", {
        tags: ["K-Pop", "2020", "Dance"],
      });

      // Get all tags
      const response = await authRequest("get", "/api/tags");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toEqual(
        expect.arrayContaining([
          "J-Pop",
          "K-Pop",
          "2010",
          "2020",
          "Anime",
          "Dance",
        ])
      );
    });
  });

  describe("Search API", () => {
    // Create a shared test environment for all search tests
    let testEnv: TestEnvironment;

    beforeEach(async () => {
      // Create an isolated test environment
      testEnv = createTestEnvironment();
      const { createTestQuizPack } = testEnv;

      // Create multiple quiz packs with different properties for testing search
      await createTestQuizPack("search-pack-1", {
        name: "Japanese Pop Songs",
        description: "Collection of J-Pop hits",
        tags: ["J-Pop", "2010"],
        playCount: 10,
      });

      await createTestQuizPack("search-pack-2", {
        name: "Korean Drama OST",
        description: "Music from popular K-dramas",
        tags: ["K-Pop", "OST", "Drama"],
        playCount: 5,
      });

      await createTestQuizPack("search-pack-3", {
        name: "Anime Theme Songs",
        description: "Opening songs from popular anime",
        tags: ["J-Pop", "Anime", "Theme"],
        playCount: 20,
      });
    });

    it("should search by text term", async () => {
      const { authRequest } = testEnv;
      const response = await authRequest("get", "/api/search?q=Anime");

      expect(response.status).toBe(200);
      expect(response.body.quizPacks).toHaveLength(1);
      expect(response.body.quizPacks[0].name).toBe("Anime Theme Songs");
    });

    it("should search by tags", async () => {
      const { authRequest } = testEnv;
      const response = await authRequest("get", "/api/search?tags=J-Pop");

      expect(response.status).toBe(200);
      expect(response.body.quizPacks).toHaveLength(2);
      expect(response.body.quizPacks.map((p: any) => p.name)).toEqual(
        expect.arrayContaining(["Japanese Pop Songs", "Anime Theme Songs"])
      );
    });

    it("should order results by specified field", async () => {
      const { authRequest } = testEnv;
      const response = await authRequest(
        "get",
        "/api/search?orderBy=playCount&orderDirection=desc"
      );

      expect(response.status).toBe(200);
      expect(response.body.quizPacks.length).toBeGreaterThan(0);

      // Verify order - first item should have highest play count
      expect(response.body.quizPacks[0].playCount).toBe(20);
      expect(response.body.quizPacks[0].name).toBe("Anime Theme Songs");
    });

    it("should support pagination", async () => {
      const { authRequest } = testEnv;

      // Get first page with 1 item
      const page1 = await authRequest("get", "/api/search?limit=1&offset=0");

      // Get second page with 1 item
      const page2 = await authRequest("get", "/api/search?limit=1&offset=1");

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      expect(page1.body.quizPacks).toHaveLength(1);
      expect(page2.body.quizPacks).toHaveLength(1);

      // Verify different items returned
      expect(page1.body.quizPacks[0].id).not.toBe(page2.body.quizPacks[0].id);

      // Verify pagination metadata
      expect(page1.body.limit).toBe(1);
      expect(page1.body.offset).toBe(0);
      expect(page1.body.total).toBeGreaterThan(1);
    });

    it("should combine search criteria", async () => {
      const { authRequest } = testEnv;
      const response = await authRequest(
        "get",
        "/api/search?tags=J-Pop&q=pop%20song"
      );

      expect(response.status).toBe(200);
      expect(response.body.quizPacks).toHaveLength(1);
    });
  });
});
