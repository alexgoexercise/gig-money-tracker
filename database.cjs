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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gig_place_id) REFERENCES gig_places (id)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gig_id INTEGER,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      INSERT INTO gigs (title, description, amount, date, status, gig_place_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(gig.title, gig.description, gig.amount, gig.date, gig.status || 'pending', gigPlaceId);
  }

  getAllGigs() {
    // Join with gig_places to get the place name
    const stmt = this.db.prepare('SELECT gigs.*, gig_places.name as gig_place FROM gigs LEFT JOIN gig_places ON gigs.gig_place_id = gig_places.id ORDER BY date DESC');
    return stmt.all();
  }

  getGigById(id) {
    const stmt = this.db.prepare('SELECT * FROM gigs WHERE id = ?');
    return stmt.get(id);
  }

  updateGig(id, gig) {
    const gigPlaceId = this.getOrCreateGigPlace(gig.gig_place);
    const stmt = this.db.prepare(`
      UPDATE gigs 
      SET title = ?, description = ?, amount = ?, date = ?, status = ?, gig_place_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(gig.title, gig.description, gig.amount, gig.date, gig.status, gigPlaceId, id);
  }

  deleteGig(id) {
    const stmt = this.db.prepare('DELETE FROM gigs WHERE id = ?');
    return stmt.run(id);
  }

  // Expense operations
  addExpense(expense) {
    const stmt = this.db.prepare(`
      INSERT INTO expenses (gig_id, description, amount, date, category)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(expense.gig_id, expense.description, expense.amount, expense.date, expense.category);
  }

  getAllExpenses() {
    const stmt = this.db.prepare(`
      SELECT e.*, g.title as gig_title 
      FROM expenses e 
      LEFT JOIN gigs g ON e.gig_id = g.id 
      ORDER BY e.date DESC
    `);
    return stmt.all();
  }

  getExpensesByGigId(gigId) {
    const stmt = this.db.prepare('SELECT * FROM expenses WHERE gig_id = ? ORDER BY date DESC');
    return stmt.all(gigId);
  }

  // Analytics
  getTotalEarnings() {
    const stmt = this.db.prepare("SELECT SUM(amount) as total FROM gigs WHERE status = 'completed'");
    return stmt.get().total || 0;
  }

  getTotalExpenses() {
    const stmt = this.db.prepare('SELECT SUM(amount) as total FROM expenses');
    return stmt.get().total || 0;
  }

  getNetIncome() {
    return this.getTotalEarnings() - this.getTotalExpenses();
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

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseManager; 