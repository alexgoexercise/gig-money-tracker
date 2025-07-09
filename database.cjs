const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    // Get the user data path for storing the database file
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'gig-money-tracker.db');
    
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  initDatabase() {
    // Create tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gig_places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gigs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        gig_place_id INTEGER,
        gig_type TEXT DEFAULT 'sub_gig',
        is_recurring BOOLEAN DEFAULT 0,
        recurring_pattern TEXT,
        recurring_end_date TEXT,
        full_time_start_date TEXT,
        full_time_end_date TEXT,
        full_time_days TEXT, -- comma-separated weekdays (0=Sun,1=Mon,...)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gig_place_id) REFERENCES gig_places (id)
      )
    `);



    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gig_occurrences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gig_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        amount REAL,
        notes TEXT,
        UNIQUE(gig_id, date),
        FOREIGN KEY (gig_id) REFERENCES gigs (id)
      )
    `);

    console.log('Database initialized successfully');
  }

  // Gig operations
  addGig(gig) {
    // gig.gig_place can be a name; get or create the place and use its id
    const gigPlaceId = this.getOrCreateGigPlace(gig.gig_place);
    const stmt = this.db.prepare(`
      INSERT INTO gigs (title, description, amount, date, status, gig_place_id, gig_type, is_recurring, recurring_pattern, recurring_end_date, full_time_start_date, full_time_end_date, full_time_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      gig.title, 
      gig.description, 
      gig.amount, 
      gig.date, 
      gig.status || 'pending', 
      gigPlaceId,
      gig.gig_type || 'sub_gig',
      gig.is_recurring,
      gig.recurring_pattern || null,
      gig.recurring_end_date || null,
      gig.full_time_start_date || null,
      gig.full_time_end_date || null,
      gig.full_time_days || null
    );
  }

  addRegularGig(gig, startDate, endDate, days) {
    // Only create the parent regular gig
    const routineDaysStr = Array.isArray(days) ? days.join(',') : (typeof days === 'string' ? days : '');
    const parentGigData = {
      ...gig,
      date: startDate,
      gig_type: 'regular_gig',
      is_recurring: true,
      recurring_pattern: days.length === 1 ? `weekly_${days[0]}` : 'custom_multi',
      recurring_end_date: endDate,
      full_time_days: routineDaysStr
    };
    const parentResult = this.addGig(parentGigData);
    const parentId = parentResult.lastInsertRowid;
    return { parentId };
  }

  getAllGigs() {
    const stmt = this.db.prepare(`
      SELECT gigs.*, gig_places.name as gig_place 
      FROM gigs 
      LEFT JOIN gig_places ON gigs.gig_place_id = gig_places.id 
      ORDER BY date DESC
    `);
    return stmt.all();
  }

  getGigsByType(gigType) {
    const stmt = this.db.prepare(`
      SELECT gigs.*, gig_places.name as gig_place 
      FROM gigs 
      LEFT JOIN gig_places ON gigs.gig_place_id = gig_places.id 
      WHERE gig_type = ?
      ORDER BY date DESC
    `);
    return stmt.all(gigType);
  }

  getGigById(id) {
    const stmt = this.db.prepare('SELECT * FROM gigs WHERE id = ?');
    return stmt.get(id);
  }

  updateGig(id, gig) {
    const gigPlaceId = this.getOrCreateGigPlace(gig.gig_place);
    const stmt = this.db.prepare(`
      UPDATE gigs 
      SET title = ?, description = ?, amount = ?, date = ?, status = ?, gig_place_id = ?, gig_type = ?, is_recurring = ?, recurring_pattern = ?, recurring_end_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      gig.title, 
      gig.description, 
      gig.amount, 
      gig.date, 
      gig.status, 
      gigPlaceId, 
      gig.gig_type || 'sub_gig',
      gig.is_recurring,
      gig.recurring_pattern || null,
      gig.recurring_end_date || null,
      id
    );
  }

  deleteGig(id) {
    // Delete all occurrences for this gig first
    this.db.prepare('DELETE FROM gig_occurrences WHERE gig_id = ?').run(id);
    // Only then delete the gig itself
    const stmt = this.db.prepare('DELETE FROM gigs WHERE id = ?');
    return stmt.run(id);
  }



  // Analytics
  getTotalEarnings() {
    const stmt = this.db.prepare("SELECT SUM(amount) as total FROM gigs WHERE status = 'completed'");
    return stmt.get().total || 0;
  }



  // Gig Place operations
  getOrCreateGigPlace(name) {
    let stmt = this.db.prepare('SELECT id FROM gig_places WHERE name = ?');
    let place = stmt.get(name);
    if (place) return place.id;
    stmt = this.db.prepare('INSERT INTO gig_places (name) VALUES (?)');
    const result = stmt.run(name);
    return result.lastInsertRowid;
  }

  getAllGigPlaces() {
    const stmt = this.db.prepare('SELECT * FROM gig_places ORDER BY name ASC');
    return stmt.all();
  }

  // Occurrence overrides
  getOccurrenceOverride(gigId, date) {
    const stmt = this.db.prepare('SELECT * FROM gig_occurrences WHERE gig_id = ? AND date = ?');
    return stmt.get(gigId, date);
  }

  setOccurrenceOverride(gigId, date, status, amount, notes) {
    // Insert or update
    const stmt = this.db.prepare(`
      INSERT INTO gig_occurrences (gig_id, date, status, amount, notes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(gig_id, date) DO UPDATE SET status=excluded.status, amount=excluded.amount, notes=excluded.notes
    `);
    return stmt.run(gigId, date, status, amount, notes);
  }

  getAllOccurrenceOverridesForGig(gigId) {
    const stmt = this.db.prepare('SELECT * FROM gig_occurrences WHERE gig_id = ?');
    return stmt.all(gigId);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseManager; 