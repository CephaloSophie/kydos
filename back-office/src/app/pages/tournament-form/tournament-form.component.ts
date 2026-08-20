import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { TOURNAMENT_CAPACITIES, MATCH_FORMATS, type PositionPrize, type EconomicsResult, type TournamentCapacity } from '../../models';

@Component({
  selector: 'app-tournament-form',
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>{{ editId ? 'Modifier le tournoi' : 'Nouveau tournoi' }}</h1>
    </div>

    <div class="form-layout">
      <div class="form-main card">
        <div class="form-row">
          <div class="form-group">
            <label>Nom</label>
            <input type="text" [(ngModel)]="form.name" placeholder="Grand Prix des IA" />
          </div>
          <div class="form-group">
            <label>Format</label>
            <select [(ngModel)]="form.format">
              @for (f of formats; track f.value) {
                <option [value]="f.value">{{ f.label }}</option>
              }
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Capacité</label>
            <select [(ngModel)]="form.capacity" (ngModelChange)="generatePositions()">
              @for (c of capacities; track c) {
                <option [ngValue]="c">{{ c }} joueurs</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label>Buy-in (&#9830;)</label>
            <input type="number" [(ngModel)]="form.entryFee" min="0" (ngModelChange)="updateEconomics()" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Date de début</label>
            <input type="datetime-local" [(ngModel)]="form.startAt" />
          </div>
          <div class="form-group">
            <label>Niveau minimum</label>
            <input type="number" [(ngModel)]="form.minLevel" min="0" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Description</label>
            <textarea [(ngModel)]="form.description" rows="2" placeholder="Description marketing..."></textarea>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Couleur</label>
            <input type="color" [(ngModel)]="form.color" />
          </div>
          <div class="form-group">
            <label>Icône</label>
            <input type="text" [(ngModel)]="form.icon" placeholder="♦" />
          </div>
        </div>

        <h3 style="margin: 20px 0 12px">Paramètres de jeu</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin: -6px 0 12px">
          Appliqués à chaque match du tournoi (nombre de manches, score cible, etc.).
        </p>
        <div class="form-row">
          <div class="form-group">
            <label>Nombre de manches</label>
            <select [(ngModel)]="form.gameConfig.manches">
              <option [ngValue]="1">1 manche</option>
              <option [ngValue]="2">2 manches</option>
              <option [ngValue]="4">4 manches</option>
            </select>
          </div>
          <div class="form-group">
            <label>Score cible / manche</label>
            <input type="number" [(ngModel)]="form.gameConfig.baseTarget" min="100" step="100" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Score cible du grand label</label>
            <input type="number" [(ngModel)]="form.gameConfig.labelTarget" min="100" step="100" />
          </div>
          <div class="form-group">
            <label>Temps par tour (ms)</label>
            <input type="number" [(ngModel)]="form.gameConfig.turnTimeoutMs" min="3000" step="1000" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Compte à rebours avant chaque round (s)</label>
            <input type="number" [(ngModel)]="form.gameConfig.roundCountdownSec" min="0" max="300" step="1" />
          </div>
          <div class="form-group">
            <label>Redirection auto depuis la popup LIVE (s)</label>
            <input type="number" [(ngModel)]="form.gameConfig.autoRejoinSec" min="0" max="60" step="1" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Délai entre plis (ms)</label>
            <input type="number" [(ngModel)]="form.gameConfig.trickDelayMs" min="0" step="100" />
          </div>
          <div class="form-group">
            <label>Thème du tapis</label>
            <select [(ngModel)]="form.gameConfig.feltTheme">
              <option value="classic">Classic</option>
              <option value="cosmos">Cosmos</option>
              <option value="olympus">Olympus</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px">
            <input type="checkbox" [(ngModel)]="form.gameConfig.allowSpectators" id="spec" />
            <label for="spec" style="margin: 0">Autoriser les spectateurs</label>
          </div>
          <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px">
            <input type="checkbox" [(ngModel)]="form.gameConfig.signals.reflexion" id="sig1" />
            <label for="sig1" style="margin: 0">Signal réflexion</label>
          </div>
        </div>

        <h3 style="margin: 20px 0 12px">Règles de belote</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Score initial des enchères</label>
            <input type="number" [(ngModel)]="form.gameConfig.openingBidMin" min="80" max="180" step="10" />
            <small class="hint">Enchère minimale d'ouverture (multiple de 10, 80–180).</small>
          </div>
          <div class="form-group">
            <label>Sens du jeu</label>
            <select [(ngModel)]="form.gameConfig.clockwise">
              <option [ngValue]="false">Antihoraire (standard)</option>
              <option [ngValue]="true">Horaire</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px">
            <input type="checkbox" [(ngModel)]="form.gameConfig.countBelote" id="belote" />
            <label for="belote" style="margin: 0">Compter la belote dans le score (+20)</label>
          </div>
          <div class="form-group"></div>
        </div>

        <h3 style="margin: 20px 0 12px">Prix par position</h3>
        <div class="prizes-grid">
          @for (pp of prizes; track pp.position) {
            <div class="prize-row">
              <span class="prize-pos">{{ pp.position }}{{ pp.position === 1 ? 'er' : 'e' }}</span>
              <span class="prize-occ">({{ pp.occupants }}x)</span>
              <input type="number" [(ngModel)]="pp.prize" min="0" (ngModelChange)="updateEconomics()" placeholder="0" />
              <span class="prize-unit">&#9830;</span>
            </div>
          }
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px">
          <button class="btn btn-primary" (click)="save(false)" [disabled]="saving">
            {{ editId ? 'Enregistrer' : 'Enregistrer en brouillon' }}
          </button>
          @if (!editId) {
            <button class="btn btn-success" (click)="save(true)" [disabled]="saving">Publier maintenant</button>
          }
          <button class="btn btn-secondary" (click)="goBack()">Annuler</button>
        </div>

        @if (error) {
          <div class="danger-box" style="margin-top: 16px">{{ error }}</div>
        }
      </div>

      <div class="form-side">
        <div class="card economics-panel">
          <h3>Rentabilité</h3>
          @if (economics) {
            <div class="econ-row">
              <span>Total collecté</span>
              <span class="econ-val">{{ economics.totalCollected }} &#9830;</span>
            </div>
            <div class="econ-row">
              <span>Total payé</span>
              <span class="econ-val" style="color: var(--danger)">-{{ economics.totalPaid }} &#9830;</span>
            </div>
            <div class="econ-divider"></div>
            <div class="econ-row econ-net">
              <span>Net kydos</span>
              <span class="econ-val" [style.color]="economics.houseNet >= 0 ? 'var(--success)' : 'var(--danger)'">
                {{ economics.houseNet >= 0 ? '+' : '' }}{{ economics.houseNet }} &#9830;
              </span>
            </div>
            @if (economics.houseNet < 0) {
              <div class="danger-box" style="margin-top: 12px">
                Ce tournoi coûtera {{ Math.abs(economics.houseNet) }} &#9830; à kydos !
                <label style="display: flex; align-items: center; gap: 6px; margin-top: 8px; cursor: pointer">
                  <input type="checkbox" [(ngModel)]="acceptLoss" />
                  Je comprends et j'accepte la perte
                </label>
              </div>
            }
            @if (economics.breakdown.length) {
              <h4 style="margin-top: 16px; font-size: 12px; color: var(--text-secondary)">DÉTAIL</h4>
              @for (row of economics.breakdown; track row.position) {
                <div class="econ-detail">
                  {{ row.position }}{{ row.position === 1 ? 'er' : 'e' }} :
                  {{ row.occupants }}x {{ row.prizePerOccupant }} = {{ row.totalPaidAtThisPosition }} &#9830;
                </div>
              }
            }
          } @else {
            <p style="color: var(--text-muted); font-size: 13px">Renseignez les paramètres pour voir l'aperçu.</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; }
    @media (max-width: 900px) { .form-layout { grid-template-columns: 1fr; } }
    .prizes-grid { display: flex; flex-direction: column; gap: 8px; }
    .prize-row {
      display: flex; align-items: center; gap: 8px;
      input { width: 100px; }
    }
    .prize-pos { font-weight: 600; width: 32px; }
    .prize-occ { color: var(--text-muted); font-size: 12px; width: 40px; }
    .prize-unit { color: var(--primary); }
    .economics-panel { position: sticky; top: 24px; }
    .economics-panel h3 { margin-bottom: 12px; font-size: 15px; }
    .econ-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .econ-val { font-weight: 600; }
    .econ-divider { border-top: 1px solid var(--border); margin: 8px 0; }
    .econ-net { font-size: 16px; font-weight: 700; }
    .econ-detail { font-size: 12px; color: var(--text-secondary); padding: 2px 0; }
  `],
})
export class TournamentFormComponent implements OnInit {
  Math = Math;
  capacities = TOURNAMENT_CAPACITIES;
  formats = MATCH_FORMATS;
  editId: string | null = null;
  saving = false;
  error = '';
  acceptLoss = false;

  form = {
    name: '',
    format: 'duo_steel' as string,
    capacity: 16 as TournamentCapacity,
    entryFee: 100,
    startAt: '',
    minLevel: 0,
    maxLevel: null as number | null,
    description: '',
    color: '#e6c46a',
    icon: '♦',
    gameConfig: {
      manches: 2,
      baseTarget: 1500,
      labelTarget: 2000,
      openingBidMin: 90,
      countBelote: true,
      clockwise: false,
      roundCountdownSec: 10,
      autoRejoinSec: 5,
      turnTimeoutMs: 15000,
      trickDelayMs: 900,
      speed: 1,
      feltTheme: 'classic',
      allowSpectators: true,
      signals: { reflexion: true, repeatSuit: true },
    },
  };

  prizes: { position: number; prize: number; occupants: number }[] = [];
  economics: EconomicsResult | null = null;

  constructor(
    private tournamentService: TournamentService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.editId = this.route.snapshot.params['id'] || null;
    this.generatePositions();
    if (this.editId) {
      this.tournamentService.getById(this.editId).subscribe(res => {
        const t = res.tournament;
        this.form = {
          name: t.name,
          format: t.format,
          capacity: t.capacity,
          entryFee: t.entryFee,
          startAt: t.startAt.slice(0, 16),
          minLevel: t.minLevel,
          maxLevel: t.maxLevel,
          description: t.description,
          color: t.color,
          icon: t.icon,
          gameConfig: {
            manches: t.gameConfig?.manches ?? 2,
            baseTarget: t.gameConfig?.baseTarget ?? 1500,
            labelTarget: t.gameConfig?.labelTarget ?? 2000,
            openingBidMin: t.gameConfig?.openingBidMin ?? 90,
            countBelote: t.gameConfig?.countBelote !== false,
            clockwise: t.gameConfig?.clockwise === true,
            roundCountdownSec: t.gameConfig?.roundCountdownSec ?? 10,
            autoRejoinSec: t.gameConfig?.autoRejoinSec ?? 5,
            turnTimeoutMs: t.gameConfig?.turnTimeoutMs ?? 15000,
            trickDelayMs: t.gameConfig?.trickDelayMs ?? 900,
            speed: t.gameConfig?.speed ?? 1,
            feltTheme: t.gameConfig?.feltTheme ?? 'classic',
            allowSpectators: t.gameConfig?.allowSpectators !== false,
            signals: {
              reflexion: t.gameConfig?.signals?.reflexion !== false,
              repeatSuit: t.gameConfig?.signals?.repeatSuit !== false,
            },
          },
        };
        if (t.prizesByPosition.length) {
          this.generatePositions();
          for (const pp of t.prizesByPosition) {
            const found = this.prizes.find(p => p.position === pp.position);
            if (found) found.prize = pp.prize;
          }
        }
        this.updateEconomics();
      });
    }
  }

  generatePositions() {
    const cap = this.form.capacity;
    const positions: { position: number; occupants: number }[] = [];
    positions.push({ position: 1, occupants: 1 });
    positions.push({ position: 2, occupants: 1 });
    let rank = 3;
    let losers = 2;
    while (losers <= cap / 2) {
      positions.push({ position: rank, occupants: losers });
      rank += losers;
      losers *= 2;
    }
    this.prizes = positions.map(p => ({
      ...p,
      prize: this.prizes.find(old => old.position === p.position)?.prize ?? 0,
    }));
    this.updateEconomics();
  }

  updateEconomics() {
    const prizesByPosition = this.prizes.filter(p => p.prize > 0).map(p => ({ position: p.position, prize: p.prize }));
    if (!prizesByPosition.length) {
      this.economics = null;
      return;
    }
    this.tournamentService.previewEconomics(this.form.capacity, this.form.entryFee, prizesByPosition, this.form.format)
      .subscribe(res => this.economics = res.economics);
  }

  save(publishImmediately: boolean) {
    this.saving = true;
    this.error = '';
    const prizesByPosition = this.prizes.filter(p => p.prize > 0).map(p => ({ position: p.position, prize: p.prize }));
    const data: any = {
      ...this.form,
      startAt: new Date(this.form.startAt).toISOString(),
      prizesByPosition,
      publishImmediately,
      acceptLoss: this.acceptLoss,
    };
    const req$ = this.editId
      ? this.tournamentService.update(this.editId, data)
      : this.tournamentService.create(data);
    req$.subscribe({
      next: () => this.router.navigate(['/tournaments']),
      error: (err: any) => {
        this.saving = false;
        this.error = err.error?.error || 'Erreur';
      },
    });
  }

  goBack() { this.router.navigate(['/tournaments']); }
}
