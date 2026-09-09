const BRIEF_EMAIL = 'aleksandrsqvr@gmail.com'

const LABELS = {
  type: {
    landing: 'Лендинг',
    corp: 'Корпоративний',
    shop: 'Магазин',
    other: 'Інше',
  },
  goal: {
    leads: 'Заявки / ліди',
    sales: 'Продажі',
    brand: 'Імідж / бренд',
    hr: 'HR / інше',
  },
  budget: {
    'upto-40': 'до 40 тис ₴',
    '40-120': '40–120 тис ₴',
    '120-300': '120–300 тис ₴',
    '300-plus': '300 тис ₴+',
  },
  deadline: {
    asap: 'ASAP (2–3 тижні)',
    '1m': '1 місяць',
    '2m': '1–2 місяці',
    flex: 'Гнучко',
  },
}

/**
 * @param {Record<string, string>} map
 * @param {string | undefined} value
 */
function labelOf(map, value) {
  if (!value) return '—'
  return map[value] || value
}

/**
 * Vercel serverless: forward brief to Gmail via FormSubmit.
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}')
    } catch {
      body = {}
    }
  }
  body = body || {}

  if (body._honey) {
    return res.status(200).json({ ok: true })
  }

  const name = String(body.name || '').trim()
  const contact = String(body.contact || '').trim()

  if (!name || !contact) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' })
  }

  const payload = {
    _subject: `Бриф Optimus — ${name}`,
    _template: 'table',
    _captcha: 'false',
    Імʼя: name,
    Контакт: contact,
    'Компанія / ніша': String(body.company || '').trim() || '—',
    'Тип сайту': labelOf(LABELS.type, body.type),
    Ціль: labelOf(LABELS.goal, body.goal),
    Бюджет: labelOf(LABELS.budget, body.budget),
    Термін: labelOf(LABELS.deadline, body.deadline),
    'Поточний сайт': String(body.site || '').trim() || '—',
    Деталі: String(body.message || '').trim() || '—',
  }

  try {
    const upstream = await fetch(`https://formsubmit.co/ajax/${BRIEF_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      console.error('FormSubmit error', upstream.status, text)
      return res.status(502).json({ ok: false, error: 'Upstream failed' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(502).json({ ok: false, error: 'Send failed' })
  }
}
