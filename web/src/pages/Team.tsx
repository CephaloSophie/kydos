import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../state';
import { TeamBadge } from '../ds/score/TeamBadge';
import { Button } from '../ds/core/Button';
import { Input } from '../ds/forms/Input';
import { Switch } from '../ds/forms/Switch';
import { ProfileDialog, type ProfileTarget } from '../components/ProfilePopup';

interface Member { id: string; username: string; rewardPoints: number; level: number }
interface MyTeam { id: string; name: string; points: number; owner: string; visibility: 'public' | 'private' }
interface TeamRow { id: string; name: string; points: number; members: number }
interface Invitation { id: string; team: { id: string; name: string; visibility: string }; from: { id: string; username: string } }
interface SentInv { id: string; to: { id: string; username: string } }

export function TeamPage() {
  const { user, refresh } = useAuth();
  const [mine, setMine] = useState<{ team: MyTeam | null; members: Member[] }>({ team: null, members: [] });
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [sent, setSent] = useState<SentInv[]>([]);
  const [name, setName] = useState('');
  const [newPublic, setNewPublic] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [profile, setProfile] = useState<ProfileTarget>(null);

  const isOwner = !!mine.team && mine.team.owner === user?.id;

  const load = async () => {
    const m = await apiFetch('/teams/mine');
    setMine(m);
    setTeams((await apiFetch('/teams')).teams);
    setInvites((await apiFetch('/invitations')).invitations);
    if (m.team && m.team.owner === user?.id) {
      try { setSent((await apiFetch(`/teams/${m.team.id}/invitations`)).invitations); } catch { setSent([]); }
    } else setSent([]);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setErr('');
    try { await apiFetch('/teams', { method: 'POST', body: JSON.stringify({ name, visibility: newPublic ? 'public' : 'private' }) }); setName(''); await load(); await refresh(); }
    catch (e) { setErr((e as Error).message); }
  };
  const toggleVisibility = async () => {
    if (!mine.team) return;
    const next = mine.team.visibility === 'public' ? 'private' : 'public';
    await apiFetch(`/teams/${mine.team.id}`, { method: 'PATCH', body: JSON.stringify({ visibility: next }) });
    await load();
  };
  const invite = async () => {
    if (!mine.team || !identifier.trim()) return;
    setErr(''); setMsg('');
    try { const r = await apiFetch(`/teams/${mine.team.id}/invite`, { method: 'POST', body: JSON.stringify({ identifier }) }); setMsg(`Invitation envoyée à ${r.invitation.to.username}.`); setIdentifier(''); await load(); }
    catch (e) { setErr((e as Error).message); }
  };
  const accept = async (id: string) => { await apiFetch(`/invitations/${id}/accept`, { method: 'POST' }); await load(); await refresh(); };
  const decline = async (id: string) => { await apiFetch(`/invitations/${id}/decline`, { method: 'POST' }); await load(); };
  const join = async (id: string) => { await apiFetch(`/teams/${id}/join`, { method: 'POST' }); await load(); await refresh(); };
  const leave = async () => { await apiFetch('/teams/leave', { method: 'POST' }); await load(); await refresh(); };

  return (
    <div className="container">
      <h1>Équipes &amp; clans</h1>

      {invites.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent-line)' }}>
          <h3>Invitations reçues</h3>
          {invites.map((i) => (
            <div key={i.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-1)' }}>
              <span className="row" style={{ gap: 10 }}>
                <TeamBadge name={i.team.name} size={28} />
                <span><b>{i.from.username}</b> vous invite dans <b>{i.team.name}</b> <span className="muted">(groupe {i.team.visibility === 'public' ? 'public' : 'privé'})</span></span>
              </span>
              <span className="row" style={{ gap: 8 }}>
                <Button variant="primary" size="sm" onClick={() => accept(i.id)}>Accepter</Button>
                <Button variant="ghost" size="sm" onClick={() => decline(i.id)}>Refuser</Button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="split">
        <div className="card">
          <h3>Mon équipe</h3>
          {mine.team ? (
            <>
              <div className="row" style={{ gap: 12 }}>
                <TeamBadge name={mine.team.name} size={44} />
                <div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{mine.team.name}</div>
                  <div className="muted">{mine.team.points} pts · {mine.members.length} membre(s) · groupe {mine.team.visibility === 'public' ? 'public' : 'privé'}</div>
                </div>
                <Button variant="ghost" size="sm" style={{ marginLeft: 'auto' }} onClick={leave}>Quitter</Button>
              </div>

              {isOwner && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
                  <div style={{ marginBottom: 10 }}>
                    <Switch checked={mine.team.visibility === 'public'} onChange={toggleVisibility}
                      label={`Groupe ${mine.team.visibility === 'public' ? 'public — parties visibles de tous' : 'privé — parties réservées au groupe'}`} />
                  </div>
                  <label>Inviter (nom d'utilisateur, e-mail ou identifiant)</label>
                  <div className="row" style={{ gap: 8 }}>
                    <Input value={identifier} onChange={(e) => setIdentifier((e.target as HTMLInputElement).value)} placeholder="ex : invite, mail@ex.fr…" style={{ flex: 1 }} />
                    <Button variant="primary" onClick={invite} disabled={!identifier.trim()}>Inviter</Button>
                  </div>
                  {msg && <p style={{ color: 'var(--success)' }}>{msg}</p>}
                  {err && <p className="err">{err}</p>}
                  {sent.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div className="muted" style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: 'var(--ls-caps)' }}>En attente</div>
                      {sent.map((s) => <div key={s.id} className="muted" style={{ fontSize: 'var(--fs-sm)' }}>• {s.to.username} <span style={{ color: 'var(--warning)' }}>pending</span></div>)}
                    </div>
                  )}
                </div>
              )}

              <h3 style={{ marginTop: 16 }}>Membres</h3>
              {mine.members.map((m) => (
                <div key={m.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-1)', cursor: 'pointer' }}
                  onClick={() => setProfile({ kind: 'user', id: m.id })}>
                  <b>{m.username}</b>
                  <span className="muted">niv. {m.level} · {m.rewardPoints} pts</span>
                </div>
              ))}
              <p className="muted" style={{ fontSize: 'var(--fs-xs)', marginTop: 8 }}>Cliquez un membre pour voir son profil.</p>
            </>
          ) : (
            <>
              <p className="muted">Vous n'êtes dans aucune équipe. Créez la vôtre ou rejoignez-en une.</p>
              <Input label="Nom de la nouvelle équipe" value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
              <div style={{ margin: '10px 0' }}>
                <Switch checked={newPublic} onChange={setNewPublic} label={newPublic ? 'Groupe public (parties publiques)' : 'Groupe privé (parties privées)'} />
              </div>
              {err && <p className="err">{err}</p>}
              <Button variant="primary" disabled={!name} onClick={create}>Créer mon équipe</Button>
            </>
          )}
        </div>

        <div className="card">
          <h3>Classement des clans</h3>
          {teams.length === 0 && <p className="muted">Aucune équipe pour l'instant.</p>}
          {teams.map((t, i) => (
            <div key={t.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-1)' }}>
              <span className="row" style={{ gap: 10 }}>
                <span className="muted">#{i + 1}</span>
                <TeamBadge name={t.name} size={26} />
                <span><b>{t.name}</b><div className="muted">{t.points} pts · {t.members} joueur(s)</div></span>
              </span>
              {!mine.team && <Button variant="secondary" size="sm" onClick={() => join(t.id)}>Rejoindre</Button>}
            </div>
          ))}
        </div>
      </div>

      <ProfileDialog target={profile} onClose={() => setProfile(null)} />
    </div>
  );
}
