# UI Kit — Web (React)

Recréation cliquable de l'application **Contrée** desktop. Compose les
primitives du design system (aucune ré-implémentation) sur les layouts nommés
de `layout-web.css`. Thème sombre, desktop-first.

## Écrans
- **Entraînement** (`GameScreen.jsx`) — flagship. Layout `.layout-game` : `ScoreBoard` + `TableFelt` (4 sièges, pli, atout) + main du joueur (cartes `playable` cliquables) ; panneaux droits `AnnounceStream` / `LogConsole` ; `ControlBar` (pause/step/vitesse/délais). Cliquer une carte la joue au tapis.
- **Lobby** (`LobbyScreen.jsx`) — `.layout-lobby` : filtres (`Tag`, `Input` recherche, créer) + grille de `Card` tables (live/privée, identicons, rejoindre/observer).
- **Mes robots** (`RobotsScreen.jsx`) — `.layout-robots` : liste sélectionnable + éditeur (stats, `Slider` personnalité, `Select` convention, dupliquer/supprimer) + mode **comparaison** côte à côte.
- **Tournois** (`TournamentScreen.jsx`) — `.layout-tournament` : classement des clans (mon équipe surlignée) + fiche tournoi.
- **Regarder** réutilise le lobby (lobby de spectateurs) pour la démo.

## Lancer
Ouvrir `index.html`. Charge React UMD + Babel + `_ds_bundle.js` + `styles.css`.
La nav latérale bascule les écrans (`app.jsx`). Chaque écran s'exporte sur
`window` (scopes Babel séparés).

## Notes
- Aucune logique de jeu réelle : états simulés pour la démo visuelle.
- Couleurs d'équipe dérivées du nom via `TeamBadge`/`teamColor` (jamais en dur).
