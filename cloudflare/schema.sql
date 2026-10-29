-- ACAD: isolated D1 database. Apply only to the new acad database.
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY CHECK (id IN ('rafael', 'mae')),
  name TEXT NOT NULL,
  state_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO profiles(id,name) VALUES ('rafael','Meu perfil'),('mae','Perfil da minha mãe');
