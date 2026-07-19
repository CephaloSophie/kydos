# Contrée — Design System

Système de design complet pour **Contrée**, plateforme compétitive de **Belote
Contrée** full-stack (équipes/clans, robots, tournois, parties en ligne + rejeu).
Deux surfaces consommant les mêmes services REST + WebSocket :

- **WEB** — React + CSS custom properties, thème sombre, **desktop-first**.
- **MOBILE** — HTML/TypeScript vanilla, thème sombre, **pensé pour le pouce**,
  design **totalement séparé** du web (pas de responsive partagé).

> **Sources.** Ce système est créé **à partir d'un brief produit** (entités,
> flux de récompense, scoring 4 niveaux, composants existants, écrans à
> concevoir) — aucun codebase ni Figma n'était rattaché. Si un dépôt ou une
> maquette existe, le rattacher pour aligner les recréations sur le code réel.
> Marque **« Contrée »** et identité visuelle (nom, logo, palette) **proposées
> par ce système** — à valider.

---

## Le produit en bref

- **Joueur** : compte, appartient à un **clan permanent** (équipe).
- **Clan** : nom + membres + **identicon algorithmique** (SVG 5×5 façon GitHub,
  couleur HSL dérivée d'un hash du nom) + total de points de récompense.
- **Robot** : appartient à un joueur, personnalité configurable (agressivité,
  concentration, vélocité, convention d'enchères) + stats.
- **Partie / Tournoi / Table** : 1–4 manches, locale ou en ligne, rejouable ;
  tournois entre clans sur une période ; tables publiques/privées, 4 sièges +
  observateurs.
- **Récompense** (≠ score belote) : `base 100 + (monScore − adverse) + bonus
  manche + bonus partie + primes (dedans/capot/contré/surcontré)` → total du clan.
- **Scoring temps réel, 4 niveaux** : brut de donne (→162) · score de donne
  (arrondi vs contrat) · cumul de manche (course à 1500/2000) · manches gagnées.

---

## CONTENT FUNDAMENTALS — comment on écrit

- **Langue** : **français**, vocabulaire **belote authentique** — preneur, atout,
  contrat, contré/surcontré, capot, dedans, pli, donne, manche, brut de donne.
- **Voix** : adresse au joueur en **« vous »** (« Rejoindre la table »,
  « Vos spectateurs voient tout »). Ton **senior, sobre, compétitif** — esport,
  pas mièvre.
- **Casse** : titres en casse de phrase (Chakra Petch fait le travail d'emphase) ;
  **labels en CAPITALES** + interlettrage (`--ls-caps`) pour les sur-titres
  (« MANCHE 2/3 », « PRENEUR »). Pas de Title Case anglo.
- **Chiffres** : format français (`4 820 pts`, espace insécable de milliers),
  chiffres en **Chakra Petch** (scores) ou **JetBrains Mono** (stats tabulaires,
  %, ms, latence).
- **Concision** : un libellé d'action = un verbe (« Observer », « Dupliquer »,
  « Contré »). Les badges portent le sens en toutes lettres, jamais par la seule
  couleur.
- **Emoji** : **non** dans les composants de produit. (Les `👤 👁` du kit sont des
  placeholders de démo à remplacer par des icônes.)
- **Exemples de ton** : « Préparez votre clan pour le tournoi », « Glissez une
  ligne vers la gauche pour supprimer », « Contrat menacé — équipe B à 148/150 ».

---

## VISUAL FOUNDATIONS — les fondations visuelles

**Vibe.** Salle de jeu compétitive la nuit : tapis de feutre vert, or de l'atout,
fonds très sombres, énergie esport via un cyan électrique en accent secondaire.

- **Couleurs.** Thème **sombre uniquement**, fond applicatif `#0f1115`. Fonds en
  **5 niveaux** (`--bg-0…4`), texte en **3 niveaux**. **Accent = or « atout »**
  (`#eab23a`, HSL éclaté pour recoloration). **Secondaire = cyan esport**
  (`--spark`) réservé au « live » et aux réglages moteur. Sémantiques success/
  warning/error/info. **Couleurs d'équipe dynamiques** (HSL depuis hash, jamais
  en dur) relayées par `--team-*`. Domaine métier : `--felt*` (tapis), `--card-*`
  (faces rouge/noir, dos bleu nuit), `--log-*` (5 niveaux), `--bid-*` (enchères).
- **Type.** Display **Chakra Petch** (techno/esport — titres, scores) ; UI
  **Manrope** (corps, labels) ; Mono **JetBrains Mono** (console, stats). Échelle
  display 40 → xs 11 (web), remontée d'un cran sur mobile pour la lecture.
- **Spacing.** Base **4 px** (`--sp-1…24`). Gouttières d'écran mobile dédiées
  (`--sp-screen-x/y`). Layouts en grid/flex avec `gap`, jamais de marges au coup
  par coup.
- **Rayons.** `--r-xs 4` → `--r-2xl 28` ; cartes à jouer `--r-card 9` ; mobile un
  cran plus généreux (esthétique native).
- **Bordures.** Fines, 1 px, `--border-1` (séparateur) / `--border-2` (contour) /
  `--border-strong` (focus de groupe). On structure par **bordure + niveau de
  fond**, pas par ombres lourdes.
- **Ombres & lueurs.** Ombres sobres `--shadow-1…3` + `--shadow-pop` (overlays).
  **Lueurs signature** : `--glow-accent` (carte jouable / siège actif) et
  `--glow-win` (carte gagnante du pli) — la couleur **fonctionnelle**, pas
  décorative.
- **Fonds & textures.** Pas d'images de fond génériques. Le **tapis** est un
  **radial-gradient** feutré (halo central → bord assombri) cerné d'un rebord
  bois `--felt-rail`. Ailleurs : aplats sombres + dégradés très discrets
  (hero mobile, modales). Pas de motifs criards.
- **Transparence & blur.** `backdrop-filter: blur` réservé aux éléments **posés
  sur le tapis** (chips de siège, AnnouncePopup, panneau pli précédent) et aux
  voiles modaux. Ailleurs, surfaces opaques.
- **Cartes (composant Card).** Fond `--bg-2`, bordure `--border-1`, rayon
  `--r-lg`, ombre **uniquement** si `elevated` ; hover = bordure renforcée +
  translation −2 px (jamais d'ombre qui « gonfle »).
- **Animation.** Rapide (**150–250 ms web / 200–300 ms mobile**), **ease-out**
  (`cubic-bezier(.16,1,.3,1)`). Entrées de carte (glissé depuis le siège),
  ramassage de pli, popup auto-effacée, badge scale-in, identicon draw-in, toast/
  sheet slide-up. **Jamais bloquant** pour le moteur ; respecte
  `prefers-reduced-motion`.
- **Hover / press.** Hover = `brightness(1.08)` ou voile clair `--state-hover`.
  Press = translateY 1 px (boutons) / `--state-active`. Mobile : pas de hover,
  feedback au press + **haptique** mentionnée.
- **Imagerie.** Froide et nocturne (verts feutre, bleus nuit, or). Pas de photo ;
  l'identité visuelle est **générée** (identicons) — cohérent avec un produit où
  chaque clan a sa couleur.

---

## ICONOGRAPHY

- **Style** : icônes **line, stroke 2**, bouts arrondis — vocabulaire **Lucide**.
  *Substitution assumée :* aucun set n'était fourni → on a **redessiné à la main
  un petit jeu cohérent** (Lucide-like) inline dans les kits
  (`ui_kits/web/icons.jsx`, `ui_kits/mobile/app.js`). Pour la production,
  **brancher Lucide** (CDN ou package) avec le même stroke ; remplacer les
  placeholders sans changer les tailles.
- **Tailles** : 16 (inline/sm), 18–20 (boutons), 24 (tab bar, nav). Cibles
  toujours ≥ `--tap-min`.
- **Enseignes de cartes** : caractères Unicode `♥ ♦ ♠ ♣` colorés via `--card-red`
  / `--card-black` (et `--card-red` pour ♥♦ dans les badges). C'est le seul
  « icône-glyphe » canonique du système.
- **Logo / emblème** : badge hexagonal esport + **pique d'atout** doré
  (`assets/mark-contree.svg`), lockup avec wordmark Chakra Petch
  (`assets/logo-contree.svg`). *Proposés par ce système, à valider.*
- **Emoji** : pas utilisés en produit.

---

## Substitutions à valider (⚠️)

- **Polices** chargées via **Google Fonts (CDN)** — pas de binaires auto-hébergés.
  Remplacer par des `@font-face` self-hosted (woff2) pour la prod (cf. `tokens/fonts.css`).
- **Icônes** : jeu Lucide-like redessiné → **brancher le vrai Lucide**.
- **Marque** (nom « Contrée », logo, accent or) : proposition de départ.

---

## Index / manifeste

**Tokens & fondations**
- `styles.css` — point d'entrée (imports uniquement).
- `design-tokens.css` — tous les tokens (`:root` web + `[data-surface="mobile"]`).
- `tokens/fonts.css` — webfonts (Google Fonts).
- `animations.css` · `layout-web.css` · `layout-mobile.css`.
- `guidelines/*.html` — specimen cards (onglet Design System) : couleurs, type,
  spacing, marque, identicon.

**Documentation**
- `DESIGN_SYSTEM.md` — guide (philosophie, couleur d'équipe, extension, nommage,
  checklists, interdits).
- `components-web.md` / `components-mobile.md` — spécs par composant / écran.

**Composants React** (`components/`)
- `core/` — Button, IconButton, Badge, Tag, Card.
- `forms/` — Input, Select, Slider, Switch.
- `feedback/` — Toast, Dialog, Tooltip.
- `table/` — PlayingCard, TableFelt.
- `score/` — TeamBadge (+ `teamColor`), ScoreBoard, RecapTable.
- `bidding/` — BidBadge, AnnouncePopup, AnnounceStream.
- `devtools/` — LogConsole, ControlBar.

**UI kits** (`ui_kits/`)
- `web/` — app desktop : Entraînement (flagship), Lobby, Robots, Tournois.
- `mobile/` — app pouce : Accueil, Jouer (tapis portrait), Regarder, Robots, Équipe, Profil.

**Marque** (`assets/`) — `logo-contree.svg`, `mark-contree.svg`.

**Divers** — `SKILL.md` (usage en Agent Skill).
