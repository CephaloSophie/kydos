# Journal des versions — Belote Contrée

Chaque génération a un numéro. La version actuelle est affichée en haut à droite de l'app.

## v9.4.0 — Belote/Rebelote, annonces par siège animées, smileys, jetons sur les mains, fix resize (version actuelle)

### Moteur (belote-core)
- **Belote / Rebelote avec annonce optionnelle.** Détection corrigée (le MÊME joueur détient Roi + Dame
  d'atout) ; nouveau `setBeloteAnnounce(seat, on)` (refusé dès que la première carte de belote est
  jouée) ; **sans annonce, les 20 points ne comptent pas** ; annonce par défaut = OUI (les robots
  annoncent automatiquement). La vue expose `belote: { seat, announcing, playedCount }`. Tests dédiés.

### Table
- **Fix resize/agrandissement** : la scène se redessinait avec les données du PREMIER rendu (cartes
  d'une ancienne manche, faux pli à 4 cartes). Le handler resize appelle désormais toujours le rendu
  le plus récent (ref), plus jamais une closure périmée.
- **Annonces par siège** : chaque joueur a sa bulle à DROITE de ses cartes, au niveau du haut de la
  dernière carte, **animée depuis son logo** (300 ms). Pendant les enchères : la dernière action de
  chacun, « Passe » inclus ; ensuite ne restent que le contrat du preneur (valeur + atout coloré),
  COINCHÉ et SURCOINCHÉ. L'icône 💭 rejoint la bulle pendant sa fenêtre de 2 s. L'ancien badge sous
  la pilule est supprimé. Logique pure announceBubbles.ts couverte de tests.
- **Belote ! / Rebelote !** : bulle dorée temporaire (2,5 s) sur le porteur au moment où il joue le
  Roi puis la Dame d'atout (uniquement s'il annonce), même animation depuis le logo.
- **Bouton Belote** : apparaît en bas à droite (zone Coincher) dès que j'ai Roi + Dame d'atout,
  présélectionné ✓, basculable à tout moment, **disparaît dès que la première des deux cartes est
  jouée**.
- **Smileys** : barre 😂 😊 😢 🥂 en bas à droite, désactivée pendant les enchères ; le smiley choisi
  s'affiche à côté du joueur (3 s) avec l'animation depuis le logo.
- **Jetons D et E déplacés au-dessus des cartes de chaque joueur** (ancrés à l'éventail via ses
  métriques), plus sur la pilule.

Vérifs : typecheck 4 paquets + 63 tests web + 32 core + build + lib + démo moteur OK.

## v9.3.0 — Annonces ×10, feuille de cahier, animations du pli, panneau d'enchères refondu, fixes

### Moteur (belote-core)
- **Les annonces sont désormais toujours des multiples de 10.** La convention d'enchères arrondit ses
  signaux (151 → 150) tout en restant une surenchère légale, et le moteur REJETTE toute valeur non
  multiple de 10 (défense en profondeur). Tests dédiés (rejet 151/162/95/101, +10 minimum imposé).

### Table
- **Feutre** : rendu en vraie texture canvas (vrais dégradés radiaux + rail en dégradé vertical) —
  disparition de l'ellipse « circulaire » héritée de l'ancienne table.
- **Animations du pli** : la carte jouée GLISSE depuis la main de son joueur jusqu'à son emplacement
  (320 ms) — on voit qui a joué ; au ramassage, les 4 cartes se REGROUPENT en pile au centre (220 ms)
  puis filent vers le siège du GAGNANT en rétrécissant (450 ms), après une pause de lecture du glow.
- **Badge de contrat** : le symbole d'atout garde SA couleur (♥♦ rouges, ♠♣ noirs) sur le fond doré ;
  la valeur affichée est arrondie à la dizaine par défense.
- **Dernier pli** : MA carte a une ombre bleue distinctive (is-mine), la carte gagnante son style or.
- **Partenaire à l'envers** : en mode « jouer », la main du partenaire reste DOS visible même si les
  cartes adverses sont affichées (on ne voit jamais le jeu de son coéquipier).
- **Crash au zoom corrigé** : le listener resize est retiré au démontage et garde contre l'app détruite.

### Feuille de score (façon cahier)
- Vraie page de cahier (lignes bleues, marge rouge, bord déchiré, écriture Caveat) avec les CUMULS
  successifs en dizaines (500 → « 50 »), cellule vide quand l'équipe ne marque pas, **trait incliné à
  chaque millier franchi** (1 trait à 1000, 2 à 2000…), chiffre des milliers omis (1010 → « 01 »),
  total des manches gagnées en bas. Modèle pur scoreSheetModel.ts couvert par des tests (dont la
  feuille de référence complète).

### Panneau d'enchères (refonte)
- **Stepper de valeur [−] 110 [+]** : démarre à dernière annonce +10, monte jusqu'à 180 puis CAPOT.
- **Icônes seules** : 💭 réflexion sans texte ; icône « ↩ + couleur du coéquipier » active seulement
  s'il a dit une couleur, vide sinon.
- **3 actions fixes : Passe / Suivre / Demande.** Suivre = +10 avec la couleur de mon camp (la mienne,
  sinon répéter celle du coéquipier), sans réflexion ; désactivé si mon camp n'a pas dit de couleur.
  Demande = soumet exactement la sélection (couleur ou répéter, réflexion, valeur ou capot).
- **Taille du popup FIXE** : message d'aide constant (hauteur figée), boutons toujours au même endroit.
- Logique pure bidMath.ts blindée de tests : après une annonce de 110, 90/100/110 indisponibles et
  120→180 + capot disponibles ; bornes du stepper ; règles de Suivre.

### Entraînement v2
- La console (DevDock) scrolle : colonne latérale bornée en hauteur et collante.

Vérifs : typecheck 4 paquets + 56 tests web + 29 core + build + lib + démo moteur OK.

## v9.2.0 — Entraînement v2 : layout table + console, notifications bas-gauche, réflexion 2 s

### Table (module table-pixi)
- **Notifications (toasts) déplacées en bas-gauche du feutre** — elles ne recouvrent plus la station
  nord ni sa main. Toast et récap d'annonces sont empilés dans un même bloc (.px-bl-stack, toast
  au-dessus du récap).
- **Réflexion (💭) affichée 2 secondes puis masquée** : le marqueur apparaît sur le badge du siège et
  dans le récap au moment de l'annonce réfléchie, puis disparaît automatiquement (chaîne
  TableHud → PixiTable → TableScene → buildSeatModels, paramètre showReflexion).

### Entraînement v2 (web/src/pages/TrainingV2.tsx)
- Plus de plein écran forcé : retour au layout de la v1 — la table à gauche, **console + logs
  (DevDock) à droite**, ControlBar sous la table, Recap en fin de partie.
- La table vit dans une **section dédiée (.tv2-wrap)** : marge haute 200 px et marge gauche 50 px
  réservées au futur HUD spécial, matérialisées par deux zones prêtes à recevoir du contenu
  (.tv2-hud-top et .tv2-hud-left). Le canvas est dans .tv2-stage (hauteur responsive, coins arrondis).
- Thème (locale/VIP/compétition) et visibilité des cartes adverses changeables EN COURS de partie.
- Boutons Relancer / Quitter / Sauvegarder le rejeu dans la barre du haut.

Vérifs : typecheck 4 paquets + 35 tests web + 27 core + build + démo moteur OK.

## v9.1.0 — Entraînement v2 : la nouvelle table (design system) branchée sur le moteur local

Nouvelle page « Entraînement v2 » (route /training-v2, lien dans la barre) pour tester la table Pixi v9
dans les conditions réelles de l'entraînement.

### Page TrainingV2 (web/src/pages/TrainingV2.tsx)
- MÊME moteur, mêmes robots, même boucle (planStep, vitesses, pauses donne/manche, sauvegarde
  automatique du rejeu) que l'entraînement v1 — seul le rendu change.
- Écran de configuration : mode (regarder 4 robots / jouer siège A), manches, sens du jeu,
  **thème de table (locale / VIP / compétition)** et **visibilité des cartes adverses (visibles / dos)**.
- Une fois lancé : table Pixi PLEIN ÉCRAN, ControlBar superposée en bas (pause, pas-à-pas, vitesse,
  délais), bandeau de fin de partie (vainqueur, rejeu, retour). Quitter via le menu ☰ de la table.
- Mode « regarder » : pas de panneau d'enchères (aucun humain) ; mode « jouer » : enchères + jeu au
  siège A avec cartes légales surlignées.

Vérifs : typecheck 4 paquets + 35 tests web + 27 core + build + démo moteur OK.

## v9.0.0 — Table Pixi : implémentation du design system officiel (thèmes local / VIP / compétition)

Implémentation fidèle du design system livré via Claude Design (handoff zip) : tokens, composants,
3 thèmes. Le design system devient la source de vérité visuelle de la table.

### Thèmes (theme.ts)
- 3 thèmes : **local** (vert chaud + acajou), **vip** (émeraude + or), **competition** (navy + argent).
- Tokens --table-* du DS exposés au HUD HTML (themeCssVars + data-theme). registerTheme/themeWith conservés.
- API : theme?: 'local'|'vip'|'competition' + themeOverrides (remplace template/theme).

### Cartes (cardAtlas.ts + CardSprite.ts)
- Spec DS : 68×96 r10, face blanche, coins Manrope 800 14/12, pip central Playfair Display 900 42px,
  dos indigo dégradé + rayures blanches 45° clippées, bordure blanche.
- Atlas UNIQUE 3× DPR (cartes invariantes par thème), polices chargées avant rasterisation.
- États DS : jouable (ring accent), non jouable (désaturée), hover (+14px), gagnante (ring + halo).

### Scène
- Éventails en arc (rot ±3°/carte, montée parabolique, overlap 32), groupes rotés par siège, inset 62px.
- Stations : pilule dégradée, logos d'équipe (bleu dégradé / jaune damier), chips D/E 20px au coin
  haut-droit, badge contrat sous la pilule, chip M du meneur.
- Feutre : rail dégradé + anneau, feutre radial + vignette, filigrane Playfair 240px + coins.
- Pli : boîte 220, cartes orientées, ramassage 140px.

### HUD (classes ky-* du DS)
- Feuille de score déchirée (Caveat) + menu ☰ en haut-droite sur le rail ; toast pilule ; dernier pli ;
  récap ; panneau d'enchères 340px ; ✕ Coincher ; popup Surcoincher ; popup fin de manche avec chrono.
- Vocabulaire DS : « coincher / surcoincher ».

### Démo
- Table plein page = UN composant (canvas + HUD intégré). Sélecteur de thème = seul élément externe.
- Raccourcis : b (popup enchère), o (adverses), r (redistribuer), t (atout).

Vérifs : typecheck 4 paquets + 35 tests web + 27 core + build app + lib + démo moteur OK.

## v8.4.0 — Table Pixi : cartes en SPRITES (atlas de textures 2D), rendu net, plein écran

Changement d'approche : les cartes deviennent de VRAIS sprites depuis un atlas de textures pré-rendues,
au lieu d'être dessinées à la main en primitives Pixi (cause du rendu « encre qui coule »).

### Atlas de cartes (scene/cardAtlas.ts)
- Les 32 cartes + le dos rendus UNE FOIS sur des canvases 2D nets (3× DPR) avec clip() arrondi — plus
  aucun débordement du motif hors de la carte. Convertis en Texture Pixi.
- Couleurs + police pilotées par le TEMPLATE (face/liseré/rouge/noir/dos/motif). Atlas reconstruit
  seulement au changement de template.

### Sprites (scene/CardSprite.ts)
- Chaque carte à l'écran = un Sprite de l'atlas : net à tout zoom, centré au pixel près. Surlignage
  jouable / lueur gagnante dessinés SOUS la carte (aucun contour sur l'illustration).

### Jetons (scene/tokenTexture.ts)
- D/E rendus comme de vraies textures de jetons de poker (disque cranté + anneau + lettre) — propres.

### Corrections
- Table PLEIN ÉCRAN : insets quasi nuls, le feutre remplit la page.
- Rotation ouest/est corrigée (clamp vertical) : les mains latérales ne débordent plus.
- Ancien CardView (dessin main) supprimé.

### Démo
- UN SEUL composant Pixi plein page ; le sélecteur de templates est le seul élément hors Pixi.
- Bascule adverses dos/face/cachées, atout, redistribuer.

Vérifs : typecheck 4 paquets + 43 tests web + 27 core + build app + lib + démo moteur OK.

## v8.3.0 — Table Pixi : design refait fidèle au DOM (parité exacte positions/tailles/tokens)

Refonte totale du design suite aux retours : relecture ligne par ligne du DOM (GameTable.tsx, belote-table.css,
design-tokens.css, PlayingCard.jsx, PlayerHand.tsx, TableChrome.tsx, JetonAnnonce.jsx).

### Parité exacte avec le DOM
- **Une seule taille de carte pour TOUTES les mains** (DOM : .pcard.sm 30×42) — adversaires et joueur
  utilisent la même taille, scalée par la hauteur du feutre. Fini la différence de taille.
- **Stations DANS le feutre** (DOM: bottom:8px/top:8px/left:10px/right:10px), plus à l'extérieur.
- **Stations ouest/est ROTÉES** ±90° (DOM: rotate(90deg)/-90deg) — le nom se lit verticalement.
- **Trick : DOM slot offsets exacts** (south: -50%,18px / north: -50%,-78px / west: -92px,-30px / east: 28px,-30px).
- **Surlignage jouable** = glow doré concentrique (DOM: box-shadow var(--glow-accent)) sans cadre.
- **Cartes atout** par template (felt.atoutColor) — même opacité que le DOM (0.09).
- **HUD CALÉ dans le feutre** via --px-felt-x/y/w/h (popup à top:40%, toast top-right, dernier pli
  top-left, annonces bottom-left, contre bottom-right, feuille de score top-right) — rien ne sort.
- **Rendu net** : devicePixelRatio réel, resynchronisé à chaque zoom.

### CSS restructuré (par fichier)
- styles/table.css, hud.css, panel.css, scoresheet.css, compact.css
- Toutes les overlays pointées via calc(var(--px-felt-*)).

### Démo
- Barre de démo EN BAS AU CENTRE (aucune collision avec la table).
- Sélecteur de templates, bascule adverses, popup, plein écran, redistribuer.

Vérifs : typecheck 4 paquets + 43 tests + build + lib + démo moteur OK.

## v8.2.0 — Table Pixi : design refait de zéro

Refonte design complète suite aux retours (contours jaunes, débordements, flou au zoom, traits parasites,
robots sur les cartes).

### Corrections structurantes
- **Stations HORS du feutre** (sud dessous, nord dessus, ouest/est à côté, ancrage borné à l'écran) :
  les robots/joueurs ne cachent PLUS JAMAIS les cartes.
- **HUD calé DANS le feutre** : PixiTable publie --px-felt-x/y/w/h en variables CSS ; popup d'enchère
  (centrée DANS le feutre, largeur bornée), feuille déchirée (haut-droite DU FEUTRE), dernier pli
  (haut-gauche DU FEUTRE), récap d'annonces et toast — plus rien ne sort de la table.
- **Netteté au zoom** : résolution Pixi = devicePixelRatio réel NON plafonné, resynchronisée à chaque
  resize/zoom — écriture et cartes nettes à tout zoom.
- **Contour jouable** : cadre jaune supprimé — liseré BLANC fin + halo doux (thémable card.highlight).
- **Jetons propres** : D bleu / E rouge plats (disque + anneau interne) — les traits rouges/bleus
  parasites (arcs pointillés) sont supprimés.
- **Tout proportionnel** : sceneScale(hauteur feutre) appliqué à toutes les tailles (pilules, polices,
  jetons, badges, filigranes, marges, pli) — helper exporté et testé.
- Filigrane d'atout par template (felt.atoutColor) pour la lisibilité sur chaque feutre.

### Vérifs
- 70 tests (27 core + 43 web), typecheck 4 paquets, builds app + lib, démo moteur OK.
- demo/table-pixi-demo.html régénérée : stations dehors, HUD calé feutre, DPR net, sélecteur de templates.

## v8.1.0 — Table Pixi : multi-templates, feuille déchirée, cartes redessinées, anti-débordement

Passe design profonde basée sur les captures de l'ancienne table (référence assumée : faire aussi bien, puis mieux).

### Multi-templates (nouveau système)
- `themes/` : templates NOMMÉS et COMPLETS — classic (feutre vert casino + rail bois), cosmos (bleu spatial),
  olympus (ardoise + rail doré) — le trio de la table DOM. Un template = theme Pixi complet + hudVars
  (variables CSS) pour que le HUD HTML suive le même thème. Registre extensible : registerTemplate()/
  getTemplate()/listTemplates(), testé. `<PixiTable template="cosmos" theme={{...}} />` : surcharges fines
  fusionnées PAR-DESSUS le template (mergeThemeOnto, section par section, testé).

### Styles structurés
- CSS découpé par domaine dans `styles/` : table.css, hud.css, cards.css, panels.css, scoresheet.css,
  compact.css — tous pilotés par les variables du template. Fini le CSS monolithique.

### Feuille de score « papier déchiré »
- La ScoreView du DOM (papier déchiré, manuscrit stylo bleu, cumuls belote) RÉUTILISÉE telle quelle dans le
  HUD Pixi, épinglée EN HAUT À DROITE comme sur la photo (prop showScoreSheet, défaut true). Feuille
  détaillée toujours via le menu.

### Cartes & sièges redessinés
- CardView : ombre portée, coins proportionnels (rang + enseigne, coin bas-droit INVERSÉ), grande enseigne
  centrale — typographie proportionnelle à la carte (nette à toute taille).
- Jetons façon JETONS DE POKER (D bleu / E rouge, anneau pointillé) comme le DealerToken DOM ; badge de
  contrat SOMBRE « 90 ♠ » à côté du preneur, comme la photo ; pilules de sièges arrondies.

### Anti-débordement (zoom / petites tailles)
- fitSpacing : chaque éventail garantit espacement×(n−1)+carte ≤ espace dispo — plus AUCUNE carte ne sort
  du cadre, quel que soit le zoom navigateur ou la taille d'écran. Cartes adverses et décalage du pli
  rescalés avec le feutre.

### Vérifs
- 69 tests (27 core + 42 web dont registre de templates + fusion), typecheck 4 paquets, builds app + lib,
  démo moteur OK. `demo/table-pixi-demo.html` régénérée avec SÉLECTEUR DE TEMPLATES (Classique/Cosmos/
  Olympe), nouvelles cartes, feuille déchirée, éventails bornés.

## v8.0.1 — Table Pixi v8 : parité complète avec la table DOM, architecture clean, mobile plein écran

Refonte MAJEURE du module table-pixi : comportement à PARITÉ avec l'ancienne table DOM (GameTable),
branché sur le même moteur/robots/cerveaux (belote-core intact), design fixé, téléphone en plein écran
paysage, architecture modulaire (un composant par fichier).

### Architecture (web/src/table-pixi/)
- `scene/` : couches Pixi sans logique de jeu — TableScene (orchestration), FeltLayer (rail + feutre +
  atout central ET coins), SeatsLayer (stations au bord intérieur du feutre), HandsLayer (4 mains DANS le
  feutre), TrickLayer (pli + ANIMATION DE RAMASSAGE vers le gagnant), CardView, LogoView.
- `hud/` : composants HTML séparés — TableHud (assembleur), BidPanel, ContreControls, AnnouncesList,
  LastTrickPanel, ScoreSheet, TableMessagePopup, MenuButton.
- `fullscreen.ts` (plein écran + orientation lock), `handSort.ts`, `layout.ts`, `theme.ts` (tout paramétrable).

### Parité de comportement avec la table DOM (analysée fichier par fichier)
- Sièges : logo d'ÉQUIPE identicon (paire de noms, comme le DOM), nom 4 lettres, jetons D/E fixes,
  ▲ meneur volatil (masqué pendant le ramassage), bulle de demande (couleur SEULEMENT si nommée),
  demande retenue du preneur pendant le jeu après 2 s (enseigne de l'atout), contre/surcontre PERSONNELS.
- Mains : sud triée (atout d'abord) cliquable avec cartes non jouables GRISÉES à ton tour ; nord
  horizontale ; ouest/est PIVOTÉES ±90° le long du feutre ; adverses en dos/face/cachées (configurable).
- Pli : lueur dorée sur la carte gagnante en attente + animation de ramassage (~550 ms) vers le gagnant.
- HUD : notification après chaque annonce (5 s), récap des 4 dernières annonces + contrat (jusqu'à la
  1re carte), dernier pli, popup enchère centrée (Répéter/Réflexion/paliers/Capot/Passe — payloads DOM),
  Contrer instantané + popup Surcontrer, popup inter-manche avec compte à rebours 5 s, popup fin de
  partie, feuille de score via le menu.
- buildSeatModels : la logique de parité extraite en fonction PURE, couverte par 6 tests.

### Téléphone
- Plein écran + verrouillage paysage (menu ☰ → Plein écran, bouton aussi sur l'écran de rotation).
- Styles compacts en paysage bas (≤480 px). Portrait : écran « tourne ton téléphone ».

### Vérifs
- 64 tests (27 core + 37 web, commentés en anglais), typecheck 4 paquets, build app + lib, démo moteur OK.
- `demo/table-pixi-demo.html` régénérée : layout v8 fidèle + bouton « Gagnant+ramasser » pour tester
  l'animation, bascule adverses, feuille de score, plein écran. S'ouvre seule sans serveur.

## v7.2.0 — Table Pixi : refonte design calée sur le tapis (cartes, adversaires, jetons, score)

Passe design majeure du module table-pixi, basée sur l'analyse de l'ancienne table DOM.

### Mise en page calée sur le tapis (corrige les collisions)
- Tout est positionné PAR RAPPORT au rectangle du tapis (tableRect), plus aux bords de l'écran : stations
  joueurs (logo + nom + jetons) HORS du rail, éventails de cartes JUSTE à l'intérieur du feutre, pli au
  centre. Fini les collisions et la main collée en bas de l'écran.

### Cartes
- Taille RÉDUITE et configurable (proche de l'ancien .pcard.sm) : card.width/height plus petits, bornes
  responsive minWidth/maxWidth, opponentWidth dédié — tout paramétrable à l'init via le thème.
- Main du joueur TRIÉE (atout d'abord puis couleurs alternées) via displaySort (porté du DOM).

### Cartes adverses (configurable)
- `opponentCards: 'hidden' | 'back' | 'faceup'` — prop <PixiTable opponentCards=...> ou theme.opponentCards.
  back = dos + compte ; faceup = vraies cartes (mode entraînement robot) ; hidden = rien.
  StandalonePixiTable passe désormais TOUTES les mains et accepte opponentCards (défaut back).

### Jetons & feuille de score
- Jetons D (donneur), E (entame) et ▲ MENEUR (vert) sur le joueur dont c'est le tour (manquait avant).
- Feuille de score accessible via le menu (☰ → Feuille de score).

### Popup d'enchère
- Modale CENTRÉE au milieu avec fond estompé (.px-modal-backdrop) — plus aucune collision visuelle.

### Code, tests, démo
- Nouveaux helpers PURS testés (commentés en anglais) : handSort.ts (suitOrder/displaySort) + handSort.test.
- theme.ts enrichi (opponentWidth, opponentCards, tailles réduites). TableScene réécrit (couches calées tapis
  + OpponentsLayer). Total : 58 tests (27 core + 31 web).
- demo/table-pixi-demo.html RÉGÉNÉRÉE : reflète la nouvelle mise en page, avec bascule Adverses (dos/face/cachées),
  feuille de score, popup modale. S'ouvre seule dans un navigateur (Pixi via CDN), sans relancer l'app.

Vérifs : typecheck (4 paquets) + 58 tests + build app + build lib + démo (vainqueur A) OK ; syntaxe démo validée.

## v7.1.0 — Table Pixi : design retravaillé (table rectangulaire, logos, cartes responsive) + démo HTML

Passe design du module table-pixi + démo autonome.

### Design
- **Popup d'enchère centrée** au MILIEU de l'écran (modal), au lieu d'être collée en bas.
- **Table rectangulaire arrondie** (façon vraie table de cartes, comme l'ancienne table DOM) au lieu d'un
  ovale : rail (bois) + feutre + halo central doux. Helper `tableRect` (rectangle arrondi centré, inset, coins).
- **Logos des joueurs** : nouveau `LogoView` — identicon algorithmique (hash du nom → couleur HSL → identicon
  5×5 symétrique), identique au TeamBadge du DOM, dessiné en Pixi. Affiché au-dessus de chaque siège.
- **Cartes responsive** : `responsiveCardWidth` calcule la largeur des cartes selon la place dispo (bornes
  min/max), recalculée à chaque rendu/resize ; main et pli utilisent ces dimensions.

### Code & paramétrage
- `layout.ts` : helpers PURS (hashName, teamHsl, hslToHex, teamColorHex, responsiveCardWidth, tableRect),
  commentés en anglais, testés.
- `theme.ts` enrichi : felt (rectangle arrondi : insets, coins, rail, halo), card (bornes responsive
  minWidth/maxWidth), seat (avatarSize). Tout reste paramétrable via `<PixiTable theme={...} />`.
- Couches mises à jour (FeltLayer rectangulaire, SeatsLayer avec logo, Trick/Hand avec cartes responsive).

### Tests (commentés en anglais)
- `layout.test.ts` (7) : déterminisme du hash, conversion HSL→hex, bornes responsive, géométrie de la table.
- `theme.test.ts` (3) conservés. Total : 56 tests (27 core + 29 web).

### Démo autonome
- `demo/table-pixi-demo.html` : page HTML AUTONOME (Pixi via CDN) qui reproduit fidèlement le rendu du module
  (CardView, couches, LogoView) + le HUD (même CSS) sur un état de jeu représentatif. S'ouvre seule dans un
  navigateur, sans relancer l'app. Barre de contrôle : redistribuer, atout, popup, vider le pli.

Vérifs : typecheck (4 paquets) + 56 tests + build app + démo (vainqueur A) OK ; syntaxe de la démo HTML validée.

## v7.0.2 — Table Pixi : correction du crash removeChildren + thème entièrement paramétrable

### Correction
- **RangeError « removeChildren: numeric values are outside the acceptable range »** : CardView n'utilise
  plus removeChildren(index) (hors plage quand seuls le halo + le corps existaient). Les textes/symboles
  vivent dans un conteneur dédié vidé proprement (`content.removeChildren()`), sûr même vide.

### Tout est configurable par paramètres (thème)
- Nouveau module `theme.ts` : `PixiTableTheme` couvre TOUT le visuel — background de la table, police, tapis
  (couleur, bordure, rayons, opacité/affichage de l'atout), cartes (face/dos/bordures, rouge/noir,
  surbrillance, dimensions), sièges (couleurs d'équipe, surbrillance du meneur, marge), bulles d'enchère
  (normales et contrées), décalage du pli. `defaultTheme()` + `mergeTheme()` (fusion profonde).
- `<PixiTable theme={...} showMenu forceLandscape />` : le thème est fusionné avec les défauts (tout champ
  omis prend sa valeur par défaut) ; le `background` est appliqué au conteneur ; CardView, FeltLayer,
  SeatsLayer, AnnouncesLayer, TrickLayer, HandLayer consomment le thème (plus aucune couleur en dur).
- `StandalonePixiTable` propage `theme` / `showMenu` / `forceLandscape`.
- Tests : `theme.test` (3, fusion profonde). Total : 50 tests (27 core + 23 web). Doc thème ajoutée.

Vérifs : typecheck (4 paquets) + 50 tests + build app + démo (vainqueur A) OK.

## v7.0.1 — Table de jeu migrée vers PixiJS v8 (rendu canvas), module autonome

Migration de la TABLE DE JEU vers un rendu canvas PixiJS v8, à COMPORTEMENT IDENTIQUE.
Le moteur, les robots, le RobotContext, les actions et l'EngineView (partagés via belote-core) sont
INCHANGÉS — seul le rendu change. Nouveau module autonome `web/src/table-pixi/` (code + styles).

### Rendu
- Plateau en Pixi (canvas/WebGL), dessin 100% vectoriel (aucune image) : tapis + glyphe d'atout, sièges
  (nom + jetons donneur/entame, surbrillance du meneur), pli courant, bulles d'enchère, main en éventail
  avec cartes cliquables (halo de jouabilité).
- Scène décomposée en couches AUTONOMES (FeltLayer, SeatsLayer, TrickLayer, AnnouncesLayer, HandLayer) —
  séparation stricte, aucune logique de jeu dans le rendu.
- CardView : carte (face/dos) en Graphics + Text.

### Contrôles (surcouche HTML sur le canvas)
- TableHud : popup d'enchère (couleurs, répéter la couleur du partenaire, réflexion, paliers 90→180, capot,
  passe), bouton Contrer, popup Surcontrer, NOTIFICATION après chaque demande, popup ENTRE DEUX MANCHES,
  FEUILLE DE SCORE, et une ICÔNE MENU (quitter la table + extensible pour de futures actions).
- Mêmes payloads onBid/onPlay que la table DOM : comportement identique.

### Responsive & rotation forcée
- Canvas auto-redimensionné, scène relayoutée au resize. PC / tablette : pleine surface.
- Téléphone en PORTRAIT : HUD masqué + écran « Tourne ton téléphone à l'horizontale pour jouer » —
  l'utilisateur doit passer en paysage. Styles compacts sous 460px de hauteur.

### Intégration
- PixiTable = drop-in : mêmes props que GameTable (+ onLeave pour le menu). StandalonePixiTable branche le
  MÊME LocalTableEngine. Nouvelle route /table-pixi (la table DOM reste sur /table-demo, rien cassé).
- Dépendance : pixi.js ^8. Doc : docs/table-pixi/README.md.

Vérifs : typecheck (4 paquets) + 47 tests + build app + démo (vainqueur A) OK.
Note : les composants Pixi exigent un canvas/WebGL (navigateur), donc non couverts par des tests unitaires node.

## v6.2.0 — Éditeur de cerveau : bugs corrigés, helpers via this, décomposition + JSON

Corrections de fond + architecture de l'éditeur de cerveau.

### Bugs corrigés
- **`Identifier 'bid' has already been declared`** : les helpers (bid/play/log/helpers) ne sont plus injectés
  comme PARAMÈTRES mais exposés via `this`. Plus aucune collision : le scripteur peut déclarer `const bid`.
  Le bac à sample lie `this` (helpers + appels croisés this.maFonction(ctx)).
- **Code généré non exécutable** : la classe générée définit désormais elle-même ses helpers (bloc helpers
  inséré). Le `.ts` téléchargé est AUTONOME et tourne tel quel dans le moteur (registerAlgorithm).
- **Constantes mutées** : les corps par défaut clonent avant tri — `[...legal].sort(...)` — donc plus de
  mutation de ctx.legalCards. HELPERS_REFERENCE et SNIPPETS préfixés `this.`.
- **Insertion à la fin** : cliquer un élément de la toolbox insère AU CURSEUR du panneau principal
  (dispatch CodeMirror sur la sélection), repli sur l'ajout en fin si pas de focus.

### Architecture — décomposition + tout en JSON (norme KANTO APLO)
- `editorDescriptor.ts` : l'éditeur décrit PAR DES DONNÉES — EDITOR_LAYOUT (panneaux), TOOLBOX_DESCRIPTOR
  (sections), RETURN_COLORS (couleur par type mappée sur Hermès/Synergos/Logos/Mantis), describeBrain,
  describeProject, describeEditor (snapshot complet sérialisable `kanto-aplo/brain-editor@1`).
- Composants autonomes sous `components/` : `ConsolePanel` (présentationnel, sans état, props uniquement),
  barrel `index.ts`. La page devient un assembleur.
- Tests : `editorDescriptor.test` (3). Total : 47 tests (27 core + 20 web).

### Documentation
- `docs/brain-editor/05-editeur-interne.md` : helpers via this, insertion au curseur, décomposition,
  descripteur JSON, invariants. README de la doc éditeur mis à jour.

Vérifs : typecheck (4 paquets) + 47 tests + build app + build librairie + démo (vainqueur A) OK.

## v6.1.0 — Outillage serveur : PM2, TNR (Postman + OpenAPI), README d'installation

Tout pour installer, lancer et tester le serveur proprement.

### PM2 (lancement pro)
- `ecosystem.config.cjs` à la racine : 4 process — `belote-api` (backend prod), `belote-api-debug`
  (inspector :9229 + watch + logs debug), `belote-web` (preview du build), `belote-web-dev` (HMR).
  Logs dans `logs/`, autorestart, max_memory_restart, prêt pour `pm2 save && pm2 startup`.

### TNR — dossier server/tnr/
- `belote-api.postman_collection.json` : collection Postman complète (49 requêtes, 10 dossiers) couvrant
  TOUTES les API. Login enregistre {{token}} automatiquement ; les créations enregistrent les IDs réutilisés.
- `env.local.…` / `env.vps.…` : deux environnements Postman (local + VPS) avec toutes les variables.
- `openapi.json` : spec OpenAPI 3 (39 chemins, 49 opérations) à visualiser dans Swagger UI / Redoc.
- `tnr/README.md` : mode d'emploi (Postman, Newman, Swagger, Redoc).

### Configuration & documentation
- `server/.env.example` : toutes les variables réelles documentées (PORT, MONGO_URI, USE_MEMORY_DB,
  JWT_SECRET, CORS_ORIGIN, LOG_LEVEL).
- README racine : nouvelle section « Installation & lancement » (prérequis, local pas-à-pas, build prod,
  déploiement VPS avec PM2, tableau des variables d'env, TNR).
- `docs/DEPLOYMENT.md` : guide de déploiement complet (PM2, exemple Nginx reverse proxy + WebSocket, TLS
  certbot, mise à jour, dépannage).
- `docs/API.md` : ajout du module Cerveaux (Brains) + renvoi vers le dossier tnr/.

Aucun changement du code applicatif (outillage + docs). Vérifs : typecheck (4 paquets) + 44 tests + démo OK ;
les 4 fichiers JSON du TNR sont validés.

## v6.0.0 — Version majeure : contrat stable, design Cosmos, table modulaire

Version majeure consolidant les trois axes — architecture, design, qualité.

### Architecture — contrat public figé
- `belote-core` expose désormais une SURFACE PUBLIQUE STABLE (SemVer) : `PUBLIC_CONTRACT.md` liste les
  symboles garantis (moteur, règles, score, AlgoSpec, Agent, RobotAlgorithm, registre, conventions).
  Tout retrait/changement de signature ⇒ version majeure. Le point d'entrée core est annoté en conséquence.
- Garanties actées : pureté (pas de réseau/DOM/stockage), portabilité local↔serveur identique, extensibilité
  par `registerAlgorithm` (cerveau custom branché par `AlgoSpec.name`).

### Design — identité Cosmos (galaxie)
- Nouvelle couche visuelle `styles/cosmos.css` (additive, sans réécrire les composants) : fond spatial global
  (nébuleuses gold/violet/bleu rappelant l'écosystème + champ d'étoiles animé, respect de prefers-reduced-motion),
  barre de navigation en verre dépoli avec filet et halo gold, onglet actif marqué d'une étoile, version-badge.
- Cohérent avec la métaphore solaire de KANTO APLO (étoile + planètes-éditeurs).

### Qualité — table modulaire (refacto étape 2/2) + tests
- Décomposition de GameTable poursuivie : nouveaux composants AUTONOMES sous `table/parts/` —
  `FeltBackdrop` (décor/atout du tapis), `TableToast` (notification), `PlayerSeat` (siège présentationnel :
  jeton + logo + annonce). GameTable passe sous 382 lignes, devient un assembleur.
- Composants réexportés par le module table (réutilisables via @kanto-aplo/belote-table).
- Tests : `TableChrome.test` (5) ; pattern vitest élargi aux .tsx. Total : 44 tests (27 core + 17 web).

Vérifs : typecheck (4 paquets) + 44 tests + build app + build librairie + démo (vainqueur A) OK.

## v5.24.0 — Documentation de l'éditeur de cerveau (module, fonctionnel, archi, conception, README)

Suite documentaire complète de l'éditeur de cerveau, dans `docs/brain-editor/` :

- README.md — présentation, démarrage rapide, principe clé, index des documents.
- 01-module.md — document MODULE : chaque fichier (front + serveur), son rôle, ses exports, ses dépendances,
  graphe de dépendances.
- 02-fonctionnel.md — document FONCTIONNEL : disposition de l'écran, fonctionnalités par zone, 6 cas d'usage,
  règles de comportement.
- 03-architecture.md — document ARCHITECTURE : vue en couches, flux (test, contexte, génération, persistance),
  modèle de données, API REST, intégration au système de robots, schémas ASCII.
- 04-conception.md — document CONCEPTION : 7 décisions structurantes (avec alternatives écartées), modèles de
  données, conventions de génération, limites assumées, évolutions possibles.

Aucun changement de code applicatif (documentation seule). Vérifs : typecheck (4 paquets) + 39 tests + build + démo OK.

## v5.23.0 — Éditeur de cerveau : console par fonction, contexte+AlgoSpec en JSON éditable

Affinages de l'IDE selon les retours :

### Console PRIVÉE à chaque fonction
- Les logs et le résultat sont désormais indexés PAR fonction (chaque fonction a sa propre console),
  avec un sélecteur de fonction dans la barre de la console. « Vider » ne vide que la console de la fonction visée.
- Console MINIMISÉE par défaut. Actions en ICÔNES : 🗑 (vider cette console), ▾/▴ (réduire/ouvrir).
- La console ne couvre plus la toolbox : nouvelle structure (toolbox pleine hauteur à gauche, colonne
  principale à droite = éditeurs + contexte PUIS console en dessous, uniquement sous cette zone).

### Contexte complet + AlgoSpec en JSON éditable
- Nouveau panneau « Contexte complet (JSON) » (CodeMirror, coloré) : affiche le contexte d'aperçu COMPLET
  (main, personnalité, AlgoSpec, table, annonces, légalité) beautifié.
- Éditable : bouton « ✓ Appliquer » → le JSON modifié impacte DIRECTEMENT tout l'existant (cartes affichées,
  réglages, personnalité, et l'AlgoSpec utilisée par l'aperçu). Boutons « ↻ recharger » et « défaut ».
- L'AlgoSpec par défaut (génome) est désormais portée par le contexte et modifiable ; on peut utiliser celle
  par défaut ou la sienne. Module previewContext enrichi (defaultSpec, contextToJson, applyContextJson).

Vérifs : typecheck (4 paquets) + 39 tests + build app + démo (vainqueur A) OK.

## v5.22.0 — Éditeur de cerveau : projets versionnés, persistance serveur + localStorage

Persistance complète de l'éditeur de cerveau + refacto en couches dédiées.

### Backend — module brain (collection MongoDB)
- Nouveau module serveur `server/src/modules/brain/` (model + service + controller + routes + index), monté en une
  ligne dans le registre, structuré comme les autres domaines.
- Modèle BrainProject : un projet = un titre + PLUSIEURS versions. Chaque version porte le nom du cerveau, les
  fonctions (clé/params/retour/corps/custom), le CODE généré en TEXTE, et les réglages d'aperçu.
- API REST : liste, get, create (avec V-1.0.0 par défaut), updateVersion, addVersion (incrémente V-1.x.0,
  copie l'active), switchVersion (version active), clone (projet entier), delete. Toutes sous authentification.

### Frontend — persistance + refacto
- `brainStore.ts` : types, (dé)sérialisation modèle↔version, client API (repli silencieux hors-ligne),
  et localStorage (brouillon courant anti-perte).
- `useBrainProjects.ts` : hook qui orchestre la liste de projets, les versions, l'autosave LOCAL (source de
  vérité dans le navigateur) et la SYNC serveur best-effort. Local-first : tout marche hors-ligne.
- Barre de projets : sélecteur de projet, nouveau / cloner / supprimer ; sélecteur de VERSION + « ＋ version » ;
  « 💾 Sauvegarder serveur », « ↻ liste serveur », chargement depuis le serveur ; indicateur de sync
  (● local / ⏳ / ✓ serveur / ⚠ hors-ligne).
- Autosave localStorage (débounce 500 ms) : on ne perd pas le travail en quittant. Au montage, un projet
  « Cerveau 1 » en V-1.0.0 est créé si aucun n'existe. Changer de version recharge l'éditeur sans écraser la saisie.

Vérifs : typecheck (4 paquets) + 39 tests + build app + build librairie + démo (vainqueur A) OK.
Note : MongoDB non joignable dans le sandbox — module serveur validé par typecheck strict ; le front fonctionne
en local (localStorage) et bascule sur l'API quand le serveur tourne.

## v5.21.0 — Éditeur de cerveau : édition du nom et des paramètres des fonctions custom

Suite de l'IDE : on peut désormais RENOMMER une fonction personnalisée et changer sa SIGNATURE.

- Bouton ✎ sur chaque fonction custom → formulaire inline : nom, paramètres (ex. « ctx, card »),
  type de retour (any / boolean / number / BidDecision / CardDecision).
- Renommage propre : le corps suit le nouveau nom, les panneaux gauche/droite et le code généré sont
  mis à jour automatiquement ; collisions de noms évitées (suffixe _).
- Les paramètres déclarés sont respectés dans le code généré ET dans le bac à sable (les noms réservés
  ctx/log/bid/play/helpers sont filtrés pour éviter les doublons de paramètres).

Ainsi une fonction custom peut prendre de vrais arguments et être appelée depuis une autre :
this.scoreCarte(ctx, carte) → number, etc.

Vérifs : typecheck (4 paquets) + 39 tests + build app + démo (vainqueur A) OK.

## v5.20.0 — Éditeur de cerveau → IDE (console, split, fonctions custom, thème noir)

L'éditeur de cerveau (/brain-editor) devient un mini-IDE inspiré d'IntelliJ/VS Code.

### Console en bas (style inspecteur Chrome)
- Onglets Logs / Info / Erreurs / Objet, avec compteurs ; minimisable (▾ réduire / ▴ ouvrir) ; bouton vider.
- Les logs sont structurés (niveau + catégorie + message + données objet dépliées en JSON).
- L'onglet « Objet » affiche le retour de la dernière exécution (la décision) ; « Erreurs » isole les erreurs runtime.

### Fonctions personnalisables
- Bouton « ＋ ajouter » : crée une fonction custom (nom unique auto), elle apparaît dans la toolbox « Fonctions ».
- Chaque fonction se teste SEULE (▶) et est appelable depuis les autres via this.maFonction(ctx, ...) — le bac à
  sable lie correctement « this » pour les appels croisés (validé : decideBid appelant une fonction custom).
- Le code généré déclare les fonctions custom comme méthodes de la classe (paramètres respectés).

### Deux panneaux côte à côte (split)
- Bascule 1 panneau / 2 panneaux. En split : panneau de DROITE = principal (reçoit les insertions depuis la
  toolbox), badge « principal ◀ insertions ». Bouton ⇄ pour échanger gauche/droite. Sélection de la fonction de
  chaque panneau via la toolbox (◧ = ouvrir à gauche).

### Thème + recherche
- Sélecteur de thème ; nouveau thème « Noir » par défaut (fond vraiment noir #000, interface comprise) avec
  coloration syntaxique dédiée. One Dark conservé.
- Champ de recherche compact en haut de la toolbox : filtre le contexte et les helpers, prend peu de place.

### Technique
- Modules : themes.ts (thème noir custom via EditorView.theme + HighlightStyle), codegen.ts enrichi (CustomFn,
  logs structurés LogLine, appels croisés via this), previewContext.ts (donne éditable/redistribuable).

Vérifs : typecheck (4 paquets) + 39 tests + build app + démo (vainqueur A) OK.

## v5.19.0 — Éditeur de cerveau : contexte éditable + redistribuable, onglets refaits

Deux améliorations majeures de l'éditeur de cerveau (/brain-editor), suite aux retours :

### Contexte d'aperçu ÉDITABLE et REDISTRIBUABLE (colonne droite)
- Le contexte d'exemple n'est plus figé : un vrai panneau éditable, à droite, avec :
  - **Ma main** : 8 cartes affichées en chips (rang + symbole couleur, rouge/noir). Clic = rang suivant,
    clic droit = couleur suivante. Bouton **🎲 Redistribuer** = nouvelle donne aléatoire de 8 cartes distinctes
    (jeu de 32), exactement comme une vraie donne du jeu.
  - **Réglages** : atout, phase (enchère/jeu), agressivité + concentration (sliders), annonce partenaire,
    annonce courante, peut contrer / peut surcontrer.
- Le bouton **▶ Tester** exécute la fonction sur CE contexte (construit en live via buildPreviewContext),
  et affiche le retour (décision) + les logs. On modifie la main, on re-teste : itération immédiate.
- Module `previewContext.ts` : dealHand() (donne aléatoire), CtxSettings (réglages), buildPreviewContext().

### Onglets de fonctions refaits (l'IHM qui s'affichait mal)
- Les onglets decideBid / decideCard / shouldContre / shouldSurcontre sont maintenant de grosses cartes
  lisibles, avec une pastille de couleur + le type de retour, et un état actif net (couleur par type :
  BidDecision orange, CardDecision vert, boolean bleu). Plus de superposition illisible.

Vérifs : typecheck (4 paquets) + 39 tests + build app + démo (vainqueur A) OK.

## v5.18.0 — Éditeur de cerveau : codage JS des 5 fonctions RobotAlgorithm

Nouvel éditeur dédié au CŒUR du cerveau d'un robot (route /brain-editor). Remplace l'ancien éditeur à nœuds
(supprimé). On code directement les fonctions du contrat RobotAlgorithm, en JavaScript, avec coloration.

### Concept
- Un onglet par fonction du cerveau : decideBid, decideCard, shouldContre, shouldSurcontre (extensible : « + fonction »).
- Pour chaque fonction : éditeur de code JS coloré (CodeMirror + thème One Dark), corps pré-rempli pédagogique.
- Le code généré assemble les 5 corps en une classe RobotAlgorithm complète + son enregistrement registerAlgorithm,
  téléchargeable en .ts (à déposer dans le projet — résolu par AlgoSpec.name).

### Accès au contexte (palette cliquable)
- Colonne de gauche : tout le RobotContext + l'AlgoSpec accessibles, groupés (Identité, Ma main, Personnalité/Génome,
  Table, Légalité), chaque entrée typée et documentée — clic = insère le chemin (ctx.personality.aggressiveness...).
- Helpers injectés : log.info/debug/warn (module logger), bid(), play(), helpers.strength/value/wouldWin/countSuit.
- Extraits insérables (compter les As, proba par agressivité, annonce partenaire, annoncer capot, monter de N...).

### Aperçu (bac à sable)
- Bouton « Tester » : exécute la fonction sur un contexte d'exemple, affiche le RETOUR (décision) + les LOGS,
  ou l'erreur. Permet d'itérer sans lancer une partie. Probabilité via ctx.personality.aggressiveness supportée.

### Technique
- Dépendances : @uiw/react-codemirror, @codemirror/lang-javascript, @codemirror/theme-one-dark.
- Sandbox d'exécution via new Function avec log/bid/play/helpers injectés (aperçu uniquement).
- Style Héphaïstos (sombre, dense, pro). Page React pure, lien « Éditeur cerveau » dans la nav.

Vérifs : typecheck (4 paquets) + 39 tests + build app + build librairie + démo (vainqueur A) OK.

## v5.17.0 — Éditeur visuel de cerveaux de robots (nœuds, connexions, AlgoSpec)

Nouvel éditeur visuel de cerveaux de robots (`/robot-editor`), style VS Code dark :

### Interface
- **Barre d'onglets** : un robot par onglet, presets (Classique / Agressif / Par défaut),
  bouton Cloner (⧉), fermer (✕). Plusieurs robots ouverts simultanément.
- **Layout 3 colonnes** : Toolbox (gauche) | Canvas de nœuds (centre) | Spec + JSON (droite).

### Toolbox — bibliothèque de blocs drag & drop
- **Conditions** (10) : J'ai N+ atouts, J'ai le Valet/9 d'atout, J'ai N+ As hors-atout,
  Adversaire/Partenaire a annoncé, Contrat ≥ N, Je suis/Partenaire est demandeur, Atout = couleur.
- **Actions enchère** (7) : Passer, Annoncer N couleur, Capot, Contrer, Surcoincher,
  Réflexion (signal), Répéter couleur.
- **Actions carte** (4) : Jouer la plus forte, Défausser (faible), Couper (atout), Jouer un As.
- **Flux** (4) : Si/Sinon, ET, OU, Séquence.

### Canvas
- Glisser-déposer des blocs depuis la toolbox ; nœuds déplaçables à la souris.
- Chaque nœud : en-tête coloré (par catégorie), paramètres éditables (nombre, couleur),
  ports de sortie cliquables (oui/non).
- Connexions SVG (courbes de Bézier) entre ports, avec flèche directionnelle.
- Sélection, suppression (✕) de nœuds ; les connexions suivent le déplacement.

### Panneau droit
- **Spec** : sliders pour personnalité (agressivité/concentration/vélocité 0–10),
  seuils de contre/surcontre (0.00–1.00).
- **JSON** : aperçu live de l'AlgoSpec résultante + le workflow issu du canvas.

### Technique
- Page React pure, intégrée au projet (route /robot-editor, lien « Éditeur IA » dans la nav).
- Pas de dépendance externe (SVG natif pour les connexions, drag & drop navigateur).
- Les presets importent directement ALGO_CLASSIQUE / ALGO_AGRESSIF / DEFAULT_ALGO de belote-core.

### Architecture
- Document technique `docs/architecture-robots.md` (608 lignes) : schémas ASCII du flux
  AlgoSpec → RobotAlgorithm → Agent, couches 1 à 4, les 4 pilotes, extensibilité, fichiers de référence.

Vérifs : typecheck (4 paquets) + 39 tests + build app + démo (vainqueur A) OK.

## v5.16.0 — Robot = individu autonome : façade Agent instanciable depuis une spec seule

Formalisation du robot comme INDIVIDU abstrait et portable, sans casser les 4 chemins (entraînement, compétition, live, démo).

- `Agent` (`packages/core/src/robot/Agent.ts`) : le robot vu comme un individu autonome. Encapsule son GÉNOME
  (AlgoSpec : données pures, versionné) + son CERVEAU résolu (RobotAlgorithm : fonction pure contexte→décision).
- `createAgent({ spec })` : point d'entrée UNIQUE. On instancie un individu depuis une spec SEULE — aucun moteur,
  aucun réseau. Le même Agent fonctionne à l'identique en LOCAL (front) et NON-LOCAL (back) : il ne dépend que du
  RobotContext (lecture seule), jamais d'une implémentation de jeu. Délègue les 4 décisions (bid/card/contre/surcontre).
- Architecture clarifiée : AlgoSpec (génome JSON) → createAgent → Agent (individu) → RobotAlgorithm (contrat
  observation→décision, déjà sans couplage moteur/réseau). Le registre d'algorithmes reste le point d'extension.
- Exporté depuis belote-core ; presets ALGO_CLASSIQUE / ALGO_AGRESSIF réutilisables.

Tests (5, autonomes — aucun moteur) : résolution du génome (preset), fusion défensive d'une spec partielle,
deux specs → deux individus distincts, DÉCISION d'enchère en isolation, DÉCISION de carte (renvoie une carte légale).
Total core : 27 tests. Vérifs : typecheck (4 paquets) + 39 tests + build app + build librairie + démo (vainqueur A) OK.

## v5.15.0 — Refacto modulaire de la table (étape 1/2) : composants UI autonomes

Décomposition de GameTable (monolithe ~450 lignes) en composants INDÉPENDANTS, chacun dans son module
sous `web/src/table/parts/`, piloté par des props explicites (instanciable et testable seul) — sans changement visuel.

- `PlayerHand` : main d'un joueur (4 orientations, tri atout+couleurs alternées intégré, face visible/cachée,
  cartes jouables). Props : dir, cards, count, trump, faceDown, playableSet, interactive, overlap, onPlay.
- `TrickArea` : pli central + animation de ramassage vers le gagnant. Props : plays, south, winnerSeat, collectDir.
- `LastTrickPanel` : mini-récap « Dernier pli » (carte gagnante surlignée). Props : lastTrick.
- Baril `parts/index.ts` ; composants réexportés par le module table (réutilisables via @kanto-aplo/belote-table).
- GameTable devient un assembleur plus mince (452 → 397 lignes) ; helpers de tri déplacés dans PlayerHand.

Tests : `displaySort` (3 tests : atout en tête, couleurs alternées, ordre par défaut). Total front : 12 tests.
Vérifs : typecheck (4 paquets) + 34 tests + build app + build librairie + démo (vainqueur A) OK. Rendu identique.

À VENIR (étape 2/2) : extraction de PlayerSeat, BidPanel (enchère + signaux), ContreControls (contrer/surcontrer),
FeltSurface (tapis + atout), BidHistory (4 dernières annonces), TableToast — pour un GameTable purement assembleur.

## v5.14.0 — Mains de la table : calage stable (plus de dérive au fil des plis)

Correction d'affichage (CSS pur, aucun impact moteur/valeurs) :

- Les mains GAUCHE/DROITE étaient ancrées par leur BORD (left/right) puis tournées de 90°. Comme la rotation
  se fait autour du centre de la main, retirer des cartes faisait rétrécir la main ET glisser son centre vers
  le bord (« les cartes se rapprochent du bord » à chaque pli).
- Désormais les quatre mains sont ancrées par leur CENTRE (translate -50% sur l'axe concerné), donc elles
  restent CENTRÉES sur leur côté quelle que soit le nombre de cartes — aucune dérive, aucun déplacement.
- Taille des cartes inchangée (déjà fixe : 44×62, flex:0 0 auto). La responsivité reste assurée par la mise à
  l'échelle globale (TableStage), pas par la déformation des cartes.

Vérifs : typecheck (4 paquets) + 31 tests + build app OK.

Note : si une véritable DIMINUTION de taille de carte persiste (et pas seulement la dérive corrigée ici),
elle proviendrait d'un conteneur parent mis à l'échelle ou d'un build en cache — à confirmer avec une capture.

## v5.13.0 — Feuille de score : affichage corrigé (manche courante détaillée) + règles manuscrites

Refonte du composant d'affichage `ScoreView` (feuille « papier déchiré »), purement visuel :

- BUG CORRIGÉ : l'ancien mode « compact » global réduisait toutes les manches au dernier score dès qu'on
  dépassait 11 lignes (donc après la manche 1). Désormais : les manches TERMINÉES sont condensées à leur
  dernière ligne ; la manche EN COURS affiche TOUTES ses donnes (cumul ligne par ligne), pour chaque manche.
- Décompte de manches gagnées (ex. 1 – 1) affiché APRÈS CHAQUE manche terminée (calcul au fil de l'eau), pas
  seulement à la fin.
- Cellule VIDE quand une équipe ne marque rien sur une donne (style manuscrit) — on ne répète pas le cumul.
- Franchissement d'un millier : un TRAIT manuscrit dans la colonne au passage + une APOSTROPHE par millier sur
  toutes les lignes suivantes (1040 -> « 04' », 2040 -> « 04'' »). Les milliers ne sont plus écrits en clair.
- Affichage en dizaines conservé (950 -> « 95 »).

Tests : `fmtCumul` (3 tests, l'affichage milliers/apostrophes verrouillé). Front : 9 tests. Total projet : 31 tests.
Vérifs : typecheck (4 paquets) + 31 tests + build app + build librairie + démo (vainqueur A) OK.

## v5.12.0 — Règles de score CORRIGÉES (vraies règles confirmées) + tests de référence

Le calcul de score (module pur `scoring/donneScoring.ts`) applique désormais les règles RÉELLES confirmées :

- Base 162 (152 cartes + 10 de der, der ajouté à l'équipe du dernier pli avant arrondi).
- Arrondi par équipe, 5 qui monte → total 160 OU 170 (« casse » = score finissant par 5/6/7).
- Belote (+20) UNIQUEMENT si annoncée ; compte pour valider le contrat ; si le camp qui l'a annoncée
  PERD (chute simple ou contre), les 20 passent à l'adversaire ; sinon personne ne les prend.
- SANS contre : contrat réussi → chaque équipe marque ses points arrondis ; contrat chuté → défense 160 FIXE, preneur 0.
- AVEC contre : camp gagnant 320 FIXE ; surcontre → 640 FIXE ; l'autre 0. La belote finit toujours chez le gagnant.
- Config : ajout de `contreWin: 320` et `surcontreWin: 640` (forfaits fixes).

Tests de référence (14, tous les exemples chiffrés confirmés) : 85/77→90/80 (casse), 94/68→90/70,
contrat exact (85 valide 90), 65+belote→90 vs 100, validation par belote, chute→160 fixe,
chute+belote→180, contre A réussit→320, contre A chute→320 défense, cas tordu (A+belote contré chute → B 340),
surcontre 640 (+20 belote → 660). Total moteur : 22 tests. Front : 6 tests. Tous verts.

Vérifs : typecheck (4 paquets) + 28 tests + build app + build librairie + démo (vainqueur A) OK.

À FAIRE (prochaine étape, décrite par Ameur, NON encore construite) : ICÔNE D'ANNONCE de la belote/rebelote
(annoncer ou non avant de jouer la carte, affichée à tous au même endroit que l'icône réflexion ; pas
d'annonce = pas de 20 ; belote annoncée → rebelote auto sur la 2e carte). Aujourd'hui le moteur détermine
encore `beloteTeam` par DÉTENTION (R+D d'atout joués), pas par ANNONCE — le module scoring est déjà prêt pour
le basculement vers l'annonce.

## v5.11.0 — Qualité : indépendance des modules + tests unitaires autonomes

### Tests unitaires indépendants (Vitest)
- Vitest installé + configuré (`packages/core/vitest.config.ts`, `web/vitest.config.ts`) ; scripts `test`
  par paquet et à la racine (`npm test`). Chaque test est autonome : aucun réseau, aucun backend.
- **Scoring** (`scoring/scoring.test.ts`, 11 tests) : barème atout/hors-atout, total 152, arrondi par équipe
  (5 qui monte, total 160 OU 170), contrat réussi/dedans, capot déclaré/non, contre ×2 / surcontre ×4, belote +20.
- **Moteur** (`engine/GameEngine.test.ts`, 8 tests) : signaux d'enchère (refus sans couleur ni répétition,
  couleur explicite affichée, réflexion refusée sur pass, répéter = couleur effective non affichée) et
  micro-phase surcontre (popup au seul camp preneur, partenaire du contreur sorti, 2 pass → contré joué,
  surcontre → clôt pour les deux).
- **Front** (`table/client/BeloteTableClient.test.ts`, 6 tests) : contrôleur testé avec un socket ENTIÈREMENT
  mocké — connexion, mises à jour de contexte, flux d'évènements + désabonnement, actions bid/play, journal
  borné, déconnexion. Zéro réseau.
- Total : 25 tests, tous verts.

### Indépendance des modules (audit + garanties)
- Audit serveur : AUCUN module n'importe le *service* d'un autre — uniquement des modèles (couplage de
  données normal) ; le couplage de comportement `game → analytics` passe par le bus d'évènements.
- Module table front : ne dépend que du design system + `belote-core` (vérifié).
- Scoring : isolé dans son module pur (v5.10), désormais couvert par des tests.

### Vérifs
- 25 tests OK ; typecheck (4 paquets) + build app + build librairie + démo (vainqueur A) OK.
- README : section « Tests & indépendance des modules ».

## v5.10.0 — Calcul du score isolé dans un module indépendant (extraction sûre)

But : rendre le calcul du score INDÉPENDANT et corrigible à un seul endroit, SANS changer les valeurs
(la correction des règles d'arrondi/contrat se fera ensemble, à tête reposée).

- Nouveau module pur `packages/core/src/scoring/` :
  - `donneScoring.ts` : `roundPoints(raw, roundTo)` et `scoreManche(input, config)` — fonctions PURES
    (entrée + barème -> résultat), extraites verbatim de ContreeRules (mêmes valeurs).
  - `index.ts` : point d'entrée unique du scoring — réexporte `cardValue`/`cardStrength` (barème cartes),
    `scoreManche`/`roundPoints` (donne), `computeReward` (récompenses), + les types d'E/S.
- `ContreeRules.roundPoints` et `ContreeRules.scoreManche` DÉLÈGUENT désormais au module pur
  (un seul endroit de vérité ; aucune logique dupliquée).
- `belote-core` exporte le module via `export * from './scoring'`.

Barème confirmé (inchangé) — atout : V20 9‑14 A11 10‑10 R4 D3 8/7‑0 ; hors‑atout : A11 10‑10 R4 D3 V2 9/8/7‑0 ;
cartes 152 + 10 de der = 162. Arrondi par équipe, 5 qui monte (total naturel 160 ou 170, jamais forcé).

Vérifs : barème + arrondi + une donne testés via le module isolé ; tous les typechecks (4 paquets)
+ build + démo (vainqueur A) OK — comportement identique à v5.9.0.

À FAIRE ENSEMBLE (noté, non traité) : confirmer/corriger les règles exactes (contrat réussi = points +
contrat ? dedans = 160 + contrat ? belote dans le contrat ? capot annoncé/non) — désormais à un seul endroit.

## v5.9.0 — Contre réflexe + micro-phase Surcontre (popup à deux, timer, hook robot)

### Moteur (belote-core) — nouvelle micro-phase `surcontre`
- Le CONTRE reste un réflexe hors-tour : le PREMIER adversaire qui contre VERROUILLE l'enchère ;
  son partenaire perd la main (et toute saisie en cours) et sort de la donne.
- Après un contre, on entre dans la phase `surcontre` : SEUL le camp preneur (les 2 sièges) décide
  Passer / Surcoincher ; le reste est figé. Deux pass → on joue le contré ; un surcontre → clôt pour les
  deux. Après surcontre, enchère close et l'Entame (firstBidderSeat) commence. Pas de « sur-surcontre ».
- `canSurcontre` refait (vrai uniquement en phase surcontre, pour un siège preneur en attente) ;
  reset propre par donne ; `EnginePhase` gagne `surcontre`.
- Hook robot `shouldSurcontrer(robot, view?, seat?)` : retourne `false` par défaut (point d'extension
  pour brancher une logique ou lire une règle depuis l'algoSpec). `robotAct` passe par défaut en surcontre.

### Pilotes — gestion de la phase surcontre
- Entraînement (`LocalTableEngine`), compétition (`competition.runner`), live (`liveGame`) : les robots du
  camp preneur décident via le hook (pass par défaut), les humains attendent.
- Live : timer de surcontre = `turnTimeoutMs` (démarré ensemble pour les deux sièges) → pass auto à
  l'expiration ; un surcontre clôt pour les deux. Ancienne « fenêtre surcoinche » supprimée.

### UI
- CONTRER : icône instantanée en bas du tapis à droite du joueur (pendant l'enchère) ; disparaît dès qu'on
  passe/monte ou qu'un adversaire a contré.
- SURCONTRER : popup dédiée Passer / Surcoincher pour le camp preneur, persistante tant que le joueur n'a
  pas tranché. Libellés de phase ajoutés (ScoreBoard, DevDock).

### Vérifs
- Scénario A/B/C/D validé bout en bout (contre de D → B sort → popup A&C → pass/pass ou surcontre).
- Régression de démo corrigée (robotAct gérait mal la nouvelle phase). Tous les typechecks (4 paquets)
  + build app + build librairie + démo (vainqueur A) OK.

## v5.8.0 — Module table autonome, responsive et publiable npm (refactoring MVC)

### Contrôleur (MVC) — toute la plomberie réseau encapsulée
- `BeloteTableClient({ socketUrl, apiUrl?, token?, tableId? })` : Socket.IO + REST derrière une interface propre,
  sans dépendance à window/localStorage/import.meta (réutilisable hors de l'app, en WebView, en test).
  - `getContext()` (statut, table, état de jeu, résultat), `on()` (flux d'évènements), `getLogs()` (journal borné),
    actions `bid()`/`play()`, cycle `connect`/`subscribe`/`unsubscribe`/`disconnect`.
  - Émet table:subscribe/unsubscribe/bid/play ; écoute tables:changed/table:update/table:game/table:finished.
- `Tables.tsx` REFACTORÉ pour consommer ce contrôleur (plus de plomberie socket inline dans la page).

### Vue autonome + responsive
- `BeloteTable` : vue connectée complète, rendue dans un `TableStage`.
- `TableStage` : taille de référence fixe mise à l'ÉCHELLE (transform: scale) → design préservé au pixel près,
  jamais réorganisé ; plein écran via la Fullscreen API.
- `StandaloneBeloteTable` : table jouable SANS backend (pilotée par LocalTableEngine) — test/démo.
  Route de démonstration ajoutée : /table-demo.
- `mountBeloteTable` / `mountStandaloneBeloteTable` : montage DOM en une ligne (+ unmount).

### Paquet npm `@kanto-aplo/belote-table`
- `packages/belote-table/` : package.json (exports + types + peerDeps react/react-dom + dep socket.io-client),
  déclarations `types.d.ts` auto-suffisantes, README technique complet.
- Build librairie : `npm --workspace belote-web run build:lib` (Vite lib mode) → dist/belote-table.js (ESM,
  React externe, core + design system inclus) + dist/belote-table.css. Feuille de styles importable séparément.

### Documentation
- `packages/belote-table/README.md` : installation, init par config, lecture du contexte, évènements, logs,
  actions + modèle d'annonce, responsivité/plein écran, build & publication, API exportée, contrat socket.

### Vérifs
- Le module ne dépend que du design system + belote-core (aucune dépendance « page »).
- Tous les typechecks (4 paquets) + build app + build librairie + démo moteur OK.

## v5.7.0 — Décomposition de la table en composants + couleurs d'enseigne + vocabulaire

### Table décomposée en composants autonomes (initialisables simplement)
- `LogoEspaceInfo` : contour = logo + 4 premières lettres du nom (joueur/robot).
- `JetonAnnonce` (HORS du contour) : jeton Donneur + jeton Entame (fixes la donne) + triangle vert Meneur
  (mobile, disparaît/bouge en premier). Position : à gauche du logo (haut/bas), au-dessus (gauche/droite).
- `AnnonceAnnonce` (HORS du contour) : Demande retenue + contré/surcontré PAR JOUEUR (icônes, jamais par équipe).
  Position : à droite du logo (haut/bas), en haut à droite (gauche/droite). Apparaît 2 s après le début du jeu
  (config `annonceDelayMs`, défaut 2000).
- `ContreeIcon` : bouton contré/surcontré du joueur, en bas du tapis à droite de son siège (remplace l'ancien bouton).
- La Console (`DevDock`) reste un composant indépendant, initialisé par `{ view, names, logs }` en entraînement.

### Couleurs d'enseigne — fondamental, partout
- ♥ ♦ en ROUGE, ♣ ♠ en NOIR (fini le monochrome/orange) dans la Demande, le panneau des annonces, l'atout.
- Une Demande montée sans renommer la couleur affiche l'enseigne de l'ATOUT (couleur effective) en vraie couleur.

### Popup d'annonce
- Nettement réduite (largeur ~−40%, hauteur très compacte) et remontée pour ne plus cacher les cartes.

### Vocabulaire figé (README)
- Donneur, Entame (= firstBidderSeat, devient Donneur la donne suivante), Meneur (triangle vert mobile),
  Donne, Pli, Manche, Partie, Demande, Réflexion/Répéter.

### Nettoyage
- Suppression du CSS et des composants morts (gt-chip/gt-dealer/gt-flags/gt-bid/gt-think, anciens boutons contre).
- Tous les typechecks (4 paquets) + build + démo OK.

## v5.6.0 — Signaux d'enchère : réflexion + répéter la couleur (propriétés du Bid)

### Modèle d'annonce (core)
- `Bid` gagne deux propriétés-signal : `reflexion` et `repeatPartnerSuit`.
- `PartieConfig.signals { reflexion, repeatSuit }` : signaux INITIALISÉS à la création de la table,
  transportés dans le contexte ; un signal désactivé est ignoré par le moteur. Lisibles par les robots
  (présents dans `view.bids`) pour servir d'indices configurables.

### Règles de validité (moteur) — « pas de signal sans monter la mise »
- Réfléchir ou répéter sur un PASS → refusé (influence interdite).
- Résolution de couleur (option A) : couleur explicitement nommée → affichée ; drapeau « répéter le
  coéquipier » → couleur du partenaire NON affichée (refusé s'il n'a pas encore nommé de couleur) ;
  ni l'un ni l'autre → refusé (le joueur doit choisir).
- Toute annonce doit rester strictement supérieure à l'enchère courante.

### Affichage (table)
- La couleur n'est affichée que si elle a été explicitement nommée (`saidSuit`) ; sinon seul le chiffre.
- 💭 affiché à côté de l'annonce uniquement APRÈS confirmation (plus jamais au simple clic sur l'icône).
- Notifications et panneau des 4 dernières annonces alignés sur ces règles.

### UI d'annonce
- Couleur optionnelle (plus de couleur par défaut) ; bascule « Répéter ♠ (coéquipier) » proposée seulement
  si le partenaire a déjà nommé une couleur ; bascule « 💭 Réflexion ».
- Confirmer = cliquer une valeur (désactivée tant qu'aucune couleur n'est choisie/répétée).
- Suppression de l'ancienne émote 💭 temps réel (et de son plomberie socket `table:think` côté serveur),
  remplacée par le signal porté par l'annonce.

### Plomberie
- Signaux passés à l'instanciation : front (TableConfig + LocalTableEngine), serveur (table.config + liveGame).
- Tous les typechecks (4 paquets) + build + démo OK ; scénario aa/bb vs cc/dd validé bout en bout.

## v5.5.0 — Fabrique de robot partagée (front = back) + README à jour

### Cohérence des robots front/back
- `packages/core` expose `robotFromFiche(fiche)` : FABRIQUE UNIQUE qui construit un robot prêt à jouer
  depuis sa fiche stockée (personnalité + algoSpec + temps). Déterministe.
- Le back (`competition.runner`, `liveGame.service`) ET le front (`Training`) passent désormais par cette
  même fabrique → un robot pense exactement de la même façon partout.
- Correction du défaut : l'entraînement (front) ignorait l'`algoSpec` (il ne passait que la personnalité) ;
  `RobotApiService.listMine()` ne renvoyait que `{id,name}`. L'API renvoie maintenant la FICHE COMPLÈTE
  (personnalité, responseTimeMs, maxPlayTimeMs, algoSpec) via le type `RobotListItem`.
- Rappel documenté : à mains identiques, jeu identique ; mais le RNG de distribution n'est pas seedé,
  donc les parties diffèrent (voulu).

### README
- Réécrit pour refléter l'architecture réelle : backend modulaire par domaine, fabrique de robot partagée,
  agrégat Game + replay froid + CQRS (ParticipationFact, rebuild), module compétition, file de jobs.
- Limites connues mises à jour (in-process bus/queue → BullMQ v7, récompenses non atomiques/partielles).

## v5.4.0 — Module Compétition de robots (jeu 100% backend, file de jobs)

### Nouveau module autonome `competition` (futur micro-service v7)
Affrontements robots-vs-robots joués entièrement côté serveur ; l'utilisateur ne fait que consulter.
- `competition.model` : CompetitionTable, cycle open → running → finished (ou cancelled).
  Équipe A = 2 robots du créateur (sièges 0,2) ; équipe B = 2 robots du challenger (sièges 1,3).
- `competition.runner` : runner HEADLESS — joue la partie à fond sans délai ni humain, puis persiste
  via le pipeline standard (agrégat Game + replay froid + projection analytique des robots).
- `competition.service` : create / listOpen / listMine / getById / join / cancel + worker de file + reprise.
  - Règles : max 2 tables actives par utilisateur ; robots possédés et distincts ; publique par défaut.
  - join() met le match en FILE et rend la main immédiatement ; le jeu tourne en arrière-plan.
- `core/jobQueue` : file in-process à concurrence bornée, non bloquante, prête à passer en BullMQ (v7).
- Reprise au démarrage : les matches `running` sans partie sont ré-enfilés (pas de perte sur crash).
- Endpoints : POST /api/competitions, GET /api/competitions, GET /api/competitions/mine,
  GET /api/competitions/:id, POST /api/competitions/:id/join, POST /api/competitions/:id/cancel.
- Socket : `competitions:changed` pour rafraîchir la liste sans polling.

### Frontend
- Page Compétition : créer une table (2 robots, publique), rejoindre une table ouverte (2 robots),
  suivre « Mes compétitions » (statut En attente / En cours / Terminée + score & vainqueur).
- CompetitionApiService ; route /competitions + entrée de navigation.

### Divers
- Game.mode accepte `competition` ; persistFinishedGame accepte tableId null (partie sans table live).
- Démarrage serveur : base connectée AVANT les tâches de fond (reprise fiable).
- Tous les typechecks (4 paquets) + build + démo OK.

## v5.3.0 — Replay froid séparé, projection asynchrone découplée, rebuild réel

Corrige les défauts 1, 2 et 3 signalés, en gardant le Game en UN SEUL document.

### (3) Document Game borné — replay sorti dans une collection froide
- `GameReplay` : collection 1:1 (même `_id` que le Game) contenant le gros `replay` + `logs`.
- L'agrégat Game ne contient plus que métadonnées + participants[] + manches[] (résumé) → petit, rapide à lister/charger.
- Ordre d'écriture : replay FROID d'abord, agrégat Game ensuite = POINT DE COMMIT (un Game ⇒ son replay existe ; un replay orphelin est inoffensif).
- Rejeu : le replay est chargé à la demande et rattaché par getById (compat client inchangée).

### (1) Projection vraiment asynchrone et découplée
- `core/eventBus` : bus d'événements de domaine in-process, distribution non bloquante (setImmediate), contrat prêt à être remplacé par BullMQ sans toucher aux modules.
- La persistance publie `game.finished` au lieu d'appeler la projection → `game` ne dépend plus d'`analytics` (vrai découplage).
- Le module `analytics` s'abonne via startBackgroundTasks ; la projection s'exécute hors chemin critique.

### (2) Source de vérité unique + rebuild réel
- `Game.projection { status: pending|done|failed, version, at }` → dérive détectable.
- `gameProjectionService.projectGame(gameId)` lit Game + GameReplay : MÊME code pour le live ET le rebuild → « reconstructible » devient réel.
- `rebuildOutdated()` reconstruit les projections manquantes/obsolètes ; endpoint POST /api/analytics/rebuild.
- L'échec de projection marque le statut et n'altère jamais la source de vérité.

### Effet
- Le document Game ne grossit plus avec le déroulé ; les listes ne chargent plus le replay.
- Fin de partie : la réponse ne dépend plus de la projection (publiée, traitée au tick suivant).
- Cohérence analytique vérifiable et rejouable à tout moment.
- Tous les typechecks (4 paquets) + build + démo OK ; bus d'événements validé non bloquant.

## v5.2.0 — Persistance idiomatique MongoDB : agrégat + CQRS

### Correction architecturale majeure
Le modèle « relationnel sur base documentaire » (collections Manche / MancheParticipant /
GameParticipant + jointures manuelles + ~14 écritures par partie) est remplacé par l'idiome
MongoDB correct, sans rien sacrifier au besoin d'analyse :

**Opérationnel (source de vérité) — l'agrégat Game**
- Game devient un AGRÉGAT : `participants[]` et `manches[]` EMBARQUÉS + `replay`.
- Persistance en UNE écriture atomique (single-document) → pas de transaction, zéro orphelin.
- Rejeu = UNE lecture. `Session` et `Table` restent des RÉFÉRENCES (cycle de vie indépendant).
- Collections supprimées : Manche, MancheParticipant, GameParticipant (désormais embarquées).

**Analytique (lecture) — module `analytics` (CQRS)**
- `ParticipationFact` : modèle de LECTURE plat et dénormalisé (granularité donne × siège),
  append-only, indexé pour l'agrégation (par robot/joueur, par preneur). Aucune jointure.
- `gameProjectionService` : projette l'agrégat Game en faits (idempotent, rebuildable). En prod :
  à déclencher via file (BullMQ) hors chemin critique ; un échec n'altère jamais la source de vérité.
- `analyticsService` : stats rapides (winRate, taux de réussite comme preneur, perf par atout)
  via pipeline d'agrégation sur le modèle de lecture.
- Endpoints : GET /api/analytics/me, GET /api/analytics/robots/:id.
- Module autonome : si on le retire, les parties continuent d'être persistées (on perd seulement les stats).

### Effet
- Chemin chaud de fin de partie : 1 écriture (agrégat) au lieu de ~14.
- La « table de liaison » manche↔joueur existe toujours — mais à sa juste place : côté LECTURE.
- Tous les typechecks (4 paquets) + build + démo OK ; contrat de projection validé bout en bout.

## v5.1.0 — Table : jeton donneur, popup unique, icônes d'enchère, 💭 propre

### Moteur
- view() expose `dealer` et `firstBidderSeat` (premier annonceur, sens de jeu pris en compte).

### Design system (composants de la table, configurables/affichables selon la table)
- `ds/table/DealerToken` : jeton « D » type jeton de casino, coloré par équipe (doré A / rouge B).
- `ds/table/EmotionIcon` : pictogrammes victoire (vert) / frustration (orange) / défaite (bleu).
- `ds/table/BidActionIcon` : pastilles rondes passe (—) / contrée (✕) / surcontrée (✕✕) / capot (couronne), fidèles aux maquettes.
- `ds/feedback/TableMessage` : popup de message UNIQUE et réutilisable (même composant pour message inter-manche ET fin de partie), avec EmotionIcon + compte à rebours optionnel.
- tokens : ajout de `--pink` (surcontrée) et `--gold` (capot).

### Table (GameTable)
- Jeton donneur affiché devant le PREMIER ANNONCEUR pendant l'enchère.
- Émote 💭 : visible uniquement si le joueur n'a pas passé ; bouton désactivé et bulle masquée sinon (la mienne comme celle des autres).
- Icônes contrée/surcontrée des sièges via BidActionIcon (au lieu de ✕ texte).
- Boutons d'annonce (capot/passe) ornés de leur pastille.
- Boutons Coincher/Surcoincher déplacés À CÔTÉ du joueur (juste au-dessus du siège sud), couleurs contrée/surcontrée.
- Popups inter-manche et fin de partie unifiés sur TableMessage (suppression de gt-mpop/gt-ico).

## v5.0.0 — Architecture modulaire par domaine + modele relationnel

### Backend — modules autonomes (plus de structure par couche technique)
Chaque domaine = un dossier complet et ajoutable/supprimable en UNE ligne du registre :
- modules/auth, user, team, invitation, robot, table, game
- chaque module : .model.ts + .service.ts + .controller.ts + .routes.ts + index.ts (+ .socket.ts pour table).
- core/ : AppModule (contrat de module), environment, database, logger, HttpError, asyncHandler.
- shared/ : authentication (JWT), socketAuthentication, levels.
- app.ts : assemble les modules via le registre (REST + WebSocket + taches de fond).
- Ajouter un module = 1 import + 1 ligne dans modules/index.ts.

### Modele de donnees RELATIONNEL (decompose pour l'analyse/prediction)
- Table 1-N Session ; Session 1-1 Game ; Game 1-N Manche.
- Game N-N participants via GameParticipant ; Manche N-N participants via MancheParticipant (liaison).
- MancheParticipant porte seatIndex, team, type (human/robot), wasSubstitute -> base pour les stats.
- Modeles InferSchemaType (typage fort des attributs).

### Frontend — la TABLE est un vrai module reutilisable
- web/src/table/ : module autonome instanciable avec un contexte JSON.
  - TableConfig.model.ts : DEFAULT_TABLE_CONFIG + buildTableConfig (tout le parametrable).
  - LocalTableEngine.ts : pilote local (entrainement, IA vs IA, demo) sans reseau.
  - views/ : GameTable, TableSurface, ScoreView, DevDock.
  - index.ts : expose le module (utilisable pour entrainement, salles, competitions, events).
- models/ + services/ (ApiService, SocketService, TableApiService, RobotApiService).
- /rooms -> /tables ; events websocket room:* -> table:*.

### Nettoyage
- Suppression de l'ancienne structure plate ET de l'ancienne structure par couche (controllers/, services/, routes/ globaux).
- Composants front morts supprimes (Cards, AnnounceStream, LogConsole de components/).
- Tous les typechecks (4 paquets) + build + demo OK. Aucune regression.

## v4.0.0 — Refactoring MVC complet

### Backend — architecture MVC stricte
- **models/** : 1 fichier par collection (User, Team, Robot, Game, Invitation, Room) + index.
- **services/** : 9 services (Auth, Robot, User, Team, Invitation, Game, Room, RoomGame, Eligibility) — toute logique metier isolee.
- **controllers/** : 7 controllers (Auth, Robot, User, Team, Invitation, Game, Room) — orchestration requete/reponse.
- **routes/** : 8 fichiers de routes (auth, robot, team, invitation, user, game, room) + index agrege.
- **middleware/** : authentication.ts (JWT), httpLogger.ts.
- **websocket/** : socketAuthentication.ts, roomSocketHandler.ts — separation nette API REST / WebSocket.
- **config/** : environment.ts, database.ts.
- **utils/** : logger.ts, serializers.ts (publicUser, serializeRoom, createEmptySeats, computePlayerLevel).
- Variables nommees explicitement (roomDocument, userDocument, errorMessage, filledSeatCount...).

### Frontend — MVC
- **models/** : User.model.ts, Room.model.ts, Robot.model.ts, GameState.model.ts — interfaces typees.
- **services/** : ApiService.ts, SocketService.ts, RoomApiService.ts, RobotApiService.ts.
- **Rooms.tsx** reecrit : noms explicites, imports depuis models/services, zero variable a une lettre.
- **state.tsx** reecrit : importe User depuis le modele.
- lib/api.ts et lib/socket.ts deviennent des wrappers (backward compat).

### Nettoyage
- Fichiers plats supprimes (models.ts, routes.ts, rooms.ts, roomGame.ts, auth.ts, config.ts, db.ts, logger.ts, socketAuth.ts, eligibility.ts, realtime.ts).
- Aucune regression : tous les typechecks passent, build + demo OK.

## v3.7.0 — Unification des tables + reconnexion + emote
- **Un seul chemin de table** : le hub legacy en memoire (realtime.ts) est supprime ;
  /lobby et /table/:id redirigent vers /rooms. L'auth WebSocket est extraite dans
  socketAuth.ts (les salles en dependent). Bundle front allege.
- **Reconnexion** : un joueur qui (re)rejoint une salle en cours recoit immediatement
  l'etat de jeu (sa main + coups legaux) via room:subscribe -> reemission ; il reprend
  sa place laissee au robot de secours.
- **Emote reflexion en multijoueur** : la bulle 💭 est desormais diffusee aux autres
  (room:think -> bulle sur le siege concerne, 1 s), uniquement si le joueur n'a pas passe.
- Pages legacy Lobby/OnlineTable retirees.

## v3.6.1 — Polish du flux d'annonce
- **Fenetre de surcoinche** : apres un contre, le pilote live laisse ~3,5 s a l'equipe
  contree pour **surcoincher** avant la 1re carte (evenement room:contre + bouton maintenu).
- **Bug popup/debut de manche corrige** : la pause de fin de manche est calee sur le chrono
  de la popup (~5 s) cote salles **et** entrainement — le jeu ne reprend plus avant la fin
  de la popup. (Pause de manche non acceleree par la vitesse en entrainement.)
- Entrainement : reponse robot a l'annonce fixee a **700 ms** (alignee sur le live).

## v3.6.0 — Moteur : capot & fenetre de contre
- **Capot qui clot l'enchere** : annoncer un capot (action 'capot' + couleur) **verrouille
  immediatement** le contrat (impossible a contrer) et lance le jeu. Capot **declare**
  desormais transmis au score (500 si reussi, sinon contrat 250 -> dedans probable).
- **Fenetre de contre hors-tour, sensible au sens de jeu** : un defenseur peut **coincher**
  tant que ni lui ni son partenaire n'ont passe depuis l'annonce — l'**historique des passes
  encode le sens** (A->B->C->D ou inverse) sans logique gauche/droite en dur. Le contre
  **verrouille l'enchere** ; l'equipe contree peut **surcoincher** jusqu'a la 1re carte.
- Le moteur expose view.contreSeats / view.surcontreSeats ; l'UI affiche Coincher/Surcoincher
  d'apres le moteur (plus d'heuristique cote front).
- Le pilote live accepte la coinche/surcoinche **hors-tour** ; l'Entrainement aussi.

## v3.5.0 — Interface d'annonce centrale + correctifs table
- **UI d'annonce centrale** (au milieu de la table) : sélecteur de couleur (icônes),
  chips de valeurs **90 → 180** (désactivées sous le minimum), **Capot**, **Passe**, et
  icône **réflexion** (💭, affichée 1 s près du siège, désactivée si déjà passé). Remplace
  l'ancienne `BiddingBar`. Même registre visuel que les notifications.
- **Coincher / Surcoincher** : bouton **près du siège** (hors interface d'annonce), visible
  seulement quand l'équipe **adverse** a l'annonce en cours ; après un contre, le bouton
  devient **Surcoincher** pour l'équipe contrée.
- **Tri de la main** : **atout à gauche** (fort → faible), puis couleurs **alternées**
  (atout noir → noir/rouge/noir/rouge ; atout rouge → rouge/noir/rouge/noir).
- **Robot : réponse à l'annonce fixée à 700 ms** (non modifiable par l'utilisateur).
- **Bug corrigé : cartes qui rétrécissent** — les emplacements du pli étaient réutilisés
  par React (animation `scale` persistante) ; ils sont maintenant **clés par identité de
  carte**.
- Atout central déjà rendu transparent/configurable (v3.4.0) pour ne plus masquer les cartes.

## v3.4.0 — Robot remplaçant, éligibilité, raffinements table
- **Plus de partie bloquée** : si un humain ne joue pas (ou quitte), un **robot de
  secours** joue à sa place après un délai **configurable** (`settings.turnTimeoutMs`,
  défaut **10 s**). Il s'appuie sur le contexte (preneur, atout, score, dernier pli) ;
  l'humain **reprend la main** dès qu'il rejoue. Événement `room:substitute` émis.
- **Classe d'éligibilité** (`PlayEligibility`) — point d'extension unique qui renverra
  plus tard l'autorisation de jouer ensemble (type de table, historique entre joueurs,
  IP/device, anti-triche en compétition…). **Renvoie `true` pour l'instant**, déjà
  consultée à la prise de siège humain.
- **Atout central plus discret** : opacité abaissée et **configurable** (`atoutGlyphOpacity`,
  défaut 0.06) pour ne plus masquer la couleur des cartes.
- **Notifications d'annonce** déplacées **en haut à droite** ; nouveau panneau **en bas à
  gauche** listant les **4 dernières annonces** (avec atout pris et étiquette « nous /
  adversaire »), qui ne disparaît qu'**après la première carte jouée**.

## v3.3.1 — Correctifs salles : démarrage & robots
- **Bug corrigé : la partie ne démarrait pas.** `GET /robots` renvoyait `_id` (pas `id`),
  donc l'identifiant de robot était vide côté front : impossible d'asseoir un robot → les
  4 places ne se remplissaient jamais. Mapping corrigé (`_id`). Cela règle aussi le
  **warning React « unique key »** (clés `undefined`).
- **Démarrage automatique** : dès que les 4 sièges sont occupés, la partie se lance
  automatiquement après 3 s (plus besoin du bouton). UI mise à jour (compte à rebours).

## v3.3.0 — Pont salle ⇄ moteur live
- **Les salles persistées jouent vraiment** : au démarrage (après le compte à rebours
  de 3 s), le serveur construit le moteur depuis les sièges de la salle, pilote les
  robots, attend les coups humains, et **diffuse l'état de jeu sur le canal `room:{id}`**
  (chaque humain reçoit sa main + ses coups légaux ; les spectateurs voient tout).
- **Coups humains en WebSocket** : `room:bid` / `room:play` validés côté moteur.
- **Persistance de fin de partie** : la partie est enregistrée (replay + logs, visibilité
  héritée du groupe), la salle passe en `finished` avec un lien vers la partie, et les
  **points de récompense + parties jouées** sont mis à jour par joueur (via `computeReward`).
- **Front Salles** : rend la **table live** (thème `cosmos`) dès que la partie démarre,
  jouable par les humains, avec écran de fin.

## v3.2.0 — Salles persistantes, table configurable, base testable sans Docker
- **MongoDB en mémoire** (test sans Docker) : `MONGO_URI=memory` (ou `USE_MEMORY_DB=1`)
  démarre une base éphémère **auto-seedée**. Config durcie : une `MONGO_URI` vide/invalide
  est ignorée (fini l'erreur « Invalid scheme »).
- **Logger structuré** (niveaux, scope, horodatage) utilisé par HTTP, base et salles ;
  log HTTP par requête (méthode, statut, durée).
- **Modèle de salles persistant** (`Room`) propre et indexé : statut
  `lobby · playing · finished · draft`, `ownerType` user/équipe, visibilité, `settings`,
  4 sièges typés (vide/humain/robot), `lastActivityAt`. Index composés pour le listing.
- **Cycle de vie des salles** (REST + temps réel) : créer (perso ou équipe), lister
  (visibles seulement), prendre/changer de place, **basculer humain ⇄ robot** (diffusé en
  direct via WebSocket `room:update`), quitter ; **tout le monde part → draft** (conservée,
  non listée) ; **inactivité > 5 min → draft** (balayage périodique) ; démarrage à 4 joueurs
  avec **compte à rebours de 3 s**. Invariants robots respectés (pas deux fois, pas adversaires
  entre robots d'un même proprio).
- **Page Salles** (front) : création perso/équipe + public/privé, liste live, sièges en
  direct (m'asseoir / asseoir un robot / quitter / démarrer).
- **Table = module pleinement configurable** : `TableConfig` étendu + **thèmes de tapis**
  (`classic`, `cosmos`, `olympus` — clin d'œil astronomie/Grèce KANTO APLO).

## v3.1.1 — Réglages fins de la table
- **Feuille de score** refondue en composant autonome `ScoreView` : **5× plus étroite**,
  **papier déchiré** (déchirure propre à chaque partie, dérivée d'une graine = l'ID de
  partie au rejeu), **écriture minuscule** au stylo bleu, traits de séparation **tracés
  « à la main »** (non alignés). En-tête `A  B` seulement, scores **en dizaines sur 2
  chiffres** (150→`15`, 60→`06`), manches au format **`1 – 0`**. Mode compact quand elle
  s'allonge. Accepte aussi des **messages** libres.
- **Cartes uniformisées** : tous les joueurs (4 robots, 3 robots + humain, etc.) ont des
  cartes de **même taille**, **~30 % plus petites**.
- **Coinche / surcoinche en icônes** (✕ orange / ⊗ rouge) au lieu de texte, avec le nom
  en infobulle.
- **Notification d'annonce** : remplacée immédiatement à chaque nouvelle annonce ; la
  dernière disparaît après un délai **configurable** (`notifyMs`, défaut **5000 ms**).
- **Table = composant configurable côté design** : `TableConfig` étendu (feutre, bordure,
  rayon, feuille on/off, atout aux coins, `notifyMs`, graine + messages de la feuille).

## v3.1.0 — GameTable enrichie & configurable
- **Composant `GameTable` indépendant et thématisable** (prop `config` : fond du tapis,
  bordure, rayon, feuille de score, atout aux coins) — réutilisable tel quel dans
  d'autres modules/modes/compétitions.
- **Les 4 joueurs sur le tapis** : mains face cachée pour les adversaires (face visible
  en observation/rejeu), plus de compteur de cartes.
- **Sièges** : logo + nom uniquement ; la **demande** du preneur (valeur + couleur)
  s'affiche sur lui ; **contre** = croix orange sur l'équipe contrée + tag « a contré »
  sur l'auteur ; en cas de **surcontre** les icônes passent au **rouge** + tag
  « a surcontré ».
- **Atout au centre ET dans les 4 coins**.
- **Premier joueur du pli** mis en avant (icône ▶ + anneau cyan animé) ; à la prise,
  **les cartes s'animent vers le gagnant**, qui devient le meneur du pli suivant.
- **Dernier pli** en mini-panneau (~¼ de la taille) en haut à gauche.
- **Feuille de score manuscrite** (style cahier de café, stylo bleu, police Caveat) :
  cumul par donne en deux colonnes A | B, ligne de manche gagnée (1/0), **mode compact**
  quand elle s'allonge (totaux de manche + cumul courant), sans recouvrir les cartes.
- **Popup de fin de manche** (équipe gagnante) avec **chrono de 5 s** avant la suivante.
- **Notifications dans la table** (x passe / annonce / contre / surcontre).

## v3.0.0 — CRUD social complet + front aligné sur le kit
- **Serveur — CRUD complet** : équipes (créer, détail, modifier, classement, quitter)
  avec **visibilité publique/privée** ; **invitations** par nom d'utilisateur, e-mail
  ou identifiant → l'invité **accepte / refuse**, sinon l'invitation reste **en attente** ;
  **profils** publics (niveau dérivé des points, parties jouées, score, équipe) ; **fiche
  robot** consultable (y compris celui d'un adversaire) ; **stats** mises à jour à chaque
  partie.
- **Visibilité des parties héritée du groupe** : groupe public → parties **publiques**,
  groupe privé → parties **privées** (visibles des seuls membres). **Sauvegarde
  automatique** par défaut en fin de partie (entraînement et autres modes).
- **Front — page Équipe complète** (composants du kit) : créer une équipe + bascule
  public/privé, inviter par identifiant, voir membres (clic → profil), invitations reçues
  (accepter/refuser) et envoyées (en attente), classement, quitter.
- **Popup de profil** (`ProfileDialog`, modale du kit) : joueur (niveau, parties, score,
  robots) et robot (personnalité, algo, propriétaire).
- **Alignement kit** : Entraînement, Table en ligne et Rejeu sur le layout flagship
  (`layout-game`) avec la console à onglets `DevDock` ; familles `core`, `forms`,
  `feedback`, `devtools` du kit intégrées dans `web/src/ds/`.
- **Seed** enrichi : e-mails, équipe publique « Les Atouts », invitation en attente
  (ameur → sofia), stats, partie publique de démo. Comptes : `ameur` / `invite` / `sofia`
  (mot de passe `belote123`).

## v2.3.0 — Console façon inspecteur Chrome + layout flagship
- **Console « inspecteur »** (`DevDock`) : panneau à **onglets** (Console · Annonces ·
  État), **repliable/masquable** d'un clic (chevron), façon DevTools Chrome. L'onglet
  Console utilise ton `LogConsole` (niveaux filtrables), Annonces ton `AnnounceStream`,
  et État inspecte le moteur en direct (phase, tour, atout, contrat, preneur, contre,
  scores, objectif, sens).
- **Layout flagship** inspiré de ton HTML (`GameScreen`) : `layout-game` = tapis 2/3 +
  dock 1/3 ; le tapis remplit la colonne, la main passe en grand format, et ta
  `ControlBar` (pause / pas-à-pas / vitesse / délais) remplace mes contrôles maison.
- **Kit complété dans l'app** : familles `core`, `forms`, `devtools` copiées dans
  `web/src/ds/` ; mapping des logs moteur (`LogEntry`) vers le format du kit.

## v2.2.0 — Composants du kit design system sur la table
- **Table de jeu recâblée sur tes composants** : `TableFelt`, `PlayingCard`,
  `ScoreBoard`, `TeamBadge`, `BidBadge` du kit remplacent mes composants maison
  (copiés dans `web/src/ds/`, typés via les `.d.ts` fournis). Le tapis, les cartes
  (face/dos, jouable, gagnante), le bandeau de score, les identicons d'équipe et les
  badges d'enchère sont désormais ceux de tes maquettes.
- **Mapping propre core ↔ kit** : couleurs FR↔EN (cœur↔hearts, carreau↔diamonds,
  pique↔spades, trèfle↔clubs), sièges→directions (joueur au sud), couleurs d'équipe
  HSL **calculées** depuis le nom (`teamColor`) et relayées par `--team-*`.
- **Mains révélées** en entraînement/rejeu (fans face visible autour du tapis) ;
  **main interactive** en bas pour le joueur en ligne (cartes jouables surlignées).
- `allowJs` activé côté web pour consommer les `.jsx` du kit sans rien réécrire ;
  le reste de l'app continue d'hériter des tokens (v2.1.0).

## v2.1.0 — Design system « Contrée » + valeurs configurables + algo en workflow
- **Design system intégré** : tes tokens (`design-tokens.css`, fonts Chakra Petch /
  Manrope / JetBrains Mono, `animations.css`) sont importés et l'app existante les
  consomme via un pont — palette or « atout » + cyan esport, tapis feutré, cartes,
  console et badges aux couleurs du système ; couleurs d'équipe **calculées** (HSL
  depuis le nom), jamais en dur. Le design system complet est rangé dans `design-system/`.
- **Valeurs statiques sorties** dans `RulesConfig` (un seul endroit) : enchère min/max,
  arrondi, belote (+20), dix de der (+10), **capot 250/500**, contre ×2 / surcontre ×4,
  base du dedans (160), **objectifs de manche 1500/2000**. On clone la config pour une
  variante maison, sans toucher au reste.
- **Algo robot = WORKFLOW de fonctions** : chaque décision (enchère / carte / contre /
  surcontre) est un **pipeline d'étapes pures** (`steps.ts`) qui analysent le jeu et
  affinent un « brouillon » avant de passer la main. Le pipeline est décrit en **JSON**
  (`AlgoSpec.workflow`), donc clonable et extensible : nouvel algo = nouvelle liste
  d'étapes (ou ses propres étapes enregistrées). Résolu automatiquement en
  `WorkflowAlgorithm`. Les robots contrent via ce pipeline.

## v2.0.0 — Architecture clean & algo robot abstrait
Refonte de fond, sans casser le jeu local (toujours jouable immédiatement).
- **Algorithme de robot entièrement abstrait** : nouveau contrat `RobotAlgorithm`
  (`decideBid`, `decideCard`, `shouldContre`, `shouldSurcontre`) qui ne voit qu'un
  `RobotContext` en lecture seule (coups légaux, demandeur, atouts joués/restants/non
  vus, enchères, pli…). Chaque robot pointe vers une `AlgoSpec` (JSON) résolue par un
  **registre** (`SpecAlgorithm` par défaut, algos custom enregistrables). Les robots
  **contrent et surcontrent** désormais selon des seuils paramétrés par la spec.
- **Couche application (clean / hexagonale)** : nouveau paquet `packages/application`
  avec **ports** (interfaces : UserRepository, TeamRepository, RobotRepository,
  GameRepository, IdGenerator, Clock…), **use cases** (createRobot, createTeam,
  joinTeam, listTeamsRanked, searchPlayers, saveGame, getGameForUser, listGames),
  un **TableService** portant les invariants (pas deux salles, pas deux robots du
  même proprio en adversaires), un **GameSession** d'orchestration réutilisable, et
  des **adapters mémoire** interchangeables avec Mongo.
- **Réutilisable par tout front JS/TS** : une démo (`packages/application/demo`) joue
  une partie complète **sans serveur ni base** — même couche pour le web et le futur mobile.
- Le cœur `belote-core` reste **pur** (aucun framework). Le serveur Express et le front
  React deviennent de simples consommateurs.

## v0.6.0 — Algo en JSON, équipes, règles métier
- Correction du bug du capot (250 au preneur, plus à l'adverse).
- Algo des robots décrit en JSON (AlgoSpec) ; équipes (créer/rejoindre/classement) ;
  règles robots (pas deux tables, pas adversaires entre robots du même joueur,
  hors‑ligne, représentant) ; recherche de joueurs ; visibilité des parties.

## v0.5.0 — Popup, tri, sens de jeu, flux d'annonces
- Popup du preneur ; cumul après chaque pli ; tri des mains (atout devant) ;
  sens du jeu configurable ; flux des annonces coloré par équipe.

## v0.4.0 — Scores temps réel & identité d'équipe
- Tableau de bord par équipe ; identicons façon GitHub ; écran récap de fin de
  partie ; édition des robots.

## v0.3.0 — Affichage du jeu
- Ramassage du pli en deux temps ; panneau « pli précédent » ; badges et icônes ;
  contrôles de lecture (pause, vitesses, délais).

## v0.2.0 — Fixtures & correction base
- Fixtures (comptes, robots, partie de démo) ; correction du `.env` non lu (dotenv).

## v0.1.0 — Première version
- Monorepo complet : moteur partagé, backend Node + MongoDB + WebSocket, front React,
  documentation API.
