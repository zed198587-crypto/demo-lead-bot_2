function createLeadRepository(db) {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT,
      first_name TEXT,
      last_name TEXT,
      username TEXT,
      phone TEXT NOT NULL,
      booking_text TEXT,
      booking_date TEXT,
      booking_time TEXT,
      booked_at TEXT,
      created_at TEXT NOT NULL
    );
  `;

  function ensureColumnExists(columnName, columnSql) {
    const columns = db.prepare(`PRAGMA table_info(leads)`).all();
    const exists = columns.some((column) => column.name === columnName);

    if (!exists) {
      db.exec(`ALTER TABLE leads ADD COLUMN ${columnSql}`);
    }
  }

  function init() {
    db.exec(createTableSql);

    ensureColumnExists("booking_text", "booking_text TEXT");
    ensureColumnExists("booking_date", "booking_date TEXT");
    ensureColumnExists("booking_time", "booking_time TEXT");
    ensureColumnExists("booked_at", "booked_at TEXT");
  }

  function createLead({ telegramId, firstName, lastName, username, phone }) {
    const stmt = db.prepare(`
      INSERT INTO leads (
        telegram_id,
        first_name,
        last_name,
        username,
        phone,
        booking_text,
        booked_at,
        created_at
      ) VALUES (
        @telegram_id,
        @first_name,
        @last_name,
        @username,
        @phone,
        @booking_text,
        @booked_at,
        @created_at
      )
    `);

    const created_at = new Date().toISOString();

    const result = stmt.run({
      telegram_id: telegramId ? String(telegramId) : null,
      first_name: firstName || null,
      last_name: lastName || null,
      username: username || null,
      phone,
      booking_text: null,
      booked_at: null,
      created_at
    });

    return {
      id: result.lastInsertRowid,
      telegram_id: telegramId ? String(telegramId) : null,
      first_name: firstName || null,
      last_name: lastName || null,
      username: username || null,
      phone,
      booking_text: null,
      booked_at: null,
      created_at
    };
  }

  function updateBooking(leadId, bookingDate, bookingTime) {
    const booked_at = new Date().toISOString();

    const bookingText = `${bookingDate} ${bookingTime}`;

    const stmt = db.prepare(`
      UPDATE leads
      SET
        booking_text = ?,
        booking_date = ?,
        booking_time = ?,
        booked_at = ?
      WHERE id = ?
    `);

    stmt.run(
      bookingText,
      bookingDate,
      bookingTime,
      booked_at,
      leadId
    );

    return findLeadById(leadId);
  }

  function getRecentLeads(limit = 10) {
    const stmt = db.prepare(`
      SELECT *
      FROM leads
      ORDER BY id DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  function clearAllLeads() {
    const clearTransaction = db.transaction(() => {
      const result = db.prepare(`
        DELETE FROM leads
      `).run();

      db.prepare(`
        DELETE FROM sqlite_sequence
        WHERE name = 'leads'
      `).run();

      return result.changes;
    });

    return clearTransaction();
  }

  function getLeadsByDateRange(fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT *
      FROM leads
      WHERE booking_date >= ?
        AND booking_date <= ?
      ORDER BY booking_date ASC, booking_time ASC
    `);

    return stmt.all(fromDate, toDate);
  }

  function findLeadById(id) {
    const stmt = db.prepare(`
      SELECT *
      FROM leads
      WHERE id = ?
    `);

    return stmt.get(id) || null;
  }

  function getUnbookedLeads() {
    const stmt = db.prepare(`
      SELECT *
      FROM leads
      WHERE booked_at IS NULL
      ORDER BY id DESC
    `);

    return stmt.all();
  }

  function countUnbookedLeads() {
    const stmt = db.prepare(`
      SELECT COUNT(*) AS count
      FROM leads
      WHERE booked_at IS NULL
    `);

    return stmt.get().count;
  }

  return {
    init,
    createLead,
    updateBooking,
    getRecentLeads,
    getUnbookedLeads,
    countUnbookedLeads,
    getLeadsByDateRange,
    findLeadById,
    clearAllLeads
  };
}

module.exports = {
  createLeadRepository
};