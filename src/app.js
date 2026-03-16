process.env.NTBA_FIX_350 = 1;
require("dotenv").config();

const express = require("express");

const { createBotApp } = require("../bot-core");
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

  // --- HTTP сервер для Render ---
  const app = express();
  const port = process.env.PORT || 10000;

  app.get("/", (req, res) => {
    res.send("Telegram demo bot is running.");
  });

  app.get("/health", (req, res) => {
    res.send("OK");
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`[web] listening on port ${port}`);
  });

  // --- запуск бота ---
  const { env } = createBotApp({
    registerAppHandlers
  });

  console.log("[survey-lead-bot] started");
  console.log(`[survey-lead-bot] mode: ${env.APP_ENV}`);
}

bootstrap();