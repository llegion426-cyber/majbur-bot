require('dotenv').config();
 
const http = require('http');
const bot = require('./bot');
 
// Render "Web Service" portni kutadi — shuning uchun oddiy HTTP server ochamiz
const PORT = process.env.PORT || 3000;
 
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Bot ishlab turibdi ✅');
});
 
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server ${PORT}-portda ishga tushdi ✅`);
});
 
bot
  .launch()
  .then(() => console.log('Bot ishga tushdi ✅'))
  .catch((e) => console.error('Botni ishga tushirishda xato:', e.message));
 
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
