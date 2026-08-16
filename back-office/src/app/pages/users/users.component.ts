import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { UserService } from '../../services/user.service';
import type { User } from '../../models';

@Component({
  selector: 'app-users',
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="page-header">
      <h1>Utilisateurs</h1>
      <span style="color: var(--text-muted)">{{ total }} utilisateurs</span>
    </div>

    <div class="filters">
      <input type="text" [(ngModel)]="search" placeholder="Rechercher par nom..." (keyup.enter)="loadUsers()" style="width: 250px" />
      <select [(ngModel)]="vipFilter" (ngModelChange)="loadUsers()">
        <option value="">Tous</option>
        <option value="true">VIP</option>
        <option value="false">Non VIP</option>
      </select>
      <select [(ngModel)]="activeFilter" (ngModelChange)="loadUsers()">
        <option value="">Tous</option>
        <option value="true">Actifs (30j)</option>
      </select>
      <button class="btn btn-secondary btn-sm" (click)="loadUsers()">Filtrer</button>
    </div>

    <div class="card">
      <div class="overflow-x">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Solde</th>
              <th>Parties</th>
              <th>VIP</th>
              <th>Inscrit le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (u of users; track u._id) {
              <tr>
                <td><a [routerLink]="['/users', u._id]" style="font-weight: 600">{{ u.username }}</a></td>
                <td>{{ u.wallet.tokens }} &#9830;</td>
                <td>{{ u.gamesPlayed }}</td>
                <td>
                  @if (isVip(u)) {
                    <span class="badge active">VIP</span>
                  } @else {
                    <span class="badge inactive">-</span>
                  }
                </td>
                <td>{{ u.createdAt | date:'dd/MM/yyyy' }}</td>
                <td>
                  <a [routerLink]="['/users', u._id]" class="btn btn-secondary btn-sm">Voir</a>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty-state">Aucun utilisateur</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (pages > 1) {
        <div class="pagination">
          <button class="btn btn-secondary btn-sm" [disabled]="page <= 1" (click)="goPage(page - 1)">Préc.</button>
          <span>Page {{ page }} / {{ pages }}</span>
          <button class="btn btn-secondary btn-sm" [disabled]="page >= pages" (click)="goPage(page + 1)">Suiv.</button>
        </div>
      }
    </div>
  `,
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  total = 0;
  page = 1;
  pages = 1;
  search = '';
  vipFilter = '';
  activeFilter = '';

  constructor(private userService: UserService) {}

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.userService.list({
      page: this.page,
      search: this.search || undefined,
      vip: this.vipFilter || undefined,
      active: this.activeFilter || undefined,
    }).subscribe(res => {
      this.users = res.users;
      this.total = res.total;
      this.pages = res.pages;
    });
  }

  goPage(p: number) {
    this.page = p;
    this.loadUsers();
  }

  isVip(u: User): boolean {
    return !!u.vipExpiresAt && new Date(u.vipExpiresAt).getTime() > Date.now();
  }
}
