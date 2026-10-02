# Weekly — site vitrine

Site statique (HTML/CSS/JS, sans dépendance), publié sur GitHub Pages :
https://vincebonis-wq.github.io/siteweekly/

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'accueil (CSP, SEO, Open Graph) |
| `style.css` | Styles, responsive desktop / tablette / mobile |
| `app.js` | Menu mobile, barre au scroll, animations, formulaire de devis |
| `mentions-legales.html` | Mentions légales + RGPD (à compléter) |
| `img/` | Images optimisées en WebP |
| `_headers` | En-têtes de sécurité si migration vers Netlify / Cloudflare Pages |

## Brancher le formulaire
Dans `app.js`, renseigner `FORM_ENDPOINT` (ex. `https://formspree.io/f/xxxx`).
Sans endpoint, le formulaire ouvre un e-mail pré-rempli vers `CONTACT_EMAIL`.
Autre service que Formspree : ajouter son domaine dans `connect-src` de la CSP (`index.html`).

## Mettre à jour le site
Pousser sur la branche `gh-pages` : GitHub Pages republie automatiquement.
