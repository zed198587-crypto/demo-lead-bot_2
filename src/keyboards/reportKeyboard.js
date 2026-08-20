function getReportKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📅 Сегодня",
            callback_data: "report:today"
          },
          {
            text: "📅 Завтра",
            callback_data: "report:tomorrow"
          }
        ],
        [
          {
            text: "📆 Неделя",
            callback_data: "report:week"
          },
          {
            text: "🗓 Месяц",
            callback_data: "report:month"
          }
        ],
        [
          {
            text: "❌ Отмена",
            callback_data: "report:cancel"
          }
        ]
      ]
    }
  };
}

module.exports = {
  getReportKeyboard
};