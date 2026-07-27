import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

interface RobotDoc {
  _id: string;
  name: string;
  personality: { aggressiveness: number; concentration: number; velocity: number };
  responseTimeMs: number;
  maxPlayTimeMs: number;
  conventionConfig?: Record<string, number>;
  algoSpec?: { name?: string } | null;
  offlineEnabled?: boolean;
  representativeSlot?: number;
}

const BLANK = { name: '', aggr: 5, conc: 5, velo: 5, responseTimeMs: 1000, maxPlayTimeMs: 10000, acePoints: 10, offlineEnabled: false, representativeSlot: 0, algo: 'Classique' };

export function RobotsPage() {
  const [robots, setRobots] = useState<RobotDoc[]>([]);
  const [form, setForm] = useState({ ...BLANK });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = async () => setRobots((await apiFetch('/robots')).robots);
  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof BLANK, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => { setForm({ ...BLANK }); setEditingId(null); setErr(''); };

  const edit = (r: RobotDoc) => {
    setEditingId(r._id);
    setForm({
      name: r.name,
      aggr: r.personality.aggressiveness, conc: r.personality.concentration, velo: r.personality.velocity,
      responseTimeMs: r.responseTimeMs, maxPlayTimeMs: r.maxPlayTimeMs,
      acePoints: r.conventionConfig?.acePoints ?? 10,
      offlineEnabled: !!r.offlineEnabled, representativeSlot: r.representativeSlot ?? 0,
      algo: r.algoSpec?.name ?? 'Classique',
    });
    setErr('');
  };

  const submit = async () => {
    setErr('');
    const body = JSON.stringify({
      name: form.name,
      personality: { aggressiveness: form.aggr, concentration: form.conc, velocity: form.velo },
      responseTimeMs: form.responseTimeMs,
      maxPlayTimeMs: form.maxPlayTimeMs,
      conventionConfig: { acePoints: form.acePoints },
      offlineEnabled: form.offlineEnabled,
      representativeSlot: form.representativeSlot,
      algoSpec: {
        version: 1, name: form.algo,
        personality: { aggressiveness: form.aggr, concentration: form.conc, velocity: form.velo },
        bidding: { acePoints: form.acePoints },
        contre: { enabled: true, minOpponentRiskToContre: 0.65, minOwnStrengthToSurcontre: 0.8 },
        play: { aggressiveness: form.aggr },
      },
    });
    try {
      if (editingId) await apiFetch(`/robots/${editingId}`, { method: 'PUT', body });
      else await apiFetch('/robots', { method: 'POST', body });
      reset(); await load();
    } catch (e) { setErr((e as Error).message); }
  };

  const remove = async (id: string) => { await apiFetch(`/robots/${id}`, { method: 'DELETE' }); if (editingId === id) reset(); await load(); };

  const Slider = ({ label, k, max = 10, step = 1 }: { label: string; k: keyof typeof BLANK; max?: number; step?: number }) => (
    <div className="field">
      <label>{label} : <b>{form[k] as number}</b>{max === 10 ? '/10' : ''}</label>
      <div className="slider"><input type="range" min={0} max={max} step={step} value={form[k] as number} onChange={(e) => set(k, Number(e.target.value))} /></div>
    </div>
  );

  return (
    <div className="container">
      <h1>Mes robots</h1>
      <div className="split">
        <div className="card">
          <h3>{editingId ? 'Modifier le robot' : 'Créer un robot'}</h3>
          <div className="field"><label>Nom</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} style={{ width: '100%' }} /></div>
          <Slider label="Agressivité" k="aggr" />
          <Slider label="Concentration" k="conc" />
          <Slider label="Vélocité" k="velo" />
          <div className="field"><label>Temps de réponse (ms)</label>
            <input type="number" min={100} step={100} value={form.responseTimeMs} onChange={(e) => set('responseTimeMs', Number(e.target.value))} /></div>
          <div className="field"><label>Temps max de jeu (ms)</label>
            <input type="number" min={1000} step={500} value={form.maxPlayTimeMs} onChange={(e) => set('maxPlayTimeMs', Number(e.target.value))} /></div>
          <Slider label="Convention — points par As (signal)" k="acePoints" max={20} step={5} />
          <div className="field"><label>Algorithme (AlgoSpec)</label>
            <select value={form.algo} onChange={(e) => set('algo', e.target.value)}>
              <option>Classique</option><option>Agressif</option><option>Prudent</option>
            </select></div>
          <div className="field"><label>Siège représentant</label>
            <select value={form.representativeSlot} onChange={(e) => set('representativeSlot', Number(e.target.value))}>
              <option value={0}>Aucun</option><option value={1}>N°1</option><option value={2}>N°2</option><option value={3}>N°3</option><option value={4}>N°4</option>
            </select></div>
          <div className="row" style={{ margin: '4px 0 12px' }}>
            <label style={{ margin: 0 }}>Autorisé hors‑ligne (peut jouer sans moi)</label>
            <input type="checkbox" checked={form.offlineEnabled} onChange={(e) => set('offlineEnabled', e.target.checked)} style={{ width: 18, height: 18 }} />
          </div>
          {err && <p className="err">{err}</p>}
          <div className="row">
            <button className="primary" disabled={!form.name} onClick={submit}>{editingId ? 'Mettre à jour' : 'Créer'}</button>
            {editingId && <button onClick={reset}>Annuler</button>}
          </div>
        </div>

        <div className="card">
          <h3>Robots existants ({robots.length})</h3>
          {robots.length === 0 && <p className="muted">Aucun robot. Créez-en un à gauche.</p>}
          {robots.map((r) => (
            <div key={r._id} className="list-item">
              <div>
                <b>{r.name}</b>
                <div className="muted">
                  agr {r.personality.aggressiveness} · conc {r.personality.concentration} · vél {r.personality.velocity} · {r.responseTimeMs}ms
                  {r.algoSpec?.name ? ` · ${r.algoSpec.name}` : ''}
                  {r.representativeSlot ? ` · représentant N°${r.representativeSlot}` : ''}
                  {r.offlineEnabled ? ' · hors‑ligne ✓' : ''}
                </div>
              </div>
              <div className="row">
                <button onClick={() => edit(r)}>Éditer</button>
                <button onClick={() => remove(r._id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
