# wslogs — Moniteur temps réel des WebSockets (mode développement)

Tableau de bord d'observabilité pour le serveur Kýdos Belote. Affiche **en temps
réel** toutes les sessions de jeu actives (par table, par joueur connecté) et le
flux de logs des web services et des WebSockets.

## Utilisation

1. Démarrer le serveur en développement (le moniteur est actif par défaut ;
   pour le désactiver : `MONITOR_ENABLED=false`).
2. Ouvrir `wslogs/index.html` dans un navigateur.
3. Renseigner l'URL du serveur (défaut `http://localhost:4000`) et se connecter.

Le tableau consomme :
- `GET /api/monitor/snapshot` — état instantané au chargement.
- namespace socket `/monitor` — flux `monitor:log` (chaque log) et
  `monitor:sessions` (rafraîchissement des sessions toutes les 2 s).

Aucune donnée sensible n'est exposée (pas de mains de joueurs, seulement des
métadonnées de session et des logs).
