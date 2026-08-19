const { createSessionRepository } = require("../repositories/sessionRepository");

function createStateManager(db) {
  const sessionRepository = createSessionRepository(db);

  function getSession(telegramId) {
    const session = sessionRepository.findByTelegramId(telegramId);

    if (!session) {
      return {
        telegram_id: String(telegramId),
        state: "IDLE",
        step: null,
        data: {}
      };
    }

    return {
      telegram_id: session.telegram_id,
      state: session.state,
      step: session.step,
      data: session.data_json ? JSON.parse(session.data_json) : {}
    };
  }

  function setState(telegramId, state, step = null, data = {}) {
    return sessionRepository.save({
      telegram_id: String(telegramId),
      state,
      step,
      data_json: JSON.stringify(data),
      updated_at: new Date().toISOString()
    });
  }

  function clearState(telegramId) {
    return sessionRepository.save({
      telegram_id: String(telegramId),
      state: "IDLE",
      step: null,
      data_json: JSON.stringify({}),
      updated_at: new Date().toISOString()
    });
  }

  function updateData(telegramId, patch) {
    const current = getSession(telegramId);
    const nextData = {
      ...current.data,
      ...patch
    };

    return sessionRepository.save({
      telegram_id: String(telegramId),
      state: current.state,
      step: current.step,
      data_json: JSON.stringify(nextData),
      updated_at: new Date().toISOString()
    });
  }

  return {
    getSession,
    setState,
    clearState,
    updateData
  };
}

const stateManager = {
  create: createStateManager
};

module.exports = {
  stateManager
};