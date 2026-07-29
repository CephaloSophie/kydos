# Sons de la table — Kýdos Belote

Système audio de la table de jeu mobile : effets sonores des actions, mélodie
d'ambiance par type de table, et réglage des volumes par l'utilisateur.

## 1. Technique retenue

**Web Audio API native — zéro dépendance.** Choix motivé par :
- fonctionne tel quel dans la WebView Capacitor (Android/iOS) et le navigateur ;
- latence faible pour les effets (décodage en mémoire, lecture immédiate) ;
- **deux bus de volume indépendants** (mélodie / effets) via des `GainNode`,
  impossible proprement avec de simples balises `<audio>` ;
- aucun module externe à maintenir (howler.js et consorts n'apportent rien ici).

Architecture (`mobile/src/services/sound/`) :

| Fichier | Rôle |
| --- | --- |
| `soundConfig.ts` | **LE fichier à éditer** : mapping événement → fichier, table → mélodie, volumes par défaut. |
| `SoundService.ts` | Moteur Web Audio : chargement/cache, deux bus de gain, mélodie en boucle, volumes persistés, déblocage autoplay. |
| `soundEvents.ts` | Détection **pure** des événements par diff de deux vues moteur (testée, commune aux modes local et en ligne). |

Les fichiers audio vivent dans **`mobile/public/sounds/`** (servis sous
`/sounds/…`, copiés automatiquement dans le build par Vite).

## 2. Les effets sonores (noms FIXES)

Pour **remplacer un son sans toucher au code** : déposez votre fichier sous le
**même nom** dans `mobile/public/sounds/`. Formats acceptés : `.wav`, `.mp3`,
`.ogg` (si vous changez l'extension, mettez à jour `EFFECT_FILES` dans
`soundConfig.ts`).

| Fichier | Joué quand… |
| --- | --- |
| `card-play.wav` | **je** joue une carte |
| `card-other.wav` | un **autre** joueur ou robot joue une carte |
| `emote.wav` | un émoji apparaît sur la table (envoyé ou reçu) |
| `belote.wav` | annonce de **belote** (1re carte de la paire) et **rebelote** (2e) |
| `pass.wav` | un joueur **passe** |
| `bid-raise.wav` | **hausse d'annonce** (80, 90, 100…, capot) |
| `bid-reflexion.wav` | hausse d'annonce **après réflexion** 💭 |
| `contre.wav` | **contré** (coinche) |
| `surcontre.wav` | **surcontré** (surcoinche) |
| `trick-collect.wav` | **ramassage** du pli |

## 3. Les mélodies d'ambiance (une par TYPE de table)

Jouées **en boucle** pendant la partie, sur leur propre bus de volume. Le
mapping est dans `MELODY_BY_TABLE_KIND` (`soundConfig.ts`) :

| Type de table | Fichier | Mélodie par défaut |
| --- | --- | --- |
| repli (`default`) | `melody-default.wav` | **Ode à la joie** (Beethoven, 9e symphonie) |
| `local` (entraînement) | `melody-training.wav` | **Für Elise** (Beethoven) |
| `hybride` (équipe) | `melody-team.wav` | petite valse originale |
| `acier` / `competition` | `melody-competition.wav` | motif de la **5e symphonie** (Beethoven) |
| `royal` / `vip` | `melody-vip.wav` | arpèges façon **Clair de lune** (Beethoven) |

**Ajouter une mélodie pour un nouveau type de table** :
1. déposer `melody-montype.wav` dans `mobile/public/sounds/` ;
2. ajouter `'montype': 'melody-montype.wav'` dans `MELODY_BY_TABLE_KIND`.
C'est tout — le repli `default` couvre tout kind non listé.

**Droits d'auteur** : les mélodies livrées sont des compositions du **domaine
public** (Beethoven, mort en 1827) **synthétisées par notre script** — aucune
interprétation ni enregistrement protégé. Si vous remplacez par vos fichiers,
assurez-vous d'avoir les droits (ou utilisez des banques libres : Pixabay Music,
Free Music Archive CC0, incompetech CC-BY…).

## 4. Régénérer les sons par défaut

Tous les sons livrés sont **synthétisés** par un script conservé dans le repo :

```bash
python3 mobile/scripts/generate-sounds.py
```

Il réécrit l'intégralité de `mobile/public/sounds/`. Modifiez-le pour ajuster
notes, tempo, volumes ou ajouter des variantes (fonctions `fx_all()` et
`melodies_all()`).

## 5. Volumes utilisateur (modal 🔊)

Sur la table, le chip **🔊** ouvre un modal (design system — jamais d'alerte
native) avec **deux curseurs** : *Mélodie d'ambiance* et *Effets sonores*
(0–100). Le curseur d'effets joue un petit son témoin au réglage. Les valeurs
sont **persistées sur l'appareil** (localStorage) :

| Clé | Défaut |
| --- | --- |
| `kydos.sound.melodyVolume` | 35 |
| `kydos.sound.sfxVolume` | 70 |

Mettre un curseur à 0 coupe totalement le bus correspondant.

## 6. Détails d'implémentation utiles

- **Autoplay** : les WebViews suspendent l'audio tant qu'aucun geste utilisateur
  n'a eu lieu. Le service appelle `unlock()` au premier tap sur la table ; la
  mélodie démarre à ce moment-là (ou dès le kind du lobby reçu si déjà débloqué).
- **Détection des événements** : `detectSoundEvents(prev, next, mySeat)` compare
  deux vues moteur — nouvelles cartes du pli (mienne/autre), nouvelles enchères
  (pass/contre/surcontre/hausse ± réflexion), belote (progression de
  `belote.playedCount` avec `announcing`), ramassage (`awaitingCollect` → pli
  vide). Le premier rendu (prev = null) est silencieux : rejoindre une partie en
  cours ne déclenche pas une rafale.
- **Robustesse** : fichier manquant ou corrompu → silence (aucune exception UI).
  Environnement sans `AudioContext` (tests) → service inerte.
- **Mode spectateur** : toutes les cartes sonnent « autre joueur ».
- **Sortie d'écran** : la mélodie est coupée par le `_cleanup` de l'écran
  (navigation quelconque) et par le bouton Quitter.

## 7. Tests

- `mobile/src/services/sound/soundEvents.test.ts` — détection pure (10 cas).
- `mobile/src/services/sound/SoundService.test.ts` — persistance des volumes,
  bornes, inertie sans AudioContext, cohérence de la config.
