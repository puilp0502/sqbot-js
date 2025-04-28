import request from "supertest";
import { app } from "../index";
import { datastore } from "../datastore";
import { v4 as uuidv4 } from "uuid";
import { QuizPack } from "../../shared/types/quiz";

// Sample data for testing
const createSampleQuizPack = (id: string): QuizPack => ({
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
});

// Helper to add a quiz pack to the database
const createTestQuizPack = async (id: string = uuidv4()): Promise<QuizPack> => {
  const quizPack = createSampleQuizPack(id);
  await datastore.updateQuizPack(id, quizPack);
  return quizPack;
};

describe("Quiz Pack API", () => {
  describe("GET /api/:pack_id", () => {
    it("should return 404 if quiz pack not found", async () => {
      const response = await request(app).get("/api/nonexistent-pack");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Quiz pack not found");
    });

    it("should return quiz pack data if found", async () => {
      // Add test quiz pack to database
      const quizPack = await createTestQuizPack("test-pack-1");

      const response = await request(app).get(`/api/${quizPack.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", quizPack.id);
      expect(response.body).toHaveProperty("name", quizPack.name);
      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].performer).toBe("Test Artist");
    });
  });

  describe("PUT /api/:pack_id", () => {
    it("should return 404 if quiz pack to update not found", async () => {
      const nonExistentId = "nonexistent-pack";
      const quizPack = createSampleQuizPack(nonExistentId);

      const response = await request(app)
        .put(`/api/${nonExistentId}`)
        .send(quizPack);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Quiz pack not found");
    });

    it("should return 400 if pack ID in URL doesn't match request body", async () => {
      // First create a quiz pack
      const quizPack = await createTestQuizPack("test-pack-2");

      // Modify the pack ID to mismatch URL
      const modifiedPack = { ...quizPack, id: "different-id" };

      const response = await request(app)
        .put(`/api/${quizPack.id}`)
        .send(modifiedPack);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Quiz pack ID in request body does not match URL parameter"
      );
    });

    it("should update quiz pack successfully", async () => {
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

      const response = await request(app)
        .put(`/api/${quizPack.id}`)
        .send(updatedPack);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);

      // Verify the update by fetching the pack
      const getResponse = await request(app).get(`/api/${quizPack.id}`);
      expect(getResponse.body).toHaveProperty("name", "Updated Pack Name");
      expect(getResponse.body.entries).toHaveLength(2);
    });
  });
});
