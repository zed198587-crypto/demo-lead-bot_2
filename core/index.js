const { env } = require("../config/env");
const { initDatabase } = require("../db/database");
const { createBot } = require("./createBot");
const { registerCommands } = require("./registerCommands");
const { stateManager } = require("../fsm/stateManager");
const validators = require("../utils/validators");
const formatters = require("../utils/formatters");

function createBotApp(options = {}) {
  const { registerAppHandlers, app } = options;

  const db = initDatabase(env.DB_PATH);
  const bot = createBot(env.BOT_TOKEN);
  const fsm = stateManager.create(db);

  if (typeof registerAppHandlers === "function") {
    registerAppHandlers({
      bot,
      db,
      fsm,
      env,
      app
    });
  }

  registerCommands(bot).catch((error) => {
    console.error("[registerCommands error]", error.message);
  });

  return {
    bot,
    db,
    fsm,
    env
  };
}

module.exports = {
  createBotApp,
  validators,
  formatters
};