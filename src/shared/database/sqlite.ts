import { Database } from "sqlite3";
import {
  QuizEntry,
  QuizPack,
  MusicQuizDatastore,
  QuizPackSearchParams,
  QuizPackSearchResults,
} from "../types/quiz";
import crypto from "crypto";

export class MusicQuizSQLiteDatastore implements MusicQuizDatastore {
  #db: Database;

  constructor(dbPath: string, db?: Database) {
    if (db) {
      this.#db = db;
    } else {
      this.#db = new Database(dbPath);
    }
    this.#initializeDatabase().catch(console.error);
  }

  async #initializeDatabase(): Promise<void> {
    const createTables = `
      CREATE TABLE IF NOT EXISTS quiz_packs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        play_count INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );
      
      CREATE TABLE IF NOT EXISTS quiz_pack_tags (
        quiz_pack_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (quiz_pack_id, tag_id),
        FOREIGN KEY (quiz_pack_id) REFERENCES quiz_packs(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
      
      -- Create index for faster tag lookups
      CREATE INDEX IF NOT EXISTS idx_quiz_pack_tags_tag_id ON quiz_pack_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_pack_tags_quiz_pack_id ON quiz_pack_tags(quiz_pack_id);
    `;

    return new Promise((resolve, reject) => {
      this.#db.exec(createTables, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getQuizPack(quizPackId: string): Promise<QuizPack | null> {
    const quizPackQuery = "SELECT * FROM quiz_packs WHERE id = ?";
    const entriesQuery = "SELECT * FROM quiz_entries WHERE quiz_pack_id = ?";
    const tagsQuery = `
      SELECT t.name 
      FROM tags t
      JOIN quiz_pack_tags qpt ON t.id = qpt.tag_id
      WHERE qpt.quiz_pack_id = ?
    `;

    try {
      const quizPack = await new Promise<any>((resolve, reject) => {
        this.#db.get(quizPackQuery, [quizPackId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!quizPack) return null;

      const entries = await new Promise<any[]>((resolve, reject) => {
        this.#db.all(entriesQuery, [quizPackId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Get tags for this quiz pack
      const tags = await new Promise<string[]>((resolve, reject) => {
        this.#db.all(tagsQuery, [quizPackId], (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map((row) => row.name));
        });
      });

      return {
        id: quizPack.id,
        name: quizPack.name,
        description: quizPack.description,
        playCount: quizPack.play_count || 0,
        createdAt: new Date(quizPack.created_at),
        updatedAt: new Date(quizPack.updated_at),
        tags: tags,
        entries: entries.map(this.#rowToQuizEntry),
      };
    } catch (error) {
      console.error("Error fetching quiz pack:", error);
      return null;
    }
  }

  async listQuizPacks(): Promise<QuizPack[]> {
    const packsQuery = "SELECT * FROM quiz_packs";
    const tagsQuery = `
      SELECT qpt.quiz_pack_id, t.name 
      FROM tags t
      JOIN quiz_pack_tags qpt ON t.id = qpt.tag_id
    `;

    try {
      const quizPacks = await new Promise<any[]>((resolve, reject) => {
        this.#db.all(packsQuery, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Get all tags for all quiz packs in one query
      const allTags = await new Promise<any[]>((resolve, reject) => {
        this.#db.all(tagsQuery, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Group tags by quiz_pack_id
      const tagsByPackId: Record<string, string[]> = {};
      for (const row of allTags) {
        if (!tagsByPackId[row.quiz_pack_id]) {
          tagsByPackId[row.quiz_pack_id] = [];
        }
        tagsByPackId[row.quiz_pack_id].push(row.name);
      }

      const result: QuizPack[] = [];
      for (const pack of quizPacks) {
        const entries = await new Promise<any[]>((resolve, reject) => {
          this.#db.all(
            "SELECT * FROM quiz_entries WHERE quiz_pack_id = ?",
            [pack.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        result.push({
          id: pack.id,
          name: pack.name,
          description: pack.description,
          playCount: pack.play_count || 0,
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
    try {
      let baseQuery = `
        SELECT qp.id, qp.name, qp.description, qp.play_count, qp.created_at, qp.updated_at, COUNT(t.id) as matching_tag_count
        FROM quiz_packs qp
        LEFT OUTER JOIN quiz_pack_tags qpt ON qp.id = qpt.quiz_pack_id
        LEFT OUTER JOIN tags t ON qpt.tag_id = t.id
      `;

      const queryParams: any[] = [];
      const whereConditions: string[] = [];

      // Add conditions for tags
      let filterTags = params.tags || [];
      if (filterTags.length > 0) {
        whereConditions.push(
          `t.name IN (${filterTags.map(() => "?").join(", ")})`
        );
        filterTags.forEach((tag) => queryParams.push(tag));
      }

      // Add search term condition for name and description
      if (params.searchTerm) {
        whereConditions.push("(qp.name LIKE ? OR qp.description LIKE ?)");
        const searchPattern = `%${params.searchTerm}%`;
        queryParams.push(searchPattern, searchPattern);
      }

      // Build the WHERE clause
      let whereClause = "";
      if (whereConditions.length > 0) {
        whereClause = `WHERE ${whereConditions.join(" AND ")}`;
      }

      let groupbyClause = "GROUP BY qp.id";

      // Build the HAVING clause
      let havingClause = "";
      if (filterTags.length > 0) {
        havingClause = `HAVING matching_tag_count >= ${filterTags.length}`;
      }

      // Order clause
      const orderField = params.orderBy || "playCount";
      const orderDirection = params.orderDirection || "desc";
      const orderClause = `ORDER BY qp.${this.#getSQLFieldName(
        orderField
      )} ${orderDirection.toUpperCase()}`;

      // Pagination
      const limit = params.limit || 20;
      const offset = params.offset || 0;
      const paginationClause = `LIMIT ${limit} OFFSET ${offset}`;

      // Build data query
      const dataQuery = `
        ${baseQuery}
        ${whereClause}
        ${groupbyClause}
        ${havingClause}
        ${orderClause}
      `;

      // Build count query - need total without pagination
      const countQuery = `
        SELECT COUNT(DISTINCT qp.id) as total
        FROM (${dataQuery}) AS qp
      `;

      const detailQuery = `
        ${dataQuery}
        ${paginationClause}
      `;

      // Get total count
      const totalCount = await new Promise<number>((resolve, reject) => {
        this.#db.get(countQuery, queryParams, (err, row: any) => {
          if (err) reject(err);
          else resolve(row?.total || 0);
        });
      });

      // Get the quiz packs
      const quizPacks = await new Promise<any[]>((resolve, reject) => {
        this.#db.all(detailQuery, queryParams, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      // Get tags and entries for each quiz pack
      const result: QuizPack[] = [];
      for (const pack of quizPacks) {
        // Get tags for this pack
        const tags = await new Promise<string[]>((resolve, reject) => {
          this.#db.all(
            `SELECT t.name 
             FROM tags t
             JOIN quiz_pack_tags qpt ON t.id = qpt.tag_id
             WHERE qpt.quiz_pack_id = ?`,
            [pack.id],
            (err, rows: any[]) => {
              if (err) reject(err);
              else resolve(rows.map((row) => row.name));
            }
          );
        });

        // Get entries for this pack
        const entries = await new Promise<any[]>((resolve, reject) => {
          this.#db.all(
            "SELECT * FROM quiz_entries WHERE quiz_pack_id = ?",
            [pack.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        result.push({
          id: pack.id,
          name: pack.name,
          description: pack.description,
          tags,
          playCount: pack.play_count || 0,
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
    try {
      await new Promise<void>((resolve, reject) => {
        this.#db.run(
          "UPDATE quiz_packs SET play_count = play_count + 1 WHERE id = ?",
          [quizPackId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      return true;
    } catch (error) {
      console.error("Error incrementing play count:", error);
      return false;
    }
  }

  async getAllTags(): Promise<string[]> {
    try {
      const tags = await new Promise<string[]>((resolve, reject) => {
        this.#db.all(
          "SELECT name FROM tags ORDER BY name",
          (err, rows: any[]) => {
            if (err) reject(err);
            else resolve(rows.map((row) => row.name));
          }
        );
      });

      return tags;
    } catch (error) {
      console.error("Error fetching all tags:", error);
      return [];
    }
  }

  async updateQuizPack(
    quizPackId: string,
    quizPack: QuizPack
  ): Promise<undefined> {
    try {
      // Start a transaction
      await new Promise<void>((resolve, reject) => {
        this.#db.run("BEGIN TRANSACTION", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Update the quiz pack basic info
      await new Promise<void>((resolve, reject) => {
        this.#db.run(
          "INSERT OR REPLACE INTO quiz_packs (id, name, description, play_count, updated_at) VALUES (?, ?, ?, ?, ?)",
          [
            quizPackId,
            quizPack.name,
            quizPack.description,
            quizPack.playCount,
            new Date().toISOString(),
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Delete existing entries
      await new Promise<void>((resolve, reject) => {
        this.#db.run(
          "DELETE FROM quiz_entries WHERE quiz_pack_id = ?",
          [quizPackId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Insert new entries
      for (const entry of quizPack.entries) {
        await new Promise<void>((resolve, reject) => {
          this.#db.run(
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
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      // Update tags - first clear existing tags for this quiz pack
      await new Promise<void>((resolve, reject) => {
        this.#db.run(
          "DELETE FROM quiz_pack_tags WHERE quiz_pack_id = ?",
          [quizPackId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Insert the new tags (if they don't exist) and create associations
      if (quizPack.tags && quizPack.tags.length > 0) {
        for (const tagName of quizPack.tags) {
          // Skip empty tags
          if (!tagName.trim()) continue;

          // Create tag if it doesn't exist
          let tagId = await new Promise<string>((resolve, reject) => {
            // Try to find existing tag
            this.#db.get(
              "SELECT id FROM tags WHERE name = ?",
              [tagName],
              (err, row: any) => {
                if (err) reject(err);
                else resolve(row ? row.id : null);
              }
            );
          });

          if (!tagId) {
            // Create a new tag with a UUID
            tagId = crypto.randomUUID();
            await new Promise<void>((resolve, reject) => {
              this.#db.run(
                "INSERT INTO tags (id, name) VALUES (?, ?)",
                [tagId, tagName],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          }

          // Create the association
          await new Promise<void>((resolve, reject) => {
            this.#db.run(
              "INSERT INTO quiz_pack_tags (quiz_pack_id, tag_id) VALUES (?, ?)",
              [quizPackId, tagId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }

      // Commit the transaction
      await new Promise<void>((resolve, reject) => {
        this.#db.run("COMMIT", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      // Rollback the transaction in case of error
      await new Promise<void>((resolve) => {
        this.#db.run("ROLLBACK", () => resolve());
      });
      console.error("Error updating quiz pack:", error);
    }
    return;
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

  // Method to close the database connection
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.#db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
