const {
  createReportService
} = require("../services/reportService");
const crypto = require("crypto");
const express = require("express");
const { validators, formatters } = require("../../core");
const { botConfig } = require("../config/botConfig");
const { LEAD_STATES, LEAD_STEPS } = require("../constants/leadStates");
const { MENU_LABELS } = require("../constants/menuLabels");
const { CALLBACKS } = require("../constants/callbackData");
const { getMainKeyboard } = require("../keyboards/mainKeyboard");
const { getLeadPhoneKeyboard } = require("../keyboards/leadKeyboard");
const { getLeadAdminKeyboard } = require("../keyboards/adminInlineKeyboard");
const { createLeadRepository } = require("../repositories/leadRepository");
const { createLeadService } = require("../services/leadService");
const {
  getReportKeyboard
} = require("../keyboards/reportKeyboard");

function isAdmin(userId, adminIds = []) {
  return adminIds.includes(Number(userId));
}

function validateTelegramWebAppInitData(initData, botToken) {
  if (!initData || typeof initData !== "string") {
    return null;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    return null;
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([leftKey], [rightKey]) => {
      if (leftKey < rightKey) return -1;
      if (leftKey > rightKey) return 1;
      return 0;
    })
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest();

  const receivedHash = Buffer.from(hash, "hex");

  if (
    receivedHash.length !== expectedHash.length ||
    !crypto.timingSafeEqual(receivedHash, expectedHash)
  ) {
    return null;
  }

  const userJson = params.get("user");

  if (!userJson) {
    return null;
  }

  try {
    const user = JSON.parse(userJson);

    return Number.isInteger(Number(user.id)) ? user : null;
  } catch {
    return null;
  }
}

async function notifyAdmins(bot, adminIds, text, leadId, webAppUrl) {
  for (const adminId of adminIds) {
    try {
      await bot.sendMessage(
        adminId,
        text,
        getLeadAdminKeyboard(leadId, webAppUrl)
      );
    } catch (error) {
      console.error(
        `[lead notify error] adminId=${adminId}`,
        error.message
      );
    }
  }
}

function buildProfileText(from) {
  return [
    botConfig.profilePreviewTitle,
    "",
    `Имя: ${from.first_name || "-"}`,
    `Фамилия: ${from.last_name || "-"}`,
    `Username: ${from.username ? "@" + from.username : "-"}`,
    "",
    botConfig.askPhoneText
  ].join("\n");
}

function buildSavedLeadText(lead) {
  return [
    botConfig.leadSavedPrefix,
    `Имя: ${lead.first_name || "-"}`,
    `Фамилия: ${lead.last_name || "-"}`,
    `Username: ${lead.username ? "@" + lead.username : "-"}`,
    `Телефон: ${lead.phone}`
  ].join("\n");
}

async function startLeadFlow(bot, fsm, msg) {
  const from = msg.from;

  fsm.setState(from.id, LEAD_STATES.LEAD_FORM, LEAD_STEPS.ASK_PHONE, {
    telegramId: String(from.id),
    firstName: from.first_name || null,
    lastName: from.last_name || null,
    username: from.username || null
  });

  await bot.sendMessage(
    msg.chat.id,
    buildProfileText(from),
    getLeadPhoneKeyboard()
  );
}

function getReportDateRange(period) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (period === "today") {
    const date = formatDate(today);

    return {
      fromDate: date,
      toDate: date,
      title: "Записи на сегодня"
    };
  }

  if (period === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const date = formatDate(tomorrow);

    return {
      fromDate: date,
      toDate: date,
      title: "Записи на завтра"
    };
  }

  if (period === "week") {
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 6);

    return {
      fromDate: formatDate(today),
      toDate: formatDate(endDate),
      title: "Записи на неделю"
    };
  }

  if (period === "month") {
    const endDate = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );

    return {
      fromDate: formatDate(today),
      toDate: formatDate(endDate),
      title: "Записи на месяц"
    };
  }

  return null;
}

function registerLeadHandlers({ bot, db, fsm, env, app }) {
  const leadRepository = createLeadRepository(db);
  leadRepository.init();

  const leadService = createLeadService({ leadRepository });

  const reportService = createReportService({
    leadRepository
  });

  const getMainKeyboardForUser = (userId) =>
    getMainKeyboard(isAdmin(userId, env.ADMIN_IDS));

  app.post("/api/booking", express.json(), async (req, res) => {
  try {
    const {
      leadId,
      bookingDate,
      bookingTime,
      initData
    } = req.body;

    const telegramUser = validateTelegramWebAppInitData(
      initData,
      env.BOT_TOKEN
    );

    if (!telegramUser) {
      return res.status(401).json({
        error: "Не удалось подтвердить данные Telegram Web App."
      });
    }

    if (!isAdmin(telegramUser.id, env.ADMIN_IDS)) {
      return res.status(403).json({
        error: "Недостаточно прав для оформления записи."
      });
    }

    const numericLeadId = Number(leadId);

    if (
      !Number.isInteger(numericLeadId) ||
      !bookingDate ||
      !bookingTime
    ) {
      return res.status(400).json({
        error: "Некорректные данные записи."
      });
    }

    const lead = leadService.saveBooking(
      numericLeadId,
      bookingDate,
      bookingTime
    );

    if (!lead) {
      return res.status(404).json({
        error: "Заявка не найдена."
      });
    }

    await bot.sendMessage(
      lead.telegram_id,
      [
        `Здравствуйте, ${lead.first_name || ""}!`,
        "",
        "Ваша запись подтверждена.",
        `📅 Дата: ${bookingDate}`,
        `🕐 Время: ${bookingTime}`
      ].join("\n")
    );

    await bot.sendMessage(
      env.ADMIN_IDS[0],
      [
        `✅ Запись по заявке #${lead.id} оформлена.`,
        "",
        `Клиент: ${lead.first_name || "-"} ${lead.last_name || ""}`.trim(),
        `Телефон: ${lead.phone}`,
        `📅 Дата: ${bookingDate}`,
        `🕐 Время: ${bookingTime}`
      ].join("\n")
    );

    return res.json({
      success: true
    });

  } catch (error) {
    console.error("[booking api error]", error);

    return res.status(500).json({
      error: "Не удалось сохранить запись."
    });
  }
});

  const fs = require("fs");
  const path = require("path");

bot.onText(/^\/start$/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    botConfig.welcomeMessage,
    getMainKeyboardForUser(msg.from.id)
  );
});

  bot.onText(/^\/lead$/, async (msg) => {
    await startLeadFlow(bot, fsm, msg);
  });

  bot.onText(/^\/leads$/, async (msg) => {
  if (!isAdmin(msg.from.id, env.ADMIN_IDS)) {
    await bot.sendMessage(
      msg.chat.id,
      "Команда доступна только администратору.",
      getMainKeyboardForUser(msg.from.id)
    );
    return;
  }

  const leads = leadService.listRecentLeads(10);

  if (!leads.length) {
    await bot.sendMessage(
      msg.chat.id,
      "Заявок пока нет.",
      getMainKeyboardForUser(msg.from.id)
    );
    return;
  }

  await bot.sendMessage(
    msg.chat.id,
    "Последние 10 заявок:"
  );

  for (const lead of leads) {
    const fullName = [
      lead.first_name,
      lead.last_name
    ]
      .filter(Boolean)
      .join(" ") || "Без имени";

    const isBooked =
      lead.booking_text && lead.booked_at;

    const text = [
      `${isBooked ? "🟢" : "🟡"} #${lead.id} — ${fullName}`,
      `📱 ${lead.username ? "@" + lead.username : "-"}`,
      `📞 ${lead.phone}`,
      `🕐 ${formatters.formatDateTime(lead.created_at)}`,
      `📅 Запись: ${lead.booking_text || "не назначена"}`,
      isBooked
        ? `✅ Оформлена: ${formatters.formatDateTime(lead.booked_at)}`
        : "⏳ Запись ещё не оформлена"
    ].join("\n");

    const keyboard = isBooked
      ? undefined
      : getLeadAdminKeyboard(
          lead.id,
          env.BOOKING_WEB_APP_URL
        );

    await bot.sendMessage(
      msg.chat.id,
      text,
      keyboard
    );
  }
});

  bot.onText(/^\/bookings$/, async (msg) => {
    if (!isAdmin(msg.from.id, env.ADMIN_IDS)) {
      await bot.sendMessage(
        msg.chat.id,
        "Команда доступна только администратору.",
        getMainKeyboardForUser(msg.from.id)
      );
      return;
    }

    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const todayString = `${year}-${month}-${day}`;

    const bookings = leadService.listLeadsByDateRange(
      todayString,
      todayString
    );

    if (!bookings.length) {
      await bot.sendMessage(
        msg.chat.id,
        "На сегодня записей нет.",
        getMainKeyboardForUser(msg.from.id)
      );
      return;
    }

    const lines = bookings.map((lead) => {
      const fullName = [
        lead.first_name,
        lead.last_name
      ]
        .filter(Boolean)
        .join(" ") || "Без имени";

      return [
        `#${lead.id} — ${fullName}`,
        `📅 ${lead.booking_date}`,
        `🕐 ${lead.booking_time}`,
        `📞 ${lead.phone}`
      ].join("\n");
    });

    await bot.sendMessage(
      msg.chat.id,
      [
        "📋 Записи на сегодня:",
        "",
        ...lines
      ].join("\n\n"),
      getMainKeyboardForUser(msg.from.id)
    );
  });

  bot.onText(/^\/report$/, async (msg) => {
  if (!isAdmin(msg.from.id, env.ADMIN_IDS)) {
    await bot.sendMessage(
      msg.chat.id,
      "Команда доступна только администратору.",
      getMainKeyboardForUser(msg.from.id)
    );
    return;
  }

  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const todayString = `${year}-${month}-${day}`;

  try {
    const report = await reportService.generateReport({
      fromDate: todayString,
      toDate: todayString,
      title: "Записи на сегодня"
    });

    await bot.sendDocument(
      msg.chat.id,
      report.outputPath,
      {
        caption: `📊 Отчёт за ${todayString}\nЗаписей: ${report.leads.length}`
      }
    );

  } catch (error) {
    console.error("[report error]", error);

    await bot.sendMessage(
      msg.chat.id,
      `Не удалось создать PDF: ${error.message}`,
      getMainKeyboardForUser(msg.from.id)
    );
  }
});

    bot.onText(/^\/cancel$/, async (msg) => {
    fsm.clearState(msg.from.id);

    await bot.sendMessage(
      msg.chat.id,
      botConfig.cancelFlowText,
      getMainKeyboardForUser(msg.from.id)
    );
  });

  bot.on("callback_query", async (query) => {
    const adminId = query.from.id;
    const data = query.data || "";

    if (!isAdmin(adminId, env.ADMIN_IDS)) {
      await bot.answerCallbackQuery(query.id, {
        text: "Недостаточно прав."
      });
      return;
    }

    if (data === "report:cancel") {
      await bot.answerCallbackQuery(query.id);

      await bot.editMessageText(
        "📊 Формирование отчёта отменено.",
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id
        }
      );

      return;
    }

    if (data.startsWith("report:")) {
  const period = data.replace("report:", "");

  const range = getReportDateRange(period);

  if (!range) {
    await bot.answerCallbackQuery(query.id, {
      text: "Неизвестный период."
    });
    return;
  }

  await bot.answerCallbackQuery(query.id, {
    text: "Формирую отчёт..."
  });

  try {
    const report = await reportService.generateReport({
      fromDate: range.fromDate,
      toDate: range.toDate,
      title: range.title
    });

    await bot.sendDocument(
      query.message.chat.id,
      report.outputPath,
      {
        caption:
          `📊 ${range.title}\n` +
          `Записей: ${report.leads.length}`
      }
    );

  } catch (error) {
    console.error("[report error]", error);

    await bot.sendMessage(
      query.message.chat.id,
      `Не удалось создать PDF: ${error.message}`,
      getMainKeyboardForUser(adminId)
    );
  }

  return;
}

    if (!data.startsWith(CALLBACKS.BOOK_LEAD_PREFIX)) {
      return;
    }

    const leadId = Number(data.replace(CALLBACKS.BOOK_LEAD_PREFIX, ""));
    const lead = leadService.getLeadById(leadId);

    if (!lead) {
      await bot.answerCallbackQuery(query.id, {
        text: "Заявка не найдена."
      });
      return;
    }

    fsm.setState(
      adminId,
      LEAD_STATES.ADMIN_REPLY_TO_LEAD,
      LEAD_STEPS.WAIT_ADMIN_MESSAGE,
      {
        leadId: lead.id,
        clientTelegramId: lead.telegram_id
      }
    );

    await bot.answerCallbackQuery(query.id, {
      text: "Режим ответа открыт."
    });

    await bot.sendMessage(
      adminId,
      [
        `Вы отвечаете по заявке #${lead.id}.`,
        "Отправьте клиенту дату и время записи одним сообщением."
      ].join("\n"),
      getMainKeyboardForUser(adminId)
    );
  });

  bot.on("contact", async (msg) => {
    const session = fsm.getSession(msg.from.id);

    if (
      session.state !== LEAD_STATES.LEAD_FORM ||
      session.step !== LEAD_STEPS.ASK_PHONE
    ) {
      return;
    }

    const rawPhone = msg.contact?.phone_number;
    const phone = validators.normalizePhone(rawPhone);

    if (!validators.isValidPhone(phone)) {
      await bot.sendMessage(
        msg.chat.id,
        botConfig.invalidContactPhoneText,
        getLeadPhoneKeyboard()
      );
      return;
    }

    const lead = leadService.saveLead({
      telegramId: session.data.telegramId,
      firstName: session.data.firstName,
      lastName: session.data.lastName,
      username: session.data.username,
      phone
    });

    fsm.clearState(msg.from.id);

    await bot.sendMessage(
      msg.chat.id,
      buildSavedLeadText(lead),
      getMainKeyboardForUser(msg.from.id)
    );

    const adminText = leadService.formatLeadForAdmin(lead);
    await notifyAdmins(bot, env.ADMIN_IDS, adminText, lead.id, env.BOOKING_WEB_APP_URL);
  });

  bot.on("message", async (msg) => {

  // Данные из Telegram Mini App
  if (msg.web_app_data?.data) {
    try {
      const data = JSON.parse(msg.web_app_data.data);

      if (data.type === "booking") {
        const leadId = Number(data.leadId);
        const bookingDate = data.bookingDate;
        const bookingTime = data.bookingTime;

        if (
          !Number.isInteger(leadId) ||
          !bookingDate ||
          !bookingTime
        ) {
          await bot.sendMessage(
            msg.chat.id,
            "Некорректные данные записи.",
            getMainKeyboardForUser(msg.from.id)
          );
          return;
        }

        const lead = leadService.saveBooking(
          leadId,
          bookingDate,
          bookingTime
        );

        if (!lead) {
          await bot.sendMessage(
            msg.chat.id,
            "Заявка не найдена.",
            getMainKeyboardForUser(msg.from.id)
          );
          return;
        }

        await bot.sendMessage(
          msg.chat.id,
          [
            `Запись по заявке #${lead.id} сохранена.`,
            "",
            `Дата: ${bookingDate}`,
            `Время: ${bookingTime}`
          ].join("\n"),
          getMainKeyboardForUser(msg.from.id)
        );

        return;
      }
    } catch (error) {
      console.error("[web app data error]", error.message);

      await bot.sendMessage(
        msg.chat.id,
        "Не удалось обработать данные записи.",
        getMainKeyboardForUser(msg.from.id)
      );

      return;
    }
  }

  if (!msg.text) return;

  const text = msg.text.trim();

  if (
    text === "/start" ||
    text === "/cancel" ||
    text === "/lead" ||
    text === "/leads" ||
    text === "/bookings" ||
    text === "/report"
  ) {
    return;
  }

    const session = fsm.getSession(msg.from.id);

    if (
  session.state === LEAD_STATES.ADMIN_REPLY_TO_LEAD &&
  session.step === LEAD_STEPS.WAIT_ADMIN_MESSAGE
) {
  if (!isAdmin(msg.from.id, env.ADMIN_IDS)) {
    return;
  }

  const clientTelegramId = session.data.clientTelegramId;

  if (!clientTelegramId) {
    await bot.sendMessage(
      msg.chat.id,
      "Не найден Telegram ID клиента.",
      getMainKeyboardForUser(msg.from.id)
    );
    fsm.clearState(msg.from.id);
    return;
  }

  try {
    const lead = leadService.getLeadById(session.data.leadId);

    const firstName = lead?.first_name || "";
    const lastName = lead?.last_name || "";

    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    const greeting = fullName
      ? `${botConfig.clientGreeting}, ${fullName}!`
      : `${botConfig.clientGreeting}!`;

    const messageToClient = `${greeting} ${botConfig.bookingReplyPrefix} ${text}`;

    await bot.sendMessage(clientTelegramId, messageToClient);

    leadService.saveBooking(session.data.leadId, text);

    await bot.sendMessage(
      msg.chat.id,
      "Сообщение клиенту отправлено, запись сохранена.",
      getMainKeyboardForUser(msg.from.id)
    );
  } catch (error) {
    await bot.sendMessage(
      msg.chat.id,
      `Не удалось отправить сообщение клиенту: ${error.message}`,
      getMainKeyboardForUser(msg.from.id)
    );
  }

  fsm.clearState(msg.from.id);
  return;
}

    if (text === MENU_LABELS.SUBMIT_LEAD) {
      await startLeadFlow(bot, fsm, msg);
      return;
    }

    if (text === MENU_LABELS.SHOW_CONTACTS) {
      await bot.sendMessage(
        msg.chat.id,
        botConfig.contactsMessage,
        getMainKeyboardForUser(msg.from.id)
      );
      return;
    }

    if (text === MENU_LABELS.HELP) {
      await bot.sendMessage(
        msg.chat.id,
        botConfig.helpMessage,
        getMainKeyboardForUser(msg.from.id)
      );
      return;
    }

    if (text === MENU_LABELS.CANCEL_FLOW) {
      fsm.clearState(msg.from.id);

      await bot.sendMessage(
        msg.chat.id,
        botConfig.cancelFlowText,
        getMainKeyboardForUser(msg.from.id)
      );
      return;
    }

    if (text === MENU_LABELS.REPORTS) {
  if (!isAdmin(msg.from.id, env.ADMIN_IDS)) {
    await bot.sendMessage(
      msg.chat.id,
      "Раздел доступен только администратору.",
      getMainKeyboardForUser(msg.from.id)
    );
    return;
  }

  await bot.sendMessage(
    msg.chat.id,
    "📊 Выберите период отчёта:",
    getReportKeyboard()
  );

  return;
}

    if (
      text === MENU_LABELS.ENTER_PHONE_MANUALLY &&
      session.state === LEAD_STATES.LEAD_FORM &&
      session.step === LEAD_STEPS.ASK_PHONE
    ) {
      fsm.setState(
        msg.from.id,
        LEAD_STATES.LEAD_FORM,
        LEAD_STEPS.ASK_PHONE_MANUAL,
        session.data
      );

      await bot.sendMessage(
        msg.chat.id,
        botConfig.askPhoneManualText,
        getLeadPhoneKeyboard()
      );
      return;
    }

    if (
      session.state === LEAD_STATES.LEAD_FORM &&
      session.step === LEAD_STEPS.ASK_PHONE_MANUAL
    ) {
      if (!validators.isValidPhone(text)) {
        await bot.sendMessage(
          msg.chat.id,
          botConfig.invalidPhoneText,
          getLeadPhoneKeyboard()
        );
        return;
      }

      const normalizedPhone = validators.normalizePhone(text);

      const lead = leadService.saveLead({
        telegramId: session.data.telegramId,
        firstName: session.data.firstName,
        lastName: session.data.lastName,
        username: session.data.username,
        phone: normalizedPhone
      });

      fsm.clearState(msg.from.id);

      await bot.sendMessage(
        msg.chat.id,
        buildSavedLeadText(lead),
        getMainKeyboardForUser(msg.from.id)
      );

      const adminText = leadService.formatLeadForAdmin(lead);
      await notifyAdmins(bot, env.ADMIN_IDS, adminText, lead.id, env.BOOKING_WEB_APP_URL);
      return;
    }

    if (
      session.state === LEAD_STATES.LEAD_FORM &&
      session.step === LEAD_STEPS.ASK_PHONE
    ) {
      await bot.sendMessage(
        msg.chat.id,
        botConfig.choosePhoneMethodText,
        getLeadPhoneKeyboard()
      );
      return;
    }

    await bot.sendMessage(
      msg.chat.id,
      botConfig.unknownActionText,
      getMainKeyboardForUser(msg.from.id)
    );
  });
}

module.exports = {
  registerLeadHandlers
};
