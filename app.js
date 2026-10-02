'use strict';

/* ================= CONFIGURATION =================
 * FORM_ENDPOINT : URL du service qui reçoit les demandes (ex. Formspree : https://formspree.io/f/abcdwxyz).
 *   - Rempli  -> la demande est envoyée directement, le visiteur voit une confirmation.
 *   - Vide    -> le formulaire ouvre la messagerie du visiteur avec un e-mail pré-rempli vers CONTACT_EMAIL.
 * Si tu utilises un autre service que Formspree, ajoute son domaine dans connect-src de la CSP (index.html).
 */
const FORM_ENDPOINT = '';
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
  const DRAFT_KEY = 'weekly-devis-draft';
  let lastSent = 0;

  const rules = {
    bde: v => v.trim().length >= 2 || 'Indique le nom de ton BDE.',
    ecole: v => v.trim().length >= 2 || 'Indique ton école.',
    nom: v => v.trim().length >= 2 || 'Indique ton nom.',
    email: v => /^[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}$/i.test(v.trim()) || 'Adresse email invalide (ex. ton.email@exemple.fr).',
    telephone: v => /^\+?[0-9 .\-()]{8,20}$/.test(v.trim()) || 'Numéro invalide (ex. 06 12 34 56 78).',
    etudiants: v => (/^\d+$/.test(v) && +v >= 5 && +v <= 500) || 'Indique un nombre entre 5 et 500.',
    dates: v => v.trim().length >= 3 || 'Indique tes dates souhaitées (ex. 20-22 juin).',
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

  form.addEventListener('focusout', e => { if (e.target.name in rules && e.target.value) check(e.target); });
  form.addEventListener('input', e => {
    if (fieldOf(e.target)?.classList.contains('invalid')) check(e.target);
    saveDraft();
  });

  /* Brouillon de session : si le visiteur recharge la page, il retrouve sa saisie (effacé à la fermeture de l’onglet). */
  function saveDraft() {
    try {
      const d = {};
      for (const [k, v] of new FormData(form)) if (k !== 'website' && k !== 'consentement') d[k] = v;
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
      'Nom du BDE : ' + d.bde,
      'École : ' + d.ecole,
      'Nom : ' + d.nom,
      'Email : ' + d.email,
      'Téléphone : ' + d.telephone,
      "Nombre d'étudiants : " + d.etudiants,
      'Dates souhaitées : ' + d.dates,
      'Bus privatisé : ' + d.transport,
      '',
      d.message || ''
    ];
    return 'mailto:' + CONTACT_EMAIL +
      '?subject=' + encodeURIComponent('Demande de devis Weekly · ' + d.bde) +
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
    if (first) { first.focus(); return; }

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
      if (k === 'website') continue;
      data[k] = String(v).trim().slice(0, 2000);
    }
    data.consentement = 'oui';
    data._subject = 'Demande de devis Weekly · ' + data.bde;

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
      lastSent = Date.now();
      form.reset();
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
