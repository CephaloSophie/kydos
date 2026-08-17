import { Component } from '@angular/core';

/**
 * Page d'aide / guide interne du back-office. Centralise toute l'information
 * utile pour administrer la plateforme : démarrage (création d'un admin via
 * seed), rôle et règles de chaque section (controller), et référence rapide
 * des actions disponibles. Accessible depuis le menu latéral.
 */
@Component({
  selector: 'app-help',
  template: `
    <div class="page-header">
      <h1>Guide d'administration</h1>
    </div>

    <div class="help-grid">
      <!-- Démarrage / Seed admin -->
      <section class="card">
        <div class="card-header"><h3>🔑 Créer un compte administrateur (seed)</h3></div>
        <p class="muted">Le back-office n'a pas d'inscription : un compte doit avoir le rôle <code>admin</code>.</p>
        <p><strong>Méthode recommandée — script seed :</strong></p>
        <pre>cd back-office/server
# Identifiants par défaut (admin / admin123)
npm run seed:admin

# Ou identifiants personnalisés : &lt;username&gt; &lt;password&gt; &lt;email&gt;
npm run seed:admin -- monadmin motdepasse admin&#64;kydos.local</pre>
        <p class="muted">Si l'utilisateur existe déjà, son rôle passe à <code>admin</code>. Sinon il est créé.</p>
        <p><strong>Alternative — directement en MongoDB :</strong></p>
        <pre>db.users.updateOne(
  {{ '{' }} username: "monuser" {{ '}' }},
  {{ '{' }} $set: {{ '{' }} role: "admin" {{ '}' }} {{ '}' }}
)</pre>
        <p class="muted">Rôles possibles : <code>user</code> (défaut), <code>admin</code> (accès back-office), <code>banned</code> (bloqué).</p>
      </section>

      <!-- Lancement -->
      <section class="card">
        <div class="card-header"><h3>🚀 Lancer le back-office</h3></div>
        <pre># API (port 3001)
cd back-office/server
cp .env.sample .env   # ajuster MONGO_URI / JWT_SECRET
npm install
npm run dev

# Frontend (port 4200)
cd back-office
npm install
npx ng serve --proxy-config proxy.conf.json</pre>
        <p class="muted">Le proxy Angular redirige <code>/api/*</code> → <code>http://localhost:3001</code>. En production : voir <code>ecosystem.config.cjs</code> (PM2).</p>
      </section>

      <!-- Formats de jeu -->
      <section class="card">
        <div class="card-header"><h3>🃏 Les 3 formats de jeu</h3></div>
        <table>
          <thead><tr><th>Format</th><th>Composition</th><th>Robots à l'inscription</th></tr></thead>
          <tbody>
            <tr><td>Duo d'acier</td><td>2 robots vs 2 robots</td><td>2 coéquipiers</td></tr>
            <tr><td>Alliance hybride</td><td>Humain + robot vs humain + robot</td><td>1 coéquipier + 1 remplaçant</td></tr>
            <tr><td>Carrée royale</td><td>4 humains (2 équipes)</td><td>1 remplaçant</td></tr>
          </tbody>
        </table>
        <p class="muted"><strong>Carrée royale en tournoi :</strong> le système forme des équipes de 2 humains aléatoirement au démarrage (fixes jusqu'à la fin). Le bracket se joue donc sur <code>capacité / 2</code> équipes ; chaque rang final est partagé par les 2 coéquipiers.</p>
      </section>

      <!-- Tournois -->
      <section class="card">
        <div class="card-header"><h3>🏆 Tournois</h3></div>
        <p>Cycle de vie : <span class="badge draft">Brouillon</span> → <span class="badge upcoming">À venir</span> → <span class="badge live">En cours</span> → <span class="badge finished">Terminé</span> (ou <span class="badge cancelled">Annulé</span>).</p>
        <ul>
          <li><strong>Créer / éditer</strong> : nom, format, capacité (4–128), buy-in, date, niveau, gains par position. Éditable uniquement en <em>brouillon</em>. Un tournoi <em>terminé</em> ne peut voir que son nom modifié.</li>
          <li><strong>Économie</strong> : l'aperçu calcule collecté / distribué / net maison. Un net négatif exige la case « J'accepte la perte ». Pour Carrée royale, chaque rang paie 2 humains par équipe.</li>
          <li><strong>Publier</strong> : brouillon → à venir (inscriptions ouvertes).</li>
          <li><strong>Annuler</strong> : à venir → annulé, rembourse tous les inscrits.</li>
          <li><strong>Supprimer</strong> : brouillon uniquement.</li>
        </ul>
        <p class="muted mono">GET/POST/PUT /admin/tournaments · POST /admin/tournaments/:id/publish · /cancel · POST /admin/tournaments/preview-economics</p>
      </section>

      <!-- Utilisateurs -->
      <section class="card">
        <div class="card-header"><h3>👤 Utilisateurs</h3></div>
        <ul>
          <li><strong>Liste</strong> : recherche par nom, filtres VIP / actif / solde minimum, pagination.</li>
          <li><strong>Détail</strong> : solde, parties jouées, statut VIP, robots, parties récentes, historique wallet.</li>
          <li><strong>Créditer</strong> : ajoute des jetons au porte-monnaie (montant + raison, tracé en audit).</li>
          <li><strong>Bannir</strong> : passe le rôle à <code>banned</code> (bloque l'accès).</li>
        </ul>
        <p class="muted mono">GET /admin/users · GET /admin/users/:id · POST /admin/users/:id/credit · /ban</p>
      </section>

      <!-- Codes promo -->
      <section class="card">
        <div class="card-header"><h3>🎟️ Codes promo</h3></div>
        <ul>
          <li><strong>Créer</strong> : code de 12 chiffres (affiché 1111-2222-3333), jetons crédités, date d'expiration, nombre max d'utilisations, libellé.</li>
          <li><strong>Activer / désactiver</strong> : sans supprimer le code.</li>
          <li><strong>Supprimer</strong> : définitif.</li>
        </ul>
        <p class="muted mono">GET/POST/PUT/DELETE /admin/promos</p>
      </section>

      <!-- Comptabilité -->
      <section class="card">
        <div class="card-header"><h3>💰 Comptabilité</h3></div>
        <ul>
          <li><strong>Résumé</strong> : par période — rake, entrées tournoi, prix distribués, net maison, avec ventilation journalière.</li>
          <li><strong>Transactions</strong> : liste filtrable par type (rake, entrée, prix…) et date, export CSV.</li>
        </ul>
        <p class="muted">Montants signés : positif = kydos gagne, négatif = kydos paie.</p>
        <p class="muted mono">GET /admin/accounting/summary · GET /admin/accounting/transactions</p>
      </section>

      <!-- Monitoring -->
      <section class="card">
        <div class="card-header"><h3>📡 Monitoring</h3></div>
        <ul>
          <li><strong>Snapshot</strong> (auto-refresh 5 s) : utilisateurs totaux/actifs, parties actives, tournois live, files d'attente par format.</li>
          <li><strong>Parties actives</strong> : liste des tables en cours.</li>
        </ul>
        <p class="muted mono">GET /admin/monitor/snapshot · GET /admin/monitor/matches</p>
      </section>

      <!-- Sécurité & audit -->
      <section class="card">
        <div class="card-header"><h3>🛡️ Sécurité &amp; audit</h3></div>
        <ul>
          <li><strong>Auth</strong> : JWT (4 h), vérification du rôle <code>admin</code> en base à chaque requête.</li>
          <li><strong>Rate limit</strong> : 30 requêtes / minute par IP sur <code>/admin</code>.</li>
          <li><strong>Audit</strong> : toute action d'écriture (tournoi, utilisateur, promo) est tracée avec avant/après.</li>
        </ul>
        <p class="muted mono">GET /admin/audit · GET /admin/health</p>
      </section>
    </div>
  `,
  styles: [`
    .help-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .card p { color: var(--text-secondary); font-size: 13px; line-height: 1.6; margin: 8px 0; }
    .card ul { margin: 8px 0; padding-left: 18px; }
    .card li { color: var(--text-secondary); font-size: 13px; line-height: 1.7; }
    .card code { background: var(--bg-input); padding: 1px 6px; border-radius: 4px; color: var(--primary); font-size: 12px; }
    .card pre {
      background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm);
      padding: 12px; overflow-x: auto; font-size: 12px; color: var(--text-primary); margin: 8px 0;
    }
    .muted { color: var(--text-muted) !important; }
    .mono { font-family: monospace; font-size: 11px; }
    .badge { margin: 0 2px; }
  `],
})
export class HelpComponent {}
