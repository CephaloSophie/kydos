# Jetons, économie & codes promo — Kýdos Belote

Fonctionnement du porte-monnaie : prélèvement des mises au lancement, gains en
fin de partie, récompense quotidienne, **codes de rechargement**, et statut VIP
(voir aussi `docs/ADS.md`).

## 1. Le porte-monnaie

Chaque utilisateur a un solde de jetons (◆) stocké côté serveur
(`user.wallet.tokens`), avec un journal des transactions (`daily`, `game_stake`,
`game_win`, `refund`, `promo`). Le mobile lit/écrit via l'API (serveur-premier),
avec un repli local pour la démo hors-ligne.

**Accès** : la pastille ◆ en haut de l'écran ouvre désormais la page **« Mon
porte-monnaie »** (déblocage quotidien, code promo, VIP, pub récompensée y sont
regroupés). Elle ne débloque plus les jetons au clic — tout se passe sur la page.

## 2. Économie de partie (mises & gains)

Barème (SPEC §3.9), appliqué aux parties **en ligne** (l'entraînement local est
gratuit) :

| Siège | Mise au lancement | Gain (équipe gagnante) |
| --- | --- | --- |
| Humain | 100 ◆ | 4 humains → 150 ◆ ; 2H+2R → 225 ◆ pour l'humain |
| Robot | 50 ◆ | 4 robots → 150 ◆ au propriétaire du robot gagnant |

**Prélèvement au LANCEMENT** (nouveau) : quand le créateur démarre la table, le
serveur débite la mise de **chaque** joueur concerné (`walletService.stakeGame`).
C'est **tout ou nothing** : si un joueur n'a pas de quoi payer, la partie ne
démarre pas et personne n'est débité ; si un débit échoue en cours de route, les
débits déjà faits sont **remboursés** (transaction `refund`). Le gain est
crédité en fin de partie (`game_win`), comme avant.

Ce prélèvement corrige l'asymétrie historique (les gains étaient versés sans que
la mise soit prélevée — audit KB-300).

## 3. Récompense quotidienne

500 ◆ par jour, une seule fois (idempotent par jour UTC). Débloquée depuis la
page porte-monnaie. Le module publicitaire permet aussi de **regarder une pub**
pour récupérer le quotidien, ou **+100 ◆** par visionnage si déjà pris
(voir `docs/ADS.md`).

## 4. Codes de rechargement (promo)

Un **code de 12 chiffres** crédite un nombre de jetons défini, avec une **date de
validité** (1 semaine, 1 mois…) et un quota d'utilisations. Un même code ne peut
être utilisé **qu'une fois par personne**.

### Côté joueur

Sur la page porte-monnaie, carte « Recharger avec un code » : le champ affiche un
**tiret tous les 4 chiffres** (`1234-5678-9012`) — purement visuel, seul le
nombre est envoyé. À la validation, les jetons sont crédités (transaction
`promo`).

### Côté base de données

Modèle `PromoCode` (`server/src/modules/promo/promo.model.ts`) :

| Champ | Rôle |
| --- | --- |
| `code` | 12 chiffres, unique (sans séparateur). |
| `tokens` | Jetons crédités. |
| `expiresAt` | Date de validité (au-delà : refusé). |
| `maxRedemptions` | Nombre maximal d'utilisations (tous utilisateurs). |
| `redeemedBy` | Utilisateurs ayant déjà utilisé le code (anti-rejeu). |
| `active` | Désactivation sans suppression. |
| `label` | Note interne (campagne). |

### Créer des codes

Programmatique (service) :

```ts
import { promoService } from './modules/promo/index.js';
await promoService.create({
  code: '123456789012',   // 12 chiffres
  tokens: 2000,
  durationDays: 30,        // validité
  maxRedemptions: 500,     // optionnel (défaut 1)
  label: 'Campagne été',   // optionnel
});
```

Le **seed** crée 3 codes de démonstration :

| Code | Jetons | Validité |
| --- | --- | --- |
| `1111-2222-3333` | 500 ◆ | 7 jours |
| `4444-5555-6666` | 2 000 ◆ | 30 jours |
| `9999-8888-7777` | 10 000 ◆ | 30 jours |

(Régénérez avec `npm --workspace belote-server run seed`.)

### Endpoint

`POST /api/promo/redeem` (authentifié), corps `{ code }` (chiffres ou format à
tirets — le serveur normalise). Réponses d'erreur explicites : code inconnu,
expiré, désactivé, épuisé, déjà utilisé, format invalide.

## 5. VIP

Le statut VIP (sans publicité) s'achète en jetons sur la page porte-monnaie —
détails dans `docs/ADS.md` §6.

## 6. Tests

- `server/src/modules/promo/promo.service.test.ts` — normalisation & format.
- `server/src/modules/game/scoreLogic.test.ts` — balance mises/gains.
- `mobile/src/services/promoCode.test.ts` — formatage à tirets, complétude.
- `mobile/src/services/ads/*` — VIP & AdManager.
- Contrat HTTP : `/api/promo/redeem` protégé par authentification.

Les mutations Mongo (redemption réelle, stake au lancement) s'exécutent dans les
tests d'intégration (job CI `tnr-server` avec `MONGOMS_AVAILABLE=1`).
