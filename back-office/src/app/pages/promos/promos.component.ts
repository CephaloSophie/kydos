import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PromoService } from '../../services/promo.service';
import type { PromoCode } from '../../models';

@Component({
  selector: 'app-promos',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-header">
      <h1>Codes Promo</h1>
      <button class="btn btn-primary" (click)="showForm = !showForm">
        {{ showForm ? 'Annuler' : '+ Nouveau code' }}
      </button>
    </div>

    @if (showForm) {
      <div class="card" style="margin-bottom: 24px">
        <h3 style="margin-bottom: 16px">{{ editId ? 'Modifier' : 'Créer un code promo' }}</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Code (12 chiffres)</label>
            <input type="text" [(ngModel)]="form.code" placeholder="111122223333" maxlength="14" [disabled]="!!editId" />
          </div>
          <div class="form-group">
            <label>Jetons crédités</label>
            <input type="number" [(ngModel)]="form.tokens" min="1" />
          </div>
          <div class="form-group">
            <label>Expiration</label>
            <input type="datetime-local" [(ngModel)]="form.expiresAt" />
          </div>
          <div class="form-group">
            <label>Utilisations max</label>
            <input type="number" [(ngModel)]="form.maxRedemptions" min="1" />
          </div>
        </div>
        <div class="form-group">
          <label>Label interne</label>
          <input type="text" [(ngModel)]="form.label" placeholder="Campagne, note..." />
        </div>
        <div style="display: flex; gap: 8px">
          <button class="btn btn-primary" (click)="savePromo()">{{ editId ? 'Enregistrer' : 'Créer' }}</button>
          @if (editId) {
            <button class="btn btn-secondary" (click)="cancelEdit()">Annuler</button>
          }
        </div>
        @if (error) {
          <div class="danger-box" style="margin-top: 12px">{{ error }}</div>
        }
      </div>
    }

    <div class="card">
      <div class="overflow-x">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Jetons</th>
              <th>Usages</th>
              <th>Max</th>
              <th>Actif</th>
              <th>Expiration</th>
              <th>Label</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (p of promos; track p._id) {
              <tr>
                <td style="font-family: monospace; font-weight: 600">{{ formatCode(p.code) }}</td>
                <td>{{ p.tokens }} &#9830;</td>
                <td>{{ p.redeemedBy.length }}</td>
                <td>{{ p.maxRedemptions }}</td>
                <td>
                  <span class="badge" [class]="p.active ? 'active' : 'inactive'">
                    {{ p.active ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td>{{ p.expiresAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ p.label }}</td>
                <td style="display: flex; gap: 4px">
                  <button class="btn btn-secondary btn-sm" (click)="editPromo(p)">Editer</button>
                  <button class="btn btn-sm" [class]="p.active ? 'btn-danger' : 'btn-success'" (click)="toggleActive(p)">
                    {{ p.active ? 'Désactiver' : 'Activer' }}
                  </button>
                  <button class="btn btn-danger btn-sm" (click)="deletePromo(p)">Supprimer</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty-state">Aucun code promo</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class PromosComponent implements OnInit {
  promos: PromoCode[] = [];
  showForm = false;
  editId: string | null = null;
  error = '';
  form = { code: '', tokens: 500, expiresAt: '', maxRedemptions: 1, label: '' };

  constructor(private promoService: PromoService) {}

  ngOnInit() { this.loadPromos(); }

  loadPromos() {
    this.promoService.list().subscribe(res => this.promos = res.promos);
  }

  formatCode(code: string): string {
    return code.replace(/(\d{4})(?=\d)/g, '$1-');
  }

  savePromo() {
    this.error = '';
    if (this.editId) {
      this.promoService.update(this.editId, {
        tokens: this.form.tokens,
        expiresAt: new Date(this.form.expiresAt).toISOString(),
        maxRedemptions: this.form.maxRedemptions,
        label: this.form.label,
      } as any).subscribe({
        next: () => { this.loadPromos(); this.cancelEdit(); },
        error: (e) => this.error = e.error?.error || 'Erreur',
      });
    } else {
      this.promoService.create({
        code: this.form.code,
        tokens: this.form.tokens,
        expiresAt: new Date(this.form.expiresAt).toISOString(),
        maxRedemptions: this.form.maxRedemptions,
        label: this.form.label,
      }).subscribe({
        next: () => { this.loadPromos(); this.showForm = false; this.resetForm(); },
        error: (e) => this.error = e.error?.error || 'Erreur',
      });
    }
  }

  editPromo(p: PromoCode) {
    this.editId = p._id;
    this.showForm = true;
    this.form = {
      code: p.code,
      tokens: p.tokens,
      expiresAt: p.expiresAt.slice(0, 16),
      maxRedemptions: p.maxRedemptions,
      label: p.label,
    };
  }

  cancelEdit() {
    this.editId = null;
    this.showForm = false;
    this.resetForm();
  }

  toggleActive(p: PromoCode) {
    this.promoService.update(p._id, { active: !p.active } as any).subscribe(() => this.loadPromos());
  }

  deletePromo(p: PromoCode) {
    if (!confirm(`Supprimer le code ${this.formatCode(p.code)} ?`)) return;
    this.promoService.delete(p._id).subscribe(() => this.loadPromos());
  }

  private resetForm() {
    this.form = { code: '', tokens: 500, expiresAt: '', maxRedemptions: 1, label: '' };
    this.error = '';
  }
}
