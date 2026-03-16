import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'calapp.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      unit TEXT NOT NULL DEFAULT 'g' CHECK(unit IN ('g', 'ml')),
      calories REAL,
      protein REAL,
      carbs REAL,
      fat REAL,
      fiber REAL,
      sugar REAL,
      saturated_fat REAL,
      trans_fat REAL,
      cholesterol REAL,
      sodium REAL,
      potassium REAL,
      calcium REAL,
      iron REAL,
      vitamin_a REAL,
      vitamin_c REAL,
      vitamin_d REAL,
      vitamin_e REAL,
      vitamin_k REAL,
      vitamin_b6 REAL,
      vitamin_b12 REAL,
      folate REAL,
      magnesium REAL,
      zinc REAL,
      phosphorus REAL,
      barcode TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS serving_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      grams REAL NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS food_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
      serving_size_id INTEGER,
      quantity REAL NOT NULL DEFAULT 1,
      custom_grams REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
      FOREIGN KEY (serving_size_id) REFERENCES serving_sizes(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(date);
    CREATE INDEX IF NOT EXISTS idx_food_logs_food_id ON food_logs(food_id);
    CREATE INDEX IF NOT EXISTS idx_serving_sizes_food_id ON serving_sizes(food_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('calorie_goal', '2000');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('protein_goal', '150');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('carbs_goal', '250');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('fat_goal', '65');
  `);

  // Migration: add barcode column if it doesn't exist
  const cols = db.prepare("PRAGMA table_info(foods)").all() as { name: string }[];
  if (!cols.some(c => c.name === 'barcode')) {
    db.exec('ALTER TABLE foods ADD COLUMN barcode TEXT');
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode) WHERE barcode IS NOT NULL');
}

export default db;
