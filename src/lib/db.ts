import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { SCHEMA } from "./db-schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "dashstream.db");

export function getDb(dbPath: string = DB_PATH): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  return database;
}

export function initDb(database: Database.Database): void {
  database.exec(SCHEMA);
}

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db == null) {
    _db = getDb();
    initDb(_db);
  }
  return _db;
}
