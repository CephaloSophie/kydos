# Kýdos Belote — Roadmap

Trajectoire produit **après v11.8.0**, priorisée à partir de l'audit croisé
(`docs/AUDIT-3AGENTS.md`). Source de vérité produit : `docs/ai/SPEC.md`.
Suivi opérationnel des tâches : `board/board.html` + `tasks.json`.

Les priorités suivent l'échelle projet : **P0** (bloquant) · **P1** (important,
prochain jalon) · **P2** (souhaitable) · **P3** (cap lointain).

## Jalon immédiat — « Cohérence & fondations » (P1)

1. **Économie équilibrée.** Brancher le prélèvement de la mise au lancement
   (online / compétition) via `walletService.stake()`, en miroir des payouts déjà
   versés en fin de partie. Refuser le lancement si solde insuffisant (message
   clair). Alternative assumée : geler l'économie (désactiver les payouts) et le
   documenter. **Ne pas laisser l'état asymétrique actuel.**
2. **Édition de robot.** Ajouter `updateRobot` (serveur + mobile) : renommer,
   ré-ajuster la personnalité, changer l'avatar. Compléter le cycle CRUD (create
   et delete existent déjà).
3. **Resynchronisation continue des docs.** Garder SPEC/README/API alignés à
   CHAQUE livraison (règle projet déjà énoncée, à ne plus laisser déraper). La
   dérive de la SPEC (gelée ~10 versions) était le risque n°1 pour une reprise.

## Jalon suivant — « Robots-individus & parité » (P2)

4. **ELO réel des robots.** Faire évoluer un classement gagné/perdu par robot
   (mise à jour à la fin de chaque partie non-locale), distinct de l'ELO
   d'affichage dérivé de la personnalité. Base du modèle « algorithms as
   characters » de la SPEC.
5. **Classements réels** (KB-150/151) : endpoints de classement joueurs & robots
   alimentés par les vraies parties, en remplacement du podium de démonstration.
6. **Robot favori fonctionnel** : câbler `User.favoriteRobot` à la reprise
   automatique de siège (SPEC §3.8), avec repli sur un robot disponible.
7. **Décision parité web.** Trancher : soit remettre le web à parité (jeu en
   ligne v11, invitations, profil, émotes, LIVE) — gros chantier — soit déclarer
   le web « vitrine/legacy » par écrit et concentrer l'effort sur le mobile.
8. **Validation automatisée en CI réelle** : activer les tests Mongo
   (`MONGOMS_AVAILABLE=1`) et les captures Playwright sur un runner disposant du
   réseau/navigateur (bloqués en sandbox de dev). Pour un JEU, la non-régression
   VISUELLE (table, pli, score, émotes) est essentielle.
9. **Écran spectateur mobile dédié** (KB-081) : lister et rejoindre les parties à
   regarder, au-delà du mode « regarder » actuel.

## Cap produit — « Compétition & communauté » (P3)

10. **Tournois réels** : transformer la vitrine (Grand Prix des IA, Coupe
    Contrée, Ligue hebdo) en compétitions jouées, avec brackets, calendrier,
    récompenses.
11. **Fédération de serveurs-villes** : une communauté par ville, découverte et
    bascule entre serveurs. Cap structurant de la vision — à cadrer par un
    document d'architecture dédié avant tout code.
12. **Hygiène & dette** : retirer les `console.log` résiduels (passer par le
    logger), justifier ou fondre la couche `packages/application`.

## Hors périmètre / à surveiller

- Les bugs récemment corrigés (retour de partie & compteur spectateurs, rejeu
  `op.seat`, émotes `kind`/`type`) doivent rester couverts par le TNR.
- Toute nouvelle fonctionnalité respecte les conventions non-négociables de la
  SPEC §6 (aucun stub, livraison verte, tests en anglais, docs à jour, découplage
  web/mobile).
