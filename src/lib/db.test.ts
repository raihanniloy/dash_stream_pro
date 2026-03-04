import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb, initDb } from "./db";
import fs from "fs";
import path from "path";

const TEST_DB = path.join(__dirname, "test.db");

describe("Database", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it("creates all tables on init", () => {
    const db = getDb(TEST_DB);
    initDb(db);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all()
      .map((r: any) => r.name);

    expect(tables).toContain("users");
    expect(tables).toContain("data_sources");
    expect(tables).toContain("dashboards");
    expect(tables).toContain("charts");
    expect(tables).toContain("share_links");

    db.close();
  });

  it("enforces unique email constraint on users", () => {
    const db = getDb(TEST_DB);
    initDb(db);

    const insert = db.prepare(
      "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)"
    );
    insert.run("id1", "test@example.com", "hash", "Test");

    expect(() => {
      insert.run("id2", "test@example.com", "hash2", "Test2");
    }).toThrow();

    db.close();
  });

  it("enforces unique share_token constraint on share_links", () => {
    const db = getDb(TEST_DB);
    initDb(db);

    // First create the user and dashboard records share_links depends on
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run("uid1", "a@b.com", "hash");
    db.prepare("INSERT INTO data_sources (id, user_id, filename, file_path, file_type) VALUES (?, ?, ?, ?, ?)").run("ds1", "uid1", "f.csv", "/f.csv", "csv");
    db.prepare("INSERT INTO dashboards (id, user_id, data_source_id) VALUES (?, ?, ?)").run("dash1", "uid1", "ds1");
    db.prepare("INSERT INTO share_links (id, dashboard_id, share_token) VALUES (?, ?, ?)").run("sl1", "dash1", "abc123");

    expect(() => {
      db.prepare("INSERT INTO share_links (id, dashboard_id, share_token) VALUES (?, ?, ?)").run("sl2", "dash1", "abc123");
    }).toThrow();

    db.close();
  });

  it("cascades delete from users to data_sources", () => {
    const db = getDb(TEST_DB);
    initDb(db);

    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run("uid1", "a@b.com", "hash");
    db.prepare("INSERT INTO data_sources (id, user_id, filename, file_path, file_type) VALUES (?, ?, ?, ?, ?)").run("ds1", "uid1", "f.csv", "/f.csv", "csv");

    db.prepare("DELETE FROM users WHERE id = ?").run("uid1");

    const ds = db.prepare("SELECT id FROM data_sources WHERE id = ?").get("ds1");
    expect(ds).toBeUndefined();

    db.close();
  });
});
