import path from "path";
import { MusicQuizSQLiteDatastore } from "../shared/database/sqlite";

let dbPath = process.env.DB_PATH || path.join(process.cwd(), "sample.sqlite3");
if (process.env.NODE_ENV === 'test') {
    dbPath = ':memory:';
}

export const datastore = new MusicQuizSQLiteDatastore(dbPath);
