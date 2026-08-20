async function registerCommands(bot) {
  await bot.setMyCommands([
    {
      command: "start",
      description: "Запустить бота"
    },
    {
      command: "lead",
      description: "Оставить заявку"
    },
    {
      command: "leads",
      description: "Список заявок (админ)"
    },
    {
      command: "clear",
      description: "Очистить базу заявок (админ)"
    }
  ]);
}

module.exports = {
  registerCommands
};