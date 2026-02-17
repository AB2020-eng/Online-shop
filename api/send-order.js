export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }
  try {
    const token = process.env.BOT_TOKEN || process.env.VITE_BOT_TOKEN || '';
    const chatId = process.env.OWNER_CHAT_ID || process.env.VITE_OWNER_CHAT_ID || '';
    const chatUsername = process.env.OWNER_CHAT_USERNAME || '';
    const target = chatId || (chatUsername ? (chatUsername.startsWith('@') ? chatUsername : `@${chatUsername}`) : '');
    if (!token || !target) {
      res.status(500).json({ ok: false, error: 'missing_env' });
      return;
    }
    // Robust body parse for both plain Node and frameworks
    let raw = '';
    await new Promise((resolve) => {
      try {
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', resolve);
      } catch {
        resolve();
      }
    });
    let body = {};
    try {
      if (raw && typeof raw === 'string') {
        body = JSON.parse(raw);
      } else if (req.body && typeof req.body === 'object') {
        body = req.body;
      } else {
        body = {};
      }
    } catch {
      body = {};
    }
    const { items = [], customer = {}, payment = '', delivery = {}, total = 0 } = body;
    const itemsText = Array.isArray(items)
      ? items.map(i => `- ${i.name || ''}${i.variant && i.variant.size ? ` (Size ${i.variant.size})` : ''}${i.variant && i.variant.color ? ` · ${i.variant.color}` : ''}`).join('\n')
      : '';
    const details =
      `New Order Received\n\n` +
      `Items:\n${itemsText}\n\n` +
      `Customer Details:\n` +
      `- Name: ${customer.name || ''}\n` +
      `- Phone: ${customer.contact || ''}\n` +
      `- Address: ${customer.address || ''}\n` +
      `- Area: ${delivery.zone || ''}${delivery.city ? ` • ${delivery.city}` : ''}\n\n` +
      `Payment: ${payment}\n` +
      `Total: ${total}`;
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: target, text: details })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) {
      const desc = j && typeof j === 'object' ? (j.description || '') : '';
      const code = j && typeof j === 'object' ? (j.error_code || r.status) : r.status;
      res.status(400).json({ ok: false, error: 'telegram_error', description: desc, code, data: j });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    try {
      res.status(500).json({ ok: false, error: 'server_error' });
    } catch {
      // Last resort: plain text
      res.status(500).end('server_error');
    }
  }
}
