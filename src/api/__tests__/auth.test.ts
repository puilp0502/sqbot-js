import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../index";
import { v4 as uuidv4 } from "uuid";
import { MusicQuizSQLiteDatastore } from "../../shared/database/sqlite";
import { Application } from "express";
import { MusicQuizDatastore } from "../../shared/types/quiz";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function createTestEnvironment() {
  const datastore = new MusicQuizSQLiteDatastore(":memory:");
  const app = createApp(datastore);

  const createAdminUser = async () => {
    const user = await datastore.getOrCreateUser("admin-discord-id", "admin-user", "admin@test.com");
    // Manually set role to admin via direct DB access — we need to use the datastore's internal method
    // Since we can't directly access the private DB, we'll create the user and return a token
    return user;
  };

  const generateToken = (userId: string, role: string) => {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "1h" });
  };

  return { datastore, app, createAdminUser, generateToken };
}

describe("JWT Auth Middleware", () => {
  it("should return 401 without Authorization header", async () => {
    const { app } = createTestEnvironment();
    const response = await request(app).get("/api/pack/some-id");
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Authentication required");
  });

  it("should return 401 with invalid JWT", async () => {
    const { app } = createTestEnvironment();
    const response = await request(app)
      .get("/api/pack/some-id")
      .set("Authorization", "Bearer invalid-token");
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Invalid token");
  });

  it("should allow access with valid JWT for user role (reads permitted)", async () => {
    const { app, datastore, generateToken } = createTestEnvironment();
    const user = await datastore.getOrCreateUser("user-discord-id", "regular-user", "user@test.com");
    const token = generateToken(user.id, "user");

    const response = await request(app)
      .get("/api/pack/some-id")
      .set("Authorization", `Bearer ${token}`);
    // Should get 404 (pack not found) rather than auth error — reads are allowed for any role
    expect(response.status).toBe(404);
  });

  it("should return 403 when non-owner user tries to update a pack", async () => {
    const { app, datastore, generateToken } = createTestEnvironment();
    const owner = await datastore.getOrCreateUser("owner-discord-id", "owner-user", "owner@test.com");
    const otherUser = await datastore.getOrCreateUser("other-discord-id", "other-user", "other@test.com");

    // Create a pack owned by 'owner'
    const pack = {
      id: "owned-pack",
      name: "Owner's Pack",
      description: "Test",
      tags: [],
      playCount: 0,
      creatorId: owner.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      entries: [],
    };
    await datastore.updateQuizPack(pack.id, pack);

    // Try to update as 'otherUser'
    const token = generateToken(otherUser.id, "user");
    const response = await request(app)
      .put("/api/pack/owned-pack")
      .set("Authorization", `Bearer ${token}`)
      .send(pack);
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty("error", "You do not have permission to modify this quiz pack");
  });

  it("should allow admin to update any pack", async () => {
    const { app, datastore, generateToken } = createTestEnvironment();
    const owner = await datastore.getOrCreateUser("owner-discord-id", "owner-user", "owner@test.com");
    const admin = await datastore.getOrCreateUser("admin-discord-id", "admin-user", "admin@test.com");

    // Create a pack owned by 'owner'
    const pack = {
      id: "owned-pack-2",
      name: "Owner's Pack",
      description: "Test",
      tags: [],
      playCount: 0,
      creatorId: owner.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      entries: [],
    };
    await datastore.updateQuizPack(pack.id, pack);

    // Admin should be able to update
    const token = generateToken(admin.id, "admin");
    const response = await request(app)
      .put("/api/pack/owned-pack-2")
      .set("Authorization", `Bearer ${token}`)
      .send(pack);
    expect(response.status).toBe(200);
  });

  it("should allow access with valid JWT for admin role", async () => {
    const { app, datastore, generateToken } = createTestEnvironment();
    const user = await datastore.getOrCreateUser("admin-discord-id", "admin-user", "admin@test.com");
    // User is created with 'user' role by default, but we generate a token with 'admin' role
    const token = generateToken(user.id, "admin");

    const response = await request(app)
      .get("/api/pack/some-id")
      .set("Authorization", `Bearer ${token}`);
    // Should get 404 (pack not found) rather than auth error
    expect(response.status).toBe(404);
  });
});

describe("User Datastore Methods", () => {
  it("should create a new user when discord_id is new", async () => {
    const { datastore } = createTestEnvironment();
    const user = await datastore.getOrCreateUser("discord-123", "testuser", "test@example.com");

    expect(user).toBeDefined();
    expect(user.discordId).toBe("discord-123");
    expect(user.discordUsername).toBe("testuser");
    expect(user.email).toBe("test@example.com");
    expect(user.role).toBe("user");
    expect(user.id).toBeDefined();
  });

  it("should return existing user and update username/email on repeat calls", async () => {
    const { datastore } = createTestEnvironment();
    const user1 = await datastore.getOrCreateUser("discord-456", "oldname", "old@example.com");
    const user2 = await datastore.getOrCreateUser("discord-456", "newname", "new@example.com");

    expect(user2.id).toBe(user1.id);
    expect(user2.discordUsername).toBe("newname");
    expect(user2.email).toBe("new@example.com");
    expect(user2.role).toBe("user");
  });

  it("should return null for non-existent user by ID", async () => {
    const { datastore } = createTestEnvironment();
    const user = await datastore.getUserById("non-existent-id");
    expect(user).toBeNull();
  });

  it("should return user after creation by ID", async () => {
    const { datastore } = createTestEnvironment();
    const created = await datastore.getOrCreateUser("discord-789", "user789", "789@example.com");
    const fetched = await datastore.getUserById(created.id);

    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.discordId).toBe("discord-789");
    expect(fetched!.discordUsername).toBe("user789");
  });
});

describe("OAuth Routes", () => {
  it("GET /auth/discord should redirect to Discord authorize URL", async () => {
    const { app } = createTestEnvironment();
    // Set required env vars for this test
    const origClientId = process.env.DISCORD_CLIENT_ID;
    const origRedirectUri = process.env.DISCORD_REDIRECT_URI;
    process.env.DISCORD_CLIENT_ID = "test-client-id";
    process.env.DISCORD_REDIRECT_URI = "http://localhost:3001/auth/discord/callback";

    const response = await request(app).get("/auth/discord");
    expect(response.status).toBe(302);
    expect(response.headers.location).toContain("discord.com/api/oauth2/authorize");
    expect(response.headers.location).toContain("client_id=test-client-id");

    // Restore env vars
    process.env.DISCORD_CLIENT_ID = origClientId;
    process.env.DISCORD_REDIRECT_URI = origRedirectUri;
  });

  it("GET /auth/discord/callback without code should return 400", async () => {
    const { app } = createTestEnvironment();
    const response = await request(app).get("/auth/discord/callback");
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Missing authorization code");
  });

  it("GET /auth/me with valid JWT should return user data", async () => {
    const { app, datastore, generateToken } = createTestEnvironment();
    const user = await datastore.getOrCreateUser("discord-me", "meuser", "me@example.com");
    const token = generateToken(user.id, "user");

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("discordId", "discord-me");
    expect(response.body).toHaveProperty("discordUsername", "meuser");
    expect(response.body).toHaveProperty("email", "me@example.com");
    expect(response.body).toHaveProperty("role", "user");
  });

  it("GET /auth/me without JWT should return 401", async () => {
    const { app } = createTestEnvironment();
    const response = await request(app).get("/auth/me");
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Authentication required");
  });
});
