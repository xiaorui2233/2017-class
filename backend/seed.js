const fs = require("fs");
const path = require("path");
const { initDb, run, get } = require("./db");

const dataPath = path.join(__dirname, "data", "students.json");

function nowIso() {
  return new Date().toISOString();
}

async function seed() {
  await initDb();

  if (!fs.existsSync(dataPath)) {
    console.log("No students.json found, skipping seed.");
    return;
  }

  const raw = fs.readFileSync(dataPath, "utf8");
  const students = JSON.parse(raw);
  if (!Array.isArray(students)) {
    throw new Error("students.json must be an array");
  }

  for (const student of students) {
    if (!student.id || !student.name) continue;
    const exists = await get("SELECT id FROM students WHERE id = ?", [student.id]);
    if (exists) continue;
    const now = nowIso();
    await run(
      `INSERT INTO students (id, name, gender, avatar, bio, contact, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        String(student.id),
        String(student.name),
        student.gender || null,
        student.avatar || null,
        student.bio || null,
        student.contact || null,
        student.tags || null,
        now,
        now,
      ]
    );
  }

  console.log("Seed completed.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
