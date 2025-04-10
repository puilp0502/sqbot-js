import { Database } from "sqlite3";
import { QuizEntry, QuizPack, MusicQuizDatastore } from "../types/quiz";

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

      return this.#rowToQuizPack(quizPack, entries.map(this.#rowToQuizEntry));
    } catch (error) {
      console.error("Error fetching quiz pack:", error);
      return null;
    }
  }

  async listQuizPacks(): Promise<QuizPack[]> {
    const query = "SELECT * FROM quiz_packs";

    try {
      const quizPacks = await new Promise<any[]>((resolve, reject) => {
        this.#db.all(query, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

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

        result.push(
          this.#rowToQuizPack(pack, entries.map(this.#rowToQuizEntry))
        );
      }

      return result;
    } catch (error) {
      console.error("Error listing quiz packs:", error);
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

      // Update the quiz pack
      await new Promise<void>((resolve, reject) => {
        this.#db.run(
          "INSERT OR REPLACE INTO quiz_packs (id, name, description, updated_at) VALUES (?, ?, ?, ?)",
          [
            quizPackId,
            quizPack.name,
            quizPack.description,
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

  #rowToQuizPack(row: any, entries: QuizEntry[]): QuizPack {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      entries,
    };
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
