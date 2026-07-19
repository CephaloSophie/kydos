# UI Kit — Mobile (HTML/TypeScript vanilla)

Recréation cliquable de l'app **Contrée** mobile. Surface **totalement séparée**
du web : aucun composant React partagé, aucun responsive commun. Mêmes API REST
+ WebSocket. Écran 390 px, navigation par **tab bar**, interactions au pouce.

## Fichiers
- `index.html` — châssis téléphone + ossature `m-screen` (topbar / contenu / tab bar).
- `mobile.css` — styles propres à la surface mobile (s'appuie sur les tokens + `layout-mobile.css`).
- `app.js` — rendu vanilla des écrans, navigation, sheets, toasts, swipe-to-delete, identicon.

## Écrans (tab bar : Accueil · Jouer · Regarder · Robots · Profil)
- **Accueil** — hero score d'équipe, reprise de partie, rail horizontal de parties live, raccourcis.
- **Jouer** — tapis **portrait** : bandeau score fixe, 4 sièges repositionnés (joueur en bas), pli central, main en drawer scrollable. Tap carte = jouer (toast).
- **Regarder** — liste de parties live → **bottom sheet** Rejoindre / Observer.
- **Mes robots** — liste **swipeable** (swipe gauche = supprimer, tap = éditer en sheet à sliders), **FAB** + robot.
- **Mon équipe** (push depuis Accueil/Profil) — identicon grand format, membres, historique.
- **Profil** — compte, timings (switch), manches par défaut (segmented), déconnexion.

## Patterns
Bottom sheet, toast (haut de tab bar), swipe-to-delete, segmented control, FAB,
pull-to-refresh (zone prévue). Feedback haptique **mentionné** là où pertinent
(jouer une carte, pli pris, swipe, ouverture de sheet) — non implémentable en HTML.

## Notes
États simulés, pas de logique de jeu. L'identicon réutilise **le même algorithme
que `TeamBadge`** côté web (hash → HSL), garantissant des couleurs de clan
identiques sur les deux surfaces.
