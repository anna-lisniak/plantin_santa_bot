const { Telegraf, session, Scenes: { BaseScene, Stage }, Markup } = require('telegraf');
const shuffle = require('lodash.shuffle');
const isMemberAdmin = require('./utils/isAdmin');
const { admin, telegramToken } = require('./credentials');

const PASSWORD = 'plantin loves you';

const API_TOKEN = telegramToken;
const PORT = process.env.PORT || 3000;
const URL = process.env.URL || 'https://floating-fortress-35705.herokuapp.com';

const bot = new Telegraf(telegramToken);
bot.telegram.setWebhook(`${URL}/bot${API_TOKEN}`);
bot.startWebhook(`/bot${API_TOKEN}`, null, PORT);
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

bot.command('start', async (ctx) => {
  try {
    await bot.telegram.sendSticker(
        ctx.chat.id,
        stickers.hohoho
    );

    await bot.telegram.sendMessage(
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
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

const wishlistScene = new BaseScene('wishlistScene');
wishlistScene.enter(async (ctx) => {
  try {
    await ctx.reply('Отправь мне свой wishlist');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

wishlistScene.on('text', async (ctx) => {
  try {
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

    await ctx.reply(message, inline_keyboard);
  } catch (e) {
    await ctx.reply('error :(');

    console.error(e)
  }
});

wishlistScene.leave(async (ctx) => {
  try {
    const inline_keyboard = Markup.inlineKeyboard([
      Markup.button.callback('Дополнить!', 'set_wishlist'),
      Markup.button.callback('Удалить!', 'clear_wishlist'),
      Markup.button.callback('Готово!', 'waitForGame'),
    ]);

    await ctx.reply('Твой wishlist создан. Ты можешь дополнить или удалить его.', inline_keyboard);
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.action('waitForGame', async (ctx) => {
  try {
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
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

const passwordScene = new BaseScene('passwordScene');
passwordScene.enter(async (ctx) => {
  try {
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
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }

});
passwordScene.on('text', async (ctx) => {
  try {
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
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.action('withoutWishlist', async (ctx) => {
  try {
    ctx.reply('Готово!');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

const stage = new Stage([passwordScene, wishlistScene]);

bot.use(session());
bot.use(stage.middleware());


bot.action('finishWishlist', async (ctx) => {
  try {
    await ctx.scene.leave('wishlistScene');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});
// bot.action('finishWishlist', ctx => ctx.reply('ok'))


bot.action('addWishlist', async (ctx) => {
  try {
    await ctx.scene.enter('wishlistScene');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.action('join', async (ctx) => {
  try {
    await ctx.scene.enter('passwordScene');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.command('join', async (ctx) => {
  try {
    await ctx.scene.enter('passwordScene');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.command('members', async (ctx) => {
  try {
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

    await bot.telegram.sendMessage(id, 'Секретных Сант нет',);
    await bot.telegram.sendSticker(id, 'CAACAgIAAxkBAANOYZAnJK09DtE3ByRr4JBmvsgJ1qUAAgYIAAJcAmUDdkzVqeIaLG4iBA',);

  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.command('go', async (ctx) => {
  try {
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
    console.log(JSON.stringify({ members }, null, 2));
    // process.st

    if (members.length < 2) {
      await bot.telegram.sendMessage(
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
      try {
        await bot.telegram.sendSticker(from.id, stickers.present);
      } catch (e) {
        console.log('e');
      }
      try {
        await bot.telegram.sendMessage(
            from.id,
            `Ты Секретный Санта для [${to.firstName}](tg://user?id=${to.id})`,
            { parse_mode: 'Markdown' }
        );
      } catch (e) {
        console.log(e);
        await bot.telegram.sendMessage(
            from.id,
            'Something went wrong, ask Anna for help'
        );
      }

      try {
        const wishlist = to.wishlist.length ? 'Вот тебе подсказка для ' + to.firstName + ':\n' + to.wishlist.join(',\n') : '';

        if (wishlist) {
          await bot.telegram.sendMessage(
              from.id,
              wishlist,
              { parse_mode: 'Markdown' }
          );
        }
      } catch (e) {
        console.log(e);
        await bot.telegram.sendMessage(
            from.id,
            'Processing wishlist failed, ask Anna for help'
        );
      }
    }

  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.command('test', async (ctx) => {
  try {
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
    console.log(JSON.stringify({ members }, null, 2));

    // if (members.length < 2) {
    //   await bot.telegram.sendMessage(
    //       id,
    //       `Не хватает Сант`,
    //       { parse_mode: 'Markdown' }
    //   );
    //   return;
    // }

    const santas = shuffle(members);

    for (let i = 0; i < santas.length; i++) {
      const from = santas[i];
      const to = santas[i + 1] || santas[0];
      try {
        // await bot.telegram.sendSticker(from.id, stickers.present);
      } catch (e) {
        console.log('e');
      }
      try {
        // await bot.telegram.sendMessage(
        //     from.id,
        //     `Ты Секретный Санта для [${to.firstName}](tg://user?id=${to.id})`,
        //     { parse_mode: 'Markdown' }
        );
      } catch (e) {
        console.log(e);
        await bot.telegram.sendMessage(
            from.id,
            'Something went wrong, ask Anna for help'
        );
      }

      try {
        const wishlist = to.wishlist.length ? 'Вот тебе подсказка для ' + to.firstName + ':\n' + to.wishlist.join(',\n') : '';
        console.log({wishlist});
        // if (wishlist) {
        //   await bot.telegram.sendMessage(
        //       from.id,
        //       wishlist,
        //       { parse_mode: 'Markdown' }
        //   );
        // }
      } catch (e) {
        console.log(e);
        await bot.telegram.sendMessage(
            from.id,
            'Processing wishlist failed, ask Anna for help'
        );
      }
    }

  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.command('clear', async (ctx) => {
  try {
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

    await bot.telegram.sendMessage(
        id,
        `Ты уверен?`,
        {
          reply_markup: {
            inline_keyboard: [actions]
          }
        }
    );
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.action('removeMember', async (ctx) => {
  try {
    const { id } = ctx.update.callback_query.from;
    let { members } = ctx.db;
    if (!members.find(member => member.id === id)) {
      bot.telegram.sendMessage(id, 'Ты больше не Санта...');
      return;
    }

    ctx.db.members = members.filter(member => member.id !== id);
    await bot.telegram.sendSticker(id, stickers.cry);
    await bot.telegram.sendMessage(id, 'Ты больше не Санта...');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.action('removeMemberList', async (ctx) => {
  try {
    ctx.db.members = [];
    await bot.telegram.sendMessage(ctx.update.callback_query.from.id, 'Killed!');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.command('set_wishlist', async (ctx) => {
  try {
    await ctx.scene.enter('wishlistScene');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.command('clear_wishlist', async (ctx) => {
  try {
    ctx.db.members = ctx.db.members.map((member) => {
      if (member.id !== ctx.from.id) return member;
      return {
        ...member,
        wishlist: []
      };
    });
    await ctx.reply('cleared');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.command('get_wishlist', async (ctx) => {
  try {
    const member = ctx.db.members.find((member) => member.id === ctx.from.id);
    if (!member) return ctx.reply('error...');

    const message = member.wishlist.join(',\n');

    if (!message) return ctx.reply('Твой вишлист пуст');

    await ctx.reply(message);
  } catch (e) {
    await ctx.reply('error :(', e);
    console.error(e)
  }

});

bot.action('clear_wishlist', async (ctx) => {
  try {
    const { from } = ctx.update.callback_query;
    ctx.db.members = ctx.db.members.map((member) => {
      if (member.id !== from.id) return member;
      return {
        ...member,
        wishlist: []
      };
    });
    ctx.reply('Успешно удален!');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.action('set_wishlist', async (ctx) => {
  try {
    await ctx.scene.enter('wishlistScene');
  } catch (e) {
    await ctx.reply('error :(');
    console.error(e)
  }
});

bot.launch();
