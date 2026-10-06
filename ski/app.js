'use strict';

/* ================= CONFIGURATION =================
 * FORM_ENDPOINT : service FormSubmit (gratuit, sans compte) qui transfère chaque demande par e-mail à CONTACT_EMAIL.
 *   La toute première demande déclenche un e-mail « Activate Form » à valider une seule fois.
 *   Ensuite, FormSubmit fournit un alias aléatoire (ex. https://formsubmit.co/ajax/abc123...) :
 *   le coller ici à la place de l'adresse permet de ne plus l'exposer dans le code.
 *   Vide -> le formulaire ouvre la messagerie du visiteur avec un e-mail pré-rempli (secours).
 */
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/weekly.orga@gmail.com';
const CONTACT_EMAIL = 'weekly.orga@gmail.com';

document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Menu mobile ---------- */
  const menuBtn = document.getElementById('menu-btn');
  const menu = document.getElementById('mobile-menu');
  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    document.addEventListener('click', e => {
      if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
    });
  }

  /* ---------- Barre compacte au scroll ---------- */
  const topbar = document.getElementById('topbar');
  const hero = document.getElementById('top');
  if (topbar && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      const show = !e.isIntersecting;
      topbar.classList.toggle('show', show);
      topbar.setAttribute('aria-hidden', String(!show));
      topbar.querySelectorAll('a').forEach(a => { a.tabIndex = show ? 0 : -1; });
    }, { rootMargin: '-120px 0px 0px 0px' }).observe(hero);
  }

  /* ---------- Apparition au scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in-view'));
  }

  /* ---------- Formulaire de devis ---------- */
  const form = document.getElementById('devis-form');
  if (!form) return;
  const status = document.getElementById('status');
  const btn = form.querySelector('button[type="submit"]');
  const btnHTML = btn.innerHTML;
  const startedAt = Date.now();
  const DRAFT_KEY = 'weekly-ski-devis-draft';
  let lastSent = 0;

  const rules = {
    bde: v => v.trim().length >= 2 || 'Indique le nom de ton BDE.',
    ecole: v => v.trim().length >= 2 || 'Indique ton école.',
    nom: v => v.trim().length >= 2 || 'Indique ton nom.',
    email: v => /^[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}$/i.test(v.trim()) || 'Adresse email invalide (ex. ton.email@exemple.fr).',
    telephone: v => /^\+?[0-9 .\-()]{8,20}$/.test(v.trim()) || 'Numéro invalide (ex. 06 12 34 56 78).',
    etudiants: v => (/^\d+$/.test(v) && +v >= 5 && +v <= 500) || 'Indique un nombre entre 5 et 500.',
    dates: v => {
      if (!v) return 'Choisis au moins un weekend, ou « Autre ».';
      if (v.endsWith('Autre')) return 'Précise tes dates ou disponibilités dans « Autre ».';
      return true;
    },
    transport: v => v !== '' || 'Dis-nous si tu as besoin du bus.'
  };

  const fieldOf = input => input.closest('.field');
  function setError(input, msg) {
    const f = fieldOf(input);
    if (f) {
      f.classList.toggle('invalid', !!msg);
      const slot = f.querySelector('.err');
      if (slot) slot.textContent = msg || '';
    }
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function check(input) {
    const rule = rules[input.name];
    if (!rule) return true;
    const r = rule(input.value);
    setError(input, r === true ? '' : r);
    return r === true;
  }

  /* ---------- Sélecteur de weekends ---------- */
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dBtn = document.getElementById('dates-btn');
  const dPanel = document.getElementById('dates-panel');
  const dHidden = document.getElementById('dates');
  const dSummary = document.getElementById('dates-summary');
  const dOther = document.getElementById('dp-other');
  const dOtherWrap = document.getElementById('dp-other-wrap');
  const dOtherTxt = document.getElementById('dates-autre');

  // Saison d'hiver : décembre -> avril. De mai à décembre on affiche la saison qui arrive, sinon celle en cours.
  const now = new Date();
  const startYear = now.getMonth() >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const SEASON_MONTHS = [[startYear, 11], [startYear + 1, 0], [startYear + 1, 1], [startYear + 1, 2], [startYear + 1, 3]];
  document.getElementById('dp-year').textContent = startYear + '-' + (startYear + 1);
  const label = (a, b) => a.getMonth() === b.getMonth()
    ? a.getDate() + '–' + b.getDate() + ' ' + MONTHS[a.getMonth()]
    : a.getDate() + ' ' + MONTHS[a.getMonth()] + ' – ' + b.getDate() + ' ' + MONTHS[b.getMonth()];
  const monthsBox = document.getElementById('dp-months');
  for (const [season, m] of SEASON_MONTHS) {
    const block = document.createElement('div');
    block.className = 'dp-month';
    const h = document.createElement('h4');
    h.textContent = MONTH_NAMES[m] + ' ' + season;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (let d = new Date(season, m, 1); d.getMonth() === m; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 5) continue; // vendredi
      const fri = new Date(d), sun = new Date(d);
      sun.setDate(sun.getDate() + 2);
      if (fri < now) continue;
      const wrap = document.createElement('label');
      wrap.className = 'chip';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'dp-we';
      cb.value = label(fri, sun) + ' ' + season;
      const txt = document.createElement('span');
      txt.textContent = label(fri, sun);
      wrap.append(cb, txt);
      chips.append(wrap);
    }
    if (chips.children.length) { block.append(h, chips); monthsBox.append(block); }
  }

  function syncDates() {
    const picked = [...dPanel.querySelectorAll('.dp-we:checked')].map(c => c.value);
    const other = dOther.checked;
    dOtherWrap.hidden = !other;
    const parts = picked.slice();
    if (other) parts.push('Autre' + (dOtherTxt.value.trim() ? ' : ' + dOtherTxt.value.trim() : ''));
    dHidden.value = parts.join(' | ');
    const n = picked.length;
    let sum = '';
    if (n === 1) sum = picked[0].replace(/ \d{4}$/, '');
    else if (n > 1) sum = n + ' weekends choisis';
    if (other) sum = sum ? sum + ' + autre' : 'Autre / flexibles';
    dSummary.textContent = sum || 'Choisis tes weekends';
    dSummary.classList.toggle('ph-txt', !sum);
    if (dHidden.closest('.field').classList.contains('invalid')) check(dHidden);
    saveDraft();
  }
  function openPanel(open) {
    dPanel.hidden = !open;
    dHidden.closest('.field').classList.toggle('open', open);
    dBtn.setAttribute('aria-expanded', String(open));
    if (open) (dPanel.querySelector('input') || dPanel).focus();
  }
  dBtn.addEventListener('click', () => openPanel(dPanel.hidden));
  dPanel.addEventListener('change', e => {
    syncDates();
    if (e.target === dOther && dOther.checked) dOtherTxt.focus();
  });
  dOtherTxt.addEventListener('input', syncDates);
  document.getElementById('dp-ok').addEventListener('click', () => { openPanel(false); check(dHidden); dBtn.focus(); });
  document.getElementById('dp-clear').addEventListener('click', () => {
    dPanel.querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = false; });
    dOtherTxt.value = '';
    syncDates();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !dPanel.hidden) { openPanel(false); dBtn.focus(); }
  });
  document.addEventListener('click', e => {
    if (!dPanel.hidden && !dPanel.contains(e.target) && !dBtn.contains(e.target)) openPanel(false);
  });

  form.addEventListener('focusout', e => { if (e.target.name in rules && e.target.value) check(e.target); });
  form.addEventListener('input', e => {
    if (fieldOf(e.target)?.classList.contains('invalid')) check(e.target);
    saveDraft();
  });

  /* Brouillon de session : si le visiteur recharge la page, il retrouve sa saisie (effacé à la fermeture de l’onglet). */
  function saveDraft() {
    try {
      const d = {};
      for (const [k, v] of new FormData(form)) if (!['website', 'consentement', 'dates', 'dates_precisions'].includes(k)) d[k] = v;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch (_) { /* stockage indisponible */ }
  }
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
    if (d && typeof d === 'object') {
      for (const [k, v] of Object.entries(d)) {
        const el = form.elements[k];
        if (el && typeof v === 'string' && !el.value) el.value = v.slice(0, 2000);
      }
    }
  } catch (_) { /* brouillon illisible : ignoré */ }

  function show(kind, text, mailHref) {
    status.hidden = false;
    status.className = 'status full ' + kind;
    status.textContent = text; // textContent : aucune injection HTML possible
    if (mailHref) {
      status.append(' ');
      const a = document.createElement('a');
      a.href = mailHref;
      a.textContent = 'Ouvrir l’e-mail pré-rempli';
      status.append(a);
    }
    status.focus({ preventScroll: true });
    status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function buildMailto(d) {
    const lines = [
      'Bonjour l’équipe Weekly,',
      '',
      'Je souhaite obtenir un devis pour un weekend ski & snowboard avec notre BDE. Voici les premières infos :',
      '',
      '— NOTRE BDE —',
      '• Nom du BDE : ' + d.bde,
      '• École : ' + d.ecole,
      '• Nombre d’étudiants estimé : ' + d.etudiants,
      '',
      '— LE WEEKEND —',
      '• Dates souhaitées : ' + (d.dates || '').split(' | ').join(', '),
      '• Bus privatisé depuis l’école : ' + d.transport,
      '• Location matériel (skis, snowboard) : ' + (d.materiel || 'non précisé'),
      '• Niveau du groupe : ' + (d.niveau || 'non précisé'),
      '',
      '— MES COORDONNÉES —',
      '• Nom : ' + d.nom,
      '• Email : ' + d.email,
      '• Téléphone : ' + d.telephone,
      ''
    ];
    if (d.message) lines.push('— PRÉCISIONS —', d.message, '');
    lines.push('Pouvez-vous me faire une proposition (station, forfaits, hébergement, budget, logistique) ? Je reste disponible pour en discuter par téléphone.', '', 'Merci d’avance et à bientôt,', d.nom, d.bde + ' · ' + d.ecole);
    return 'mailto:' + CONTACT_EMAIL +
      '?subject=' + encodeURIComponent('Demande de devis Weekly Ski · ' + d.bde + ' (' + d.etudiants + ' étudiants)') +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.hidden = true;

    let first = null;
    for (const name of Object.keys(rules)) {
      const el = form.elements[name];
      if (!check(el) && !first) first = el;
    }
    const consent = form.elements.consentement;
    document.getElementById('rgpd-err').textContent = consent.checked ? '' : 'Coche la case pour qu’on puisse te répondre.';
    if (!consent.checked && !first) first = consent;
    if (first) {
      if (first === dHidden) { openPanel(true); } else first.focus();
      return;
    }

    // Anti-spam : champ piège rempli ou envoi en moins de 3 s -> robot, on ignore en silence.
    if (form.elements.website.value || Date.now() - startedAt < 3000) {
      show('ok', 'Merci ! Ta demande a bien été prise en compte.');
      return;
    }
    if (Date.now() - lastSent < 30000) {
      show('ko', 'Ta demande vient d’être envoyée. Attends 30 secondes avant d’en renvoyer une.');
      return;
    }

    const data = {};
    for (const [k, v] of new FormData(form)) {
      if (k === 'website' || k === 'dates_precisions') continue;
      data[k] = String(v).trim().slice(0, 2000);
    }
    data.consentement = 'oui';
    data._subject = 'Demande de devis Weekly Ski · ' + data.bde;
    data._template = 'table';
    data._captcha = 'false';
    data._replyto = data.email;

    if (!FORM_ENDPOINT) {
      const href = buildMailto(data);
      lastSent = Date.now();
      window.location.href = href;
      show('ok', 'Ta messagerie va s’ouvrir avec ta demande pré-remplie : il ne te reste qu’à cliquer sur Envoyer. Rien ne s’ouvre ?', href);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'omit',
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const out = await res.json().catch(() => ({}));
      if (String(out.success) !== 'true') throw new Error(out.message || 'Envoi refusé');
      lastSent = Date.now();
      form.reset();
      syncDates();
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {}
      show('ok', 'Demande envoyée, on te recontacte vite ! Tu auras une réponse sous 48h.');
    } catch (_) {
      show('ko', 'L’envoi n’a pas abouti (connexion ?). Réessaie, ou envoie-nous ta demande par e-mail :', buildMailto(data));
    } finally {
      btn.disabled = false;
      btn.innerHTML = btnHTML; // contenu statique d'origine
    }
  });
});
