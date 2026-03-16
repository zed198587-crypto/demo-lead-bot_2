function createUserRepository(db) {
  const findByTelegramIdStmt = db.prepare(`
    SELECT * FROM users WHERE telegram_id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO users (
      telegram_id,
      username,
      first_name,
      last_name,
      language_code,
      role,
      created_at,
      updated_at,
      last_seen_at
    ) VALUES (
      @telegram_id,
      @username,
      @first_name,
      @last_name,
      @language_code,
      @role,
      @created_at,
      @updated_at,
      @last_seen_at
    )
  `);

  const updateSeenStmt = db.prepare(`
    UPDATE users
    SET
      username = @username,
      first_name = @first_name,
      last_name = @last_name,
      language_code = @language_code,
      updated_at = @updated_at,
      last_seen_at = @last_seen_at
    WHERE telegram_id = @telegram_id
  `);

  function findByTelegramId(telegramId) {
    return findByTelegramIdStmt.get(String(telegramId)) || null;
  }

  function create(userData) {
    insertStmt.run({
      ...userData,
      telegram_id: String(userData.telegram_id)
    });

    return findByTelegramId(userData.telegram_id);
  }

  function updateSeen(userData) {
    updateSeenStmt.run({
      ...userData,
      telegram_id: String(userData.telegram_id)
    });

    return findByTelegramId(userData.telegram_id);
  }

  function upsertTelegramUser(msgFrom) {
    const now = new Date().toISOString();
    const existing = findByTelegramId(msgFrom.id);

    const payload = {
      telegram_id: String(msgFrom.id),
      username: msgFrom.username || null,
      first_name: msgFrom.first_name || null,
      last_name: msgFrom.last_name || null,
      language_code: msgFrom.language_code || null,
      role: "user",
      created_at: now,
      updated_at: now,
      last_seen_at: now
    };

    if (!existing) {
      return create(payload);
    }

    return updateSeen(payload);
  }

  return {
    findByTelegramId,
    create,
    updateSeen,
    upsertTelegramUser
  };
}

module.exports = {
  createUserRepository
};