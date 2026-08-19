function createSessionRepository(db) {
  const findByTelegramIdStmt = db.prepare(`
    SELECT * FROM user_sessions WHERE telegram_id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO user_sessions (
      telegram_id,
      state,
      step,
      data_json,
      updated_at
    ) VALUES (
      @telegram_id,
      @state,
      @step,
      @data_json,
      @updated_at
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE user_sessions
    SET
      state = @state,
      step = @step,
      data_json = @data_json,
      updated_at = @updated_at
    WHERE telegram_id = @telegram_id
  `);

  function findByTelegramId(telegramId) {
    return findByTelegramIdStmt.get(String(telegramId)) || null;
  }

  function save(session) {
    const existing = findByTelegramId(session.telegram_id);
    const payload = {
      telegram_id: String(session.telegram_id),
      state: session.state || "IDLE",
      step: session.step || null,
      data_json: session.data_json || null,
      updated_at: session.updated_at || new Date().toISOString()
    };

    if (!existing) {
      insertStmt.run(payload);
    } else {
      updateStmt.run(payload);
    }

    return findByTelegramId(payload.telegram_id);
  }

  return {
    findByTelegramId,
    save
  };
}

module.exports = {
  createSessionRepository
};