import path from "path";
import { MusicQuizDatastore } from "../shared/types/quiz";
import { MusicQuizSQLiteDatastore } from "../shared/database/sqlite";
import { MusicQuizMySQLDatastore } from "../shared/database/mysql";

const DB_BACKEND = process.env.DB_BACKEND || "sqlite";

export function createDatastore(): MusicQuizDatastore {
  if (DB_BACKEND === "mysql") {
    return new MusicQuizMySQLDatastore({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306", 10),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "sqbot",
    });
  }

  let dbPath = process.env.DB_PATH || path.join(process.cwd(), "sample.sqlite3");
  if (process.env.NODE_ENV === "test") {
    dbPath = ":memory:";
  }
  return new MusicQuizSQLiteDatastore(dbPath);
}

export const datastore = createDatastore();
