const { MENU_LABELS } = require("../constants/menuLabels");

function getMainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: MENU_LABELS.SUBMIT_LEAD }],
        [{ text: MENU_LABELS.SHOW_CONTACTS }, { text: MENU_LABELS.HELP }]
      ],
      resize_keyboard: true,
      persistent: true
    }
  };
}

module.exports = {
  getMainKeyboard
};