const { Telegraf, Markup } = require('telegraf');
const { BOT_TOKEN } = require('./config');
const { readSettings, writeSettings, readUsers, writeUsers } = require('./db');

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN .env faylida ko'rsatilmagan!");
}

const bot = new Telegraf(BOT_TOKEN);

const NO_MESSAGE_PERMISSIONS = {
  can_send_messages: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_photos: false,
  can_send_videos: false,
  can_send_video_notes: false,
  can_send_voice_notes: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_add_web_page_previews: false,
  can_invite_users: true,
};

const FULL_PERMISSIONS = {
  can_send_messages: true,
  can_send_audios: true,
  can_send_documents: true,
  can_send_videos: true,
  can_send_video_notes: true,
  can_send_voice_notes: true,
  can_send_polls: true,
  can_send_other_messages: true,
  can_add_web_page_previews: true,
  can_invite_users: true,
};

function getSettings(settings, chatId) {
  if (!settings[chatId]) {
    settings[chatId] = { groupInvite: 0, channel: null };
  }
  return settings[chatId];
}

function getUserState(users, chatId, userId) {
  if (!users[chatId]) users[chatId] = {};
  if (!users[chatId][userId]) {
    users[chatId][userId] = { locked: false, invitesDone: 0, invitesNeeded: 0 };
  }
  return users[chatId][userId];
}

async function mute(ctx, chatId, userId) {
  try {
    await ctx.telegram.restrictChatMember(chatId, userId, { permissions: NO_MESSAGE_PERMISSIONS });
  } catch (e) {
    console.error('Mute xatosi:', e.message);
  }
}

async function unmute(ctx, chatId, userId) {
  try {
    await ctx.telegram.restrictChatMember(chatId, userId, { permissions: FULL_PERMISSIONS });
  } catch (e) {
    console.error('Unmute xatosi:', e.message);
  }
}

async function isChatAdmin(ctx) {
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return member.status === 'administrator' || member.status === 'creator';
  } catch (e) {
    return false;
  }
}

async function isChannelMember(ctx, channelUsername, userId) {
  try {
    const member = await ctx.telegram.getChatMember(channelUsername, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (e) {
    return false;
  }
}

bot.start(async (ctx) => {
  const text =
    "🐦‍⬛KANAL va 👥GURUHGA - ISTAGANCHA ODAM YIG'ISHDA YORDAM BERADIGAN BOT!\n\n" +
    "1) 🐦‍⬛ KANALGA ODAM YIG'ISH - Men guruhingizdagi a'zolarni kanalga a'zo bo'lmaguncha yozdirmayman ❗\n\n" +
    "2) 👥 GURUHGA ODAM YIG'ISH - Men guruhingizdagi odamlar guruhga odam qo'shishmasa yozdirmayman ❗\n\n" +
    "/help - 📝 TO'LIQ QO'LLANMA\n\n" +
    "🤖 Bot ushbu vazifalarni bajarishi uchun guruhingizda (va kanal talab qilinsa, kanalda ham) to'liq ADMIN bo'lishi shart!";
  await ctx.reply(text);
});

bot.help(async (ctx) => {
  const text =
    "📝 QO'LLANMA\n\n" +
    "👥 GURUHGA ODAM YIG'ISH\n" +
    "/guruh <son> — guruhda yozish uchun necha kishi taklif qilish shartligini yoqadi.\n" +
    "Masalan: /guruh 5\n" +
    "/guruh 0 — o'chiradi\n\n" +
    "🐦‍⬛ KANALGA ODAM YIG'ISH\n" +
    "/kanal @kanal_username — guruhda yozish uchun shu kanalga a'zo bo'lish shartini yoqadi.\n" +
    "/kanal off — o'chiradi\n\n" +
    "⚠️ Eslatma:\n" +
    "— Bot guruhda to'liq ADMIN bo'lishi shart (a'zolarni cheklash huquqi bilan).\n" +
    "— Kanal talabi ishlashi uchun bot o'sha kanalga ham ADMIN qilib qo'shilishi shart.\n" +
    "— Faqat guruh adminlari /guruh va /kanal buyruqlarini ishlata oladi.";
  await ctx.reply(text);
});

bot.command('guruh', async (ctx) => {
  if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
    return ctx.reply('Bu buyruq faqat guruhda ishlaydi.');
  }
  if (!(await isChatAdmin(ctx))) {
    return ctx.reply('Bu buyruqni faqat guruh adminlari ishlata oladi.');
  }
  const parts = ctx.message.text.trim().split(/\s+/);
  const n = Number(parts[1]);
  if (Number.isNaN(n) || n < 0) {
    return ctx.reply("To'g'ri son kiriting. Masalan: /guruh 5  (o'chirish uchun: /guruh 0)");
  }

  const settings = readSettings();
  const chatSettings = getSettings(settings, ctx.chat.id);
  chatSettings.groupInvite = n;
  await writeSettings(settings);

  if (n === 0) {
    await ctx.reply("👥 GURUHGA ODAM YIG'ISH — O'CHIRILDI ❌");
  } else {
    await ctx.reply(
      `👥 GURUHGA ODAM YIG'ISH ISHGA TUSHDI ✅\n\nendi guruh a'zolari yozish uchun ${n} ta odam taklif qilishlari kerak bo'ladi.`
    );
  }
});

bot.command('kanal', async (ctx) => {
  if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
    return ctx.reply('Bu buyruq faqat guruhda ishlaydi.');
  }
  if (!(await isChatAdmin(ctx))) {
    return ctx.reply('Bu buyruqni faqat guruh adminlari ishlata oladi.');
  }
  const parts = ctx.message.text.trim().split(/\s+/);
  const arg = parts[1];

  const settings = readSettings();
  const chatSettings = getSettings(settings, ctx.chat.id);

  if (!arg) {
    return ctx.reply("Kanal username'ini kiriting. Masalan: /kanal @mening_kanalim  (o'chirish uchun: /kanal off)");
  }

  if (arg.toLowerCase() === 'off') {
    chatSettings.channel = null;
    await writeSettings(settings);
    return ctx.reply("🐦‍⬛ KANALGA ODAM YIG'ISH — O'CHIRILDI ❌");
  }

  const channelUsername = arg.startsWith('@') ? arg : `@${arg}`;
  chatSettings.channel = channelUsername;
  await writeSettings(settings);
  await ctx.reply(
    `🐦‍⬛ KANALGA ODAM YIG'ISH ISHGA TUSHDI ✅\n\nendi guruh a'zolari ${channelUsername} kanaliga a'zo bo'lmaguncha guruhda yoza olishmaydi.\n\n⚠️ Botni ${channelUsername} kanaliga ham ADMIN qilib qo'shishni unutmang!`
  );
});

bot.on('new_chat_members', async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const adderId = ctx.message.from.id;
    const addedReal = ctx.message.new_chat_members.filter((m) => !m.is_bot);
    if (addedReal.length === 0) return;

    const users = readUsers();
    const state = getUserState(users, chatId, adderId);
    if (!state.locked) return;

    state.invitesDone += addedReal.length;

    if (state.invitesDone >= state.invitesNeeded) {
      state.locked = false;
      state.invitesDone = 0;
      state.invitesNeeded = 0;
      await writeUsers(users);
      await unmute(ctx, chatId, adderId);
      await ctx.reply(
        `✅ Rahmat! <a href="tg://user?id=${adderId}">Siz</a> yana guruhda yozishingiz mumkin.`,
        { parse_mode: 'HTML' }
      );
    } else {
      await writeUsers(users);
    }
  } catch (e) {
    console.error('new_chat_members xatosi:', e.message);
  }
});

bot.on('message', async (ctx, next) => {
  try {
    if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
      return next ? next() : undefined;
    }
    if (ctx.message.new_chat_members || ctx.message.left_chat_member) return;
    if (!ctx.message.from || ctx.message.from.is_bot) return;
    if (ctx.message.text && ctx.message.text.startsWith('/')) return;
    if (!ctx.message.text && !ctx.message.caption && !ctx.message.photo && !ctx.message.video && !ctx.message.sticker) return;

    const chatId = ctx.chat.id;
    const userId = ctx.message.from.id;

    const settings = readSettings();
    const chatSettings = getSettings(settings, chatId);

    if (!chatSettings.groupInvite && !chatSettings.channel) return;
    if (await isChatAdmin(ctx)) return;

    if (chatSettings.channel) {
      const member = await isChannelMember(ctx, chatSettings.channel, userId);
      if (!member) {
        try { await ctx.deleteMessage(); } catch (e) {}
        await mute(ctx, chatId, userId);
        await ctx.reply(
          `🚫 Kechirasiz! <a href="tg://user?id=${userId}">Foydalanuvchi</a>\n\n` +
          `guruhda yozish uchun avval ${chatSettings.channel} kanaliga a'zo bo'ling!`,
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              Markup.button.url("🐦‍⬛ Kanalga o'tish", `https://t.me/${chatSettings.channel.replace('@', '')}`),
              Markup.button.callback("✅ A'zo bo'ldim", 'check_channel'),
            ]),
          }
        );
        return;
      }
    }

    if (chatSettings.groupInvite > 0) {
      const users = readUsers();
      const state = getUserState(users, chatId, userId);

      if (state.locked) {
        try { await ctx.deleteMessage(); } catch (e) {}
        return;
      }

      state.locked = true;
      state.invitesDone = 0;
      state.invitesNeeded = chatSettings.groupInvite;
      await writeUsers(users);

      await mute(ctx, chatId, userId);
      await ctx.reply(
        `🚫 Kechirasiz! <a href="tg://user?id=${userId}">Foydalanuvchi</a>\n\n` +
        `siz guruhga yozish uchun avval ${chatSettings.groupInvite} ta odam qo'shishingiz zarur!`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([Markup.button.callback('✅ Odam qo\'shdim', 'check_invite')]),
        }
      );
    }
  } catch (e) {
    console.error('message handler xatosi:', e.message);
  }
});

bot.action('check_channel', async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const settings = readSettings();
    const chatSettings = getSettings(settings, chatId);

    if (!chatSettings.channel) {
      return ctx.answerCbQuery('Kanal talabi hozir faol emas.');
    }

    const member = await isChannelMember(ctx, chatSettings.channel, userId);
    if (member) {
      await unmute(ctx, chatId, userId);
      await ctx.editMessageText("✅ Rahmat! Siz kanalga a'zo bo'ldingiz, endi guruhda yozishingiz mumkin.");
      await ctx.answerCbQuery('Tabriklaymiz!');
    } else {
      await ctx.answerCbQuery("Siz hali kanalga a'zo bo'lmagansiz!", { show_alert: true });
    }
  } catch (e) {
    console.error('check_channel xatosi:', e.message);
  }
});

bot.action('check_invite', async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const users = readUsers();
    const state = getUserState(users, chatId, userId);

    if (!state.locked) {
      await ctx.editMessageText('✅ Siz allaqachon yoza olasiz.');
      return ctx.answerCbQuery();
    }

    if (state.invitesDone >= state.invitesNeeded) {
      state.locked = false;
      state.invitesDone = 0;
      state.invitesNeeded = 0;
      await writeUsers(users);
      await unmute(ctx, chatId, userId);
      await ctx.editMessageText('✅ Rahmat! Endi guruhda yozishingiz mumkin.');
      await ctx.answerCbQuery('Tabriklaymiz!');
    } else {
      const qoldi = state.invitesNeeded - state.invitesDone;
      await ctx.answerCbQuery(`Hali ${qoldi} ta odam qo'shishingiz kerak!`, { show_alert: true });
    }
  } catch (e) {
    console.error('check_invite xatosi:', e.message);
  }
});

module.exports = bot;
