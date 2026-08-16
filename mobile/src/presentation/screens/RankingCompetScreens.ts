/* =============================================================================
 * PRESENTATION · screens/RankingScreen.ts + CompetScreen.ts
 * Classements (saison, robots) et Compétitions (vitrine) — FIDÈLES au design
 * system. Le classement est alimenté par l'écurie réelle quand elle existe,
 * complété par un podium de démonstration ; les tournois restent une vitrine.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button } from '../components/ui';
import { Carousel } from '../components/Carousel';
import type { AppContext } from '../context';

interface RankRow { rank: number; name: string; accent: string; winRate: number; elo: number; me?: boolean }

const DEMO_RANKING: RankRow[] = [
  { rank: 1, name: 'Zéno·9', accent: '#e6c46a', winRate: 72, elo: 1842 },
  { rank: 2, name: 'Kant·IA', accent: '#9db4dd', winRate: 69, elo: 1790 },
  { rank: 3, name: 'Héra·X', accent: '#e08795', winRate: 66, elo: 1744 },
];

export function RankingScreen(ctx: AppContext): HTMLElement {
  const { router, robotService } = ctx;

  const rowEl = (r: RankRow) => h('div', {
    class: 'row gap-3', style: {
      padding: r.rank === 1 ? '10px 14px' : '9px 14px', borderRadius: 'var(--r-lg)',
      background: r.rank === 1 ? 'linear-gradient(90deg,rgba(230,196,106,.14),rgba(230,196,106,.04))' : r.me ? 'rgba(126,203,152,.08)' : 'var(--c-veil-04)',
      border: r.rank === 1 ? '1px solid rgba(230,196,106,.35)' : r.me ? '1px solid rgba(126,203,152,.3)' : '1px solid var(--c-line)',
    },
  },
    h('span', { class: 'title', style: { fontSize: r.rank === 1 ? '18px' : '16px', width: '22px', color: r.rank === 1 ? 'var(--c-gold)' : r.me ? 'var(--c-success)' : 'var(--c-text-soft)' } }, String(r.rank)),
    h('div', { class: 'avatar', style: { '--avatar-ring': r.accent, width: '30px', height: '27px' } },
      h('span', { class: 'avatar__dot', style: { background: r.accent } }), h('span', { class: 'avatar__dot', style: { background: r.accent } })),
    h('span', { class: 'title fill', style: { fontSize: '14px', fontWeight: '700' } }, r.name, r.me ? h('span', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-success)', fontWeight: '400' } }, ' · vous') : null),
    h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, r.winRate + '% V'),
    h('span', { class: 'mono', style: { fontSize: '13px', color: r.rank === 1 ? 'var(--c-gold)' : r.me ? 'var(--c-success)' : 'var(--c-text-soft)' } }, String(r.elo)),
  );

  const tab = (label: string, active: boolean) => h('span', { class: 'mono', style: {
    fontSize: '11px', padding: '6px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer',
    background: active ? 'var(--g-btn)' : 'var(--c-veil-06)', color: active ? 'var(--c-ink)' : 'var(--c-text-soft)', border: active ? 'none' : '1px solid var(--c-line-strong)',
  } }, label);

  const list = h('div', { class: 'col gap-2' }, ...DEMO_RANKING.map(rowEl));

  // Ajoute la meilleure entrée « vous » depuis l'écurie réelle si disponible.
  robotService.list().then((robots) => {
    if (!robots.length) return;
    const mine = robots[0];
    list.append(rowEl({ rank: 14, name: mine.name, accent: mine.accent, winRate: mine.winRate || 61, elo: mine.elo, me: true }));
  }).catch(() => {});

  return h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '14px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'eyebrow' }, 'SAISON 1 · ROBOTS'), h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '2px' } }, 'Classements')),
      h('div', { class: 'row gap-2' }, tab('Robots', true), tab('Joueurs', false), Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') }))),
    list,
  );
}

export function CompetScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;

  /** Description d'un format d'inscription (miroir du catalog serveur). */
  interface FormatCard {
    id: 'duo_steel' | 'hybrid_alliance' | 'royal_square';
    label: string;
    glyph: string;
    tag: string;
    accent: string;
    subtitle: string;
    buyIn: number;
    prize: number;
    robotsPerPlayer: number;
    isHeadless: boolean;
  }
  const FORMATS: FormatCard[] = [
    { id: 'duo_steel', label: 'Duo d\u2019acier', glyph: '\u2666', tag: '2 ROBOTS \u00d7 2', accent: 'linear-gradient(160deg,#3f6ea1 0%,#1b3a63 100%)',
      subtitle: 'Un affrontement 100 % en coulisses.', buyIn: 200, prize: 150, robotsPerPlayer: 2, isHeadless: true },
    { id: 'hybrid_alliance', label: 'Alliance hybride', glyph: '\u2660', tag: 'HUMAIN + ROBOT', accent: 'linear-gradient(160deg,#c99c3f 0%,#7a5c1c 100%)',
      subtitle: 'Vous + votre robot, tous ensemble.', buyIn: 150, prize: 225, robotsPerPlayer: 1, isHeadless: false },
    { id: 'royal_square', label: 'Carr\u00e9e royale', glyph: '\u2665', tag: '4 HUMAINS', accent: 'linear-gradient(160deg,#b0384a 0%,#5f1f2a 100%)',
      subtitle: 'Quatre humains, deux \u00e9quipes, une couronne.', buyIn: 100, prize: 150, robotsPerPlayer: 0, isHeadless: false },
  ];

  const statusEl = h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', minHeight: '14px', marginTop: '10px', textAlign: 'center' } });

  /** Choisit N robots pour l'inscription (les mieux notés d'abord). */
  const pickRobots = (n: number): string[] => ctx.session.robots.slice(0, n).map((r) => r.id);

  const enqueue = async (f: FormatCard) => {
    if (!api.isAuthenticated()) { statusEl.textContent = '\u2717 Connexion requise'; return; }
    // Si déjà en file ou match en cours pour ce format, aller directement
    // en waiting au lieu de refaire une sélection de robots.
    try {
      const { match } = await api.getMyMatch();
      const m = match as { format?: string; status?: string } | null;
      if (m && m.format === f.id && (m.status === 'pairing' || m.status === 'running')) {
        router.go(`matchmaking?format=${f.id}`); return;
      }
      const { sizes } = await api.matchQueues();
      // On ne connaît pas l'user_id en file côté client ; on tente l'enqueue :
      // si le serveur détecte "déjà en file", il renvoie queued (idempotent v14.7).
    } catch { /* pas grave */ }
    router.go(`enroll?format=${f.id}`);
  };

  const cancel = async (f: FormatCard) => {
    try {
      await api.cancelMatchQueue(f.id);
      await ctx.session.refreshWallet();
      statusEl.textContent = `\u2713 Inscription annul\u00e9e, buy-in rembours\u00e9.`;
    } catch (e) {
      statusEl.textContent = `\u2717 ${(e as Error).message}`;
    }
  };

  /**
   * Carte de format redessinée : glyphe belote en filigrane, hiérarchie
   * typographique claire (tag → titre → sous-titre → économie → CTA).
   * Effet de survol subtil, ombre douce.
   */
  const formatCard = (f: FormatCard) => {
    const card = h('div', {
    class: 'compet-card',
    style: {
      position: 'relative', padding: '18px 16px', borderRadius: 'var(--r-lg)',
      background: f.accent, color: '#fff', overflow: 'hidden',
      boxShadow: '0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.15)',
      cursor: 'default', minHeight: '210px',
      // v14.11 : largeurs fixes pour carrousel horizontal.
      minWidth: '260px', maxWidth: '320px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    },
  },
    // Glyphe belote en filigrane
    h('div', { style: {
      position: 'absolute', right: '-10px', top: '-30px', fontSize: '150px',
      opacity: '.09', pointerEvents: 'none', lineHeight: '1', color: '#fff',
    } }, f.glyph),
    // Bloc haut : tag + titre + subtitle
    h('div', { style: { position: 'relative' } },
      h('span', { class: 'mono', style: {
        display: 'inline-block', fontSize: '9px', padding: '4px 10px',
        borderRadius: 'var(--r-pill)', background: 'rgba(0,0,0,.35)',
        color: '#fff', letterSpacing: '.06em',
      } }, f.tag),
      h('div', { class: 'title', style: { fontSize: '19px', color: '#fff', margin: '10px 0 4px', lineHeight: '1.2' } }, f.label),
      h('div', { style: { fontSize: '11px', color: 'rgba(255,255,255,.88)', marginBottom: '10px' } }, f.subtitle),
    ),
    // Bloc bas : économie + CTA
    h('div', { style: { position: 'relative' } },
      h('div', { class: 'mono', style: {
        fontSize: '10px', color: 'rgba(255,255,255,.85)', marginBottom: '10px',
        display: 'flex', justifyContent: 'space-between',
      } },
        h('span', {}, `Buy-in ${f.buyIn} \u25c6`),
        h('span', {}, `Gain ${f.prize} \u25c6`),
      ),
      h('div', { class: 'row gap-2' },
        h('button', {
          class: 'btn btn--sm',
          style: { color: '#1a1a1a', background: '#fff', flex: '1', fontWeight: '600' },
          onClick: () => void enqueue(f),
        }, 'S\u2019inscrire'),
        h('button', {
          class: 'btn btn--sm btn--ghost',
          style: { color: '#fff', borderColor: 'rgba(255,255,255,.4)' },
          onClick: () => void cancel(f),
        }, 'Annuler'),
      ),
    ),
  );
    return card;
  };

  // ── Section Tournois (v14.1) ─────────────────────────────────────────────
  interface TournamentRow {
    _id: string; name: string; format: string; status: string;
    capacity: number; entryFee: number; startAt: string;
    participants?: unknown[];
  }
  let currentTournamentFilter: 'upcoming' | 'live' | 'finished' = 'upcoming';
  // Host container : sera rempli par un Carousel à chaque loadTournaments.
  const tournamentsHost = h('div', { style: { marginTop: '10px' } });
  const tournamentsMsg = h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)', padding: '6px 0' } }, 'Chargement des tournois…');

  const STATUS_COLORS: Record<string, { bg: string; border: string; label: string; color: string; dotAnim?: boolean }> = {
    upcoming: { bg: 'rgba(230,196,106,.10)', border: 'rgba(230,196,106,.35)', label: '\u00c0 VENIR', color: '#e6c46a' },
    live: { bg: 'rgba(232,150,68,.14)', border: 'rgba(232,150,68,.50)', label: 'EN COURS', color: '#e89644', dotAnim: true },
    finished: { bg: 'rgba(255,255,255,.03)', border: 'rgba(255,255,255,.10)', label: 'TERMIN\u00c9', color: 'var(--c-text-mute)' },
    draft: { bg: 'rgba(255,255,255,.03)', border: 'rgba(255,255,255,.08)', label: 'DRAFT', color: 'var(--c-text-mute)' },
  };

  /** Icône par défaut selon format (fallback si tournoi n'a pas de icon custom, v14.11). */
  const iconByFormat: Record<string, string> = {
    duo_steel: '\u2666', hybrid_alliance: '\u2660', royal_square: '\u2665',
  };
  /** Couleur par défaut selon format. */
  const colorByFormat: Record<string, string> = {
    duo_steel: '#3f6ea1', hybrid_alliance: '#c99c3f', royal_square: '#b0384a',
  };

  const renderTournamentCard = (t: TournamentRow) => {
    const participantCount = (t.participants ?? []).length;
    const canJoin = t.status === 'upcoming';
    const rules = FORMATS.find((f) => f.id === t.format);
    const style = STATUS_COLORS[t.status] ?? STATUS_COLORS.finished;
    // v14.11 : color/icon du modèle si présents (arrive en v14.12), sinon fallback format.
    const cardColor = (t as any).color || colorByFormat[t.format] || '#e6c46a';
    const cardIcon = (t as any).icon || iconByFormat[t.format] || '\u2666';
    const startShort = new Date(t.startAt).toLocaleDateString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const card = h('div', {
      class: 'compet-tournament-card',
      onClick: () => router.go(`tournament?id=${t._id}`),
    },
      // Bandeau haut : icône couleur + statut chip
      h('div', { class: 'compet-tournament-card__head' },
        h('span', { class: 'compet-tournament-card__icon' }, cardIcon),
        h('span', { class: 'mono compet-tournament-card__status', style: {
          background: `${style.color}22`, color: style.color, borderColor: `${style.color}55`,
        } },
          style.dotAnim ? h('span', { class: 'compet-tournament-card__livedot' }) : null as any,
          style.label,
        )),
      // Titre
      h('div', { class: 'compet-tournament-card__title' }, t.name),
      // Format & date
      h('div', { class: 'mono compet-tournament-card__meta' },
        rules?.label ?? t.format),
      h('div', { class: 'mono compet-tournament-card__meta compet-tournament-card__meta--dim' },
        startShort),
      // Statistiques (participants, buy-in)
      h('div', { class: 'compet-tournament-card__stats' },
        h('span', { class: 'mono compet-tournament-card__stat' }, `${participantCount}/${t.capacity}`),
        h('span', { class: 'mono compet-tournament-card__stat compet-tournament-card__stat--fee' }, `${t.entryFee} \u25c6`)),
      // Bouton (inscription si upcoming, sinon liseré discret)
      canJoin
        ? h('button', {
            class: 'btn btn--sm compet-tournament-card__join',
            onClick: (e: Event) => { e.stopPropagation(); void joinTournament(t, rules?.robotsPerPlayer ?? 0); },
          }, 'S\u2019inscrire')
        : h('div', { class: 'mono compet-tournament-card__cta' }, 'Voir \u203a'),
    ) as HTMLElement;
    card.style.setProperty('--card-color', cardColor);
    return card;
  };

  const joinTournament = async (t: TournamentRow, robotsRequired: number) => {
    if (!api.isAuthenticated()) { tournamentsMsg.textContent = '\u2717 Connexion requise'; return; }
    const robotIds = pickRobots(robotsRequired);
    if (robotIds.length < robotsRequired) {
      tournamentsMsg.textContent = `\u2717 Il vous faut ${robotsRequired} robot(s) pour ce tournoi.`;
      return;
    }
    try {
      await api.joinTournament(t._id, robotIds);
      await ctx.session.refreshWallet();
      tournamentsMsg.textContent = `\u2713 Inscription \u00e0 « ${t.name} » confirm\u00e9e.`;
      void loadTournaments();
    } catch (e) {
      tournamentsMsg.textContent = `\u2717 ${(e as Error).message}`;
    }
  };

  const loadTournaments = async () => {
    try {
      const r = await api.listTournaments(currentTournamentFilter);
      const rows = (r.tournaments as TournamentRow[]) || [];
      clear(tournamentsHost);
      if (rows.length === 0) {
        tournamentsHost.append(h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,.02)', borderRadius: 'var(--r-md)', border: '1px dashed rgba(255,255,255,.08)' } },
          'Aucun tournoi dans cette cat\u00e9gorie pour le moment.'));
      } else {
        // v14.11 : dynamique — 0, 3, 15 tournois : tous en carrousel horizontal.
        const cards = rows.map(renderTournamentCard);
        tournamentsHost.append(Carousel(cards, { itemGap: 12, className: 'compet-tournaments-car' }));
      }
      tournamentsMsg.textContent = '';
    } catch (e) {
      tournamentsMsg.textContent = `\u2717 ${(e as Error).message}`;
    }
  };
  void loadTournaments();

  const filterBtn = (label: string, key: 'upcoming' | 'live' | 'finished') =>
    h('button', {
      class: 'btn btn--sm ' + (currentTournamentFilter === key ? '' : 'btn--ghost'),
      onClick: () => { currentTournamentFilter = key; void loadTournaments(); refreshFilters(); },
    }, label);
  let filterRow = h('div', { class: 'row gap-2' });
  const refreshFilters = () => {
    clear(filterRow);
    filterRow.append(filterBtn('\u00c0 venir', 'upcoming'), filterBtn('En cours', 'live'), filterBtn('Termin\u00e9s', 'finished'));
  };
  refreshFilters();

  return h('div', { class: 'anim-screen', style: {
    position: 'absolute', inset: '0', padding: '20px 26px 20px 62px',
    background: 'radial-gradient(1000px 500px at 30% 0%, #101b2f, #05070f 70%)',
    overflow: 'auto',
  } },
    // En-tête
    h('div', { class: 'between', style: { marginBottom: '20px' } },
      h('div', {},
        h('div', { class: 'eyebrow', style: { color: 'var(--c-gold)' } }, 'MATCHS & TOURNOIS'),
        h('h2', { class: 'title', style: { fontSize: 'var(--fs-xl)', marginTop: '4px', letterSpacing: '.01em' } }, 'Compétitions')),
      Button('← Accueil', { variant: 'secondary', size: 'sm', onClick: () => router.go('home') })),

    // Section 1 : Match rapide — carrousel scrollable (extensible si on ajoute des formats).
    h('div', { class: 'eyebrow', style: { marginBottom: '10px', color: 'var(--c-text-mute)' } }, 'MATCH RAPIDE'),
    Carousel(FORMATS.map(formatCard), { itemGap: 12, className: 'compet-formats-car' }),
    statusEl,

    // Séparateur
    h('div', { style: { height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)', margin: '24px 0 18px' } }),

    // Section 2 : Tournois
    h('div', { class: 'between', style: { marginBottom: '12px' } },
      h('div', {},
        h('div', { class: 'eyebrow', style: { color: 'var(--c-gold)' } }, 'TOURNOIS'),
        h('h3', { class: 'title', style: { fontSize: '16px', marginTop: '4px' } }, 'Bracket \u00e0 \u00e9limination directe')),
      filterRow),
    tournamentsMsg,
    tournamentsHost,

    // v14.7 — Accès dédié aux parties publiques en cours (spectateur).
    h('div', {
      style: {
        marginTop: '18px', padding: '12px 16px', borderRadius: 'var(--r-md)',
        background: 'rgba(126,203,152,.06)', border: '1px solid rgba(126,203,152,.20)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
        transition: 'transform .15s ease, background .15s ease',
      },
      onClick: () => router.go('public-games'),
      onmouseover: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'; },
      onmouseout: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; },
    },
      h('span', { class: 'live-chip__dot' }),
      h('div', { style: { flex: '1' } },
        h('div', { class: 'mono', style: { fontSize: '9px', letterSpacing: '.08em', color: 'var(--c-success)' } }, 'SPECTATEUR'),
        h('div', { class: 'title', style: { fontSize: '13px', marginTop: '3px' } }, 'Parties publiques en cours'),
        h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-text-mute)', marginTop: '2px' } }, 'Regardez d\u2019autres tables jouer en direct')),
      h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-soft)' } }, '\u25b6'),
    ),

    // Note de bas
    h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-faint)', marginTop: '20px', textAlign: 'center' } },
      'Le serveur regroupe les joueurs par format. Duo d\u2019acier se joue en coulisses ; les autres formats ouvrent une table en direct.'),
  );
}
