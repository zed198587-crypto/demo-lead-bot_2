const { validators } = require("../../bot-core");
const { botConfig } = require("../config/botConfig");
const { LEAD_STATES, LEAD_STEPS } = require("../constants/leadStates");
const { MENU_LABELS } = require("../constants/menuLabels");
const { CALLBACKS } = require("../constants/callbackData");
const { getMainKeyboard } = require("../keyboards/mainKeyboard");
const { getLeadPhoneKeyboard } = require("../keyboards/leadKeyboard");
const { getLeadAdminKeyboard } = require("../keyboards/adminInlineKeyboard");
const { createLeadRepository } = require("../repositories/leadRepository");
const { createLeadService } = require("../services/leadService");

function isAdmin(userId, adminIds = []) {
  return adminIds.includes(Number(userId));
}

async function notifyAdmins(bot, adminIds, text, leadId) {
  for (const adminId of adminIds) {
    try {
      await bot.sendMessage(
        adminId,
        text,
        getLeadAdminKeyboard(leadId)
      );
    } catch (error) {
      console.error(`[lead notify error] adminId=${adminId}`, error.message);
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

function registerLeadHandlers({ bot, db, fsm, env }) {
  const leadRepository = createLeadRepository(db);
  leadRepository.init();

  const leadService = createLeadService({ leadRepository });

  const fs = require("fs");
  const path = require("path");

bot.onText(/^\/start$/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    botConfig.welcomeMessage,
    getMainKeyboard()
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
        getMainKeyboard()
      );
      return;
    }

    const leads = leadService.listRecentLeads(10);
    const text = [
      "Последние 10 заявок:",
      "",
      leadService.formatLeadsList(leads)
    ].join("\n");

    await bot.sendMessage(msg.chat.id, text, getMainKeyboard());
  });

    bot.onText(/^\/cancel$/, async (msg) => {
    fsm.clearState(msg.from.id);

    await bot.sendMessage(
      msg.chat.id,
      botConfig.cancelFlowText,
      getMainKeyboard()
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
      getMainKeyboard()
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
      getMainKeyboard()
    );

    const adminText = leadService.formatLeadForAdmin(lead);
    await notifyAdmins(bot, env.ADMIN_IDS, adminText, lead.id);
  });

  bot.on("message", async (msg) => {
    if (!msg.text) return;

    const text = msg.text.trim();

    if (
      text === "/start" ||
      text === "/cancel" ||
      text === "/lead" ||
      text === "/leads"
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
      getMainKeyboard()
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
      getMainKeyboard()
    );
  } catch (error) {
    await bot.sendMessage(
      msg.chat.id,
      `Не удалось отправить сообщение клиенту: ${error.message}`,
      getMainKeyboard()
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
        getMainKeyboard()
      );
      return;
    }

    if (text === MENU_LABELS.HELP) {
      await bot.sendMessage(
        msg.chat.id,
        botConfig.helpMessage,
        getMainKeyboard()
      );
      return;
    }

    if (text === MENU_LABELS.CANCEL_FLOW) {
      fsm.clearState(msg.from.id);

      await bot.sendMessage(
        msg.chat.id,
        botConfig.cancelFlowText,
        getMainKeyboard()
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
        getMainKeyboard()
      );

      const adminText = leadService.formatLeadForAdmin(lead);
      await notifyAdmins(bot, env.ADMIN_IDS, adminText, lead.id);
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
      getMainKeyboard()
    );
  });
}

module.exports = {
  registerLeadHandlers
};