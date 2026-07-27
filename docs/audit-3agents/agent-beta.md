# AGENT BETA — intention produit, spec & docs (constats indépendants)

## Vision (rappel, d'après SPEC + transcripts v0.1→v11.8)
Kýdos = plateforme de jeux à robots (« algorithms as characters »), belote
contrée en premier. Robots = individus (nom, avatar, personnalité, ELO, stats,
replays publics). Cap à terme : fédération de serveurs-villes. Parties vécues
comme des matchs sportifs (rejeu, historique).

## Écart promis vs livré (ce qui manque à la vision)
- [B1] **ELO réel des robots** : la SPEC fait des robots des individus à ELO
  cumulé. Or l'ELO est aujourd'hui DÉRIVÉ de la personnalité (affichage), pas un
  classement gagné/perdu qui évolue. Idem « classements réels » (KB-150/151).
- [B2] **Compétitions/tournois** : encore une vitrine (SPEC §3.6 l'assume), mais
  c'est un pilier de la vision. Aucun tournoi réel n'existe.
- [B3] **Fédération de serveurs-villes** : cap majeur, zéro amorce. À cadrer même
  si lointain (au moins un doc de vision/roadmap).
- [B4] **Économie de jetons** : SPEC §3.9 décrit des prélèvements ET des gains par
  partie. La récompense quotidienne existe ; les PRÉLÈVEMENTS de mise ne sont pas
  branchés (concordant avec Alpha A1). Les payouts de fin de partie : à vérifier.

## Défaillance documentaire (fraîcheur — mesurée)
Projet réel = v11.8.0. Dernières versions citées par doc :
- SPEC.md → v10.4.0 (GELÉ ~10 versions en arrière ; dit encore « le jeu temps
  réel mobile passe par le web », FAUX depuis v11 : le mobile est temps réel
  natif serveur). Ne mentionne NI Capacitor, NI board Agile, NI profil joueur,
  NI émotes visibles par tous, NI indicateur LIVE, NI rendu réaliste du pli, NI
  score Nous/Eux.
- README.md → v10.3.0 (obsolète).
- ARCHITECTURE.md → v11.0.0 ; DEPLOYMENT.md → v11.2.0 ; API.md → v11.6.0.
- MOBILE.md → v11.8.0 (à jour, seul doc suivi rigoureusement).
- DESIGN-SYSTEM.md, TESTING.md → aucune version (probablement figés).

## Docs manquants pour la suite (à créer)
- [B5] **ROADMAP.md** : trajectoire post-v11.8 (ELO réel, tournois, économie
  branchée, parité web, fédération) avec jalons.
- [B6] **VISION.md** ou section : la fédération de serveurs-villes, « algorithms
  as characters », modèle des robots-individus — aujourd'hui éparpillé dans la SPEC.
- [B7] **CHANGELOG** existe et est bien tenu ; OK.

## Question ouverte de Beta
La SPEC — « source unique de vérité produit » — ment sur l'architecture online et
ignore 8 versions de livraisons. C'est le risque n°1 pour toute IA qui reprendrait
le projet. Priorité : resynchroniser SPEC + README, puis créer ROADMAP.
