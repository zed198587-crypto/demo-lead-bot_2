const { formatters } = require("../../core");

function createLeadService({ leadRepository }) {
  function saveLead({ telegramId, firstName, lastName, username, phone }) {
    return leadRepository.createLead({
      telegramId,
      firstName: firstName ? String(firstName).trim() : null,
      lastName: lastName ? String(lastName).trim() : null,
      username: username ? String(username).trim() : null,
      phone: String(phone).trim()
    });
  }

  function saveBooking(leadId, bookingDate, bookingTime) {
    return leadRepository.updateBooking(
      leadId,
      bookingDate,
      bookingTime
    );
  }

  function listRecentLeads(limit = 10) {
    return leadRepository.getRecentLeads(limit);
  }

  function listLeadsByDateRange(fromDate, toDate) {
    return leadRepository.getLeadsByDateRange(
      fromDate,
      toDate
    );
  }

  function getLeadById(id) {
    return leadRepository.findLeadById(id);
  }

  function formatLeadForAdmin(lead) {
  const fullName = [lead.first_name, lead.last_name]
    .filter(Boolean)
    .join(" ");

  const username = lead.username
    ? `@${lead.username}`
    : "Username не указан";

  return [
    `🆕 НОВАЯ ЗАЯВКА #${lead.id}`,
    "",
    `👤 ${fullName || "Имя не указано"}`,
    `📱 ${username}`,
    "",
    `📞 ${lead.phone || "-"}`,
    "",
    `🕐 ${formatters.formatDateTime(lead.created_at)}`
  ].join("\n");
}

  function formatLeadsList(leads) {
  if (!leads.length) {
    return "📋 Заявок пока нет.";
  }

  return [
    "📋 ПОСЛЕДНИЕ ЗАЯВКИ",
    "",
    `Показано: ${leads.length}`,
    "━━━━━━━━━━━━━━",
    "",
    ...leads.map((lead) => {
      const fullName = [lead.first_name, lead.last_name]
        .filter(Boolean)
        .join(" ");

      const username = lead.username
        ? `@${lead.username}`
        : "Username не указан";

      const isBooked = Boolean(lead.booked_at);
      const statusIcon = isBooked ? "🟢" : "🟡";

      return [
        `${statusIcon} #${lead.id} — ${fullName || "Без имени"}`,
        `📱 ${username}`,
        `📞 ${lead.phone || "-"}`,
        `🕐 ${formatters.formatDateTime(lead.created_at)}`,
        `📅 Запись: ${lead.booking_text || "не назначена"}`,
        isBooked
          ? `✅ Оформлена: ${formatters.formatDateTime(lead.booked_at)}`
          : "⏳ Запись ещё не оформлена",
        "",
        "━━━━━━━━━━━━━━"
      ].join("\n");
    })
  ].join("\n");
}

  return {
    saveLead,
    saveBooking,
    listRecentLeads,
    listLeadsByDateRange,
    getLeadById,
    formatLeadForAdmin,
    formatLeadsList
  };
}

module.exports = {
  createLeadService
};