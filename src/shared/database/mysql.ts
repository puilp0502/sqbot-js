import mysql, { Pool, PoolOptions, RowDataPacket } from "mysql2/promise";
import {
  User,
  QuizEntry,
  QuizPack,
  MusicQuizDatastore,
  QuizPackSearchParams,
  QuizPackSearchResults,
} from "../types/quiz";
import crypto from "crypto";

export class MusicQuizMySQLDatastore implements MusicQuizDatastore {
  #pool: Pool;
  #initialized: Promise<void>;

  constructor(config: PoolOptions) {
    this.#pool = mysql.createPool(config);
    this.#initialized = this.#initializeDatabase();
  }

  async #initializeDatabase(): Promise<void> {
    const conn = await this.#pool.getConnection();
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS quiz_packs (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          play_count INTEGER NOT NULL DEFAULT 0,
          creator_id VARCHAR(255),
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS quiz_entries (
          id VARCHAR(255) PRIMARY KEY,
          quiz_pack_id VARCHAR(255) NOT NULL,
          performer VARCHAR(255) NOT NULL,
          canonical_name VARCHAR(255) NOT NULL,
          yt_video_id VARCHAR(255) NOT NULL,
          song_start INTEGER NOT NULL,
          play_duration INTEGER NOT NULL,
          possible_answers TEXT NOT NULL,
          FOREIGN KEY (quiz_pack_id) REFERENCES quiz_packs(id)
        )
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS tags (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE
        )
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS quiz_pack_tags (
          quiz_pack_id VARCHAR(255) NOT NULL,
          tag_id VARCHAR(255) NOT NULL,
          PRIMARY KEY (quiz_pack_id, tag_id),
          FOREIGN KEY (quiz_pack_id) REFERENCES quiz_packs(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `);

      // Create indexes - use CREATE INDEX IF NOT EXISTS equivalent
      await conn.query(`
        CREATE INDEX idx_quiz_pack_tags_tag_id ON quiz_pack_tags(tag_id)
      `).catch(() => {}); // Ignore if already exists

      await conn.query(`
        CREATE INDEX idx_quiz_pack_tags_quiz_pack_id ON quiz_pack_tags(quiz_pack_id)
      `).catch(() => {}); // Ignore if already exists

      await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          discord_id VARCHAR(255) NOT NULL UNIQUE,
          discord_username VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } finally {
      conn.release();
    }
  }

  async #ready(): Promise<void> {
    await this.#initialized;
  }

  async getQuizPack(quizPackId: string): Promise<QuizPack | null> {
    await this.#ready();
    try {
      const [packs] = await this.#pool.query<RowDataPacket[]>(
        "SELECT * FROM quiz_packs WHERE id = ?",
        [quizPackId]
      );

      if (packs.length === 0) return null;
      const quizPack = packs[0];

      const [entries] = await this.#pool.query<RowDataPacket[]>(
        "SELECT * FROM quiz_entries WHERE quiz_pack_id = ?",
        [quizPackId]
      );

      const [tagRows] = await this.#pool.query<RowDataPacket[]>(
        `SELECT t.name
         FROM tags t
         JOIN quiz_pack_tags qpt ON t.id = qpt.tag_id
         WHERE qpt.quiz_pack_id = ?`,
        [quizPackId]
      );

      return {
        id: quizPack.id,
        name: quizPack.name,
        description: quizPack.description,
        playCount: quizPack.play_count || 0,
        creatorId: quizPack.creator_id || undefined,
        createdAt: new Date(quizPack.created_at),
        updatedAt: new Date(quizPack.updated_at),
        tags: tagRows.map((row) => row.name),
        entries: entries.map(this.#rowToQuizEntry),
      };
    } catch (error) {
      console.error("Error fetching quiz pack:", error);
      return null;
    }
  }

  async listQuizPacks(): Promise<QuizPack[]> {
    await this.#ready();
    try {
      const [quizPacks] = await this.#pool.query<RowDataPacket[]>(
        "SELECT * FROM quiz_packs"
      );

      const [allTags] = await this.#pool.query<RowDataPacket[]>(
        `SELECT qpt.quiz_pack_id, t.name
         FROM tags t
         JOIN quiz_pack_tags qpt ON t.id = qpt.tag_id`
      );

      const tagsByPackId: Record<string, string[]> = {};
      for (const row of allTags) {
        if (!tagsByPackId[row.quiz_pack_id]) {
          tagsByPackId[row.quiz_pack_id] = [];
        }
        tagsByPackId[row.quiz_pack_id].push(row.name);
      }

      const result: QuizPack[] = [];
      for (const pack of quizPacks) {
        const [entries] = await this.#pool.query<RowDataPacket[]>(
          "SELECT * FROM quiz_entries WHERE quiz_pack_id = ?",
          [pack.id]
        );

        result.push({
          id: pack.id,
          name: pack.name,
          description: pack.description,
          playCount: pack.play_count || 0,
          creatorId: pack.creator_id || undefined,
          createdAt: new Date(pack.created_at),
          updatedAt: new Date(pack.updated_at),
          tags: tagsByPackId[pack.id] || [],
          entries: entries.map(this.#rowToQuizEntry),
        });
      }

      return result;
    } catch (error) {
      console.error("Error listing quiz packs:", error);
      return [];
    }
  }

  async searchQuizPacks(
    params: QuizPackSearchParams
  ): Promise<QuizPackSearchResults> {
    await this.#ready();
    try {
      let baseQuery = `
        SELECT qp.id, qp.name, qp.description, qp.play_count, qp.created_at, qp.updated_at, COUNT(t.id) as matching_tag_count
        FROM quiz_packs qp
        LEFT OUTER JOIN quiz_pack_tags qpt ON qp.id = qpt.quiz_pack_id
        LEFT OUTER JOIN tags t ON qpt.tag_id = t.id
      `;

      const queryParams: any[] = [];
      const whereConditions: string[] = [];

      let filterTags = params.tags || [];
      if (filterTags.length > 0) {
        whereConditions.push(
          `t.name IN (${filterTags.map(() => "?").join(", ")})`
        );
        filterTags.forEach((tag) => queryParams.push(tag));
      }

      if (params.searchTerm) {
        whereConditions.push("(qp.name LIKE ? OR qp.description LIKE ?)");
        const searchPattern = `%${params.searchTerm}%`;
        queryParams.push(searchPattern, searchPattern);
      }

      let whereClause = "";
      if (whereConditions.length > 0) {
        whereClause = `WHERE ${whereConditions.join(" AND ")}`;
      }

      let groupbyClause = "GROUP BY qp.id";

      let havingClause = "";
      if (filterTags.length > 0) {
        havingClause = `HAVING matching_tag_count >= ${filterTags.length}`;
      }

      const orderField = params.orderBy || "playCount";
      const orderDirection = params.orderDirection || "desc";
      const orderClause = `ORDER BY qp.${this.#getSQLFieldName(
        orderField
      )} ${orderDirection.toUpperCase()}`;

      const limit = params.limit || 20;
      const offset = params.offset || 0;
      const paginationClause = `LIMIT ${limit} OFFSET ${offset}`;

      const dataQuery = `
        ${baseQuery}
        ${whereClause}
        ${groupbyClause}
        ${havingClause}
        ${orderClause}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM (${dataQuery}) AS sub
      `;

      const detailQuery = `
        ${dataQuery}
        ${paginationClause}
      `;

      const [countRows] = await this.#pool.query<RowDataPacket[]>(
        countQuery,
        queryParams
      );
      const totalCount = countRows[0]?.total || 0;

      const [quizPacks] = await this.#pool.query<RowDataPacket[]>(
        detailQuery,
        queryParams
      );

      const result: QuizPack[] = [];
      for (const pack of quizPacks) {
        const [tagRows] = await this.#pool.query<RowDataPacket[]>(
          `SELECT t.name
           FROM tags t
           JOIN quiz_pack_tags qpt ON t.id = qpt.tag_id
           WHERE qpt.quiz_pack_id = ?`,
          [pack.id]
        );

        const [entries] = await this.#pool.query<RowDataPacket[]>(
          "SELECT * FROM quiz_entries WHERE quiz_pack_id = ?",
          [pack.id]
        );

        result.push({
          id: pack.id,
          name: pack.name,
          description: pack.description,
          tags: tagRows.map((row: any) => row.name),
          playCount: pack.play_count || 0,
          creatorId: pack.creator_id || undefined,
          createdAt: new Date(pack.created_at),
          updatedAt: new Date(pack.updated_at),
          entries: entries.map(this.#rowToQuizEntry),
        });
      }

      return {
        quizPacks: result,
        total: totalCount,
        offset,
        limit,
      };
    } catch (error) {
      console.error("Error searching quiz packs:", error);
      return {
        quizPacks: [],
        total: 0,
        offset: params.offset || 0,
        limit: params.limit || 20,
      };
    }
  }

  async incrementPlayCount(quizPackId: string): Promise<boolean> {
    await this.#ready();
    try {
      await this.#pool.query(
        "UPDATE quiz_packs SET play_count = play_count + 1 WHERE id = ?",
        [quizPackId]
      );
      return true;
    } catch (error) {
      console.error("Error incrementing play count:", error);
      return false;
    }
  }

  async getAllTags(): Promise<string[]> {
    await this.#ready();
    try {
      const [rows] = await this.#pool.query<RowDataPacket[]>(
        "SELECT name FROM tags ORDER BY name"
      );
      return rows.map((row) => row.name);
    } catch (error) {
      console.error("Error fetching all tags:", error);
      return [];
    }
  }

  async updateQuizPack(
    quizPackId: string,
    quizPack: QuizPack
  ): Promise<undefined> {
    await this.#ready();
    const conn = await this.#pool.getConnection();
    try {
      await conn.beginTransaction();

      // Upsert the quiz pack — preserve existing creator_id on UPDATE
      await conn.query(
        `INSERT INTO quiz_packs (id, name, description, play_count, creator_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           play_count = VALUES(play_count),
           updated_at = VALUES(updated_at)`,
        [
          quizPackId,
          quizPack.name,
          quizPack.description,
          quizPack.playCount,
          quizPack.creatorId || null,
          this.#formatDateForMySQL(new Date()),
        ]
      );

      // Delete existing entries
      await conn.query(
        "DELETE FROM quiz_entries WHERE quiz_pack_id = ?",
        [quizPackId]
      );

      // Insert new entries
      for (const entry of quizPack.entries) {
        await conn.query(
          `INSERT INTO quiz_entries
           (id, quiz_pack_id, performer, canonical_name, possible_answers, yt_video_id, song_start, play_duration)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.id,
            quizPackId,
            entry.performer,
            entry.canonicalName,
            JSON.stringify(entry.possibleAnswers),
            entry.ytVideoId,
            entry.songStart,
            entry.playDuration,
          ]
        );
      }

      // Clear existing tags for this quiz pack
      await conn.query(
        "DELETE FROM quiz_pack_tags WHERE quiz_pack_id = ?",
        [quizPackId]
      );

      // Insert new tags and associations
      if (quizPack.tags && quizPack.tags.length > 0) {
        for (const tagName of quizPack.tags) {
          if (!tagName.trim()) continue;

          // Find or create tag
          const [existing] = await conn.query<RowDataPacket[]>(
            "SELECT id FROM tags WHERE name = ?",
            [tagName]
          );

          let tagId: string;
          if (existing.length > 0) {
            tagId = existing[0].id;
          } else {
            tagId = crypto.randomUUID();
            await conn.query(
              "INSERT INTO tags (id, name) VALUES (?, ?)",
              [tagId, tagName]
            );
          }

          // Create the association
          await conn.query(
            "INSERT INTO quiz_pack_tags (quiz_pack_id, tag_id) VALUES (?, ?)",
            [quizPackId, tagId]
          );
        }
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      console.error("Error updating quiz pack:", error);
    } finally {
      conn.release();
    }
    return;
  }

  async getOrCreateUser(discordId: string, discordUsername: string, email: string): Promise<User> {
    await this.#ready();
    const now = this.#formatDateForMySQL(new Date());
    const id = crypto.randomUUID();

    await this.#pool.query(
      `INSERT INTO users (id, discord_id, discord_username, email, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'user', ?, ?)
       ON DUPLICATE KEY UPDATE
         discord_username = VALUES(discord_username),
         email = VALUES(email),
         updated_at = VALUES(updated_at)`,
      [id, discordId, discordUsername, email, now, now]
    );

    const [rows] = await this.#pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE discord_id = ?",
      [discordId]
    );

    const row = rows[0];
    return {
      id: row.id,
      discordId: row.discord_id,
      discordUsername: row.discord_username,
      email: row.email,
      role: row.role,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    await this.#ready();
    const [rows] = await this.#pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      discordId: row.discord_id,
      discordUsername: row.discord_username,
      email: row.email,
      role: row.role,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  #formatDateForMySQL(date: Date): string {
    return date.toISOString().slice(0, 19).replace("T", " ");
  }

  #rowToQuizEntry(row: any): QuizEntry {
    return {
      id: row.id,
      performer: row.performer,
      canonicalName: row.canonical_name,
      possibleAnswers: JSON.parse(row.possible_answers),
      ytVideoId: row.yt_video_id,
      songStart: row.song_start,
      playDuration: row.play_duration,
    };
  }

  #getSQLFieldName(jsField: string): string {
    switch (jsField) {
      case "createdAt":
        return "created_at";
      case "updatedAt":
        return "updated_at";
      case "playCount":
        return "play_count";
      default:
        return jsField;
    }
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}
