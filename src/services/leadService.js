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

  function saveBooking(leadId, bookingText) {
    return leadRepository.updateBooking(
      leadId,
      String(bookingText).trim()
    );
  }

  function listRecentLeads(limit = 10) {
    return leadRepository.getRecentLeads(limit);
  }

  function getLeadById(id) {
    return leadRepository.findLeadById(id);
  }

  function formatLeadForAdmin(lead) {
    return [
      "Новая заявка!",
      "",
      `ID: ${lead.id}`,
      `Telegram ID: ${lead.telegram_id || "-"}`,
      `Имя: ${lead.first_name || "-"}`,
      `Фамилия: ${lead.last_name || "-"}`,
      `Username: ${lead.username ? "@" + lead.username : "-"}`,
      `Телефон: ${lead.phone}`,
      `Создано: ${formatters.formatDateTime(lead.created_at)}`
    ].join("\n");
  }

  function formatLeadsList(leads) {
    if (!leads.length) {
      return "Заявок пока нет.";
    }

    return leads
      .map((lead) => {
        const fullName = `${lead.first_name || "Без имени"} ${lead.last_name || ""}`.trim();

        return [
          `${lead.id}. ${fullName}`,
          `Username: ${lead.username ? "@" + lead.username : "-"}`,
          `Телефон: ${lead.phone}`,
          `Заявка создана: ${formatters.formatDateTime(lead.created_at)}`,
          `Клиент записан: ${lead.booking_text || "-"}`,
          `Запись оформлена: ${lead.booked_at ? formatters.formatDateTime(lead.booked_at) : "-"}`
        ].join("\n");
      })
      .join("\n\n");
  }

  return {
    saveLead,
    saveBooking,
    listRecentLeads,
    getLeadById,
    formatLeadForAdmin,
    formatLeadsList
  };
}

module.exports = {
  createLeadService
};