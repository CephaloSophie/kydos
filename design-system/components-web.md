# components-web.md

Surface **WEB** — React + CSS custom properties, thème sombre, desktop-first.
Tous les composants tirent leurs couleurs des tokens (`design-tokens.css`).
Règle non négociable : **aucune couleur en dur**, **aucune logique de jeu** dans
l'UI. Les composants reçoivent un état déjà calculé et émettent des intentions.

Import : `const { Button, PlayingCard, ... } = window.<Namespace>` (cards/_ds_bundle.js),
ou `import { Button } from "components/core/Button.jsx"` en source.

---

## Primitives — `core/`

### Button
Action principale, de l'atout (`primary`, gold) à l'action discrète (`ghost`).
- **Variants** : `primary` · `secondary` · `ghost` · `danger` · `spark` (cyan, actions « live »).
- **États** : hover (brightness +8 %), active (translateY 1px), `disabled`, `loading` (spinner + `aria-busy`).
- **Props** :
  ```ts
  variant?: "primary"|"secondary"|"ghost"|"danger"|"spark";
  size?: "sm"|"md"|"lg"; iconLeft?: ReactNode; iconRight?: ReactNode;
  fullWidth?: boolean; loading?: boolean; disabled?: boolean;
  ```
- **Tokens** : `--accent`, `--text-on-accent`, `--bg-3`, `--border-2`, `--error`, `--spark`, `--r-md`, `--control-h*`.
- **A11y** : `loading` pose `aria-busy`; le focus visible passe par `.focus-ring` (anneau `--focus-ring`). Cible ≥ `--tap-min`.

### IconButton
Bouton carré une-icône (toolbars, ControlBar, topbar).
- **Variants** : `ghost` · `solid` · `accent`. **État** : `active` → `aria-pressed` + voile gold.
- **Props** : `variant`, `size`, `label: string` (**obligatoire**), `active?`, `disabled?`.
- **Tokens** : `--accent-ghost`, `--bg-3`, `--border-2`, `--r-md`.
- **A11y** : `label` est **requis** → alimente `aria-label` + `title`. Refuser un IconButton sans label.

### Badge
Pastille de statut (table live, robot actif, prime de score).
- **Tones** : `neutral` `accent` `success` `warning` `error` `info` `spark`. **Variants** : `solid`, `dot`.
- **Props** : `tone?`, `solid?`, `dot?`.
- **Tokens** : `--*-ghost`, `--*`, `--r-full`, `--fs-xs`.
- **A11y** : décoratif par défaut. Pour un statut porteur de sens, doubler d'un texte (ne pas coder l'info par la seule couleur).

### Tag
Étiquette filtre/attribut (filtres lobby, traits de robot).
- **États** : `selected` (voile gold). **Variant** : retirable (`onRemove`).
- **Props** : `selected?`, `onRemove?(e)`.
- **Tokens** : `--accent-ghost`, `--accent-line`, `--bg-3`, `--r-sm`.
- **A11y** : cliquable → `role="button"` + `tabindex=0`; la croix porte `aria-label="Retirer"`.

### Card
Surface posée (tables, fiches robot, panneaux stats).
- **Variants** : `elevated`, `interactive`, `padding none|sm|md|lg`, slots `header`/`footer`.
- **Props** : `as?`, `elevated?`, `interactive?`, `padding?`, `header?`, `footer?`.
- **Tokens** : `--bg-2`, `--border-1`, `--border-strong`, `--shadow-2`, `--r-lg`.
- **A11y** : si toute la carte est cliquable, rendre `as="button"`/`a` et fournir un libellé ; ne jamais piéger le focus sur un `div` cliquable.

---

## Formulaires — `forms/`

### Input
Champ texte sombre (auth, recherche, nom de robot).
- **États** : focus (anneau gold + halo), `error` (bordure rouge), `disabled`. **Slots** : `iconLeft`, `addonRight`.
- **Props** : `label?`, `hint?`, `error?`, `iconLeft?`, `addonRight?` + attributs `<input>`.
- **Tokens** : `--bg-inset`, `--border-2`, `--focus-ring`, `--accent-ghost`, `--error`, `--error-ghost`.
- **A11y** : `label` lié via `htmlFor`; `error` pose `aria-invalid` + `aria-describedby` vers le message.

### Select
Liste déroulante personnalisée (convention d'enchères, sens de jeu, manches).
- **États** : ouvert (bordure focus), option `selected` (gold + ✓).
- **Props** : `label?`, `value?`, `options: {value,label}[]`, `onChange?`, `placeholder?`, `disabled?`.
- **Tokens** : `--bg-inset`, `--bg-4`, `--accent-ghost`, `--shadow-3`, `--z-dropdown`.
- **A11y** : `aria-haspopup="listbox"` + `aria-expanded`; liste en `role="listbox"`, options `role="option"` + `aria-selected`. Clic extérieur ferme.

### Slider
Cœur de la config robot (agressivité, concentration, vélocité) et de la ControlBar.
- **Props** : `label?`, `value`, `min?`, `max?`, `step?`, `onChange(v:number)`, `format?(v)`, `accent?`, `disabled?`.
- **Tokens** : piste = `linear-gradient(accent → --bg-4)`, pouce `--text-1` cerclé `accent`; `accent` par défaut `--accent`, `--spark` pour les réglages moteur.
- **A11y** : `<input type=range>` natif → clavier + ARIA gratuits; la valeur formatée est affichée en regard du label (lecture visuelle).

### Switch
Bascule on/off (robot actif, timing auto).
- **Props** : `checked?`, `onChange(next:boolean)`, `label?`, `disabled?`.
- **Tokens** : `--accent` (on), `--bg-4` (off), `--text-on-accent`/`--text-1` (pastille).
- **A11y** : `role="switch"` + `aria-checked`; `label` cliquable lié via `htmlFor`.

---

## Retour & overlays — `feedback/`

### Toast
Notification éphémère (enchère, pli pris, fin de partie). Partagé web/mobile.
- **Props** : `tone?`, `title?`, `message?`, `icon?`, `onClose?`, `action?`.
- **Tokens** : `--bg-4`, `--border-2`, `--shadow-3`, liseré = tonalité. Anim web : pile coin haut-droit.
- **A11y** : `role="status"` + `aria-live="polite"`; ne pas y mettre d'action critique unique (éphémère).

### Dialog
Modale centrée + voile (créer une table, confirmer une suppression).
- **Props** : `open`, `title?`, `onClose?`, `footer?`, `width?`, `children`.
- **Tokens** : voile `rgba(0,0,0,.6)`, `--bg-3`, `--r-xl`, `--shadow-pop`, `--z-overlay`.
- **A11y** : `role="dialog"` + `aria-modal`; Échap et clic-voile ferment; renvoyer le focus à l'ouvreur à la fermeture (à câbler côté app).

### Tooltip
Infobulle survol/focus — **web only** (pas de hover mobile).
- **Props** : `content`, `side? top|bottom|left|right`, `children`.
- **Tokens** : `--bg-0`, `--border-2`, `--z-tooltip`.
- **A11y** : `role="tooltip"`; s'affiche aussi au focus clavier, pas seulement au survol.

---

## Composants Belote — `table/` `score/` `bidding/` `devtools/`

### PlayingCard (`table/`)
Carte de Belote, face (rang + couleur) ou dos.
- **Variants** : `size sm|md|lg`, `faceDown`. **États** : `playable` (anneau gold + soulèvement), `winning` (lueur), `disabled` (atténuée), `raised`.
- **Props** : `rank?`, `suit?`, `size?`, `faceDown?`, `playable?`, `winning?`, `disabled?`, `raised?`, `onClick?`.
- **Tokens** : `--card-face`, `--card-red`, `--card-black`, `--card-back*`, `--glow-accent`, `--glow-win`, `--card-disabled`, `--r-card`.
- **A11y** : `aria-label` lisible (« A de cœur, jouable »); face cachée non focusable; `disabled` retire l'interaction.

### TableFelt (`table/`)
Tapis : 4 sièges N/E/S/O, pli central animé, panneau pli précédent, atout au centre.
- **Props** : `seats: FeltSeat[]`, `trick?`, `prevTrick?`, `atout?`, `children` (main du joueur).
- **Tokens** : `--felt*`, `--felt-rail`, `--felt-line`, couleurs de siège via `--team-*`.
- **A11y** : siège actif signalé par bordure **et** lueur (pas seulement couleur); chaque carte du pli reste un `PlayingCard` étiqueté.

### TeamBadge (`score/`)
Identicon 5×5 + couleur HSL dérivée du **nom du clan**. `teamColor(name)` = source de vérité.
- **Props** : `name`, `size?`, `showName?`, `points?`, `animate?`.
- **Tokens** : motif/couleur 100 % dérivés du hash → à brancher sur `--team-*-h/s/l`.
- **A11y** : `<svg role="img" aria-label="Clan {name}">`; ne jamais transmettre l'identité par la seule couleur — toujours le nom à côté quand il porte du sens.

### ScoreBoard (`score/`)
Bandeau équipe A · centre (manche + objectif) · équipe B, cumul live + brut de donne.
- **Props** : `teamA`, `teamB`, `target?`, `round?`, `rounds?`, `brut?`, `compact?`.
- **Tokens** : `--bg-2`, `--accent`, `--team-*`, `--font-display` (chiffres), `anim-score-tick`.
- **A11y** : variations de score annoncées via un live region côté app; l'équipe en tête a un point **+** le contraste de poids.

### RecapTable (`score/`)
Récap fin de partie : une ligne par donne, totaux de manche, vainqueur en gold.
- **Props** : `teamA`, `teamB`, `rows: RecapRow[]`, `winner? "a"|"b"`.
- **Tokens** : `--bg-2/3`, `--accent`, `--border-1/2`, `--font-mono` (chiffres tabulaires).
- **A11y** : vraie `<table>` avec `<thead>/<tfoot>`; en-têtes de colonne = équipes; le vainqueur n'est pas signalé que par la couleur (libellé « Victoire … »).

### BidBadge (`bidding/`)
Annonce : passe / contrat chiffré + couleur / contré / surcontré, teinté par équipe.
- **Props** : `kind pass|bid|contre|surcontre`, `value?`, `suit?`, `team? "a"|"b"`, `size?`, `animate?`.
- **Tokens** : `--bid-*`, relais `--team-*-soft/line` sur un contrat; couleur rouge des enseignes ♥♦.
- **A11y** : le texte porte l'info (« Contré ») — la couleur est un renfort, jamais le seul signal.

### AnnouncePopup (`bidding/`)
Popup auto-disparaissante sur le tapis : preneur, atout, contrat, contre.
- **Props** : `taker`, `team?`, `atout?`, `contract?`, `kind?`, `visible?`.
- **Tokens** : `--z-announce`, `--shadow-pop`, liseré `--team-*-line`, `anim-announce`.
- **A11y** : `role="status"` `aria-live="polite"`; **présentation pure**, ne déclenche aucune transition de moteur; sous `prefers-reduced-motion`, reste affichée sans glissement.

### AnnounceStream (`bidding/`)
Flux d'enchères chronologique coloré par équipe (panneau droit / historique).
- **Props** : `entries: AnnounceEntry[]`, `title?`.
- **Tokens** : `--bg-2`, point d'équipe `--team-*`, scroll interne.
- **A11y** : liste sémantique; pour les robots, badge texte « BOT » en plus de la couleur cyan.

### LogConsole (`devtools/`)
Console devtools : niveaux error→trace, filtres masquables, repliable, auto-scroll.
- **Props** : `entries: LogEntry[]`, `defaultHidden?`, `collapsible?`, `title?`.
- **Tokens** : `--log-bg`, `--log-gutter`, `--log-error|warning|info|debug|trace`, `--font-mono`.
- **A11y** : toggles de niveau en `aria-pressed`; les libellés ERR/WRN/INF doublent la couleur (daltonisme).

### ControlBar (`devtools/`)
Pilotage moteur : pause/play, step, vitesse 0.25×→12×, délais avant/après pli.
- **Props** : `playing?`, `speed?`, `delayBefore?`, `delayAfter?`, `onTogglePlay`, `onStep`, `onSpeed`, `onDelayBefore`, `onDelayAfter`.
- **Tokens** : `--bg-3`, `--spark` (vitesse + délais), `--border-2`.
- **A11y** : play/pause = un seul bouton à `aria-label` qui bascule; `step` désactivé pendant la lecture; vitesses = groupe de boutons (pas un slider, pour des paliers nets).
