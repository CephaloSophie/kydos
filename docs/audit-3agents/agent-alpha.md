# AGENT ALPHA — réalité du code (constats indépendants)

## Ce qui tient debout (vérifié dans le code)
- Contrats critiques respectés : coéquipier toujours caché (partnerFaceDown:true),
  spectateurs jamais servis en hands (watcher:true sans main), rejeu lit op.seat,
  verrou releaseAllOf(tableId) en fin de partie, découplage web/mobile STRICT.
- Codebase saine : ~22 700 lignes. Aucun stub/TODO/FIXME réel.
- Moteur pur, table PixiJS partagée, clean archi mobile : conforme.
- 11 modules serveur bien enregistrés (auth,user,team,invitation,robot,table,
  game,analytics,competition,brain,wallet).

## Dette et incohérences détectées
- [A1] walletService.stake() défini mais JAMAIS appelé en prod (KB-071). Les
  mises ne sont pas prélevées : économie de jetons décorative. À brancher ou assumer.
- [A2] Parité WEB vs MOBILE : le web a sa propre pile socket ancienne
  (SocketService, BeloteTableClient) distincte du mobile (TableSocket). Le jeu en
  ligne, invitations, profil, émotes, LIVE ont été faits CÔTÉ MOBILE. Le web a
  dérivé. À trancher : web cible de premier plan ou secondaire ?
- [A3] ~11 console.log résiduels hors logger.
- [A4] packages/application (369 lignes) très mince : vérifier son utilité.

## Question ouverte d'Alpha
Existant solide et cohérent côté MOBILE. Point aveugle = le WEB (remise à parité
ou gel explicite). L'économie de jetons doit être branchée ou assumée.
