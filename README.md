# Swell Club — site vitrine week-ends surf étudiants

Site statique (HTML/CSS/JS, aucune dépendance).

- `index.html` : page complète (CSP, SEO, responsive)
- `app.js` : vagues animées + formulaire (validation, anti-spam, envoi)
- `_headers` : en-têtes de sécurité pour Netlify / Cloudflare Pages

## Brancher le formulaire
Dans `app.js`, renseigner `FORM_ENDPOINT` (ex. `https://formspree.io/f/xxxx`).
Si le service n'est pas Formspree, ajouter son domaine dans `connect-src` de la CSP (`index.html`).
Tant que c'est vide, le formulaire tourne en mode démo.
