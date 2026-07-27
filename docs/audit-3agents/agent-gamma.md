# AGENT GAMMA — QA, défaillances jeu & trous de tests (constats indépendants)

## Défaillances / risques résiduels (vérifiés)
- [G1] **Économie à moitié branchée** (raffine A1/B4) : les GAINS sont versés en
  fin de partie (gamePersistence → payoutsByUser → walletService.credit), mais
  la MISE n'est JAMAIS prélevée au lancement (aucun appel debit/stake en prod).
  Conséquence : de la monnaie est créée ex nihilo à chaque partie → inflation.
  P1. Brancher le prélèvement au démarrage (online/compétition), ou geler
  explicitement l'économie.
- [G2] **Édition de robot absente** (KB-004) : deleteRobot existe, PAS d'updateRobot
  côté serveur ni mobile. On peut créer/supprimer, pas MODIFIER un robot. P1.
- [G3] **Écran spectateur mobile** (KB-081) : le mode « regarder » existe via la
  table online, mais pas d'écran dédié listant/rejoignant les parties à regarder.
  À clarifier (peut-être déjà couvert par le lobby « en cours »).

## Dérive du référentiel (tâches vs code réel) — À CORRIGER
Plusieurs tâches marquées « MANQUANT » sont en réalité faites (référentiel pas
resynchronisé) :
- [G4] KB-043 (recherche users + profil public) : searchUsers + /users/search +
  popup profil (v11.6) EXISTENT. → à passer « tested ».
- [G5] KB-063 (robot favori) : champ favoriteRobot présent dans le modèle User.
  Reste à vérifier l'usage (reprise auto par le favori). → partiellement fait.
- [G6] KB-004 : delete FAIT, edit MANQUANT → scinder / requalifier.

## Trous de tests
- [G7] KB-112 Playwright BLOQUÉ (sandbox cdn 403) : aucune capture/preuve visuelle
  automatisée. Le rendu (table, animations, émotes, score) n'est JAMAIS validé
  visuellement en CI — angle mort majeur pour un jeu.
- [G8] KB-113 Mongo en CI BLOQUÉ (fastdl) : tests d'intégration écrits mais non
  exécutés en CI (exécutables via MONGOMS_AVAILABLE=1). Le contrat DB réel n'est
  pas vérifié automatiquement.
- [G9] Pas de test sur le prélèvement/versement de l'économie de bout en bout.
- [G10] Émotes distantes / score Nous/Eux relatif / placement du pli : couverts
  en logique (helper trickPlacement testé) mais pas au niveau rendu.

## Bugs récemment corrigés (à surveiller en non-régression)
Retour de partie + compteur spectateurs (KB-270), rejeu op.seat (KB-272),
émotes kind vs type (KB-290) — vérifier qu'ils restent verts.

## Question ouverte de Gamma
Le jeu « marche » mais deux défaillances de fond subsistent : l'économie
asymétrique (gains sans mises) et l'impossibilité de MODIFIER un robot. Et le
référentiel ment sur ~3 tâches. Enfin, aucune validation VISUELLE automatisée.
