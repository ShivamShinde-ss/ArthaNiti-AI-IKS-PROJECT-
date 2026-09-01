/* ==========================================================================
   ArthaNiti AI — script.js
   Loader · particles · navbar · royal entry · rule engine · animations
   ========================================================================== */

'use strict';

/* ==========================================================================
   1. UTILITIES
   ========================================================================== */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
};

const KEYS = {
  identity: 'arthaniti:identity',
  theme: 'arthaniti:theme',
  settings: 'arthaniti:settings',
  history: 'arthaniti:history',
};

/* Clamp a number into a range */
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

/* Scroll an element into view, degrading gracefully when unsupported */
function scrollToEl(el, block = 'start') {
  if (!el) return;
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', block });
  }
}

/* Simple throttle */
const throttle = (fn, wait = 120) => {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  };
};

/* Animate a value from 0 → target with easing, invoking onUpdate per frame */
function animateValue(target, duration, onUpdate, onDone) {
  const raf = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb) => setTimeout(() => cb(performance.now()), 16);
  const nowFn = typeof performance !== 'undefined' ? () => performance.now() : Date.now;
  const start = nowFn();
  const tick = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    onUpdate(Math.round(target * eased));
    if (t < 1) raf(tick);
    else if (onDone) onDone();
  };
  raf(tick);
}

/* Escape HTML to keep user input safe */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* --------------------------------------------------------------------------
   TOAST NOTIFICATIONS
   -------------------------------------------------------------------------- */
function showToast(type, title, message, duration = 4200) {
  const settings = getSettings();
  if (settings.toasts === false) return;

  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icons = { success: 'icon-check', info: 'icon-bell', warning: 'icon-warning', error: 'icon-warning' };
  toast.innerHTML = `
    <svg class="icon toast__icon" aria-hidden="true"><use href="#${icons[type] || 'icon-bell'}"></use></svg>
    <div class="toast__body">
      <strong>${escapeHtml(title)}</strong>
      <p style="margin-top:2px">${escapeHtml(message)}</p>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* --------------------------------------------------------------------------
   2. LOADER
   -------------------------------------------------------------------------- */
function initLoader() {
  const loader = $('#loader');
  const bar = $('#loader-bar');
  const percent = $('#loader-percent');

  const MIN_TIME = 1800; // ms before the loader is allowed to hide
  const startedAt = performance.now();

  animateValue(100, 1650, (value) => {
    bar.style.width = `${value}%`;
    percent.textContent = `${value}%`;
  });

  const finish = () => {
    animateValue(100, 350, (value) => {
      bar.style.width = `${value}%`;
      percent.textContent = `${value}%`;
    });
    setTimeout(() => {
      loader.classList.add('is-hidden');
      document.body.classList.add('is-loaded');
      initRevealObserver();
    }, 250);
  };

  if (document.readyState === 'complete') {
    const elapsed = performance.now() - startedAt;
    setTimeout(finish, Math.max(0, MIN_TIME - elapsed));
  } else {
    window.addEventListener('load', () => {
      const elapsed = performance.now() - startedAt;
      setTimeout(finish, Math.max(0, MIN_TIME - elapsed));
    }, { once: true });
  }
}

/* --------------------------------------------------------------------------
   3. AMBIENT PARTICLES
   -------------------------------------------------------------------------- */
function initParticles(count = 26) {
  const canvas = $('#particles');
  if (!canvas) return;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.width = p.style.height = `${1.5 + Math.random() * 2.5}px`;
    p.style.animationDuration = `${9 + Math.random() * 16}s`;
    p.style.animationDelay = `${-Math.random() * 18}s`;
    frag.appendChild(p);
  }
  canvas.appendChild(frag);
}

/* --------------------------------------------------------------------------
   4. NAVBAR — scroll state, mobile menu, active links
   -------------------------------------------------------------------------- */
function initNavbar() {
  const navbar = $('#navbar');
  const toggle = $('#nav-toggle');
  const menu = $('#nav-menu');
  const links = $$('.navbar__link');

  const onScroll = () => {
    navbar.classList.toggle('is-scrolled', window.scrollY > 40);

    /* Active section highlighting */
    let currentId = 'hero';
    const probe = window.scrollY + window.innerHeight * 0.35;
    $$('main section[id]').forEach((section) => {
      if (section.offsetTop <= probe) currentId = section.id;
    });
    links.forEach((link) => {
      const target = link.getAttribute('href');
      link.classList.toggle('is-active', target === `#${currentId}`);
    });
  };

  window.addEventListener('scroll', throttle(onScroll, 90), { passive: true });
  onScroll();

  const closeMenu = () => {
    menu.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  const openMenu = () => {
    menu.classList.add('is-open');
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  toggle.addEventListener('click', () => {
    menu.classList.contains('is-open') ? closeMenu() : openMenu();
  });

  $$('a', menu).forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (innerWidth > 992) closeMenu(); });
}

/* --------------------------------------------------------------------------
   5. SMOOTH SCROLLING + SCROLL REVEAL
   -------------------------------------------------------------------------- */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id.length <= 1) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      scrollToEl(target, 'start');
      history.replaceState(null, '', id);
    });
  });
}

let revealObserver = null;

function initRevealObserver() {
  if (revealObserver) return;
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => revealObserver.observe(el));
}

/* --------------------------------------------------------------------------
   6. THEME HANDLING
   -------------------------------------------------------------------------- */
function initTheme() {
  const root = document.documentElement;
  const apply = (theme) => {
    root.setAttribute('data-theme', theme);
    storage.set(KEYS.theme, theme);
    $$('[data-theme-option]').forEach((btn) => {
      const active = btn.dataset.themeOption === theme;
      btn.classList.toggle('is-selected', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  };

  apply(storage.get(KEYS.theme, 'dark'));

  $('#btn-theme').addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    showToast('success', 'Theme Updated', `You are now in the Royal ${next === 'dark' ? 'Dark' : 'Light'} chamber.`);
  });

  $$('[data-theme-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      apply(btn.dataset.themeOption);
      showToast('info', 'Appearance', 'Your chosen theme has been applied.');
    });
  });
}

/* --------------------------------------------------------------------------
   7. SETTINGS
   -------------------------------------------------------------------------- */
function getSettings() {
  return { animations: true, toasts: true, reduceMotion: false, ...storage.get(KEYS.settings, {}) };
}

function saveSettings(settings) {
  storage.set(KEYS.settings, settings);
}

function initSettings() {
  const settings = getSettings();
  const toggles = {
    'setting-animations': { get: () => settings.animations, set: (v) => { settings.animations = v; } },
    'setting-toasts': { get: () => settings.toasts, set: (v) => { settings.toasts = v; } },
    'setting-motion': {
      get: () => settings.reduceMotion,
      set: (v) => {
        settings.reduceMotion = v;
        document.body.classList.toggle('reduce-motion', v);
      },
    },
  };

  Object.entries(toggles).forEach(([id, cfg]) => {
    const el = $(`#${id}`);
    if (!el) return;
    el.classList.toggle('is-on', !!cfg.get());
    el.setAttribute('aria-checked', String(!!cfg.get()));
    el.addEventListener('click', () => {
      const next = !cfg.get();
      cfg.set(next);
      el.classList.toggle('is-on', next);
      el.setAttribute('aria-checked', String(next));
      saveSettings(settings);
      showToast('info', 'Preferences', 'Your preferences have been saved in this browser.');
    });
  });
}

/* --------------------------------------------------------------------------
   8. MODAL SYSTEM
   -------------------------------------------------------------------------- */
let lastFocused = null;

function initModals() {
  $$('[data-modal-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => openModal($(`#${trigger.dataset.modalOpen}`)));
  });

  $$('.modal [data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal(btn.closest('.modal'));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = $('.modal:not([hidden])');
      if (open) closeModal(open);
    }
  });

  /* Trap focus inside the open modal */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const modal = $('.modal:not([hidden])');
    if (!modal) return;
    const focusables = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', modal)
      .filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

function openModal(modal) {
  if (!modal || !modal.hidden) return;
  lastFocused = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const focusable = $('button, a[href], input, select, textarea', modal);
  if (focusable) setTimeout(() => focusable.focus(), 50);
}

function closeModal(modal) {
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  const anyOpen = $('.modal:not([hidden])');
  if (!anyOpen) document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
}

/* Open the reusable generic modal */
function openGenericModal(title, html) {
  $('#modal-generic-title').textContent = title;
  $('#modal-generic-body').innerHTML = html;
  openModal($('#modal-generic'));
}

/* --------------------------------------------------------------------------
   9. ROYAL ENTRY — identity, local storage, welcome banner
   -------------------------------------------------------------------------- */
function initRoyalEntry() {
  const form = $('#entry-form');
  const nameInput = $('#entry-name');
  const roleSelect = $('#entry-role');
  const errorEl = $('#entry-name-error');
  const card = $('#royal-card');
  const formWrap = form;
  const identity = $('#royal-identity');
  const banner = $('#welcome-banner');

  const renderIdentity = () => {
    const data = storage.get(KEYS.identity, null);
    if (!data) return;
    $('#identity-name').textContent = data.name;
    $('#identity-role').textContent = data.role;
    $('#profile-name').textContent = data.name;
    $('#profile-role').textContent = data.role || 'Strategist';
    formWrap.hidden = true;
    identity.hidden = false;
  };

  const showBanner = (data) => {
    $('#welcome-name').textContent = data.name;
    $('#welcome-role').textContent = data.role || 'Strategist';
    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add('is-visible'));
    setTimeout(() => {
      banner.classList.remove('is-visible');
      setTimeout(() => { banner.hidden = true; }, 700);
    }, 5600);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const role = roleSelect.value;

    let valid = true;
    if (name.length < 2) {
      valid = false;
      errorEl.hidden = false;
      nameInput.closest('.field').classList.add('is-invalid');
    } else {
      errorEl.hidden = true;
      nameInput.closest('.field').classList.remove('is-invalid');
    }

    if (!valid) {
      showToast('warning', 'Royal Entry', 'Please announce your full name before entering.');
      nameInput.focus();
      return;
    }

    const data = { name, role, enteredAt: Date.now() };
    storage.set(KEYS.identity, data);
    renderIdentity();
    showBanner(data);
    showToast('success', 'Welcome to the Sabha', `The court receives ${name} with honour.`);
    form.reset();
  });

  $('#identity-continue').addEventListener('click', () => {
    scrollToEl($('#modules'), 'start');
  });

  $('#identity-reset').addEventListener('click', () => {
    storage.remove(KEYS.identity);
    formWrap.hidden = false;
    identity.hidden = true;
    $('#profile-name').textContent = 'Guest';
    $('#profile-role').textContent = 'Not yet entered';
    showToast('info', 'Sabha Leaved', 'Your identity has been removed from this browser.');
  });

  $('#welcome-close').addEventListener('click', () => {
    banner.classList.remove('is-visible');
    setTimeout(() => { banner.hidden = true; }, 600);
  });

  $('#profile-enter').addEventListener('click', () => {
    closeModal($('#modal-profile'));
    scrollToEl($('#royal-entry'), 'start');
  });

  /* Hero / CTA launch buttons — always send the user to choose a module first */
  const launch = () => {
    scrollToEl($('#modules'), 'start');
    showToast('info', 'Choose a Module', 'ArthaNiti AI is consulted from inside a module. Select one of the Seven Pillars to begin.');
  };
  $('#hero-enter-btn').addEventListener('click', launch);
  $('#cta-launch-btn').addEventListener('click', launch);

  renderIdentity();
}

/* --------------------------------------------------------------------------
   10. STRATEGIC MODULES — selection & workflow wiring
   Each module is an independent domain of expertise. The rule engine answers
   strictly within the module the user has chosen (or that is inferred from
   the scenario). It never borrows answers from another domain.
   -------------------------------------------------------------------------- */
const MODULES = {
  security:     { name: 'National Security & Military Strategy',         short: 'Military Strategy',      icon: 'icon-shield'  },
  economy:      { name: 'Economy, Trade & Business Strategy',           short: 'Economics & Finance',    icon: 'icon-coin'    },
  governance:   { name: 'Governance & Smart Administration',            short: 'Leadership & Governance', icon: 'icon-columns' },
  intelligence: { name: 'Intelligence, Cyber Security & Information Warfare', short: 'Espionage & Intelligence', icon: 'icon-eye' },
  diplomacy:    { name: 'Diplomacy & Geopolitics',                      short: 'Diplomacy',              icon: 'icon-globe'   },
  crisis:       { name: 'Crisis & Disaster Management',                 short: 'Crisis Management',      icon: 'icon-warning' },
  ethics:       { name: 'Ethical Leadership & Strategic Decision Analysis', short: 'Ethics & Leadership',  icon: 'icon-scale'   },
};

/* --------------------------------------------------------------------------
   MODULE_INFO — the presentation layer of each independent expert domain.
   One reusable view is populated from this data; there are no duplicated
   module pages and no global rule-engine entry point.
   -------------------------------------------------------------------------- */
const MODULE_INFO = {
  security: {
    persona: 'Strategic Defence Advisor',
    subtitle: 'Defence of the realm — force, terrain, logistics and preparedness',
    image: 'assets/images/battle-formation.jpg',
    caption: 'A Mauryan army arrayed in the chakra-vyuha before battle.',
    description: 'This module thinks only about the security of the state: how frontiers are held, how armies are readied, how terrain and supply decide campaigns, and when force should be used at all. It weighs deterrence against escalation and always prefers preparedness to adventure.',
    advice: [
      'Frontier posture, troop movements and force readiness',
      'Terrain, fortification and logistics planning',
      'When to escalate, when to wait and when to negotiate from strength',
      'Battlefield planning, reserves and military intelligence',
    ],
    ancient: 'Kautilya devotes whole books to the march, the array of battle and the six-fold policy (shadgunya). War is the last instrument, taken only when relative strength, ground and season favour the king.',
    modern: 'Read this as defence doctrine: measured escalation, credible deterrence, protected supply chains, contingency planning and disciplined use of reserves.',
    example: 'A neighbouring kingdom has increased troop movements near a strategically important frontier while strengthening a nearby fort. The ruler must decide whether to reinforce the frontier, gather more intelligence, or avoid premature escalation.',
    thinking: [
      'Assessing strategic position...',
      'Examining force readiness...',
      'Evaluating terrain and logistics...',
      'Applying principles of military statecraft...',
    ],
  },
  economy: {
    persona: 'Royal Treasury & Economic Advisor',
    subtitle: 'Treasury, trade, taxation and the prosperity of the realm',
    image: 'assets/images/module-economy.jpg',
    caption: 'Scribes of the royal treasury recording revenue in a Mauryan market.',
    description: 'This module reasons entirely in the language of wealth: what the treasury can bear, how revenue is protected without strangling commerce, how merchants are kept confident, and how resources are allocated so the state remains solvent through good seasons and bad.',
    advice: [
      'Treasury capacity, reserves and expenditure discipline',
      'Taxation that raises revenue without driving trade away',
      'Trade routes, market regulation and merchant confidence',
      'Resource allocation and long-term economic resilience',
    ],
    ancient: 'Kautilya holds that the treasury is the root of the state — the king who guards revenue, regulates prices and protects the trader guards the kingdom itself.',
    modern: 'Read this as fiscal and commercial strategy: revenue diversification, tax design, supply-chain economics, market confidence and financial resilience planning.',
    example: 'Revenue from an important trade route has fallen sharply, while the treasury is under pressure and merchants are considering moving their trade elsewhere. The ruler must decide how to protect revenue without damaging commerce.',
    thinking: [
      'Examining treasury capacity...',
      'Assessing trade and revenue...',
      'Evaluating resource allocation...',
      'Applying principles of economic statecraft...',
    ],
  },
  governance: {
    persona: 'State Administration Advisor',
    subtitle: 'Administration, accountability, law and public welfare',
    image: 'assets/images/module-governance.jpg',
    caption: 'The royal court of administration, with officials and record-keepers.',
    description: 'This module is concerned with how the state actually works day to day: the conduct of officials, the honesty of collection, the speed of public services, the discipline of institutions and the welfare of the people who depend on them.',
    advice: [
      'Corruption, audit and the supervision of officials',
      'Delivery of public services and administrative delays',
      'Law, order and institutional discipline',
      'Citizen welfare and the legitimacy of the ruler',
    ],
    ancient: 'Kautilya writes minutely of superintendents, inspections and the forty ways of embezzlement — the king rules through officers, so the officers must themselves be ruled.',
    modern: 'Read this as public administration and governance reform: audit systems, performance measurement, service delivery, transparency and institutional accountability.',
    example: 'A province has experienced repeated complaints about corrupt officials, delayed public services and poor collection of taxes. The ruler must decide how to restore administrative discipline while protecting the welfare of citizens.',
    thinking: [
      'Examining administrative capacity...',
      'Assessing institutional accountability...',
      'Evaluating public welfare...',
      'Applying principles of sound governance...',
    ],
  },
  intelligence: {
    persona: 'Intelligence & Information Security Advisor',
    subtitle: 'Information, secrecy, counter-intelligence and risk',
    image: 'assets/images/module-intelligence.jpg',
    caption: 'A night exchange of sealed dispatches within the king\u2019s network of agents.',
    description: 'This module treats information itself as the asset to be defended. It asks who knows what, how knowledge leaks, how signals are verified before they are believed, and how a network of trusted sources is built and protected.',
    advice: [
      'Detecting and closing information leaks',
      'Counter-intelligence and verification of sources',
      'Compartmentalisation and protection of sensitive plans',
      'Threat analysis, early warning and risk assessment',
    ],
    ancient: 'Kautilya describes a state served by many kinds of agents, whose reports are believed only when three independent sources agree — knowledge before action, verification before belief.',
    modern: 'Read this as information security and intelligence practice: access control, insider-threat detection, source corroboration, monitoring and disciplined risk assessment.',
    example: 'Sensitive information about the kingdom\u2019s strategic plans appears to be reaching an unknown external actor. The ruler must determine how to identify the source, protect information and strengthen the intelligence network.',
    thinking: [
      'Assessing information exposure...',
      'Examining intelligence signals...',
      'Evaluating security risks...',
      'Applying principles of intelligence management...',
    ],
  },
  diplomacy: {
    persona: 'Royal Diplomatic & Geopolitical Advisor',
    subtitle: 'Alliances, treaties, rivals and the circle of states',
    image: 'assets/images/ancient-map.jpg',
    caption: 'The Mandala of states charted on an antique parchment map.',
    description: 'This module reads the world as a geometry of interests. It weighs which neighbour is a natural friend, which is a rival, what a treaty truly commits you to, and how leverage is built and spent without war.',
    advice: [
      'Choosing between competing alliance and trade offers',
      'Negotiation posture, leverage and treaty terms',
      'Managing rivals, neutrals and the middle power',
      'Long-term geopolitical positioning and conflict resolution',
    ],
    ancient: 'The Mandala theory and the six measures of foreign policy (\u1E62\u0101\u1E0Dgu\u1E47ya) teach that the neighbour is a natural rival and the neighbour\u2019s neighbour a natural friend; policy follows the geometry of power, not sentiment.',
    modern: 'Read this as foreign policy and partnership strategy: alliance selection, negotiation leverage, treaty design, hedging and regional influence.',
    example: 'Two neighbouring kingdoms are competing for influence over an important trading region. One proposes an alliance while the other offers favourable trade terms. The ruler must determine which relationship best serves the kingdom\u2019s long-term interests.',
    thinking: [
      'Assessing the interests of neighbouring powers...',
      'Examining alliance options...',
      'Evaluating diplomatic leverage...',
      'Applying Mandala-based reasoning...',
    ],
  },
  crisis: {
    persona: 'State Crisis & Resilience Advisor',
    subtitle: 'Calamity, relief, reserves and the restoration of order',
    image: 'assets/images/module-crisis.jpg',
    caption: 'Royal officers distributing grain from the state granaries during drought.',
    description: 'This module answers only as a manager of calamity: how the population is protected first, how reserves are opened and rationed, how relief is administered without disorder, and how normal life is restored afterwards.',
    advice: [
      'Famine, drought, flood, epidemic and shortage response',
      'Reserves, rationing and equitable distribution',
      'Emergency administration and public order during relief',
      'Recovery, rebuilding and future resilience',
    ],
    ancient: 'Kautilya\u2019s chapters on calamities instruct the king to open the granaries, remit taxes, employ the destitute on public works and treat the suffering of the people as the first charge upon the treasury.',
    modern: 'Read this as disaster management: stockpiles, relief logistics, targeted assistance, continuity of services and post-crisis reconstruction.',
    example: 'A severe drought has reduced agricultural production and created shortages of essential food supplies. The ruler must decide how to protect the population, manage reserves and restore economic stability.',
    thinking: [
      'Assessing the severity of the crisis...',
      'Examining available resources...',
      'Evaluating public welfare risks...',
      'Planning restoration and recovery...',
    ],
  },
  ethics: {
    persona: 'Ethical Leadership Advisor',
    subtitle: 'Dharma, duty, consequence and responsible power',
    image: 'assets/images/chanakya-strategist.jpg',
    caption: 'Kautilya in council, weighing duty against advantage by torchlight.',
    description: 'This module examines the rightness of a decision rather than its mechanics. It sets duty against advantage, immediate gain against lasting welfare, and asks who bears the cost of a choice and whether the ruler could defend it openly.',
    advice: [
      'Trade-offs between short-term gain and long-term welfare',
      'Duty, integrity and the limits of expediency',
      'Stakeholder impact and who bears the cost',
      'Accountability, transparency and defensible decisions',
    ],
    ancient: 'Kautilya insists that in the happiness of his subjects lies the king\u2019s happiness; power exists to serve dharma, and a gain that destroys trust is no gain at all.',
    modern: 'Read this as ethical leadership and decision analysis: stakeholder mapping, second-order consequences, governance ethics and reputational stewardship.',
    example: 'A ruler must choose between a decision that produces immediate financial benefits for the state and another that provides greater long-term welfare for citizens but requires significant short-term sacrifice.',
    thinking: [
      'Examining the competing duties...',
      'Assessing long-term consequences...',
      'Evaluating stakeholder welfare...',
      'Applying principles of responsible leadership...',
    ],
  },
};

let selectedModule = null;

function initModules() {
  $$('.module-card').forEach((card) => {
    card.addEventListener('click', () => selectModule(card.dataset.module, card));
  });

  $('#module-back-to-modules').addEventListener('click', backToModules);
  $('#module-back-to-module').addEventListener('click', backToModule);
  $('#module-launch-btn').addEventListener('click', launchModuleConsole);
  $('#module-use-example').addEventListener('click', () => {
    if (!selectedModule) return;
    $('#scenario-input').value = MODULE_INFO[selectedModule].example;
    $('#scenario-input').focus();
  });
}

/* Open the dedicated information view of a module (one reusable component) */
function selectModule(id, cardEl) {
  if (!MODULE_INFO[id]) return;
  selectedModule = id;
  const meta = MODULES[id];
  const info = MODULE_INFO[id];
  const base = KNOWLEDGE_BASE[id];

  $$('.module-card').forEach((c) => c.classList.remove('is-selected'));
  if (cardEl) cardEl.classList.add('is-selected');
  else {
    const card = document.querySelector(`.module-card[data-module="${id}"]`);
    if (card) card.classList.add('is-selected');
  }

  /* Populate the information view */
  $('#module-view-badge').textContent = meta.short;
  const img = $('#module-view-image');
  img.src = info.image;
  img.alt = `${meta.name} — ${info.caption}`;
  $('#module-view-caption').textContent = info.caption;
  $('#module-view-title').textContent = meta.name;
  $('#module-view-subtitle').textContent = info.subtitle;
  $('#module-view-description').textContent = info.description;

  const list = $('#module-view-advice');
  list.innerHTML = '';
  info.advice.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });

  $('#module-view-ancient').textContent = info.ancient;
  $('#module-view-modern').textContent = info.modern;
  $('#module-view-example').textContent = info.example;

  /* Console context (populated now so it is ready on launch) */
  $('#module-console-name').textContent = meta.name;
  $('#module-console-persona').textContent = `${info.persona} — answering only within ${base.domain}.`;
  $('#module-console-hint').textContent = `Every answer in this consultation is reasoned through ${meta.short}, whatever other domains your question may mention.`;
  $('#scenario-input').placeholder = `e.g. ${info.example.slice(0, 110)}...`;

  /* Show info, hide console */
  $('#module-stage').hidden = false;
  $('#module-info-panel').hidden = false;
  $('#module-console').hidden = true;
  scrollToEl($('#module-stage'), 'start');

  showToast('info', 'Module Opened', `${meta.name} — read the domain, then launch ArthaNiti AI.`);
}

function launchModuleConsole() {
  if (!selectedModule) return;
  $('#module-info-panel').hidden = true;
  $('#module-console').hidden = false;
  scrollToEl($('#module-stage'), 'start');
  setTimeout(() => $('#scenario-input').focus(), 300);
}

function backToModule() {
  if (!selectedModule) return backToModules();
  $('#module-console').hidden = true;
  $('#module-info-panel').hidden = false;
  scrollToEl($('#module-stage'), 'start');
}

function backToModules() {
  $('#module-stage').hidden = true;
  $$('.module-card').forEach((c) => c.classList.remove('is-selected'));
  selectedModule = null;
  scrollToEl($('#modules'), 'start');
}

/* --------------------------------------------------------------------------
   11. THE RULE KNOWLEDGE BASE
   Seven independent expert domains. Every rule is an explicit IF → THEN
   structure inspired by the Arthashastra, written as natural expert counsel.
   `persona`   — who the expert is
   `domain`    — the field of expertise the AI is confined to
   `thinking`  — thinking-phase lines specific to the module
   `rules`     — keyword-matched expert rules (richer text = higher score)
   `default`   — the module's own fallback counsel (never borrowed from another domain)
   -------------------------------------------------------------------------- */
const KNOWLEDGE_BASE = {

  /* ============================ MILITARY STRATEGY ============================ */
  security: {
    persona: 'a military strategist of the Arthashastra, trained in war, siegecraft and the ordering of armies',
    domain: 'warfare, territorial defence, battle formations, logistics, force posture and military intelligence',
    thinking: [
      'Reading the battle-lines of your scenario...',
      'Consulting the six-fold policy of war...',
      'Assessing force, terrain and logistics...',
      'Weighing battle formations and field intelligence...',
      'Composing the field strategy...',
    ],
    rules: [
      {
        id: 'SEC-01',
        keywords: ['invasion', 'invade', 'border', 'attack', 'aggression', 'threat', 'army', 'troops', 'military', 'occupation', 'hostile', 'mobilise', 'mobilize', 'war'],
        situation: 'a hostile neighbour threatening the borders of the state',
        principle: 'The six-fold policy (shadgunya) of the Arthashastra — peace, war, marching, halting, seeking shelter and duplicity — holds that war is the last instrument, chosen only when the state\u2019s relative strength is adequate.',
        recommendation: 'Direct the defence of the realm without panic. Do not march to war on anger or pride; first measure your strength against the invader\u2019s. Hold the border with layered defences, keep your supply lines protected, and keep a channel of negotiation open so the enemy can withdraw without a fatal battle. If war becomes unavoidable, choose the ground where your army is stronger — rivers, passes and forts — rather than meeting him on open plains.',
        reasoning: 'This is a classic casus belli from the Arthashastra\u2019s chapters on the march. Kautilya insists the wise king does not fight a stronger or an equal enemy unprepared; he buys time, fortifies, and strikes only when the advantage is real. The counsel is therefore readiness with restraint — deterrence, not provocation.',
        interpretation: 'In modern terms this is a measured escalation doctrine: posture clearly, preserve diplomatic off-ramps, protect supply and logistics, and force the adversary to fight on terms you choose.',
        actions: [
          'Begin by placing your strongest units where the threat is greatest and fortifying the approaches.',
          'Next, protect your logistics — grain, weapons and reinforcements — so the army can endure a long campaign.',
          'Then open a quiet channel to the adversary so de-escalation remains possible without loss of face.',
          'Finally, withhold decisive force until the enemy\u2019s plan and strength are confirmed by field intelligence.',
        ],
        risk: 'high',
        confidence: 88,
        source: 'Arthashastra, Book 7 · The End of the Six-fold Policy',
      },
      {
        id: 'SEC-02',
        keywords: ['ally', 'alliance', 'coalition', 'defence pact', 'treaty', 'partner', 'friend state', 'joint force', 'united front'],
        situation: 'an offer of military alliance against a shared threat',
        principle: 'The Mandala, or circle of states, teaches that your friend\u2019s friend is your friend and your enemy\u2019s enemy is also your friend; an ally is chosen by the geometry of power, not by sentiment.',
        recommendation: 'Accept the alliance gladly but set its terms with care. Share the burden of defence proportionately, agree on joint plans before you ever need them, and keep your own command structure intact. A treaty signed in peace is a weapon forged in advance; let it bind both sides to clear duties so neither can drift from the common cause.',
        reasoning: 'The Arthashastra treats alliances as instruments of relative strength. Because your scenario speaks of a coalition against a shared threat, the correct military course is to formalise cooperation early, define obligations precisely and rehearse joint operations.',
        interpretation: 'In modern terms: burden-sharing, joint exercises, intelligence liaison and clearly written mutual-defence commitments.',
        actions: [
          'Draft the mutual-defence terms precisely, naming each side\u2019s obligations and resources.',
          'Schedule joint exercises so the alliance is real before it is tested.',
          'Establish a standing liaison for intelligence-sharing between the two commands.',
          'Keep an independent reserve so the alliance never weakens your own freedom of action.',
        ],
        risk: 'low',
        confidence: 84,
        source: 'Arthashastra, Book 7 · On the Circle of States',
      },
      {
        id: 'SEC-03',
        keywords: ['battle', 'formation', 'terrain', 'siege', 'fort', 'ambush', 'deploy', 'engage', 'field', 'campaign', 'flank', 'offensive', 'defence line'],
        situation: 'the planning of the order of battle',
        principle: 'Kautilya\u2019s war councils order the army into formations — the staff, the snake, the circle and the array of crows — and insist that ground, season and morale be read before a single arrow is loosed.',
        recommendation: 'Study the ground before you study the enemy. Post scouts to map every ford, pass and wood, and place your formation so the terrain fights for you — narrow the enemy in a pass, expose his flank on a plain, and protect your own rear with a river or a fort. Put your strongest units at the point of decision, your chariots and elephants where they can charge, and your archers where they can shoot above the heads of your own ranks.',
        reasoning: 'The scenario asks for tactical counsel, and here the Arthashastra is precise: victory is won by arrangement before it is won by arms. The formation is chosen from the ground, and reserves are held because the battle is decided as much by what is not committed as by what is.',
        interpretation: 'In modern terms: mission planning, terrain analysis, force disposition and the disciplined commitment of reserves.',
        actions: [
          'First, complete a terrain and intelligence reconnaissance of the battlefield.',
          'Then select the formation — circle, staff or array of crows — that suits the ground.',
          'Place your decisive arm where it can strike, and hold a strong reserve uncommitted.',
          'Finally, plan the withdrawal and the pursuit before the battle begins.',
        ],
        risk: 'medium',
        confidence: 86,
        source: 'Arthashastra, Book 10 · Relating to War',
      },
      {
        id: 'SEC-04',
        keywords: ['arms race', 'weapon', 'armament', 'rearm', 'deterrence', 'missile', 'nuclear', 'defence budget', 'military spending', 'build-up', 'rearmament'],
        situation: 'an adversary accelerating its armament',
        principle: 'Relative strength (bala) decides every strategic choice; when a rival grows stronger, the state must strengthen its own sinews — treasury, army and allies — or secure compensating alliances.',
        recommendation: 'Match the adversary\u2019s growth, but match it wisely. Pour resources into the weapons and formations that multiply your own strength, not those that merely imitate him. At the same time bind allies to you so his armament is met by a wider wall than your own frontier. Let the treasury and the arsenal grow together, for a rich kingdom with a weak army is prey, and a strong army with an empty treasury starves in the field.',
        reasoning: 'The Arthashastra measures power in limbs — king, minister, province, fort, treasury, army and ally. Your scenario describes one limb growing faster than the others; the remedy is to rebalance the whole body of the state, not to answer steel with steel alone.',
        interpretation: 'In modern terms: capability-based modernisation, cost-effective deterrence and alliance-based aggregation of power.',
        actions: [
          'Begin with a strategic review that ties every new capability to a genuine threat.',
          'Invest in asymmetric advantages that cost less than the adversary\u2019s symmetrical build-up.',
          'Deepen procurement and technology partnerships with reliable allies.',
          'Guard the treasury so that rearmament does not cripple the state it defends.',
        ],
        risk: 'medium',
        confidence: 82,
        source: 'Arthashastra, Book 9 · Activity of the King about to March',
      },
      {
        id: 'SEC-05',
        keywords: ['leak', 'mole', 'traitor', 'spy', 'compromised', 'insider', 'treason', 'betrayal', 'secret plans', 'cipher', 'military secret'],
        situation: 'a leak of military secrets within the armed forces',
        principle: 'The Book of Spies teaches that counsels must be guarded by discipline and secrecy, and that the state protects its plans by testing loyalty and by feeding false plans to the enemy.',
        recommendation: 'Treat the leak as a battlefield reverse. At once seal the circle — tell the full plan to fewer men, and give each a version slightly different from the rest. Set traps for the traitor with false orders you know will reach the enemy, and watch which version returns. Punish the guilty in silence if you can, for public executions teach your methods to the enemy\u2019s spies.',
        reasoning: 'Kautilya\u2019s war machine protects its plans exactly this way: compartmentalisation, controlled deception and the patient testing of agents. In a military context the cost of a leak is measured in lives, so the response must be swift, layered and quiet.',
        interpretation: 'In modern terms: need-to-know classification, deception operations and counter-intelligence investigations within the armed forces.',
        actions: [
          'First, restrict the plan to the smallest circle that must know it.',
          'Second, feed each trusted officer a slightly different version to expose the channel.',
          'Third, run a controlled deception to confirm the leak before any arrest.',
          'Finally, purge the compromised element without revealing your methods.',
        ],
        risk: 'high',
        confidence: 87,
        source: 'Arthashastra, Book 1 · The Use of Secret Service in War',
      },
    ],
    default: {
      id: 'SEC-00',
      situation: 'a military situation not yet clearly defined',
      principle: 'Knowledge precedes action — no prudent commander commits his army on information he cannot verify.',
      recommendation: 'Give me a clearer picture of the enemy, the ground and your own strength, and I will give you sharper counsel. Until then, hold your forces in readiness, protect your supplies, and let no rumour hurry you into battle — for in the science of war, the army that is patient with intelligence is seldom caught unprepared.',
      reasoning: 'Sound military counsel begins with the situation. Kautilya would first send his scouts, weigh the four means of policy, and only then choose between peace and war.',
      interpretation: 'In modern terms: intelligence preparation of the battlefield and option-based planning under uncertainty.',
      actions: [
        'Gather confirmed intelligence on the enemy\u2019s position, strength and intentions.',
        'Place your forces where they can react to any direction of threat.',
        'Protect your supply lines and hold a reserve uncommitted.',
      ],
      risk: 'medium',
      confidence: 70,
      source: 'Arthashastra, Book 1 & Book 10 · The Conduct of War',
    },
  },

  /* ============================ ECONOMICS & FINANCE ============================ */
  economy: {
    persona: 'a master of the royal treasury and commerce, the state\u2019s chief economist',
    domain: 'taxation, the treasury, trade, markets, prices, resource management and economic planning',
    thinking: [
      'Opening the ledgers of the treasury...',
      'Tracing the sources of revenue and cost...',
      'Reading the markets, prices and trade routes...',
      'Weighing fiscal options against the people\u2019s welfare...',
      'Composing the economic counsel...',
    ],
    rules: [
      {
        id: 'ECO-01',
        keywords: ['revenue', 'tax', 'taxation', 'budget', 'deficit', 'debt', 'shortfall', 'treasury', 'income', 'fiscal', 'collection'],
        situation: 'insufficient state revenue',
        principle: 'The treasury (kosa) is one of the seven limbs of the state; Kautilya names seven sources of revenue and insists the king fill his treasury by just means without crushing the producers who feed it.',
        recommendation: 'Do not squeeze the taxpayer until the tree dies. Broaden the base instead of deepening the bite: bring the untaxed into the net, close the leaks in collection, and prune wasteful spending so every coin serves the state. Protect the farmer, the trader and the craftsman, for their prosperity is the deep well from which the treasury is drawn year after year.',
        reasoning: 'The scenario points to a fiscal imbalance. The Arthashastra answers it not with a single harsh levy but with system: diverse sources, honest collectors, audited accounts and protection of the productive base.',
        interpretation: 'In modern terms: fiscal diversification, tax-administration reform, anti-waste audit and growth-friendly fiscal policy.',
        actions: [
          'Begin with a full audit of income and expenditure to find the leaks.',
          'Then widen the base through efficient, fair collection rather than punitive rates.',
          'Cut expenditure that does not serve the state\u2019s core duties.',
          'Finally, protect producers with incentives so the economy grows the tax base.',
        ],
        risk: 'medium',
        confidence: 85,
        source: 'Arthashastra, Book 2 · The Duties of the Treasury',
      },
      {
        id: 'ECO-02',
        keywords: ['trade', 'export', 'import', 'commerce', 'market', 'tariff', 'supply chain', 'merchants', 'shipping', 'customs', 'business'],
        situation: 'declining trade or disrupted markets',
        principle: 'The Superintendent of Commerce protects trade routes, sets fair prices and welcomes foreign merchants, because commerce is a principal channel of the state\u2019s wealth.',
        recommendation: 'Look first at the roads, for trade moves on them. Secure the trade routes against brigands and exactions, ease the duties that choke honest commerce, and punish the hoarder and the monopolist who corner the market. Give the reliable merchant his due — protection, predictable rules and a fair profit — and he will carry the state\u2019s goods and reputation to distant lands.',
        reasoning: 'The Arthashastra treats trade as a branch of statecraft to be actively fostered, not passively taxed. A decline in commerce calls for removing obstructions and restoring confidence, not for raising the tolls.',
        interpretation: 'In modern terms: trade facilitation, supply-chain security, deregulation and anti-monopoly enforcement.',
        actions: [
          'First, secure and repair the routes and corridors on which commerce depends.',
          'Then review customs and duties to remove what chokes honest trade.',
          'Enforce fair-market rules against hoarding and monopolies.',
          'Finally, offer incentives that draw traders and investors back to the market.',
        ],
        risk: 'medium',
        confidence: 81,
        source: 'Arthashastra, Book 2 · The Superintendent of Commerce',
      },
      {
        id: 'ECO-03',
        keywords: ['inflation', 'price', 'prices', 'shortage', 'hoarding', 'profiteer', 'black market', 'scarcity', 'essential goods', 'food prices', 'cost of living'],
        situation: 'rising prices and artificial scarcity',
        principle: 'The state must guarantee the people fair prices; the Arthashastra empowers the king to fix the price of commodities and to punish those who create artificial scarcity.',
        recommendation: 'Break the ring that is squeezing the people. Release the state\u2019s own stocks into the market to restore supply, fix fair ceilings on essentials, and punish the hoarder publicly so fear of the law outruns the greed of the merchant. Watch the market for a season, because prices are a fever — they need a steady hand, not a single shout.',
        reasoning: 'The scenario describes price distress, which the Arthashastra meets with active stewardship: buffer stocks, price discipline and enforcement against artificial scarcity.',
        interpretation: 'In modern terms: strategic reserves, price stabilisation policy and antitrust action against cartels.',
        actions: [
          'Begin by releasing buffer stocks of essentials into the market at fair prices.',
          'Set and enforce price ceilings on goods the people cannot do without.',
          'Prosecute hoarders and profiteers to deter a repeat.',
          'Finally, monitor the market until prices stabilise on their own.',
        ],
        risk: 'medium',
        confidence: 84,
        source: 'Arthashastra, Book 2 · Regulation of Prices & Book 4 on Hoarders',
      },
      {
        id: 'ECO-04',
        keywords: ['corruption', 'embezzle', 'fraud', 'bribe', 'kickback', 'misappropriation', 'theft', 'accounts', 'audit', 'misuse', 'unaccounted'],
        situation: 'fraud or embezzlement in the state\u2019s finances',
        principle: 'Kautilya lists forty ways of embezzlement and commands that every servant of the treasury be audited, for wealth stolen from the state is wealth stolen from the people.',
        recommendation: 'Act like a physician, not an executioner — first find the whole disease, then cure it. Order a full and independent audit of the accounts, compare the records across departments, and follow the trail of every missing coin. When the guilty are known, recover what you can and punish them, but do it quietly and completely, and then fix the system so the same door cannot open twice.',
        reasoning: 'Embezzlement corrodes the treasury from within. The Arthashastra demands rigorous accounting, separated duties and sure punishment, because a treasury that cannot trust its own servants cannot fund the state.',
        interpretation: 'In modern terms: forensic audit, internal controls, whistle-blower protection and anti-corruption enforcement.',
        actions: [
          'Begin with an independent forensic audit of all accounts.',
          'Separate the duties of collecting, recording and holding money.',
          'Prosecute the guilty and publish what was recovered.',
          'Finally, institutionalise annual audits so the corruption cannot return.',
        ],
        risk: 'medium',
        confidence: 86,
        source: 'Arthashastra, Book 2 · The Business of Keeping up Accounts',
      },
      {
        id: 'ECO-05',
        keywords: ['invest', 'growth', 'startup', 'enterprise', 'planning', 'allocate', 'resource', 'development', 'infrastructure', 'capital', 'expand'],
        situation: 'planning for economic growth and investment',
        principle: 'Kautilya\u2019s economics is state-led but wealth-creating: the state builds the foundations — roads, irrigation, mines and granaries — and leaves enterprise to the producer, taking its return through measured duties.',
        recommendation: 'Plan the kingdom\u2019s growth like a careful householder. Put public capital first into the foundations that multiply everything else — roads, irrigation, granaries and mines — and then step back and let the private hand work where it works best. Allocate each coin to the use that returns the most to the people, and publish the plan so all can see the state\u2019s priorities and hold it to them.',
        reasoning: 'The scenario calls for investment strategy. The Arthashastra couples public investment in fundamentals with private energy in trade, and ties every allocation to measured public return.',
        interpretation: 'In modern terms: strategic capital allocation, infrastructure investment and public\u2013private complementarity.',
        actions: [
          'First, rank potential investments by the welfare they create per coin spent.',
          'Then fund the foundational infrastructure — roads, water, granaries, mines.',
          'Keep regulation light where enterprise can prosper on its own.',
          'Finally, publish the plan and report on its returns openly.',
        ],
        risk: 'low',
        confidence: 80,
        source: 'Arthashastra, Book 2 · The Superintendents of Agriculture, Mines and Trade',
      },
    ],
    default: {
      id: 'ECO-00',
      situation: 'an economic question that needs sharper definition',
      principle: 'Measure before you manage — accurate accounting is the root of sound economics.',
      recommendation: 'Tell me which limb of the economy troubles you — the treasury, the market, the farmer or the trader — and I will give you counsel sharpened to that limb. Until then, the surest course is to measure: audit the accounts, map the trade routes and count the people\u2019s need, for an economist who numbers well seldom advises badly.',
      reasoning: 'The Arthashastra begins every economic prescription with measurement of the state\u2019s resources and obligations.',
      interpretation: 'In modern terms: evidence-based economic policy and data-driven administration.',
      actions: [
        'Commission a full fiscal and market assessment.',
        'Map the sources of revenue and the costs of expenditure.',
        'Identify the weakest economic limb and correct it first.',
      ],
      risk: 'low',
      confidence: 72,
      source: 'Arthashastra, Book 2 · The Duties of Government Superintendents',
    },
  },

  /* ============================ LEADERSHIP & GOVERNANCE ============================ */
  governance: {
    persona: 'a minister of the king, an expert in administration and public affairs',
    domain: 'administration, public services, law and order, accountability, citizen welfare and institutional design',
    thinking: [
      'Reviewing the affairs of the administration...',
      'Consulting the duties of the royal ministers...',
      'Assessing law, order and the people\u2019s welfare...',
      'Weighing accountability and institutional design...',
      'Composing the counsel of governance...',
    ],
    rules: [
      {
        id: 'GOV-01',
        keywords: ['law and order', 'crime', 'riot', 'unrest', 'violence', 'chaos', 'insecurity', 'anarchy', 'safety', 'policing', 'civil order'],
        situation: 'a breakdown of public order',
        principle: 'Danda, the rod of authority, is the guardian of order; Kautilya warns that in a kingdom without it the strong devour the weak, like fishes in a pond without a king.',
        recommendation: 'Restore order with a hand that is firm but just. Put visible, accountable guardians on the streets, try offenders swiftly and fairly, and — crucially — listen for the grievance beneath the disorder. Punishment without redress plants the seed of the next riot; enforcement with reform pulls the riot out by the root.',
        reasoning: 'The Arthashastra separates the suppression of disorder from the removal of its causes. The king who only punishes sharpens the anger; the king who also mends the grievance drains it.',
        interpretation: 'In modern terms: community policing, swift and fair justice, and grievance-based social policy.',
        actions: [
          'Deploy accountable guardians at once to protect the people and restore calm.',
          'Fast-track the trial of offenders so justice is seen to move.',
          'Conduct a public grievance audit to find the causes of the disorder.',
          'Finally, reform the policies that feed the unrest and publish the progress.',
        ],
        risk: 'high',
        confidence: 87,
        source: 'Arthashastra, Book 4 · The Removal of Thorns',
      },
      {
        id: 'GOV-02',
        keywords: ['corrupt official', 'bribery', 'misconduct', 'nepotism', 'inefficiency', 'bureaucracy', 'official', 'appointment', 'civil servant', 'misuse of power', 'favouritism'],
        situation: 'corruption or inefficiency among officials',
        principle: 'Ministers are tested before they are trusted; Kautilya examines candidates with subtle trials of loyalty, integrity and skill, and supervises them with spies and audits.',
        recommendation: 'Reform the gate before you blame the guard. Make appointment follow tested merit, not favour, and make performance measurable, audited and rewarded. Rotate officials in sensitive posts so none grows roots deep enough to steal, and let an independent body hear the people\u2019s complaints against their servants.',
        reasoning: 'The scenario is an administrative malaise. The Arthashastra\u2019s remedy is systemic: honest recruitment, constant supervision, measured reward and sure punishment.',
        interpretation: 'In modern terms: merit-based civil service, performance governance, anti-corruption commissions and fixed tenures.',
        actions: [
          'Establish independent oversight of appointments and promotions.',
          'Introduce audited performance targets for every office.',
          'Rotate officials in posts where power is easy to abuse.',
          'Finally, open a complaint channel where citizens can hold officials to account.',
        ],
        risk: 'medium',
        confidence: 83,
        source: 'Arthashastra, Book 1 · The Creation of Ministers',
      },
      {
        id: 'GOV-03',
        keywords: ['welfare', 'citizen', 'complaint', 'public service', 'health', 'education', 'poverty', 'people', 'grievance', 'redress', 'social', 'suffering'],
        situation: 'neglect of citizen welfare',
        principle: 'The king\u2019s happiness rests in the welfare of his subjects; the Arthashastra opens with the doctrine that the state exists for the good of the people.',
        recommendation: 'Treat the people\u2019s need as the state\u2019s first business. Open channels where every citizen can be heard, publish what you will do and when, and deliver the services the people lack — health, education, relief from want — with officers answerable for results. A kingdom that visibly serves its people is a kingdom that is hard to shake.',
        reasoning: 'Neglect of welfare is the seed of every larger disorder. Kautilya makes the care of the people a royal duty and the foundation of the king\u2019s own security.',
        interpretation: 'In modern terms: citizen-centric governance, grievance redressal platforms and accountable service delivery.',
        actions: [
          'Open accessible channels where citizens can register complaints and needs.',
          'Publish service-delivery commitments with named officers and dates.',
          'Prioritise spending on the documented needs of the most vulnerable.',
          'Finally, report outcomes publicly so the people see the state\u2019s response.',
        ],
        risk: 'low',
        confidence: 85,
        source: 'Arthashastra, Book 1 · The Subject of Discipline',
      },
      {
        id: 'GOV-04',
        keywords: ['policy', 'implement', 'reform', 'decision', 'execution', 'rollout', 'stakeholder', 'resistance', 'programme', 'plan'],
        situation: 'implementing a new policy with broad impact',
        principle: 'Kautilya governs through dedicated departments with clear duties, budgets and supervision; every undertaking is planned, funded and held accountable.',
        recommendation: 'Move like an army, not a mob. Plan the policy in stages, assign a named officer to each stage, and fund the plan before you announce it. Communicate plainly with those the policy affects — the people must see the reason or they will see only the burden — and hold the officers to the promised dates, correcting course as the results come in.',
        reasoning: 'The scenario is about execution, where the Arthashastra is exact: structure, ownership, resources and accountability. A good policy badly executed is worse than none.',
        interpretation: 'In modern terms: programme management, phased rollout, stakeholder communication and delivery ownership.',
        actions: [
          'Draw the implementation roadmap with stages and dates.',
          'Appoint a named officer answerable for each stage.',
          'Fund and resource the plan before announcing it.',
          'Finally, communicate the rationale and report progress to the people.',
        ],
        risk: 'low',
        confidence: 78,
        source: 'Arthashastra, Book 2 · The Duties of Government Superintendents',
      },
    ],
    default: {
      id: 'GOV-00',
      situation: 'an administrative question needing clearer definition',
      principle: 'Diagnose before you intervene — the state is a body and its limbs must be examined.',
      recommendation: 'Tell me which limb of the administration is ailing — the courts, the officials, the treasury or the welfare of the people — and I will give you counsel for that limb. Until then, run a diagnostic: measure what each department does, what it costs and what the people receive, for administration that cannot be measured cannot be mended.',
      reasoning: 'Kautilya administers through measured, audited departments; diagnosis precedes every cure.',
      interpretation: 'In modern terms: institutional assessment and targeted reform.',
      actions: [
        'Run a governance diagnostic across all departments.',
        'Measure outputs, costs and citizen satisfaction.',
        'Reform the weakest function first.',
      ],
      risk: 'low',
      confidence: 71,
      source: 'Arthashastra, Book 2 · The Duties of Government Superintendents',
    },
  },

  /* ============================ ESPIONAGE & INTELLIGENCE ============================ */
  intelligence: {
    persona: 'the chief of the secret service, the king\u2019s spymaster',
    domain: 'intelligence gathering, espionage, counter-intelligence, risk analysis, covert operations and information networks',
    thinking: [
      'Opening the intelligence file...',
      'Cross-checking sources and channels...',
      'Assessing risk and counter-measures...',
      'Weighing secrecy, cover and deception...',
      'Composing the intelligence counsel...',
    ],
    rules: [
      {
        id: 'INT-01',
        keywords: ['breach', 'hack', 'data leak', 'cyber attack', 'ransomware', 'compromised', 'network', 'system', 'infiltration', 'intrusion', 'stolen data', 'credentials'],
        situation: 'a breach of the state\u2019s information systems',
        principle: 'The secrets of the state are its nerves; Kautilya shields counsels through discipline, secrecy and tested agents, and answers any compromise with layered counter-measures.',
        recommendation: 'Contain first, explain later. Isolate the broken systems at once so the intruder cannot roam, preserve every trace for the inquiry, and assume he has been inside longer than you know. Sweep for the doors he left open, change every key, and only then rebuild. Keep the inquiry quiet — the enemy must not learn how much you know of his methods.',
        reasoning: 'The scenario is an information intrusion. The spymaster\u2019s first law is containment and the protection of what remains; attribution and vengeance come after the house is secured.',
        interpretation: 'In modern terms: incident response, network isolation, forensic analysis and threat hunting.',
        actions: [
          'Contain and isolate the affected systems immediately.',
          'Preserve forensic evidence and trace the entry path.',
          'Rotate all credentials and close the doors the intruder used.',
          'Finally, rebuild with tighter access control and quiet monitoring.',
        ],
        risk: 'high',
        confidence: 89,
        source: 'Arthashastra, Book 1 · The Conduct of the King\u2019s Counsels',
      },
      {
        id: 'INT-02',
        keywords: ['disinformation', 'propaganda', 'fake news', 'misinformation', 'influence', 'manipulation', 'narrative', 'rumour', 'campaign', 'lies', 'false'],
        situation: 'an adversary waging a campaign of deception',
        principle: 'Rumour is a weapon of statecraft; Kautilya\u2019s services both spread false reports to confuse enemies and guard the people against hostile tales.',
        recommendation: 'Do not shout against the rumour; that only amplifies it. Answer it with verified fact, spoken calmly through trusted voices, and trace the tale to its source so the people see who spins it. Pre-empt the next lie by publishing the truth first, and teach the people to ask for proof, for a public that tests its news cannot be ruled by shadows.',
        reasoning: 'The scenario is a war of perception. The Arthashastra treats information as a field of battle in its own right, won by credible truth and by unmasking the deceiver.',
        interpretation: 'In modern terms: counter-disinformation operations, media literacy and open-source investigation.',
        actions: [
          'Stand up a rapid verification unit that fact-checks every claim.',
          'Amplify verified facts through trusted and familiar voices.',
          'Trace and expose the provenance of the campaign.',
          'Finally, run a public media-literacy drive so the people test what they hear.',
        ],
        risk: 'medium',
        confidence: 85,
        source: 'Arthashastra, Book 1 · Measures Conducive to Peace and Progress',
      },
      {
        id: 'INT-03',
        keywords: ['insider', 'double agent', 'loyalty', 'turn', 'betrayal', 'trusted', 'mole', 'leak', 'treason', 'agent'],
        situation: 'a trusted insider suspected of turning',
        principle: 'Agents are tested, observed and rewarded by performance; Kautilya would trust no man beyond his proven loyalty.',
        recommendation: 'Suspect quietly, verify surely, and act only when certain. Give the trusted man access to false secrets and watch what returns to the enemy; when the channel is proven, use it to feed the adversary lies until you are ready to strike. Do not confront on suspicion — confront on evidence, and then quietly.',
        reasoning: 'The scenario is the oldest problem of the secret service: the trusted one who turned. The craft lies in proof before punishment and in using the turned agent against his masters.',
        interpretation: 'In modern terms: insider-threat programmes, access compartmentalisation and controlled deception.',
        actions: [
          'First, restrict the suspect\u2019s access to what is essential.',
          'Feed him controlled false information and watch the channel.',
          'Confirm the betrayal with independent evidence before any action.',
          'Finally, use the confirmed channel to deceive the adversary.',
        ],
        risk: 'high',
        confidence: 82,
        source: 'Arthashastra, Book 1 · The Creation of the Secret Service',
      },
      {
        id: 'INT-04',
        keywords: ['surveillance', 'monitor', 'intelligence gathering', 'collect', 'intercept', 'track', 'observe', 'watch', 'informants', 'sources', 'reconnaissance', 'assessment'],
        situation: 'the need to gather intelligence on a target',
        principle: 'Kautilya\u2019s intelligence web is many-layered — ascetics, merchants, householders and spies — because only corroborated reports defeat deception.',
        recommendation: 'Build the picture from many eyes, never one. Task separate sources — the open, the human and the technical — to observe the target, and treat a fact as a fact only when two independent witnesses agree. Map the target\u2019s strengths, routines and weaknesses, then route your assessment through a doubter, for the report that survives a doubter is a report you can trust.',
        reasoning: 'The scenario calls for intelligence collection. The Arthashastra gathers from diverse, independent channels precisely so one planted lie cannot steer the state.',
        interpretation: 'In modern terms: all-source intelligence fusion and structured analytic tradecraft.',
        actions: [
          'Task independent collection channels — open, human and technical.',
          'Require two corroborating sources before any fact is accepted.',
          'Route the assessment through a critical review before action.',
          'Finally, update the picture continuously as new reports arrive.',
        ],
        risk: 'low',
        confidence: 79,
        source: 'Arthashastra, Book 1 · The Creation of the Secret Service',
      },
    ],
    default: {
      id: 'INT-00',
      situation: 'an intelligence task requiring sharper definition',
      principle: 'Protect your own secrets before you hunt for others\u2019.',
      recommendation: 'Tell me what you need to know and against whom, and I will design the collection — the sources, the channels and the checks. Until then, protect what you already know, for the first rule of the secret service is that he who guards his own secrets has already won half the campaign.',
      reasoning: 'Good intelligence work begins with a clear question and the protection of existing secrets.',
      interpretation: 'In modern terms: define the intelligence requirement before tasking collection.',
      actions: [
        'Define precisely what information is needed and why.',
        'Inventory and protect your own sensitive information.',
        'Task collection only after the requirement is clear.',
      ],
      risk: 'medium',
      confidence: 73,
      source: 'Arthashastra, Book 1 · The Creation of the Secret Service',
    },
  },

  /* ============================ DIPLOMACY ============================ */
  diplomacy: {
    persona: 'a senior envoy of the court, a master of negotiation and the affairs of states',
    domain: 'negotiation, alliances, treaties, conflict resolution and the balance of power',
    thinking: [
      'Reading the circle of states...',
      'Mapping friends, rivals and neutrals...',
      'Weighing concession and resolve...',
      'Considering mediation and treaties...',
      'Composing the diplomatic counsel...',
    ],
    rules: [
      {
        id: 'DIP-01',
        keywords: ['war threat', 'stronger', 'confrontation', 'hostile', 'ultimatum', 'escalation', 'threaten war', 'pressure', 'aggressive neighbour', 'invasion threat'],
        situation: 'pressure from a stronger neighbour',
        principle: 'The four upayas — conciliation, gifts, dissension and force — are applied in order of cost; Kautilya counsels the weaker king to prefer peace and seek shelter before arms.',
        recommendation: 'Let the stronger neighbour win your words, not your substance. Open sincere negotiation, offer him a dignified path to back down, and quietly build your own position while the talks run — for diplomacy is the shield behind which a weaker state forges its strength. If the adversary is truly set on war, prepare for it, but never let him say you chose it.',
        reasoning: 'The scenario pits a weaker state against a stronger one, and the Arthashastra is explicit: the weaker king buys time, negotiates and seeks shelter, never gambling the realm on a hopeless field.',
        interpretation: 'In modern terms: crisis diplomacy, confidence-building and deterrence through preparedness during negotiation.',
        actions: [
          'Open a sincere negotiation channel and give the adversary a face-saving exit.',
          'Enlist a neutral mediator or friendly power to balance the table.',
          'Quietly strengthen your position while talks continue.',
          'Finally, keep a written record so your good faith is clear.',
        ],
        risk: 'high',
        confidence: 86,
        source: 'Arthashastra, Book 7 & Book 12 · The Weaker King',
      },
      {
        id: 'DIP-02',
        keywords: ['influence', 'expand', 'sphere', 'soft power', 'standing', 'prestige', 'region', 'hegemony', 'outreach', 'charm', 'attract'],
        situation: 'peaceful expansion of influence',
        principle: 'The Mandala teaches that states are drawn into orbit by benefit and trust; wealth, trade and goodwill bind neighbours more durably than conquest.',
        recommendation: 'Make alignment with you the natural choice of your neighbours. Trade with them, share your knowledge and crafts, treat their envoys with honour and their grievances with speed, and let your generosity be known in their marketplaces. Influence won by benefit is a fort the enemy cannot besiege; influence won by force must be garrisoned forever.',
        reasoning: 'The scenario seeks influence without war, and the Arthashastra\u2019s answer is economic and cultural magnetism — the state that is useful and trustworthy is the state that others choose to follow.',
        interpretation: 'In modern terms: economic statecraft, cultural diplomacy and institutional partnership.',
        actions: [
          'Open new channels of trade and investment with the target states.',
          'Expand cultural and educational exchange so your ideas travel with your goods.',
          'Resolve disputes with smaller neighbours generously and publicly.',
          'Finally, institutionalise regular summits and treaties of friendship.',
        ],
        risk: 'low',
        confidence: 81,
        source: 'Arthashastra, Book 7 · The Nature of the Circle of States',
      },
      {
        id: 'DIP-03',
        keywords: ['rival', 'bloc', 'contain', 'balance', 'opposing', 'alliance network', 'coalition against', 'surround', 'encirclement', 'counter'],
        situation: 'a hostile coalition gathering around the state',
        principle: 'In the Mandala every circle has its counter-circle; the wise statesman dissolves hostile blocs by drawing off their members and forming his own.',
        recommendation: 'Study the ring around you and find its weak link. Court the wavering and neutral states of the rival bloc with offers that serve their own interest, and build a counter-alliance of your own so no single adversary can encircle you. Keep your own friendships warm, for a bloc that is held together only by fear can be unstitched by a better offer.',
        reasoning: 'Encircling blocs are broken in the Arthashastra by diplomacy, not by arms — by turning the circle\u2019s own geometry against it.',
        interpretation: 'In modern terms: balance-of-power diplomacy, neutral outreach and counter-coalition building.',
        actions: [
          'Map the opposing bloc and identify its weakest and most wavering members.',
          'Make each of them a credible offer that serves their own interest.',
          'Assemble a compensating alliance of your own.',
          'Finally, keep communications open so the bloc never hardens into certainty.',
        ],
        risk: 'medium',
        confidence: 83,
        source: 'Arthashastra, Book 7 · The Circle of States',
      },
      {
        id: 'DIP-04',
        keywords: ['negotiat', 'dispute', 'treaty', 'talks', 'sanction', 'embargo', 'tariff', 'trade war', 'mediation', 'agreement', 'diplomatic crisis', 'grievance with'],
        situation: 'a diplomatic or trade dispute needing resolution',
        principle: 'The envoy secures the state\u2019s interest with patience and clarity, knowing exactly what may be yielded and what may not.',
        recommendation: 'Enter the talks knowing your ground exactly — what you must keep, what you may give, and what you would be foolish to refuse. Give way gracefully on the small things so that you may hold firmly on the great, and keep a second channel open behind the formal one, for a back door often saves a front door. Seal every agreement in writing, and honour what you sign.',
        reasoning: 'The scenario is a dispute in need of resolution. Kautilya\u2019s envoy reads intent, preserves options and calibrates concession, treating negotiation as strategy conducted by other means.',
        interpretation: 'In modern terms: interest-based negotiation, red-line management and multi-track diplomacy.',
        actions: [
          'Define your core interests and your concession budget before the talks.',
          'Offer face-saving concessions on low-value points to build goodwill.',
          'Maintain a back-channel for the hardest issues.',
          'Finally, reduce every agreement to writing and honour it.',
        ],
        risk: 'medium',
        confidence: 79,
        source: 'Arthashastra, Book 1 · The Duties of Envoys',
      },
    ],
    default: {
      id: 'DIP-00',
      situation: 'a diplomatic situation needing clearer definition',
      principle: 'Know the circle before you move in it — position determines policy.',
      recommendation: 'Tell me who the parties are, what each wants and what each fears, and I will read you the geometry of the table. Until then, hold your friendships warm and your enmities cool, and never close a door you may need to walk back through — for in the affairs of states, today\u2019s rival is often tomorrow\u2019s ally.',
      reasoning: 'Diplomacy begins with mapping the circle of states and one\u2019s place within it.',
      interpretation: 'In modern terms: stakeholder mapping and power analysis before engagement.',
      actions: [
        'Map the parties, their interests and their fears.',
        'Identify friends, enemies and neutrals among them.',
        'Choose your instruments only after the map is drawn.',
      ],
      risk: 'medium',
      confidence: 72,
      source: 'Arthashastra, Book 7 · The Circle of States',
    },
  },

  /* ============================ CRISIS MANAGEMENT ============================ */
  crisis: {
    persona: 'a master of calamity, the officer charged with guarding the people in disaster',
    domain: 'disaster response, famine and food security, public health and the restoration of order',
    thinking: [
      'Assessing the scale of the calamity...',
      'Mobilising relief and command...',
      'Securing supply lines and the people\u2019s needs...',
      'Weighing speed against order...',
      'Composing the crisis counsel...',
    ],
    rules: [
      {
        id: 'CRI-01',
        keywords: ['disaster', 'flood', 'earthquake', 'cyclone', 'storm', 'calamity', 'landslide', 'tsunami', 'natural', 'relief', 'rescue', 'devastation'],
        situation: 'a natural disaster striking the people',
        principle: 'In calamity the king is a father to his people; Kautilya commands that the state rescue the distressed as a father rescues his children.',
        recommendation: 'Speed is the first virtue now. Stand up a single command that speaks for the whole state, rush rescue and shelter to the worst places, protect the roads and granaries so aid can move, and let the people hear one calm, truthful voice. Act first, argue afterwards — every hour you hesitate costs lives and trust, and trust is the treasury you must rebuild after the water falls.',
        reasoning: 'The scenario is a sudden calamity. The Arthashastra treats relief as a royal duty of the highest order, executed by a unified state, with the welfare of the people as the measure of success.',
        interpretation: 'In modern terms: unified incident command, emergency response and priority to human life.',
        actions: [
          'Activate a single emergency command that all agencies answer to.',
          'Deploy rescue, shelter, food and medicine to the worst-hit areas first.',
          'Secure roads, bridges and granaries so relief can flow.',
          'Finally, issue one calm, truthful stream of guidance to the people.',
        ],
        risk: 'high',
        confidence: 90,
        source: 'Arthashastra, Book 4 · The Protection of the People in Calamity',
      },
      {
        id: 'CRI-02',
        keywords: ['famine', 'starvation', 'hunger', 'food', 'harvest', 'drought', 'grain', 'crop failure', 'supply', 'ration', 'nutrition'],
        situation: 'famine threatening food security',
        principle: 'The state maintains granaries precisely for scarcity; Kautilya prescribes opening the reserves, importing grain and protecting producers in times of famine.',
        recommendation: 'Open the granaries now, for a reserve that is never used is a granary that fails its purpose. Distribute grain through controlled channels so it reaches the hungry and not the hoarder, arrange imports without delay, and protect the farmer for the next season — for the famine ends when the next harvest is sown and safe.',
        reasoning: 'The scenario is food scarcity. The Arthashastra\u2019s answer is strategic reserves, disciplined distribution and the protection of production, treating the granary as a pillar of sovereignty.',
        interpretation: 'In modern terms: strategic food reserves, emergency imports and agricultural support.',
        actions: [
          'Release strategic grain reserves through controlled, targeted distribution.',
          'Secure emergency imports immediately to bridge the gap.',
          'Prevent hoarding and price-gouging at the distribution points.',
          'Finally, guarantee the next harvest with seeds, support and fair procurement prices.',
        ],
        risk: 'high',
        confidence: 87,
        source: 'Arthashastra, Book 2 · The Superintendent of Agriculture & Book 4 on Famine',
      },
      {
        id: 'CRI-03',
        keywords: ['pandemic', 'epidemic', 'outbreak', 'disease', 'sick', 'infection', 'health', 'virus', 'contagion', 'hospital', 'medical', 'quarantine'],
        situation: 'a disease outbreak endangering public health',
        principle: 'The strength of the kingdom rests on the health of its people; Kautilya provides for physicians to treat the ailing and for the state to guard public health.',
        recommendation: 'Isolate the fire while it is small. Quarantine the sick with humanity, surge physicians and medicines to where the disease is hottest, and keep the people informed with honest, simple guidance — for panic spreads faster than any contagion. Protect the healers, protect the markets, and measure the epidemic honestly, because a state that hides its numbers cannot fight its disease.',
        reasoning: 'The scenario is an outbreak. The Arthashastra couples medical provision with public order, understanding that a sick and fearful people cannot sustain the state.',
        interpretation: 'In modern terms: epidemic containment, health-system surge and trusted public-risk communication.',
        actions: [
          'Implement humane quarantine and isolation measures early.',
          'Surge medical staff and supplies to the hardest-hit areas.',
          'Run honest, simple public-health communication to prevent panic.',
          'Finally, protect essential markets and livelihoods through the disruption.',
        ],
        risk: 'high',
        confidence: 86,
        source: 'Arthashastra, Book 2 · The Superintendent of Medicine',
      },
      {
        id: 'CRI-04',
        keywords: ['unrest', 'protest', 'riot', 'insurgency', 'strike', 'agitation', 'demonstration', 'anger', 'mob', 'revolt', 'disorder'],
        situation: 'civil unrest threatening public order',
        principle: 'Order and redress must go together; Kautilya suppresses rebellion but removes its causes, for the state that punishes without justice fertilises the next revolt.',
        recommendation: 'Calm the crowd before you command it. Use measured and accountable force only where lives are at risk, open genuine dialogue with those who speak for the discontented, and move visibly on the grievance that feeds the anger. Douse the fire by addressing what burns the people, not by throwing more fuel on the demonstration.',
        reasoning: 'The scenario is social unrest. The Arthashastra distinguishes suppressing the symptom from curing the cause, and counsels that the second is the surer cure.',
        interpretation: 'In modern terms: de-escalation, dialogue and grievance-based reform.',
        actions: [
          'Deploy measured, accountable enforcement to protect lives without provocation.',
          'Open dialogue with legitimate leaders of the discontent.',
          'Announce a timeline for addressing the underlying grievances.',
          'Finally, report progress publicly so trust can be rebuilt.',
        ],
        risk: 'high',
        confidence: 82,
        source: 'Arthashastra, Book 4 · The Removal of Thorns & Book 11 on Corporations',
      },
    ],
    default: {
      id: 'CRI-00',
      situation: 'a crisis whose scope is still unclear',
      principle: 'Clear sight before swift action — an ordered response begins with truth.',
      recommendation: 'Stand up one command, measure the scale of the calamity, and stage your response so it can grow with the need. In every crisis the first duty is to see clearly, the second to move, and the third to speak truthfully to the people — for their trust is the state\u2019s deepest reserve.',
      reasoning: 'Calamity rewards speed but punishes chaos; the Arthashastra would first gather trustworthy information, then act decisively.',
      interpretation: 'In modern terms: incident command and scalable emergency frameworks.',
      actions: [
        'Activate a unified command to coordinate all agencies.',
        'Assess the damage and the people\u2019s need quickly and honestly.',
        'Pre-position resources for a response that can scale.',
      ],
      risk: 'medium',
      confidence: 75,
      source: 'Arthashastra, Book 4 · The Protection of the People',
    },
  },

  /* ============================ ETHICS & LEADERSHIP ============================ */
  ethics: {
    persona: 'the acharya of the court, a counsellor of kings on judgement and right conduct',
    domain: 'ethical leadership, decision analysis, accountability, dharma and the long view in leadership',
    thinking: [
      'Reflecting on the duties of the king...',
      'Weighing the decision on the scale of dharma...',
      'Testing consequence, integrity and the long view...',
      'Considering all whom the decision touches...',
      'Composing the counsel of wisdom...',
    ],
    rules: [
      {
        id: 'ETH-01',
        keywords: ['ethical', 'moral', 'dilemma', 'integrity', 'dharma', 'conscience', 'right thing', 'wrong', 'principle', 'values', 'conflict of interest'],
        situation: 'an ethical dilemma in leadership',
        principle: 'Artha pursued within dharma — wealth and power are legitimate only when they serve the governed; Kautilya ties the king\u2019s good to the good of the subjects.',
        recommendation: 'Choose the course you can defend in the light of day to the people you serve. Ask three questions: who is harmed, who benefits, and would I accept this if it were done to me? Prosperity won by unjust means is not prosperity at all, and power that outruns principle becomes its own enemy. Decide openly, explain your reasoning, and let your decision be one your successors can honour.',
        reasoning: 'The scenario asks how a leader should choose when duty and advantage diverge. The Arthashastra\u2019s answer is that the king\u2019s true interest IS the welfare of the subjects — the ethical course is the strategic course, rightly measured.',
        interpretation: 'In modern terms: values-based leadership, stakeholder welfare and transparent decision-making.',
        actions: [
          'Frame the decision by its effect on everyone it touches.',
          'Test the leading options against long-run welfare, not short-run gain.',
          'State your reasoning openly so others can audit it.',
          'Finally, choose the course that would survive the light of day.',
        ],
        risk: 'low',
        confidence: 84,
        source: 'Arthashastra, Book 1 · The Subject of Discipline',
      },
      {
        id: 'ETH-02',
        keywords: ['accountability', 'responsible', 'ownership', 'blame', 'failure', 'culpability', 'answer for', 'mistake', 'apology', 'trust broken'],
        situation: 'a leader answering for failure',
        principle: 'The king is the soul of the state; leadership is inseparable from responsibility for the state\u2019s conduct and its people.',
        recommendation: 'Own the failure plainly, without hedging or deflection, and set out at once what you will do to set it right, by when, and under whose name. Apologies that are not followed by correction are merely words; correction that is reported openly rebuilds what the failure broke. A leader who answers for misfortune is trusted in prosperity.',
        reasoning: 'The scenario is a test of responsibility. The Arthashastra treats the king\u2019s accountability to the state as the very definition of leadership.',
        interpretation: 'In modern terms: accountable leadership, transparent review and public trust repair.',
        actions: [
          'Issue a direct, factual acknowledgment without excuses.',
          'Publish a corrective plan with named owners and dates.',
          'Report progress on a set cadence until the matter is closed.',
          'Finally, draw the lesson into policy so the failure cannot repeat.',
        ],
        risk: 'medium',
        confidence: 80,
        source: 'Arthashastra, Book 1 · The Conduct of the King',
      },
      {
        id: 'ETH-03',
        keywords: ['resource', 'allocate', 'prioritise', 'spending', 'distribution', 'fair', 'equity', 'funding', 'budget for', 'share', 'divide', 'scarce'],
        situation: 'allocating scarce resources fairly',
        principle: 'The state\u2019s resources belong to the people\u2019s security and well-being; Kautilya ranks the limbs of the state by necessity and would yield the king\u2019s own comfort to the people\u2019s need.',
        recommendation: 'Allocate like a steward, not a master. Score every claim by the welfare it creates for each unit of resource, secure the needs of the most vulnerable before the wants of the comfortable, and publish the reasoning so the allocation can be seen to be just. Fairness is not arithmetic alone — it is arithmetic explained, so that those who receive less understand why.',
        reasoning: 'The scenario asks how to divide scarce resources. The Arthashastra ranks claims by necessity and welfare, and treats transparent reasoning as part of just allocation.',
        interpretation: 'In modern terms: needs-based budgeting, welfare-weighted allocation and transparent trade-off documentation.',
        actions: [
          'Score each option by welfare created per unit of resource.',
          'Secure the essentials of the most vulnerable first.',
          'Publish the allocation and its reasoning openly.',
          'Finally, review the allocation against results and adjust.',
        ],
        risk: 'low',
        confidence: 81,
        source: 'Arthashastra, Book 1 & Book 2 · The Priorities of the State',
      },
      {
        id: 'ETH-04',
        keywords: ['short term', 'long term', 'quick win', 'sacrifice future', 'sustainable', 'legacy', 'enduring', 'future', 'immediate gain', 'expedient', 'stability'],
        situation: 'a choice between quick gain and lasting strength',
        principle: 'The wise king sacrifices present pleasure for future strength; Kautilya warns that the king who feeds his appetites starves his kingdom.',
        recommendation: 'Measure the easy gain against its cost in trust and strength. If the quick profit would bend the rules, empty the treasury, or break a promise, then refuse it and say why — a state that is trusted and sound can afford to be patient. Invest instead in the foundations that endure: institutions, honesty and the loyalty of the people. These are the only treasures that grow while they are kept.',
        reasoning: 'The scenario is the eternal tension of the expedient versus the enduring. The Arthashastra is unambiguous: enduring power is built on discipline, and short-term gain bought with future strength is a loss, not a gain.',
        interpretation: 'In modern terms: sustainable strategy, institutional investment and inter-generational stewardship.',
        actions: [
          'Model the long-run consequence of both the quick and the steady course.',
          'Refuse what would spend trust, law or future strength.',
          'Invest in institutions and integrity that compound over time.',
          'Finally, state the trade-off openly so stakeholders understand the choice.',
        ],
        risk: 'low',
        confidence: 85,
        source: 'Arthashastra, Book 1 · Measures Conducive to Peace and Progress',
      },
    ],
    default: {
      id: 'ETH-00',
      situation: 'a leadership question needing clearer definition',
      principle: 'The standard of dharma — right action serves the whole and can bear the light.',
      recommendation: 'Set the question before me as a duty: whom does it serve, what does it preserve, and can it be defended in the light of day? A leader who answers those three questions has already found the better half of the answer. Tell me the decision you face, and I will weigh it on the scale of dharma.',
      reasoning: 'Ethical counsel begins by framing the decision as a question of duty and welfare.',
      interpretation: 'In modern terms: ethical frameworks and stakeholder-impact reflection.',
      actions: [
        'Identify everyone the decision affects.',
        'Test each option against long-run welfare and integrity.',
        'Document the reasoning for public scrutiny.',
      ],
      risk: 'low',
      confidence: 76,
      source: 'Arthashastra, Book 1 · The Subject of Discipline',
    },
  },
};

/* --------------------------------------------------------------------------
   12. RULE ENGINE
   Word-boundary keyword matching, strict module scoping, forward-chaining
   style inference. The engine NEVER answers from a module other than the one
   the user has selected or that is confidently inferred.
   -------------------------------------------------------------------------- */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* Return the keywords of a rule that appear as whole words in the scenario */
function matchesKeywords(text, keywords) {
  const hits = [];
  keywords.forEach((kw) => {
    const re = new RegExp(`\\b${escapeRegex(kw.toLowerCase())}\\b`, 'i');
    if (re.test(text)) hits.push(kw);
  });
  return hits;
}

/* Infer the most likely module from the scenario alone; null if nothing matches */
function inferModule(text) {
  let best = null;
  let bestScore = 0;
  Object.entries(KNOWLEDGE_BASE).forEach(([moduleId, base]) => {
    let score = 0;
    base.rules.forEach((rule) => { score += matchesKeywords(text, rule.keywords).length; });
    if (score > bestScore) { bestScore = score; best = moduleId; }
  });
  return { moduleId: best, score: bestScore };
}

/* Fire the best rule strictly inside the chosen module */
function fireRule(moduleId, text) {
  const base = KNOWLEDGE_BASE[moduleId];
  let bestRule = null;
  let bestScore = 0;
  let bestKeywords = [];

  base.rules.forEach((rule) => {
    const hits = matchesKeywords(text, rule.keywords);
    if (hits.length > bestScore) { bestScore = hits.length; bestRule = rule; bestKeywords = hits; }
  });

  const rule = bestRule || base.default;

  return {
    moduleId,
    moduleName: MODULES[moduleId].name,
    moduleShort: MODULES[moduleId].short,
    rule,
    matched: !!bestRule,
    matchedKeywords: bestKeywords,
    trace: `RULE ${rule.id} FIRED → IF ${rule.situation} THEN apply the corresponding principle of the Arthashastra.`,
  };
}

/* --------------------------------------------------------------------------
   13. AI ANALYSIS FLOW — loading popup, thinking phase, report render
   -------------------------------------------------------------------------- */
const GENERIC_THINK_LINES = [
  'Parsing your scenario...',
  'Consulting the principles of Arthashastra...',
  'Matching IF-THEN rules against the knowledge base...',
  'Weighing risk, confidence and dharma...',
  'Composing the strategic recommendation...',
];

function getThinkingLines(moduleId) {
  return (KNOWLEDGE_BASE[moduleId] && KNOWLEDGE_BASE[moduleId].thinking) || GENERIC_THINK_LINES;
}

function initAnalysis() {
  $('#scenario-form').addEventListener('submit', (e) => {
    e.preventDefault();
    runAnalysis();
  });
}

function runAnalysis() {
  const text = $('#scenario-input').value.trim();
  if (text.length < 4) {
    showToast('warning', 'Scenario Required', 'Please describe your question in at least a few words.');
    $('#scenario-input').focus();
    return;
  }

  const scenario = text.toLowerCase();

  /* Resolve module: explicit selection first, else confident inference */
  let moduleId = selectedModule;
  if (!moduleId) {
    const inferred = inferModule(scenario);
    if (inferred.moduleId) {
      moduleId = inferred.moduleId;
      selectModule(moduleId);
    } else {
      showToast('warning', 'Choose a Module', 'Please select a module from the Seven Pillars, or describe a scenario that clearly belongs to one strategic domain.');
      $('#workflow-active-module-text').textContent = 'No domain could be inferred — please choose a module from the Seven Pillars.';
      return;
    }
  }

  const result = fireRule(moduleId, scenario);

  /* Save to decision history */
  const history = storage.get(KEYS.history, []);
  history.unshift({
    at: Date.now(),
    module: result.moduleName,
    rule: result.rule.id,
    scenario: text.slice(0, 80),
    confidence: result.rule.confidence,
  });
  storage.set(KEYS.history, history.slice(0, 20));

  /* Loading popup with module-aware subtitle */
  $('#loading-sub').textContent = `Consulting the ${result.moduleShort} knowledge base — ${KNOWLEDGE_BASE[moduleId].domain}`;
  openModal($('#modal-loading'));
  animateValue(100, 1400, (v) => { $('#loading-bar').style.width = `${v}%`; });

  setTimeout(() => {
    closeModal($('#modal-loading'));
    startThinkingPhase(result, text);
  }, 1500);
}

function startThinkingPhase(result, scenarioText) {
  /* Prepare modal */
  const modal = $('#modal-ai-result');
  $('#ai-result-module').textContent = `${result.moduleShort} · ${result.moduleName}`;
  $('#ai-result-title').textContent = 'Strategic Recommendation';
  $('#ai-result-phase').hidden = false;
  $('#ai-result-report').hidden = true;
  openModal(modal);

  /* Typing + progress sequence with module-flavored thinking lines */
  const lines = getThinkingLines(result.moduleId);
  const lineEl = $('#ai-result-thinking-line');
  const barEl = $('#ai-result-progress-bar');
  let lineIndex = 0;

  const typeLine = () => {
    const full = lines[lineIndex];
    const chars = full.split('');
    let i = 0;
    lineEl.textContent = '';
    const tick = setInterval(() => {
      lineEl.textContent += chars[i++];
      if (i >= chars.length) {
        clearInterval(tick);
        lineIndex += 1;
        const frac = clamp(lineIndex / lines.length, 0, 1);
        barEl.style.width = `${Math.round(frac * 100)}%`;
        if (lineIndex < lines.length) setTimeout(typeLine, 220);
        else setTimeout(() => renderReport(result, scenarioText), 380);
      }
    }, 15);
  };

  animateValue(100, lines.length * 900, (v) => { barEl.style.width = `${v}%`; });
  typeLine();
}

function renderReport(result, scenarioText) {
  const rule = result.rule;
  const base = KNOWLEDGE_BASE[result.moduleId];

  const shortScenario = scenarioText.length > 150 ? `${scenarioText.slice(0, 150)}…` : scenarioText;

  /* Natural, conversational opening that acknowledges the user's own scenario */
  const opening =
    `As ${base.persona}, I have studied your situation — “${escapeHtml(shortScenario)}”. ` +
    `I will answer strictly within the domain of ${base.domain}, exactly as an expert of this module would advise.`;

  $('#ai-result-recommendation').innerHTML =
    `<p>${opening}</p><p>${rule.recommendation}</p>`;
  $('#ai-result-reasoning').textContent = rule.reasoning;
  $('#ai-result-principle').textContent = rule.principle;
  $('#ai-result-interpretation').textContent = rule.interpretation;

  /* Suggested actions, written as flowing expert prose rather than bullets */
  const actions = $('#ai-result-actions');
  actions.textContent = 'To put this counsel into practice, I suggest you proceed step by step: ' +
    rule.actions.join(' ');

  /* Risk badge */
  const risk = $('#ai-result-risk');
  const riskMap = { low: ['Low', 'low'], medium: ['Medium', 'medium'], high: ['High', 'high'] };
  const [riskLabel, riskClass] = riskMap[rule.risk] || riskMap.medium;
  risk.textContent = riskLabel;
  risk.className = `badge badge--${riskClass}`;

  /* Trace */
  const trace = $('#ai-result-trace-text');
  trace.innerHTML = '';
  const lines = [
    { t: 'SCENARIO', v: scenarioText },
    { t: 'MODULE', v: `${result.moduleShort} — ${result.moduleName}` },
    { t: 'MATCH', v: result.matched
      ? `Rule fired on the keywords: ${result.matchedKeywords.join(', ')}`
      : 'No exact keyword matched — the module\u2019s own expert default was applied.' },
    { t: 'RULE', v: result.trace },
    { t: 'SOURCE', v: rule.source },
  ];
  lines.forEach(({ t, v }) => {
    const row = document.createElement('div');
    row.innerHTML = `<span style="color:var(--gold-soft);font-weight:700">${t}:</span> ${escapeHtml(v)}`;
    trace.appendChild(row);
  });

  /* Remember current rule for the explanation window */
  $('#modal-rule').dataset.ruleId = rule.id;

  /* Reveal report */
  $('#ai-result-phase').hidden = true;
  $('#ai-result-report').hidden = false;

  /* Animate gauges */
  requestAnimationFrame(() => {
    setTimeout(() => {
      $('#ai-result-confidence').textContent = `${rule.confidence}%`;
      $('#ai-result-confidence-bar').style.width = `${rule.confidence}%`;
      const riskPct = rule.risk === 'low' ? 25 : rule.risk === 'medium' ? 55 : 85;
      $('#ai-result-risk-bar').style.width = `${riskPct}%`;
    }, 120);
  });

  showToast('success', 'Analysis Complete', `${result.moduleShort} counsel ready · confidence ${rule.confidence}% · risk ${riskLabel}.`);
}
/* Rule explanation window */
function initRuleWindow() {
  $('#ai-result-rule-btn').addEventListener('click', () => {
    const modal = $('#modal-rule');
    const ruleId = modal.dataset.ruleId;
    let rule = null;
    Object.values(KNOWLEDGE_BASE).forEach((base) => {
      const hit = base.rules.find((r) => r.id === ruleId) || (ruleId === base.default.id ? base.default : null);
      if (hit) rule = hit;
    });
    if (!rule) return;

    $('#rule-window-rule').innerHTML = `
      <div style="margin-bottom:14px"><strong>${rule.id}</strong> &nbsp;<em style="font-size:0.85rem;color:var(--gold-soft)">${escapeHtml(rule.source)}</em></div>
      <p><strong>IF</strong> ${escapeHtml(rule.situation)}</p>
      <p><strong>THEN</strong> apply the corresponding principle of the Arthashastra — ${escapeHtml(rule.principle)}</p>
      <em>Matched with confidence ${rule.confidence}% · risk level: ${rule.risk.toUpperCase()}</em>
    `;
    closeModal($('#modal-ai-result'));
    openModal(modal);
  });
}

/* PDF export — renders a print-friendly report and opens the print dialog */
function initPdfExport() {
  $('#ai-result-export-pdf').addEventListener('click', () => {
    const ruleId = $('#modal-rule').dataset.ruleId || '';
    const recommendation = $('#ai-result-recommendation').textContent;
    const reasoning = $('#ai-result-reasoning').textContent;
    const principle = $('#ai-result-principle').textContent;
    const interpretation = $('#ai-result-interpretation').textContent;
    const confidence = $('#ai-result-confidence').textContent;
    const risk = $('#ai-result-risk').textContent;
    const identity = storage.get(KEYS.identity, { name: 'Guest', role: 'Strategist' });

    const actions = $('#ai-result-actions').textContent;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="print-report" id="print-report">
        <div class="print-report__head">
          <div>
            <h1>ArthaNiti AI — Strategic Advisory Report</h1>
            <p class="print-report__rule">Rule ${escapeHtml(ruleId)}</p>
          </div>
          <img src="assets/icons/logo.svg" alt="ArthaNiti AI" width="64">
        </div>
        <p class="print-report__meta">
          Prepared for: ${escapeHtml(identity.name)} (${escapeHtml(identity.role)})<br>
          Generated: ${new Date().toLocaleString()} · Confidence: ${confidence} · Risk: ${risk}
        </p>
        <h2>Strategic Recommendation</h2>
        <p>${escapeHtml(recommendation)}</p>
        <h2>Reasoning</h2>
        <p>${escapeHtml(reasoning)}</p>
        <h2>Applied Arthashastra Principle</h2>
        <p>${escapeHtml(principle)}</p>
        <h2>Modern Interpretation</h2>
        <p>${escapeHtml(interpretation)}</p>
        <h2>Suggested Actions</h2>
        <pre>${escapeHtml(actions)}</pre>
        <p class="print-report__note">Educational demonstration of the Indian Knowledge System. Not professional advice.</p>
      </div>
    `);

    window.print();

    setTimeout(() => { $('#print-report')?.remove(); }, 600);
    showToast('success', 'Report Prepared', 'Use your browser\u2019s Print dialog to save as PDF.');
  });
}

/* --------------------------------------------------------------------------
   14. STATISTICS COUNTERS
   -------------------------------------------------------------------------- */
function initCounters() {
  const counters = $$('.stat__counter');
  if (!counters.length) return;
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.target);
      animateValue(target, 1800, (v) => { el.textContent = v; });
      observer.unobserve(el);
    });
  }, { threshold: 0.4 });

  counters.forEach((el) => observer.observe(el));
}

/* --------------------------------------------------------------------------
   15. MISC — year, generic helpers, quick demo button
   -------------------------------------------------------------------------- */
function initMisc() {
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
}

/* Expose a helper for evaluators: open the dashboard/history placeholders */
function initDemoButtons() {
  /* Footer social links just open a toast */
  $$('.footer__social-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('info', 'Social Channels', 'Sample profiles would link here in a production build.');
    });
  });

  /* Placeholder modals opened via generic triggers */
  const placeholderMap = {
    'modal-dashboard': 'Strategic Dashboard',
    'modal-reports': 'Strategic Reports',
    'modal-charts': 'Decision Charts',
    'modal-history': 'Decision History',
  };
}

/* ==========================================================================
   16. INITIALISATION
   ========================================================================== */
function bootArthaNiti() {
  const settings = getSettings();
  if (settings.reduceMotion) document.body.classList.add('reduce-motion');

  initLoader();
  initParticles();
  initNavbar();
  initSmoothScroll();
  initTheme();
  initSettings();
  initModals();
  initRoyalEntry();
  initModules();
  initAnalysis();
  initRuleWindow();
  initPdfExport();
  initCounters();
  initMisc();
  initDemoButtons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootArthaNiti);
} else {
  bootArthaNiti();
}

/* Also reveal elements if the loader finished before observer setup */
window.addEventListener('load', () => {
  if (revealObserver) return;
  if (!document.body.classList.contains('is-loaded')) return;
  initRevealObserver();
});
