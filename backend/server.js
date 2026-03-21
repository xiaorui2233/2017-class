require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { initDb, run, get, all, isPostgres } = require("./db");

function getOrderByName(table = "name") {
  return isPostgres ? `ORDER BY LOWER(${table})` : `ORDER BY ${table} COLLATE NOCASE`;
}

const app = express();
app.set("trust proxy", true);
const PORT = process.env.PORT || 4000;
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const REQUIRE_INVITE = (process.env.REQUIRE_INVITE || "true").toLowerCase() !== "false";
const contentPath = path.join(__dirname, "data", "class_content.json");
const GITHUB_OWNER = process.env.GITHUB_OWNER || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_UPLOAD_PATH = process.env.GITHUB_UPLOAD_PATH || "assets/uploads";
const GITHUB_PAT = process.env.GITHUB_PAT || "";
const uploadsTempDir = path.join(__dirname, "uploads_temp");
const tempTokens = new Map();
const UPLOAD_PROVIDER = (process.env.UPLOAD_PROVIDER || "local").toLowerCase();
const FILE_ENCRYPT_KEY = process.env.FILE_ENCRYPT_KEY || "";
const uploadsDir = path.join(__dirname, "uploads");

const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use("/admin", express.static(path.join(__dirname, "public")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

function ensureTempDir() {
  if (!fs.existsSync(uploadsTempDir)) {
    fs.mkdirSync(uploadsTempDir, { recursive: true });
  }
}

function nowIso() {
  return new Date().toISOString();
}

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

function generateStudentId() {
  return `s_${crypto.randomBytes(4).toString("hex")}`;
}

function generateInviteCode() {
  return crypto.randomBytes(6).toString("hex");
}

function createTempUpload(buffer, originalName, mime) {
  ensureTempDir();
  const id = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  const token = crypto.randomBytes(18).toString("hex");
  const filePath = path.join(uploadsTempDir, `${id}.bin`);
  fs.writeFileSync(filePath, buffer);
  const expiresAt = Date.now() + 10 * 60 * 1000;
  tempTokens.set(id, { token, mime, originalName, filePath, expiresAt });
  return { id, token };
}

function getTempUpload(id, token) {
  const entry = tempTokens.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tempTokens.delete(id);
    return null;
  }
  if (entry.token !== token) return null;
  return entry;
}

function getEncryptKey() {
  if (!FILE_ENCRYPT_KEY) {
    throw new Error("FILE_ENCRYPT_KEY is not set");
  }
  return crypto.createHash("sha256").update(FILE_ENCRYPT_KEY).digest();
}

function encryptBuffer(buffer) {
  const key = getEncryptKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function decryptBuffer(buffer) {
  const key = getEncryptKey();
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const data = buffer.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

function readContent() {
  try {
    const raw = fs.readFileSync(contentPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return {
      featured: { title: "", date: "", desc: "" },
      events: [],
      timeline: [],
      posts: [],
      albums: [],
    };
  }
}

function writeContent(content) {
  fs.writeFileSync(contentPath, JSON.stringify(content, null, 2), "utf8");
}

async function dispatchUploadToGitHub({ filename, tempUrl, tempToken }) {
  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_PAT) {
    throw new Error("GitHub upload is not configured");
  }
  const payload = {
    event_type: "upload_image",
    client_payload: {
      filename,
      temp_url: tempUrl,
      temp_token: tempToken,
      upload_path: GITHUB_UPLOAD_PATH,
      branch: GITHUB_BRANCH,
    },
  };
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${GITHUB_PAT}`,
      "User-Agent": "class-starry-backend",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub dispatch failed: ${res.status} ${text}`);
  }
}

async function createInvite(studentId) {
  const code = generateInviteCode();
  await run(
    `INSERT INTO invites (code, student_id, created_at) VALUES (?, ?, ?)`,
    [code, studentId || null, nowIso()]
  );
  return code;
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  const account = await get("SELECT student_id, token FROM accounts WHERE token = ?", [token]);
  if (!account) return res.status(401).json({ error: "Invalid token" });

  req.auth = { studentId: account.student_id, token: account.token };
  return next();
}

function adminMiddleware(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/auth/register", async (req, res) => {
  try {
    const { studentId, name, inviteCode } = req.body || {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }

    let finalStudentId = studentId && String(studentId).trim() ? String(studentId).trim() : generateStudentId();

    if (REQUIRE_INVITE) {
      if (!inviteCode || typeof inviteCode !== "string") {
        return res.status(400).json({ error: "Invite code is required" });
      }
      const invite = await get("SELECT * FROM invites WHERE code = ?", [inviteCode.trim()]);
      if (!invite) return res.status(400).json({ error: "Invalid invite code" });
      if (invite.used_at) return res.status(400).json({ error: "Invite code already used" });
      if (invite.student_id) {
        finalStudentId = invite.student_id;
      }
    }

    const existingAccount = await get("SELECT student_id FROM accounts WHERE student_id = ?", [finalStudentId]);
    if (existingAccount) {
      return res.status(409).json({ error: "Account already exists for this student" });
    }

    const existingStudent = await get("SELECT id FROM students WHERE id = ?", [finalStudentId]);
    if (!existingStudent) {
      const now = nowIso();
      await run(
        `INSERT INTO students (id, name, gender, avatar, bio, contact, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [finalStudentId, name.trim(), null, null, null, null, null, now, now]
      );
    }

    const token = generateToken();
    const now = nowIso();
    await run(
      `INSERT INTO accounts (student_id, token, created_at, last_login_at)
       VALUES (?, ?, ?, ?)`,
      [finalStudentId, token, now, now]
    );

    if (REQUIRE_INVITE) {
      await run(
        `UPDATE invites SET used_at = ?, used_by_student_id = ? WHERE code = ?`,
        [now, finalStudentId, inviteCode.trim()]
      );
    }

    const student = await get("SELECT * FROM students WHERE id = ?", [finalStudentId]);
    return res.json({ token, student });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token is required" });
    }

    const account = await get("SELECT student_id FROM accounts WHERE token = ?", [token.trim()]);
    if (!account) return res.status(401).json({ error: "Invalid token" });

    await run("UPDATE accounts SET last_login_at = ? WHERE token = ?", [nowIso(), token.trim()]);
    const student = await get("SELECT * FROM students WHERE id = ?", [account.student_id]);
    return res.json({ token: token.trim(), student });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/content", (req, res) => {
  const content = readContent();
  return res.json(content);
});

app.get("/admin/content", adminMiddleware, (req, res) => {
  const content = readContent();
  return res.json(content);
});

app.put("/admin/content", adminMiddleware, (req, res) => {
  try {
    const { content } = req.body || {};
    if (!content || typeof content !== "object") {
      return res.status(400).json({ error: "content is required" });
    }
    writeContent(content);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/admin/students", adminMiddleware, async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM students ${getOrderByName()}`);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/admin/accounts", adminMiddleware, async (req, res) => {
  try {
    const rows = await all(
      `SELECT students.id, students.name, accounts.token, accounts.last_login_at
       FROM students
       LEFT JOIN accounts ON students.id = accounts.student_id
       ${getOrderByName('students.name')}`
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/admin/students", adminMiddleware, async (req, res) => {
  try {
    const { id, name, gender, avatar, bio, contact, tags } = req.body || {};
    if (!id || !name) {
      return res.status(400).json({ error: "id and name are required" });
    }
    const existing = await get("SELECT id FROM students WHERE id = ?", [String(id).trim()]);
    if (existing) return res.status(409).json({ error: "Student already exists" });
    const now = nowIso();
    await run(
      `INSERT INTO students (id, name, gender, avatar, bio, contact, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(id).trim(),
        String(name).trim(),
        gender || null,
        avatar || null,
        bio || null,
        contact || null,
        tags || null,
        now,
        now,
      ]
    );
    const student = await get("SELECT * FROM students WHERE id = ?", [String(id).trim()]);
    return res.json(student);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.put("/admin/students/:id", adminMiddleware, async (req, res) => {
  try {
    const allowed = ["name", "gender", "avatar", "bio", "contact", "tags"];
    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
        updates.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push("updated_at = ?");
    values.push(nowIso());
    values.push(req.params.id);

    await run(`UPDATE students SET ${updates.join(", ")} WHERE id = ?`, values);
    const student = await get("SELECT * FROM students WHERE id = ?", [req.params.id]);
    return res.json(student);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.delete("/admin/students/:id", adminMiddleware, async (req, res) => {
  try {
    await run("DELETE FROM students WHERE id = ?", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/admin/invites", adminMiddleware, async (req, res) => {
  try {
    const rows = await all("SELECT * FROM invites ORDER BY created_at DESC");
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/admin/uploads", adminMiddleware, async (req, res) => {
  try {
    const rows = await all(
      "SELECT id, student_id, image_url, created_at FROM messages WHERE image_url IS NOT NULL ORDER BY created_at DESC LIMIT 40"
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/admin/invites", adminMiddleware, async (req, res) => {
  try {
    const { studentId, count } = req.body || {};
    const created = [];

    if (studentId) {
      const sid = String(studentId).trim();
      const student = await get("SELECT id FROM students WHERE id = ?", [sid]);
      if (!student) return res.status(404).json({ error: "Student not found" });
      const existingInvite = await get(
        "SELECT code FROM invites WHERE student_id = ? AND used_at IS NULL",
        [sid]
      );
      if (existingInvite) {
        created.push({ code: existingInvite.code, studentId: sid });
      } else {
        const code = await createInvite(sid);
        created.push({ code, studentId: sid });
      }
      return res.json({ invites: created });
    }

    const total = Math.max(1, Math.min(Number(count) || 1, 50));
    for (let i = 0; i < total; i += 1) {
      const code = await createInvite(null);
      created.push({ code, studentId: null });
    }
    return res.json({ invites: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.delete("/admin/invites/:code", adminMiddleware, async (req, res) => {
  try {
    await run("DELETE FROM invites WHERE code = ?", [req.params.code]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/messages", authMiddleware, async (req, res) => {
  try {
    const rows = await all(
      "SELECT id, student_id, nickname, subtitle, content, image_url, is_anonymous, created_at FROM messages WHERE status = 'approved' ORDER BY created_at DESC"
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/messages", authMiddleware, async (req, res) => {
  try {
    const { nickname, subtitle, content, imageUrl, isAnonymous } = req.body || {};
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "content is required" });
    }
    const createdAt = nowIso();
    const result = await run(
      `INSERT INTO messages (student_id, nickname, subtitle, content, image_url, is_anonymous, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        req.auth.studentId,
        nickname || null,
        subtitle || null,
        content.trim(),
        imageUrl || null,
        isAnonymous ? 1 : 0,
        createdAt,
      ]
    );
    const msg = await get("SELECT * FROM messages WHERE id = ?", [result.lastID]);
    return res.json(msg);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file is required" });
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "only image files are allowed" });
    }

  if (UPLOAD_PROVIDER === "github") {
    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    const temp = createTempUpload(req.file.buffer, req.file.originalname, req.file.mimetype);
    const tempUrl = `${req.protocol}://${req.get("host")}/upload-temp/${temp.id}`;
    await dispatchUploadToGitHub({ filename, tempUrl, tempToken: temp.token });
    const url = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/${GITHUB_UPLOAD_PATH}/${filename}`;
    return res.json({ url, filename, provider: "github" });
  }

    ensureUploadsDir();
    const id = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const encrypted = encryptBuffer(req.file.buffer);
    const binPath = path.join(uploadsDir, `${id}.bin`);
    const metaPath = path.join(uploadsDir, `${id}.json`);
    const meta = {
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
      createdAt: nowIso(),
    };
    fs.writeFileSync(binPath, encrypted);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
    const url = `${req.protocol}://${req.get("host")}/uploads/${id}`;
    return res.json({ url, id, provider: "local" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

app.get("/upload-temp/:id", (req, res) => {
  try {
    const token = req.query.token || "";
    const entry = getTempUpload(req.params.id, String(token));
    if (!entry) return res.status(404).json({ error: "Not found" });
    res.setHeader("Content-Type", entry.mime || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    const data = fs.readFileSync(entry.filePath);
    fs.unlinkSync(entry.filePath);
    tempTokens.delete(req.params.id);
    return res.send(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

app.get("/uploads/:id", authMiddleware, async (req, res) => {
  try {
    ensureUploadsDir();
    const id = req.params.id;
    const binPath = path.join(uploadsDir, `${id}.bin`);
    const metaPath = path.join(uploadsDir, `${id}.json`);
    if (!fs.existsSync(binPath) || !fs.existsSync(metaPath)) {
      return res.status(404).json({ error: "Not found" });
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    const encrypted = fs.readFileSync(binPath);
    const decrypted = decryptBuffer(encrypted);
    res.setHeader("Content-Type", meta.mime || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    return res.send(decrypted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

app.get("/admin/messages", adminMiddleware, async (req, res) => {
  try {
    const rows = await all("SELECT * FROM messages ORDER BY created_at DESC");
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.put("/admin/messages/:id", adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "invalid status" });
    }
    const approvedAt = status === "approved" ? nowIso() : null;
    await run("UPDATE messages SET status = ?, approved_at = ? WHERE id = ?", [
      status,
      approvedAt,
      req.params.id,
    ]);
    const msg = await get("SELECT * FROM messages WHERE id = ?", [req.params.id]);
    return res.json(msg);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.delete("/admin/messages/:id", adminMiddleware, async (req, res) => {
  try {
    await run("DELETE FROM messages WHERE id = ?", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/admin/import", adminMiddleware, async (req, res) => {
  try {
    const { students, generateInvites } = req.body || {};
    if (!Array.isArray(students)) {
      return res.status(400).json({ error: "students must be an array" });
    }

    const created = [];
    const updated = [];
    const inviteList = [];
    const now = nowIso();

    for (const student of students) {
      if (!student.id || !student.name) continue;
      const id = String(student.id).trim();
      const name = String(student.name).trim();
      if (!id || !name) continue;

      const existing = await get("SELECT id FROM students WHERE id = ?", [id]);
      if (existing) {
        await run(
          `UPDATE students SET name = ?, gender = ?, avatar = ?, bio = ?, contact = ?, tags = ?, updated_at = ?
           WHERE id = ?`,
          [
            name,
            student.gender || null,
            student.avatar || null,
            student.bio || null,
            student.contact || null,
            student.tags || null,
            now,
            id,
          ]
        );
        updated.push(id);
      } else {
        await run(
          `INSERT INTO students (id, name, gender, avatar, bio, contact, tags, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            name,
            student.gender || null,
            student.avatar || null,
            student.bio || null,
            student.contact || null,
            student.tags || null,
            now,
            now,
          ]
        );
        created.push(id);
      }

      if (generateInvites) {
        const existingInvite = await get("SELECT code FROM invites WHERE student_id = ? AND used_at IS NULL", [id]);
        if (existingInvite) {
          inviteList.push({ studentId: id, code: existingInvite.code });
        } else {
          const code = generateInviteCode();
          await run(
            `INSERT INTO invites (code, student_id, created_at) VALUES (?, ?, ?)`,
            [code, id, now]
          );
          inviteList.push({ studentId: id, code });
        }
      }
    }

    return res.json({ created, updated, invites: inviteList });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/students", async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM students ${getOrderByName()}`);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/students/:id", async (req, res) => {
  try {
    const student = await get("SELECT * FROM students WHERE id = ?", [req.params.id]);
    if (!student) return res.status(404).json({ error: "Not found" });
    return res.json(student);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.put("/students/:id", authMiddleware, async (req, res) => {
  try {
    if (req.auth.studentId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const allowed = ["name", "gender", "avatar", "bio", "contact", "tags"];
    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
        updates.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push("updated_at = ?");
    values.push(nowIso());
    values.push(req.params.id);

    await run(`UPDATE students SET ${updates.join(", ")} WHERE id = ?`, values);
    const student = await get("SELECT * FROM students WHERE id = ?", [req.params.id]);
    return res.json(student);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/relationships", async (req, res) => {
  try {
    const rows = await all(
      "SELECT * FROM relationships WHERE status = 'accepted' ORDER BY id DESC"
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/relationships/pending", authMiddleware, async (req, res) => {
  try {
    const rows = await all(
      `SELECT * FROM relationships
       WHERE status = 'pending' AND (from_student_id = ? OR to_student_id = ?)
       ORDER BY created_at DESC`,
      [req.auth.studentId, req.auth.studentId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/relationships", authMiddleware, async (req, res) => {
  try {
    const { toStudentId, type, note } = req.body || {};
    if (!toStudentId || typeof toStudentId !== "string") {
      return res.status(400).json({ error: "toStudentId is required" });
    }
    if (toStudentId.trim() === req.auth.studentId) {
      return res.status(400).json({ error: "Cannot link to self" });
    }

    const to = await get("SELECT id FROM students WHERE id = ?", [toStudentId.trim()]);
    if (!to) return res.status(404).json({ error: "Target student not found" });

    const existing = await get(
      `SELECT id FROM relationships
       WHERE ((from_student_id = ? AND to_student_id = ?) OR (from_student_id = ? AND to_student_id = ?))
       AND status IN ('pending','accepted')`,
      [req.auth.studentId, toStudentId.trim(), toStudentId.trim(), req.auth.studentId]
    );
    if (existing) {
      return res.status(409).json({ error: "Relationship already exists or pending" });
    }

    const createdAt = nowIso();
    const result = await run(
      `INSERT INTO relationships (from_student_id, to_student_id, type, note, status, requested_by, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [req.auth.studentId, toStudentId.trim(), type || null, note || null, req.auth.studentId, createdAt]
    );

    const rel = await get("SELECT * FROM relationships WHERE id = ?", [result.lastID]);
    return res.json(rel);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/relationships/:id/accept", authMiddleware, async (req, res) => {
  try {
    const rel = await get("SELECT * FROM relationships WHERE id = ?", [req.params.id]);
    if (!rel) return res.status(404).json({ error: "Not found" });
    if (rel.status !== "pending") return res.status(400).json({ error: "Not pending" });
    if (rel.to_student_id !== req.auth.studentId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await run("UPDATE relationships SET status = 'accepted', approved_at = ? WHERE id = ?", [
      nowIso(),
      req.params.id,
    ]);
    const updated = await get("SELECT * FROM relationships WHERE id = ?", [req.params.id]);
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/relationships/:id/reject", authMiddleware, async (req, res) => {
  try {
    const rel = await get("SELECT * FROM relationships WHERE id = ?", [req.params.id]);
    if (!rel) return res.status(404).json({ error: "Not found" });
    if (rel.status !== "pending") return res.status(400).json({ error: "Not pending" });
    if (rel.to_student_id !== req.auth.studentId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await run("UPDATE relationships SET status = 'rejected', approved_at = NULL WHERE id = ?", [
      req.params.id,
    ]);
    const updated = await get("SELECT * FROM relationships WHERE id = ?", [req.params.id]);
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.delete("/relationships/:id", authMiddleware, async (req, res) => {
  try {
    const rel = await get("SELECT * FROM relationships WHERE id = ?", [req.params.id]);
    if (!rel) return res.status(404).json({ error: "Not found" });
    if (rel.from_student_id !== req.auth.studentId && rel.to_student_id !== req.auth.studentId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await run("DELETE FROM relationships WHERE id = ?", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`CORS_ORIGIN=${CORS_ORIGIN}`);
      console.log(`REQUIRE_INVITE=${REQUIRE_INVITE}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init DB", err);
    process.exit(1);
  });
