const { MENU_LABELS } = require("../constants/menuLabels");

function getMainKeyboard(isAdmin = false) {
  const keyboard = [
    [{ text: MENU_LABELS.SUBMIT_LEAD }],
    [{ text: MENU_LABELS.SHOW_CONTACTS }, { text: MENU_LABELS.HELP }],
    [{ text: MENU_LABELS.REPORTS }]
  ];

  if (isAdmin) {
    keyboard.push(
      [{ text: "/leads" }, { text: "/bookings" }],
      [{ text: "/report" }]
    );
  }

  return {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
      persistent: true
    }
  };
}

module.exports = {
  getMainKeyboard
};
