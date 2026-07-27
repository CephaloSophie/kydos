# Design system mobile — Kýdos Belote

**Autonome** : `mobile/src/design-system/` ne référence aucun fichier hors de
ce dossier. L'application web possède son propre style ; les deux ne partagent
que la table Pixi (`@kydos/table-pixi`), qui apporte ses styles.

## 1. Structure

```
mobile/src/design-system/
├── index.css        point d'entrée (ordre d'import significatif)
├── tokens.css       variables : couleurs, typographies, rayons, ombres, durées
├── base.css         remise à zéro, mise en page, animations, garde paysage
└── components.css   vocabulaire visuel
```

Un seul import dans `main.tsx` : `import './design-system/index.css'`.

## 2. Aperçu vivant

Route **`#/styleguide`** — tous les composants rendus avec leurs variantes :
couleurs commentées, typographies, boutons, badges, mascottes, avatars,
champs, curseurs, cartes-fonctionnalités, dialogue. C'est la référence
visuelle et le premier endroit où une dérive se voit.

## 3. Règles

1. **Aucune valeur en dur** dans les écrans : toujours `var(--c-…)`,
   `var(--r-…)`, `var(--fs-…)`. Un écran qui code `#e6c46a` est un défaut.
2. **Paysage uniquement** : l'application affiche une garde d'orientation en
   portrait ; Capacitor force le paysage sur Android et iOS.
3. **Pas de liste déroulante native** : les `<select>` ouvrent un sélecteur
   hors design system, illisible sur mobile. Utiliser des pastilles tactiles
   visibles simultanément (cf. dialogue de configuration de partie).
4. **Coéquipiers** : équipe A = sièges A+C (« NOUS », vert),
   équipe B = sièges B+D (« EUX », rouge). Couleurs constantes partout.

## 4. Composants disponibles

`presentation/components/ui.ts` : `Robot`, `Avatar`, `Button` (primary /
secondary / ghost / danger, taille `sm`, `block`), `Badge` (gold / success /
danger / info / level / neutral), `Field`, `Slider`, `Dialog`, `ScreenHead`.

Composants d'écran : `TopBar` (marque, jetons cliquables, niveau),
`GameSetupDialog` (sièges tactiles, visibilité, manches).

## 5. Ajouter un composant

1. L'écrire dans `ui.ts` en n'utilisant que des jetons.
2. L'ajouter à l'écran styleguide avec toutes ses variantes.
3. Étendre le test E2E du styleguide.
4. Documenter son usage ici.
