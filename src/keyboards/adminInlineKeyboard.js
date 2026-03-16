const { CALLBACKS } = require("../constants/callbackData");

function getLeadAdminKeyboard(leadId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Записать",
            callback_data: `${CALLBACKS.BOOK_LEAD_PREFIX}${leadId}`
          }
        ]
      ]
    }
  };
}

module.exports = {
  getLeadAdminKeyboard
};
