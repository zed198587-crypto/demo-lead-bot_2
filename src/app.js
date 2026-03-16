process.env.NTBA_FIX_350 = 1;
require("dotenv").config();

const { createBotApp } = require("bot-core");
const { registerLeadHandlers } = require("./handlers/leadHandlers");

function registerAppHandlers({ bot, db, fsm, env }) {
  registerLeadHandlers({
    bot,
    db,
    fsm,
    env
  });
}

function bootstrap() {
  const { env } = createBotApp({
    registerAppHandlers
  });

  console.log("[survey-lead-bot] started");
  console.log(`[survey-lead-bot] mode: ${env.APP_ENV}`);
}

bootstrap();