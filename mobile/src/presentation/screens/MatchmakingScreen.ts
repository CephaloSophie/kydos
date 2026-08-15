/* =============================================================================
 * PRESENTATION · screens/MatchmakingScreen.ts
 * -----------------------------------------------------------------------------
 * Écran unique qui gère les 3 phases après inscription à un format :
 *   1. WAITING     — en file d'attente : robots dansants + « recherche… »
 *   2. LIVE        — match trouvé et en cours : les 4 robots/humains à la
 *                    table + score en direct (DUO_STEEL uniquement, headless).
 *   3. FINISHED    — match terminé : bandeau vainqueur + bouton Rejouer.
 *
 * Route : `matchmaking?format=duo_steel|hybrid_alliance|royal_square`.
 * Le polling léger (toutes 2s) interroge `/matches/mine` pour détecter les
 * transitions. Cleanup complet du timer au démontage.
 * ========================================================================== */
import { h, clear } from '../../core/dom';
import { Button } from '../components/ui';
import { Waiting } from '../components/Waiting';
import type { AppContext } from '../context';

/** Miroir client des formats (aligné avec MatchFormat serveur). */
export enum MatchFormatClient {
  DUO_STEEL = 'duo_steel',
  HYBRID_ALLIANCE = 'hybrid_alliance',
  ROYAL_SQUARE = 'royal_square',
}

const FORMAT_META: Record<string, { label: string; accent: string; robotsPerPlayer: number }> = {
  duo_steel: { label: 'Duo d\u2019acier', accent: 'linear-gradient(135deg,#3f6ea1,#1b3a63)', robotsPerPlayer: 2 },
  hybrid_alliance: { label: 'Alliance hybride', accent: 'linear-gradient(135deg,#c99c3f,#7a5c1c)', robotsPerPlayer: 1 },
  royal_square: { label: 'Carr\u00e9e royale', accent: 'linear-gradient(135deg,#a13a4c,#5c1f2b)', robotsPerPlayer: 0 },
};

interface MatchParticipant {
  seat: number; team: 'A' | 'B'; isHuman: boolean;
  userId: { _id?: string; username?: string } | string | null;
  robotId: { _id?: string; name?: string } | string | null;
}
interface MatchDetail {
  _id: string;
  format: string;
  status: 'queued' | 'pairing' | 'running' | 'finished' | 'cancelled';
  participants: MatchParticipant[];
  winnerTeam: 'A' | 'B' | null;
  scoreTeamA: number; scoreTeamB: number;
  game?: string | null;
  createdAt: string;
  finishedAt?: string | null;
}

function paramFormat(): MatchFormatClient {
  const raw = new URLSearchParams(location.hash.split('?')[1] ?? '').get('format') ?? 'duo_steel';
  return raw as MatchFormatClient;
}
function nameOf(p: MatchParticipant): string {
  if (p.isHuman) return typeof p.userId === 'object' && p.userId ? (p.userId.username ?? 'Humain') : 'Humain';
  return typeof p.robotId === 'object' && p.robotId ? (p.robotId.name ?? 'Robot') : 'Robot';
}
function avatarFor(p: MatchParticipant): string {
  return p.isHuman ? '\ud83d\udc64' : '\ud83e\udd16';
}

export function MatchmakingScreen(ctx: AppContext): HTMLElement {
  const { router, api } = ctx;
  const format = paramFormat();
  const meta = FORMAT_META[format] ?? FORMAT_META.duo_steel;

  const root = h('div', { class: 'anim-screen', style: {
    position: 'absolute', inset: '0', padding: '20px 24px 20px 60px', overflow: 'auto',
    background: 'radial-gradient(900px 500px at 50% 40%, #0e1729, #05070f 70%)',
  } }) as HTMLElement & { _cleanup?: () => void };

  const banner = h('div', {
    style: {
      padding: '14px 18px', borderRadius: 'var(--r-lg)', marginBottom: '18px',
      background: meta.accent, color: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,.3)',
    },
  },
    h('div', { class: 'mono', style: { fontSize: '10px', opacity: '.85' } }, format.toUpperCase()),
    h('div', { class: 'title', style: { fontSize: '20px', margin: '4px 0' } }, meta.label),
  );
  const topbar = h('div', { class: 'between', style: { marginBottom: '10px' } },
    h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
      h('div', { class: 'eyebrow' }, 'MATCHMAKING'),
      statusChip('ATTENTE', '#e6c46a')),
    Button('\u2716 Annuler la recherche', { variant: 'secondary', size: 'sm', onClick: () => void doCancel() }));
  const stage = h('div', { class: 'col', style: { minHeight: '340px', position: 'relative' } });
  root.append(topbar, banner, stage);

  function statusChip(label: string, color: string): HTMLElement {
    return h('span', { class: 'mono', 'data-role': 'status-chip', style: {
      fontSize: '9px', padding: '3px 10px', borderRadius: 'var(--r-pill)',
      background: `${color}22`, color, border: `1px solid ${color}55`, letterSpacing: '.08em',
    } }, label);
  }
  const setStatus = (label: string, color: string) => {
    const chip = topbar.querySelector('[data-role="status-chip"]') as HTMLElement | null;
    if (chip) {
      chip.textContent = label;
      chip.style.color = color;
      chip.style.background = `${color}22`;
      chip.style.borderColor = `${color}55`;
    }
  };

  let poller: ReturnType<typeof setInterval> | null = null;
  let lastMatchId: string | null = null;
  let currentPhase: 'waiting' | 'live' | 'finished' = 'waiting';

  const doCancel = async () => {
    if (poller) { clearInterval(poller); poller = null; }
    try { await api.cancelMatchQueue(format); await ctx.session.refreshWallet(); } catch { /* ignore */ }
    router.go('compet');
  };

  /* ── Phase 1 : waiting (robots dansants + hint) ─────────────────────────── */
  const renderWaiting = () => {
    setStatus('ATTENTE', '#e6c46a');
    clear(stage);
    const wait = Waiting({ label: 'recherche d\u2019adversaire' });
    // On enlève le fond de Waiting pour l'intégrer proprement.
    (wait as HTMLElement).style.background = 'transparent';
    (wait as HTMLElement).style.position = 'relative';
    (wait as HTMLElement).style.inset = 'auto';
    (wait as HTMLElement).style.minHeight = '260px';
    stage.append(wait);
    stage.append(
      h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', textAlign: 'center', marginTop: '14px' } },
        format === MatchFormatClient.DUO_STEEL
          ? 'Vos deux robots attendent des adversaires. La partie d\u00e9marrera d\u00e8s qu\u2019un autre joueur inscrit ses robots.'
          : format === MatchFormatClient.HYBRID_ALLIANCE
            ? 'On attend un autre joueur avec son robot pour compl\u00e9ter la table (2\u00a0humains + 2\u00a0robots).'
            : 'Il faut 4 humains pour d\u00e9marrer. Invitez des amis pour aller plus vite !',
      ),
    );
  };

  /* ── Phase 2 : match live (4 avatars + score en direct) ─────────────────── */
  const renderLive = (m: MatchDetail) => {
    setStatus('EN COURS', '#e89644');
    clear(stage);
    currentPhase = 'live';
    const teamA = m.participants.filter((p) => p.team === 'A').sort((a, b) => a.seat - b.seat);
    const teamB = m.participants.filter((p) => p.team === 'B').sort((a, b) => a.seat - b.seat);

    const seatCard = (p: MatchParticipant, teamColor: string) => h('div', {
      style: {
        padding: '14px 12px', borderRadius: 'var(--r-md)', textAlign: 'center', minWidth: '110px',
        background: 'rgba(16,21,31,.7)', border: `2px solid ${teamColor}`,
      },
    },
      h('div', { style: { fontSize: '28px', lineHeight: '1' } }, avatarFor(p)),
      h('div', { class: 'mono', style: { fontSize: '9px', color: 'var(--c-text-mute)', marginTop: '4px' } }, `Si\u00e8ge ${p.seat}`),
      h('div', { class: 'title', style: { fontSize: '13px', marginTop: '4px', color: teamColor } }, nameOf(p)),
    );

    stage.append(
      // Bandeau LIVE
      h('div', { class: 'row center gap-2', style: { marginBottom: '18px' } },
        h('span', { class: 'live-chip__dot' }),
        h('span', { class: 'mono', style: { color: 'var(--c-success)', fontSize: '12px' } }, 'MATCH EN COURS'),
      ),
      // Table symbolique : Team A à gauche, Team B à droite
      h('div', { class: 'row center gap-4', style: { padding: '16px', borderRadius: 'var(--r-lg)', background: 'radial-gradient(300px 200px at 50% 50%, rgba(46,140,80,.4), transparent 70%)' } },
        h('div', { class: 'col gap-2' },
          h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-success)', textAlign: 'center', marginBottom: '4px' } }, 'ÉQUIPE A'),
          h('div', { class: 'row gap-2' }, ...teamA.map((p) => seatCard(p, '#7ecb98'))),
          h('div', { class: 'title', style: { fontSize: '24px', color: 'var(--c-success)', textAlign: 'center', marginTop: '10px' } }, String(m.scoreTeamA ?? 0)),
        ),
        h('div', { class: 'title', style: { fontSize: '20px', color: 'var(--c-text-mute)', padding: '0 20px' } }, 'VS'),
        h('div', { class: 'col gap-2' },
          h('div', { class: 'mono', style: { fontSize: '10px', color: 'var(--c-danger)', textAlign: 'center', marginBottom: '4px' } }, 'ÉQUIPE B'),
          h('div', { class: 'row gap-2' }, ...teamB.map((p) => seatCard(p, '#e85d70'))),
          h('div', { class: 'title', style: { fontSize: '24px', color: 'var(--c-danger)', textAlign: 'center', marginTop: '10px' } }, String(m.scoreTeamB ?? 0)),
        ),
      ),
      h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)', textAlign: 'center', marginTop: '14px' } },
        m.format === 'duo_steel'
          ? 'Duo d\u2019acier : la partie se joue en coulisses. Vous verrez le r\u00e9sultat d\u2019ici quelques secondes.'
          : 'Une table de jeu s\u2019ouvre pour les humains. Vous pouvez rejoindre depuis l\u2019accueil.',
      ),
    );
  };

  /* ── Phase 3 : finished (vainqueur + rejouer) ──────────────────────────── */
  const renderFinished = (m: MatchDetail) => {
    const meId = ctx.session.profile?.id;
    const myTeam = m.participants.find((p) => {
      const u = p.userId; const uid = typeof u === 'object' && u ? u._id : (u as string | null);
      return uid === meId;
    })?.team;
    const won = myTeam && myTeam === m.winnerTeam;
    setStatus(won ? 'VICTOIRE' : m.winnerTeam ? 'DÉFAITE' : 'MATCH NUL',
      won ? 'var(--c-success)' : m.winnerTeam ? 'var(--c-danger)' : 'var(--c-text-mute)');
    clear(stage);
    currentPhase = 'finished';
    if (poller) { clearInterval(poller); poller = null; }

    stage.append(
      h('div', { style: { textAlign: 'center', padding: '30px 20px' } },
        h('div', { style: { fontSize: '64px', marginBottom: '10px' } }, won ? '\ud83c\udfc6' : m.winnerTeam ? '\ud83e\udd42' : '\ud83e\udd1d'),
        h('div', { class: 'title', style: { fontSize: '26px', marginBottom: '8px', color: won ? 'var(--c-gold)' : 'var(--c-text-soft)' } },
          won ? 'Victoire !' : m.winnerTeam ? 'D\u00e9faite' : 'Match nul'),
        h('div', { class: 'mono', style: { fontSize: '13px', color: 'var(--c-text-mute)' } },
          `Score final : \u00c9quipe A ${m.scoreTeamA ?? 0} \u2014 \u00c9quipe B ${m.scoreTeamB ?? 0}`),
        h('div', { class: 'row center gap-2', style: { marginTop: '24px' } },
          m.game ? Button('\u25b6 Rejouer le match', { size: 'sm', onClick: () => router.go(`replay?id=${m.game}`) }) : h('span', {}, ''),
          Button('Retour', { variant: 'secondary', size: 'sm', onClick: () => router.go('compet') }),
        ),
      ),
    );
    void ctx.session.refreshWallet();
  };

  /* ── Poller : cherche le dernier match du joueur ────────────────────────── */
  const enteredAt = Date.now();
  const poll = async () => {
    try {
      const { match } = await api.getMyMatch();
      const m = match as MatchDetail | null;
      if (!m) return; // toujours en file
      // On ignore les matchs FINISHED qui datent d'avant notre entrée dans
      // l'écran (résultats de la session précédente). Les PAIRING/RUNNING
      // sont toujours considérés (une file lente peut prendre plusieurs
      // minutes à trouver un adversaire).
      if (m.status === 'finished') {
        const finishedAt = m.finishedAt ? new Date(m.finishedAt).getTime() : 0;
        if (finishedAt < enteredAt - 5_000) return;   // vieux résultat
      }

      if (m.status === 'finished') {
        lastMatchId = m._id;
        renderFinished(m);
        return;
      }
      if (m.status === 'running' || m.status === 'pairing') {
        // Formats temps-réel : dès que le match est RUNNING (Table éphémère
        // provisionnée), on ouvre directement l'écran table classique. Cela
        // évite d'afficher un écran intermédiaire « MATCH EN COURS » alors
        // que le joueur peut effectivement jouer.
        if (m.status === 'running' && m.format !== 'duo_steel' && lastMatchId !== m._id) {
          lastMatchId = m._id;
          if (poller) { clearInterval(poller); poller = null; }
          try {
            const { tableId } = await api.provisionMatchLiveTable(m._id);
            // La bonne query est ?online=<tableId> pour que TableScreen
            // saute le dialogue d'entraînement et se connecte à la table
            // en ligne existante.
            router.go(`table?online=${tableId}`);
          } catch (e) {
            // Fallback : on affiche au moins la vue LIVE avec les 4 avatars
            // le temps que la table soit prête.
            renderLive(m);
            // Repoll pour retenter la provision au tick suivant.
            poller = setInterval(() => void poll(), 2000);
          }
          return;
        }
        // DUO_STEEL : reste sur la vue "MATCH EN COURS" jusqu'au finished.
        if (lastMatchId !== m._id || currentPhase === 'waiting') {
          lastMatchId = m._id;
          renderLive(m);
        }
      }
    } catch { /* transient */ }
  };

  renderWaiting();
  poller = setInterval(() => void poll(), 2000);
  // Un premier poll immédiat pour rattraper un match déjà démarré.
  void poll();

  root._cleanup = () => { if (poller) { clearInterval(poller); poller = null; } };
  return root;
}
