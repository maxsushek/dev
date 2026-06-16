// api/lead.js — серверная функция Vercel для приёма заявок с лендинга МС.
//
// Зачем: токен бота хранится на сервере (в переменных окружения), а не в коде
// страницы. Заодно решается проблема CORS и ошибки "Failed to fetch".
//
// ─── Как развернуть ───────────────────────────────────────────────
// 1. Положите этот файл по пути  api/lead.js  в проект на Vercel
//    (или это и есть отдельный проект только с папкой /api).
// 2. В настройках проекта Vercel → Settings → Environment Variables добавьте:
//       TELEGRAM_BOT_TOKEN = <токен вашего бота от @BotFather>
//       TELEGRAM_CHAT_ID   = <id чата/канала, куда слать заявки>
// 3. Задеплойте. URL функции будет:  https://<ваш-проект>.vercel.app/api/lead
// 4. В лендинге, в объекте CONFIG, пропишите:
//       SUBMIT_ENDPOINT: 'https://<ваш-проект>.vercel.app/api/lead'
//    Тогда страница будет слать заявки сюда, а токен в коде указывать не нужно.
//
// Node 18+ на Vercel уже имеет глобальный fetch — внешних зависимостей нет.

export default async function handler(req, res) {
  // CORS — на случай, если лендинг живёт на другом домене
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { lead, text } = req.body || {};

    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return res.status(500).json({ error: 'Server is not configured: missing TELEGRAM env vars' });
    }

    // Текст уже приходит готовым с фронта; если вдруг нет — собираем из lead.
    const message = text || JSON.stringify(lead || {}, null, 2);

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!tg.ok) {
      const detail = await tg.text();
      return res.status(502).json({ error: 'Telegram rejected the request', detail });
    }

    // ─── (опционально) сюда же можно добавить отправку в SalesDrive ───
    // const salesUrl = process.env.SALESDRIVE_HANDLER;  // напр. https://<acc>.salesdrive.me/handler/
    // const salesKey = process.env.SALESDRIVE_FORM_KEY;
    // if (salesUrl && salesKey && lead) {
    //   await fetch(salesUrl, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       form: salesKey,
    //       data: {
    //         fName: lead.name || '',
    //         phone: lead.phone || '',
    //         email: lead.email || '',
    //         organization: lead.company || '',
    //         comment: text || '',
    //       },
    //     }),
    //   }).catch(() => {});  // не валим заявку, если CRM временно недоступна
    // }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
