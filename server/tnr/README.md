# TNR — Tests & doc des API

Ce dossier contient tout pour exercer et documenter l'API de `belote-server`.

## Contenu

| Fichier | Rôle |
|---------|------|
| `belote-api.postman_collection.json` | Collection Postman — **toutes** les API (49 requêtes, 10 dossiers). |
| `env.local.postman_environment.json` | Environnement Postman pour le **local** (`http://localhost:4000/api`). |
| `env.vps.postman_environment.json`   | Environnement Postman pour le **VPS de test**. |
| `openapi.json` | Spécification **OpenAPI 3** — à visualiser dans Swagger UI / Redoc / Postman. |
| `.env.example` | Rappel des variables d'environnement du serveur. |

## Utiliser la collection (Postman)

1. **Importer** `belote-api.postman_collection.json` et un environnement (`env.local…` ou `env.vps…`).
2. Sélectionner l'environnement en haut à droite.
3. Lancer **Auth ▸ Login** (ou **Register** la première fois) → le **token** est enregistré automatiquement
   dans la variable `{{token}}` ; toutes les requêtes authentifiées l'utilisent.
4. Les créations (robot, cerveau, équipe…) enregistrent leur **id** dans l'environnement
   (`{{robotId}}`, `{{brainId}}`…), réutilisé par les requêtes suivantes (détail, modifier, supprimer).

### En ligne de commande (Newman)

```bash
npm i -g newman
newman run belote-api.postman_collection.json -e env.local.postman_environment.json
```

## Visualiser la documentation (OpenAPI)

- **Swagger UI** (Docker) :
  ```bash
  docker run -p 8080:8080 -e SWAGGER_JSON=/spec/openapi.json -v "$PWD":/spec swaggerapi/swagger-ui
  # → http://localhost:8080
  ```
- **Redoc** :
  ```bash
  npx @redocly/cli preview-docs openapi.json
  ```
- Ou importer `openapi.json` directement dans Postman (Import ▸ OpenAPI).

## Convention

- Toutes les routes sont préfixées par **`/api`**.
- Authentification : en-tête `Authorization: Bearer <token>` (sauf `/auth/login` et `/auth/register`).
