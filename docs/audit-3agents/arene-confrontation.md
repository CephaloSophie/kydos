# ARÈNE — confrontation des 3 agents & synthèse priorisée

Méthode : chaque constat est confronté aux deux autres lentilles. On ne garde que
ce qui résiste au croisement. Convergences = signal fort.

## Convergences (les 3 agents, indépendamment, pointent la même chose)

### ★ CONV-1 — Économie asymétrique (Alpha A1 + Beta B4 + Gamma G1) — P1
Les GAINS sont versés en fin de partie (gamePersistence: payoutsByUser →
walletService.credit, pour tout mode ≠ local), mais la MISE n'est JAMAIS
prélevée au lancement (aucun debit/stake en prod ; walletService.stake() est
du code mort). Résultat : création monétaire à chaque partie.
→ Trancher : brancher le prélèvement au démarrage (online/compétition) POUR
équilibrer les payouts existants, OU geler l'économie et le documenter.
Arbitrage : c'est le défaut de FOND le plus net. Priorité haute.

### ★ CONV-2 — Le référentiel/docs mentent sur l'existant (Beta B-fraîcheur + Gamma G4/G5/G6) — P1
- SPEC gelée à v10.4 (dit « online mobile passe par le web » : FAUX depuis v11).
- README à v10.3. Projet réel = v11.8.
- Tâches « MANQUANT » en réalité faites (KB-043 recherche+profil), à moitié
  faites (KB-063 favori : champ présent mais NON câblé pour la reprise), ou
  scindables (KB-004 : delete fait, edit absent).
→ Resynchroniser SPEC + README + tasks.json.

## Constats retenus après arbitrage (1–2 agents, non contredits)

- RET-1 [Gamma G2, confirmé Alpha] **Édition de robot absente** (KB-004) : pas
  d'updateRobot (serveur+mobile). Créer/supprimer OK, modifier NON. P1.
- RET-2 [Gamma G5, arbitré] **Robot favori non fonctionnel** : `favoriteRobot`
  existe au modèle mais n'est référencé NULLE PART dans game/table → la reprise
  auto par le favori (SPEC §3.8) n'utilise pas ce choix. P2.
- RET-3 [Alpha A2, arbitré] **Parité WEB** : le web build encore (dans le TNR)
  mais n'a PAS le jeu en ligne v11, invitations, profil, émotes, LIVE. Décision
  produit requise : remettre à parité OU déclarer le web secondaire et le geler
  par écrit. P2 (décision), P1 si le web reste une cible.
- RET-4 [Beta B1] **ELO réel des robots** : aujourd'hui dérivé de la personnalité
  (affichage), pas gagné/perdu. Pilier de la vision « robots-individus ». P2.
- RET-5 [Beta B2] **Tournois réels** : encore vitrine. Pilier de vision. P2/P3.
- RET-6 [Gamma G7/G8] **Aucune validation VISUELLE ni DB automatisée** en CI
  (Playwright + Mongo bloqués en sandbox). Angle mort pour un JEU. P2, activable
  en CI réelle (MONGOMS_AVAILABLE=1, runner avec navigateur).
- RET-7 [Beta B3] **Fédération de serveurs-villes** : cap lointain, à cadrer dans
  une ROADMAP/VISION même sans code. P3.
- RET-8 [Alpha A3/A4] **Hygiène** : ~11 console.log hors logger ; couche
  packages/application très mince (369 l.) à justifier ou fondre. P3.
- RET-9 [Gamma G3/G10] **Écran spectateur mobile dédié** (KB-081) + validation
  du rendu (pli, score Nous/Eux, émotes) : P2/P3.

## Non retenus / rejetés au croisement
- Les « TODO/stub » qu'Alpha a listés : tous légitimes (placeholders d'input,
  vocabulaire métier). Pas un défaut.
- Le web « mort » : réfuté — il build et passe les tests. C'est un défaut de
  PARITÉ, pas d'abandon.

## Priorisation consolidée (défaillances à corriger / travaux)
- **P1** : CONV-1 (économie), CONV-2 (resync docs+tasks), RET-1 (edit robot).
- **P2** : RET-2 (favori câblé), RET-3 (décision web), RET-4 (ELO réel),
  RET-6 (CI visuelle/DB), RET-9 (spectateur/rendu).
- **P3** : RET-5 (tournois), RET-7 (fédération), RET-8 (hygiène).
