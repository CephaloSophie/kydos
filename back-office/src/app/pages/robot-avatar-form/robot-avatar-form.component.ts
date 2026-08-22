/* =============================================================================
 * BACK-OFFICE · pages/robot-avatar-form — Création / édition d'un avatar.
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { RobotAvatarService } from '../../services/robot-avatar.service';
import { mascotSvg, MASCOT_EYE_STATES, MASCOT_MOUTH_STATES, EYE_LABELS, MOUTH_LABELS } from '../../shared/robot-mascot';

@Component({
  selector: 'app-robot-avatar-form',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>{{ editId ? 'Modifier l\\'avatar' : 'Nouvel avatar' }}</h1>
      <a routerLink="/robot-avatars" class="btn btn-secondary">Retour</a>
    </div>

    <div class="editor-grid">
      <div class="card fields">
        <div class="form-group"><label>Nom</label><input type="text" [(ngModel)]="a.name" placeholder="Ex. Émeraude" /></div>
        <div class="form-group">
          <label>Statut</label>
          <select [(ngModel)]="a.status">
            <option value="draft">Brouillon</option>
            <option value="pending">Prêt (en attente)</option>
            <option value="active">Publié (proposé dans l'app)</option>
          </select>
        </div>
        <div class="color-row"><span>Accent (yeux / antenne)</span><input type="color" [(ngModel)]="a.accentColor" /><code>{{ a.accentColor }}</code></div>
        <div class="color-row">
          <span>Corps (plaques)</span>
          <input type="color" [ngModel]="a.bodyColor || autoBody()" (ngModelChange)="a.bodyColor = $event" />
          <code>{{ a.bodyColor || '(auto)' }}</code>
          @if (a.bodyColor) { <button class="link" (click)="a.bodyColor = null">auto</button> }
        </div>
        <div class="color-row">
          <span>Contour (bordure)</span>
          <input type="color" [ngModel]="a.outlineColor || autoOutline()" (ngModelChange)="a.outlineColor = $event" />
          <code>{{ a.outlineColor || '(auto)' }}</code>
          @if (a.outlineColor) { <button class="link" (click)="a.outlineColor = null">auto</button> }
        </div>
        <div class="form-group">
          <label>Antennes : {{ a.antennas }}</label>
          <input type="range" min="1" max="5" step="1" [(ngModel)]="a.antennas" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Yeux</label>
            <select [(ngModel)]="a.eyes">
              @for (e of eyeStates; track e) { <option [value]="e">{{ eyeLabel(e) }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label>Bouche</label>
            <select [(ngModel)]="a.mouth">
              @for (m of mouthStates; track m) { <option [value]="m">{{ mouthLabel(m) }}</option> }
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Niveau min</label><input type="number" [(ngModel)]="a.minLevel" min="0" /></div>
          <div class="form-group"><label>Niveau max (vide = ∞)</label><input type="number" [(ngModel)]="a.maxLevel" min="0" placeholder="∞" /></div>
        </div>
        <div class="actions-bar">
          <button class="btn btn-primary" (click)="save()" [disabled]="saving">{{ editId ? 'Enregistrer' : 'Créer l\\'avatar' }}</button>
          <a routerLink="/robot-avatars" class="btn btn-secondary">Annuler</a>
          @if (error) { <span class="err">{{ error }}</span> }
        </div>
      </div>
      <div class="card preview-card">
        <div class="mascot" [innerHTML]="mascot()"></div>
        <p class="hint">Aperçu de la mascotte générée.</p>
      </div>
    </div>
  `,
  styles: [`
    .editor-grid { display: grid; grid-template-columns: 1fr 260px; gap: 20px; align-items: start; }
    @media (max-width: 700px) { .editor-grid { grid-template-columns: 1fr; } }
    .form-row { display: flex; gap: 16px; }
    .form-group { flex: 1; display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .form-group label { font-size: 12px; color: var(--text-secondary); }
    .color-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
    .color-row span { width: 130px; }
    .color-row input[type=color] { width: 40px; height: 28px; border: none; background: none; padding: 0; cursor: pointer; }
    .color-row code { font-size: 11px; color: var(--text-muted); }
    .actions-bar { display: flex; gap: 10px; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
    .err { color: var(--danger); font-size: 13px; }
    .mascot { display: flex; align-items: center; justify-content: center; margin: 8px auto; }
    .mascot ::ng-deep svg { filter: drop-shadow(0 6px 14px rgba(0,0,0,0.4)); }
    .hint { color: var(--text-muted); font-size: 12px; margin-top: 12px; text-align: center; }
    .link { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 11px; text-decoration: underline; padding: 0; }
  `],
})
export class RobotAvatarFormComponent implements OnInit {
  editId: string | null = null;
  saving = false;
  error = '';
  a: any = { name: '', status: 'draft', accentColor: '#7ecb98', bodyColor: null, outlineColor: null, antennas: 1, eyes: 'open', mouth: 'smile', minLevel: 0, maxLevel: null };
  readonly eyeStates = MASCOT_EYE_STATES;
  readonly mouthStates = MASCOT_MOUTH_STATES;
  eyeLabel(e: string) { return (EYE_LABELS as any)[e] ?? e; }
  mouthLabel(m: string) { return (MOUTH_LABELS as any)[m] ?? m; }

  constructor(private svc: RobotAvatarService, private router: Router, private route: ActivatedRoute, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.editId = this.route.snapshot.params['id'] || null;
    if (this.editId) {
      this.svc.get(this.editId).subscribe((res) => {
        const v = res.avatar as any;
        this.a = { name: v.name, status: v.status ?? (v.active ? 'active' : 'draft'), accentColor: v.accentColor, bodyColor: v.bodyColor ?? null, outlineColor: v.outlineColor ?? null, antennas: v.antennas ?? 1, eyes: v.eyes ?? 'open', mouth: v.mouth ?? 'smile', minLevel: v.minLevel ?? 0, maxLevel: v.maxLevel ?? null };
      });
    }
  }

  private shade(hex: string, amt: number): string {
    const h = (hex || '#7ecb98').replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) || 0, g = parseInt(h.slice(2, 4), 16) || 0, b = parseInt(h.slice(4, 6), 16) || 0;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const c = (n: number) => Math.max(0, Math.min(255, Math.round(n + (t - n) * p))).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`;
  }
  autoBody(): string { return this.shade(this.a.accentColor, 0.62); }
  autoOutline(): string { return this.shade(this.a.accentColor, -0.62); }

  mascot(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(mascotSvg({ kind: 'robot', accentColor: this.a.accentColor, bodyColor: this.a.bodyColor, outlineColor: this.a.outlineColor, antennas: this.a.antennas, eyes: this.a.eyes, mouth: this.a.mouth }, 150));
  }

  save() {
    this.saving = true; this.error = '';
    const done = () => this.router.navigate(['/robot-avatars']);
    const fail = (e: any) => { this.saving = false; this.error = e?.error?.error || 'Échec.'; };
    if (this.editId) this.svc.update(this.editId, this.a).subscribe({ next: done, error: fail });
    else this.svc.create(this.a).subscribe({ next: done, error: fail });
  }
}
