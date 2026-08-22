# Module table-pixi — rendu canvas PixiJS v8 (v8)

Table de jeu **Kydos Belote** en rendu canvas PixiJS v8 : moteur et cerveaux de robots
inchangés (`belote-core` intact), le module ne fait que **rendre** une vue moteur.
Package **autonome** : `packages/table-pixi/` — `@kydos/table-pixi` (scène Pixi + HUD
HTML + thème + styles), consommé par le mobile.

> **⚠️ Chemins historiques.** Ce document a été écrit quand le module vivait dans
> `web/src/table-pixi/` et coexistait avec une table DOM (`GameTable`). Le workspace
> `web/` et la table DOM ont été **supprimés en v16** : les mentions de « parité DOM »
> décrivent l'origine d'un comportement, pas un composant encore présent.
> `StandalonePixiTable.tsx` n'existe plus ; l'entrée du package est `index.ts` →
> `PixiTable.tsx`. Le HUD est dans `hud/`, les styles dans `styles/`, et
> `robotMascot.ts` (mascottes paramétriques) s'est ajouté depuis.

## Architecture (clean, un composant par fichier)

```
table-pixi/
  PixiTable.tsx           Composant React : monte l'app Pixi, pont props → scène, HUD, plein écran.
  StandalonePixiTable.tsx Branche le MÊME LocalTableEngine (robots + cerveaux) sur PixiTable.
  theme.ts                Thème : TOUT le visuel paramétrable (fusion profonde avec les défauts).
  layout.ts               Helpers purs (hash, HSL→hex, taille responsive, rectangle de table).
  handSort.ts             Tri d'affichage de la main (atout d'abord, couleurs alternées) — porté du DOM.
  fullscreen.ts           Plein écran + verrouillage paysage (téléphone).
  table-pixi.css          Styles du HUD + rotation forcée + compact paysage téléphone.

  scene/                  Couches Pixi (AUCUNE logique de jeu)
    TableScene.ts         Racine : rect de table, tailles responsive, orchestration des couches.
    FeltLayer.ts          Rail + feutre + halo + glyphe d'atout central ET dans les 4 coins.
    SeatsLayer.ts         Stations au BORD INTÉRIEUR du feutre : logo d'équipe (identicon), nom (4 lettres),
                          jetons D/E + ▲ meneur (volatil), bulle de demande, marqueur contre PERSONNEL.
                          + buildSeatModels(view) : la logique de parité DOM, PURE et TESTÉE.
    HandsLayer.ts         Les 4 mains DANS le feutre : sud triée/cliquable (cartes non jouables grisées),
                          nord horizontale, ouest/est PIVOTÉES ±90° — dos ou faces selon opponentCards.
    TrickLayer.ts         Pli central : lueur dorée sur la carte gagnante + ANIMATION DE RAMASSAGE
                          vers le gagnant (~550 ms, easeOut) comme les keyframes DOM.
    CardView.ts           Carte vectorielle (face/dos) : setPlayable / setDimmed / setWinning.
    LogoView.ts           Identicon 5×5 (hash nom → couleur HSL), identique au TeamBadge DOM.

  hud/                    Composants HTML (présentationnels, un par fichier)
    TableHud.tsx          Assembleur : toasts d'annonce, délai de la demande retenue (2 s), popups.
    BidPanel.tsx          Popup d'enchère : couleurs, Répéter (couleur du coéquipier), 💭 Réflexion,
                          paliers 90→180 (sous le min désactivés), Capot, Passe — payloads DOM identiques.
    ContreControls.tsx    Contrer (bouton instantané pendant l'enchère) + Surcontrer (popup dédiée).
    AnnouncesList.tsx     Récap bas-gauche : contrat retenu + 4 dernières annonces (nous/adversaire).
    LastTrickPanel.tsx    Mini « Dernier pli » haut-gauche, gagnant surligné.
    ScoreSheet.tsx        Feuille de score (manches, totaux, manches gagnées) via le menu.
    TableMessagePopup.tsx Popup unique fin de manche (compte à rebours 5 s) / fin de partie.
    MenuButton.tsx        Menu ☰ : feuille de score, plein écran, quitter — extensible.
```

## Parité de comportement avec la table DOM

Reproduit à l'identique : notification après chaque annonce (5 s, remplacée immédiatement) ; demande de
chaque siège pendant l'enchère (couleur affichée SEULEMENT si nommée) ; demande retenue du preneur pendant
le jeu après 2 s (avec l'enseigne de l'atout) ; contre/surcontre PERSONNELS (jamais à l'équipe) ; jetons
D/E fixes + ▲ meneur volatil (masqué pendant le ramassage) ; cartes non jouables grisées à ton tour ;
récap des 4 dernières annonces jusqu'à la première carte ; dernier pli ; popup inter-manche avec compte à
rebours ; popup fin de partie ; feuille de score. Ces règles vivent dans `buildSeatModels` (pur, testé).

## Téléphone : plein écran paysage

- Portrait : écran « Tourne ton téléphone » + bouton **⛶ Plein écran**.
- Le menu ☰ propose **Plein écran** ; `fullscreen.ts` demande le fullscreen et tente
  `screen.orientation.lock('landscape')` (Android). Styles compacts sous 480 px de hauteur.

## Configuration à l'appel

```tsx
<PixiTable
  view={...} names={...} hands={...} mySeat={0} legal={...} summary={...}
  onBid={...} onPlay={...} onLeave={...}
  theme={{ felt: { color: 0x0f7a4a }, card: { minWidth: 38, maxWidth: 58, opponentWidth: 30 }, ... }}
  opponentCards="back"     // 'hidden' | 'back' | 'faceup' (entraînement robots)
  showMenu forceLandscape
  notifyMs={5000} annonceDelayMs={2000}
/>
```

## Démo autonome

`demo/table-pixi-demo.html` : s'ouvre seule (Pixi via CDN), reflète le layout v8 — stations au bord du
feutre, mains dans le feutre (ouest/est pivotées), animation de ramassage (bouton « Gagnant+ramasser »),
dernier pli, annonces, popup centrée, plein écran. Route app : `/table-pixi`.

## Multi-templates (v8.1)

Le visuel est piloté par des **templates nommés et complets** (`themes/`) : `classic` (feutre vert casino,
rail bois), `cosmos` (bleu spatial), `olympus` (ardoise + rail doré) — le même trio que la table DOM.
Un template = un fichier exportant un `PixiTemplate` :
- `theme` — TOUT le rendu Pixi (feutre, cartes, sièges, annonces…) ;
- `hudVars` — les variables CSS appliquées à la racine, pour que le HUD HTML (popups, toasts, annonces,
  score) suive le même template.

Usage : `<PixiTable template="cosmos" theme={{ felt: { color: 0x... } }} />` — les surcharges fines se
fusionnent PAR-DESSUS le template (section par section). Ajouter un template = créer `themes/mon-theme.ts`
+ `registerTemplate(monTemplate)`. Registre couvert par des tests (`themes/themes.test.ts`).

## Styles structurés (v8.1)

Le CSS du module est découpé par domaine dans `styles/` : `table.css` (racine, canvas, rotation),
`hud.css` (menu, toast, annonces, contre), `cards.css` (mini-cartes du dernier pli), `panels.css`
(popup enchère/surcontre, message fin de manche, chips), `scoresheet.css` (feuille), `compact.css`
(téléphone paysage) — tous pilotés par les variables du template. `styles/index.css` les importe.

## Feuille de score « papier déchiré » (v8.1)

La **ScoreView du DOM** (papier déchiré, écriture manuscrite au stylo bleu, cumuls belote) est réutilisée
telle quelle dans le HUD Pixi, épinglée EN HAUT À DROITE comme sur la table d'origine (prop
`showScoreSheet`, défaut true). La feuille détaillée reste accessible via le menu.

## Cartes v8.1 & anti-débordement

- CardView redessinée : ombre portée, coins proportionnels (rang + enseigne, coin bas-droit inversé),
  grande enseigne centrale — typographie proportionnelle à la taille de la carte.
- TOUS les éventails sont bornés (`fitSpacing`) : `espacement×(n−1) + carte ≤ espace disponible` — plus
  aucune carte ne sort du cadre, quel que soit le zoom ou la taille d'écran. Les cartes adverses et le
  décalage du pli se rescalent avec le feutre.

## v8.2 — Design refait de zéro (retours terrain)

- **Stations HORS du feutre** : les pilules joueurs (logo + nom + jetons + badge de contrat) vivent
  au-delà du rail (sud dessous, nord dessus, ouest/est à côté) — **elles ne recouvrent plus jamais les
  cartes**. Ancrage borné pour rester à l'écran.
- **HUD calé DANS le feutre** : `PixiTable` publie la géométrie du tapis en variables CSS
  (`--px-felt-x/y/w/h`) ; la popup d'enchère (centrée dans le feutre, largeur bornée par le feutre),
  la feuille déchirée (haut-droite du feutre), le dernier pli (haut-gauche du feutre), le récap
  d'annonces et le toast se positionnent par rapport au TAPIS, plus jamais hors de la table.
- **Netteté au zoom** : résolution Pixi = devicePixelRatio réel, NON plafonné, resynchronisée à chaque
  resize/zoom navigateur — textes et cartes nets à tout niveau de zoom.
- **Contours jouables** : fini le cadre jaune — liseré BLANC fin + halo doux (thémable via card.highlight).
- **Jetons propres** : D bleu / E rouge en jetons plats (disque + anneau interne clair) — plus aucun
  trait rouge/bleu parasite (les arcs pointillés sont supprimés).
- **Tout est proportionnel** : facteur `sceneScale(hauteur du feutre)` appliqué à toutes les tailles
  (pilules, polices, jetons, badges, filigranes, marges, décalage du pli) — testé.
- **Filigrane d'atout par template** (`felt.atoutColor`) pour rester lisible sur chaque feutre.

## v8.4 — Cartes en SPRITES (atlas de textures 2D) — enfin nettes

Changement d'approche décisif : les cartes ne sont plus dessinées à la main en primitives Pixi
(source du rendu « encre qui coule »). Elles sont maintenant de **vrais sprites** issus d'un **atlas de
textures pré-rendues**.

- **`scene/cardAtlas.ts`** : au démarrage, les 32 cartes + le dos sont dessinés UNE FOIS sur des canvases
  2D nets (à 3× la densité de pixels), avec `clip()` arrondi — donc AUCUN débordement du motif hors de la
  carte. Ces canvases deviennent des `Texture` Pixi. Couleurs/police pilotées par le **template**
  (face, liseré, rouge, noir, dos, motif). L'atlas est reconstruit seulement quand le template change.
- **`scene/CardSprite.ts`** : chaque carte à l'écran est un `Sprite` de l'atlas — net à tout zoom,
  centré au pixel près. Le surlignage jouable / la lueur gagnante sont dessinés SOUS la carte (jamais de
  contour sur l'illustration).
- **`scene/tokenTexture.ts`** : jetons D/E rendus comme de vraies textures de jetons de poker (disque
  cranté, anneau, lettre) — propres, comme le DealerToken v5.
- **Table plein écran** : insets quasi nuls → le feutre remplit toute la page.
- Rotation ouest/est corrigée (clamp vertical) : les mains latérales ne débordent plus.
- Démo : un SEUL composant Pixi plein page ; le sélecteur de templates est le seul élément hors Pixi.

## v9.0 — Design system officiel (handoff Claude Design)

La table implémente désormais le design system livré par Claude Design
(`Kydos_Belote___Table_Design_System-handoff.zip`) — source de vérité pour tous les visuels.

- **3 thèmes** (`theme.ts`) : `local` (feutre vert chaud, rail acajou), `vip` (émeraude + or),
  `competition` (navy + argent). Tokens `--table-*` fidèles à `tokens/themes.css`, exposés au HUD
  HTML via `themeCssVars()` et `data-theme`.
- **Cartes** (`cardAtlas.ts`) : 68×96 rayon 10, face blanche, coins Manrope 800, grand pip central
  Playfair Display 900 42px, dos indigo dégradé (#6b78ea→#2a3196) à rayures blanches 45° clippées,
  bordure blanche. Atlas UNIQUE (les cartes ne changent pas de thème), rendu net 3× DPR,
  `loadAtlasFonts()` avant rasterisation.
- **États** (`CardSprite.ts`) : jouable = ring accent 2px ; non jouable = désaturée/assombrie (tint) ;
  hover = +14px ; gagnante = ring accent-2 + halo large.
- **Éventails** (`HandsLayer.ts`) : arc du DS — rotation (i−mid)×3°, montée −t²×1.4, overlap 32,
  groupe roté par siège (nord 180°, ouest 90°, est −90°), ancré 62px dans le feutre.
- **Stations** (`SeatsLayer.ts`) : pilule dégradée #2a3742→#131c24, logo d'équipe 32px (bleu dégradé /
  jaune damier), chips D (rouge) et E (jaune) 20px épinglées au coin haut-droit, badge de contrat
  SOUS la pilule (COINCHÉ rouge, SURCOINCHÉ bordeaux cerclé or), chip M (vert) du meneur autonome.
- **Feutre** (`FeltLayer.ts`) : rail dégradé (railHi→rail→railLo) + anneau intérieur, feutre radial
  felt1→felt2 + vignette, filigrane d'atout Playfair 240px + 4 coins 42px, padding responsive 22/14/8.
- **Pli** (`TrickLayer.ts`) : boîte 220×220, cartes orientées par siège, ramassage 140px vers le
  gagnant (600ms ease-in-out).
- **HUD** : classes `ky-*` du DS — feuille déchirée Caveat + menu ☰ en haut-droite SUR le rail,
  toast pilule (bord doré), dernier pli (mini-cartes), récap d'annonces (pilules jaune/rouge),
  panneau d'enchères 340px (grille 5×2, Capot or, Passe), bouton ✕ Coincher, popup Surcoincher,
  popup fin de manche (bannière VICTOIRE/DÉFAITE + chrono).
- **API** : `theme?: 'local'|'vip'|'competition'` + `themeOverrides?: Partial<PixiTableTheme>`.
- Démo : table plein page, UN composant ; seul le sélecteur de thème est hors Pixi.
