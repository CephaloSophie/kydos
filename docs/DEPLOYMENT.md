# Déploiement — Belote Contrée

Guide pour installer la plateforme en **local** ou sur un **VPS de test/production**.

## 1. Prérequis

- Node.js ≥ 20, npm ≥ 10
- MongoDB (local, Docker, ou Atlas) — ou base en mémoire (`USE_MEMORY_DB=true`)
- VPS : PM2 (`npm i -g pm2`), Nginx, certbot (TLS)

## 2. Préparer le projet

```bash
git clone <repo> belote && cd belote
npm install
cp server/.env.example server/.env      # éditer : MONGO_URI, JWT_SECRET, CORS_ORIGIN…
npm --workspace belote-web run build     # front statique → web/dist
mkdir -p logs
```

## 3. Lancer avec PM2

```bash
pm2 start ecosystem.config.cjs --only belote-api       # backend (prod)
pm2 start ecosystem.config.cjs --only belote-web       # frontend (preview du build)
# Debug backend (inspector :9229) :
pm2 start ecosystem.config.cjs --only belote-api-debug

pm2 status
pm2 logs belote-api
pm2 save && pm2 startup                                  # relance au reboot
```

Process définis dans `ecosystem.config.cjs` : `belote-api`, `belote-api-debug`, `belote-web`, `belote-web-dev`.

## 4. Nginx (reverse proxy + WebSocket)

Exemple de bloc serveur (`/etc/nginx/conf.d/belote.conf`) — adapter le domaine :

```nginx
server {
    listen 80;
    server_name app.kantoaplo.com;

    # Front : build statique
    root /var/www/belote/web/dist;
    index index.html;
    location / { try_files $uri /index.html; }

    # API REST + WebSocket → backend Node
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

> Servir le front via Nginx (statique) est plus robuste que `pm2 belote-web`. Dans ce cas, ne lancer
> que `belote-api` sous PM2. Régler `CORS_ORIGIN` (server/.env) sur l'URL publique du front.

## 5. TLS (Let's Encrypt)

```bash
sudo certbot --nginx -d app.kantoaplo.com
```

## 6. Mise à jour

```bash
git pull
npm install
npm --workspace belote-web run build
pm2 restart belote-api          # (+ belote-web si servi par PM2)
```

## 7. Vérifier

- API vivante : `curl http://127.0.0.1:4000/api/auth/me` → `401` (normal sans token) = serveur OK.
- Tester l'ensemble des endpoints : `server/tnr/` (Postman + OpenAPI). Voir `server/tnr/README.md`.

## 8. Dépannage

| Symptôme | Piste |
|----------|-------|
| 502 derrière Nginx | Le backend écoute-t-il sur `:4000` ? `pm2 logs belote-api` |
| CORS bloqué | `CORS_ORIGIN` doit valoir l'URL exacte du front |
| WebSocket KO | Bloc `location /socket.io/` + headers `Upgrade/Connection` |
| Connexion Mongo | Vérifier `MONGO_URI` ; tester d'abord avec `USE_MEMORY_DB=true` |
