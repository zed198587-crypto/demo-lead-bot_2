const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

function parseAdminIds(value) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item));
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required env variable: ${name}`);
  }

  return value.trim();
}

const env = {
  BOT_TOKEN: requireEnv("BOT_TOKEN"),
  BOT_MODE: process.env.BOT_MODE?.trim() || "polling",
  DB_PATH: process.env.DB_PATH?.trim() || path.join(process.cwd(), "data", "bot.sqlite"),
  ADMIN_IDS: parseAdminIds(process.env.ADMIN_IDS),
  APP_ENV: process.env.APP_ENV?.trim() || "development",
  BOOKING_WEB_APP_URL: process.env.BOOKING_WEB_APP_URL?.trim() || ""
};

module.exports = {
  env
};