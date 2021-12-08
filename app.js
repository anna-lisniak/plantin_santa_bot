const { Telegraf, session, Scenes: { BaseScene, Stage }, Markup } = require('telegraf');
const shuffle = require('lodash.shuffle');
const isMemberAdmin = require('./utils/isAdmin');
const { admin, telegramToken } = require('./credentials');

const PASSWORD = 'plantin loves you';

const bot = new Telegraf(telegramToken);
bot.context.db = {
  members: []
};

const stickers = {
  hohoho: 'CAACAgEAAxkBAAEDSKFhkRcJWR6EGhD_9jYY5k8cOnUAAbgAAicJAAK_jJAE1B2YCC-WfN4iBA',
  join: 'CAACAgEAAxkBAAEDSKVhkReRvAwAATpxLol9IXc9dHCOq1IAAjMJAAK_jJAEw8SMnOzyBLoiBA',
  alreadyJoined: 'CAACAgEAAxkBAAEDSKdhkRgXhX68uXrvHiLs95OZ92zttgACNAkAAr-MkATApNlXqcgV7yIE',
  passwordAsked: 'CAACAgEAAxkBAAEDSKlhkRhbKQyanvsDBQK5yTI1FnlIpwACKwkAAr-MkATAQmFogFvAiCIE',
  membersList: 'CAACAgIAAxkBAAEDSK9hkRqa9YYt-hzL1Qfvkn2VnQmikAACEwADKA9qFJcGL7Che0dtIgQ',
  present: 'CAACAgEAAxkBAAEDSK1hkRmJPKaxYVOswPE3uXHK2osxawACRgkAAr-MkAQ7mcTuV6DCsyIE',
  cry: 'CAACAgIAAxkBAAEDSLFhkRs93osSVcu9EWkJ0R3rd9qpKgACGQADKA9qFESJNy_YT2cpIgQ',
  wink: 'CAACAgIAAxkBAAEDb3BhsIiYTx00gr16kP3ynIgc8A37BwACFgADKA9qFB-mQGcoPpTGIwQ',
  secret: 'CAACAgIAAxkBAAEDb6RhsI62PuueEL7mktFdKFB8YnSgbQACFwADKA9qFAABtflXFiJ-AyME'
};

bot.command('start', (ctx) => {
  bot.telegram.sendSticker(
      ctx.chat.id,
      stickers.hohoho
  );

  bot.telegram.sendMessage(
      ctx.chat.id,
      `*Ho-ho-ho!*\n\nРады видеть тебя, _${ctx.from.first_name}_, в рядах Секретных Сант!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{
              text: 'Вступить в ряды!',
              callback_data: 'join',
            }],
          ]
        }
      }
  );
});

const wishlistScene = new BaseScene('wishlistScene');
wishlistScene.enter(async (ctx) => {
  await ctx.reply('Отправь мне свой wishlist');
});
wishlistScene.on('text', async (ctx) => {

  const inline_keyboard = Markup.inlineKeyboard([
    Markup.button.callback('Готово!', 'finishWishlist'),
  ]);

  if (ctx.message.text === 'Готово!') {
    await ctx.scene.leave();
    return;
  }

  let wishlist = [];
  ctx.db.members = ctx.db.members.map(member => {
    if (member.id !== ctx.message.from.id) return member;
    wishlist = [...member.wishlist, ctx.message.text];
    return {
      ...member,
      wishlist
    };
  });

  const message = wishlist.reduce((acc, curr) => {
    if (acc) acc += ', \n';
    acc += curr;
    return acc;
  }, '');

  ctx.reply(message, inline_keyboard);
});


wishlistScene.leave(ctx => {
  const inline_keyboard = Markup.inlineKeyboard([
    Markup.button.callback('Дополнить!', 'set_wishlist'),
    Markup.button.callback('Удалить!', 'clear_wishlist'),
    Markup.button.callback('Готово!', 'waitForGame'),
  ]);

  ctx.reply('Твой wishlist создан. Ты можешь дополнить или удалить его.', inline_keyboard);
});

bot.action('waitForGame', async (ctx) => {
  const { from } = ctx.update.callback_query;

  await bot.telegram.sendMessage(
      from.id,
      `Ожидай, пока [Генеральный Санта](tg://user?id=${admin.id}) начнет игру!`,
      { parse_mode: 'Markdown' }
  );

  await bot.telegram.sendSticker(
      from.id,
      stickers.secret
  );
});

const passwordScene = new BaseScene('passwordScene');
passwordScene.enter(async (ctx) => {
  const { message = {}, update: { callback_query = {} } = {} } = ctx;

  const from = message.from || callback_query.from;

  const memberExist = ctx.db.members.find(member => member.id === from.id);

  if (memberExist) {
    await ctx.reply('Ты уже в наших рядах');
    await bot.telegram.sendSticker(
        from.id,
        stickers.wink
    );
    ctx.scene.leave();
    return;
  }

  await ctx.reply('Разгадай секретный пароль...\n(отвечай на английском)');
  await ctx.replyWithPhoto({ source: './plant.jpeg' });
  await ctx.replyWithPhoto({ source: './loves.jpeg' });
  await ctx.replyWithPhoto({ source: './you.jpeg' });

});
passwordScene.on('text', async (ctx) => {
  if (ctx.message.text.toLowerCase() !== PASSWORD) return ctx.reply('Даю тебе еще одну попытку');

  const { from } = ctx.message;
  const member = {
    firstName: from.first_name,
    id: from.id,
    wishlist: []
  };

  ctx.db.members.push(member);

  await ctx.scene.leave();
  await ctx.reply('Готово!');
  const inline_keyboard = Markup.inlineKeyboard([
    Markup.button.callback('Да', 'addWishlist'),
    Markup.button.callback('Нет', 'withoutWishlist'),
  ]);
  await ctx.reply('Хочешь создать свой wishlist?', inline_keyboard);
});

bot.action('withoutWishlist', ctx => ctx.reply('Готово!'));

const stage = new Stage([passwordScene, wishlistScene]);

bot.use(session());
bot.use(stage.middleware());


bot.action('finishWishlist', ctx => ctx.scene.leave('wishlistScene'));
// bot.action('finishWishlist', ctx => ctx.reply('ok'))


bot.action('addWishlist', async (ctx) => {
  await ctx.scene.enter('wishlistScene');
});

bot.action('join', (ctx) => ctx.scene.enter('passwordScene'));
bot.command('join', (ctx) => ctx.scene.enter('passwordScene'));

// bot.hears(password, ctx => {
//   const { from: { id, first_name, username = '' } } = ctx;
//   const exist = members.find((member) => id === member.id);
//
//   if (exist) {
//     bot.telegram.sendMessage(id, 'You are already in member list!');
//     bot.telegram.sendSticker(id, stickers.alreadyJoined);
//     return;
//   }
//
//   members.push({ id, first_name, username, secret_santa: null });
//   bot.telegram.sendSticker(ctx.chat.id, stickers.join);
//   bot.telegram.sendMessage(
//       ctx.chat.id,
//       `If you want you can add a _recomendasion_ for YOUR Secret Santa!`,
//       {
//         parse_mode: 'Markdown',
//         reply_markup: {
//           inline_keyboard: [
//             [{
//               text: 'I want!',
//               callback_data: 'recommend',
//             }],
//           ]
//         }
//       }
//   );
// });


// bot.action('recommend', ctx => {
//   const { id } = ctx.update.callback_query.from;
//   bot.telegram.sendMessage(id, 'Great! Send me your wishlist. It will be visible just for your SecretSanta.\n' +
//       'You can also leave link. It is not required.' +
//       '\n\n' +
//       'Please use this format:' +
//       '\n\n' +
//       'dream1 - link\n' +
//       'dream2 - Another link\n'
//   );
// });

// bot.hears(/\s\-\s/g, ctx => {
//   const { input } = ctx.match;
//   const items = input.split(/\n/g);
//
//   let list = '';
//   let i = 1;
//
//   for (const item of items) {
//     const [name, link] = item.split(/\s\-\s/);
//     list += link ? `${i++}. [${name}](${link})\n` : `${i++}. ${name}`;
//   }
//
//   members.forEach(member => {
//     if(member.id === ctx.update.message.from.id) {
//       member.wishList = list;
//     }
//   })
//
//   bot.telegram.sendMessage(ctx.update.message.from.id, 'Done!')
// });

bot.command('members', (ctx) => {
  const { from: { id } } = ctx;

  let message = '';

  let i = 1;

  for (const member of ctx.db.members) {
    message += `${i++}. [${member.firstName}](tg://user?id=${member.id})\n`;
  }

  if (message) {
    bot.telegram.sendSticker(id, stickers.membersList);
    bot.telegram.sendMessage(id, message, { parse_mode: 'Markdown' });
    return;
  }

  bot.telegram.sendMessage(id, 'Секретных Сант нет',);
  bot.telegram.sendSticker(id, 'CAACAgIAAxkBAANOYZAnJK09DtE3ByRr4JBmvsgJ1qUAAgYIAAJcAmUDdkzVqeIaLG4iBA',);
});

bot.command('go', ctx => {
  const { from: { id } } = ctx;

  const isAdmin = isMemberAdmin(id);

  if (!isAdmin) {
    bot.telegram.sendMessage(
        id,
        `Попроси [Генерального Санту](tg://user?id=${admin.id}) начать!`,
        { parse_mode: 'Markdown' }
    );
    return;
  }

  const { members } = ctx.db;
  console.log({members});

  if (members.length < 2) {
    bot.telegram.sendMessage(
        id,
        `Не хватает Сант`,
        { parse_mode: 'Markdown' }
    );
    return;
  }

  const santas = shuffle(members);

  for (let i = 0; i < santas.length; i++) {
    const from = santas[i];
    const to = santas[i + 1] || santas[0];

    const wishlist = to.wishlist.length ? 'Вот тебе подсказка для ' + to.firstName + ':\n' + to.wishlist.join(',\n') : '';

    bot.telegram.sendSticker(from.id, stickers.present);
    bot.telegram.sendMessage(
        from.id,
        `Ты Секретный Санта для [${to.firstName}](tg://user?id=${to.id})\n\n${wishlist}`,
        { parse_mode: 'Markdown' }
    );
  }
});

bot.command('clear', ctx => {
  const { from: { id } } = ctx;

  const actions = [{
    text: 'Я больше не хочу быть Сантой...',
    callback_data: 'removeMember',
  }];

  const isAdmin = isMemberAdmin(id);

  if (isAdmin) {
    actions.push({
      text: 'Kill all santas',
      callback_data: 'removeMemberList',
    });
  }

  bot.telegram.sendMessage(
      id,
      `Ты уверен?`,
      {
        reply_markup: {
          inline_keyboard: [actions]
        }
      }
  );
});

bot.action('removeMember', ctx => {
  const { id } = ctx.update.callback_query.from;
  let { members } = ctx.db;
  if (!members.find(member => member.id === id)) {
    bot.telegram.sendMessage(id, 'Ты больше не Санта...');
    return;
  }

  ctx.db.members = members.filter(member => member.id !== id);
  bot.telegram.sendSticker(id, stickers.cry);
  bot.telegram.sendMessage(id, 'Ты больше не Санта...');
});

bot.action('removeMemberList', ctx => {
  ctx.db.members = [];
  bot.telegram.sendMessage(ctx.update.callback_query.from.id, 'Killed!');
});

bot.command('set_wishlist', ctx => {
  ctx.scene.enter('wishlistScene');
});

bot.command('clear_wishlist', ctx => {
  ctx.db.members = ctx.db.members.map((member) => {
    if (member.id !== ctx.from.id) return member;
    return {
      ...member,
      wishlist: []
    };
  });
  ctx.reply('cleared');
});

bot.command('get_wishlist', ctx => {
  const member = ctx.db.members.find((member) => member.id === ctx.from.id);
  if (!member) return ctx.reply('error...');
  ctx.reply(member.wishlist.join(',\n'));
});


bot.action('clear_wishlist', ctx => {
  const { from } = ctx.update.callback_query;
  ctx.db.members = ctx.db.members.map((member) => {
    if (member.id !== from.id) return member;
    return {
      ...member,
      wishlist: []
    };
  });
  ctx.reply('Успешно удален!');
});

bot.action('set_wishlist', ctx => {
  ctx.scene.enter('wishlistScene');
});


bot.launch();
