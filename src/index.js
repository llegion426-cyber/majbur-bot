require('dotenv').config();

const bot = require('./bot');

bot
  .launch()
  .then(() => console.log('Bot ishga tushdi ✅'))
  .catch((e) => console.error('Botni ishga tushirishda xato:', e.message));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
