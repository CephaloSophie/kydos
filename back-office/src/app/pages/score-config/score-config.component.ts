/* =============================================================================
 * BACK-OFFICE · pages/score-config — Modèle UNIQUE de score & niveau Kýdos.
 * -----------------------------------------------------------------------------
 * LE cœur des réglages : un seul endroit pour définir comment joueurs et robots
 * gagnent du score et montent en niveau. Édition groupée par thème, DIAGNOSTIC
 * en direct (incohérences), aperçu de l'échelle de niveaux et exemples de gain.
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScoreConfigService, type ScoreKydosConfig, type ScoreConfigPreview } from '../../services/score-config.service';

@Component({
  selector: 'app-score-config',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>🎯 Score &amp; niveaux</h1>
        <p class="subtitle">Modèle UNIQUE appliqué dans toute l'application. Édité ici, lu partout.</p>
      </div>
      <div class="header-actions">
        <span class="save-state" [class.dirty]="dirty">{{ dirty ? '● modifications non enregistrées' : '✓ à jour' }}</span>
        <button class="btn btn-primary" (click)="save()" [disabled]="saving || errorCount() > 0">
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>

    @if (loading) { <div class="card">Chargement…</div> }
    @else if (config) {
      <!-- DIAGNOSTIC — toujours visible en tête -->
      <div class="card diag" [class.ok]="preview && preview.diagnostics.length === 0">
        <div class="diag-head">
          <strong>Diagnostic</strong>
          @if (preview && preview.diagnostics.length === 0) { <span class="pill ok">Aucune incohérence</span> }
          @else {
            @if (errorCount() > 0) { <span class="pill err">{{ errorCount() }} erreur(s)</span> }
            @if (warnCount() > 0) { <span class="pill warn">{{ warnCount() }} avertissement(s)</span> }
            @if (infoCount() > 0) { <span class="pill info">{{ infoCount() }} info(s)</span> }
          }
        </div>
        @if (preview && preview.diagnostics.length) {
          <ul class="diag-list">
            @for (d of preview.diagnostics; track d.code + d.message) {
              <li [class]="d.severity"><span class="tag">{{ label(d.severity) }}</span> {{ d.message }}</li>
            }
          </ul>
        }
        @if (errorCount() > 0) { <p class="hint err-hint">Corrigez les erreurs pour pouvoir enregistrer.</p> }
      </div>

      <div class="grid">
        <!-- 1. BARÈME DE GAIN -->
        <div class="card">
          <h2>Barème de gain</h2>
          <p class="hint">Score gagné par un <em>vainqueur</em> = base × coefficient de la partie × coefficient du type de jeu (+ bonus jetons).</p>
          <div class="field"><label>Score de base — joueur gagnant</label><input type="number" [(ngModel)]="config.baseWinnerPlayer" (ngModelChange)="onChange()" /></div>
          <div class="field"><label>Score de base — robot gagnant</label><input type="number" [(ngModel)]="config.baseWinnerRobot" (ngModelChange)="onChange()" /></div>
          <div class="field">
            <label>Bonus jetons (% des jetons accumulés ajoutés au score)</label>
            <div class="inline"><input type="number" [(ngModel)]="config.tokenScorePercent" (ngModelChange)="onChange()" /><span class="unit">%</span></div>
            <small>0 = désactivé. Ex. 50 ⇒ +50 % des jetons gagnés en score.</small>
          </div>
          <div class="field">
            <label>⭐ Bonus VIP (% de score en plus pour un joueur VIP)</label>
            <div class="inline"><input type="number" [(ngModel)]="config.vipRate" (ngModelChange)="onChange()" /><span class="unit">%</span></div>
            <small>Appliqué à TOUT gain d'un joueur VIP, partout où le score se calcule. Défaut 3 %.</small>
          </div>
          @if (preview) {
            <div class="examples">
              <div><span>Exemple joueur (partie rapide, 200 jetons)</span><strong>+{{ preview.gainExamples.player.total }}</strong></div>
              <div><span>⭐ Même joueur en VIP</span><strong>+{{ preview.gainExamples.playerVip.total }}</strong></div>
              <div><span>Exemple robot (partie rapide)</span><strong>+{{ preview.gainExamples.robot.total }}</strong></div>
            </div>
          }
        </div>

        <!-- 2. ÉCHELLE DE NIVEAUX -->
        <div class="card">
          <h2>Échelle de niveaux</h2>
          <p class="hint">Chaque niveau coûte le précédent + un pourcentage. Franchir le niveau 1 demande le seuil initial.</p>
          <div class="field"><label>Seuil du premier niveau (points)</label><input type="number" [(ngModel)]="config.firstLevelThreshold" (ngModelChange)="onChange()" /></div>
          <div class="field">
            <label>Augmentation par niveau</label>
            <div class="inline"><input type="number" [(ngModel)]="config.levelUpPercent" (ngModelChange)="onChange()" /><span class="unit">%</span></div>
          </div>
          <div class="field"><label>Nombre de niveaux (table pré-remplie)</label><input type="number" [(ngModel)]="config.maxLevel" (ngModelChange)="onChange()" /></div>

          <h3>Surcharges manuelles</h3>
          <p class="hint">Fixer un incrément précis pour un niveau donné (remplace la valeur calculée).</p>
          @for (o of config.levelOverrides; track $index) {
            <div class="override-row">
              <label>Niveau</label><input type="number" [(ngModel)]="o.level" (ngModelChange)="onChange()" min="1" />
              <label>coûte</label><input type="number" [(ngModel)]="o.increment" (ngModelChange)="onChange()" min="1" /><span class="unit">pts</span>
              <button class="icon-btn danger" (click)="removeOverride($index)" title="Retirer">🗑️</button>
            </div>
          }
          <button class="btn btn-secondary sm" (click)="addOverride()">+ Ajouter une surcharge</button>
        </div>
      </div>

      <!-- 3. COEFFICIENTS PAR TYPE DE JEU -->
      <div class="card">
        <h2>Coefficients par type de jeu</h2>
        <p class="hint">Multiplicateur appliqué au gain selon la catégorie (tournoi, rapide, équipe, robot) et le genre (acier, hybride, royal). 1 = neutre.</p>
        <div class="overflow-x">
          <table class="matrix">
            <thead><tr><th>Catégorie \\ Genre</th>@for (k of kinds; track k) { <th>{{ kindLabel(k) }}</th> }</tr></thead>
            <tbody>
              @for (cat of categories; track cat) {
                <tr>
                  <td class="cat">{{ catLabel(cat) }}</td>
                  @for (k of kinds; track k) {
                    <td><input type="number" step="0.1" [ngModel]="coef(cat, k)" (ngModelChange)="setCoef(cat, k, $event)" /></td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4. APERÇU DE L'ÉCHELLE -->
      @if (preview) {
        <div class="card">
          <h2>Aperçu de l'échelle <small>({{ preview.totalLevels }} niveaux au total, {{ preview.levelTable.length }} affichés)</small></h2>
          <div class="milestones">
            @for (m of preview.milestones; track m.level) {
              <div class="milestone"><span>Niveau {{ m.level }}</span><strong>{{ m.cumulativeToReach | number }} pts</strong></div>
            }
          </div>
          <div class="overflow-x">
            <table class="levels">
              <thead><tr><th>Niveau</th><th>Coût du niveau</th><th>Cumul pour l'atteindre</th><th>Cumul pour le franchir</th></tr></thead>
              <tbody>
                @for (r of preview.levelTable; track r.level) {
                  <tr [class.ov]="r.overridden">
                    <td>{{ r.level }} @if (r.overridden) { <span class="tag mini">surcharge</span> }</td>
                    <td>{{ r.increment | number }}</td>
                    <td>{{ r.cumulative | number }}</td>
                    <td>{{ r.cumulativeNext | number }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
      @if (saveError) { <div class="card err-box">{{ saveError }}</div> }
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .subtitle { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .save-state { font-size: 12px; color: var(--text-muted); }
    .save-state.dirty { color: #e89644; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card h2 { font-size: 16px; margin: 0 0 4px; }
    .card h2 small { color: var(--text-muted); font-weight: 400; font-size: 12px; }
    .card h3 { font-size: 13px; margin: 16px 0 4px; color: var(--text-secondary); }
    .hint { color: var(--text-muted); font-size: 12px; margin: 0 0 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .field label { font-size: 12px; color: var(--text-secondary); }
    .field small { color: var(--text-muted); font-size: 11px; }
    .inline { display: flex; align-items: center; gap: 6px; }
    .inline input { flex: 1; }
    .unit { color: var(--text-muted); font-size: 12px; }
    input { background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; color: var(--text); width: 100%; }
    .examples { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
    .examples div { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); }
    .examples strong { color: #78c88c; }
    .override-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .override-row label { font-size: 12px; color: var(--text-muted); }
    .override-row input { width: 90px; }
    .btn.sm { padding: 5px 10px; font-size: 12px; }
    .icon-btn { background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; padding: 3px 7px; cursor: pointer; }
    .icon-btn.danger:hover { border-color: var(--danger); }
    .diag { border-left: 3px solid #e89644; }
    .diag.ok { border-left-color: #78c88c; }
    .diag-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .pill { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
    .pill.ok { background: rgba(120,200,140,.15); color: #78c88c; }
    .pill.err { background: rgba(232,90,112,.15); color: #e85a70; }
    .pill.warn { background: rgba(232,150,68,.15); color: #e89644; }
    .pill.info { background: var(--bg-input); color: var(--text-muted); }
    .diag-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
    .diag-list li { font-size: 12px; padding: 6px 8px; border-radius: 6px; background: var(--bg-input); }
    .diag-list li.error { border-left: 3px solid #e85a70; }
    .diag-list li.warning { border-left: 3px solid #e89644; }
    .diag-list li.info { border-left: 3px solid var(--text-muted); }
    .diag-list .tag { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-right: 6px; }
    .err-hint { color: #e85a70; }
    .matrix, .levels { width: 100%; border-collapse: collapse; font-size: 13px; }
    .matrix th, .matrix td, .levels th, .levels td { padding: 6px 8px; border-bottom: 1px solid var(--border); text-align: left; }
    .matrix td.cat { color: var(--text-secondary); font-weight: 600; }
    .matrix input { width: 80px; }
    .levels tr.ov { background: rgba(230,196,106,.06); }
    .tag.mini { font-size: 9px; background: rgba(230,196,106,.15); color: var(--primary); border-radius: 999px; padding: 1px 5px; }
    .milestones { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
    .milestone { background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 12px; }
    .milestone span { display: block; color: var(--text-muted); }
    .milestone strong { color: var(--text); }
    .overflow-x { overflow-x: auto; }
    .err-box { color: #e85a70; }
  `],
})
export class ScoreConfigComponent implements OnInit {
  loading = true;
  saving = false;
  dirty = false;
  saveError = '';
  config!: ScoreKydosConfig;
  preview: ScoreConfigPreview | null = null;

  readonly categories = ['tournament', 'quick', 'team', 'robot'];
  readonly kinds = ['acier', 'hybride', 'royal'];
  private debounce: any = null;

  constructor(private svc: ScoreConfigService) {}

  ngOnInit() {
    this.svc.get().subscribe({
      next: (res) => { this.config = res.config; this.preview = res; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  // ── Diagnostic helpers ──
  errorCount() { return this.preview?.diagnostics.filter((d) => d.severity === 'error').length ?? 0; }
  warnCount() { return this.preview?.diagnostics.filter((d) => d.severity === 'warning').length ?? 0; }
  infoCount() { return this.preview?.diagnostics.filter((d) => d.severity === 'info').length ?? 0; }
  label(s: string) { return { error: 'Erreur', warning: 'Attention', info: 'Info' }[s] ?? s; }
  catLabel(c: string) { return { tournament: 'Tournoi', quick: 'Partie rapide', team: 'Équipe', robot: 'Avec robot' }[c] ?? c; }
  kindLabel(k: string) { return { acier: 'Duo d\'acier', hybride: 'Hybride', royal: 'Carré royal' }[k] ?? k; }

  // ── Coefficients matrix ──
  private key(cat: string, k: string) { return `${cat}:${k}`; }
  coef(cat: string, k: string): number {
    const v = this.config.gameTypeCoefficients?.[this.key(cat, k)];
    return typeof v === 'number' ? v : 1;
  }
  setCoef(cat: string, k: string, value: any) {
    const n = Number(value);
    this.config.gameTypeCoefficients = { ...(this.config.gameTypeCoefficients ?? {}), [this.key(cat, k)]: Number.isFinite(n) ? n : 1 };
    this.onChange();
  }

  // ── Overrides ──
  addOverride() { this.config.levelOverrides = [...(this.config.levelOverrides ?? []), { level: 1, increment: 500 }]; this.onChange(); }
  removeOverride(i: number) { this.config.levelOverrides.splice(i, 1); this.onChange(); }

  // ── Live preview (debounced) ──
  onChange() {
    this.dirty = true;
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.svc.preview(this.config).subscribe({ next: (res) => { this.preview = res; }, error: () => {} });
    }, 350);
  }

  save() {
    this.saving = true; this.saveError = '';
    this.svc.save(this.config).subscribe({
      next: (res) => { this.config = res.config; this.preview = res; this.dirty = false; this.saving = false; },
      error: (e) => { this.saveError = e?.error?.error || 'Échec de l\'enregistrement.'; this.saving = false; },
    });
  }
}
