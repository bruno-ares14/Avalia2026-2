const schema = [
  "CREATE TABLE IF NOT EXISTS discord_users (\n  user_id TEXT PRIMARY KEY,\n  username TEXT NOT NULL,\n  avatar TEXT,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS project_records (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  user_id TEXT NOT NULL,\n  username TEXT NOT NULL,\n  chave_projeto TEXT NOT NULL,\n  conteudo TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE INDEX IF NOT EXISTS idx_project_records_user ON project_records(user_id)"
];

export async function checkDiagnosticsTable(db) {
  const probe = () => db.prepare("SELECT id FROM project_records LIMIT 1").first();
  try {
    await probe();
  } catch (error) {
    if (!/no such table: (?:main\.)?project_records\b/i.test(String(error))) throw error;
    await db.batch(schema.map(statement => db.prepare(statement)));
    await probe();
  }
}
