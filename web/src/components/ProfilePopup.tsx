import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Dialog } from '../ds/feedback/Dialog';
import { TeamBadge } from '../ds/score/TeamBadge';

export type ProfileTarget = { kind: 'user' | 'robot'; id: string } | null;

interface UserProfile { id: string; username: string; level: number; rewardPoints: number; gamesPlayed: number; robots: number; team: { id: string; name: string; visibility: string } | null }
interface RobotProfile { id: string; name: string; personality: { aggressiveness: number; concentration: number; velocity: number }; algoName: string; hasWorkflow: boolean; owner: { id: string; username: string } | null }

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', padding: '8px 12px', minWidth: 92 }}>
    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-caps)' }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-1)' }}>{value}</span>
  </div>
);

const Bar = ({ label, v }: { label: string; v: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
    <span style={{ width: 96, fontSize: 'var(--fs-sm)', color: 'var(--text-2)' }}>{label}</span>
    <span style={{ flex: 1, height: 8, background: 'var(--bg-inset)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
      <span style={{ display: 'block', height: '100%', width: `${(v / 10) * 100}%`, background: 'var(--accent)' }} />
    </span>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{v}/10</span>
  </div>
);

/** Popup de profil : un joueur (niveau, parties, score) ou un robot (adverse compris). */
export function ProfileDialog({ target, onClose }: { target: ProfileTarget; onClose: () => void }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [robot, setRobot] = useState<RobotProfile | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setUser(null); setRobot(null); setErr('');
    if (!target) return;
    const path = target.kind === 'user' ? `/users/${target.id}/profile` : `/robots/${target.id}`;
    apiFetch(path)
      .then((d) => (target.kind === 'user' ? setUser(d.profile) : setRobot(d.robot)))
      .catch((e) => setErr((e as Error).message));
  }, [target?.kind, target?.id]);

  const open = !!target;
  const title = target?.kind === 'robot' ? 'Fiche robot' : 'Profil joueur';

  return (
    <Dialog open={open} title={title} onClose={onClose} width={420}>
      {err && <p className="err">{err}</p>}

      {target?.kind === 'user' && user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <TeamBadge name={user.team?.name ?? user.username} size={48} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-h3)', color: 'var(--text-1)' }}>{user.username}</div>
              <div className="muted">{user.team ? `${user.team.name} · groupe ${user.team.visibility === 'public' ? 'public' : 'privé'}` : 'sans équipe'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Stat label="Niveau" value={user.level} />
            <Stat label="Parties" value={user.gamesPlayed} />
            <Stat label="Score" value={user.rewardPoints.toLocaleString('fr-FR')} />
            <Stat label="Robots" value={user.robots} />
          </div>
        </div>
      )}

      {target?.kind === 'robot' && robot && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-h3)', color: 'var(--text-1)' }}>{robot.name}</div>
            <div className="muted">
              algo <b>{robot.algoName}</b>{robot.hasWorkflow ? ' · workflow' : ''}{robot.owner ? ` · à ${robot.owner.username}` : ''}
            </div>
          </div>
          <div>
            <Bar label="Agressivité" v={robot.personality.aggressiveness} />
            <Bar label="Concentration" v={robot.personality.concentration} />
            <Bar label="Vélocité" v={robot.personality.velocity} />
          </div>
        </div>
      )}

      {open && !user && !robot && !err && <p className="muted">Chargement…</p>}
    </Dialog>
  );
}
