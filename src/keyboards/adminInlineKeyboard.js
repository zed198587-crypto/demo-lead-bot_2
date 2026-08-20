function getLeadAdminKeyboard(leadId, webAppUrl) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📅 Записать",
            web_app: {
              url: `${webAppUrl}?leadId=${leadId}`
            }
          }
        ]
      ]
    }
  };
}

module.exports = {
  getLeadAdminKeyboard
};