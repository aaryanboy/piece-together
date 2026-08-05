import fs from 'fs';
import path from 'path';
import { RoomState } from '../../src/types/room';

let db: any = null;

try {
  // Try importing better-sqlite3 dynamically
  const Database = require('better-sqlite3');
  const dbDir = process.env.DB_DIR || process.cwd();
  const dbPath = process.env.DB_PATH || path.resolve(dbDir, 'piece_together.db');
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      host_id TEXT,
      status TEXT,
      data_json TEXT,
      updated_at INTEGER
    )
  `);
  console.log(`[SQLite] Connected to ${dbPath}`);
} catch (err) {
  console.warn('[SQLite] Native module fallback to JSON file persistence:', err);
}

// Fallback JSON directory
const fallbackDir = process.env.DB_DIR ? path.resolve(process.env.DB_DIR, '.room_storage') : path.resolve(process.cwd(), '.room_storage');
if (!fs.existsSync(fallbackDir)) {
  try {
    fs.mkdirSync(fallbackDir, { recursive: true });
  } catch (e) {
    // Ignore
  }
}

export const dbStore = {
  saveRoom(room: RoomState): void {
    try {
      const code = room.code.toUpperCase();
      const dataJson = JSON.stringify(room);
      const now = Date.now();

      if (db) {
        const stmt = db.prepare(`
          INSERT INTO rooms (code, host_id, status, data_json, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(code) DO UPDATE SET
            host_id = excluded.host_id,
            status = excluded.status,
            data_json = excluded.data_json,
            updated_at = excluded.updated_at
        `);
        stmt.run(code, room.hostId, room.status, dataJson, now);
      } else {
        const filePath = path.join(fallbackDir, `${code}.json`);
        fs.writeFileSync(filePath, dataJson, 'utf-8');
      }
    } catch (e) {
      console.error('[DB Persistence Error]', e);
    }
  },

  loadAllRooms(): RoomState[] {
    const rooms: RoomState[] = [];
    try {
      if (db) {
        const stmt = db.prepare('SELECT data_json FROM rooms');
        const rows = stmt.all();
        for (const row of rows) {
          try {
            rooms.push(JSON.parse(row.data_json));
          } catch (e) {
            // Ignore parse errors
          }
        }
      } else {
        if (fs.existsSync(fallbackDir)) {
          const files = fs.readdirSync(fallbackDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              try {
                const content = fs.readFileSync(path.join(fallbackDir, file), 'utf-8');
                rooms.push(JSON.parse(content));
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[DB Load Error]', e);
    }
    return rooms;
  },

  deleteRoom(code: string): void {
    try {
      const upperCode = code.toUpperCase();
      if (db) {
        const stmt = db.prepare('DELETE FROM rooms WHERE code = ?');
        stmt.run(upperCode);
      } else {
        const filePath = path.join(fallbackDir, `${upperCode}.json`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (e) {
      console.error('[DB Delete Error]', e);
    }
  }
};
