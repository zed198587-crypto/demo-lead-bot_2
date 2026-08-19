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
    }
  ]);
}

module.exports = {
  registerCommands
};