// api/lead.js — серверная функция Vercel (CommonJS, без зависимостей)
//
// ВАЖНО про размещение:
//   Файл должен лежать по пути  api/lead.js  (папка "api" + файл "lead.js"),
//   тогда адрес функции будет  /api/lead.
//   НЕ называйте файл api-lead.js в корне — это даст /api-lead.js, а не /api/lead.
//
// Переменные окружения (Vercel → Settings → Environment Variables),
// поставьте галочки на все среды (Production, Preview, Development):
//   TELEGRAM_BOT_TOKEN = <токен бота от @BotFather>
//   TELEGRAM_CHAT_ID   = <id чата, куда слать заявки>
// После добавления переменных — Redeploy.

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Health-check: открыв этот адрес в браузере (GET), вы должны увидеть JSON ниже.
  // Если видите 404 — функция не задеплоена (проверьте путь api/lead.js).
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, hint: 'Endpoint alive. Use POST to submit a lead.' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Vercel обычно парсит JSON сам, но подстрахуемся
    var body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};
    var lead = body.lead;
    var text = body.text;

    var token = process.env.TELEGRAM_BOT_TOKEN;
    var chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return res.status(500).json({ error: 'Server is not configured: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' });
    }

    var message = text || JSON.stringify(lead || {}, null, 2);

    var tg = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!tg.ok) {
      var detail = await tg.text();
      return res.status(502).json({ error: 'Telegram rejected the request', detail: detail });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: (e && e.message) || 'Unknown error' });
  }
};
