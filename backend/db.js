const path = require("path");
const fs = require("fs");

const DATABASE_URL = process.env.DATABASE_URL;
const isPostgres = !!DATABASE_URL;

let db;
let run, get, all;

if (isPostgres) {
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  function convertParams(sql, params) {
    let paramIndex = 1;
    const newSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    return { sql: newSql, params };
  }

  run = async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const { sql: newSql, params: newParams } = convertParams(sql, params);
      const result = await client.query(newSql, newParams);
      let lastID = null;
      if (result.command === 'INSERT') {
        const idResult = await client.query('SELECT lastval() as lastid');
        lastID = idResult.rows[0]?.lastid;
      }
      return { lastID, changes: result.rowCount };
    } finally {
      client.release();
    }
  };

  get = async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const { sql: newSql, params: newParams } = convertParams(sql, params);
      const result = await client.query(newSql, newParams);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  };

  all = async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const { sql: newSql, params: newParams } = convertParams(sql, params);
      const result = await client.query(newSql, newParams);
      return result.rows;
    } finally {
      client.release();
    }
  };
} else {
  const sqlite3 = require("sqlite3").verbose();

  const defaultDbPath = path.join(__dirname, "data", "class.db");
  const dbPath =
    process.env.DB_PATH ||
    (process.env.RENDER ? "/var/data/class.db" : defaultDbPath);

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new sqlite3.Database(dbPath);

  run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
      });
    });
  };

  get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  };

  all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  };
}

async function initDb() {
  if (isPostgres) {
    await run(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gender TEXT,
        avatar TEXT,
        bio TEXT,
        contact TEXT,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS accounts (
        student_id TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_login_at TEXT,
        FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS invites (
        code TEXT PRIMARY KEY,
        student_id TEXT,
        created_at TEXT NOT NULL,
        used_at TEXT,
        used_by_student_id TEXT,
        FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE SET NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS relationships (
        id SERIAL PRIMARY KEY,
        from_student_id TEXT NOT NULL,
        to_student_id TEXT NOT NULL,
        type TEXT,
        note TEXT,
        status TEXT DEFAULT 'accepted',
        requested_by TEXT,
        approved_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(from_student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY(to_student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        student_id TEXT NOT NULL,
        nickname TEXT,
        subtitle TEXT,
        content TEXT NOT NULL,
        image_url TEXT,
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        approved_at TEXT,
        FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    // Add missing columns for migration
    try {
      await run(`ALTER TABLE relationships ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted'`);
    } catch (e) {}
    try {
      await run(`ALTER TABLE relationships ADD COLUMN IF NOT EXISTS requested_by TEXT`);
    } catch (e) {}
    try {
      await run(`ALTER TABLE relationships ADD COLUMN IF NOT EXISTS approved_at TEXT`);
    } catch (e) {}
    await run(`UPDATE relationships SET status = 'accepted' WHERE status IS NULL`);
  } else {
    await run("PRAGMA foreign_keys = ON");

    await run(
      `CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gender TEXT,
        avatar TEXT,
        bio TEXT,
        contact TEXT,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    );

    await run(
      `CREATE TABLE IF NOT EXISTS accounts (
        student_id TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_login_at TEXT,
        FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
      )`
    );

    await run(
      `CREATE TABLE IF NOT EXISTS invites (
        code TEXT PRIMARY KEY,
        student_id TEXT,
        created_at TEXT NOT NULL,
        used_at TEXT,
        used_by_student_id TEXT,
        FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE SET NULL
      )`
    );

    await run(
      `CREATE TABLE IF NOT EXISTS relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_student_id TEXT NOT NULL,
        to_student_id TEXT NOT NULL,
        type TEXT,
        note TEXT,
        status TEXT DEFAULT 'accepted',
        requested_by TEXT,
        approved_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(from_student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY(to_student_id) REFERENCES students(id) ON DELETE CASCADE
      )`
    );

    await run(
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        nickname TEXT,
        subtitle TEXT,
        content TEXT NOT NULL,
        image_url TEXT,
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        approved_at TEXT,
        FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
      )`
    );

    // Backward-compatible migrations
    const addColumnIfMissing = async (columnSql) => {
      try {
        await run(columnSql);
      } catch (err) {}
    };
    await addColumnIfMissing("ALTER TABLE relationships ADD COLUMN status TEXT DEFAULT 'accepted'");
    await addColumnIfMissing("ALTER TABLE relationships ADD COLUMN requested_by TEXT");
    await addColumnIfMissing("ALTER TABLE relationships ADD COLUMN approved_at TEXT");
    await run("UPDATE relationships SET status = 'accepted' WHERE status IS NULL");
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb,
  isPostgres,
};
