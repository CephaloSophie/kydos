# Back-Office Kydos — Manuel Fonctionnel

Guide d'utilisation du panel d'administration Kydos Belote.

---

## 1. Connexion

**URL** : `http://votre-domaine/login`

Entrer le nom d'utilisateur et le mot de passe d'un compte ayant le rôle `admin`. La session dure **4 heures** ; après expiration, vous serez redirigé automatiquement vers la page de connexion.

> Pour créer un premier admin, un développeur doit exécuter en MongoDB :
> `db.users.updateOne({ username: "nom" }, { $set: { role: "admin" } })`

---

## 2. Tableau de bord

Le dashboard affiche en temps réel :

- **Cartes statistiques** : utilisateurs totaux, connectés, parties en cours, tournois live
- **Tailles des files d'attente** : nombre de joueurs en attente par mode de jeu
- **Résumé économique 30 jours** : graphique à barres montrant rake, entrées tournoi, prix distribués
- **Tournois à venir** : tableau des prochains tournois avec date, format et inscrits

---

## 3. Gestion des tournois

### 3.1 Liste des tournois

Accessible via le menu **Tournois**. Filtrable par statut :

| Statut      | Badge   | Description                    |
|-------------|---------|--------------------------------|
| Brouillon   | Gris    | Tournoi en préparation         |
| A venir     | Bleu    | Publié, inscriptions ouvertes  |
| En cours    | Vert    | Tournoi en train de se jouer   |
| Terminé     | Discret | Tournoi achevé                 |
| Annulé      | Rouge   | Tournoi annulé, joueurs remboursés |

### 3.2 Créer un tournoi

Bouton **+ Nouveau tournoi**. Formulaire complet :

| Champ              | Obligatoire | Description                           |
|--------------------|-------------|---------------------------------------|
| Nom                | Oui         | Minimum 3 caractères                  |
| Format             | Oui         | Duo d'acier / Alliance hybride / Carrée royale |
| Capacité           | Oui         | 4, 8, 16, 32, 64 ou 128 joueurs      |
| Buy-in             | Oui         | Frais d'entrée en tokens (>= 0)       |
| Date de début      | Oui         | Doit être dans le futur               |
| Niveau minimum     | Non         | Filtre de niveau pour les participants |
| Description        | Non         | Texte libre                           |
| Couleur            | Non         | Code hex (défaut : or #e6c46a)        |
| Icône              | Non         | Emoji du tournoi                      |

**Grille des prix par position** : s'adapte automatiquement à la capacité choisie. Entrer le montant en tokens pour chaque position (1er, 2e, 3e, etc.).

**Aperçu économique** (panneau droit) :
- **Total collecté** : capacité × buy-in
- **Total distribué** : somme de tous les prix × occupants par position
- **Net maison** : collecté - distribué

Si le net est **négatif** (perte pour Kydos), un avertissement rouge apparaît. Il faut cocher **"Je comprends et j'accepte la perte"** pour pouvoir sauvegarder.

**Les 3 formats de jeu :**

| Format            | Composition                         | Robots déclarés à l'inscription |
|-------------------|-------------------------------------|---------------------------------|
| Duo d'acier       | 2 robots vs 2 robots                | 2 coéquipiers                   |
| Alliance hybride  | Humain + robot vs humain + robot    | 1 coéquipier + 1 remplaçant     |
| Carrée royale     | 4 humains (2 équipes)               | 1 remplaçant                    |

> **Carrée royale en tournoi** : le système forme des **équipes de 2 humains aléatoirement** au démarrage (fixes jusqu'à la fin). Le bracket se joue donc sur *capacité / 2* équipes, et chaque rang final (donc chaque gain) est partagé par les 2 coéquipiers. L'aperçu économique en tient compte automatiquement lorsque le format « Carrée royale » est sélectionné.

Options de sauvegarde :
- **Sauvegarder en brouillon** — crée le tournoi en statut `draft`
- **Publier immédiatement** — crée et publie directement (`upcoming`)

### 3.3 Modifier un tournoi

- **Brouillon** : tous les champs sont modifiables
- **Terminé** : seul le nom est modifiable (pour clarté historique)
- **Autres statuts** : non modifiable

### 3.4 Actions sur un tournoi

| Action    | Disponible si | Effet                                              |
|-----------|---------------|-----------------------------------------------------|
| Éditer    | `draft`       | Ouvre le formulaire de modification                  |
| Publier   | `draft`       | Passe le statut à `upcoming`, inscriptions ouvertes  |
| Annuler   | `upcoming`    | Rembourse tous les inscrits, statut → `cancelled`    |
| Supprimer | `draft`       | Suppression définitive                               |

### 3.5 Détail d'un tournoi

Affiche :
- Informations générales (format, capacité, buy-in, date, couleur...)
- Tableau des **gains par position**
- Liste des **participants** (seed, user ID, robots, position finale, prix)
- **Bracket** visuel si le tournoi a démarré (arbre à élimination directe)

---

## 4. Gestion des utilisateurs

### 4.1 Liste

Filtres disponibles :
- **Recherche** : par nom d'utilisateur
- **VIP** : oui / non / tous
- **Actif** : actif ces 30 derniers jours
- **Solde min** : filtre par solde minimum de tokens

Pagination par 20 résultats.

### 4.2 Détail utilisateur

Informations affichées :
- **Solde** de tokens
- **Nombre de parties** jouées
- **Statut VIP** et date d'expiration
- **Liste des robots** de l'utilisateur
- **Parties récentes** (20 dernières)
- **Historique des transactions** wallet

### 4.3 Actions admin

| Action          | Description                                    |
|-----------------|------------------------------------------------|
| Crédit manuel   | Ajouter des tokens au wallet (montant + raison) |
| Bannir          | Passe le rôle à `banned`, bloque l'accès        |

Le crédit manuel est enregistré comme transaction de type `refund` dans le wallet de l'utilisateur.

---

## 5. Codes promotionnels

### 5.1 Créer un code

| Champ              | Obligatoire | Format / Contrainte                |
|--------------------|-------------|-------------------------------------|
| Code               | Oui         | 12 chiffres (affiché 1111-2222-3333) |
| Tokens             | Oui         | Nombre de tokens accordés            |
| Expiration         | Oui         | Date limite d'utilisation            |
| Max utilisations   | Non         | Défaut : 1                           |
| Label              | Non         | Description interne                  |

### 5.2 Actions

- **Modifier** : changer tokens, expiration, max utilisations, label
- **Activer / Désactiver** : toggle le statut `active`
- **Supprimer** : suppression définitive

---

## 6. Comptabilité

### 6.1 Résumé par période

Sélectionner une période (date début / fin) pour voir :
- **Cartes** : rake total, entrées tournoi, prix distribués, net maison
- **Tableau journalier** : ventilation jour par jour

### 6.2 Transactions

Liste paginée de toutes les transactions de la maison, filtrable par :
- **Type** (kind) : rake, tournament_entry, tournament_prize, refund...
- **Date** : période

### 6.3 Export CSV

Bouton **Exporter CSV** pour télécharger les transactions affichées.

---

## 7. Monitoring

Page de suivi en **temps réel** (auto-refresh toutes les 5 secondes).

Métriques affichées :
- **Utilisateurs totaux** et **actifs** (connectés)
- **Parties actives** en cours
- **Tournois live**
- **Tailles des files d'attente** par mode

Tableau des **parties actives** avec détails (joueurs, mode, durée).

---

## 8. Journal d'audit

Toutes les actions d'administration sont automatiquement tracées :

| Information   | Détail                                   |
|---------------|------------------------------------------|
| Admin         | Qui a fait l'action                       |
| Action        | Type d'action (ex: `tournament.create`)   |
| Cible         | ID de l'objet impacté                     |
| Avant / Après | État avant et après modification          |
| Date          | Horodatage précis                         |

Accessible via l'endpoint API `/admin/audit` (filtrable par action et admin).

---

## 9. Navigation

Le menu latéral (sidebar) donne accès à :

1. **Tableau de bord** — Vue d'ensemble
2. **Tournois** — Gestion complète
3. **Utilisateurs** — Administration des comptes
4. **Codes Promo** — Gestion promotionnelle
5. **Comptabilité** — Suivi financier
6. **Monitoring** — Suivi temps réel
7. **Guide** — Aide intégrée : documentation de chaque section, règles de gestion, création d'un admin (seed), lancement

Le **header** affiche le nom de l'admin connecté et un bouton de déconnexion.

---

## 10. Guide intégré

La page **Guide** (menu latéral) centralise, directement dans l'interface, toute l'information utile pour administrer la plateforme :
- Création d'un compte admin via le script seed (`npm run seed:admin`) ou MongoDB.
- Lancement de l'API et du frontend.
- Les 3 formats de jeu et le fonctionnement de la Carrée royale en tournoi.
- Pour chaque section (tournois, utilisateurs, promos, comptabilité, monitoring, sécurité/audit) : rôle, règles, actions disponibles et endpoints.
