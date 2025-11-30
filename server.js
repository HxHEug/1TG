const { Telegraf } = require('telegraf');
const express = require('express');
const admin = require('firebase-admin');

// --- 1. Инициализация Firebase Admin SDK ---
// Секретные данные должны быть в переменных окружения Cyclic!
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Важно для ключей из переменных окружения
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
    });
}
const db = admin.firestore();

// --- 2. Инициализация Telegram Bot ---
const botToken = process.env.BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL; // URL вашего Netlify
const bot = new Telegraf(botToken);
const app = express();
const port = process.env.PORT || 3000;

// Устанавливаем Webhook для Telegraf (обязательно для Cyclic/heroku/etc.)
app.use(bot.webhookCallback('/' + botToken)); // Уникальный путь для webhook
bot.telegram.setWebhook(miniAppUrl + botToken);

// --- 3. Обработка команд бота ---

// Команда /start - запускает Mini App
bot.start((ctx) => {
    // Создаем кнопку, которая открывает наше Mini App
    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ 
                    text: 'Забронировать Место', 
                    web_app: { url: miniAppUrl } 
                }]
            ]
        }
    };

    ctx.reply(
        `Привет, ${ctx.message.from.first_name}! 🤖\n\nНажмите кнопку ниже, чтобы открыть приложение бронирования коворкинга.`,
        inlineKeyboard
    );
});

// Дополнительный обработчик: чтение данных, отправленных из Mini App
bot.on('web_app_data', async (ctx) => {
    try {
        const data = JSON.parse(ctx.message.web_app_data.data);
        
        if (data.action === 'booked') {
            const deskId = data.deskId;
            const date = data.date;
            
            // Здесь можно добавить запись в базу через Admin SDK, 
            // если вы не хотите, чтобы фронтенд обращался напрямую к Firebase.
            
            ctx.reply(`🥳 Отлично! Бронирование для места **${deskId}** на **${date}** подтверждено!`, { parse_mode: 'Markdown' });
        }
    } catch (e) {
        console.error("Ошибка при обработке Web App Data:", e);
        ctx.reply("Произошла ошибка при обработке данных из приложения.");
    }
});

// --- 4. API для фронтенда (более безопасно) ---
// *Опционально:* Если вы хотите более безопасный бэкенд, фронтенд должен
// отправлять запросы на бронирование сюда, а не напрямую в Firebase.

app.get('/', (req, res) => {
    res.send('Бот запущен. Я слушаю Telegram.');
});

// Пример: API для получения свободных мест
app.get('/api/workspaces', async (req, res) => {
    try {
        const snapshot = await db.collection('workspaces').get();
        const workspaces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(workspaces);
    } catch (error) {
        res.status(500).send("Ошибка при получении данных");
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});