const { MENU_LABELS } = require("../constants/menuLabels");

function getLeadPhoneKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "Поделиться телефоном", request_contact: true }],
        [{ text: MENU_LABELS.ENTER_PHONE_MANUALLY }],
        [{ text: MENU_LABELS.CANCEL_FLOW }]
      ],
      resize_keyboard: true,
      persistent: true,
      one_time_keyboard: false
    }
  };
}

module.exports = {
  getLeadPhoneKeyboard
};