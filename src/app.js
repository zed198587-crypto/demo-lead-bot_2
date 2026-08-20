process.env.NTBA_FIX_350 = 1;
require("dotenv").config();
console.log(
  "[env] BOOKING_WEB_APP_URL:",
  process.env.BOOKING_WEB_APP_URL
);
const path = require("path");

const express = require("express");

const { createBotApp } = require("../core");
const { registerLeadHandlers } = require("./handlers/leadHandlers");

function registerAppHandlers({ bot, db, fsm, env, app }) {
  registerLeadHandlers({
    bot,
    db,
    fsm,
    env,
    app
  });
}

function bootstrap() {

  // --- HTTP сервер для Render ---
  const app = express();
  const port = process.env.PORT || 10000;

  const bookingWebPath = path.join(
    __dirname,
    "../web/booking"
  );

  app.use(
    "/booking",
    express.static(bookingWebPath)
  );

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
    registerAppHandlers,
    app

  });

  console.log("[survey-lead-bot] started");
  console.log(`[survey-lead-bot] mode: ${env.APP_ENV}`);
}

bootstrap();