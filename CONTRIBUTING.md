# Contribuer à Kýdos Belote

## 1. Avant d'écrire une ligne

1. Lire `docs/ai/SPEC.md` (produit) puis `docs/ai/ARCHITECTURE.md` (technique).
2. Ouvrir le référentiel de tâches `docs/tasks/tasks.json`
   (tableau : `npx serve docs/tasks` → `board.html`).
3. Rapprocher la demande d'une tâche existante — enrichir ses `instructions`
   si c'est la même chose, en créer une sinon.
4. Mettre à jour `status`, `updatedAt` et `history` de la tâche.
5. Travailler par ordre de priorité (P0 d'abord).

## 2. Règles non négociables

- **Aucun stub, aucun provisoire.** Une fonctionnalité est livrée entière ou
  pas livrée.
- **`npm run tnr` vert** avant toute livraison.
- **Tout bug corrigé s'accompagne d'un test** qui échouait avant le correctif.
- **Documentation à jour dans la même livraison**, jamais après.
- **Aucun import croisé web ↔ mobile** : seuls `belote-core` et
  `@kydos/table-pixi` sont partagés.
- **Aucune valeur en dur** dans les écrans : uniquement des jetons du design system.
- Chaque fichier commence par un bloc décrivant son rôle.
- Commentaires de test en anglais, le reste en français.

## 3. Livrer une version

```bash
npm run tnr                     # tout vert
# bump des package.json + web/src/version.ts
# entrée CHANGELOG.md
# mise à jour docs/ + docs/tasks/tasks.json
```

## 4. Ajouter un module serveur

`model.ts` → `service.ts` → `controller.ts` → `routes.ts` → `index.ts`
(export d'un `AppModule`), puis une ligne dans `server/src/modules/index.ts`.
Ajouter les routes au test de contrat `server/src/test/api.contract.test.ts`
et à la collection Postman.

## 5. Ajouter un écran mobile

Écran dans `presentation/screens/`, enregistré dans `main.tsx` avec ses
métadonnées, ajouté aux menus de l'accueil si pertinent, couvert par un test
E2E dans `mobile/src/test/screens.e2e.test.ts`, documenté dans `MOBILE.md`.
