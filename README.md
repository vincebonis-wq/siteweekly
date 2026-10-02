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

## Formulaire
Les demandes sont envoyées par FormSubmit (gratuit, sans compte) à weekly.orga@gmail.com.
1. La toute première demande déclenche un e-mail « Activate Form » : cliquer une fois sur le bouton.
2. Optionnel : remplacer l'adresse dans `FORM_ENDPOINT` (`app.js`) par l'alias aléatoire fourni par FormSubmit.
En cas d'échec, le visiteur se voit proposer un e-mail pré-rempli.

## Mettre à jour le site
Pousser sur la branche `gh-pages` : GitHub Pages republie automatiquement.
