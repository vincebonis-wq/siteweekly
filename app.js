'use strict';

/* ---------- Configuration du formulaire ----------
 * Colle ici l'URL de ton service d'envoi (ex. Formspree : https://formspree.io/f/xxxxxxx).
 * Tant que c'est vide, le formulaire fonctionne en mode démo (validation + message de confirmation, sans envoi).
 * Si tu changes de service, ajoute son domaine dans la balise Content-Security-Policy (connect-src) de index.html.
 */
const FORM_ENDPOINT = '';

/* ---------- Vagues animées du hero ---------- */
(function waves() {
  const canvas = document.getElementById('waves');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layers = [
    { amp: 10, len: 0.008, speed: 0.5, y: 0.34, color: 'rgba(28,74,87,0.95)' },
    { amp: 16, len: 0.006, speed: 0.4, y: 0.50, color: 'rgba(18,65,79,0.95)' },
    { amp: 22, len: 0.005, speed: 0.3, y: 0.68, color: 'rgba(11,46,60,0.97)' },
    { amp: 8, len: 0.015, speed: 0.9, y: 0.40, color: 'rgba(255,226,154,0.16)' }
  ];
  let w = 0, h = 0, t = 0, raf = 0, visible = true;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const l of layers) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w + 8; x += 8) {
        const y = l.y * h + Math.sin(x * l.len + t * l.speed) * l.amp + Math.sin(x * l.len * 2.3 + t * l.speed * 1.4) * l.amp * 0.35;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = l.color;
      ctx.fill();
    }
  }
  function loop() {
    t += 0.016;
    draw();
    if (visible) raf = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();
  if (!reduce) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) raf = requestAnimationFrame(loop);
      }).observe(canvas);
    } else {
      raf = requestAnimationFrame(loop);
    }
  }
})();

/* ---------- Formulaire de réservation ---------- */
(function booking() {
  const form = document.getElementById('booking');
  if (!form) return;
  const status = document.getElementById('status');
  const btn = form.querySelector('button[type="submit"]');
  const startedAt = Date.now();
  let lastSubmit = 0;

  const rules = {
    bde: v => v.trim().length >= 2 || 'Indique le nom de ton BDE.',
    ecole: v => v.trim().length >= 2 || 'Indique ton école.',
    nom: v => v.trim().length >= 3 || 'Indique ton prénom et ton nom.',
    email: v => /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(v.trim()) || 'Cette adresse email ne semble pas valide (ex. toi@ecole.fr).',
    telephone: v => v.trim() === '' || /^\+?[0-9 .\-()]{8,20}$/.test(v.trim()) || 'Ce numéro ne semble pas valide (ex. 06 12 34 56 78).',
    etudiants: v => (/^\d+$/.test(v) && +v >= 5 && +v <= 500) || 'Indique un nombre d\'étudiants entre 5 et 500.'
  };

  function setError(input, msg) {
    const field = input.closest('.field');
    const slot = field ? field.querySelector('.err') : null;
    if (field) field.classList.toggle('invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (slot) slot.textContent = msg || '';
  }

  function validate(input) {
    const rule = rules[input.name];
    if (!rule) return true;
    const res = rule(input.value);
    setError(input, res === true ? '' : res);
    return res === true;
  }

  form.addEventListener('blur', e => { if (e.target.name in rules) validate(e.target); }, true);
  form.addEventListener('input', e => {
    if (e.target.closest('.field.invalid')) validate(e.target);
  });

  function show(kind, text) {
    status.hidden = false;
    status.className = 'status ' + kind;
    status.textContent = text; // textContent : jamais d'injection HTML
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.hidden = true;

    let ok = true, first = null;
    for (const name of Object.keys(rules)) {
      const input = form.elements[name];
      if (!validate(input)) { ok = false; first = first || input; }
    }
    const consent = form.elements.consentement;
    const consentErr = document.getElementById('rgpd-err');
    consentErr.textContent = consent.checked ? '' : 'Coche la case pour qu\'on puisse te recontacter.';
    if (!consent.checked) { ok = false; first = first || consent; }
    if (!ok) { first.focus(); return; }

    // Anti-spam : champ piège rempli ou envoi trop rapide => on ignore silencieusement.
    if (form.elements.website.value || Date.now() - startedAt < 3000) {
      show('ok', 'Merci, ta demande a bien été prise en compte.');
      return;
    }
    if (Date.now() - lastSubmit < 30000) {
      show('ko', 'Ta demande vient déjà d\'être envoyée. Patiente 30 secondes avant de réessayer.');
      return;
    }

    const data = {};
    for (const [k, v] of new FormData(form).entries()) {
      if (k === 'website') continue;
      data[k] = String(v).trim().slice(0, 2000);
    }

    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Envoi en cours…';
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'omit',
          referrerPolicy: 'strict-origin-when-cross-origin'
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      } else {
        await new Promise(r => setTimeout(r, 700)); // mode démo
      }
      lastSubmit = Date.now();
      show('ok', 'Demande reçue pour ' + data.bde + ' ! On te recontacte sous 48h avec une proposition personnalisée.');
      form.reset();
    } catch (err) {
      show('ko', 'L\'envoi n\'a pas abouti. Vérifie ta connexion et réessaie ; si ça bloque encore, écris-nous à hello@weekly-surf.fr.');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
})();
