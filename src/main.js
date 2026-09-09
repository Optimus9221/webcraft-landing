import './style.css'
import { initForm } from './brief.js'

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
    header.classList.toggle('header--scrolled', window.scrollY > 24)
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
    setOpen(toggle.getAttribute('aria-expanded') !== 'true')
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

  const tabs = /** @type {NodeListOf<HTMLButtonElement>} */ (
    root.querySelectorAll('[data-faq-tab]')
  )
  const panels = /** @type {NodeListOf<HTMLElement>} */ (
    root.querySelectorAll('[data-faq-panel]')
  )
  const indexEl = root.querySelector('[data-faq-index]')
  const prev = root.querySelector('[data-faq-prev]')
  const next = root.querySelector('[data-faq-next]')
  const total = panels.length
  if (!total) return

  let current = 0

  const show = (index) => {
    current = (index + total) % total
    tabs.forEach((tab, i) => {
      const on = i === current
      tab.classList.toggle('is-active', on)
      tab.setAttribute('aria-selected', String(on))
    })
    panels.forEach((panel, i) => {
      const on = i === current
      panel.hidden = !on
      panel.classList.toggle('is-active', on)
      if (on) {
        panel.style.animation = 'none'
        void panel.offsetWidth
        panel.style.animation = ''
      }
    })
    if (indexEl) {
      indexEl.textContent = `${String(current + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      show(Number(tab.dataset.faqTab) || 0)
    })
  })

  prev?.addEventListener('click', () => show(current - 1))
  next?.addEventListener('click', () => show(current + 1))

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      show(current + 1)
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      show(current - 1)
    }
  })

  show(0)
}

function initProcess() {
  const root = document.querySelector('[data-process]')
  if (!root) return
  const items = /** @type {NodeListOf<HTMLElement>} */ (
    root.querySelectorAll('.process__item')
  )

  items.forEach((item) => {
    item.addEventListener('mouseenter', () => {
      items.forEach((el) => el.classList.toggle('is-active', el === item))
    })
    item.addEventListener('focus', () => {
      items.forEach((el) => el.classList.toggle('is-active', el === item))
    })
    item.addEventListener('click', () => {
      items.forEach((el) => el.classList.toggle('is-active', el === item))
    })
  })

  root.addEventListener('mouseleave', () => {
    items.forEach((el) => el.classList.remove('is-active'))
  })
}

function animateCount(el, target, durationMs) {
  const start = performance.now()
  const tick = (now) => {
    const t = Math.min(1, (now - start) / durationMs)
    const eased = 1 - (1 - t) ** 3
    el.textContent = String(Math.round(target * eased))
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function initCounters() {
  const nodes = /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll('[data-count]')
  )
  if (!nodes.length) return

  const run = (el) => {
    const target = Number(el.getAttribute('data-count'))
    if (Number.isNaN(target)) return
    if (prefersReducedMotion()) {
      el.textContent = String(target)
      return
    }
    animateCount(el, target, 1400)
  }

  if (!('IntersectionObserver' in window)) {
    nodes.forEach(run)
    return
  }

  const seen = new WeakSet()
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) return
        if (seen.has(entry.target)) return
        seen.add(entry.target)
        run(entry.target)
        obs.unobserve(entry.target)
      })
    },
    { threshold: 0.35 }
  )
  nodes.forEach((el) => obs.observe(el))
}

function initReveals() {
  const nodes = /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll('[data-reveal]')
  )
  if (!nodes.length) return

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    nodes.forEach((el) => el.classList.add('is-in'))
    return
  }

  const groups = new Map()
  nodes.forEach((el) => {
    const parent = el.parentElement || document.body
    if (!groups.has(parent)) groups.set(parent, [])
    groups.get(parent).push(el)
  })
  groups.forEach((list) => {
    list.forEach((el, i) => {
      el.style.setProperty('--d', `${i * 80}ms`)
    })
  })

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-in')
        obs.unobserve(entry.target)
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
  )
  nodes.forEach((el) => obs.observe(el))

  requestAnimationFrame(() => {
    document.querySelectorAll('.hero [data-reveal]').forEach((el) => {
      el.classList.add('is-in')
    })
  })
}

function initTabs() {
  const root = document.querySelector('[data-tabs]')
  if (!root) return

  const buttons = /** @type {NodeListOf<HTMLButtonElement>} */ (
    root.querySelectorAll('[data-tab]')
  )
  const panels = /** @type {NodeListOf<HTMLElement>} */ (
    root.querySelectorAll('[data-panel]')
  )

  const activate = (id) => {
    buttons.forEach((btn) => {
      const on = btn.dataset.tab === id
      btn.classList.toggle('is-active', on)
      btn.setAttribute('aria-selected', String(on))
    })
    panels.forEach((panel) => {
      const on = panel.dataset.panel === id
      panel.classList.toggle('is-active', on)
      panel.hidden = !on
      if (on) {
        panel.style.animation = 'none'
        // reflow to restart panel-in
        void panel.offsetWidth
        panel.style.animation = ''
      }
    })
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => activate(btn.dataset.tab || ''))
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initNextMonthBadge()
  const header = document.querySelector('.header')
  if (header instanceof HTMLElement) initHeader(header)
  initNav()
  initFaq()
  initProcess()
  initCounters()
  initReveals()
  initTabs()
  initForm()
  initOrbit()
  initFloatCta()
})

function initOrbit() {
  const root = document.querySelector('[data-orbit]')
  if (!root) return
  if (prefersReducedMotion()) {
    root.classList.add('is-paused')
  }
}

function initFloatCta() {
  const btn = document.querySelector('[data-float-cta]')
  const contact = document.getElementById('contact')
  if (!(btn instanceof HTMLElement)) return

  const update = () => {
    const pastHero = window.scrollY > window.innerHeight * 0.55
    let nearContact = false
    if (contact) {
      const rect = contact.getBoundingClientRect()
      nearContact = rect.top < window.innerHeight * 0.75
    }
    btn.classList.toggle('is-visible', pastHero && !nearContact)
  }

  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
}