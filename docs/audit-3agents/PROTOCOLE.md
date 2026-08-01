# Protocole des 3 agents — analyse indépendante puis confrontation

Trois revues INDÉPENDANTES du projet Kýdos Belote, chacune partant de la même
vérité terrain (transcripts /mnt/transcripts, docs docs/ai + board, et le
code sous /home/claude/belote), mais avec une GRILLE DE LECTURE distincte. Elles
ne communiquent pas pendant la phase d'analyse. Ensuite, confrontation (« arène »)
pour réconcilier constats, combler les angles morts, et produire :
  1. la mise à jour des docs existants,
  2. de nouveaux docs pour la suite,
  3. une liste priorisée des défaillances à corriger / travaux à réaliser.

## Agent ALPHA — « L'ingénieur / réalité du code »
Lentille : ce que le code FAIT réellement, ici et maintenant.
- Fouille le code (serveur, mobile, table-pixi, core), pas les intentions.
- Vérifie : contrats respectés, code mort, TODO/stubs, incohérences, dette.
- Question centrale : « L'existant tient-il debout et correspond-il aux docs ? »

## Agent BETA — « L'architecte produit / spec & docs »
Lentille : l'INTENTION, la vision, la couverture documentaire.
- Relit le transcript (arc v0.1 → v11.8) + SPEC + docs.
- Vérifie : ce qui était promis vs livré, ce qui manque au regard de la vision,
  cohérence et fraîcheur des docs.
- Question centrale : « Les docs disent-ils la vérité et couvrent-ils la vision ? »

## Agent GAMMA — « Le testeur / QA & défaillances jeu »
Lentille : le JOUEUR et la robustesse.
- Parcourt les bugs traités (KB-*), l'historique des captures, les parcours.
- Vérifie : défaillances résiduelles, cas limites, risques UX, trous de tests.
- Question centrale : « Où le jeu casse-t-il encore, et qu'est-ce qui n'est pas testé ? »

## Arène (confrontation)
Chaque constat est confronté aux deux autres agents (accord / désaccord /
complément). On ne garde que ce qui résiste au croisement, priorisé P0..P3.
