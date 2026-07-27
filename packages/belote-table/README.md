# @kanto-aplo/belote-table

Table de **Belote Contrée** autonome : un composant React **responsive** et **plein écran**, piloté par un **contrôleur** (`BeloteTableClient`) que l'on configure avec une URL de socket et un token. Conçu pour être embarqué dans n'importe quelle application web (ou une WebView), testé seul sans backend, et publié sur npm.

Architecture **MVC** :

- **Model** — le moteur de jeu (`belote-core`, embarqué dans le bundle) : règles, contexte, état.
- **Controller** — `BeloteTableClient` : encapsule Socket.IO + REST, expose le contexte, un flux d'évènements, les logs et les actions.
- **View** — `BeloteTable` (+ composants du design system) : rendu responsive dans un `TableStage` mis à l'échelle.

---

## Installation

```bash
npm install @kanto-aplo/belote-table
# peer dependencies (si absentes) :
npm install react react-dom
```

Importer **une fois** la feuille de styles dans l'application hôte :

```ts
import '@kanto-aplo/belote-table/styles.css';
```

---

## Démarrage rapide

### 1. Composant React connecté

```tsx
import { BeloteTable } from '@kanto-aplo/belote-table';
import '@kanto-aplo/belote-table/styles.css';

export function Salle({ tableId, token }: { tableId: string; token: string }) {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <BeloteTable config={{ socketUrl: 'https://ville-1.exemple.com', token, tableId }} />
    </div>
  );
}
```

La table se connecte, rejoint `tableId`, affiche le jeu dès qu'il démarre et envoie les actions (annonces, cartes) automatiquement. Elle se met à l'échelle pour remplir son conteneur et propose un bouton plein écran.

### 2. Montage hors React (une ligne)

```ts
import { mountBeloteTable } from '@kanto-aplo/belote-table';
import '@kanto-aplo/belote-table/styles.css';

const handle = mountBeloteTable(document.getElementById('table')!, {
  config: { socketUrl: 'https://ville-1.exemple.com', token, tableId },
});
// plus tard :
handle.unmount();
```

### 3. Test autonome (sans backend)

```tsx
import { StandaloneBeloteTable } from '@kanto-aplo/belote-table';
// 1 humain + 3 robots, partie pilotée localement (idéal pour tester le module)
<StandaloneBeloteTable />
// ou hors React :
import { mountStandaloneBeloteTable } from '@kanto-aplo/belote-table';
mountStandaloneBeloteTable(document.getElementById('demo')!);
```

---

## Configuration (`BeloteTableClientConfig`)

| Champ        | Type                                  | Défaut                       | Rôle |
|--------------|---------------------------------------|------------------------------|------|
| `socketUrl`  | `string`                              | —                            | URL du serveur Socket.IO de la ville. |
| `apiUrl`     | `string`                              | `socketUrl`                  | Base REST (le serveur ajoute `/api`). |
| `token`      | `string`                              | —                            | Jeton d'auth (Bearer + handshake socket). |
| `tableId`    | `string`                              | —                            | Table rejointe automatiquement à la connexion. |
| `transports` | `('websocket'\|'polling')[]`          | `['websocket','polling']`    | Transports Socket.IO. |
| `logLimit`   | `number`                              | `200`                        | Taille max du journal en mémoire. |

---

## Le contrôleur `BeloteTableClient`

À utiliser directement quand on veut piloter la table soi-même (sa propre UI, plusieurs tables, etc.).

```ts
import { BeloteTableClient } from '@kanto-aplo/belote-table';

const client = new BeloteTableClient({ socketUrl, token });
client.connect();
client.subscribe('table_123');
```

### Consulter le contexte du jeu

`client.getContext()` renvoie à tout moment un instantané :

```ts
const ctx = client.getContext();
ctx.status;    // 'idle' | 'connecting' | 'connected' | 'disconnected'
ctx.tableId;   // table courante
ctx.table;     // BeloteTableSnapshot | null  (lobby : sièges, statut, config)
ctx.state;     // BeloteGameState | null      (vue moteur + main + cartes légales + résumé)
ctx.finished;  // { winner?: 'A' | 'B' } | null
```

Le champ `state.view` est la **vue moteur** complète (`EngineView`) : `phase`, `turn`, `trump`, `bids[]`, `currentTrick`, `dealer`, `firstBidderSeat` (Entame), `bidderSeat`, `currentBidValue`, `contre`, `manchesWon`, `cumulative`, etc.

### Écouter les évènements (flux)

```ts
const off = client.on((event) => {
  switch (event.type) {
    case 'status':        /* event.status */ break;
    case 'table':         /* event.table  — lobby/sièges mis à jour */ break;
    case 'tablesChanged': /* la liste des tables a changé */ break;
    case 'state':         /* event.state  — nouvel état de jeu */ break;
    case 'finished':      /* event.winner — partie terminée */ break;
    case 'error':         /* event.error  — message d'erreur */ break;
  }
});
// se désabonner :
off();
```

### Consulter les logs

`client.getLogs()` renvoie le journal des évènements reçus (le plus récent en dernier, borné par `logLimit`) — utile pour une console de debug ou un panneau d'inspection :

```ts
for (const entry of client.getLogs()) console.log(entry.type, entry);
```

### Envoyer des actions

```ts
// Annonce (Demande) — voir « Modèle d'annonce » ci-dessous
client.bid({ action: 'bid', value: 110, suit: 'pique', saidSuit: true });
client.bid({ action: 'bid', value: 120, repeatPartnerSuit: true, reflexion: true });
client.bid({ action: 'capot', suit: 'coeur', saidSuit: true });
client.bid({ action: 'contree' });
client.bid({ action: 'surcontree' });
client.bid({ action: 'pass' });

// Jouer une carte
client.play({ rank: 'A', suit: 'pique' });
```

#### Modèle d'annonce (`Bid`)

| Champ               | Type                                                  | Sens |
|---------------------|-------------------------------------------------------|------|
| `action`            | `'pass'\|'bid'\|'capot'\|'contree'\|'surcontree'`     | Type d'action. |
| `value`             | `number`                                              | Valeur de l'annonce (90…180). |
| `suit`              | `'pique'\|'coeur'\|'carreau'\|'trefle'`               | Couleur explicitement nommée. |
| `saidSuit`          | `boolean`                                             | `true` si la couleur est nommée (affichée). |
| `reflexion`         | `boolean`                                             | Signal « réflexion » (valide seulement en montant l'enchère). |
| `repeatPartnerSuit` | `boolean`                                             | Reprend la couleur du coéquipier sans la nommer (valide seulement en montant). |

Règles appliquées par le serveur : un signal sans montée d'enchère est refusé ; une annonce sans couleur nommée **ni** « répéter » est refusée.

### Cycle de vie

```ts
client.subscribe(tableId);   // rejoindre une table
client.unsubscribe();        // quitter
client.disconnect();         // fermer la connexion
```

---

## Responsivité & plein écran

`BeloteTable` (et `mountBeloteTable`) enferme la table dans un **`TableStage`** : la table est rendue à une **taille de référence fixe** (`baseWidth`×`baseHeight`, défaut 980×620) puis **mise à l'échelle** (`transform: scale`) pour remplir son conteneur — le design est préservé **au pixel près**, sans réorganisation. Le bouton plein écran utilise la **Fullscreen API** du navigateur.

```tsx
<BeloteTable config={{ socketUrl, token, tableId }} baseWidth={980} baseHeight={620} fullscreen />
```

Le composant remplit son parent : donnez-lui un conteneur dimensionné (`position: fixed; inset: 0`, une grille, etc.).

---

## Build & publication

Le bundle est produit par Vite en mode librairie :

```bash
npm --workspace belote-web run build:lib
```

Sorties dans `packages/belote-table/dist/` :

- `belote-table.js` — bundle ESM (React/ReactDOM externes, `belote-core` + design system inclus).
- `belote-table.css` — styles du module.

Publication :

```bash
cd packages/belote-table
npm publish
```

`react` et `react-dom` sont des **peerDependencies** ; `socket.io-client` est une dépendance du paquet.

---

## API exportée (récapitulatif)

| Export                      | Type        | Rôle |
|-----------------------------|-------------|------|
| `BeloteTable`               | composant   | Vue connectée + responsive (config-driven). |
| `useBeloteTable`            | hook        | Relie un client à l'état React. |
| `BeloteTableClient`         | classe      | Contrôleur réseau (socket+REST+contexte+events+logs+actions). |
| `StandaloneBeloteTable`     | composant   | Table jouable sans backend (test/démo). |
| `TableStage`                | composant   | Conteneur responsive + plein écran. |
| `mountBeloteTable`          | fonction    | Montage DOM (connecté), une ligne. |
| `mountStandaloneBeloteTable`| fonction    | Montage DOM (autonome). |
| `GameTable`/`TableSurface`/`ScoreView`/`DevDock` | composants | Vues bas-niveau (usage avancé). |

---

## Évènements Socket.IO (contrat serveur)

Le client **émet** : `table:subscribe`, `table:unsubscribe`, `table:bid`, `table:play`.
Le client **écoute** : `tables:changed`, `table:update`, `table:game`, `table:finished`.

Pour intégrer un autre backend, exposez ce même contrat (ou étendez `BeloteTableClient`).
