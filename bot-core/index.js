const { env } = require("./config/env");
const { initDatabase } = require("./db/database");
const { createBot } = require("./core/createBot");
const { registerHandlers } = require("./core/registerHandlers");
const { registerCommands } = require("./core/registerCommands");
const { stateManager } = require("./fsm/stateManager");
const validators = require("./utils/validators");
const formatters = require("./utils/formatters");

function createBotApp(options = {}) {
  const { registerAppHandlers } = options;

  const db = initDatabase(env.DB_PATH);
  const bot = createBot(env.BOT_TOKEN);
  const fsm = stateManager.create(db);

  registerHandlers(bot, db, fsm);

  if (typeof registerAppHandlers === "function") {
    registerAppHandlers({
      bot,
      db,
      fsm,
      env
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