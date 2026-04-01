import './style.css'

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Наступний календарний місяць у часовому поясі Києва (1–12). */
function nextCalendarMonthKyiv() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date())
  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  if (!Number.isFinite(y) || !Number.isFinite(m)) {
    const d = new Date()
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    return { year: next.getFullYear(), month: next.getMonth() + 1 }
  }
  let month = m + 1
  let year = y
  if (month > 12) {
    month = 1
    year += 1
  }
  return { year, month }
}

function initNextMonthBadge() {
  const host = document.querySelector('[data-next-month-badge]')
  if (!host) return

  const { year, month } = nextCalendarMonthKyiv()
  const label = new Date(Date.UTC(year, month - 1, 1))
  const monthName = new Intl.DateTimeFormat('uk-UA', {
    month: 'long',
    timeZone: 'UTC',
  }).format(label)
  const iso = `${year}-${String(month).padStart(2, '0')}`

  host.textContent = ''
  host.append('Прийом заявок на ')
  const time = document.createElement('time')
  time.dateTime = iso
  time.textContent = `${monthName} ${year}`
  host.append(time)
}

/** @param {HTMLElement} header */
function initHeader(header) {
  const onScroll = () => {
    header.classList.toggle('header--scrolled', window.scrollY > 16)
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
}

function initNav() {
  const toggle = document.querySelector('[data-nav-toggle]')
  const menu = document.querySelector('[data-nav-menu]')
  if (!toggle || !menu) return

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open))
    menu.classList.toggle('nav__list--open', open)
    document.body.classList.toggle('nav-open', open)
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true'
    setOpen(!open)
  })

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false))
  })

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false)
  })
}

function initFaq() {
  const root = document.querySelector('[data-faq]')
  if (!root) return

  root.querySelectorAll('.faq__item').forEach((item) => {
    const btn = item.querySelector('.faq__q')
    const panel = item.querySelector('.faq__a')
    if (!btn || !panel) return

    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true'
      root.querySelectorAll('.faq__q').forEach((otherBtn) => {
        const otherItem = otherBtn.closest('.faq__item')
        const otherPanel = otherItem?.querySelector('.faq__a')
        otherBtn.setAttribute('aria-expanded', 'false')
        if (otherPanel) otherPanel.hidden = true
      })
      if (!open) {
        btn.setAttribute('aria-expanded', 'true')
        panel.hidden = false
      }
    })
  })
}

function animateCount(el, target, durationMs) {
  const start = performance.now()
  const from = 0

  const tick = (now) => {
    const t = Math.min(1, (now - start) / durationMs)
    const eased = 1 - (1 - t) ** 3
    el.textContent = String(Math.round(from + (target - from) * eased))
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function initStats() {
  const el = document.querySelector('.stat__value[data-count]')
  if (!el) return
  const target = Number(el.getAttribute('data-count'))
  if (Number.isNaN(target)) return

  const run = () => {
    if (prefersReducedMotion()) {
      el.textContent = String(target)
      return
    }
    animateCount(el, target, 1200)
  }

  if (!('IntersectionObserver' in window)) {
    run()
    return
  }

  const obs = new IntersectionObserver(
    (entries, o) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          run()
          o.disconnect()
        }
      })
    },
    { threshold: 0.3 }
  )
  obs.observe(el.closest('.stats') || el)
}

function initForm() {
  const form = document.getElementById('lead-form')
  const success = document.getElementById('form-success')
  if (!form || !success) return

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    let valid = true

    /** @type {HTMLInputElement | null} */
    const name = form.querySelector('[name="name"]')
    /** @type {HTMLInputElement | null} */
    const contact = form.querySelector('[name="contact"]')
    /** @type {HTMLSelectElement | null} */
    const type = form.querySelector('[name="type"]')

    const showErr = (field, nameKey, condition) => {
      const err = form.querySelector(`[data-error-for="${nameKey}"]`)
      if (!err) return
      if (condition) {
        err.hidden = false
        valid = false
      } else err.hidden = true
    }

    showErr(name, 'name', !name?.value.trim())
    showErr(contact, 'contact', !contact?.value.trim())
    showErr(type, 'type', !type?.value)

    if (!valid) {
      success.hidden = true
      return
    }

    // Демо: у продакшені — fetch/API, email, CRM, Telegram-бот тощо
    console.log('Лід (демо):', Object.fromEntries(new FormData(form)))
    form.reset()
    success.hidden = false
    success.focus()
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initNextMonthBadge()
  const header = document.querySelector('.header')
  if (header) initHeader(header)
  initNav()
  initFaq()
  initStats()
  initForm()
})
