/* =============================================================================
 * BACK-OFFICE · pages/robot-avatar-form — Création / édition d'un avatar.
 * ========================================================================== */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { RobotAvatarService } from '../../services/robot-avatar.service';

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
        <div class="color-row"><span>Couleur d'accent</span><input type="color" [(ngModel)]="a.accentColor" /><code>{{ a.accentColor }}</code></div>
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
        <div class="mascot" [style.background]="a.accentColor">🤖</div>
        <p class="hint">Aperçu de la mascotte teintée.</p>
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
    .mascot { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 56px; margin: 0 auto; box-shadow: 0 6px 16px rgba(0,0,0,0.3); }
    .hint { color: var(--text-muted); font-size: 12px; margin-top: 12px; text-align: center; }
  `],
})
export class RobotAvatarFormComponent implements OnInit {
  editId: string | null = null;
  saving = false;
  error = '';
  a: any = { name: '', status: 'draft', accentColor: '#7ecb98', minLevel: 0, maxLevel: null };

  constructor(private svc: RobotAvatarService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.editId = this.route.snapshot.params['id'] || null;
    if (this.editId) {
      this.svc.get(this.editId).subscribe((res) => {
        const v = res.avatar as any;
        this.a = { name: v.name, status: v.status ?? (v.active ? 'active' : 'draft'), accentColor: v.accentColor, minLevel: v.minLevel ?? 0, maxLevel: v.maxLevel ?? null };
      });
    }
  }

  save() {
    this.saving = true; this.error = '';
    const done = () => this.router.navigate(['/robot-avatars']);
    const fail = (e: any) => { this.saving = false; this.error = e?.error?.error || 'Échec.'; };
    if (this.editId) this.svc.update(this.editId, this.a).subscribe({ next: done, error: fail });
    else this.svc.create(this.a).subscribe({ next: done, error: fail });
  }
}
