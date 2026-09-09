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
 * @param {FormDataEntryValue | null} value
 */
function labelOf(map, value) {
  const key = typeof value === 'string' ? value : ''
  if (!key) return '—'
  return map[key] || key
}

/**
 * Build human-readable payload for email.
 * @param {FormData} fd
 */
export function buildBriefPayload(fd) {
  return {
    _subject: `Бриф Optimus — ${String(fd.get('name') || '').trim() || 'без імені'}`,
    _template: 'table',
    _captcha: 'false',
    Імʼя: String(fd.get('name') || '').trim(),
    Контакт: String(fd.get('contact') || '').trim(),
    'Компанія / ніша': String(fd.get('company') || '').trim() || '—',
    'Тип сайту': labelOf(LABELS.type, fd.get('type')),
    Ціль: labelOf(LABELS.goal, fd.get('goal')),
    Бюджет: labelOf(LABELS.budget, fd.get('budget')),
    Термін: labelOf(LABELS.deadline, fd.get('deadline')),
    'Поточний сайт': String(fd.get('website') || '').trim() || '—',
    Деталі: String(fd.get('message') || '').trim() || '—',
  }
}

/**
 * Send brief to email. Tries Vercel API first, then FormSubmit directly (local).
 * @param {FormData} fd
 */
export async function sendBrief(fd) {
  if (fd.get('_honey')) {
    return { ok: true }
  }

  const payload = buildBriefPayload(fd)

  try {
    const apiRes = await fetch('/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: payload['Імʼя'],
        contact: payload['Контакт'],
        company: fd.get('company') || '',
        type: fd.get('type') || '',
        goal: fd.get('goal') || '',
        budget: fd.get('budget') || '',
        deadline: fd.get('deadline') || '',
        site: fd.get('website') || '',
        message: fd.get('message') || '',
        _honey: fd.get('_honey') || '',
      }),
    })

    if (apiRes.ok) {
      const ct = apiRes.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const data = await apiRes.json().catch(() => ({ ok: true }))
        if (data.ok !== false) return { ok: true }
      }
    }

    // Local Vite has no /api — fall through to FormSubmit
    if (apiRes.status !== 404) {
      throw new Error(`API ${apiRes.status}`)
    }
  } catch {
    // fall through
  }

  const upstream = await fetch(`https://formsubmit.co/ajax/${BRIEF_EMAIL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!upstream.ok) {
    throw new Error(`FormSubmit ${upstream.status}`)
  }

  return { ok: true }
}

export function initForm() {
  const form = document.getElementById('lead-form')
  const success = document.getElementById('form-success')
  if (!form || !success) return

  if (form.hasAttribute('data-brief')) {
    initBrief(form, success)
  }
}

/**
 * @param {HTMLFormElement} form
 * @param {HTMLElement} success
 */
function initBrief(form, success) {
  const panes = /** @type {NodeListOf<HTMLElement>} */ (
    form.querySelectorAll('[data-brief-pane]')
  )
  const fill = form.querySelector('[data-brief-fill]')
  const stepEl = form.querySelector('[data-brief-step]')
  const titleEl = form.querySelector('[data-brief-title]')
  const prevBtn = form.querySelector('[data-brief-prev]')
  const nextBtn = form.querySelector('[data-brief-next]')
  const submitBtn = form.querySelector('[data-brief-submit]')
  const errorEl = document.getElementById('form-error')
  const titles = ['Проєкт і ціль', 'Бюджет і терміни', 'Контакт']
  let step = 0
  let sending = false

  const clearErrors = () => {
    form.querySelectorAll('.form__error').forEach((err) => {
      if (err.id === 'form-error') return
      err.hidden = true
    })
    form.querySelectorAll('.field').forEach((el) => el.classList.remove('is-invalid'))
    if (errorEl) errorEl.hidden = true
  }

  /** @param {string} key @param {boolean} condition */
  const showErr = (key, condition) => {
    const err = form.querySelector(`[data-error-for="${key}"]`)
    const field = err?.closest('.field')
    if (!err) return !condition
    err.hidden = !condition
    field?.classList.toggle('is-invalid', condition)
    return !condition
  }

  const validateStep = (index) => {
    clearErrors()
    if (index === 0) {
      const type = form.querySelector('[name="type"]:checked')
      const goal = form.querySelector('[name="goal"]:checked')
      let ok = true
      if (!showErr('type', !/** @type {HTMLInputElement | null} */ (type)?.value)) ok = false
      if (!showErr('goal', !/** @type {HTMLInputElement | null} */ (goal)?.value)) ok = false
      return ok
    }
    if (index === 1) {
      const budget = form.querySelector('[name="budget"]:checked')
      const deadline = form.querySelector('[name="deadline"]:checked')
      let ok = true
      if (!showErr('budget', !/** @type {HTMLInputElement | null} */ (budget)?.value)) ok = false
      if (!showErr('deadline', !/** @type {HTMLInputElement | null} */ (deadline)?.value))
        ok = false
      return ok
    }
    /** @type {HTMLInputElement | null} */
    const name = form.querySelector('[name="name"]')
    /** @type {HTMLInputElement | null} */
    const contact = form.querySelector('[name="contact"]')
    let ok = true
    if (!showErr('name', !name?.value.trim())) ok = false
    if (!showErr('contact', !contact?.value.trim())) ok = false
    return ok
  }

  const render = () => {
    panes.forEach((pane, i) => {
      pane.hidden = i !== step
    })
    if (fill instanceof HTMLElement) {
      fill.style.width = `${((step + 1) / panes.length) * 100}%`
    }
    if (stepEl) stepEl.textContent = String(step + 1)
    if (titleEl) titleEl.textContent = titles[step] || ''
    if (prevBtn instanceof HTMLElement) prevBtn.hidden = step === 0
    if (nextBtn instanceof HTMLElement) nextBtn.hidden = step >= panes.length - 1
    if (submitBtn instanceof HTMLElement) submitBtn.hidden = step < panes.length - 1
    success.hidden = true
  }

  prevBtn?.addEventListener('click', () => {
    if (sending) return
    step = Math.max(0, step - 1)
    render()
  })

  nextBtn?.addEventListener('click', () => {
    if (sending) return
    if (!validateStep(step)) return
    step = Math.min(panes.length - 1, step + 1)
    render()
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (sending) return
    if (!validateStep(step)) return

    sending = true
    form.classList.add('is-sending')
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = true
      const label = submitBtn.querySelector('span:not(.btn__arrow)')
      if (label) label.textContent = 'Надсилаємо…'
    }
    if (errorEl) errorEl.hidden = true

    try {
      await sendBrief(new FormData(form))
      form.reset()
      step = 0
      clearErrors()
      render()
      success.hidden = false
      success.focus()
    } catch {
      if (errorEl) errorEl.hidden = false
    } finally {
      sending = false
      form.classList.remove('is-sending')
      if (submitBtn instanceof HTMLButtonElement) {
        submitBtn.disabled = false
        const label = submitBtn.querySelector('span:not(.btn__arrow)')
        if (label) label.textContent = 'Надіслати бриф'
      }
    }
  })

  render()
}
