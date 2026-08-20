const { MENU_LABELS } = require("../constants/menuLabels");

function getMainKeyboard(isAdmin = false, unbookedCount = 0) {
  const keyboard = isAdmin
    ? [
        [{ text: MENU_LABELS.SUBMIT_LEAD }],
        [{ text: `${MENU_LABELS.LEADS} (${unbookedCount})` }],
        [{ text: MENU_LABELS.SHOW_CONTACTS }, { text: MENU_LABELS.HELP }],
        [{ text: MENU_LABELS.REPORTS }]
      ]
    : [
        [{ text: MENU_LABELS.SUBMIT_LEAD }],
        [{ text: MENU_LABELS.SHOW_CONTACTS }, { text: MENU_LABELS.HELP }],
        [{ text: MENU_LABELS.REPORTS }]
      ];

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
